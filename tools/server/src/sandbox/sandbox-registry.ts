/**
 * Sandbox registry — one SandboxProcess per room, lazy-spawned.
 *
 * Public interface: {@link SandboxRegistry}, {@link createSandboxRegistry}.
 * Bounded context: runtime coordinator (ADR-153 Decision 1 — per-room
 * sandbox; Decision 11 — server may broadcast runtime_crash but stays up).
 *
 * Invariants:
 *   - a room has at most one live SandboxProcess at a time.
 *   - `tearDown(room_id)` removes the entry and kills the process; safe
 *     to call even if no sandbox was ever spawned.
 *   - `status(room_id)` returns 'ready' only after the READY frame arrived.
 */

import type { SandboxProcess, SandboxSpawnOptions } from './sandbox-process.js';
import { spawnSandbox } from './sandbox-process.js';

export type SandboxStatus = 'spawning' | 'ready' | 'crashed' | 'exited';

export interface SandboxEntry {
  process: SandboxProcess;
  status: SandboxStatus;
  /** Resolves when READY arrives, rejects on crash before READY. */
  readonly ready: Promise<void>;
}

export type SpawnFactory = (opts: SandboxSpawnOptions) => SandboxProcess;

export interface SandboxRegistry {
  /** Return the existing entry for a room, or spawn and register a new one. */
  getOrSpawn(opts: SandboxSpawnOptions): SandboxEntry;
  /** Peek without spawning. */
  get(room_id: string): SandboxEntry | null;
  /** Remove and kill the sandbox for a room. */
  tearDown(room_id: string): void;
  /** Remove and kill every sandbox; used at server shutdown. */
  tearDownAll(): void;
  size(): number;
}

/**
 * @param factory  spawn function (defaults to `spawnSandbox`). Injected so tests
 *                 can substitute a Node-backed stub.
 */
export function createSandboxRegistry(factory: SpawnFactory = spawnSandbox): SandboxRegistry {
  const entries = new Map<string, SandboxEntry>();

  function register(opts: SandboxSpawnOptions): SandboxEntry {
    const proc = factory(opts);

    let resolveReady: () => void = () => {};
    let rejectReady: (err: Error) => void = () => {};
    const ready = new Promise<void>((res, rej) => {
      resolveReady = res;
      rejectReady = rej;
    });

    const entry: SandboxEntry = { process: proc, status: 'spawning', ready };
    entries.set(opts.room_id, entry);

    proc.on('ready', () => {
      entry.status = 'ready';
      resolveReady();
    });
    proc.on('exit', () => {
      entry.status = 'exited';
    });
    proc.on('crash', () => {
      entry.status = 'crashed';
      // If ready already resolved, this reject is ignored; otherwise it
      // surfaces the crash to callers awaiting the spawn.
      rejectReady(new Error('sandbox crashed before READY'));
    });

    return entry;
  }

  return {
    getOrSpawn(opts) {
      const existing = entries.get(opts.room_id);
      if (existing && (existing.status === 'spawning' || existing.status === 'ready')) {
        return existing;
      }
      return register(opts);
    },
    get(room_id) {
      return entries.get(room_id) ?? null;
    },
    tearDown(room_id) {
      const entry = entries.get(room_id);
      if (!entry) return;
      entries.delete(room_id);
      try {
        entry.process.shutdown();
      } catch {
        /* ignore */
      }
      setTimeout(() => entry.process.kill('SIGKILL'), 1000).unref();
    },
    tearDownAll() {
      for (const room_id of [...entries.keys()]) this.tearDown(room_id);
    },
    size() {
      return entries.size;
    },
  };
}

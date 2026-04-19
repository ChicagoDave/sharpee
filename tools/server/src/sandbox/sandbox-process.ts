/**
 * SandboxProcess — owns one child process that runs the story engine.
 *
 * Public interface: {@link SandboxProcess}, {@link spawnSandbox}, {@link SandboxSpawnOptions}.
 * Bounded context: runtime host (ADR-153 Decision 1, Decision 2).
 *
 * Responsibilities:
 *   - spawn the binary (default `deno run --no-prompt <entry> <story_file>`)
 *   - route stdio through the JSON line framer
 *   - surface typed events: `ready`, `message`, `exit`, `crash`
 *   - send outbound messages as framed lines
 *   - detect crash (child exits before an EXITED message was observed)
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLineFramer, frameMessage } from './message-framing.js';
import type {
  SandboxToServerMessage,
  ServerToSandboxMessage,
  Init,
  Ready,
  Exited,
} from '../wire/server-sandbox.js';

export interface SandboxSpawnOptions {
  /** Room this sandbox serves (used only for logs/diagnostics). */
  room_id: string;
  /** Story file to load inside the sandbox. Passed through the INIT message. */
  story_file: string;
  /**
   * Executable to spawn. Default `'deno'`. Tests override to `'node'` and
   * point at a stub script so they don't depend on Deno being installed.
   */
  binary?: string;
  /**
   * Argv for the spawn. Defaults to `['run', '--no-prompt', <DENO_ENTRY>]`.
   * The entry path is resolved relative to this package.
   */
  args?: string[];
  /** Wire protocol version to announce in INIT. Defaults to current. */
  protocol?: number;
  /** Milliseconds to wait for READY before considering the spawn failed. */
  readyTimeoutMs?: number;
}

export interface SandboxProcessEvents {
  ready: (ev: Ready) => void;
  message: (ev: SandboxToServerMessage) => void;
  exit: (info: Exited) => void;
  crash: (info: { exitCode: number | null; signal: NodeJS.Signals | null; stderr: string }) => void;
  frameError: (err: Error, line: string) => void;
}

/** Resolve the default Deno entry path shipped with this package. */
function defaultDenoEntry(): string {
  // In dev (no build), deno-entry.ts lives next to this file.
  // In the built image, it's at dist/sandbox/deno-entry.ts (still .ts — Deno reads .ts directly).
  const here = dirname(fileURLToPath(import.meta.url));
  return resolvePath(here, 'deno-entry.ts');
}

export class SandboxProcess extends EventEmitter {
  public readonly room_id: string;
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly stderrBuf: string[] = [];
  private exitReported = false;
  private readyReceived = false;
  private readyTimer: NodeJS.Timeout | null = null;

  constructor(
    opts: SandboxSpawnOptions & { binary: string; args: string[]; readyTimeoutMs: number }
  ) {
    super();
    this.room_id = opts.room_id;
    this.child = spawn(opts.binary, opts.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams;

    const framer = createLineFramer<SandboxToServerMessage>({
      onMessage: (msg) => this.#handleInbound(msg),
      onError: (err, line) => this.emit('frameError', err, line),
    });

    this.child.stdout.on('data', (chunk: Buffer) => framer.push(chunk));
    this.child.stderr.on('data', (chunk: Buffer) => {
      this.stderrBuf.push(chunk.toString('utf8'));
      // Cap stderr retention so a chatty sandbox doesn't blow memory.
      if (this.stderrBuf.length > 200) this.stderrBuf.splice(0, this.stderrBuf.length - 200);
    });

    this.child.on('exit', (code, signal) => {
      if (this.readyTimer) clearTimeout(this.readyTimer);
      if (this.exitReported) return;
      // Unreported exit == crash.
      this.emit('crash', {
        exitCode: code,
        signal,
        stderr: this.stderrBuf.join(''),
      });
    });

    this.readyTimer = setTimeout(() => {
      if (!this.readyReceived) {
        this.emit('frameError', new Error('sandbox READY timeout'), '');
        try {
          this.child.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      }
    }, opts.readyTimeoutMs);

    // Send INIT once stdin is writable. spawn() returns with stdin already open.
    const init: Init = {
      kind: 'INIT',
      room_id: opts.room_id,
      story_file: opts.story_file,
      protocol: opts.protocol ?? 1,
    };
    this.send(init);
  }

  /** Send a framed message to the sandbox's stdin. */
  send(msg: ServerToSandboxMessage): void {
    try {
      this.child.stdin.write(frameMessage(msg));
    } catch {
      /* child likely exited; 'exit' handler will classify */
    }
  }

  /** Ask the sandbox to shut down cleanly. */
  shutdown(): void {
    this.send({ kind: 'SHUTDOWN' });
  }

  /** Hard-kill the sandbox. Used for forced teardown. */
  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    try {
      this.child.kill(signal);
    } catch {
      /* already dead */
    }
  }

  #handleInbound(msg: SandboxToServerMessage): void {
    this.emit('message', msg);
    if (msg.kind === 'READY' && !this.readyReceived) {
      this.readyReceived = true;
      if (this.readyTimer) clearTimeout(this.readyTimer);
      this.emit('ready', msg);
    } else if (msg.kind === 'EXITED') {
      this.exitReported = true;
      this.emit('exit', msg);
    }
  }

  // Typed convenience wrappers over the base EventEmitter on/emit. Kept
  // simple: an `on('ready', listener)` gets the correct argument types
  // via this facade without fighting the base class typing.
  onEvent<K extends keyof SandboxProcessEvents>(
    event: K,
    listener: SandboxProcessEvents[K]
  ): this {
    this.on(event, listener as (...args: unknown[]) => void);
    return this;
  }
}

/** Construct a SandboxProcess with the project defaults filled in. */
export function spawnSandbox(opts: SandboxSpawnOptions): SandboxProcess {
  const binary = opts.binary ?? 'deno';
  const args =
    opts.args ?? ['run', '--no-prompt', defaultDenoEntry(), opts.story_file];
  return new SandboxProcess({
    ...opts,
    binary,
    args,
    readyTimeoutMs: opts.readyTimeoutMs ?? 10_000,
  });
}

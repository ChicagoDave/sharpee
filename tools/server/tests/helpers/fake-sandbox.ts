/**
 * In-process fake of SandboxProcess for unit tests that exercise the
 * server-to-sandbox protocol without spawning a child.
 *
 * Public interface: {@link FakeSandbox}, {@link createFakeSandboxFactory}.
 * Bounded context: test infrastructure.
 *
 * Behavior:
 *   - `send()` records outbound messages in `sent[]` so tests can assert on them.
 *   - Tests call `emitReady()`, `emitMessage()`, `emitExit()`, `emitCrash()` to
 *     drive the sandbox's half of the protocol.
 *   - `shutdown()` and `kill()` are no-ops (they would race the test otherwise).
 *
 * The fake is type-cast to `SandboxProcess` where the registry expects one;
 * only the surface actually used by SandboxRegistry + SaveService + RoomManager
 * is implemented.
 */

import { EventEmitter } from 'node:events';
import type { SandboxProcess } from '../../src/sandbox/sandbox-process.js';
import type {
  SandboxToServerMessage,
  ServerToSandboxMessage,
  Ready,
  Exited,
} from '../../src/wire/server-sandbox.js';

export class FakeSandbox extends EventEmitter {
  public readonly room_id: string;
  public readonly sent: ServerToSandboxMessage[] = [];
  public shutdownCalls = 0;
  public killCalls = 0;

  constructor(room_id: string) {
    super();
    this.room_id = room_id;
  }

  send(msg: ServerToSandboxMessage): void {
    this.sent.push(msg);
  }

  shutdown(): void {
    this.shutdownCalls += 1;
  }

  kill(): void {
    this.killCalls += 1;
  }

  emitReady(meta: Ready['story_metadata'] = { title: 'fake-story' }): void {
    this.emit('ready', { kind: 'READY', story_metadata: meta });
  }

  emitMessage(msg: SandboxToServerMessage): void {
    this.emit('message', msg);
  }

  emitExit(info: Exited = { kind: 'EXITED', reason: 'clean' }): void {
    this.emit('exit', info);
  }

  emitCrash(info: { exitCode: number | null; signal: null; stderr: string }): void {
    this.emit('crash', info);
  }
}

/**
 * Build a SpawnFactory for createSandboxRegistry that returns FakeSandbox
 * instances. The caller controls the fake via the map returned here:
 * `factory.getFake(room_id)` after first spawn.
 */
export function createFakeSandboxFactory(): {
  factory: (opts: { room_id: string }) => SandboxProcess;
  getFake: (room_id: string) => FakeSandbox | undefined;
  fakes: Map<string, FakeSandbox>;
} {
  const fakes = new Map<string, FakeSandbox>();

  const factory = (opts: { room_id: string }): SandboxProcess => {
    const fake = new FakeSandbox(opts.room_id);
    fakes.set(opts.room_id, fake);
    return fake as unknown as SandboxProcess;
  };

  return {
    factory,
    getFake: (room_id: string) => fakes.get(room_id),
    fakes,
  };
}

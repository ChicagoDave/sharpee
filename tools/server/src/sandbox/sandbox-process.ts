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
  /**
   * Path to the source `.sharpee` file. Passed through the INIT message for
   * provenance and narrowed into Deno's `--allow-read` list; the file is NOT
   * re-read at runtime — the compiled bundle embeds its contents.
   */
  story_file: string;
  /**
   * Path to the install-time-compiled self-contained ESM
   * (`<slug>.host.js`). This is the *only* file Deno executes. Callers
   * resolve it via `story-cache.getCompiledBundle(story_file)` before
   * spawning; sandbox-process does not compile on the hot path.
   */
  bundle_path: string;
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

export class SandboxProcess extends EventEmitter {
  public readonly room_id: string;
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly stderrBuf: string[] = [];
  private exitReported = false;
  private readyReceived = false;
  private readyTimer: NodeJS.Timeout | null = null;
  /**
   * Set when the child's `error` event has already been surfaced as a
   * `crash` event. Prevents the subsequent `exit` event (which fires after
   * `error` when spawn itself fails) from double-crashing.
   */
  private crashReported = false;

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

    // A missing binary or unusable executable surfaces as `error`, not `exit`.
    // Without this handler the event becomes an uncaught exception and takes
    // the whole server down (observed during ADR-153 Phase 4 remediation —
    // Deno absent from PATH crashed the Node process instead of emitting a
    // crash signal per-room). Emit `crash` so callers can clean up the room
    // and, critically, so the server stays up.
    this.child.on('error', (err: NodeJS.ErrnoException) => {
      if (this.readyTimer) clearTimeout(this.readyTimer);
      if (this.crashReported) return;
      this.crashReported = true;
      const detail = err.code ? `${err.code}: ${err.message}` : err.message;
      this.emit('crash', {
        exitCode: null,
        signal: null,
        stderr: `spawn failed: ${detail}\n${this.stderrBuf.join('')}`,
      });
    });

    this.child.on('exit', (code, signal) => {
      if (this.readyTimer) clearTimeout(this.readyTimer);
      if (this.crashReported) return;
      if (this.exitReported) return;
      this.crashReported = true;
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

/**
 * Construct a SandboxProcess with the project defaults filled in.
 *
 * Spawn command: `deno run --allow-read=<bundle>,<story> --v8-flags=--max-old-space-size=256 <bundle>`.
 * - `--allow-read` is narrowed to the compiled bundle and source story file
 *   only; all other Deno permissions are denied by default (ADR-153
 *   Decision 1 / Phase 4 remediation Option B).
 * - `--v8-flags=--max-old-space-size=256` caps rogue-story memory pressure
 *   at the inner boundary; the container is the outer boundary.
 * - No injection surface: callers must provide a pre-compiled `bundle_path`.
 *   See `story-cache.getCompiledBundle(story_file)` for the install-time
 *   compilation path.
 */
export function spawnSandbox(opts: SandboxSpawnOptions): SandboxProcess {
  const binary = 'deno';
  const allowRead = `--allow-read=${opts.bundle_path},${opts.story_file}`;
  const args = [
    'run',
    allowRead,
    '--v8-flags=--max-old-space-size=256',
    opts.bundle_path,
  ];
  return new SandboxProcess({
    ...opts,
    binary,
    args,
    readyTimeoutMs: opts.readyTimeoutMs ?? 10_000,
  });
}

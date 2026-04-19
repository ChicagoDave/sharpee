/**
 * Deno sandbox entry point — one process per room.
 *
 * Runs under `deno run --allow-none` (no FS, no network, no env, no subprocess).
 * All IO is JSON newline-delimited frames across stdio, following the wire
 * protocol declared in `../wire/server-sandbox.ts`.
 *
 * Public interface: executed as a script; no exports.
 * Bounded context: isolated story execution (ADR-153 Decision 1, Decision 2).
 *
 * Phase 0 stub: echoes INIT → READY and acknowledges SHUTDOWN. The actual
 * engine loop (imports `@sharpee/engine`, runs commands, emits OUTPUT) is
 * wired in Phase 4.
 *
 * NOTE: This file is consumed by the Deno runtime, not Node. It intentionally
 * does NOT import anything from Node-only paths. TypeScript compiles it only
 * for type-checking; at runtime Deno executes the .ts file directly.
 */

// Future imports (Phase 4): SandboxMessage, Init, Ready, etc. from ../wire/server-sandbox.
// Deferred until engine integration lands.

// `Deno` is a global provided by the Deno runtime. This file is excluded from
// the Node tsconfig (see tsconfig.json `exclude`), so tsc never typechecks it.
// Deno typechecks it via deno.json.
declare const Deno: {
  stdin: { readable: ReadableStream<Uint8Array> };
  stdout: { writable: WritableStream<Uint8Array> };
  exit(code?: number): never;
};

async function main(): Promise<void> {
  const enc = new TextEncoder();
  const writer = Deno.stdout.writable.getWriter();

  async function emit(msg: unknown): Promise<void> {
    await writer.write(enc.encode(JSON.stringify(msg) + '\n'));
  }

  // Line-oriented JSON frame reader.
  const reader = Deno.stdin.readable
    .pipeThrough(new TextDecoderStream())
    .getReader();

  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value;
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      let frame: { kind?: string };
      try {
        frame = JSON.parse(line);
      } catch {
        await emit({ kind: 'ERROR', phase: 'init', detail: 'malformed JSON frame' });
        continue;
      }
      if (frame.kind === 'INIT') {
        // Phase 0: no engine yet — acknowledge READY with a placeholder story name.
        await emit({
          kind: 'READY',
          story_metadata: { title: '(stub)', version: '0.0.0' },
        });
      } else if (frame.kind === 'SHUTDOWN') {
        await emit({ kind: 'EXITED', reason: 'shutdown' });
        Deno.exit(0);
      } else {
        await emit({
          kind: 'ERROR',
          phase: 'init',
          detail: `Phase 0 stub cannot handle kind=${String(frame.kind)}`,
        });
      }
    }
  }
}

// Deno top-level await is supported; Node never executes this file.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

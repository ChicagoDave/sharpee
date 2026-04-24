/**
 * Test subprocess driver for `tests/sandbox/sandbox-process.test.ts`.
 *
 * This file is NOT a stub of the production sandbox. It is a minimal Node
 * subprocess used to exercise the `SandboxProcess` WRAPPER class — its
 * message framing, READY handling, crash detection, and malformed-frame
 * paths. The system under test is `SandboxProcess`; this child is its
 * collaborator at the process boundary. Real Deno cannot be used here
 * because it does not expose controls like `--crash-on-command` or
 * malformed-frame injection.
 *
 * End-to-end coverage of the production sandbox (real Deno running the
 * compiled bundle) is in `tests/sandbox/deno-engine-integration.test.ts`.
 *
 * Protocol (mirrors the wire types in src/wire/server-sandbox.ts):
 *   INIT    → READY with fake story metadata
 *   COMMAND → OUTPUT echoing the input
 *   SAVE    → SAVED with a base64 "stub-save" blob
 *   RESTORE → RESTORED with a canned text block
 *   SHUTDOWN → EXITED clean + process.exit(0)
 *
 * Special sentinel: if argv contains `--crash-on-command`, the child exits
 * ungracefully on the first COMMAND instead of emitting OUTPUT — used by
 * the crash-detection test.
 */
/* eslint-disable no-console */

const crashOnCommand = process.argv.includes('--crash-on-command');

function emit(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl);
    buffer = buffer.slice(nl + 1);
    if (!line.trim()) continue;
    let frame;
    try {
      frame = JSON.parse(line);
    } catch {
      emit({ kind: 'ERROR', phase: 'init', detail: 'malformed JSON' });
      continue;
    }
    handle(frame);
  }
});

function handle(frame) {
  switch (frame.kind) {
    case 'INIT':
      emit({
        kind: 'READY',
        story_metadata: { title: 'stub-story', author: 'test', version: '0.0.0' },
      });
      return;
    case 'COMMAND':
      if (crashOnCommand) {
        // Exit without sending EXITED — the server treats this as a crash.
        process.stderr.write('stub-sandbox: simulated crash\n');
        process.exit(1);
      }
      emit({
        kind: 'OUTPUT',
        turn_id: frame.turn_id,
        text_blocks: [{ kind: 'para', text: `You said: ${frame.input}` }],
        events: [{ type: 'stub.echo', input: frame.input }],
      });
      return;
    case 'SAVE':
      emit({
        kind: 'SAVED',
        save_id: frame.save_id,
        blob_b64: Buffer.from(`stub-save:${frame.save_id}`).toString('base64'),
      });
      return;
    case 'RESTORE':
      emit({
        kind: 'RESTORED',
        save_id: frame.save_id,
        text_blocks: [{ kind: 'para', text: 'Restored.' }],
      });
      return;
    case 'SHUTDOWN':
      emit({ kind: 'EXITED', reason: 'shutdown' });
      setTimeout(() => process.exit(0), 10);
      return;
    default:
      emit({ kind: 'ERROR', phase: 'init', detail: `unknown kind ${frame.kind}` });
  }
}

// Keep process alive until stdin closes.
process.stdin.on('end', () => {
  emit({ kind: 'EXITED', reason: 'shutdown' });
  process.exit(0);
});

/**
 * Test stub sandbox — mirrors the server↔sandbox wire protocol without Deno.
 *
 * Used by Phase 4 tests so they don't depend on `deno` being installed.
 * Behavior is intentionally trivial:
 *   INIT    → READY with fake story metadata
 *   COMMAND → OUTPUT echoing the input
 *   SAVE    → SAVED with a base64 "stub-save" blob
 *   RESTORE → RESTORED with a canned text block
 *   SHUTDOWN → EXITED clean + process.exit(0)
 *
 * Special sentinel: if argv contains `--crash-on-command`, the stub exits
 * ungracefully on the first COMMAND instead of emitting OUTPUT — used by
 * the AC7 crash-recovery test.
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

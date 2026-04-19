/**
 * Line-framer behavior tests.
 *
 * Behavior Statement — createLineFramer
 *   DOES: buffers partial chunks and invokes `onMessage(parsedJson)` once
 *         per newline-terminated non-empty line; invokes `onError(err, raw)`
 *         for malformed lines while continuing to parse subsequent ones.
 *   WHEN: used to decode stdio bytes from a spawned sandbox process.
 *   BECAUSE: the Runtime Host Interface is newline-delimited JSON over
 *            stdio; partial reads must not cause message loss.
 *   REJECTS WHEN: a chunk would push the internal buffer past `max`;
 *                 the buffer is cleared and onError fires.
 */

import { describe, expect, it } from 'vitest';
import { createLineFramer, frameMessage } from '../../src/sandbox/message-framing.js';

interface Msg {
  kind: string;
  [k: string]: unknown;
}

describe('createLineFramer', () => {
  it('assembles two partial chunks into one complete JSON object', () => {
    const messages: Msg[] = [];
    const framer = createLineFramer<Msg>({ onMessage: (m) => messages.push(m) });

    framer.push('{"kind":"READY","st');
    expect(messages).toEqual([]);
    framer.push('ory":"x"}\n');
    expect(messages).toEqual([{ kind: 'READY', story: 'x' }]);
  });

  it('splits multiple messages on one chunk', () => {
    const messages: Msg[] = [];
    const framer = createLineFramer<Msg>({ onMessage: (m) => messages.push(m) });

    framer.push('{"kind":"A"}\n{"kind":"B"}\n{"kind":"C"}\n');
    expect(messages.map((m) => m.kind)).toEqual(['A', 'B', 'C']);
  });

  it('invokes onError for a malformed line but continues on subsequent lines', () => {
    const messages: Msg[] = [];
    const errors: Array<{ err: Error; raw: string }> = [];
    const framer = createLineFramer<Msg>({
      onMessage: (m) => messages.push(m),
      onError: (err, raw) => errors.push({ err, raw }),
    });

    framer.push('not-json\n{"kind":"OK"}\n');
    expect(messages).toEqual([{ kind: 'OK' }]);
    expect(errors.length).toBe(1);
    expect(errors[0]?.raw).toBe('not-json');
  });

  it('ignores blank lines', () => {
    const messages: Msg[] = [];
    const framer = createLineFramer<Msg>({ onMessage: (m) => messages.push(m) });
    framer.push('\n   \n{"kind":"A"}\n\n');
    expect(messages).toEqual([{ kind: 'A' }]);
  });

  it('frameMessage round-trips through the framer', () => {
    const messages: Msg[] = [];
    const framer = createLineFramer<Msg>({ onMessage: (m) => messages.push(m) });
    framer.push(frameMessage({ kind: 'COMMAND', turn_id: 't1', input: 'look' }));
    expect(messages).toEqual([{ kind: 'COMMAND', turn_id: 't1', input: 'look' }]);
  });

  it('resets the buffer when the size cap is exceeded', () => {
    const messages: Msg[] = [];
    const errors: Array<{ err: Error; raw: string }> = [];
    const framer = createLineFramer<Msg>(
      { onMessage: (m) => messages.push(m), onError: (err, raw) => errors.push({ err, raw }) },
      50 // tiny cap
    );
    framer.push('x'.repeat(100)); // no newline; overflows
    expect(errors.length).toBe(1);
    // A subsequent valid line should still parse.
    framer.push('{"kind":"OK"}\n');
    expect(messages).toEqual([{ kind: 'OK' }]);
  });
});

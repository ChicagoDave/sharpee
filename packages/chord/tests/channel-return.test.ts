/**
 * channel-return.test.ts — ADR-253 D1: `define channel` gains
 * `return <field | "text (slot)" | phrase <key>> from <event>`; `take` and the
 * standalone `from event` line are removed; a returned field the event never
 * emits is an analyzer error. REAL-PATH: real parse → analyze throughout.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRDataChannelDef } from '../src/ir';

/** A story whose case clock emits `estate-clock` with an `hour` field, plus `extra`. */
const story = (channelBody: string) => `story "T" by "T"
  id: t
  version: 0.0.1

create the Hall
  a room

  A hall.

create the clock
  in the Hall

  A clock.

  on every turn
    emit estate-clock with hour "evening"
  end on

define channel clock
${channelBody}
end channel
`;

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const dataChannel = (source: string): IRDataChannelDef => {
  const result = compile(source);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return result.ir.channels.find((c) => c.family === 'data') as IRDataChannelDef;
};

describe('define channel `return` (ADR-253 D1)', () => {
  it('a field return parses to { kind: field }', () => {
    const ch = dataChannel(story('  mode replace\n  return hour from estate-clock'));
    expect(ch.returns).toEqual({ kind: 'field', field: 'hour' });
    expect(ch.fromEvent).toBe('estate-clock');
  });

  it('a text-template return parses to { kind: text } with the (slot) spelling', () => {
    const ch = dataChannel(story('  mode replace\n  return "The clock: (hour)" from estate-clock'));
    expect(ch.returns).toEqual({ kind: 'text', text: 'The clock: (hour)' });
  });

  it('a phrase return parses to { kind: phrase }', () => {
    const src = story('  mode replace\n  return phrase clock-line from estate-clock').replace(
      'define channel clock',
      'define phrase clock-line\n  The clock chimes.\nend phrase\n\ndefine channel clock',
    );
    const ch = dataChannel(src);
    expect(ch.returns).toEqual({ kind: 'phrase', phrase: 'clock-line' });
  });

  it('returning a field the event never emits → analysis.channel-return-field', () => {
    expect(errorCodes(story('  mode replace\n  return nope from estate-clock'))).toEqual([
      'analysis.channel-return-field',
    ]);
  });

  it('a (slot) naming a field the event lacks → analysis.channel-return-field', () => {
    expect(errorCodes(story('  mode replace\n  return "at (minute)" from estate-clock'))).toEqual([
      'analysis.channel-return-field',
    ]);
  });

  it('`take` is removed → parse.channel-take-removed', () => {
    expect(errorCodes(story('  mode replace\n  from event estate-clock\n  take hour'))).toContain(
      'parse.channel-take-removed',
    );
  });

  it('a `return` missing `from <event>` → parse.channel-return', () => {
    expect(errorCodes(story('  mode replace\n  return hour'))).toContain('parse.channel-return');
  });

  it('an event with no collected payload leaves the return unchecked (no false positive)', () => {
    // `media-degrade` is never emitted in this story → its field set is unknown.
    const ch = dataChannel(story('  mode replace\n  return anything from some-external-event'));
    expect(ch.returns).toEqual({ kind: 'field', field: 'anything' });
  });
});

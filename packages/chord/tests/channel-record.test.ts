/**
 * channel-record.test.ts — ADR-300 D10: `define channel` gains a `record`
 * construct with `list of` for repeated members.
 *
 * The seam this closes: ADR-300 D7 lets a channel's value BE a record (the
 * platform's own `banner` is one), but `define channel` could describe only a
 * scalar, so an author could not say in a `.story` file what the engine
 * already does.
 *
 * REAL-PATH: real parse → analyze throughout; no hand-built AST.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRDataChannelDef } from '../src/ir';

/** A story whose clock emits `estate-clock` with `hour`, `chime` and `extra`. */
const story = (channelBody: string) => `story
  title: T
  authors:
    T
  id: t
  story-version: 0.0.1

create Alex
  a person
  playable

before the game starts
  change the player to Alex
end before

create the Hall
  a room

  A hall.

create the clock
  in the Hall

  A clock.

  on every turn
    emit estate-clock with hour "evening" and chime "one" and extra "x"
  end on

define channel clock
${channelBody}
end channel
`;

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const errorText = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.message).join('\n');

const dataChannel = (source: string): IRDataChannelDef => {
  const result = compile(source);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return result.ir.channels.find((c) => c.family === 'data') as IRDataChannelDef;
};

describe('define channel `return record` (ADR-300 D10)', () => {
  it('parses a record of scalar members, each carrying its own construct', () => {
    const ch = dataChannel(
      story(
        [
          '  mode replace',
          '  return record from estate-clock',
          '    when hour',
          '    label "It is (hour)"',
          '  end record',
        ].join('\n'),
      ),
    );

    expect(ch.fromEvent).toBe('estate-clock');
    expect(ch.returns).toEqual({
      kind: 'record',
      members: [
        { name: 'when', list: false, value: { kind: 'field', field: 'hour' } },
        { name: 'label', list: false, value: { kind: 'text', text: 'It is (hour)' } },
      ],
    });
  });

  it('parses `list of <construct>` as a repeated member', () => {
    const ch = dataChannel(
      story(
        [
          '  mode replace',
          '  return record from estate-clock',
          '    chimes list of chime',
          '  end record',
        ].join('\n'),
      ),
    );

    expect(ch.returns).toEqual({
      kind: 'record',
      members: [{ name: 'chimes', list: true, value: { kind: 'field', field: 'chime' } }],
    });
  });

  it('carries mode and gate through unchanged', () => {
    const ch = dataChannel(
      story(
        [
          '  mode append',
          '  gated by status-bar',
          '  return record from estate-clock',
          '    when hour',
          '  end record',
        ].join('\n'),
      ),
    );

    expect(ch.mode).toBe('append');
    expect(ch.gatedBy).toBe('statusBar');
  });

  it('cross-checks every member field against the event payload, naming the bad one', () => {
    // The ADR-253 D1 check has to descend into members, or a record becomes a
    // hole in it — the one place a typo would go unreported.
    const text = errorText(
      story(
        [
          '  mode replace',
          '  return record from estate-clock',
          '    when hour',
          '    oops nosuchfield',
          '  end record',
        ].join('\n'),
      ),
    );

    expect(text).toMatch(/nosuchfield/);
    expect(text).toMatch(/estate-clock/);
    expect(errorCodes(
      story(
        [
          '  mode replace',
          '  return record from estate-clock',
          '    oops nosuchfield',
          '  end record',
        ].join('\n'),
      ),
    )).toContain('analysis.channel-return-field');
  });

  it('cross-checks a text member\'s (slot) names too', () => {
    expect(errorCodes(
      story(
        [
          '  mode replace',
          '  return record from estate-clock',
          '    label "It is (nosuchfield)"',
          '  end record',
        ].join('\n'),
      ),
    )).toContain('analysis.channel-return-field');
  });

  it('rejects a record with no members, naming the alternative', () => {
    const source = story(
      ['  mode replace', '  return record from estate-clock', '  end record'].join('\n'),
    );
    expect(errorCodes(source)).toContain('analysis.channel-record-empty');
    expect(errorText(source)).toMatch(/return the construct directly/);
  });

  it('rejects a duplicate member name', () => {
    expect(errorCodes(
      story(
        [
          '  mode replace',
          '  return record from estate-clock',
          '    when hour',
          '    when chime',
          '  end record',
        ].join('\n'),
      ),
    )).toContain('analysis.channel-record-duplicate');
  });

  it('rejects a nested record by name — records do not nest', () => {
    const source = story(
      [
        '  mode replace',
        '  return record from estate-clock',
        '    inner record',
        '  end record',
      ].join('\n'),
    );
    expect(errorCodes(source)).toContain('parse.channel-record-nested');
    expect(errorText(source)).toMatch(/records do not nest/);
  });

  it('rejects an unclosed record block', () => {
    expect(errorCodes(
      story(['  mode replace', '  return record from estate-clock', '    when hour'].join('\n')),
    )).toContain('parse.channel-record-end');
  });

  it('rejects trailing text after a member construct', () => {
    expect(errorCodes(
      story(
        [
          '  mode replace',
          '  return record from estate-clock',
          '    when hour chime',
          '  end record',
        ].join('\n'),
      ),
    )).toContain('parse.channel-record-member');
  });

  it('leaves the scalar return forms untouched', () => {
    // D10 is additive: the three ADR-253 constructs still parse as before.
    const ch = dataChannel(story('  mode replace\n  return hour from estate-clock'));
    expect(ch.returns).toEqual({ kind: 'field', field: 'hour' });
  });
});

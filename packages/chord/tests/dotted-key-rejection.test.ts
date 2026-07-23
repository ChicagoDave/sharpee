/**
 * dotted-key-rejection.test.ts — ADR-254: Chord labels are single kebab-case
 * tokens. `readLabelKey` rejects a `.` in any bare label/key position with a
 * `parse.dotted-key` error (compile fails), while quoted string literals — file
 * paths, prose, titles — keep their dots (D3, no false positive). Assertions
 * pin the diagnostic code, span, and kebab fix-it per ADR-254 Acceptance.
 */
import { describe, expect, it } from 'vitest';
import { parse } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

function errorsOf(source: string) {
  return parse(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('dotted labels are rejected (ADR-254)', () => {
  it('a dotted define-phrase key raises parse.dotted-key at the dot with a kebab fix-it', () => {
    const errors = errorsOf(`${HEADER}define phrase zoo.pa.closed\n  Closed.\nend phrase\n`);
    const dotted = errors.filter((e) => e.code === 'parse.dotted-key');
    expect(dotted).toHaveLength(1);
    expect(dotted[0].message).toContain('zoo-pa-closed');
    expect(dotted[0].span.line).toBe(5);
  });

  it('a dotted blocked-exit key raises parse.dotted-key', () => {
    const errors = errorsOf(
      `${HEADER}create the Hall\n  a room\n  north is blocked: hedge.too.thick\n\n  A hall.\n`,
    );
    expect(errors.some((e) => e.code === 'parse.dotted-key')).toBe(true);
  });

  it('the compile fails (error severity) on a dotted label', () => {
    const result = parse(`${HEADER}define phrase a.b\n  Hi.\nend phrase\n`);
    expect(
      result.diagnostics.some((d) => d.severity === 'error' && d.code === 'parse.dotted-key'),
    ).toBe(true);
  });
});

describe('event-type sites reject dots too (ADR-256 — the ban is uniform)', () => {
  it('a dotted `emit` event id raises parse.dotted-key with a kebab fix-it', () => {
    const errors = errorsOf(
      `${HEADER}create the Hall\n  a room\n\n  on every turn\n    emit media.sound.play\n  end on\n\n  A hall.\n`,
    );
    const dotted = errors.filter((e) => e.code === 'parse.dotted-key');
    expect(dotted).toHaveLength(1);
    expect(dotted[0].message).toContain('media-sound-play');
  });

  it('a dotted channel `return … from <event>` key raises parse.dotted-key', () => {
    const errors = errorsOf(
      `${HEADER}define channel c\n  mode event\n  return hour from estate.clock\nend channel\n`,
    );
    expect(errors.some((e) => e.code === 'parse.dotted-key')).toBe(true);
  });

  it('a dotted machine `when event` trigger raises parse.dotted-key', () => {
    const errors = errorsOf(
      `${HEADER}define machine m\n  starts idle\n  state idle\n    when event gate.opened: idle\n  end state\nend machine\n`,
    );
    expect(errors.some((e) => e.code === 'parse.dotted-key')).toBe(true);
  });
});

describe('quoted strings keep their dots (ADR-254 D3 — no false positive)', () => {
  it('a quoted file path with dots does not raise parse.dotted-key', () => {
    const errors = errorsOf(`${HEADER}define text garbled from "./extras.ts"\n`);
    expect(errors.some((e) => e.code === 'parse.dotted-key')).toBe(false);
  });

  it('a dotted quoted title and dotted prose do not raise parse.dotted-key', () => {
    const src =
      'story "Dr. Who at 9 p.m." by "A. Author"\n  id: t\n  version: 0.0.1\n\ncreate the Hall\n  a room\n\n  A quiet hall. The door is ajar.\n';
    expect(parse(src).diagnostics.some((d) => d.code === 'parse.dotted-key')).toBe(false);
  });
});

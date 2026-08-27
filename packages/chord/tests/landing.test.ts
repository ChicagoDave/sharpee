/**
 * landing.test.ts — ADR-325 D5 (GH #309) compiler half: the `landing` line
 * on a region block (single room, strategy list), its gates (one per
 * region, strategy required for a list and forbidden for one room, rooms
 * contained, region-only host), a region becoming a place only once it
 * has a landing, and `set … landing to <room>`.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (market: string, extra = '', player = '') => `story
  title: Landing
  authors:
    T
  id: landing
  story-version: 0.0.1

create the Market
  a region
  containing the East Gate, the Stalls
${market}

create the Stalls
  a region
  containing the Hat Stall

create the East Gate
  a room

  A gate.

create the Hat Stall
  a room

  Hats.

create the Alley
  a room

  An alley.

create the monkey
  in the Alley

  A monkey.
${extra}
create Alex
  a person
  playable
  starts in the Alley

${player}
  You.

before the game starts
  change the player to Alex
end before

`;

const errs = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const ok = (src: string) => {
  const r = compile(src);
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir;
};

describe('the landing line (D5)', () => {
  it('lowers a single room with no strategy', () => {
    const ir = ok(story('  landing the East Gate'));
    expect(ir.entities.find((e) => e.id === 'market')!.landing).toMatchObject({ rooms: ['east-gate'], strategy: null });
  });

  it('lowers a strategy list, including a room reached through a nested region', () => {
    const ir = ok(story('  landing, randomly: the East Gate, the Hat Stall'));
    expect(ir.entities.find((e) => e.id === 'market')!.landing).toMatchObject({ rooms: ['east-gate', 'hat-stall'], strategy: 'randomly' });
    expect(ok(story('  landing, cycling: the East Gate and the Hat Stall')).entities.find((e) => e.id === 'market')!.landing?.strategy).toBe('cycling');
    expect(ok(story('  landing, stopping: the East Gate, the Hat Stall')).entities.find((e) => e.id === 'market')!.landing?.strategy).toBe('stopping');
  });

  it('a list must say how to choose; a single room takes no strategy', () => {
    expect(errs(story('  landing the East Gate, the Hat Stall'))).toContain('parse.landing-strategy');
    expect(errs(story('  landing, randomly: the East Gate'))).toContain('parse.landing-strategy');
    expect(errs(story('  landing, sometimes: the East Gate, the Hat Stall'))).toContain('parse.landing-strategy');
  });

  it('one landing line per region', () => {
    expect(errs(story('  landing the East Gate\n  landing the Hat Stall'))).toContain('parse.landing-duplicate');
  });

  it('rooms must be contained, and must be rooms', () => {
    expect(errs(story('  landing the Alley'))).toContain('analysis.landing-not-contained');
    expect(errs(story('  landing the Stalls'))).toContain('analysis.landing-kind');
  });

  it('only a region hosts a landing', () => {
    expect(errs(story('', '\ncreate the Shed\n  a room\n  landing the Alley\n\n  Shed.\n'))).toContain('analysis.landing-host');
  });
});

describe('a region as a place (D5)', () => {
  const clause = (stmt: string) => `  after going\n    ${stmt}\n  end after\n`;

  it('`move … to <region>` and `<region>\'s location` need a landing', () => {
    expect(errs(story('', '', clause('move the monkey to the Market')))).toContain('analysis.region-not-a-place');
    expect(errs(story('', '', clause("move the monkey to the Market's location")))).toContain('analysis.region-not-a-place');
    expect(errs(story('', '', clause("move the monkey to the Stalls")))).toContain('analysis.region-not-a-place');
  });

  it('a landing makes the region a destination', () => {
    const ir = ok(story('  landing the East Gate', '', clause('move the monkey to the Market')));
    expect(ir.entities.find((e) => e.isPlayable)!.onClauses[0].body[0]).toMatchObject({ kind: 'move', place: { kind: 'entity', id: 'market' } });
  });

  it("`set <region>'s landing to <room>` lowers as a field write", () => {
    const ir = ok(story('  landing the East Gate', '', clause("set the Market's landing to the Hat Stall")));
    expect(ir.entities.find((e) => e.isPlayable)!.onClauses[0].body[0]).toMatchObject({
      kind: 'set',
      target: { kind: 'field', base: { kind: 'entity', id: 'market' }, field: 'landing' },
      value: { kind: 'entity', id: 'hat-stall' },
    });
  });

  it('`set … landing` needs a region with a landing', () => {
    expect(errs(story('', '', clause("set the Market's landing to the Hat Stall")))).toContain('analysis.landing-set-target');
    expect(errs(story('  landing the East Gate', '', clause("set the monkey's landing to the Hat Stall")))).toContain('analysis.landing-set-target');
  });
});

/**
 * hunger.test.ts — ADR-263 D1: the `use hunger` body. Parse + analyze:
 * `grows N each turn`, `<band> at <n> [says <key>]` rungs (sorted, deduped),
 * `fatal at N`, and the shared `, announce <mode>` suffix.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (headerBody: string, phrases = '') => `story
  title: Survive
  authors:
    T
  id: survive
  story-version: 0.0.1
${headerBody}
create the Camp
  a room

  A cold camp.

create Alex
  a person
  playable
  starts in the Camp

  You.

before the game starts
  change the player to Alex
end before

${phrases}`;

const compileHeader = (headerBody: string, phrases = '') => {
  const r = compile(story(headerBody, phrases));
  return { ir: r.ir, errors: r.diagnostics.filter((d) => d.severity === 'error') };
};

const HUNGER =
  '  use hunger\n' +
  '    grows 1 each turn\n' +
  '    starving at 90 says the-gnawing\n' +
  '    peckish at 30 says feeling-peckish\n' +
  '    hungry at 60\n' +
  '    fatal at 100\n';

const PHRASES =
  '\ndefine phrases en-US\n' +
  '  the-gnawing:\n    A hollow ache.\n' +
  '  feeling-peckish:\n    You could eat.\n';

describe('use hunger body (ADR-263 D1)', () => {
  it('lowers grows, fatal, and sorted/deduped rungs into ir.hunger', () => {
    const { ir, errors } = compileHeader(HUNGER, PHRASES);
    expect(errors).toEqual([]);
    expect(ir.uses).toContain('hunger');
    expect(ir.hunger).toBeDefined();
    expect(ir.hunger!.grows).toBe(1);
    expect(ir.hunger!.fatal).toBe(100);
    expect(ir.hunger!.rungs.map((r) => [r.id, r.threshold])).toEqual([
      ['peckish', 30],
      ['hungry', 60],
      ['starving', 90],
    ]);
    expect(ir.hunger!.rungs.find((r) => r.id === 'peckish')!.phraseKey).toBe('feeling-peckish');
    expect(ir.hunger!.rungs.find((r) => r.id === 'hungry')!.phraseKey).toBeUndefined();
  });

  it('leaves ir.hunger absent when there is no use hunger', () => {
    const { ir, errors } = compileHeader('  use hunger\n    peckish at 30\n');
    expect(errors).toEqual([]);
    // sanity: a story without any use hunger has no hunger IR
    const { ir: bare } = compileHeader('');
    expect(bare.hunger).toBeUndefined();
    expect(ir.hunger).toBeDefined();
  });

  it('carries the announce mode via the shared suffix', () => {
    const { ir, errors } = compileHeader('  use hunger, announce silent\n    peckish at 30\n');
    expect(errors).toEqual([]);
    expect(ir.announceModes.hunger).toBe('silent');
  });

  it('rejects duplicate band thresholds', () => {
    const { errors } = compileHeader('  use hunger\n    peckish at 30\n    hungry at 30\n');
    expect(errors.map((e) => e.code)).toContain('analysis.duplicate-hunger-threshold');
  });

  it('flags a malformed grows line', () => {
    const { errors } = compileHeader('  use hunger\n    grows fast each turn\n    peckish at 30\n');
    expect(errors.map((e) => e.code)).toContain('parse.hunger-grows');
  });

  it('flags a malformed fatal line', () => {
    const { errors } = compileHeader('  use hunger\n    peckish at 30\n    fatal soon\n');
    expect(errors.map((e) => e.code)).toContain('parse.hunger-fatal');
  });
});

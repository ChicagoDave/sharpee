/**
 * servings-line.test.ts — the entity line `servings <n>`: how many bites or
 * sips a thing has before it is finished. Every case asserts an IR field or
 * a specific diagnostic code — never "parsed without throwing".
 *
 * Owner context: @sharpee/chord test suite.
 *
 * References:
 * - docs/work/archive/event-processor-one-writer/plan.md, Phase 5 — the line and its refusals.
 * - tests/adr-369-container-settings.test.ts — `holds <n>`, the line this one is built like.
 */
import { describe, expect, it } from 'vitest';
import { compile, validateIR } from '../src';
import type { StoryIR } from '../src/ir';

const HEADER = `story
  title: Servings
  authors:
    T
  id: servings
  story-version: 0.0.1
`;

interface Slots {
  hall?: string;
  loaf?: string;
  flask?: string;
  stone?: string;
}

const world = (s: Slots = {}) => `${HEADER}
create the Hall
  a room
${s.hall ?? ''}
  A hall.

create the loaf
  a thing, edible
${s.loaf ?? ''}
  in the Hall

  A loaf.

create the flask
  a thing, drinkable
${s.flask ?? ''}
  in the Hall

  A flask.

create the stone
  a thing
${s.stone ?? ''}
  in the Hall

  A stone.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

const errors = (s: Slots) => compile(world(s)).diagnostics.filter((d) => d.severity === 'error');
const codes = (s: Slots) => errors(s).map((d) => d.code);
const ok = (s: Slots): StoryIR => {
  const r = compile(world(s));
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir;
};
const entity = (ir: StoryIR, id: string) => ir.entities.find((e) => e.id === id)!;

describe('`servings <n>` says how many bites or sips a thing has', () => {
  it('lowers to `servings` on an edible thing and on a drinkable thing', () => {
    const ir = ok({ loaf: '  servings 3\n', flask: '  servings 2\n' });
    expect(entity(ir, 'loaf').servings).toBe(3);
    expect(entity(ir, 'flask').servings).toBe(2);
  });

  it('is absent from the IR when the block has no line', () => {
    const ir = ok({});
    expect(entity(ir, 'loaf').servings).toBeUndefined();
    expect('servings' in entity(ir, 'loaf')).toBe(false);
  });

  it('is `analysis.servings-owner` on a thing that is neither edible nor drinkable, naming the fix', () => {
    const d = errors({ stone: '  servings 2\n' }).find((d) => d.code === 'analysis.servings-owner')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`stone`');
    expect(d.message).toContain('`edible`');
    expect(d.message).toContain('`drinkable`');
    expect(codes({ hall: '  servings 2\n' })).toContain('analysis.servings-owner');
  });

  it('the owner rule is a fact of the IR: a hand-built IR is refused the same way', () => {
    const ir = ok({});
    expect(validateIR(ir).map((d) => d.code)).not.toContain('analysis.servings-owner');
    entity(ir, 'stone').servings = 2;
    expect(validateIR(ir).map((d) => d.code)).toContain('analysis.servings-owner');
  });

  it('a second line is `analysis.servings-duplicate`, citing the first, and the first value stands', () => {
    const slots = { loaf: '  servings 3\n  servings 5\n' };
    const d = errors(slots).find((d) => d.code === 'analysis.servings-duplicate')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`loaf`');
    expect(d.message).toMatch(/line \d+/);
    expect(entity(compile(world(slots)).ir, 'loaf').servings).toBe(3);
  });

  it('zero, a negative, a fraction, a word, trailing words and a bare line are `parse.servings-number`', () => {
    for (const line of ['  servings 0\n', '  servings -1\n', '  servings 1.5\n', '  servings three\n', '  servings 3 bites\n', '  servings\n']) {
      expect(codes({ loaf: line }), line).toContain('parse.servings-number');
      expect(entity(compile(world({ loaf: line })).ir, 'loaf').servings, line).toBeUndefined();
    }
  });
});

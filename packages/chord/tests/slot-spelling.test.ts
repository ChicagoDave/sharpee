/**
 * slot-spelling.test.ts — ADR-267 landing group 1 (D1/D15 + D2): one slot
 * spelling, `the <name>`, shared by alteration-block patterns and `define
 * action` grammar lines. The removed spellings — `(word)` parens and
 * `:word` colon — are named parse errors (`parse.removed-slot-spelling`
 * with a fix-it naming the replacement), never legacy forms. D2:
 * `analysis.slot-shadows-entity` warns when a slot name shadows an entity
 * name, with slot-first resolution unchanged.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';
const WORLD = 'create the Barn\n  a room\n\n  A barn.\n\ncreate the player\n  starts in the Barn\n\n  You.\n';

const errorsOf = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error');
const warningsOf = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'warning');

describe('one slot production: `the <name>` (ADR-267 D1/D15)', () => {
  it('define action: `the <name>` in a grammar line is a slot in the IR', () => {
    const source = `${HEADER}define action petting\n  grammar\n    pet the animal\n  otherwise refuse cant-pet\n\n  phrases en-US\n    cant-pet:\n      No.\n\n${WORLD}`;
    const result = compile(source);
    expect(errorsOf(source)).toEqual([]);
    const action = result.ir!.actions.find((a) => a.name === 'petting')!;
    expect(action.patterns[0].parts).toEqual([
      { kind: 'word', word: 'pet' },
      { kind: 'slot', word: 'animal' },
    ]);
  });

  it('define verb is removed (ADR-270 D7) — parse.removed-define-verb with the extend-action fix-it', () => {
    const errors = errorsOf(`${HEADER}define verb hang or hook means put the something on the something\n\n${WORLD}`);
    const err = errors.find((e) => e.code === 'parse.removed-define-verb');
    expect(err, errors.map((e) => `${e.code} ${e.message}`).join(' | ')).toBeDefined();
    expect(err!.message).toContain('extend action');
  });

  it('rejects the removed `(word)` spelling with the `the <name>` fix-it', () => {
    const errors = errorsOf(`${HEADER}extend action smelling\n  grammar\n    sniff (something)\n\n${WORLD}`);
    const err = errors.find((e) => e.code === 'parse.removed-slot-spelling');
    expect(err, errors.map((e) => `${e.code} ${e.message}`).join(' | ')).toBeDefined();
    expect(err!.message).toContain('`(something)`');
    expect(err!.message).toContain('`the something`');
  });

  it('rejects the removed `:word` grammar-line spelling with the `the <name>` fix-it', () => {
    const errors = errorsOf(
      `${HEADER}define action petting\n  grammar\n    pet :animal\n  otherwise refuse cant-pet\n\n  phrases en-US\n    cant-pet:\n      No.\n\n${WORLD}`,
    );
    const err = errors.find((e) => e.code === 'parse.removed-slot-spelling');
    expect(err, errors.map((e) => `${e.code} ${e.message}`).join(' | ')).toBeDefined();
    expect(err!.message).toContain('`:animal`');
    expect(err!.message).toContain('`the animal`');
  });

  it('rejects a dangling `the` at the end of a grammar line, by name', () => {
    const errors = errorsOf(
      `${HEADER}define action petting\n  grammar\n    pet the\n  otherwise refuse cant-pet\n\n  phrases en-US\n    cant-pet:\n      No.\n\n${WORLD}`,
    );
    expect(errors.some((e) => e.code === 'parse.action-slot')).toBe(true);
  });
});

describe('analysis.slot-shadows-entity (ADR-267 D2)', () => {
  // A body statement referencing `the animal` where `animal` is both the
  // action's slot and an entity's name: the slot wins (unchanged), and the
  // collision now warns instead of staying silent.
  const shadowStory = `${HEADER}define action petting\n  grammar\n    pet the animal\n  move the animal to the Barn\n  otherwise refuse cant-pet\n\n  phrases en-US\n    cant-pet:\n      No.\n\ncreate the animal\n  in the Barn\n\n  An animal.\n\n${WORLD}`;

  it('warns on the collision, naming both the slot and the shadowed entity', () => {
    const warnings = warningsOf(shadowStory);
    const warn = warnings.find((w) => w.code === 'analysis.slot-shadows-entity');
    expect(warn, warnings.map((w) => `${w.code} ${w.message}`).join(' | ')).toBeDefined();
    expect(warn!.message).toContain('`animal`');
    expect(warn!.message).toContain('grammar slot');
    expect(warn!.message).toContain('entity');
  });

  it('resolution is unchanged: the reference still compiles to the slot, and no error is added', () => {
    const result = compile(shadowStory);
    expect(errorsOf(shadowStory)).toEqual([]);
    const action = result.ir!.actions.find((a) => a.name === 'petting')!;
    const move = action.body.find((s) => s.kind === 'move')!;
    expect(move.kind === 'move' && move.entity).toEqual({ kind: 'slot', name: 'animal' });
  });

  it('stays silent when no entity shares the slot name', () => {
    const clean = `${HEADER}define action petting\n  grammar\n    pet the animal\n  move the animal to the Barn\n  otherwise refuse cant-pet\n\n  phrases en-US\n    cant-pet:\n      No.\n\n${WORLD}`;
    expect(warningsOf(clean).filter((w) => w.code === 'analysis.slot-shadows-entity')).toEqual([]);
  });
});

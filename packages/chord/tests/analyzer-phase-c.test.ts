/**
 * analyzer-phase-c.test.ts — Phase C P3 analysis: the three-ring
 * boolean-state gate (D9), the D6 refuse-when polarity gate, the
 * duplicate-clause gate, cross-trait state resolution + the D8 collision
 * gate, D4 change legality, state adjectives (D1), owner-scoped inline
 * phrases, and the decision-10 narration tags.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function gateErrors(name: string) {
  return compile(fixture(join('gates', name))).diagnostics.filter((d) => d.severity === 'error');
}

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('three-ring boolean-state gate (D9)', () => {
  it('ring 1: literal booleans as state names', () => {
    const errors = gateErrors('boolean-state.story');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.boolean-state');
    expect(errors[0].span.line).toBe(7);
    expect(errors[0].message).toContain('given 8');
  });

  it('ring 2: a set reproducing a platform-owned pair, naming the trait to compose', () => {
    const errors = gateErrors('shadow-state.story');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.shadow-state');
    expect(errors[0].span.line).toBe(7);
    expect(errors[0].message).toContain('compose `openable`');
  });

  it('ring 3: negation-shaped pairs, with the encouraging fix-it', () => {
    const errors = gateErrors('negated-state.story');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.negated-state');
    expect(errors[0].span.line).toBe(7);
    expect(errors[0].message).toContain('names the absence of `fed`');
    expect(errors[0].message).toContain('never the absence of another state');
  });

  it('ring 3 catches shared-stem pairs (active/inactive) on the story set', () => {
    const errors = errorsOf('story "T" by "N"\n  id: t\n  version: 0.0.1\n  states: active, inactive\n');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.negated-state');
  });

  it('rings check every scope: trait state sets too', () => {
    const errors = errorsOf(`${HEADER}define trait togglish\n  states: on, off\nend trait\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.shadow-state');
    expect(errors[0].message).toContain('compose `switchable`');
  });
});

describe('refuse-when polarity gate (D6)', () => {
  it('top-level `not` in a body refuse-when is a load error with the must-form fix-it', () => {
    const errors = gateErrors('negated-requirement.story');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.negated-requirement');
    expect(errors[0].span.line).toBe(11);
    expect(errors[0].message).toContain('must');
  });
});

describe('duplicate-clause gate (Phase C P3)', () => {
  const errors = gateErrors('duplicate-clause.story');

  it('flags a second same-action clause on one trait even when condition-differentiated', () => {
    const traitError = errors.find((e) => e.span.line === 16)!;
    expect(traitError.code).toBe('analysis.duplicate-clause');
    expect(traitError.message).toContain('trait `guarded`');
    expect(traitError.message).toContain('line 12');
  });

  it('flags identically-conditioned event clauses on one entity', () => {
    const entityError = errors.find((e) => e.span.line === 34)!;
    expect(entityError.code).toBe('analysis.duplicate-clause');
    expect(entityError.message).toContain('foyer');
    expect(entityError.message).toContain('line 29');
  });

  it('reports exactly the two masks', () => {
    expect(errors).toHaveLength(2);
  });

  it('condition-differentiated event clauses are legal (the aviary pattern)', () => {
    const errors = errorsOf(
      `${HEADER}create the Aviary\n  a room\n\n  A dome.\n\n` +
        `  after entering it while after-hours\n    phrase nods\n      Nods.\n  end after\n\n` +
        `  after entering it while not after-hours\n    phrase notices\n      Notices.\n  end after\n\n` +
        `create the player\n  starts in the Aviary\n\n  You.\n`,
    );
    expect(errors.filter((e) => e.code === 'analysis.duplicate-clause')).toEqual([]);
  });
});

describe('trait states: cross-trait resolution and the D8 collision gate', () => {
  it('two composed traits declaring the same state collide', () => {
    const errors = gateErrors('state-collision.story');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.state-collision');
    expect(errors[0].span.line).toBe(16);
    expect(errors[0].message).toContain('`content`');
    expect(errors[0].message).toContain('rename');
  });

  it("a trait clause reads a state declared on a co-composed trait (restless reads feedable's hungry)", () => {
    const errors = errorsOf(
      `${HEADER}define trait feedable\n  states, reversible: hungry, content\nend trait\n\n` +
        `define trait restless\n  phrases en-US\n    paces:\n      It paces.\n\n` +
        `  on every turn while it is hungry\n    phrase paces\n  end on\nend trait\n\n` +
        `create the llama\n  scenery\n  feedable\n  restless\n\ncreate the player\n\n  You.\n`,
    );
    expect(errors).toEqual([]);
  });
});

describe('change legality (D4)', () => {
  it('changing to the initial state of a forward-only set is a load error', () => {
    const errors = gateErrors('irreversible-state.story');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.irreversible-state');
    expect(errors[0].span.line).toBe(15);
    expect(errors[0].message).toContain('reversible');
  });

  it('a reversible set permits the back-transition', () => {
    const errors = errorsOf(
      `${HEADER}create the vase\n  scenery\n  states, reversible: whole, broken\n\n` +
        `create the Parlor\n  a room\n\n  A parlor.\n\n` +
        `  after entering it\n    change the vase to whole\n  end after\n\ncreate the player\n  starts in the Parlor\n\n  You.\n`,
    );
    expect(errors).toEqual([]);
  });
});

describe('state adjectives (D1) and narration tags (decision 10)', () => {
  it('`is closed` resolves as a state adjective with no shadow flag', () => {
    const errors = errorsOf(
      `${HEADER}create the staff gate\n  scenery\n  openable\n\n` +
        `create the Yard\n  a room\n  north is blocked while the staff gate is closed: gate-shut\n\n  A yard.\n\n` +
        `define phrase gate-shut\n  The gate is shut.\nend phrase\n\ncreate the player\n  starts in the Yard\n\n  You.\n`,
    );
    expect(errors).toEqual([]);
  });

  it('entity clauses are presence-scoped; sequences broadcast', () => {
    const result = compile(
      `${HEADER}create the Aviary\n  a room\n\n  A dome.\n\n` +
        `  after entering it\n    phrase notices\n      Notices.\n  end after\n\n` +
        `define sequence closing time\n  at turn 2\n    phrase bell\n      A bell rings.\nend sequence\n\ncreate the player\n  starts in the Aviary\n\n  You.\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const aviary = result.ir.entities.find((e) => e.id === 'aviary')!;
    expect(aviary.onClauses[0].narration).toBe('presence');
    expect(result.ir.sequences[0].narration).toBe('broadcast');
  });
});

describe('owner-scoped inline phrases (Phase C P3)', () => {
  const result = compile(
    `${HEADER}create the Den\n  a room\n\n  A den.\n\n` +
      `  after entering it\n    phrase confession\n      The den confesses.\n  end after\n\n` +
      `create the snake\n  scenery\n  in the Den\n\n  after entering it\n    phrase confession\n      The snake confesses.\n  end after\n\n` +
      `create the player\n  starts in the Den\n\n  You.\n`,
  );

  it('two owners declaring the same inline key do not collide', () => {
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('the keys register owner-scoped (the phrase-override mechanism)', () => {
    const table = result.ir.phrases.locales['en-US'];
    expect(table['den.confession']).toBeDefined();
    expect(table['snake.confession']).toBeDefined();
    expect(table['confession']).toBeUndefined();
  });
});

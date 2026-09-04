/**
 * adr-327-phase1.test.ts — ADR-327 Phase 1 (Chord 4.0.0): actor-explicit
 * clause heads (D1) and the own-block bare head, syntactic `it`/`its`
 * removed outside `define trait` with owner-naming fix-its (D2/D6), the
 * trait-carrier allowance (D8), scene heads pinned untouched (D4), and the
 * `on <article>` placement/head split by block structure. Every case asserts
 * the emitted IR field or the specific diagnostic code and fix-it text —
 * never "parsed without throwing".
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import { IR_FORMAT } from '../src/ir';
import { CHORD_LANGUAGE_VERSION } from '../src/version';
import type { IROnClause, StoryIR } from '../src/ir';

const HEADER = `story
  title: Heads
  authors:
    T
  id: heads
  story-version: 0.0.1
`;

const PHRASES = `
define phrases en-US
  nope:
    No.
  note:
    Noted.
`;

interface Slots {
  header?: string;
  top?: string;
  hall?: string;
  jack?: string;
  mercs?: string;
  sword?: string;
  player?: string;
}

/** The fixture world; each slot is spliced into that block, already indented. */
const world = (s: Slots = {}) => `${HEADER}${s.header ?? ''}
${s.top ?? ''}
create the Hall
  a room
${s.hall ?? ''}
  A hall.

create Jack
  a person
  in the Hall
  states, reversible: calm, wary
${s.jack ?? ''}
  Jack.

create the wandering mercenaries
  a person, plural
  in the Hall
${s.mercs ?? ''}
  Mercs.

create the sword
  in the Hall
  states, reversible: sheathed, drawn
${s.sword ?? ''}
  A sword.

create Alex
  a person
  playable
  starts in the Hall

${s.player ?? ''}
  You.

before the game starts
  change the player to Alex
end before

${PHRASES}`;

const errors = (s: Slots) => compile(world(s)).diagnostics.filter((d) => d.severity === 'error');
const codes = (s: Slots) => errors(s).map((d) => d.code);
const ok = (s: Slots): StoryIR => {
  const r = compile(world(s));
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir;
};
const clause = (ir: StoryIR, id: string, index = 0): IROnClause => ir.entities.find((e) => e.id === id)!.onClauses[index];
const entityIdNamed = (ir: StoryIR, name: string) => ir.entities.find((e) => e.name.toLowerCase().includes(name))!.id;

describe('D1 — actor-explicit heads carry the actor in the IR', () => {
  it('`on the player taking` on a thing: the owner is the object, the actor is the player role', () => {
    const c = clause(ok({ sword: '  on the player taking\n    refuse nope\n  end on\n' }), 'sword');
    expect(c).toMatchObject({ clauseKind: 'on', action: 'taking', binding: 'object', actor: { kind: 'player' }, routing: 'interceptor', role: null });
  });

  it('a named single-word actor resolves to the character entity', () => {
    const ir = ok({ sword: '  on Jack taking\n    refuse nope\n  end on\n' });
    expect(clause(ir, 'sword').actor).toEqual({ kind: 'entity', id: 'jack' });
  });

  it('a multi-word named actor with an article resolves to the character entity', () => {
    const ir = ok({ sword: '  after the wandering mercenaries taking\n    phrase note\n  end after\n' });
    expect(clause(ir, 'sword')).toMatchObject({ clauseKind: 'after', action: 'taking', binding: 'object', actor: { kind: 'entity', id: entityIdNamed(ir, 'mercenaries') } });
  });

  it('a two-object action (`giving`, with a `to` slot) heads the same way — the owner is the direct object', () => {
    const c = clause(ok({ sword: '  on the player giving\n    refuse nope\n  end on\n' }), 'sword');
    expect(c).toMatchObject({ action: 'giving', binding: 'object', actor: { kind: 'player' } });
  });

  it('a hyphenated gerund is one head word', () => {
    const c = clause(ok({ sword: '  after the player letting-go\n    phrase note\n  end after\n' }), 'sword');
    expect(c).toMatchObject({ action: 'letting-go', actor: { kind: 'player' } });
  });

  it('a `define action` gerund routes to a capability and still carries the actor', () => {
    const top = 'define action petting\n  grammar\n    pet the animal\n  the animal must be reachable\n  refuse without animal: nope\n  otherwise refuse nope\n';
    const c = clause(ok({ top, sword: '  on the player petting\n    phrase note\n  end on\n' }), 'sword');
    expect(c).toMatchObject({ action: 'petting', binding: 'object', actor: { kind: 'player' }, routing: 'capability' });
  });

  it('a role head takes the actor too (Q2): `on the player taking anything as the taker`', () => {
    const c = clause(ok({ sword: '  on the player taking anything as the taker\n    refuse nope\n  end on\n' }), 'sword');
    expect(c).toMatchObject({ action: 'taking', binding: 'role', role: 'taker', actor: { kind: 'player' } });
  });

  it('two heads with different actors on one owner are two clauses, not a duplicate (Acceptance item 2)', () => {
    const ir = ok({ sword: '  on the player taking\n    refuse nope\n  end on\n\n  on Jack taking\n    refuse note\n  end on\n' });
    expect(ir.entities.find((e) => e.id === 'sword')!.onClauses.map((c) => c.actor)).toEqual([{ kind: 'player' }, { kind: 'entity', id: 'jack' }]);
  });

  it('the same actor twice on one owner is still analysis.duplicate-clause', () => {
    expect(codes({ sword: '  on the player taking\n    refuse nope\n  end on\n\n  on the player taking\n    refuse note\n  end on\n' })).toEqual(['analysis.duplicate-clause']);
  });

  it('`while` and `, once` still follow the head', () => {
    const c = clause(ok({ hall: '  after the player entering while the sword is sheathed, once\n    phrase note\n  end after\n' }), 'hall');
    expect(c).toMatchObject({ action: 'entering', actor: { kind: 'player' }, once: true });
    expect(c.condition).not.toBeNull();
  });
});

describe("D1 — the own-block bare head is the owner's own action", () => {
  it('bare `on taking` in the player block binds self with no actor (Q1: any gerund)', () => {
    const c = clause(ok({ player: '  on taking\n    refuse nope\n  end on\n' }), 'alex');
    expect(c).toMatchObject({ action: 'taking', binding: 'self', actor: null });
  });

  it("bare `after going` in a character's block binds self", () => {
    const c = clause(ok({ jack: '  after going\n    phrase note\n  end after\n' }), 'jack');
    expect(c).toMatchObject({ action: 'going', binding: 'self', actor: null });
  });

  it('bare head on a room: analysis.head-bare-outside-actor, fix-it quoting the explicit form', () => {
    const found = errors({ hall: '  on going\n    refuse nope\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.head-bare-outside-actor']);
    expect(found[0].message).toContain('`on the player going`');
  });

  it('bare head on a thing: the same error', () => {
    expect(codes({ sword: '  on taking\n    refuse nope\n  end on\n' })).toEqual(['analysis.head-bare-outside-actor']);
  });

  it('bare head in a trait body: the same error (a trait has no acting owner)', () => {
    expect(codes({ top: 'define trait guarded\n  on taking\n    refuse nope\n  end on\nend trait\n' })).toEqual(['analysis.head-bare-outside-actor']);
  });

  it("naming the block's own owner: analysis.head-actor-is-owner, fix-it quoting the bare form", () => {
    // ADR-327 D10: `on the player …` inside a character block names the ROLE,
    // not that block's owner — who holds it is a run-time fact — so only the
    // by-name form still gates.
    const alex = errors({ player: '  on Alex taking\n    refuse nope\n  end on\n' });
    expect(alex.map((d) => d.code)).toEqual(['analysis.head-actor-is-owner']);
    expect(alex[0].message).toContain('`on taking`');
    const jack = errors({ jack: '  after Jack going\n    phrase note\n  end after\n' });
    expect(jack.map((d) => d.code)).toEqual(['analysis.head-actor-is-owner']);
    expect(jack[0].message).toContain("Jack's own block");
  });

  it('a role tail on a bare head is parse.on-head — a role head names who acts', () => {
    expect(codes({ sword: '  on taking anything as the taker\n    refuse nope\n  end on\n' })).toContain('parse.on-head');
  });
});

describe('D1 — non-actors and unresolved actors', () => {
  it('a room cannot act: analysis.head-actor names it', () => {
    const found = errors({ sword: '  on the Hall taking\n    refuse nope\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.head-actor']);
    expect(found[0].message).toContain('`the Hall` cannot act');
  });

  it('a forgotten verb (`on the mercenaries`) is analysis.head-actor with the actor-then-action hint', () => {
    const found = errors({ sword: '  on the mercenaries\n    refuse nope\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.head-actor']);
    expect(found[0].message).toContain('the actor first, then the action word');
  });

  it('an unknown name is analysis.head-actor', () => {
    expect(codes({ sword: '  on nobody taking\n    refuse nope\n  end on\n' })).toEqual(['analysis.head-actor']);
  });

  it('an empty head is parse.on-head', () => {
    expect(codes({ sword: '  on\n    refuse nope\n  end on\n' })).toContain('parse.on-head');
  });
});

describe('D6 — removed spellings are named errors with fix-its, one per line', () => {
  it('`on taking it` is parse.removed-head-it, quoting the explicit spelling, with no cascade', () => {
    const found = errors({ sword: '  on taking it\n    refuse nope\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['parse.removed-head-it']);
    expect(found[0].message).toContain('`on the player taking`');
  });

  it('`after entering it` on a room is the same single error', () => {
    const found = errors({ hall: '  after entering it\n    phrase note\n  end after\n' });
    expect(found.map((d) => d.code)).toEqual(['parse.removed-head-it']);
    expect(found[0].message).toContain('`after the player entering`');
  });

  const inSword = (line: string) => errors({ sword: `  on the player taking\n    ${line}\n  end on\n` });

  it.each([
    ['change it to drawn'],
    ['move it to the Hall'],
    ['remove it'],
    ['phrase note when it is drawn'],
  ])('body `it` in `%s` is analysis.it-removed naming the owner', (line) => {
    const found = inSword(line);
    expect(found.map((d) => d.code)).toEqual(['analysis.it-removed']);
    expect(found[0].message).toContain('`the sword`');
  });

  it('`while it is …` on the head is the same error', () => {
    const found = errors({ sword: '  on the player taking while it is sheathed\n    refuse nope\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.it-removed']);
    expect(found[0].message).toContain('`the sword`');
  });

  it("`raise its <counter>` names the owner's possessive", () => {
    const found = errors({ jack: '  counter patience starts 0\n\n  on every turn\n    raise its patience by 1\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.it-removed']);
    expect(found[0].message).toContain("`Jack's patience`");
  });

  it("`reset its <timer>` names the owner's possessive", () => {
    const found = errors({ top: 'define timer lunge for Jack\n  coiling\nend timer\n', jack: '  on every turn\n    reset its lunge\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.it-removed']);
    expect(found[0].message).toContain("`Jack's lunge`");
  });

  it('`its <counter>` in a head condition is the same error', () => {
    const found = errors({ jack: '  counter patience starts 0\n\n  on every turn while its patience is at least 1\n    phrase note\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.it-removed']);
    expect(found[0].message).toContain("`Jack's patience`");
  });

  it('a story-owned clause keeps its own unbound-referent gate and is not double-reported', () => {
    const found = errors({ header: '\n  on every turn\n    change it to drawn\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.story-clause-it']);
  });
});

describe('D8 — inside `define trait`, `it`/`its` are the carrier in every position', () => {
  const TRAIT = `define trait kick-escape
  states, reversible: oblivious, aggressive

  on the player kicking
    refuse when it is oblivious: nope
    phrase note when it is aggressive
    change it to aggressive
    select on its state
      when oblivious
        phrase note
      when aggressive
        phrase nope
    end select
  end on
end trait
`;

  it('condition, statement, and possessive positions lower to the carrier without diagnostics', () => {
    const ir = ok({ top: TRAIT });
    const trait = ir.traits.find((t) => t.name === 'kick-escape')!;
    const body = trait.onClauses[0].body;
    expect(trait.onClauses[0]).toMatchObject({ action: 'kicking', binding: 'object', actor: { kind: 'player' } });
    expect(body[0]).toMatchObject({ kind: 'refuse-when', condition: { kind: 'predicate', subject: { kind: 'it' } } });
    expect(body[2]).toMatchObject({ kind: 'change', entity: { kind: 'it' } });
    expect(body[3]).toMatchObject({ kind: 'select-on', subject: { kind: 'field', base: { kind: 'it' }, field: 'state' } });
  });

  it('the identical lines one block out are analysis.it-removed', () => {
    const found = errors({ sword: '  on the player kicking\n    refuse when it is sheathed: nope\n    change it to drawn\n  end on\n' });
    expect(found.map((d) => d.code)).toEqual(['analysis.it-removed', 'analysis.it-removed']);
    expect(found.every((d) => d.message.includes('`the sword`'))).toBe(true);
  });

  it("an open `define condition` keeps `it` as its quantified subject (the second carrier scope)", () => {
    const ir = ok({ top: 'define condition drawn-blade: it is drawn\n' });
    expect(ir.conditions[0]).toMatchObject({ name: 'drawn-blade', open: true });
  });
});

describe('D4 — scene heads are excluded by name and still parse', () => {
  it('`on parting:` / `on resuming:` / `on refusing:` in a conversation', () => {
    const top = `define conversation the-plan for Jack
  about "the plan"
  beat:
    phrase note
  on parting:
    phrase note
  on resuming:
    phrase note
  on refusing:
    phrase nope
  conclusion:
    phrase note
end conversation
`;
    const ir = ok({ top });
    expect(ir.entities.find((e) => e.id === 'jack')!.conversations).toHaveLength(1);
  });

  it('`on leaving:` in an exchange', () => {
    const top = `define exchange the-question for Jack
  answer "yes":
    phrase note
  on leaving:
    phrase nope
end exchange
`;
    expect(codes({ top })).toEqual([]);
  });
});

describe('placement vs head — split by block structure, not by the article', () => {
  it('`on the table` (one line) is a placement, not a clause', () => {
    const ir = ok({ top: 'create the table\n  in the Hall\n\n  A table.\n', sword: '  on the table\n' });
    const sword = ir.entities.find((e) => e.id === 'sword')!;
    expect(sword.onClauses).toEqual([]);
    expect(sword.placement).toMatchObject({ relation: 'on', place: 'table' });
  });

  it('`on the player taking` followed by a body is a clause', () => {
    const ir = ok({ top: 'create the table\n  in the Hall\n\n  A table.\n', sword: '  on the table\n\n  on the player taking\n    refuse nope\n  end on\n' });
    const sword = ir.entities.find((e) => e.id === 'sword')!;
    expect(sword.onClauses).toHaveLength(1);
    expect(sword.placement).toMatchObject({ relation: 'on', place: 'table' });
  });

  it('an empty clause (`on the player taking` then `end on`) is still a clause', () => {
    expect(clause(ok({ sword: '  on the player taking\n  end on\n' }), 'sword')).toMatchObject({ action: 'taking', actor: { kind: 'player' } });
  });
});

describe('the wire stamps move with the major', () => {
  it('IR format is `story language 4` and the IR carries the current language version', () => {
    const ir = ok({});
    expect(IR_FORMAT).toBe('story language 4');
    expect(ir.format).toBe('story language 4');
    // The 4.x major this phase landed was folded into public 3.5.0 by the
    // owner's consolidation ruling (2026-08-29, version.ts) — the IR carries
    // whatever the public number is; the major itself is no longer asserted.
    expect(ir.languageVersion).toBe(CHORD_LANGUAGE_VERSION);
  });
});

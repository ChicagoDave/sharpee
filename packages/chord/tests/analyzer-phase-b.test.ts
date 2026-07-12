/**
 * analyzer-phase-b.test.ts — Phase B analysis under the ownership package:
 * four-phase routing (both halves), role validation, hatch kinds +
 * hasHatches, owner-qualified scores and award resolution, story states,
 * trait states, must/refuse-when compilation, sequence anchors,
 * open/closed condition classification, and the gate classes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function compiledClean(name: string) {
  const result = compile(fixture(name));
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, `${name}: ${errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')}`).toEqual([]);
  return result.ir;
}

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('zoo-actions IR (§3.4 + ownership package)', () => {
  const ir = compiledClean('zoo-actions.story');

  it('routes dispatch-verb trait clauses to CapabilityBehaviors', () => {
    const pettable = ir.traits.find((t) => t.name === 'pettable')!;
    expect(pettable.onClauses[0]).toMatchObject({ clauseKind: 'on', action: 'petting', binding: 'it', routing: 'capability' });
    const feedable = ir.traits.find((t) => t.name === 'feedable')!;
    expect(feedable.onClauses[0].routing).toBe('capability');
  });

  it('builds action defs with patterns, constraints, refusals, otherwise', () => {
    const petting = ir.actions.find((a) => a.name === 'petting')!;
    expect(petting.patterns).toHaveLength(2);
    expect(petting.constraints).toEqual([{ slot: 'animal', requirement: 'reachable' }]);
    expect(petting.refusals).toMatchObject([{ kind: 'without', slot: 'animal', phraseKey: 'pet-what' }]);
    expect(petting.otherwise).toBe('cant-pet');
  });

  it('registers owner-qualified scores and resolves awards to the owner (D12)', () => {
    expect(ir.scores).toMatchObject([
      { name: 'trait.pettable.petted', worth: 5 },
      { name: 'pygmy-goats.fed', worth: 10 },
    ]);
    const pettable = ir.traits.find((t) => t.name === 'pettable')!;
    const award = pettable.onClauses[0].body.find((s) => s.kind === 'award');
    expect(award).toMatchObject({ kind: 'award', expression: ['trait.pettable.petted'] });
    const goats = ir.entities.find((e) => e.id === 'pygmy-goats')!;
    expect(goats.onClauses[0].body[0]).toMatchObject({ kind: 'award', expression: ['pygmy-goats.fed'] });
  });

  it('compiles reactions as after-clauses on the owner (no floating rules)', () => {
    expect(ir.rules).toEqual([]);
    expect(ir.flags).toEqual([]);
    expect(ir.onceRules).toEqual([]);
    expect(ir.everyRules).toEqual([]);
    const goats = ir.entities.find((e) => e.id === 'pygmy-goats')!;
    expect(goats.onClauses).toMatchObject([
      { clauseKind: 'after', action: 'feeding', binding: 'it', routing: 'capability' },
    ]);
  });

  it('compiles refuse-when against trait fields and validates one-of members', () => {
    const pettable = ir.traits.find((t) => t.name === 'pettable')!;
    const body = pettable.onClauses[0].body;
    // `refuse when kind is snake: glass-way` — field subject, member object.
    expect(body[0]).toMatchObject({
      kind: 'refuse-when',
      phraseKey: 'glass-way',
      condition: {
        kind: 'predicate',
        pred: 'is',
        subject: { kind: 'field', base: { kind: 'it' }, field: 'kind' },
        object: { kind: 'symbol', name: 'snake' },
      },
    });
  });

  it('compiles trait states and must requirements on feedable (D6/D8)', () => {
    const feedable = ir.traits.find((t) => t.name === 'feedable')!;
    expect(feedable.states).toEqual(['hungry', 'content']);
    expect(feedable.statesReversible).toBe(true);
    const body = feedable.onClauses[0].body;
    expect(body[0]).toMatchObject({
      kind: 'must',
      phraseKey: 'no-food',
      condition: {
        kind: 'predicate',
        pred: 'has',
        subject: { kind: 'slot', name: 'actor' },
        object: { kind: 'field', base: { kind: 'it' }, field: 'food' },
      },
    });
    expect(body[1]).toMatchObject({
      kind: 'must',
      phraseKey: 'already-fed',
      condition: { kind: 'predicate', pred: 'is', subject: { kind: 'it' }, object: { kind: 'symbol', name: 'hungry' } },
    });
    expect(body[2]).toMatchObject({ kind: 'change', entity: { kind: 'it' }, state: 'content' });
  });

  it('has no hatches', () => {
    expect(ir.hasHatches).toBe(false);
  });

  it('matches the golden IR snapshot', () => {
    expect(ir).toMatchSnapshot();
  });
});

describe('zoo-timeline IR (§3.3 + ownership package)', () => {
  const ir = compiledClean('zoo-timeline.story');

  it('builds the sequences: wall-clock steps, becomes anchor, story transition', () => {
    expect(ir.sequences.map((s) => s.name)).toEqual(['closing time', 'lockup', 'goat bleats']);
    expect(ir.sequences[0].steps.map((s) => [s.timing, s.turns])).toEqual([
      ['at-turn', 5], ['later', 5], ['later', 5], ['later', 5],
    ]);
    const lastStep = ir.sequences[0].steps[3];
    expect(lastStep.body[1]).toMatchObject({ kind: 'change', entity: { kind: 'story' }, state: 'after-hours' });
    expect(ir.sequences[1].steps).toHaveLength(1);
    expect(ir.sequences[1].steps[0]).toMatchObject({
      timing: 'becomes',
      turns: 0,
      anchor: { owner: 'story', state: 'after-hours' },
    });
    expect(ir.sequences[2].steps.map((s) => [s.timing, s.turns])).toEqual([
      ['at-turn', 3], ['later', 3], ['later', 3], ['later', 3],
    ]);
    expect(ir.onceRules).toEqual([]);
    expect(ir.everyRules).toEqual([]);
  });

  it('registers declare-and-emit inline phrases so coverage passes', () => {
    const table = ir.phrases.locales['en-US'];
    expect(table['zoo.pa.closing-3'].variants[0].text).toContain('closing in three hours');
    expect(table['goat-bleat']).toBeDefined();
  });

  it('carries story states and resolves them in composition conditions (D2)', () => {
    expect(ir.story).toEqual({ states: ['open', 'after-hours'], reversible: false });
    const parrot = ir.entities.find((e) => e.id === 'parrot')!;
    expect(parrot.traits.map((t) => t.name)).toEqual(['chatty', 'candid']);
    expect(parrot.traits[0].condition).toEqual({ kind: 'not', operand: { kind: 'story-state', state: 'after-hours' } });
    expect(parrot.traits[1].condition).toEqual({ kind: 'story-state', state: 'after-hours' });
  });

  it("compiles Sam's once-gated every-turn clause with a statement-when phrase (D5/D7)", () => {
    const sam = ir.entities.find((e) => e.id === 'sam-the-zookeeper')!;
    expect(sam.onClauses).toHaveLength(1);
    const clause = sam.onClauses[0];
    expect(clause).toMatchObject({ clauseKind: 'on', action: 'every-turn', binding: 'every-turn', once: true, routing: null });
    expect(clause.condition).toEqual({ kind: 'story-state', state: 'after-hours' });
    expect(clause.body[0]).toMatchObject({ kind: 'move', entity: { kind: 'it' }, place: { kind: 'entity', id: 'staff-gate' } });
    expect(clause.body[2]).toMatchObject({
      kind: 'phrase',
      phraseKey: 'keeper-wave',
      stmtWhen: {
        kind: 'predicate',
        pred: 'is-in',
        subject: { kind: 'player' },
        object: { kind: 'entity', id: 'aviary' },
      },
    });
  });

  it('classifies every-turn clauses with can-see conditions', () => {
    const chatty = ir.traits.find((t) => t.name === 'chatty')!;
    expect(chatty.onClauses[0]).toMatchObject({ binding: 'every-turn', routing: null });
    expect(chatty.onClauses[0].condition).toMatchObject({
      kind: 'and',
      operands: [{ kind: 'predicate', pred: 'can-see' }, { kind: 'chance', n: 2 }],
    });
  });
});

describe('traits-basic IR (§2.2/§3.2 + ownership package)', () => {
  const ir = compiledClean('traits-basic.story');

  it('routes standard-semantics trait clauses to ActionInterceptors', () => {
    const sealable = ir.traits.find((t) => t.name === 'sealable')!;
    expect(sealable.onClauses[0].routing).toBe('interceptor');
    expect(sealable.states).toEqual(['sealed', 'ajar']);
    expect(sealable.statesReversible).toBe(true);
    expect(sealable.onClauses[0].body.map((s) => s.kind)).toEqual(['must', 'change', 'emit', 'phrase']);
  });

  it('validates role bindings against curated standard-action roles', () => {
    const limit = ir.traits.find((t) => t.name === 'carrying-limit')!;
    expect(limit.onClauses[0]).toMatchObject({ binding: 'role', role: 'taker', routing: 'interceptor' });
  });

  it('registers the action-owned score under its qualified name (D12)', () => {
    expect(ir.scores).toMatchObject([{ name: 'action.snoozing.napped', worth: 1 }]);
    const snoozing = ir.actions.find((a) => a.name === 'snoozing')!;
    expect(snoozing.scores).toMatchObject([{ name: 'action.snoozing.napped', worth: 1 }]);
  });

  it('records hatch kinds and hasHatches', () => {
    expect(ir.hatches.map((h) => [h.name, h.hatchKind])).toEqual([
      ['juggling', 'action'],
      ['crowd-control', 'behavior'],
    ]);
    expect(ir.hasHatches).toBe(true);
  });

  it('resolves conditional blocked exits against story states (D2)', () => {
    const room = ir.entities.find((e) => e.id === 'break-room')!;
    expect(room.blockedExits[0]).toMatchObject({
      direction: 'north',
      phraseKey: 'closed-up',
      condition: { kind: 'story-state', state: 'after-hours' },
    });
  });
});

describe('ownership-package additions — inline sources', () => {
  it('compiles define-action must lines with infinitive normalization (D6)', () => {
    const result = compile(
      `${HEADER}define action bowing\n  grammar\n    bow :noble\n  the noble must be reachable\n  the actor must hold the hat: no-hat\n  otherwise refuse cant-bow\n\n  phrases en-US\n    no-hat:\n      You need your hat.\n    cant-bow:\n      No.\n\ncreate the Hall\n  a room\n\n  A hall.\n\ncreate the hat\n  in the Hall\n\n  A hat.\n\ncreate the player\n  starts in the Hall\n\n  You.\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bowing = result.ir.actions.find((a) => a.name === 'bowing')!;
    expect(bowing.musts).toMatchObject([
      {
        phraseKey: 'no-hat',
        condition: {
          kind: 'predicate',
          pred: 'holds', // `must hold` normalizes to the finite form
          subject: { kind: 'slot', name: 'actor' },
          object: { kind: 'entity', id: 'hat' },
        },
      },
    ]);
  });

  it('merges trait-declared states into composer entities for state checks (D8)', () => {
    const errors = errorsOf(
      `${HEADER}define trait sleepy\n  states: dozing, awake\nend trait\n\ncreate the Hall\n  a room\n\n  A hall.\n\n  after entering it\n    change the cat to awake\n  end after\n\ncreate the cat\n  sleepy\n  in the Hall\n\n  A cat.\n\ncreate the player\n  starts in the Hall\n\n  You.\n`,
    );
    expect(errors).toEqual([]);
  });
});

describe('Phase B gate classes', () => {
  it('unknown role, with suggestion', () => {
    const errors = errorsOf(
      `${HEADER}define trait grabby\n  on taking anything as the muncher\n    refuse nope\n  end on\nend trait\n\ndefine phrases en-US\n  nope:\n    No.\n`,
    );
    expect(errors.some((e) => e.code === 'analysis.unknown-role' && e.message.includes('taker'))).toBe(true);
  });

  it('unknown slot in a constraint', () => {
    const errors = errorsOf(
      `${HEADER}define action waving\n  grammar\n    wave :thing\n  the target must be reachable\n  otherwise refuse no-wave\n\n  phrases en-US\n    no-wave:\n      Nope.\n`,
    );
    expect(errors.some((e) => e.code === 'analysis.unknown-slot' && e.message.includes('thing'))).toBe(true);
  });

  it('duplicate score on one owner', () => {
    const errors = errorsOf(`${HEADER}create the Vault\n  a room\n  score gold worth 5\n  score gold worth 10\n\n  Shiny.\n`);
    expect(errors.some((e) => e.code === 'analysis.duplicate-score' && e.message.includes('declared twice on this owner'))).toBe(true);
  });

  it('unknown score in award, with suggestion', () => {
    const errors = errorsOf(
      `${HEADER}create the Vault\n  a room\n  score gold worth 5\n\n  Shiny.\n\n  after entering it\n    award golds\n  end after\n\ncreate the player\n  starts in the Vault\n\n  You.\n`,
    );
    expect(
      errors.some(
        (e) =>
          e.code === 'analysis.unknown-score' &&
          e.message.includes('not a declared score of this owner or the story') &&
          e.message.includes('gold'),
      ),
    ).toBe(true);
  });

  it('open condition as a bare truth test without `it` in scope', () => {
    const errors = errorsOf(
      `${HEADER}define condition shiny-thing: it is a room\n\ndefine action waving\n  grammar\n    wave\n  refuse when shiny-thing: no-wave\n  otherwise refuse no-wave\n\n  phrases en-US\n    no-wave:\n      Nope.\n`,
    );
    expect(errors.some((e) => e.code === 'analysis.open-condition-truth')).toBe(true);
  });

  it('open condition accepted as a truth test where `it` is in scope', () => {
    const result = compile(
      `${HEADER}define condition roomish: it is a room\n\ncreate the Hall\n  a room\n\n  A hall.\n\n  after entering it while roomish\n    win\n  end after\n\ncreate the player\n  starts in the Hall\n\n  You.\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.conditions).toMatchObject([{ name: 'roomish', open: true }]);
  });

  it('unknown bare reference names conditions and story states', () => {
    const errors = errorsOf(
      `${HEADER}create the Hall\n  a room\n  north is blocked while afterhours: nope\n\n  A hall.\n\ndefine phrases en-US\n  nope:\n    No.\n`,
    );
    expect(
      errors.some(
        (e) => e.code === 'analysis.unknown-condition' && e.message.includes('not a declared condition or story state'),
      ),
    ).toBe(true);
  });
});

/**
 * analyzer-phase-b.test.ts — Phase B analysis (plan phase 3): four-phase
 * routing (both halves), role validation, hatch kinds + hasHatches,
 * define-score registration, open/closed condition classification, `any`
 * selections, scheduler IR, and the new gate classes.
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

describe('zoo-actions IR (§3.4)', () => {
  const ir = compiledClean('zoo-actions.story');

  it('routes dispatch-verb trait clauses to CapabilityBehaviors', () => {
    const pettable = ir.traits.find((t) => t.name === 'pettable')!;
    expect(pettable.onClauses[0]).toMatchObject({ action: 'petting', binding: 'it', routing: 'capability' });
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

  it('registers scores and resolves awards against them', () => {
    expect(ir.scores).toMatchObject([
      { name: 'pet-an-animal', worth: 5 },
      { name: 'feed-the-goats', worth: 10 },
    ]);
  });

  it('derives when-verbs from action names and segments targets', () => {
    expect(ir.rules.map((r) => [r.verb, r.actionName, r.target])).toEqual([
      ['pets', 'petting', { kind: 'anything' }],
      ['feeds', 'feeding', { kind: 'entity', id: 'pygmy-goats' }],
    ]);
  });

  it('resolves trait-field references and validates select-on arms against one-of members', () => {
    const pettable = ir.traits.find((t) => t.name === 'pettable')!;
    const body = pettable.onClauses[0].body;
    // `if kind is snake` — field subject, member object.
    expect(body[0]).toMatchObject({
      kind: 'if',
      condition: {
        kind: 'predicate',
        pred: 'is',
        subject: { kind: 'field', base: { kind: 'it' }, field: 'kind' },
        object: { kind: 'symbol', name: 'snake' },
      },
    });
  });

  it('has no hatches', () => {
    expect(ir.hasHatches).toBe(false);
  });

  it('matches the golden IR snapshot', () => {
    expect(ir).toMatchSnapshot();
  });
});

describe('zoo-timeline IR (§3.3)', () => {
  const ir = compiledClean('zoo-timeline.story');

  it('builds the sequence, once, and every rules', () => {
    expect(ir.sequences[0].name).toBe('closing time');
    expect(ir.sequences[0].steps.map((s) => [s.timing, s.turns])).toEqual([
      ['at-turn', 5], ['later', 5], ['later', 5], ['later', 5],
    ]);
    expect(ir.onceRules[0].condition).toEqual({ kind: 'flag', name: 'after-hours' });
    expect(ir.everyRules[0]).toMatchObject({ turns: 3, times: 4 });
  });

  it('registers declare-and-emit inline phrases so coverage passes', () => {
    const table = ir.phrases.locales['en-US'];
    expect(table['zoo.pa.closing-3'].variants[0].text).toContain('closing in three hours');
    expect(table['goat-bleat']).toBeDefined();
  });

  it('resolves flags in set targets and composition conditions', () => {
    const lastStep = ir.sequences[0].steps[3];
    expect(lastStep.body[1]).toMatchObject({
      kind: 'set',
      target: { kind: 'flag', name: 'after-hours' },
      value: { kind: 'symbol', name: 'true' },
    });
    const parrot = ir.entities.find((e) => e.id === 'parrot')!;
    expect(parrot.traits.map((t) => t.name)).toEqual(['chatty', 'candid']);
    expect(parrot.traits[0].condition).toEqual({ kind: 'not', operand: { kind: 'flag', name: 'after-hours' } });
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

describe('traits-basic IR (§2.2/§3.2)', () => {
  const ir = compiledClean('traits-basic.story');

  it('routes standard-semantics trait clauses to ActionInterceptors', () => {
    const openable = ir.traits.find((t) => t.name === 'openable')!;
    expect(openable.onClauses[0].routing).toBe('interceptor');
  });

  it('validates role bindings against curated standard-action roles', () => {
    const limit = ir.traits.find((t) => t.name === 'carrying-limit')!;
    expect(limit.onClauses[0]).toMatchObject({ binding: 'role', role: 'taker', routing: 'interceptor' });
  });

  it('records hatch kinds and hasHatches', () => {
    expect(ir.hatches.map((h) => [h.name, h.hatchKind])).toEqual([
      ['juggling', 'action'],
      ['crowd-control', 'behavior'],
    ]);
    expect(ir.hasHatches).toBe(true);
  });

  it('resolves conditional blocked exits', () => {
    const room = ir.entities.find((e) => e.id === 'break-room')!;
    expect(room.blockedExits[0]).toMatchObject({
      direction: 'north',
      phraseKey: 'closed-up',
      condition: { kind: 'flag', name: 'after-hours' },
    });
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

  it('duplicate score', () => {
    const errors = errorsOf(`${HEADER}define score gold worth 5\ndefine score gold worth 10\n`);
    expect(errors.some((e) => e.code === 'analysis.duplicate-score')).toBe(true);
  });

  it('unknown score in award, with suggestion', () => {
    const errors = errorsOf(
      `${HEADER}define score gold worth 5\n\ncreate the Vault\n  a room\n\n  Shiny.\n\ncreate the player\n  starts in the Vault\n\n  You.\n\nwhen the player enters the Vault\n  award golds\nend when\n`,
    );
    expect(errors.some((e) => e.code === 'analysis.unknown-score' && e.message.includes('gold'))).toBe(true);
  });

  it('open condition as a bare truth test without `it` in scope', () => {
    const errors = errorsOf(
      `${HEADER}define condition shiny-thing: it is a room\n\ncreate the Hall\n  a room\n\n  A hall.\n\ncreate the player\n  starts in the Hall\n\n  You.\n\nwhen the player enters the Hall while shiny-thing\n  win\nend when\n`,
    );
    expect(errors.some((e) => e.code === 'analysis.open-condition-truth')).toBe(true);
  });

  it('closed condition used as an `any` selection', () => {
    const errors = errorsOf(
      `${HEADER}define condition always-on: one chance in 1\n\ndefine action petting\n  grammar\n    pet :animal\n  otherwise refuse no-pet\n\n  phrases en-US\n    no-pet:\n      No.\n\ncreate the Hall\n  a room\n\n  A hall.\n\ncreate the player\n  starts in the Hall\n\n  You.\n\nwhen the player pets any always-on\n  win\nend when\n`,
    );
    expect(errors.some((e) => e.code === 'analysis.closed-condition-selection')).toBe(true);
  });

  it('open condition accepted as an `any` selection target', () => {
    const errors = errorsOf(
      `${HEADER}define condition roomish: it is a room\n\ndefine action petting\n  grammar\n    pet :animal\n  otherwise refuse no-pet\n\n  phrases en-US\n    no-pet:\n      No.\n\ncreate the Hall\n  a room\n\n  A hall.\n\ncreate the player\n  starts in the Hall\n\n  You.\n\nwhen the player pets any roomish\n  win\nend when\n`,
    );
    expect(errors).toEqual([]);
  });
});

/**
 * branches.test.ts — ADR-356 D1: `collectClauseBranches` emits one record
 * per leaf path through every rule the story declares, totally and
 * deterministically (AC-1).
 *
 * One fixture story carries one of every clause kind the enumerator names
 * — an `on` clause with a `must` and a `select on`, a `refuse when`, an
 * ordinal block, a `select cycling`, a `, once` clause with a `while`
 * guard, a `when <timer> expires` clause, a `when <entity> moves` clause, a
 * topic row, a greetings row (the `surface` fallback), a `define action`
 * with a `must`, a `refuse without` and a `refuse when`, a machine with two
 * transitions, a sequence with an `at turn` and a `becomes` step, a timer
 * with a `meanwhile`, a story-level every-turn clause, and the start block
 * — and a trait composed by two entities. The branch total is asserted
 * against a hand count of that structure, never against a previous run.
 * The fixture compiles real Chord source (`compileSource`), the same
 * discipline `corpus.ts` states: the enumerator must see what the compiler
 * actually emits, never a hand-built IR standing in for it.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-356 D1, D5; GH #520
 */

import { describe, expect, it } from 'vitest';
import { collectClauseBranches, type ClauseBranch } from '../src/branches.js';
import { compileSource } from './corpus.js';

const FIXTURE = `story
  title: Branches Sweep
  authors:
    T
  id: branches-sweep
  story-version: 0.0.1
  states: dawn, dusk
  use state-machines

  on every turn while one chance in 12
    change Tom to alert
  end on

define phrases en-US
  need-shears:
    You need shears.
  too-young:
    Too young.
  fruits:
    It fruits.
  done:
    Done.
  clank:
    Clank.
  nope:
    Nope.
  hum:
    Hum.
  idle:
    Idle.

define trait prunable
  states: seedling, flowering, fruiting
  on the player pruning
    the player must hold the shears: need-shears
    select on its state
      when seedling
        phrase too-young
      when flowering
        change it to fruiting
        move the locket to the Yard
        phrase fruits
      when fruiting
        phrase done
    end select
  end on
end trait

define action pruning
  grammar
    prune the target
  the target must be reachable
  the player must hold the shears: need-shears
  refuse without target: nope
  refuse when Tom is alert: clank
  otherwise refuse nope

define timer bell for Tom
  ringing
  meanwhile, one chance in 5
    phrase hum
end timer

define machine the gate works
  role latch is the lever
  starts shut

  state shut
    when pulling the lever: open

  state open
    on enter
      change Tom to alert
    end on
    when pulling the lever while Tom is alert: shut
end machine

define sequence the long night
  at turn 14
    change the story to dusk
  when Tom becomes alert
    phrase idle
end sequence

create the Yard
  a room

  A yard.

create the vine
  prunable
  scenery
  in the Yard

  A vine.

create the rose
  prunable
  scenery
  in the Yard

  A rose.

create the locket
  in the Yard

  A locket.

create the shears
  in the Yard

  Shears.

create the lever
  scenery
  in the Yard

  A lever.

create Tom
  a person
  in the Yard
  states, reversible: calm, alert

  on the player pushing while Tom is calm, once
    refuse when Tom is alert: clank
    change Tom to alert
  end on

  after the player prodding
    first time
      change Tom to alert
    second time
      change Tom to calm
    phrase idle
  end after

  on the player kicking
    select cycling
      change Tom to alert
    or
      change Tom to calm
    end select
  end on

  when bell expires
    change Tom to alert
  end when

  when Alex moves
    change Tom to calm
  end when

  Tom.

define topics for Tom
  about the locket:
    change Tom to alert
end topics

define greetings for Tom
  first time:
    change Tom to alert
end greetings

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
`;

/**
 * The hand count of the fixture's branches, by clause, from its source:
 *
 *   story `on every turn`                                   1
 *   trait `prunable` on the vine: must + 3 arms             4
 *   trait `prunable` on the rose: must + 3 arms             4
 *   action `pruning`: without + must + refuse-when + through 4
 *   timer `bell` meanwhile                                  1
 *   machine: shut→open, open→shut                           2
 *   sequence: at turn 14, becomes                           2
 *   Tom `pushing`: refuse-when + through                    2
 *   Tom `prodding`: first + second + through                3
 *   Tom `kicking`: two alternatives                         2
 *   Tom `when bell expires`                                 1
 *   Tom `when Alex moves`                                   1
 *   Tom topic row                                           1
 *   Tom greetings row (surface)                             1
 *   start block                                             1
 */
const HAND_COUNT = 30;

const ir = compileSource(FIXTURE);
const branches = collectClauseBranches(ir);

/** The 1-based line on which `text` first appears in the fixture. */
function lineOf(text: string): number {
  const index = FIXTURE.split('\n').findIndex((line) => line.includes(text));
  if (index < 0) throw new Error(`fixture has no line containing \`${text}\``);
  return index + 1;
}

/** The branches of one clause kind, optionally on one subject. */
function of(kind: ClauseBranch['clause']['kind'], subject?: string | null): ClauseBranch[] {
  return branches.filter((b) => b.clause.kind === kind && (subject === undefined || b.subject === subject));
}

/** The `on` clauses for one action word on one subject. */
function onClause(action: string, subject: string | null): ClauseBranch[] {
  return branches.filter((b) => b.clause.kind === 'on' && b.clause.action === action && b.subject === subject);
}

describe('ADR-356 AC-1 — total and deterministic', () => {
  it('emits exactly the hand-counted number of branches', () => {
    expect(branches).toHaveLength(HAND_COUNT);
  });

  it('two runs over the same IR are byte-identical', () => {
    expect(JSON.stringify(collectClauseBranches(ir))).toBe(JSON.stringify(branches));
  });

  it('every branch carries a span, and says it is the leaf\'s own or the clause\'s', () => {
    for (const branch of branches) {
      expect(branch.span).not.toBeNull();
      expect(['branch', 'clause']).toContain(branch.spanSource);
    }
  });
});

describe('guards — a `must` refusal and the path past it', () => {
  it('a `must` yields a refusal leaf whose precondition is the guard failing, the guard statement as its effect', () => {
    const [refused] = onClause('pruning', 'vine').filter((b) => b.leaf.kind === 'refused');
    expect(refused.leaf).toEqual({ kind: 'refused', guard: 'must', phraseKey: 'need-shears' });
    expect(refused.precondition).toEqual([
      { kind: 'condition', condition: expect.objectContaining({ kind: 'predicate', pred: 'holds' }), holds: false },
    ]);
    expect(refused.effects.map((e) => e.kind)).toEqual(['must']);
  });

  it('a refusal leaf points at its guard statement\'s line — the predicate inside carries no span (GH #521)', () => {
    const [refused] = onClause('pruning', 'vine').filter((b) => b.leaf.kind === 'refused');
    expect(refused.span?.line).toBe(lineOf('the player must hold the shears'));
    expect(refused.spanSource).toBe('branch');
  });

  it('a `refuse when` yields a refusal leaf on the guard holding, and the through-leaf requires it failing', () => {
    const pushing = onClause('pushing', 'tom');
    const refused = pushing.find((b) => b.leaf.kind === 'refused');
    const through = pushing.find((b) => b.leaf.kind === 'through');
    expect(refused?.leaf).toEqual({ kind: 'refused', guard: 'refuse-when', phraseKey: 'clank' });
    expect(refused?.precondition.at(-1)).toEqual({ kind: 'condition', condition: expect.objectContaining({ pred: 'is' }), holds: true });
    expect(through?.precondition.at(-1)).toEqual({ kind: 'condition', condition: expect.objectContaining({ pred: 'is' }), holds: false });
    expect(through?.effects.map((e) => e.kind)).toEqual(['change']);
  });

  it('a `, once` clause with a `while` guard puts `unfired` and the guard, holding, ahead of every leaf', () => {
    for (const branch of onClause('pushing', 'tom')) {
      expect(branch.clause).toMatchObject({ kind: 'on', once: true });
      expect(branch.precondition.slice(0, 2)).toEqual([
        { kind: 'unfired' },
        { kind: 'condition', condition: expect.objectContaining({ pred: 'is' }), holds: true },
      ]);
    }
  });
});

describe('`select on` — one leaf per arm, no through-leaf', () => {
  it('an arm over `its state` yields a state term on the bound entity, after the guards passed', () => {
    const flowering = onClause('pruning', 'vine').find((b) => b.leaf.kind === 'arm' && b.leaf.value === 'flowering');
    expect(flowering?.precondition).toEqual([
      { kind: 'condition', condition: expect.objectContaining({ pred: 'holds' }), holds: true },
      { kind: 'state', entity: 'vine', state: 'flowering' },
    ]);
  });

  it('an arm\'s effects are the arm\'s own statements — the worked example\'s change, move and phrase', () => {
    const flowering = onClause('pruning', 'vine').find((b) => b.leaf.kind === 'arm' && b.leaf.value === 'flowering');
    expect(flowering?.effects.map((e) => e.kind)).toEqual(['change', 'move', 'phrase']);
    expect(flowering?.effects[1]).toMatchObject({ kind: 'move', entity: { kind: 'entity', id: 'locket' } });
  });

  it('an arm leaf\'s span is the arm\'s own line', () => {
    const flowering = onClause('pruning', 'vine').find((b) => b.leaf.kind === 'arm' && b.leaf.value === 'flowering');
    expect(flowering?.span?.line).toBe(lineOf('when flowering'));
    expect(flowering?.spanSource).toBe('branch');
  });

  it('a clause whose body selects has no through-leaf: the vine\'s pruning is exactly must + three arms', () => {
    expect(onClause('pruning', 'vine').map((b) => b.leaf)).toEqual([
      { kind: 'refused', guard: 'must', phraseKey: 'need-shears' },
      { kind: 'arm', value: 'seedling' },
      { kind: 'arm', value: 'flowering' },
      { kind: 'arm', value: 'fruiting' },
    ]);
  });

  it('a trait\'s clauses expand once per composing entity, `it` bound to each', () => {
    expect(onClause('pruning', 'vine')).toHaveLength(4);
    expect(onClause('pruning', 'rose')).toHaveLength(4);
    const roseArm = onClause('pruning', 'rose').find((b) => b.leaf.kind === 'arm' && b.leaf.value === 'flowering');
    expect(roseArm?.precondition).toContainEqual({ kind: 'state', entity: 'rose', state: 'flowering' });
    expect(roseArm?.command).toEqual({ kind: 'action', actor: 'player', action: 'pruning', object: 'rose', role: null });
    expect(roseArm?.owner).toEqual({ kind: 'entity', id: 'rose' });
  });
});

describe('ordinals and alternatives', () => {
  it('an ordinal block yields a leaf per ordinal carrying the level\'s straight statements, and the through-leaf stays', () => {
    const prodding = onClause('prodding', 'tom');
    expect(prodding.map((b) => b.leaf)).toEqual([
      { kind: 'ordinal', ordinal: 1 },
      { kind: 'ordinal', ordinal: 2 },
      { kind: 'through' },
    ]);
    expect(prodding[0].precondition).toEqual([{ kind: 'ordinal', ordinal: 1 }]);
    expect(prodding[0].effects.map((e) => e.kind)).toEqual(['change', 'phrase']);
    expect(prodding[2].effects.map((e) => e.kind)).toEqual(['phrase']);
    expect(prodding[0].span?.line).toBe(lineOf('    first time'));
    expect(prodding[2].spanSource).toBe('clause');
  });

  it('a `select cycling` yields one leaf per alternative, keyed by the select\'s compiler id', () => {
    const kicking = onClause('kicking', 'tom');
    expect(kicking.map((b) => b.leaf)).toEqual([
      { kind: 'alternative', id: 'tom.on-kicking-2.0', index: 0 },
      { kind: 'alternative', id: 'tom.on-kicking-2.0', index: 1 },
    ]);
    expect(kicking[1].precondition).toEqual([{ kind: 'alternative', id: 'tom.on-kicking-2.0', index: 1 }]);
    expect(kicking[1].effects[0]).toMatchObject({ kind: 'change', state: 'calm' });
  });
});

describe('clause kinds beyond `on`', () => {
  it('a `when <timer> expires` clause is a timer-clause branch driven by that timer expiring', () => {
    const [clause] = of('timer-clause', 'tom');
    expect(clause.clause).toEqual({ kind: 'timer-clause', timer: 'tom.bell' });
    expect(clause.command).toEqual({ kind: 'timer-expires', timer: 'tom.bell' });
    expect(clause.effects.map((e) => e.kind)).toEqual(['change']);
  });

  it('a `when <entity> moves` clause is a move-clause branch driven by the mover', () => {
    const [clause] = of('move-clause', 'tom');
    expect(clause.command).toEqual({ kind: 'entity-moves', mover: { kind: 'entity', id: 'alex' } });
  });

  it('a topic row is a topic branch driven by asking its owner', () => {
    const [clause] = of('topic', 'tom');
    expect(clause.clause).toEqual({ kind: 'topic', filter: { kind: 'entity', id: 'locket' } });
    expect(clause.command).toEqual({ kind: 'ask', owner: 'tom', filter: { kind: 'entity', id: 'locket' } });
  });

  it('a statement-bearing row no shape names is a surface branch labelled by its key path, with no command', () => {
    const [clause] = of('surface', 'tom');
    expect(clause.clause).toEqual({ kind: 'surface', surface: 'tom.greetings[0].body' });
    expect(clause.command).toEqual({ kind: 'none', surface: 'tom.greetings[0].body' });
    expect(clause.effects.map((e) => e.kind)).toEqual(['change']);
  });

  it('a `define action` yields a `without` leaf per missing slot, then its guards and through-path', () => {
    const action = of('action');
    expect(action.map((b) => b.leaf)).toEqual([
      { kind: 'refused', guard: 'without', phraseKey: 'nope', slot: 'target' },
      { kind: 'refused', guard: 'must', phraseKey: 'need-shears' },
      { kind: 'refused', guard: 'refuse-when', phraseKey: 'clank' },
      { kind: 'through' },
    ]);
    expect(action[0].effects).toEqual([expect.objectContaining({ kind: 'refuse', phraseKey: 'nope' })]);
    expect(action[3].precondition).toEqual([
      { kind: 'condition', condition: expect.objectContaining({ pred: 'holds' }), holds: true },
      { kind: 'condition', condition: expect.objectContaining({ pred: 'is' }), holds: false },
    ]);
    for (const branch of action) {
      expect(branch.command).toEqual({ kind: 'action', actor: 'player', action: 'pruning', object: null, role: null });
    }
  });

  it('a machine transition is a branch from its source state, its role target resolved to the entity', () => {
    const [shutToOpen, openToShut] = of('machine-transition');
    expect(shutToOpen.clause).toMatchObject({ kind: 'machine-transition', machine: 'the gate works', from: 'shut', to: 'open' });
    expect(shutToOpen.precondition).toEqual([{ kind: 'machine-state', machine: 'the gate works', state: 'shut' }]);
    expect(shutToOpen.command).toEqual({ kind: 'action', actor: 'player', action: 'pulling', object: 'lever', role: null });
    expect(shutToOpen.effects.map((e) => e.kind)).toEqual(['change']);
    expect(shutToOpen.owner).toEqual({ kind: 'machine', name: 'the gate works', roles: ['lever'] });
    expect(openToShut.precondition).toEqual([
      { kind: 'machine-state', machine: 'the gate works', state: 'open' },
      { kind: 'condition', condition: expect.objectContaining({ pred: 'is' }), holds: true },
    ]);
    expect(openToShut.effects).toEqual([]);
  });

  it('a sequence step is a scheduled branch; a `becomes` step\'s anchor is a state term', () => {
    const [atTurn, becomes] = of('sequence-step');
    expect(atTurn.command).toEqual({ kind: 'schedule', timing: 'at-turn', turns: 14, anchor: null });
    expect(atTurn.precondition).toEqual([]);
    expect(becomes.precondition).toEqual([{ kind: 'state', entity: 'tom', state: 'alert' }]);
    expect(becomes.command).toMatchObject({ kind: 'schedule', timing: 'becomes', anchor: { owner: 'tom', state: 'alert' } });
  });

  it('a timer\'s `meanwhile` is a branch of the entity the timer is declared for, gated by its chance', () => {
    const [meanwhile] = of('timer-meanwhile');
    expect(meanwhile.clause).toEqual({ kind: 'timer-meanwhile', timer: 'tom.bell', chance: 5 });
    expect(meanwhile.owner).toEqual({ kind: 'entity', id: 'tom' });
    expect(meanwhile.subject).toBe('tom');
    expect(meanwhile.precondition).toEqual([{ kind: 'condition', condition: { kind: 'chance', n: 5 }, holds: true }]);
    expect(meanwhile.command).toEqual({ kind: 'timer-running', timer: 'tom.bell' });
  });

  it('the story\'s own every-turn clause is story-owned, unbound, and fires on any turn', () => {
    const [everyTurn] = onClause('every-turn', null);
    expect(everyTurn.owner).toEqual({ kind: 'story' });
    expect(everyTurn.command).toEqual({ kind: 'any-turn' });
    expect(everyTurn.precondition).toEqual([{ kind: 'condition', condition: { kind: 'chance', n: 12 }, holds: true }]);
  });

  it('the start block is one boot-driven branch', () => {
    const [start] = of('start-block');
    expect(start.command).toEqual({ kind: 'boot' });
    expect(start.effects.map((e) => e.kind)).toEqual(['change-player']);
    expect(start.span?.line).toBe(lineOf('before the game starts'));
  });
});

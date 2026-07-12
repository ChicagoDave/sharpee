/**
 * each-runtime.test.ts — the each package's Phase 4 gate: quantifier
 * evaluation (E1 any-of / E2 none-of with empty-set semantics), `satisfies`
 * membership (must-be-any, David 2026-07-12), is-a classification over IR
 * kind compositions, creation-order enumeration, `each` execution with
 * `the match` bound (nesting, `it` coexistence), the pre-mutation match-set
 * snapshot (§5.4 — the report pass visits the execute pass's set), and
 * AC-5 seeded determinism for chance draws inside a block.
 *
 * Asserts on WORLD STATE (locations, chord state values) and on the emitted
 * phrase sequence, mirroring the dispatch.test.ts four-phase harness.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX, CHORD_TRAIT_PREFIX, ChordStory, createStory, Evaluator, LoadError } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

/** Minimal structural stand-in for the engine's ActionContext (dispatch.test.ts shape). */
interface FakeContext {
  world: WorldModel;
  player: IFEntity;
  command: { directObject?: { entity?: IFEntity } };
  sharedData: Record<string, unknown>;
  event(type: string, data: Record<string, unknown>): ISemanticEvent;
}

interface DispatchAction {
  id: string;
  validate(ctx: FakeContext): { valid: boolean; error?: string };
  execute(ctx: FakeContext): void;
  report(ctx: FakeContext): ISemanticEvent[];
  blocked(ctx: FakeContext, result: { error?: string }): ISemanticEvent[];
}

interface Loaded {
  ir: StoryIR;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  actions: Map<string, DispatchAction>;
}

function load(seed = 42): Loaded {
  const ir = compileFixture('each-iteration.story');
  const story = createStory(ir, { seed });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const actions = new Map((story.getCustomActions() as DispatchAction[]).map((a) => [a.id, a]));
  return { ir, story, world, player, actions };
}

const worldEntity = (l: Loaded, irId: string) => l.world.getEntity(l.story.entityId(irId)!)!;
const stateOf = (l: Loaded, irId: string) => l.world.getStateValue(CHORD_STATE_PREFIX + irId);
const locationOf = (l: Loaded, irId: string) => l.world.getLocation(l.story.entityId(irId)!);
const messageIds = (events: ISemanticEvent[]) =>
  events
    .filter((e) => e.type === 'chord.phrase')
    .map((e) => (e.data as { messageId?: string }).messageId);

function runAction(l: Loaded, actionId: string, targetIrId: string) {
  const ctx: FakeContext = {
    world: l.world,
    player: l.player,
    command: { directObject: { entity: worldEntity(l, targetIrId) } },
    sharedData: {},
    event: (type, data) => ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }),
  };
  const action = l.actions.get(actionId)!;
  const validation = action.validate(ctx);
  if (!validation.valid) return { validation, events: action.blocked(ctx, validation) };
  action.execute(ctx);
  return { validation, events: action.report(ctx) };
}

/** Fire a room's `after entering it` clauses, the runtime.test.ts way. */
function enter(l: Loaded, roomIrId: string): ISemanticEvent[] {
  const roomId = l.story.entityId(roomIrId)!;
  l.world.moveEntity(l.player.id, roomId);
  return l.story.runtime.fireEventClauses(l.world, {
    id: `move-${roomIrId}`,
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: l.player.id },
    data: { toRoom: roomId, fromRoom: undefined, direction: 'NORTH' },
  });
}

describe('quantifier evaluation (E1/E2 + satisfies + is-a)', () => {
  const l = load();
  const ev = new Evaluator(l.ir, l.story, 42);
  const ctx = { world: l.world };

  it('enumerates matches in declaration (creation) order', () => {
    expect(ev.matchesOf('stray-crate', ctx)).toEqual(['red-crate', 'blue-crate']);
    expect(ev.matchesOf('penned-crate', ctx)).toEqual(['red-crate', 'blue-crate']);
    expect(ev.matchesOf('keeper-present', ctx)).toEqual([]);
  });

  it('any-of is the existential: false over the empty set', () => {
    expect(ev.evalCondition({ kind: 'any-of', condition: 'stray-crate' }, ctx)).toBe(true);
    expect(ev.evalCondition({ kind: 'any-of', condition: 'keeper-present' }, ctx)).toBe(false);
  });

  it('none-of is the negated existential: true over the empty set', () => {
    expect(ev.evalCondition({ kind: 'none-of', condition: 'stray-crate' }, ctx)).toBe(false);
    expect(ev.evalCondition({ kind: 'none-of', condition: 'keeper-present' }, ctx)).toBe(true);
  });

  it('flips when the world changes: everything tucked away → any false, no true', () => {
    const l2 = load();
    const ev2 = new Evaluator(l2.ir, l2.story, 42);
    const store = l2.story.entityId('store-room')!;
    l2.world.moveEntity(l2.story.entityId('red-crate')!, store);
    l2.world.moveEntity(l2.story.entityId('blue-crate')!, store);
    const ctx2 = { world: l2.world };
    expect(ev2.matchesOf('stray-crate', ctx2)).toEqual([]);
    expect(ev2.evalCondition({ kind: 'any-of', condition: 'stray-crate' }, ctx2)).toBe(false);
    expect(ev2.evalCondition({ kind: 'none-of', condition: 'stray-crate' }, ctx2)).toBe(true);
  });

  it('satisfies binds the condition to the subject: membership, not the bare existential', () => {
    const of = (id: string) =>
      ev.evalCondition({ kind: 'satisfies', subject: { kind: 'entity', id }, condition: 'penned-crate' }, ctx);
    expect(of('red-crate')).toBe(true);
    expect(of('green-crate')).toBe(false); // in the store room
    expect(
      ev.evalCondition({ kind: 'satisfies', subject: { kind: 'player' }, condition: 'penned-crate' }, ctx),
    ).toBe(false); // the player is not a crate
  });

  it('is-a classifies by IR kind compositions', () => {
    const isA = (id: string, name: string, negated = false) =>
      ev.evalCondition(
        { kind: 'predicate', pred: 'is-a', negated, subject: { kind: 'entity', id }, object: { kind: 'symbol', name } },
        ctx,
      );
    expect(isA('red-crate', 'container')).toBe(true);
    expect(isA('red-crate', 'container', true)).toBe(false);
    expect(isA('dust-bunny', 'supporter')).toBe(true);
    expect(isA('pen', 'room')).toBe(true);
    expect(isA('red-crate', 'room')).toBe(false);
  });

  it('an unknown condition name at evaluation time is a loader bug (LoadError)', () => {
    expect(() => ev.evalCondition({ kind: 'any-of', condition: 'ghost' }, ctx)).toThrow(LoadError);
    expect(() => ev.matchesOf('ghost', ctx)).toThrow(LoadError);
  });

  it('is-a over a subject with no story identity classifies as nothing', () => {
    const l3 = load();
    const ev3 = new Evaluator(l3.ir, l3.story, 42);
    const stray = l3.world.createEntity('stray cat', 'object');
    const ctx3 = { world: l3.world, slots: { thing: stray.id } };
    const isA = (negated: boolean) =>
      ev3.evalCondition(
        {
          kind: 'predicate',
          pred: 'is-a',
          negated,
          subject: { kind: 'slot', name: 'thing' },
          object: { kind: 'symbol', name: 'container' },
        },
        ctx3,
      );
    expect(isA(false)).toBe(false);
    expect(isA(true)).toBe(true);
  });
});

describe('each execution via event clauses (single pass, nesting, it coexistence)', () => {
  it('visits penned crates with `it` still the room, inner each binds innermost', () => {
    const l = load();
    const events = enter(l, 'pen');

    // `phrase both-note when the match is in it` — match=crate, it=pen.
    expect(messageIds(events).filter((m) => m === 'both-note')).toHaveLength(2);
    // The inner each re-enumerates LIVE per outer iteration: the first
    // visit moves the dust bunny out, so the second visit's inner set is
    // empty — exactly one inner-note, not two (a stale per-statement
    // snapshot would emit it on both outer iterations).
    expect(messageIds(events).filter((m) => m === 'inner-note')).toHaveLength(1);
    // Empty set is a no-op: no keeper note.
    expect(messageIds(events)).not.toContain('keeper-note');
    // The INNER each moved the dust bunny (its own binder), not the crates.
    expect(locationOf(l, 'dust-bunny')).toBe(l.story.entityId('store-room'));
    expect(locationOf(l, 'red-crate')).toBe(l.story.entityId('pen'));
    expect(locationOf(l, 'blue-crate')).toBe(l.story.entityId('pen'));
  });
});

describe('tidying: two-phase each with the pre-mutation match snapshot (§5.4)', () => {
  it('executes mutations, then reports over the SAME match set in creation order', () => {
    const l = load();
    const { validation, events } = runAction(l, 'chord.action.tidying', 'pen');
    expect(validation.valid).toBe(true);

    // Mutations landed: both stray crates moved to the store room.
    expect(locationOf(l, 'red-crate')).toBe(l.story.entityId('store-room'));
    expect(locationOf(l, 'blue-crate')).toBe(l.story.entityId('store-room'));

    // The report pass visited the SNAPSHOTTED set — post-mutation there
    // are zero stray crates, so live re-enumeration would emit nothing.
    // The sequence also pins the creation-order visit: red before blue.
    expect(messageIds(events)).toEqual(['spotted-red', 'tucked', 'spotted-blue', 'tucked', 'tidy-note']);
  });

  it('set and award inside the each body: field written per match, score awarded once (dedup)', () => {
    const l = load();
    const shineOf = (irId: string): unknown => {
      for (const t of worldEntity(l, irId).traits.values()) {
        if (t.type === CHORD_TRAIT_PREFIX + 'polishable') return (t as unknown as Record<string, unknown>).shine;
      }
      return undefined;
    };
    runAction(l, 'chord.action.tidying', 'pen');
    expect(shineOf('red-crate')).toBe(9);
    expect(shineOf('blue-crate')).toBe(9);
    expect(shineOf('green-crate')).not.toBe(9); // never visited
    // `award tidied` ran once per match but dedups by identity (ADR-129).
    expect(l.world.getScore()).toBe(3);
  });

  it('second tidy refuses via `refuse when no stray-crate` (E2 over the now-empty set)', () => {
    const l = load();
    runAction(l, 'chord.action.tidying', 'pen');
    const { validation, events } = runAction(l, 'chord.action.tidying', 'pen');
    expect(validation).toEqual({ valid: false, error: 'already-tidy' });
    expect((events[0].data as { messageId?: string }).messageId).toBe('already-tidy');
  });
});

describe('polishing: `it must be any penned-crate` (satisfies through the must ladder)', () => {
  it('passes for a penned crate and mutates its state', () => {
    const l = load();
    const { validation, events } = runAction(l, 'chord.action.polishing', 'red-crate');
    expect(validation.valid).toBe(true);
    expect(stateOf(l, 'red-crate')).toBe('gleaming');
    expect(messageIds(events)).toContain('polished');
  });

  it('refuses for a crate outside the pen, mutating nothing', () => {
    const l = load();
    const { validation } = runAction(l, 'chord.action.polishing', 'green-crate');
    expect(validation).toEqual({ valid: false, error: 'not-penned' });
    expect(stateOf(l, 'green-crate')).toBe('dull');
  });
});

describe('each through the standard-action interceptor paths (§5.4 two-phase)', () => {
  function drivePhases(l: Loaded, targetIrId: string) {
    const target = worldEntity(l, targetIrId);
    const lookup = l.world.getInterceptorForAction(target, 'if.action.reading');
    expect(lookup, `interceptor bound for reading on ${targetIrId}`).toBeDefined();
    const data = {};
    expect(lookup!.interceptor.preValidate!(target, l.world, l.player.id, data)).toBeNull();
    expect(lookup!.interceptor.postValidate!(target, l.world, l.player.id, data)).toBeNull();
    lookup!.interceptor.postExecute!(target, l.world, l.player.id, data);
    return lookup!.interceptor.postReport!(target, l.world, l.player.id, data);
  }

  it('entity on-clause (buildInterceptor): mutations in postExecute, snapshotted set in postReport', () => {
    const l = load();
    const result = drivePhases(l, 'dust-bunny');

    // postExecute moved both stray crates (mutation pass through the each).
    expect(locationOf(l, 'red-crate')).toBe(l.story.entityId('store-room'));
    expect(locationOf(l, 'blue-crate')).toBe(l.story.entityId('store-room'));

    // postReport visited the SNAPSHOTTED pre-mutation set: two `noted`
    // (first becomes the on-clause override) plus ledger-note. A live
    // re-enumeration over the emptied set would emit no `noted` at all.
    expect(result.override).toMatchObject({ messageId: 'noted' });
    const emitted = (result.emit ?? []).map((e: { payload: Record<string, unknown> }) => e.payload.messageId);
    expect(emitted).toEqual(['noted', 'ledger-note']);
  });

  it('trait on-clause (buildTraitInterceptor): each + the match/it coexist through the trait path', () => {
    const l = load();
    const result = drivePhases(l, 'pen'); // tidyable's `on reading it`
    // `phrase dust-spotted when the match is in it` — match=dust, it=pen.
    expect(result.override).toMatchObject({ messageId: 'dust-spotted' });
    const emitted = (result.emit ?? []).map((e: { payload: Record<string, unknown> }) => e.payload.messageId);
    expect(emitted).toEqual(['dusted']);
  });
});

describe('each inside a sequence step (scheduler daemon, live enumeration)', () => {
  it('the sweep-up sequence moves every dusty thing at its turn', () => {
    const l = load();
    const daemon = l.story.runtime.buildSchedulerDaemons().find((d) => d.id === 'chord.sequence.sweep-up')!;
    expect(daemon).toBeDefined();
    expect(daemon.condition!({ world: l.world, turn: 1 })).toBe(false);
    expect(daemon.condition!({ world: l.world, turn: 2 })).toBe(true);
    daemon.run({ world: l.world, turn: 2 });
    expect(locationOf(l, 'dust-bunny')).toBe(l.story.entityId('store-room'));
  });
});

describe('AC-5: chance draws inside an each block are pinned by iteration order', () => {
  const outcomes = (l: Loaded) => {
    enter(l, 'store-room'); // each penned-crate: change ... when one chance in 2
    return [stateOf(l, 'red-crate'), stateOf(l, 'blue-crate')];
  };

  it('same seed → byte-identical outcome pattern across fresh loads, pinned per seed', () => {
    // Seed 42: both 1-in-2 draws miss. Seed 7: the second draw hits —
    // a mixed pattern, proving the draws are positional in the visit
    // order (red drawn first, blue second) and pinned by the stream.
    expect(outcomes(load(42))).toEqual(['dull', 'dull']);
    expect(outcomes(load(42))).toEqual(['dull', 'dull']);
    expect(outcomes(load(7))).toEqual(['dull', 'gleaming']);
    expect(outcomes(load(7))).toEqual(['dull', 'gleaming']);
  });
});

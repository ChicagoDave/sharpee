/**
 * topic-dispatch.test.ts — ADR-239 Phase 2: the topic table at runtime.
 * REAL-PATH: a Chord-loaded world drives stdlib's REAL askingAction and
 * tellingAction end to end (validate → execute → report through the
 * ADR-228 lifecycle engine — the seedData wire, the table lookup, and the
 * override path are all live, never stubbed). Asserts on emitted message
 * ids and on actual world-state mutation from a row body.
 *
 * AC-1: entity-tier and free-text-tier hits, asking AND telling.
 * AC-2: declared alias reaches the primary's response; an undeclared
 *       paraphrase does NOT (lookup, not search — asserted both ways).
 * AC-4: miss fires the catch-all when declared; the stdlib default when
 *       not; a hit suppresses the catch-all entirely (never both).
 * AC-5: telling symmetric, one test per tier.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { askingAction, tellingAction } from '@sharpee/stdlib';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');
const FIXTURE = readFileSync(join(CHORD_FIXTURES, 'topic-basic.story'), 'utf8');

/** The fixture without its catch-all clauses (AC-4's default branch). */
const NO_CATCH_ALL = FIXTURE
  .replace(/ {2}on asking it\n {4}phrase shrug-reply\n {2}end on\n\n/, '')
  .replace(/ {2}on telling it\n {4}phrase nod-reply\n {2}end on\n\n/, '');

/** A porter with ONLY a catch-all clause and no table — the pre-ADR-239
 *  shape, pinning the seedData addition's non-effect on plain clauses. */
const CLAUSE_ONLY = FIXTURE.replace(/define topics for the porter[\s\S]*?end topics\n\n/, '');

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
}

function load(source: string): Loaded {
  const story = createStory(compileSource(source), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

const entity = (l: Loaded, irId: string): IFEntity => l.world.getEntity(l.story.entityId(irId)!)!;

/** Four-phase context over the LIVE world (door-actions harness model). */
function makeContext(l: Loaded, action: { id: string }, command: Record<string, unknown>): any {
  const currentLocation =
    l.world.getContainingRoom(l.player.id) ?? l.world.getEntity(l.world.getLocation(l.player.id)!)!;
  return {
    world: l.world,
    player: l.player,
    action,
    currentLocation,
    command,
    sharedData: {},
    // LIVE platform visibility (VisibilityBehavior through the world) —
    // asking/telling validate canSee + same-location, both real here.
    canSee: (target: IFEntity) => l.world.getVisible(l.player.id).some((e) => e.id === target.id),
    requireScope: (target: IFEntity) =>
      l.world.getInScope(l.player.id).some((e) => e.id === target.id)
        ? { ok: true }
        : { ok: false, error: { valid: false, error: 'not_in_scope' } },
    event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
      ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
  };
}

/** Drive all four phases of a real stdlib action; return report's events. */
function drive(l: Loaded, action: any, command: Record<string, unknown>) {
  const context = makeContext(l, action, command);
  const validation = action.validate(context);
  context.validationResult = validation;
  let events: ISemanticEvent[] = [];
  if (validation.valid) {
    action.execute(context);
    events = action.report(context);
  }
  return { validation, events };
}

/** ADR-231 D4 topic shape: verbatim text + optional quiet entity resolution. */
const ask = (l: Loaded, topic: { text: string; entity?: string }) =>
  drive(l, askingAction, { directObject: { entity: entity(l, 'porter') }, topic });
const tell = (l: Loaded, topic: { text: string; entity?: string }) =>
  drive(l, tellingAction, { directObject: { entity: entity(l, 'porter') }, topic });

const messageId = (r: { events: ISemanticEvent[] }) => (r.events[0]?.data as any)?.messageId;

describe('AC-1: declared entries answer per-topic through the REAL actions', () => {
  it('entity tier — asking about the sword (quiet topicEntityId resolution) answers sword-reply', () => {
    const l = load(FIXTURE);
    const r = ask(l, { text: 'sword', entity: entity(l, 'sword').id });
    expect(r.validation.valid).toBe(true);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].type).toBe('if.event.asked');
    expect(messageId(r)).toBe('sword-reply');
  });

  it('free-text tier — asking about "treasure" answers treasure-reply', () => {
    const l = load(FIXTURE);
    const r = ask(l, { text: 'treasure' });
    expect(messageId(r)).toBe('treasure-reply');
  });

  it('a body-form row runs its mutations — asking about the folly turns the porter nervous', () => {
    const l = load(FIXTURE);
    expect(l.world.getStateValue('chord.state.porter')).not.toBe('nervous'); // precondition
    const r = ask(l, { text: 'the folly' });
    expect(messageId(r)).toBe('folly-reply');
    expect(l.world.getStateValue('chord.state.porter')).toBe('nervous'); // the mutation landed
  });
});

describe('AC-2: aliases are declared, never inferred (lookup, not search)', () => {
  it('the declared alias reaches the primary entry, normalization included', () => {
    const l = load(FIXTURE);
    expect(messageId(ask(l, { text: 'the hoard' }))).toBe('treasure-reply');
    // Case-insensitive + leading-article-stripped: same declared alias.
    expect(messageId(ask(l, { text: 'Hoard' }))).toBe('treasure-reply');
  });

  it('a plausible but undeclared paraphrase does NOT match — it falls to the catch-all', () => {
    const l = load(FIXTURE);
    expect(messageId(ask(l, { text: 'riches' }))).toBe('shrug-reply');
  });
});

describe('AC-4: catch-all fires only on a miss; a hit suppresses it entirely', () => {
  it('a miss fires the declared catch-all (`on asking it`)', () => {
    const l = load(FIXTURE);
    const r = ask(l, { text: 'the weather' });
    expect(messageId(r)).toBe('shrug-reply');
  });

  it('a hit produces ONLY the entry response — never both, never neither', () => {
    const l = load(FIXTURE);
    const r = ask(l, { text: 'treasure' });
    expect(r.events).toHaveLength(1); // no appended catch-all event
    expect(messageId(r)).toBe('treasure-reply');
    const asText = JSON.stringify(r.events);
    expect(asText).not.toContain('shrug-reply');
  });

  it('with NO catch-all declared, a miss leaves the stdlib unknown_topic default standing', () => {
    const l = load(NO_CATCH_ALL);
    const r = ask(l, { text: 'the weather' });
    expect(messageId(r)).toBe('if.action.asking.unknown_topic');
    // …and the table still answers its declared entries.
    expect(messageId(ask(l, { text: 'treasure' }))).toBe('treasure-reply');
  });
});

describe('AC-5: `tell … about` is symmetric — the SAME table serves both gerunds', () => {
  it('entity tier — telling about the sword answers sword-reply on if.event.told', () => {
    const l = load(FIXTURE);
    const r = tell(l, { text: 'sword', entity: entity(l, 'sword').id });
    expect(r.events[0].type).toBe('if.event.told');
    expect(messageId(r)).toBe('sword-reply');
  });

  it('free-text tier — telling about the alias answers treasure-reply', () => {
    const l = load(FIXTURE);
    expect(messageId(tell(l, { text: 'the hoard' }))).toBe('treasure-reply');
  });

  it('a telling miss fires the telling catch-all; with none, the not_interested default', () => {
    const l = load(FIXTURE);
    expect(messageId(tell(l, { text: 'the weather' }))).toBe('nod-reply');
    const bare = load(NO_CATCH_ALL);
    expect(messageId(tell(bare, { text: 'the weather' }))).toBe('if.action.telling.not_interested');
  });
});

describe('seedData non-effect: plain clauses behave exactly as before ADR-239', () => {
  it('an owner with ONLY a catch-all clause (no table) answers every ask with it', () => {
    const l = load(CLAUSE_ONLY);
    expect(messageId(ask(l, { text: 'sword', entity: entity(l, 'sword').id }))).toBe('shrug-reply');
    expect(messageId(ask(l, { text: 'treasure' }))).toBe('shrug-reply');
    expect(messageId(tell(l, { text: 'anything' }))).toBe('nod-reply');
  });
});

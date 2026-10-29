/**
 * claim-predicates.ts — does a claim hold in the state just reached? (ADR-365 D1)
 *
 * Purpose: the seven predicates, each read off something the engine already
 * records — the ending, the player's room, a thing's containment, a Chord
 * state, a trait field, an occurrence counter, the turn's events — so a
 * claim needs no instrumentation of its own.
 *
 * Entities are resolved through the world on every evaluation, by the
 * runtime id the IR id mapped to at boot: the engine's restore replaces
 * entity instances and keeps their ids, so an instance held across a
 * restore reads stale.
 *
 * A claim that does not hold is described in the words the lock offers a
 * fact in (`the deed box is closed`, `the player is in the Folly Hill`), so
 * a broken lock's report reads as the claim's own sentence would
 * (ADR-367 D6).
 *
 * Public interface: `claimHolds`, `describeClaimMiss`, `ClaimContext`,
 *   `ClaimNames`, `entityIdByIrOf`, `clauseKeysByFiredOf`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { StoryIR } from '@sharpee/chord';
import { CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, clauseOccurrenceKey } from '@sharpee/story-loader';
import type { Claim } from './claim-set.js';
import type { ClaimsEntity, ClaimsTurnEvent, ClaimsWorld, WorldSnapshot } from './claims-game.js';
import { irIdOf } from './claims-game.js';
import { FLAG_SENTENCES, participleOf, writtenName } from './claim-vocabulary.js';

/**
 * Runtime entity id by IR id, read off a booted world once. The engine's
 * restore keeps ids, so the map built at boot stays valid across forks.
 *
 * @param world the booted world
 * @returns IR id to runtime id, for every entity the loader stamped
 */
export function entityIdByIrOf(world: ClaimsWorld): Map<string, string> {
  const map = new Map<string, string>();
  for (const entity of world.getAllEntities()) {
    const irId = irIdOf(entity);
    if (irId !== undefined) map.set(irId, entity.id);
  }
  return map;
}

/**
 * The firing-counter keys behind each `<thing> has been <participle>` text
 * (`<thing-id>.<action>`), built once from the IR: the counters of the
 * thing's own `on` clauses for that action, by the clause's compiler id
 * (ADR-388 D2), composed by the loader's own key function.
 *
 * @param ir the compiled story
 * @returns the compiler's `fired` text to the loader's counter keys
 */
export function clauseKeysByFiredOf(ir: StoryIR): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entity of ir.entities) {
    for (const clause of entity.onClauses) {
      const fired = `${entity.id}.${clause.action}`;
      const keys = map.get(fired) ?? [];
      keys.push(clauseOccurrenceKey(clause.id));
      map.set(fired, keys);
    }
  }
  return map;
}

/** What a predicate reads: the live world, its snapshot, the turn's events, and the boot-time id map. */
export interface ClaimContext {
  readonly world: ClaimsWorld;
  readonly snapshot: WorldSnapshot;
  readonly events: readonly ClaimsTurnEvent[];
  /** Runtime entity id by IR id, built at boot. */
  readonly entityIdByIr: ReadonlyMap<string, string>;
  /**
   * The firing-counter keys of a thing's own `on` clauses for one action,
   * by the compiler's `fired` text (`<thing-id>.<action>`), built once from
   * the IR: a `has been <participle>` claim holds when any of them is above
   * zero. The keys are the loader's, composed by its own function — never
   * matched by substring.
   */
  readonly clauseKeysByFired: ReadonlyMap<string, readonly string[]>;
}

function entityByIr(ctx: ClaimContext, irId: string): ClaimsEntity | undefined {
  const runtimeId = ctx.entityIdByIr.get(irId);
  return runtimeId === undefined ? undefined : ctx.world.getEntity(runtimeId);
}

function eventData(event: ClaimsTurnEvent): Record<string, unknown> {
  return typeof event.data === 'object' && event.data !== null ? (event.data as Record<string, unknown>) : {};
}

/**
 * Evaluate one claim's predicate against the state just reached.
 *
 * @param claim a normalized claim
 * @param ctx the state: world, snapshot, the events of the turn that reached it
 * @returns true when the predicate holds there
 */
export function claimHolds(claim: Claim, ctx: ClaimContext): boolean {
  const { world, snapshot, events } = ctx;
  const predicate = claim.predicate;
  switch (predicate.kind) {
    case 'ending': {
      const ending = world.getEnding();
      if (!ending) return false;
      const want = predicate.ending;
      return (!want.kind || ending.kind === want.kind)
        && (!want.messageId || ending.messageId === want.messageId)
        && (!want.cause || ending.cause === want.cause);
    }
    case 'room': {
      const player = world.getPlayer();
      const room = player && world.getContainingRoom(player.id);
      return room !== undefined && irIdOf(room) === predicate.room;
    }
    case 'placement': {
      const want = predicate.placement;
      const thing = entityByIr(ctx, want.thing);
      if (!thing) return false;
      if (want.notIn !== undefined) {
        const room = world.getContainingRoom(thing.id);
        return room !== undefined && irIdOf(room) !== want.notIn;
      }
      const location = world.getLocation(thing.id);
      if (want.in === 'player') return location !== undefined && location === world.getPlayer()?.id;
      const target = want.in === undefined ? undefined : entityByIr(ctx, want.in);
      if (!target) return false;
      if (location === target.id) return true;
      const room = world.getContainingRoom(thing.id);
      return room !== undefined && room.id === target.id;
    }
    case 'state': {
      const want = predicate.state;
      const key = want.entity === 'story' ? CHORD_STORY_STATE_KEY : CHORD_STATE_PREFIX + want.entity;
      return (snapshot.state ?? {})[key] === want.value;
    }
    case 'flag': {
      const want = predicate.flag;
      const thing = entityByIr(ctx, want.thing);
      const trait = thing?.get(want.trait);
      if (typeof trait !== 'object' || trait === null) return false;
      const actual = (trait as Record<string, unknown>)[want.field];
      return actual === (want.value === undefined ? true : want.value);
    }
    case 'fired': {
      const state = snapshot.state ?? {};
      return (ctx.clauseKeysByFired.get(predicate.fired) ?? []).some((key) => Number(state[key]) > 0);
    }
    case 'event': {
      const want = predicate.event;
      const target = want.target === undefined ? undefined : entityByIr(ctx, want.target);
      if (want.target !== undefined && !target) return false;
      return events.some((event) => {
        if (event.type !== want.type) return false;
        const data = eventData(event);
        if (target && data.targetId !== target.id) return false;
        if (want.topic !== undefined && !String(data.topic ?? '').toLowerCase().includes(want.topic.toLowerCase())) return false;
        return true;
      });
    }
  }
}

/** How a miss is spelled: the written name of a thing, by its IR id. */
export interface ClaimNames {
  /** `the deed box`, `Tobias` — the story's own spelling; `undefined` for an id the story lacks. */
  nameOf(irId: string): string | undefined;
}

/**
 * Build the names a miss is spelled with from the compiled story.
 *
 * @param ir the compiled story
 * @returns the lookup, by IR entity id
 */
export function claimNamesOf(ir: StoryIR): ClaimNames {
  const byId = new Map(ir.entities.map((entity) => [entity.id, writtenName(entity)]));
  return { nameOf: (irId) => byId.get(irId) };
}

/**
 * Say, in the claim's own words, what is so instead when a claim does not
 * hold (ADR-367 D6): `the player is in the Folly Hill` for a room claim,
 * `the deed box is closed` for a flag, `the story has not ended` for an
 * ending. The sentence names the state reached, never the claim — the
 * report puts the claim's name beside it.
 *
 * @param claim a normalized claim that `claimHolds` found false here
 * @param ctx the state it was evaluated against
 * @param names the story's spelling of its things
 * @returns one sentence, never empty
 */
export function describeClaimMiss(claim: Claim, ctx: ClaimContext, names: ClaimNames): string {
  const { world, snapshot, events } = ctx;
  const predicate = claim.predicate;
  const named = (entity: ClaimsEntity | undefined): string | undefined => {
    if (!entity) return undefined;
    const irId = irIdOf(entity);
    return (irId !== undefined ? names.nameOf(irId) : undefined) ?? entity.name;
  };
  const thingName = (irId: string): string => names.nameOf(irId) ?? irId;
  switch (predicate.kind) {
    case 'ending': {
      const ending = world.getEnding();
      return ending ? `the story ended in ${ending.kind}${ending.messageId ? ` (${ending.messageId})` : ''}` : 'the story has not ended';
    }
    case 'room': {
      const player = world.getPlayer();
      const room = player && world.getContainingRoom(player.id);
      const here = named(room);
      return here !== undefined ? `the player is in ${here}` : 'the player is in no room';
    }
    case 'placement': {
      const want = predicate.placement;
      const thing = entityByIr(ctx, want.thing);
      const name = thingName(want.thing);
      if (!thing) return `${name} is not in the world`;
      const room = named(world.getContainingRoom(thing.id));
      if (want.notIn !== undefined) return room !== undefined ? `${name} is in ${room}` : `${name} is nowhere`;
      if (want.in === 'player') return room !== undefined ? `the player does not have ${name}; it is in ${room}` : `the player does not have ${name}`;
      const holder = named(world.getEntity(world.getLocation(thing.id) ?? ''));
      const where = holder ?? room;
      return where !== undefined ? `${name} is in ${where}` : `${name} is nowhere`;
    }
    case 'state': {
      const want = predicate.state;
      const key = want.entity === 'story' ? CHORD_STORY_STATE_KEY : CHORD_STATE_PREFIX + want.entity;
      const actual = (snapshot.state ?? {})[key];
      const subject = want.entity === 'story' ? 'the story' : thingName(want.entity);
      return typeof actual === 'string' ? `${subject} is ${actual}` : `${subject} has no state`;
    }
    case 'flag': {
      const want = predicate.flag;
      const name = thingName(want.thing);
      const thing = entityByIr(ctx, want.thing);
      const trait = thing?.get(want.trait);
      const actual = typeof trait === 'object' && trait !== null ? (trait as Record<string, unknown>)[want.field] : undefined;
      const sentence = FLAG_SENTENCES.find((flag) => flag.trait === want.trait && flag.field === want.field);
      if (sentence && typeof actual === 'boolean') return `${name} is ${actual ? sentence.whenTrue : sentence.whenFalse}`;
      return actual === undefined ? `${name} has no ${want.trait} ${want.field}` : `${name}'s ${want.field} is ${JSON.stringify(actual)}`;
    }
    case 'fired': {
      const dot = predicate.fired.lastIndexOf('.');
      const thing = thingName(predicate.fired.slice(0, dot));
      const participle = participleOf(predicate.fired.slice(dot + 1)) ?? predicate.fired.slice(dot + 1);
      return `${thing} has not been ${participle}`;
    }
    case 'event': {
      const want = predicate.event;
      const seen = events.filter((event) => event.type === want.type).length;
      if (seen === 0) return `no ${want.type} event this turn`;
      return want.target !== undefined
        ? `the ${want.type} event this turn was not about ${thingName(want.target)}`
        : `the ${want.type} event this turn did not mention "${want.topic ?? ''}"`;
    }
  }
}

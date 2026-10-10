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
 * Public interface: `claimHolds`, `ClaimContext`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import { CHORD_OCCURRENCE_PREFIX, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY } from '@sharpee/story-loader';
import type { Claim } from './claim-set.js';
import type { ClaimsEntity, ClaimsTurnEvent, ClaimsWorld, WorldSnapshot } from './claims-game.js';
import { irIdOf } from './claims-game.js';

/** What a predicate reads: the live world, its snapshot, the turn's events, and the boot-time id map. */
export interface ClaimContext {
  readonly world: ClaimsWorld;
  readonly snapshot: WorldSnapshot;
  readonly events: readonly ClaimsTurnEvent[];
  /** Runtime entity id by IR id, built at boot. */
  readonly entityIdByIr: ReadonlyMap<string, string>;
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
      for (const [key, value] of Object.entries(snapshot.state ?? {})) {
        if (key.startsWith(CHORD_OCCURRENCE_PREFIX) && key.includes(predicate.fired) && Number(value) > 0) return true;
      }
      return false;
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

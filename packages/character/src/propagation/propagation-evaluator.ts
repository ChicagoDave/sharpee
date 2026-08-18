/**
 * Propagation evaluation engine (ADR-144)
 *
 * Per-turn evaluator that determines which facts each NPC shares,
 * with whom, and in what order. Pure evaluation logic — does not
 * mutate world state. Returns PropagationTransfer objects that
 * the caller applies via fact-transfer.
 *
 * Public interface: evaluatePropagation, PropagationContext.
 * Owner context: @sharpee/character / propagation
 */

import { CharacterModelTrait } from '@sharpee/world-model';
import {
  PropagationProfile,
  PropagationTransfer,
  PropagationColoring,
  SpreadsVersion,
} from './propagation-types.js';

// ---------------------------------------------------------------------------
// Propagation context (what the evaluator needs to know)
// ---------------------------------------------------------------------------

/** Information about an NPC in the room for propagation evaluation. */
export interface RoomOccupant {
  /** Entity ID. */
  id: string;

  /** The NPC's CharacterModelTrait (for disposition checks). */
  trait: CharacterModelTrait;

  /** The NPC's propagation profile, if any. */
  profile?: PropagationProfile;
}

/** Context for evaluating one NPC's propagation. */
export interface PropagationContext {
  /** The speaking NPC. */
  speaker: RoomOccupant;

  /** All other NPCs in the same room. */
  listeners: RoomOccupant[];

  /** Whether the player is present in the room. */
  playerPresent: boolean;

  /** Current turn number. */
  turn: number;

  /** Number of turns the speaker has been in this room with listeners. */
  turnsColocated?: number;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate propagation for a single NPC.
 *
 * Algorithm:
 * 1. Mute check — skip entirely
 * 2. Schedule condition check — skip if not met
 * 3. Find eligible listeners (audience + exclusions)
 * 4. Find eligible facts (spreads whitelist / withholds blacklist + already-told)
 * 5. Apply pace (eager = all, gradual = one, reluctant = wait)
 * 6. Return transfer objects
 *
 * @param ctx - The propagation context
 * @returns Array of transfers to execute
 */
export function evaluatePropagation(ctx: PropagationContext): PropagationTransfer[] {
  const { speaker } = ctx;
  const profile = speaker.profile;

  // No profile or mute → no propagation
  if (!profile || profile.tendency === 'mute') {
    return [];
  }

  // Schedule check
  if (profile.schedule) {
    const scheduleMet = profile.schedule.when.every(cond =>
      speaker.trait.evaluate(cond),
    );
    if (!scheduleMet) return [];
  }

  // Find eligible listeners
  const eligibleListeners = findEligibleListeners(ctx);
  if (eligibleListeners.length === 0) return [];

  // Find eligible facts for each listener
  const transfers: PropagationTransfer[] = [];

  for (const listener of eligibleListeners) {
    const facts = findEligibleFacts(ctx, listener);
    if (facts.length === 0) continue;

    // Apply pace
    const factsToShare = applyPace(facts, profile, ctx);

    for (const topic of factsToShare) {
      const override = profile.overrides?.[topic];
      const version: SpreadsVersion = override?.spreadsVersion ?? 'truth';
      const coloring: PropagationColoring = profile.coloring ?? 'neutral';

      transfers.push({
        speakerId: speaker.id,
        listenerId: listener.id,
        topic,
        version,
        coloring,
        witnessedOverride: override?.witnessed,
      });
    }
  }

  return transfers;
}

// ---------------------------------------------------------------------------
// Eligible listeners
// ---------------------------------------------------------------------------

/**
 * Find NPCs in the room that the speaker will share with.
 * Filters by audience type and exclusion list.
 */
function findEligibleListeners(ctx: PropagationContext): RoomOccupant[] {
  const { speaker, listeners } = ctx;
  const profile = speaker.profile!;
  const audience = profile.audience ?? 'trusted';
  const excludes = new Set(profile.excludes ?? []);

  return listeners.filter(listener => {
    // Excluded by name
    if (excludes.has(listener.id)) return false;

    // Audience check
    switch (audience) {
      case 'anyone':
        return true;

      case 'trusted':
        // Speaker has positive disposition toward listener
        return speaker.trait.getDispositionValue(listener.id) > 0;

      case 'allied':
        // Both share a loyalty — check if any disposition targets overlap
        // with positive values on both sides
        return hasSharedAlliance(speaker.trait, listener.trait);

      default:
        return false;
    }
  });
}

/**
 * Check if two NPCs share a loyalty (both have positive disposition
 * toward at least one common entity).
 */
function hasSharedAlliance(
  traitA: CharacterModelTrait,
  traitB: CharacterModelTrait,
): boolean {
  for (const [entityId, valueA] of Object.entries(traitA.dispositions)) {
    if (valueA > 50 && (traitB.dispositions[entityId] ?? 0) > 50) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Eligible facts
// ---------------------------------------------------------------------------

/**
 * Find facts the speaker is willing and able to share with a specific listener.
 * Filters by the spreads whitelist / withholds blacklist, already-told
 * (read from the speaker's trait, ADR-310 D17). Hearsay spreads onward
 * like any knowledge (ADR-320 D11; the old leverage gate is retired).
 */
function findEligibleFacts(
  ctx: PropagationContext,
  listener: RoomOccupant,
): string[] {
  const { speaker } = ctx;
  const profile = speaker.profile!;
  const knowledge = speaker.trait.knowledge;

  const withholds = new Set(profile.withholds ?? []);
  const spreadsSet = new Set(profile.spreads ?? []);
  const eligible: string[] = [];

  // NOTE (ADR-320 D11, David's ruling 2026-08-17): hearsay spreads like
  // any knowledge — the old leverage gate, which blocked every
  // told-sourced fact (killing gossip chains after one hop and stranding
  // player claims), is deleted. Selectivity is the authored surfaces:
  // `spreads nothing`, topic whitelists, `withholds`, audiences.
  for (const topic of Object.keys(knowledge)) {
    if (speaker.trait.hasTold(listener.id, topic)) continue;
    if (!meetsAudienceRule(topic, profile, speaker.trait, listener)) continue;
    if (!meetsTopicFilter(topic, withholds, spreadsSet)) continue;

    eligible.push(topic);
  }

  return eligible;
}

/**
 * Check whether a per-fact audience override allows sharing with this listener.
 * Returns true if there is no override or the override audience matches.
 *
 * @param topic - The knowledge topic to check
 * @param profile - Speaker's propagation profile
 * @param speakerTrait - Speaker's character model trait
 * @param listener - The potential listener
 * @returns Whether the topic passes the audience rule
 */
function meetsAudienceRule(
  topic: string,
  profile: PropagationProfile,
  speakerTrait: CharacterModelTrait,
  listener: RoomOccupant,
): boolean {
  const override = profile.overrides?.[topic];
  if (!override?.to) return true;
  return checkAudienceForListener(override.to, speakerTrait, listener);
}

/**
 * Check whether a topic passes the speaker's topic filter (ADR-310 D10:
 * a non-empty spreads list IS selectivity — only listed topics travel;
 * otherwise everything not withheld travels).
 *
 * @param topic - The knowledge topic to check
 * @param withholds - Pre-computed set of withheld topics
 * @param spreadsSet - Pre-computed set of explicitly shared topics
 * @returns Whether the topic passes the filter
 */
function meetsTopicFilter(
  topic: string,
  withholds: Set<string>,
  spreadsSet: Set<string>,
): boolean {
  if (spreadsSet.size > 0) return spreadsSet.has(topic);
  return !withholds.has(topic);
}

/**
 * Check if a listener matches a specific audience type for a per-fact override.
 */
function checkAudienceForListener(
  audience: 'trusted' | 'anyone' | 'allied',
  speakerTrait: CharacterModelTrait,
  listener: RoomOccupant,
): boolean {
  switch (audience) {
    case 'anyone': return true;
    case 'trusted': return speakerTrait.getDispositionValue(listener.id) > 0;
    case 'allied': return hasSharedAlliance(speakerTrait, listener.trait);
  }
}

// ---------------------------------------------------------------------------
// Pace application
// ---------------------------------------------------------------------------

/**
 * Apply pace to limit how many facts are shared per turn.
 *
 * The default is `eager` — every eligible fact at once. That was briefly
 * changed to `gradual` while chasing a doubled line (Burbage passing Kemp both
 * `the-blow-up` and `norwich` printed "Richard Burbage mentions something to
 * Will Kemp." twice, since the witnessed message names no topic). `gradual`
 * hid the duplicate but was the wrong layer, and it cost the story a beat:
 * with one fact per turn, a pair who meet ONCE — Kemp storms off straight
 * after the blow-up — can never exchange the second fact, so `norwich` never
 * reached Kemp and his "you are no more a Norwich man than I am a Roman"
 * recognition became unreachable.
 *
 * The real cause was that the platform narrated an arrival the STORY already
 * dramatizes (`arrivalNarratedTopics`, see `recordTransfer`). With that fixed,
 * `eager` prints one line rather than two AND the payoff survives.
 */
function applyPace(
  eligibleFacts: string[],
  profile: PropagationProfile,
  ctx: PropagationContext,
): string[] {
  const pace = profile.pace ?? 'eager';

  switch (pace) {
    case 'eager':
      // Share all eligible facts at once
      return eligibleFacts;

    case 'gradual':
      // One fact per turn
      return eligibleFacts.slice(0, 1);

    case 'reluctant':
      // Requires multiple turns colocated before sharing
      if ((ctx.turnsColocated ?? 0) < 3) return [];
      return eligibleFacts.slice(0, 1);
  }
}

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
  AlreadyToldRecord,
  PropagationColoring,
  SpreadsVersion,
} from './propagation-types';

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

  /** The already-told record (shared across all NPCs). */
  alreadyTold: AlreadyToldRecord;

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
 * 4. Find eligible facts (tendency whitelist/blacklist + already-told)
 * 5. Apply pace (eager = all, gradual = one, reluctant = wait)
 * 6. Return transfer objects
 *
 * @param ctx - The propagation context
 * @returns Array of transfers to execute
 */
export function evaluatePropagation(ctx: PropagationContext): PropagationTransfer[] {
  const { speaker, listeners } = ctx;
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
 * Filters by tendency (chatty/selective), already-told, and player-leverage.
 */
function findEligibleFacts(
  ctx: PropagationContext,
  listener: RoomOccupant,
): string[] {
  const { speaker, alreadyTold } = ctx;
  const profile = speaker.profile!;
  const knowledge = speaker.trait.knowledge;

  const withholds = new Set(profile.withholds ?? []);
  const spreadsSet = new Set(profile.spreads ?? []);

  const eligible: string[] = [];

  for (const topic of Object.keys(knowledge)) {
    // Already told this listener → skip
    if (alreadyTold.hasTold(speaker.id, listener.id, topic)) continue;

    // Check per-fact audience override
    const override = profile.overrides?.[topic];
    if (override?.to) {
      const overrideMatch = checkAudienceForListener(
        override.to, speaker.trait, listener,
      );
      if (!overrideMatch) continue;
    }

    // Tendency filter
    switch (profile.tendency) {
      case 'chatty':
        // Share everything unless withheld
        if (withholds.has(topic)) continue;
        break;

      case 'selective':
        // Only share explicitly listed topics
        if (!spreadsSet.has(topic)) continue;
        break;
    }

    // Player-leverage check: if the fact came from the player and
    // playerCanLeverage is false, don't propagate it
    if (!profile.playerCanLeverage) {
      const fact = knowledge[topic];
      if (fact && (fact.source === 'told' || fact.source as string === 'told by player')) {
        continue;
      }
    }

    eligible.push(topic);
  }

  return eligible;
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

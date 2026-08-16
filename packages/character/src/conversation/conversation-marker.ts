/**
 * Conversation marker (ADR-310 D16 lifecycle rule)
 *
 * "A conversation in progress suppresses goal pursuit": every dialogue
 * delivery stamps the marker on the speaker's trait (D17 — it rides the
 * trait, so it saves and restores), and the goal sub-step skips step
 * execution while the marker is fresh. Freshness is turn distance
 * against the lifecycle's decay threshold — the marker is never cleared
 * in place, only superseded or outgrown, so no per-turn mutation exists.
 *
 * Both dialogue surfaces stamp through here: the chord topic dispatch
 * (story-loader's topic arm) and the TS-API selector socket — one
 * semantics, the same pattern as the claim bookkeeping in claims.ts.
 *
 * Public interface: markConversationTurn, conversationSuppressesGoals.
 * Owner context: @sharpee/character / conversation
 */

import type { CharacterModelTrait } from '@sharpee/world-model';
import { turnsSince } from '../character-clock.js';
import { DEFAULT_DECAY_THRESHOLDS } from './lifecycle.js';

/**
 * Non-conversation turns before a conversation stops suppressing goals —
 * the lifecycle's neutral decay threshold (ADR-142), reused so the D16
 * suppression window and conversation decay share one vocabulary.
 */
const SUPPRESSION_TURNS = DEFAULT_DECAY_THRESHOLDS.neutral;

/**
 * Stamp the conversation marker: dialogue reached this character from
 * `partnerId` on `currentTurn`. Overwrites any earlier marker.
 *
 * @param trait - The speaker's character model trait (mutated)
 * @param partnerId - The conversing actor (the player on both surfaces)
 * @param currentTurn - The turn the dialogue happened in
 */
export function markConversationTurn(
  trait: CharacterModelTrait,
  partnerId: string,
  currentTurn: number,
): void {
  trait.activeConversation = { partnerId, lastTurn: currentTurn };
}

/**
 * Whether a conversation in progress suppresses this character's goal
 * pursuit (ADR-310 D16). True while the last dialogue delivery is within
 * the suppression window; goal ACTIVATION is unaffected — D8's
 * `active when` still re-evaluates every turn, the goal simply does not
 * act.
 *
 * @param trait - The character model trait to consult
 * @param currentTurn - The turn being evaluated
 * @returns True if pursuit is suppressed this turn
 */
export function conversationSuppressesGoals(
  trait: CharacterModelTrait,
  currentTurn: number,
): boolean {
  const marker = trait.activeConversation;
  if (!marker) return false;
  return turnsSince(currentTurn, marker.lastTurn) < SUPPRESSION_TURNS;
}

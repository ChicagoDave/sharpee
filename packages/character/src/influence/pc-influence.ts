/**
 * PC influence handling (ADR-146 layer 4)
 *
 * Handles the effect of influences on the player character:
 * checks for active influence effects on the PC and determines
 * whether player actions should be intercepted.
 *
 * Public interface: evaluatePcInfluence, PcInfluenceResult.
 * Owner context: @sharpee/character / influence
 */

import { InfluenceTracker } from './influence-duration';
import { ActiveInfluenceEffect, InfluenceDef } from './influence-types';

// ---------------------------------------------------------------------------
// PC influence result
// ---------------------------------------------------------------------------

/** Result of checking PC influence before a player action. */
export type PcInfluenceResult =
  | {
      status: 'clear';
    }
  | {
      status: 'intercepted';
      influenceName: string;
      influencerId: string;
      effect: ActiveInfluenceEffect;
      onPlayerAction?: string;
      clearConversationContext: boolean;
    };

// ---------------------------------------------------------------------------
// PC influence evaluation
// ---------------------------------------------------------------------------

/**
 * Check if the player is under any influence that would intercept their action.
 *
 * Returns the highest-impact influence affecting the PC, if any.
 * An influence intercepts the PC when:
 * - The effect includes `focus: 'clouded'` — clears conversation context
 * - The influence has an `onPlayerAction` message — fires narrative message
 *
 * @param playerId - The player entity ID
 * @param tracker - The influence tracker with active effects
 * @param influenceDefs - Map of influencer ID to their influence definitions
 * @returns PC influence result
 */
export function evaluatePcInfluence(
  playerId: string,
  tracker: InfluenceTracker,
  influenceDefs: Map<string, InfluenceDef[]>,
): PcInfluenceResult {
  const pcEffects = tracker.getEffectsOn(playerId);
  if (pcEffects.length === 0) {
    return { status: 'clear' };
  }

  // Find the first effect that would intercept the PC
  for (const effect of pcEffects) {
    // Look up the original influence definition for onPlayerAction message
    const defs = influenceDefs.get(effect.influencerId);
    const def = defs?.find(d => d.name === effect.influenceName);

    const hasFocusClouded = effect.effect.focus === 'clouded';
    const hasOnPlayerAction = def?.onPlayerAction !== undefined;

    if (hasFocusClouded || hasOnPlayerAction) {
      return {
        status: 'intercepted',
        influenceName: effect.influenceName,
        influencerId: effect.influencerId,
        effect,
        onPlayerAction: def?.onPlayerAction,
        clearConversationContext: hasFocusClouded,
      };
    }
  }

  // PC is under influence but none intercept actions
  return { status: 'clear' };
}

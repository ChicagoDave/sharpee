/**
 * Troll Action Interceptors
 *
 * Action interceptors for the troll NPC (ADR-118).
 * These intercept player actions directed at the troll.
 *
 * Converted from capability behaviors to interceptors to work around
 * cross-module registry bug (ISSUE-052: capability-registry.ts uses
 * module-level Map that isn't shared across dynamic require() boundaries).
 *
 * From MDL source (act1.254):
 * - TAKE: "The troll spits in your face..."
 * - TALK (when dead/unconscious): "Unfortunately, the troll can't hear you."
 *
 * Unarmed ATTACK is handled generically by MeleeInterceptor (all combatants).
 *
 * NOTE: GIVE/THROW to troll are handled via entity event handlers in
 * underground.ts because multi-object actions need access to both the
 * item and recipient, which interceptor dispatch doesn't support well.
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  CapabilityEffect,
  createEffect,
  IFEntity,
  WorldModel,
  CombatantTrait,
} from '@sharpee/world-model';

import { TrollTrait } from './troll-trait';

/**
 * Message IDs for troll interceptors
 */
export const TrollCapabilityMessages = {
  // TAKE TROLL response
  SPITS_AT_PLAYER: 'dungeo.troll.spits_at_player',

  // TALK (incapacitated) response
  CANT_HEAR_YOU: 'dungeo.troll.cant_hear_you',
} as const;

/**
 * Check if the troll is incapacitated (dead or unconscious)
 */
function isTrollIncapacitated(entity: IFEntity): boolean {
  const combatant = entity.get?.(CombatantTrait);
  if (!combatant) return false;
  return !combatant.isAlive || !combatant.isConscious;
}

// ============================================================================
// TAKING INTERCEPTOR - TAKE TROLL
// ============================================================================

/**
 * Interceptor for trying to take the troll.
 *
 * MDL: "The troll spits in your face, saying 'Better luck next time.'"
 * Always blocks — you can never take the troll.
 */
export const TrollTakingInterceptor: ActionInterceptor = {
  preValidate(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const trait = entity.get(TrollTrait);
    if (!trait) return null;

    return {
      valid: false,
      error: TrollCapabilityMessages.SPITS_AT_PLAYER
    };
  }
};

// ============================================================================
// TALKING INTERCEPTOR - TALK TO TROLL (when incapacitated)
// ============================================================================

/**
 * Interceptor for talking to the troll when dead/unconscious.
 *
 * MDL: "Unfortunately, the troll can't hear you."
 * Only intercepts when troll is incapacitated. If alive, let stdlib handle it.
 */
export const TrollTalkingInterceptor: ActionInterceptor = {
  preValidate(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const trait = entity.get(TrollTrait);
    if (!trait) return null;

    // Only intercept when incapacitated
    if (isTrollIncapacitated(entity)) {
      return {
        valid: false,
        error: TrollCapabilityMessages.CANT_HEAR_YOU
      };
    }

    // Troll is alive and conscious — let stdlib handle it
    return null;
  }
};

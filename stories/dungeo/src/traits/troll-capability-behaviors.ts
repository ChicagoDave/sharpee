/**
 * Troll Capability Behaviors
 *
 * Capability behaviors for the troll NPC (ADR-090 universal dispatch).
 * These handle player actions directed at the troll.
 *
 * From MDL source (act1.254):
 * - TAKE: "The troll spits in your face..."
 * - ATTACK (unarmed): "The troll laughs at your puny gesture."
 * - TALK (when dead/unconscious): "Unfortunately, the troll can't hear you."
 *
 * NOTE: GIVE/THROW to troll are handled via entity event handlers in
 * underground.ts because multi-object actions need access to both the
 * item and recipient, which capability dispatch doesn't support well.
 */

import {
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilityEffect,
  CapabilitySharedData,
  createEffect,
  IFEntity,
  WorldModel,
  CombatantTrait,
  TraitType,
  IdentityTrait
} from '@sharpee/world-model';

import { TrollTrait } from './troll-trait';

/**
 * Message IDs for troll capability behaviors
 */
export const TrollCapabilityMessages = {
  // TAKE TROLL response
  SPITS_AT_PLAYER: 'dungeo.troll.spits_at_player',

  // ATTACK (unarmed) response
  MOCKS_UNARMED_ATTACK: 'dungeo.troll.mocks_unarmed_attack',

  // TALK (incapacitated) response
  CANT_HEAR_YOU: 'dungeo.troll.cant_hear_you',
} as const;

/**
 * Check if the troll is alive and conscious
 */
function isTrollActive(entity: IFEntity): boolean {
  const combatant = entity.get?.(CombatantTrait);
  if (!combatant) return false;
  return combatant.isAlive && combatant.isConscious;
}

/**
 * Check if the troll is incapacitated (dead or unconscious)
 */
function isTrollIncapacitated(entity: IFEntity): boolean {
  const combatant = entity.get?.(CombatantTrait);
  if (!combatant) return false;
  return !combatant.isAlive || !combatant.isConscious;
}

/**
 * Check if the actor has a weapon
 */
function actorHasWeapon(world: WorldModel, actorId: string): boolean {
  const inventory = world.getContents(actorId);
  return inventory.some(item => item.has?.(TraitType.WEAPON));
}

// ============================================================================
// TAKING BEHAVIOR - TAKE TROLL
// ============================================================================

/**
 * Behavior for trying to take the troll
 *
 * MDL: "The troll spits in your face, saying 'Better luck next time.'"
 */
export const TrollTakingBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityValidationResult {
    const trait = entity.get(TrollTrait);
    if (!trait) {
      return { valid: true };
    }

    // Always block taking the troll
    return {
      valid: false,
      error: TrollCapabilityMessages.SPITS_AT_PLAYER
    };
  },

  execute() {
    // Never executed - always blocked
  },

  report() {
    return [];
  },

  blocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    const identity = entity.get(IdentityTrait);
    return [
      createEffect('action.blocked', {
        actionId: 'if.action.taking',
        messageId: error,
        params: { target: identity?.name || 'troll' }
      })
    ];
  }
};

// ============================================================================
// ATTACKING BEHAVIOR - ATTACK TROLL (unarmed)
// ============================================================================

/**
 * Shared data for attacking behavior
 */
interface AttackingSharedData extends CapabilitySharedData {
  hasWeapon?: boolean;
  trollName?: string;
}

/**
 * Behavior for attacking the troll without a weapon
 *
 * MDL: "The troll laughs at your puny gesture."
 *
 * Only intercepts when player is unarmed. If armed, let stdlib combat handle it.
 */
export const TrollAttackingBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: AttackingSharedData
  ): CapabilityValidationResult {
    const trait = entity.get(TrollTrait);
    if (!trait) {
      return { valid: true };
    }

    // Troll must be alive to respond
    if (!isTrollActive(entity)) {
      return { valid: true }; // Let stdlib handle dead troll
    }

    // Check if attacker has a weapon
    const hasWeapon = actorHasWeapon(world, actorId);
    sharedData.hasWeapon = hasWeapon;

    const identity = entity.get(IdentityTrait);
    sharedData.trollName = identity?.name || 'troll';

    if (!hasWeapon) {
      // Block unarmed attack with mocking response
      return {
        valid: false,
        error: TrollCapabilityMessages.MOCKS_UNARMED_ATTACK
      };
    }

    // Has weapon - let stdlib combat handle it
    return { valid: true };
  },

  execute() {
    // Not executed for unarmed (blocked), armed uses stdlib
  },

  report() {
    return [];
  },

  blocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    sharedData: AttackingSharedData
  ): CapabilityEffect[] {
    return [
      createEffect('action.blocked', {
        actionId: 'if.action.attacking',
        messageId: error,
        params: { target: sharedData.trollName || 'troll' }
      })
    ];
  }
};

// ============================================================================
// TALKING BEHAVIOR - TALK TO TROLL (when incapacitated)
// ============================================================================

/**
 * Behavior for talking to the troll when dead/unconscious
 *
 * MDL: "Unfortunately, the troll can't hear you."
 *
 * Only intercepts when troll is incapacitated. If alive, let stdlib handle it.
 */
export const TrollTalkingBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityValidationResult {
    const trait = entity.get(TrollTrait);
    if (!trait) {
      return { valid: true };
    }

    // Only intercept when incapacitated
    if (isTrollIncapacitated(entity)) {
      return {
        valid: false,
        error: TrollCapabilityMessages.CANT_HEAR_YOU
      };
    }

    // Troll is alive and conscious - let stdlib handle it
    return { valid: true };
  },

  execute() {
    // Not executed - blocked when incapacitated
  },

  report() {
    return [];
  },

  blocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    const identity = entity.get(IdentityTrait);
    return [
      createEffect('action.blocked', {
        actionId: 'if.action.talking',
        messageId: error,
        params: { target: identity?.name || 'troll' }
      })
    ];
  }
};

/**
 * Troll Capability Behaviors
 *
 * Capability behaviors for the troll NPC (ADR-090 universal dispatch).
 * These handle player actions directed at the troll.
 *
 * From MDL source (act1.254):
 * - TAKE: "The troll spits in your face..."
 * - ATTACK (unarmed): "The troll laughs at your puny gesture."
 * - ATTACK (armed): Full combat via CombatService
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
  IdentityTrait,
  WeaponTrait
} from '@sharpee/world-model';

import {
  CombatService,
  CombatResult,
  applyCombatResult,
  findWieldedWeapon
} from '@sharpee/stdlib';

import { TrollTrait } from './troll-trait';
import { TrollMessages } from '../npcs/troll/troll-messages';

// Simple random implementation for combat
function createSimpleRandom() {
  return {
    next: () => Math.random(),
    int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    chance: (probability: number) => Math.random() < probability,
    pick: <T>(array: T[]) => array[Math.floor(Math.random() * array.length)],
    shuffle: <T>(array: T[]) => {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
    getSeed: () => 0,
    setSeed: () => {}
  };
}

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
  weapon?: IFEntity;
  combatResult?: CombatResult;
  droppedItems?: string[];
}

/**
 * Behavior for attacking the troll
 *
 * MDL behavior:
 * - Unarmed: "The troll laughs at your puny gesture." (blocked)
 * - Armed: Full combat via CombatService
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

    const identity = entity.get(IdentityTrait);
    sharedData.trollName = identity?.name || 'troll';

    // Check if troll is already dead
    const combatant = entity.get(CombatantTrait);
    if (combatant && !combatant.isAlive) {
      return {
        valid: false,
        error: 'already_dead',
        params: { target: sharedData.trollName }
      };
    }

    // Find player's weapon
    const actor = world.getEntity(actorId);
    if (!actor) {
      return { valid: false, error: 'no_actor' };
    }

    const weapon = findWieldedWeapon(actor, world);
    sharedData.hasWeapon = !!weapon;
    sharedData.weapon = weapon;

    if (!weapon) {
      // Block unarmed attack with mocking response
      return {
        valid: false,
        error: TrollCapabilityMessages.MOCKS_UNARMED_ATTACK
      };
    }

    // Armed attack is valid - will execute combat
    return { valid: true };
  },

  execute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: AttackingSharedData
  ): void {
    // Only execute combat if player has weapon
    if (!sharedData.hasWeapon || !sharedData.weapon) {
      return;
    }

    const actor = world.getEntity(actorId);
    if (!actor) return;

    // Use CombatService for skill-based combat
    const combatService = new CombatService();
    const combatResult = combatService.resolveAttack({
      attacker: actor,
      target: entity,
      weapon: sharedData.weapon,
      world: world,
      random: createSimpleRandom()
    });

    // Apply combat result (handles health, death, inventory dropping)
    const combatApplyResult = applyCombatResult(entity, combatResult, world);

    // Store results for report phase
    sharedData.combatResult = combatResult;
    sharedData.droppedItems = combatApplyResult.droppedItems;
  },

  report(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: AttackingSharedData
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];
    const combatResult = sharedData.combatResult;

    if (!combatResult) {
      return effects;
    }

    const actor = world.getEntity(actorId);
    const weapon = sharedData.weapon;
    const trollName = sharedData.trollName || 'troll';

    // Create ATTACKED event
    effects.push(createEffect('if.event.attacked', {
      target: entity.id,
      targetName: trollName,
      weapon: weapon?.id,
      weaponName: weapon?.name,
      unarmed: false,
      hit: combatResult.hit,
      damage: combatResult.damage
    }));

    // Create action.success with combat message
    // Use custom troll message for knockout
    const messageId = combatResult.targetKnockedOut
      ? TrollMessages.KNOCKED_OUT
      : combatResult.messageId;

    const params: Record<string, unknown> = {
      target: trollName,
      weapon: weapon?.name,
      damage: combatResult.damage,
      attackerName: actor?.name || 'player',
      targetName: trollName
    };

    if (combatResult.messageData) {
      Object.assign(params, combatResult.messageData);
    }

    effects.push(createEffect('action.success', {
      actionId: 'if.action.attacking',
      messageId,
      params
    }));

    // Handle dropped items
    if (sharedData.droppedItems?.length) {
      for (const itemId of sharedData.droppedItems) {
        const item = world.getEntity(itemId);
        if (item) {
          effects.push(createEffect('if.event.dropped', {
            item: itemId,
            itemName: item.name,
            dropper: entity.id,
            dropperName: trollName
          }));
        }
      }
    }

    // Handle death
    if (combatResult.targetKilled) {
      effects.push(createEffect('if.event.death', {
        target: entity.id,
        targetName: trollName,
        killedBy: actorId
      }));
    }

    // Handle knockout
    if (combatResult.targetKnockedOut) {
      effects.push(createEffect('if.event.knocked_out', {
        target: entity.id,
        targetName: trollName,
        knockedOutBy: actorId
      }));
    }

    return effects;
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

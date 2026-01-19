/**
 * Attacking action - hostile action against NPCs or objects
 *
 * This action handles combat or destructive actions.
 * - For NPCs with CombatantTrait: Uses CombatService for skill-based combat (ADR-072)
 * - For objects: Uses AttackBehavior for destruction mechanics
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and is reachable
 * 2. execute: Perform attack via CombatService or AttackBehavior
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, SeededRandom } from '@sharpee/core';
import { TraitType, AttackBehavior, IAttackResult, CombatantTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { AttackedEventData } from './attacking-events';
import { AttackingSharedData, AttackResult } from './attacking-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import {
  CombatService,
  CombatResult,
  applyCombatResult,
  findWieldedWeapon
} from '../../../combat';
import { CombatMessages, getHealthStatusMessageId } from '../../../combat/combat-messages';

// Simple random implementation for combat (Math.random-based)
// In future, ActionContext could provide a seeded random
function createSimpleRandom(): SeededRandom {
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

export const attackingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ATTACKING,
  group: "interaction",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'self',
    'not_holding_weapon',
    'attacked',
    'attacked_with',
    'hit',
    'hit_with',
    'struck',
    'struck_with',
    'punched',
    'kicked',
    'unarmed_attack',
    'broke',
    'smashed',
    'destroyed',
    'shattered',
    'already_damaged',
    'partial_break',
    'defends',
    'dodges',
    'retaliates',
    'flees',
    'peaceful_solution',
    'no_fighting',
    'unnecessary_violence'
  ],

  /**
   * Validate whether the attack action can be executed
   * Checks preconditions only - no state changes
   */
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    // ADR-080: Prefer instrument field (from .instrument() patterns), fall back to indirectObject
    const weapon = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    
    // Must have a target
    if (!target) {
      return { valid: false, error: 'no_target' };
    }
    
    // Check if target is visible
    if (!context.canSee(target)) {
      return { valid: false, error: 'not_visible', params: { target: target.name } };
    }
    
    // Check if target is reachable
    if (!context.canReach(target)) {
      return { valid: false, error: 'not_reachable', params: { target: target.name } };
    }
    
    // Prevent attacking self
    if (target.id === actor.id) {
      return { valid: false, error: 'self' };
    }
    
    // Check if using a weapon
    if (weapon) {
      // Check if holding the weapon
      const weaponLocation = context.world.getLocation(weapon.id);
      if (weaponLocation !== actor.id) {
        return { valid: false, error: 'not_holding_weapon', params: { weapon: weapon.name } };
      }
    }

    // For combatants, check if target is already dead
    if (target.has(TraitType.COMBATANT)) {
      const combatService = new CombatService();
      const combatValidation = combatService.canAttack(actor, target);
      if (!combatValidation.valid) {
        return {
          valid: false,
          error: combatValidation.messageId || 'already_dead',
          params: { target: target.name }
        };
      }
    }

    // Peaceful games might discourage violence
    // This check is left for game-specific implementations via event handlers

    return { valid: true };
  },
  
  /**
   * Execute the attack action
   * Assumes validation has already passed - no validation logic here
   * - For combatants: Uses CombatService for skill-based combat
   * - For objects: Uses AttackBehavior for destruction mechanics
   */
  execute(context: ActionContext): void {
    // Assume validation has passed - no checks needed
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    // ADR-080: Prefer instrument field (from .instrument() patterns), fall back to indirectObject
    let weapon = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    let weaponInferred = false;

    // If no weapon specified, try to infer one from inventory
    const verb = context.command.parsed.action || context.command.parsed.structure.verb?.text || 'attack';
    if (!weapon) {
      // For certain verbs, or when attacking combatants, try to find a weapon
      const shouldInferWeapon =
        verb === 'stab' || verb === 'slash' || verb === 'cut' ||
        target.has(TraitType.COMBATANT);

      if (shouldInferWeapon) {
        weapon = findWieldedWeapon(context.player, context.world);
        if (!weapon) {
          // Fall back to AttackBehavior's inference
          const inventory = context.world.getContents(context.player.id);
          weapon = AttackBehavior.inferWeapon(inventory);
        }
        weaponInferred = !!weapon;
      }
    }

    // Check if target is a combatant (NPC combat uses CombatService)
    if (target.has(TraitType.COMBATANT)) {
      // Use CombatService for skill-based combat (ADR-072)
      const combatService = new CombatService();
      const combatResult = combatService.resolveAttack({
        attacker: context.player,
        target: target,
        weapon: weapon,
        world: context.world,
        random: createSimpleRandom()
      });

      // Apply combat result to target (handles health, death, inventory dropping)
      const combatApplyResult = applyCombatResult(target, combatResult, context.world);

      // Convert to AttackResult type for consistency
      const attackResult: AttackResult = {
        success: true, // Combat always "succeeds" even if attack missed
        type: combatResult.targetKilled ? 'killed' :
              combatResult.targetKnockedOut ? 'knocked_out' :
              combatResult.hit ? 'hit' : 'missed',
        damage: combatResult.damage,
        remainingHitPoints: combatResult.targetNewHealth,
        targetDestroyed: false,
        targetKilled: combatResult.targetKilled,
        targetKnockedOut: combatResult.targetKnockedOut,
        itemsDropped: combatApplyResult.droppedItems
      };

      // Store result for report phase
      const sharedData: AttackingSharedData = {
        attackResult: attackResult,
        weaponUsed: weapon?.id,
        weaponInferred: weaponInferred,
        customMessage: undefined,
        combatResult: combatResult, // Store full combat result for reporting
        usedCombatService: true
      };
      Object.assign(context.sharedData, sharedData);
    } else {
      // Use AttackBehavior for object destruction
      const result: IAttackResult = AttackBehavior.attack(target, weapon, context.world);

      // Convert to our AttackResult type for consistency
      const attackResult: AttackResult = {
        success: result.success,
        type: result.type,
        damage: result.damage,
        remainingHitPoints: result.remainingHitPoints,
        targetDestroyed: result.targetDestroyed,
        targetKilled: result.targetKilled,
        itemsDropped: result.itemsDropped,
        debrisCreated: result.debrisCreated,
        exitRevealed: result.exitRevealed,
        transformedTo: result.transformedTo
      };

      // Store result for report phase
      const sharedData: AttackingSharedData = {
        attackResult: attackResult,
        weaponUsed: weapon?.id,
        weaponInferred: weaponInferred,
        customMessage: result.message,
        usedCombatService: false
      };
      Object.assign(context.sharedData, sharedData);
    }
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    return [context.event('if.event.attacked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: { target: target?.name, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];
  },

  /**
   * Report events after attacking
   * Generates atomic events - one discrete fact per event
   */
  report(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject!.entity!;
    const weaponId = context.sharedData.weaponUsed as string | undefined;
    const weapon = weaponId ? context.world.getEntity(weaponId) : undefined;
    const verb = context.command.parsed.action || 'attack';
    const result = context.sharedData.attackResult as AttackResult;
    const customMessage = context.sharedData.customMessage as string | undefined;
    const usedCombatService = context.sharedData.usedCombatService as boolean | undefined;
    const combatResult = context.sharedData.combatResult as CombatResult | undefined;

    const events: ISemanticEvent[] = [];

    // Check if attack failed (for non-combat attacks)
    if (!result.success && !usedCombatService) {
      return [
        context.event('if.event.attacked', {
          messageId: `${context.action.id}.${customMessage || 'attack_ineffective'}`,
          params: { target: target.name },
          target: target.id,
          targetName: target.name,
          failed: true
        })
      ];
    }

    // Build event data
    const eventData: AttackedEventData = {
      target: target.id,
      targetName: target.name,
      weapon: weapon?.id,
      weaponName: weapon?.name,
      unarmed: !weapon
    };

    const params: Record<string, any> = {
      target: target.name,
      weapon: weapon?.name
    };

    // Create ATTACKED event for world model
    events.push(context.event('if.event.attacked', eventData));

    // Determine message based on result type
    let messageId: string;

    // Use CombatService message IDs for combatant attacks
    if (usedCombatService && combatResult) {
      messageId = combatResult.messageId;
      params.damage = combatResult.damage;
      params.attackerName = context.player.name;
      params.targetName = target.name;

      // Add any extra data from combat result
      if (combatResult.messageData) {
        Object.assign(params, combatResult.messageData);
      }
    } else {
      // Standard attack behavior messages
      switch (result.type) {
        case 'broke':
          messageId = 'target_broke';
          if (result.debrisCreated?.length) {
            params.debris = result.debrisCreated.length;
          }
          break;
        case 'damaged':
          messageId = 'target_damaged';
          params.damage = result.damage;
          params.remaining = result.remainingHitPoints;
          break;
        case 'destroyed':
          messageId = 'target_destroyed';
          if (result.transformedTo) {
            const transformed = context.world.getEntity(result.transformedTo);
            params.transformedTo = transformed?.name;
          }
          if (result.exitRevealed) {
            params.exitRevealed = result.exitRevealed;
          }
          break;
        case 'killed':
          messageId = 'killed_target';
          if (result.itemsDropped?.length) {
            params.itemsDropped = result.itemsDropped.length;
          }
          break;
        case 'knocked_out':
          messageId = CombatMessages.ATTACK_KNOCKED_OUT;
          params.damage = result.damage;
          break;
        case 'missed':
          messageId = CombatMessages.ATTACK_MISSED;
          break;
        case 'hit':
          messageId = weapon ? 'hit_with' : 'hit_target';
          params.damage = result.damage;
          break;
        default:
          messageId = 'attacked';
      }
    }

    // Update the main attacked event with messageId for text rendering
    // The first event in the array is the attacked event - update it
    events[0] = context.event('if.event.attacked', {
      messageId: `${context.action.id}.${customMessage || messageId}`,
      params,
      ...eventData
    });

    // Additional events based on result
    if (result.itemsDropped?.length) {
      for (const itemId of result.itemsDropped) {
        const item = context.world.getEntity(itemId);
        if (item) {
          events.push(context.event('if.event.dropped', {
            item: itemId,
            itemName: item.name,
            dropper: target.id,
            dropperName: target.name
          }));
        }
      }
    }

    if (result.exitRevealed) {
      events.push(context.event('if.event.exit_revealed', {
        direction: result.exitRevealed,
        room: context.world.getLocation(context.player.id)
      }));
    }

    // For killed targets, emit a death event
    if (result.targetKilled) {
      events.push(context.event('if.event.death', {
        target: target.id,
        targetName: target.name,
        killedBy: context.player.id
      }));
    }

    // For knocked out targets, emit a knockout event
    if (result.targetKnockedOut) {
      events.push(context.event('if.event.knocked_out', {
        target: target.id,
        targetName: target.name,
        knockedOutBy: context.player.id
      }));
    }

    return events;
  }
};
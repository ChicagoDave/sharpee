/**
 * Attacking action - hostile action against NPCs or objects
 *
 * This action handles combat or destructive actions.
 * - For NPCs with CombatantTrait: Requires a registered combat interceptor (ADR-118)
 *   - Without interceptor, blocks with "Violence is not the answer."
 * - For objects: Uses AttackBehavior for destruction mechanics
 *
 * Uses four-phase pattern with interceptor support (ADR-118):
 * 1. validate: preValidate hook → standard checks → postValidate hook
 * 2. execute: interceptor handles combat resolution
 * 3. blocked: onBlocked hook (if validation failed)
 * 4. report: standard events → postReport hook (additional effects)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  AttackBehavior,
  IAttackResult,
  CombatantTrait,
  getInterceptorForAction,
  ActionInterceptor,
  InterceptorSharedData,
  createEffect
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { AttackedEventData } from './attacking-events';
import { AttackingSharedData, AttackResult } from './attacking-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { findWieldedWeapon } from '../../../combat';

/**
 * Extended shared data for attacking action with interceptor support.
 */
interface AttackingInternalSharedData extends AttackingSharedData {
  interceptor?: ActionInterceptor;
  interceptorData?: InterceptorSharedData;
}

function getAttackingSharedData(context: ActionContext): AttackingInternalSharedData {
  return context.sharedData as AttackingInternalSharedData;
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
    const sharedData = getAttackingSharedData(context);

    // Must have a target
    if (!target) {
      return { valid: false, error: 'no_target' };
    }

    // Check for interceptor on the target entity (ADR-118)
    const interceptorResult = getInterceptorForAction(target, IFActions.ATTACKING);
    const interceptor = interceptorResult?.interceptor;
    const interceptorData: InterceptorSharedData = {};

    // Store for later phases
    sharedData.interceptor = interceptor;
    sharedData.interceptorData = interceptorData;

    // === PRE-VALIDATE HOOK ===
    // Called before standard validation - can block early (e.g., hero is staggered)
    if (interceptor?.preValidate) {
      const result = interceptor.preValidate(target, context.world, actor.id, interceptorData);
      if (result !== null) {
        return {
          valid: result.valid,
          error: result.error,
          params: result.params
        };
      }
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

    // For combatants, check if target is already dead and if combat system is registered
    if (target.has(TraitType.COMBATANT)) {
      const combatant = target.get(TraitType.COMBATANT) as CombatantTrait | undefined;
      if (combatant && !combatant.isAlive) {
        return { valid: false, error: 'already_dead', params: { target: target.name } };
      }
      // No combat interceptor registered — block with standard IF response
      if (!interceptor) {
        return { valid: false, error: 'violence_not_the_answer', params: { target: target.name } };
      }
    }

    // === POST-VALIDATE HOOK ===
    // Called after standard validation passes
    if (interceptor?.postValidate) {
      const result = interceptor.postValidate(target, context.world, actor.id, interceptorData);
      if (result !== null) {
        return {
          valid: result.valid,
          error: result.error,
          params: result.params
        };
      }
    }

    return { valid: true };
  },

  /**
   * Execute the attack action
   * Assumes validation has already passed - no validation logic here
   * - For combatants: Interceptor handles combat (validate blocks if no interceptor)
   * - For objects: Uses AttackBehavior for destruction mechanics
   */
  execute(context: ActionContext): void {
    // Assume validation has passed - no checks needed
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    // ADR-080: Prefer instrument field (from .instrument() patterns), fall back to indirectObject
    let weapon = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    let weaponInferred = false;
    const sharedData = getAttackingSharedData(context);

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

    // Check if target is a combatant (NPC combat)
    if (target.has(TraitType.COMBATANT)) {
      const interceptor = sharedData.interceptor;
      const interceptorData = sharedData.interceptorData || {};

      // Pass weapon info to interceptor via sharedData
      interceptorData.weaponId = weapon?.id;
      interceptorData.weaponName = weapon?.name;
      interceptorData.weaponInferred = weaponInferred;
      interceptorData.verb = verb;
      interceptorData.targetId = target.id;
      interceptorData.targetName = target.name;

      if (interceptor?.postExecute) {
        // === INTERCEPTOR HANDLES COMBAT ===
        // The interceptor replaces CombatService entirely.
        // It must populate interceptorData with:
        //   - attackResult: AttackResult
        //   - combatResult: CombatResult (optional, for compatibility)
        //   - usedCombatService: false
        //   - customMessage: string (optional)
        interceptor.postExecute(target, context.world, context.player.id, interceptorData);

        // Copy interceptor's result data to sharedData
        const attackResult = interceptorData.attackResult as AttackResult;
        Object.assign(context.sharedData, {
          attackResult: attackResult || {
            success: true,
            type: 'missed',
            damage: 0,
            remainingHitPoints: 0,
            targetDestroyed: false,
          },
          weaponUsed: weapon?.id,
          weaponInferred,
          customMessage: interceptorData.customMessage as string | undefined,
          combatResult: interceptorData.combatResult as unknown,
          usedCombatService: (interceptorData.usedCombatService as boolean | undefined) ?? false,
        } satisfies Partial<AttackingSharedData>);
      } else {
        // Should not reach here — validate blocks if no interceptor.
        // Defensive fallback: treat as missed.
        Object.assign(context.sharedData, {
          attackResult: {
            success: false,
            type: 'missed',
            damage: 0,
            remainingHitPoints: 0,
            targetDestroyed: false,
          } as AttackResult,
          weaponUsed: weapon?.id,
          weaponInferred,
          usedCombatService: false,
        } satisfies AttackingSharedData);
      }
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
      Object.assign(context.sharedData, {
        attackResult,
        weaponUsed: weapon?.id,
        weaponInferred,
        customMessage: result.message,
        usedCombatService: false
      } satisfies AttackingSharedData);
    }
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const sharedData = getAttackingSharedData(context);

    // === ON-BLOCKED HOOK ===
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.onBlocked && target && result.error) {
      const customEffects = interceptor.onBlocked(target, context.world, context.player.id, result.error, interceptorData);
      if (customEffects !== null) {
        return customEffects.map(effect => context.event(effect.type, effect.payload));
      }
    }

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
    const sharedData = getAttackingSharedData(context);

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
      // Standard attack behavior messages (or interceptor-provided customMessage)
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
          messageId = 'combat.attack.knocked_out';
          params.damage = result.damage;
          break;
        case 'missed':
          messageId = 'combat.attack.missed';
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

    // === POST-REPORT HOOK ===
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postReport) {
      const additionalEffects = interceptor.postReport(target, context.world, context.player.id, interceptorData);
      for (const effect of additionalEffects) {
        events.push(context.event(effect.type, effect.payload));
      }
    }

    return events;
  }
};

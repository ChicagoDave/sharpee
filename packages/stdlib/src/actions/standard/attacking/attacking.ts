/**
 * Attacking action - hostile action against NPCs or objects
 * 
 * This action handles combat or destructive actions.
 * It's deliberately simple - games can extend with combat systems.
 * 
 * MIGRATED: To three-phase pattern (validate/execute/report) for atomic events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, AttackBehavior, IAttackResult } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { AttackedEventData } from './attacking-events';
import { AttackingSharedData, AttackResult } from './attacking-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

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
    const weapon = context.command.indirectObject?.entity;
    
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
    
    // Peaceful games might discourage violence
    // This check is left for game-specific implementations via event handlers
    
    return { valid: true };
  },
  
  /**
   * Execute the attack action
   * Assumes validation has already passed - no validation logic here
   * Delegates to AttackBehavior for actual attack logic
   */
  execute(context: ActionContext): void {
    // Assume validation has passed - no checks needed
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    let weapon = context.command.indirectObject?.entity;
    let weaponInferred = false;
    
    // If no weapon specified, try to infer one from inventory for certain verbs
    const verb = context.command.parsed.action || context.command.parsed.structure.verb?.text || 'attack';
    if (!weapon && (verb === 'stab' || verb === 'slash' || verb === 'cut')) {
      const inventory = context.world.getContents(context.player.id);
      weapon = AttackBehavior.inferWeapon(inventory);
      weaponInferred = !!weapon;
    }
    
    // Perform the attack using AttackBehavior
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
    
    // Store result for report phase using typed shared data
    const sharedData: AttackingSharedData = {
      attackResult: attackResult,
      weaponUsed: weapon?.id,
      weaponInferred: weaponInferred,
      customMessage: result.message
    };
    Object.assign(context.sharedData, sharedData);
  },

  /**
   * Report events after attacking
   * Generates atomic events - one discrete fact per event
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          reason: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: validationResult.params || {}
        })
      ];
    }
    
    // Handle execution errors
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'execution_failed',
          messageId: 'action_failed',
          params: {
            error: executionError.message
          }
        })
      ];
    }
    
    const target = context.command.directObject!.entity!;
    const weaponId = context.sharedData.weaponUsed as string | undefined;
    const weapon = weaponId ? context.world.getEntity(weaponId) : undefined;
    const verb = context.command.parsed.action || 'attack';
    const result = context.sharedData.attackResult as AttackResult;
    const customMessage = context.sharedData.customMessage as string | undefined;
    
    const events: ISemanticEvent[] = [];
    
    // Check if attack failed
    if (!result.success) {
      return [
        context.event('action.error', {
          actionId: this.id,
          messageId: customMessage || 'attack_ineffective',
          params: { target: target.name }
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
      case 'hit':
        messageId = weapon ? 'hit_with' : 'hit_target';
        params.damage = result.damage;
        break;
      default:
        messageId = 'attacked';
    }
    
    // Add success message (or use custom message if available)
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: customMessage || messageId,
      params: params
    }));
    
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
    
    return events;
  }
};
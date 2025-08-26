/**
 * Putting action - put objects in containers or on supporters
 * 
 * This action handles putting objects into containers or onto supporters.
 * It determines the appropriate preposition based on the target's traits.
 * 
 * MIGRATED: To three-phase pattern (validate/execute/report) for atomic events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ContainerBehavior, SupporterBehavior, OpenableBehavior, IAddItemResult, IAddItemToSupporterResult } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { IFActions } from '../../constants';
import { buildEventData } from '../../data-builder-types';
import { putDataConfig } from './putting-data';

export const puttingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUTTING,
  requiredMessages: [
    'no_target',
    'no_destination',
    'not_held',
    'not_container',
    'not_surface',
    'container_closed',
    'already_there',
    'put_in',
    'put_on',
    'cant_put_in_itself',
    'cant_put_on_itself',
    'no_room',
    'no_space'
  ],
  group: 'object_manipulation',
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.REACHABLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    const preposition = context.command.parsed.structure.preposition?.text;
    
    // Validate we have an item
    if (!item) {
      return {
        valid: false,
        error: 'no_target'
      };
    }
    
    // Validate we have a destination
    if (!target) {
      return {
        valid: false,
        error: 'no_destination',
        params: { item: item.name }
      };
    }
    
    // Prevent putting something inside/on itself
    if (item.id === target.id) {
      const messageId = preposition === 'on' ? 'cant_put_on_itself' : 'cant_put_in_itself';
      return {
        valid: false,
        error: messageId,
        params: { item: item.name }
      };
    }
    
    // Check if item is already in/on target
    if (context.world.getLocation(item.id) === target.id) {
      const relation = target.has(TraitType.SUPPORTER) ? 'on' : 'in';
      return {
        valid: false,
        error: 'already_there',
        params: { 
          item: item.name,
          relation: relation,
          destination: target.name 
        }
      };
    }
    
    // Determine if target is a container or supporter
    const isContainer = target.has(TraitType.CONTAINER);
    const isSupporter = target.has(TraitType.SUPPORTER);
    
    // Determine the appropriate action based on preposition and target type
    let targetPreposition: 'in' | 'on';
    
    if (preposition) {
      // User specified a preposition
      if ((preposition === 'in' || preposition === 'into' || preposition === 'inside') && isContainer) {
        targetPreposition = 'in';
      } else if ((preposition === 'on' || preposition === 'onto') && isSupporter) {
        targetPreposition = 'on';
      } else {
        // Mismatched preposition
        if (preposition === 'in' || preposition === 'into' || preposition === 'inside') {
          return {
            valid: false,
            error: 'not_container',
            params: { destination: target.name }
          };
        } else {
          return {
            valid: false,
            error: 'not_surface',
            params: { destination: target.name }
          };
        }
      }
    } else {
      // Auto-determine based on target type (prefer container over supporter)
      if (isContainer) {
        targetPreposition = 'in';
      } else if (isSupporter) {
        targetPreposition = 'on';
      } else {
        return {
          valid: false,
          error: 'not_container',
          params: { destination: target.name }
        };
      }
    }
    
    // Container-specific checks using ContainerBehavior
    if (targetPreposition === 'in') {
      // Check if container is open
      if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
        return {
          valid: false,
          error: 'container_closed',
          params: { container: target.name }
        };
      }
      
      // Check capacity using ContainerBehavior
      if (!ContainerBehavior.canAccept(target, item, context.world)) {
        return {
          valid: false,
          error: 'no_room',
          params: { container: target.name }
        };
      }
    }
    
    // Supporter-specific checks using SupporterBehavior
    if (targetPreposition === 'on') {
      if (!SupporterBehavior.canAccept(target, item, context.world)) {
        return {
          valid: false,
          error: 'no_space',
          params: { surface: target.name }
        };
      }
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const target = context.command.indirectObject!.entity!; // Safe because validate ensures it exists
    const preposition = context.command.parsed.structure.preposition?.text;
    
    // Determine the appropriate action based on preposition and target type
    const isContainer = target.has(TraitType.CONTAINER);
    const isSupporter = target.has(TraitType.SUPPORTER);
    let targetPreposition: 'in' | 'on';
    
    if (preposition) {
      // User specified a preposition
      if ((preposition === 'in' || preposition === 'into' || preposition === 'inside') && isContainer) {
        targetPreposition = 'in';
      } else if ((preposition === 'on' || preposition === 'onto') && isSupporter) {
        targetPreposition = 'on';
      } else {
        // This should not happen due to validation, but handle gracefully
        targetPreposition = isContainer ? 'in' : 'on';
      }
    } else {
      // Auto-determine based on target type (prefer container over supporter)
      targetPreposition = isContainer ? 'in' : 'on';
    }
    
    // Store preposition for report phase
    (context as any)._targetPreposition = targetPreposition;
    
    // Delegate to appropriate behavior
    if (targetPreposition === 'in') {
      const result: IAddItemResult = ContainerBehavior.addItem(target, item, context.world);
      (context as any)._putResult = result;
    } else {
      // targetPreposition === 'on'
      const result: IAddItemToSupporterResult = SupporterBehavior.addItem(target, item, context.world);
      (context as any)._putResult = result;
    }
  },

  /**
   * Report events after putting
   * Generates events with complete state snapshots
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      // Capture entity data for validation errors
      const errorParams = { ...(validationResult.params || {}) };
      
      // Add entity snapshots if entities are available
      if (context.command.directObject?.entity) {
        errorParams.targetSnapshot = captureEntitySnapshot(
          context.command.directObject.entity,
          context.world,
          false
        );
      }
      if (context.command.indirectObject?.entity) {
        errorParams.indirectTargetSnapshot = captureEntitySnapshot(
          context.command.indirectObject.entity,
          context.world,
          false
        );
      }

      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          reason: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: errorParams
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
    
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    const target = context.command.indirectObject!.entity!;
    const targetPreposition = (context as any)._targetPreposition as 'in' | 'on';
    const result = (context as any)._putResult as IAddItemResult | IAddItemToSupporterResult;
    
    const events: ISemanticEvent[] = [];
    
    if (targetPreposition === 'in') {
      const containerResult = result as IAddItemResult;
      
      if (!containerResult.success) {
        // Handle failure cases - these should not happen due to validation
        if (containerResult.alreadyContains) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'already_there',
            params: { item: item.name, relation: 'in', destination: target.name }
          })];
        }
        if (containerResult.containerFull) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'no_room',
            params: { container: target.name }
          })];
        }
        // Generic failure
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'cant_put',
          params: { item: item.name }
        })];
      }
      
      // Success - create events with snapshots
      events.push(context.event('if.event.put_in', {
        itemId: item.id,
        targetId: target.id,
        preposition: 'in' as const,
        // Add atomic event snapshots
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }));
      
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'put_in',
        params: { item: item.name, container: target.name }
      }));
      
    } else {
      // targetPreposition === 'on'
      const supporterResult = result as IAddItemToSupporterResult;
      
      if (!supporterResult.success) {
        // Handle failure cases - these should not happen due to validation
        if (supporterResult.alreadyThere) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'already_there',
            params: { item: item.name, relation: 'on', destination: target.name }
          })];
        }
        if (supporterResult.noSpace) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'no_space',
            params: { surface: target.name }
          })];
        }
        // Generic failure
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'cant_put',
          params: { item: item.name }
        })];
      }
      
      // Success - create events with snapshots
      events.push(context.event('if.event.put_on', {
        itemId: item.id,
        targetId: target.id,
        preposition: 'on' as const,
        // Add atomic event snapshots
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }));
      
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'put_on',
        params: { item: item.name, surface: target.name }
      }));
    }
    
    return events;
  }
};

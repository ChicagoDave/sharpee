/**
 * Removing action - remove objects from containers or surfaces
 * 
 * This action handles taking objects from containers or supporters.
 * It's essentially a targeted form of taking.
 * 
 * MIGRATED: To three-phase pattern (validate/execute/report) for atomic events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { 
  TraitType,
  OpenableBehavior,
  ContainerBehavior,
  SupporterBehavior,
  ActorBehavior,
  IRemoveItemResult,
  IRemoveItemFromSupporterResult,
  ITakeItemResult
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { buildEventData } from '../../data-builder-types';
import { removedDataConfig } from './removing-data';
import { ScopeLevel } from '../../../scope';
import { RemovingEventMap } from './removing-events';
import { remove, IRemoveResult } from './sub-actions/remove';

export const removingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.REMOVING,
  requiredMessages: [
    'no_target',
    'no_source',
    'not_in_container',
    'not_on_surface',
    'container_closed',
    'removed_from',
    'removed_from_surface',
    'cant_reach',
    'already_have'
  ],
  group: 'object_manipulation',
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const source = context.command.indirectObject?.entity;
    
    // Validate we have an item
    if (!item) {
      return { 
        valid: false, 
        error: 'no_target',
        params: {}
      };
    }
    
    // Validate we have a source
    if (!source) {
      return { 
        valid: false, 
        error: 'no_source',
        params: { item: item.name }
      };
    }
    
    // Check if player already has the item
    if (ActorBehavior.isHolding(actor, item.id, context.world)) {
      return { 
        valid: false, 
        error: 'already_have',
        params: { item: item.name }
      };
    }
    
    // Check if the item is actually in/on the source
    const itemLocation = context.world.getLocation(item.id);
    if (!itemLocation || itemLocation !== source.id) {
      if (source.has(TraitType.CONTAINER)) {
        return { 
          valid: false, 
          error: 'not_in_container',
          params: { 
            item: item.name, 
            container: source.name 
          }
        };
      } else if (source.has(TraitType.SUPPORTER)) {
        return { 
          valid: false, 
          error: 'not_on_surface',
          params: { 
            item: item.name, 
            surface: source.name 
          }
        };
      } else {
        return { 
          valid: false, 
          error: 'not_in_container',
          params: { 
            item: item.name, 
            container: source.name 
          }
        };
      }
    }
    
    // Container-specific checks using behavior
    if (source.has(TraitType.CONTAINER)) {
      // Check if container is open
      if (source.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(source)) {
        return { 
          valid: false, 
          error: 'container_closed',
          params: { container: source.name }
        };
      }
    }
    
    // Use ActorBehavior to validate taking capacity
    if (!ActorBehavior.canTakeItem(actor, item, context.world)) {
      return {
        valid: false,
        error: 'cannot_take',
        params: { item: item.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject?.entity!;
    const source = context.command.indirectObject?.entity!;
    
    // Use sub-action to perform the actual state mutation
    const removeSubResult: IRemoveResult = remove(item, source, actor, context.world);
    (context as any)._removeSubResult = removeSubResult;
    
    // Also use behaviors for compatibility with existing event system
    // First remove from source using appropriate behavior
    let removeResult: IRemoveItemResult | IRemoveItemFromSupporterResult | null = null;
    
    if (source.has(TraitType.CONTAINER)) {
      removeResult = ContainerBehavior.removeItem(source, item, context.world);
    } else if (source.has(TraitType.SUPPORTER)) {
      removeResult = SupporterBehavior.removeItem(source, item, context.world);
    }
    
    // Store result for report phase
    (context as any)._removeResult = removeResult;
    
    // Then take the item using ActorBehavior
    const takeResult: ITakeItemResult = ActorBehavior.takeItem(actor, item, context.world);
    
    // Store result for report phase
    (context as any)._takeResult = takeResult;
  },

  /**
   * Report events after removing
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
    const item = context.command.directObject?.entity!;
    const source = context.command.indirectObject?.entity!;
    const removeResult = (context as any)._removeResult as IRemoveItemResult | IRemoveItemFromSupporterResult | null;
    const takeResult = (context as any)._takeResult as ITakeItemResult;
    
    const events: ISemanticEvent[] = [];
    
    // Check remove result
    if (removeResult && !removeResult.success) {
      if (source.has(TraitType.CONTAINER)) {
        const containerResult = removeResult as IRemoveItemResult;
        if (containerResult.notContained) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'not_in_container',
            params: { item: item.name, container: source.name }
          })];
        }
      } else if (source.has(TraitType.SUPPORTER)) {
        const supporterResult = removeResult as IRemoveItemFromSupporterResult;
        if (supporterResult.notThere) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'not_on_surface',
            params: { item: item.name, surface: source.name }
          })];
        }
      }
      // Generic failure
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_remove',
        params: { item: item.name }
      })];
    }
    
    // Check take result
    if (!takeResult.success) {
      if (takeResult.tooHeavy) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'too_heavy',
          params: { item: item.name }
        })];
      }
      if (takeResult.inventoryFull) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'container_full'
        })];
      }
      // Generic failure
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_take',
        params: { item: item.name }
      })];
    }
    
    // Build message params and determine message
    const params: Record<string, any> = {
      item: item.name
    };
    
    let messageId: string;
    if (source.has(TraitType.CONTAINER)) {
      params.container = source.name;
      messageId = 'removed_from';
    } else {
      params.surface = source.name;
      messageId = 'removed_from_surface';
    }
    
    // Create the TAKEN event (same as taking action) for world model updates with snapshots
    const takenData: RemovingEventMap['if.event.taken'] = {
      item: item.name,
      fromLocation: source.id,
      container: source.name,
      fromContainer: source.has(TraitType.CONTAINER),
      fromSupporter: source.has(TraitType.SUPPORTER) && !source.has(TraitType.CONTAINER),
      // Add atomic event snapshots
      itemSnapshot: captureEntitySnapshot(item, context.world, true),
      actorSnapshot: captureEntitySnapshot(actor, context.world, false),
      sourceSnapshot: captureEntitySnapshot(source, context.world, source.has(TraitType.ROOM))
    } as RemovingEventMap['if.event.taken'] & { itemSnapshot?: any; actorSnapshot?: any; sourceSnapshot?: any };
    
    events.push(context.event('if.event.taken', takenData));
    
    // Create success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: params
      }));
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.REACHABLE
  }
};

/**
 * Removing action - remove objects from containers or surfaces
 * 
 * This action handles taking objects from containers or supporters.
 * It's essentially a targeted form of taking.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { 
  TraitType,
  OpenableBehavior,
  ContainerBehavior,
  SupporterBehavior,
  ActorBehavior,
  RemoveItemResult,
  RemoveItemFromSupporterResult,
  TakeItemResult
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { RemovingEventMap } from './removing-events';

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
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity!;
    const source = context.command.indirectObject?.entity!;
    
    const events: SemanticEvent[] = [];
    
    // First remove from source using appropriate behavior
    if (source.has(TraitType.CONTAINER)) {
      const removeResult: RemoveItemResult = ContainerBehavior.removeItem(source, item, context.world);
      if (!removeResult.success) {
        if (removeResult.notContained) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'not_in_container',
            params: { item: item.name, container: source.name }
          })];
        }
        // Generic failure
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'cant_remove',
          params: { item: item.name }
        })];
      }
    } else if (source.has(TraitType.SUPPORTER)) {
      const removeResult: RemoveItemFromSupporterResult = SupporterBehavior.removeItem(source, item, context.world);
      if (!removeResult.success) {
        if (removeResult.notThere) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'not_on_surface',
            params: { item: item.name, surface: source.name }
          })];
        }
        // Generic failure
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'cant_remove',
          params: { item: item.name }
        })];
      }
    }
    
    // Then take the item using ActorBehavior
    const takeResult: TakeItemResult = ActorBehavior.takeItem(actor, item, context.world);
    
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
    
    // Create the TAKEN event (same as taking action) for world model updates
    const takenData: RemovingEventMap['if.event.taken'] = {
      item: item.name,
      fromLocation: source.id,
      container: source.name,
      fromContainer: source.has(TraitType.CONTAINER),
      fromSupporter: source.has(TraitType.SUPPORTER) && !source.has(TraitType.CONTAINER)
    };
    
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

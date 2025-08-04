/**
 * Removing action - remove objects from containers or surfaces
 * 
 * This action handles taking objects from containers or supporters.
 * It's essentially a targeted form of taking.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
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
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const source = context.command.indirectObject?.entity;
    
    // Validate we have an item
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Validate we have a source
    if (!source) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_source',
        reason: 'no_source',
        params: { item: item.name }
      })];
    }
    
    // Scope checks handled by framework due to directObjectScope: REACHABLE
    
    const itemLocation = context.world.getLocation(item.id);
    
    // Check if player already has the item
    if (itemLocation === actor.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_have',
        reason: 'already_have',
        params: { item: item.name }
      })];
    }
    
    // Check if the item is actually in/on the source
    if (!itemLocation || itemLocation !== source.id) {
      if (source.has(TraitType.CONTAINER)) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_in_container',
        reason: 'not_in_container',
        params: { 
            item: item.name, 
            container: source.name 
          }
      })];
      } else if (source.has(TraitType.SUPPORTER)) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_on_surface',
        reason: 'not_on_surface',
        params: { 
            item: item.name, 
            surface: source.name 
          }
      })];
      } else {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_in_container',
        reason: 'not_in_container',
        params: { 
            item: item.name, 
            container: source.name 
          }
      })];
      }
    }
    
    // Container-specific checks
    if (source.has(TraitType.CONTAINER)) {
      // Check if container is open
      if (source.has(TraitType.OPENABLE)) {
        const openableTrait = source.get(TraitType.OPENABLE);
        if (openableTrait && !(openableTrait as any).isOpen) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'container_closed',
            reason: 'container_closed',
            params: { container: source.name }
          })];
        }
      }
    }
    
    // Build message params
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
    
    const events: SemanticEvent[] = [];
    
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

/**
 * Searching action - search objects or locations for hidden items
 * 
 * This action allows players to search containers, supporters, or locations
 * to find concealed items or discover additional details.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, IdentityTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { SearchedEventData } from './searching-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const searchingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SEARCHING,
  requiredMessages: [
    'not_visible',
    'not_reachable',
    'container_closed',
    'nothing_special',
    'found_items',
    'empty_container',
    'container_contents',
    'supporter_contents',
    'searched_location',
    'searched_object',
    'found_concealed'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    
    // If no target, search the current location
    const searchTarget = target || context.currentLocation;
    
    // Scope validation is now handled by CommandValidator
    
    // Check if it's a container that needs to be open
    if (searchTarget.has(TraitType.CONTAINER) && searchTarget.has(TraitType.OPENABLE)) {
      const openableTrait = searchTarget.get(TraitType.OPENABLE) as { isOpen?: boolean };
      if (!openableTrait.isOpen) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'container_closed',
        reason: 'container_closed',
        params: { target: searchTarget.name }
      })];
      }
    }
    
    // Find concealed items
    const contents = context.world.getContents(searchTarget.id);
    const concealedItems = contents.filter(item => {
      if (item.has(TraitType.IDENTITY)) {
        const identity = item.get(TraitType.IDENTITY) as IdentityTrait;
        return identity.concealed;
      }
      return false;
    });
    
    // Build event data
    const eventData: SearchedEventData = {
      target: searchTarget.id,
      targetName: searchTarget.name,
      foundItems: concealedItems.map(item => item.id),
      foundItemNames: concealedItems.map(item => item.name)
    };
    
    // Add location context if searching current location
    if (!target) {
      eventData.searchingLocation = true;
    }
    
    // Create SEARCHED event for world model
    const events: SemanticEvent[] = [];
    events.push(context.event('if.event.searched', eventData));
    
    // Determine appropriate message
    let messageId: string;
    const params: Record<string, any> = {
      target: searchTarget.name
    };
    
    if (concealedItems.length > 0) {
      // Found concealed items
      params.items = concealedItems.map(item => item.name).join(', ');
      params.where = searchTarget.has(TraitType.CONTAINER) ? 'inside' : 
                           searchTarget.has(TraitType.SUPPORTER) ? 'on' : 'here';
      messageId = 'found_concealed';
    } else if (searchTarget.has(TraitType.CONTAINER)) {
      // Container specific messages
      if (contents.length === 0) {
        messageId = 'empty_container';
      } else {
        params.items = contents.map(item => item.name).join(', ');
        messageId = 'container_contents';
      }
    } else if (searchTarget.has(TraitType.SUPPORTER)) {
      // Supporter specific messages
      if (contents.length > 0) {
        params.items = contents.map(item => item.name).join(', ');
        messageId = 'supporter_contents';
      } else {
        messageId = 'nothing_special';
      }
    } else if (!target) {
      // Searching the location
      messageId = 'searched_location';
    } else {
      // Searching a regular object
      if (concealedItems.length > 0) {
        // Found concealed items in regular object
        params.items = concealedItems.map(item => item.name).join(', ');
        params.where = 'here';
        messageId = 'found_concealed';
      } else {
        messageId = contents.length > 0 ? 'searched_object' : 'nothing_special';
      }
    }
    
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "sensory"
};

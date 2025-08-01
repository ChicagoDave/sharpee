/**
 * Opening action - opens containers and doors
 * 
 * This action validates conditions for opening something and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent, EntityId } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { OpenedEventData } from './opening-events';

export const openingAction: Action = {
  id: IFActions.OPENING,
  requiredMessages: [
    'no_target',
    'not_openable',
    'already_open',
    'locked',
    'opened',
    'revealing',
    'its_empty',
    'cant_reach'
  ],
  group: 'container_manipulation',
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Check if it's openable
    if (!noun.has(TraitType.OPENABLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_openable',
        reason: 'not_openable',
        params: { item: noun.name }
      })];
    }
    
    const openableTrait = noun.get(TraitType.OPENABLE);
    
    // Check if already open
    if (openableTrait && (openableTrait as any).isOpen) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_open',
        reason: 'already_open',
        params: { item: noun.name }
      })];
    }
    
    // Check if locked
    if (noun.has(TraitType.LOCKABLE)) {
      const lockableTrait = noun.get(TraitType.LOCKABLE);
      if (lockableTrait && (lockableTrait as any).isLocked) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'locked',
        reason: 'locked',
        params: { item: noun.name }
      })];
      }
    }
    
    // Gather information about what we're opening
    const isContainer = noun.has(TraitType.CONTAINER);
    const isDoor = noun.has(TraitType.DOOR);
    const isSupporter = noun.has(TraitType.SUPPORTER);
    const contents = isContainer ? context.world.getContents(noun.id) : [];
    
    // Build the event data
    const eventData: OpenedEventData = {
      targetId: noun.id,
      targetName: noun.name,
      containerId: noun.id,
      containerName: noun.name,
      isContainer,
      isDoor,
      isSupporter,
      hasContents: contents.length > 0,
      contentsCount: contents.length,
      contentsIds: contents.map(e => e.id),
      revealedItems: contents.length
    };
    
    // Determine success message based on what was revealed
    let messageId = 'opened';
    const params: Record<string, any> = {
      item: noun.name
    };
    
    if (isContainer && contents.length > 0) {
      messageId = 'revealing';
      params.container = noun.name;
      params.items = contents.map(e => e.name);
    } else if (isContainer && contents.length === 0) {
      messageId = 'its_empty';
      params.container = noun.name;
    }
    
    // Create the OPENED event and success message
    return [
      context.event('if.event.opened', eventData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: params
      })
    ];
  }
};

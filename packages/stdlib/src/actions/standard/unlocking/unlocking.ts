/**
 * Unlocking action - unlocks containers and doors
 * 
 * This action validates conditions for unlocking something and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent, EntityId } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { UnlockedEventData } from './unlocking-events';

export const unlockingAction: Action = {
  id: IFActions.UNLOCKING,
  requiredMessages: [
    'no_target',
    'not_lockable',
    'no_key',
    'wrong_key',
    'already_unlocked',
    'unlocked',
    'unlocked_with',
    'cant_reach',
    'key_not_held',
    'still_locked'
  ],
  group: 'lock_manipulation',
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    const withKey = context.command.indirectObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Check if it's lockable
    if (!noun.has(TraitType.LOCKABLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_lockable',
        reason: 'not_lockable',
        params: { item: noun.name }
      })];
    }
    
    const lockableTrait = noun.get(TraitType.LOCKABLE);
    const lockableData = lockableTrait as any;
    
    // Check if already unlocked
    if (!lockableData.isLocked) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_unlocked',
        reason: 'already_unlocked',
        params: { item: noun.name }
      })];
    }
    
    // Check key requirements
    const requiresKey = !!(lockableData.keyId || lockableData.keyIds);
    
    if (requiresKey) {
      // No key specified
      if (!withKey) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_key',
        reason: 'no_key'
      })];
      }
      
      // Check if player has the key
      const keyLocation = context.world.getLocation(withKey.id);
      if (keyLocation !== actor.id) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'key_not_held',
        reason: 'key_not_held',
        params: { key: withKey.name }
      })];
      }
      
      // Check if it's the right key
      let isValidKey = false;
      
      if (lockableData.keyId && withKey.id === lockableData.keyId) {
        isValidKey = true;
      } else if (lockableData.keyIds && lockableData.keyIds.includes(withKey.id)) {
        isValidKey = true;
      }
      
      if (!isValidKey) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'wrong_key',
        reason: 'wrong_key',
        params: { 
            key: withKey.name, 
            item: noun.name 
          }
      })];
      }
    }
    
    // Gather information about what we're unlocking
    const isContainer = noun.has(TraitType.CONTAINER);
    const isDoor = noun.has(TraitType.DOOR);
    const contents = isContainer ? context.world.getContents(noun.id) : [];
    
    // Check for auto-open behavior
    let willAutoOpen = false;
    if (noun.has(TraitType.OPENABLE)) {
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      willAutoOpen = openableTrait.autoOpenOnUnlock || false;
    }
    
    // Build the event data
    const eventData: UnlockedEventData = {
      targetId: noun.id,
      targetName: noun.name,
      containerId: noun.id,
      containerName: noun.name,
      isContainer,
      isDoor,
      requiresKey,
      hasContents: contents.length > 0,
      contentsCount: contents.length,
      contentsIds: contents.map(e => e.id),
      sound: lockableData.unlockSound,
      willAutoOpen
    };
    
    // Add key information if used
    if (withKey) {
      eventData.keyId = withKey.id;
      eventData.keyName = withKey.name;
    }
    
    // Determine message
    const messageId = withKey ? 'unlocked_with' : 'unlocked';
    const params: Record<string, any> = {
      item: noun.name
    };
    if (withKey) {
      params.key = withKey.name;
    }
    
    // Create the UNLOCKED event and success message
    return [
      context.event('if.event.unlocked', eventData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: params
      })
    ];
  }
};

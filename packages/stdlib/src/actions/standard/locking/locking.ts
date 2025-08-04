/**
 * Locking action - locks containers and doors
 * 
 * This action validates conditions for locking something and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { LockedEventData } from './locking-events';

export const lockingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.LOCKING,
  requiredMessages: [
    'no_target',
    'not_lockable',
    'no_key',
    'wrong_key',
    'already_locked',
    'not_closed',
    'locked',
    'locked_with',
    'cant_reach',
    'key_not_held'
  ],
  group: 'lock_manipulation',
  
  execute(context: ActionContext): SemanticEvent[] {
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
    
    // Scope checks handled by framework due to directObjectScope: REACHABLE
    
    // Check if already locked
    if (lockableData.isLocked) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_locked',
        reason: 'already_locked',
        params: { item: noun.name }
      })];
    }
    
    // Check if it's open (can't lock open things)
    if (noun.has(TraitType.OPENABLE)) {
      const openableTrait = noun.get(TraitType.OPENABLE);
      if (openableTrait && (openableTrait as any).isOpen) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_closed',
        reason: 'not_closed',
        params: { item: noun.name }
      })];
      }
    }
    
    // Check key requirements
    const requiresKey = lockableData.keyId || lockableData.keyIds;
    
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
    
    // Build the event data
    const eventData: LockedEventData = {
      targetId: noun.id,
      targetName: noun.name
    };
    
    // Add type information
    if (noun.has(TraitType.CONTAINER)) {
      eventData.isContainer = true;
    }
    
    if (noun.has(TraitType.DOOR)) {
      eventData.isDoor = true;
    }
    
    // Add key information
    if (withKey) {
      eventData.keyId = withKey.id;
      eventData.keyName = withKey.name;
    }
    
    // Add sound information
    if (lockableData.lockSound) {
      eventData.sound = lockableData.lockSound;
    }
    
    // Determine success message
    let messageId = 'locked';
    const params: Record<string, any> = {
      item: noun.name
    };
    
    // Add container/door info
    if (noun.has(TraitType.CONTAINER)) {
      params.isContainer = true;
    }
    if (noun.has(TraitType.DOOR)) {
      params.isDoor = true;
    }
    
    if (withKey) {
      messageId = 'locked_with';
      params.key = withKey.name;
    }
    
    // Create the LOCKED event and success message
    return [
      context.event('if.event.locked', eventData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: params
      })
    ];
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};

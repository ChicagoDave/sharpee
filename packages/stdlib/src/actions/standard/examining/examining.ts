/**
 * Examining action - looks at objects in detail
 * 
 * This is a read-only action that provides detailed information about objects.
 * It validates visibility but doesn't change state.
 * 
 * UPDATED: Uses new simplified context.event() method (ADR-041)
 * MIGRATED: To new folder structure with typed events (ADR-042)
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants';

// Import our typed event data
import { ExaminedEventData, ExaminingErrorData } from './examining-events';

export const examiningAction: Action = {
  id: IFActions.EXAMINING,
  requiredMessages: [
    'no_target',
    'not_visible',
    'examined',
    'examined_self',
    'examined_container',
    'examined_supporter',
    'examined_readable',
    'examined_switchable',
    'examined_wearable',
    'examined_door',
    'nothing_special',
    'description',
    'brief_description'
  ],
  
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
    
    // Check if visible
    if (!context.canSee(noun)) {
      // Special case: examining yourself always works
      if (noun.id === actor.id) {
        const selfData: ExaminedEventData = {
          targetId: noun.id,
          targetName: 'yourself',  // Always use 'yourself' for self-examination
          self: true
        };
        
        return [
          context.event('if.event.examined', selfData),
          context.event('action.success', {
        actionId: context.action.id,
        messageId: 'examined_self',
        params: {}
      })
        ];
      }
      
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_visible',
        reason: 'not_visible',
        params: { target: noun.name }
      })];
    }
    
    // Check if examining self
    if (noun.id === actor.id) {
      const selfData: ExaminedEventData = {
        targetId: noun.id,
        targetName: 'yourself',  // Always use 'yourself' for self-examination
        self: true
      };
      
      return [
        context.event('if.event.examined', selfData),
        context.event('action.success', {
          actionId: context.action.id,
          messageId: 'examined_self',
          params: {}
        })
      ];
    }
    
    // Build typed examination event data
    const eventData: ExaminedEventData = {
      targetId: noun.id,
      targetName: noun.name
    };
    
    const params: Record<string, any> = {};
    
    let messageId = 'examined';
    
    // Add trait information for text generation
    if (noun.has(TraitType.IDENTITY)) {
      const identityTrait = noun.get(TraitType.IDENTITY);
      if (identityTrait) {
        eventData.hasDescription = !!(identityTrait as any).description;
        eventData.hasBrief = !!(identityTrait as any).brief;
        
        if ((identityTrait as any).description) {
          params.description = (identityTrait as any).description;
        }
      }
    }
    
    // Container information
    if (noun.has(TraitType.CONTAINER)) {
      const contents = context.world.getContents(noun.id);
      eventData.isContainer = true;
      eventData.hasContents = contents.length > 0;
      eventData.contentCount = contents.length;
      eventData.contents = contents.map(e => ({ id: e.id, name: e.name }));
      
      // Check if open/closed
      if (noun.has(TraitType.OPENABLE)) {
        const openableTrait = noun.get(TraitType.OPENABLE);
        eventData.isOpenable = true;
        eventData.isOpen = openableTrait ? (openableTrait as any).isOpen : true;
      } else {
        eventData.isOpen = true; // Containers without openable trait are always open
      }
      
      messageId = 'examined_container';
    }
    
    // Supporter information
    if (noun.has(TraitType.SUPPORTER)) {
      const contents = context.world.getContents(noun.id);
      eventData.isSupporter = true;
      eventData.hasContents = contents.length > 0;
      eventData.contentCount = contents.length;
      eventData.contents = contents.map(e => ({ id: e.id, name: e.name }));
      
      if (!eventData.isContainer) { // Don't override container message
        messageId = 'examined_supporter';
      }
    }
    
    // Device information
    if (noun.has(TraitType.SWITCHABLE)) {
      const switchableTrait = noun.get(TraitType.SWITCHABLE);
      eventData.isSwitchable = true;
      eventData.isOn = switchableTrait ? (switchableTrait as any).isOn : false;
      
      if (messageId === 'examined') { // Only set if not already specialized
        messageId = 'examined_switchable';
      }
    }
    
    // Readable information
    if (noun.has(TraitType.READABLE)) {
      const readableTrait = noun.get(TraitType.READABLE);
      eventData.isReadable = true;
      eventData.hasText = readableTrait ? !!(readableTrait as any).text : false;
      
      if (eventData.hasText) {
        params.text = (readableTrait as any).text;
        messageId = 'examined_readable';
      }
    }
    
    // Wearable information
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      eventData.isWearable = true;
      eventData.isWorn = wearableTrait ? (wearableTrait as any).worn : false;
      
      if (messageId === 'examined') {
        messageId = 'examined_wearable';
      }
    }
    
    // Door information
    if (noun.has(TraitType.DOOR)) {
      eventData.isDoor = true;
      messageId = 'examined_door';
      
      // Check if door is openable
      if (noun.has(TraitType.OPENABLE)) {
        const openableTrait = noun.get(TraitType.OPENABLE);
        eventData.isOpenable = true;
        eventData.isOpen = openableTrait ? (openableTrait as any).isOpen : true;
      }
      
      // Add lock status if lockable
      if (noun.has(TraitType.LOCKABLE)) {
        const lockableTrait = noun.get(TraitType.LOCKABLE);
        eventData.isLockable = true;
        eventData.isLocked = lockableTrait ? (lockableTrait as any).isLocked : false;
        params.isLocked = eventData.isLocked;
      }
    }
    
    // Build params based on the selected message type
    if (messageId === 'examined') {
      params.target = noun.name;
    } else if (messageId === 'examined_container') {
      params.isOpen = eventData.isOpen;
    } else if (messageId === 'examined_supporter') {
      // No special params for supporter
    } else if (messageId === 'examined_switchable') {
      params.isOn = eventData.isOn;
    } else if (messageId === 'examined_wearable') {
      params.isWorn = eventData.isWorn;
    } else if (messageId === 'examined_door') {
      if (eventData.isLocked !== undefined) {
        params.isLocked = eventData.isLocked;
      }
    }
    
    // Return both the domain event and success message
    return [
      context.event('if.event.examined', eventData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: params
      })
    ];
  },
  
  group: "observation"
};

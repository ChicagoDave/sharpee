/**
 * Examining action - looks at objects in detail
 * 
 * This is a read-only action that provides detailed information about objects.
 * It validates visibility but doesn't change state.
 */

import { Action, EnhancedActionContext } from '../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../constants';

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
      return context.emitError('no_target');
    }
    
    // Check if visible
    if (!context.canSee(noun)) {
      // Special case: examining yourself always works
      if (noun.id === actor.id) {
        return [
          context.emit('if.event.examined', { self: true }),
          ...context.emitSuccess('examined_self')
        ];
      }
      
      return context.emitError('not_visible', { target: noun.name });
    }
    
    // Build examination event data
    const eventData: Record<string, unknown> = {
      targetId: noun.id,
      targetName: noun.name
    };
    
    const messageParams: Record<string, any> = {
      target: noun.name
    };
    
    let messageId = 'examined';
    
    // Add trait information for text generation
    if (noun.has(TraitType.IDENTITY)) {
      const identityTrait = noun.get(TraitType.IDENTITY);
      if (identityTrait) {
        eventData.hasDescription = !!(identityTrait as any).description;
        eventData.hasBrief = !!(identityTrait as any).brief;
        
        if ((identityTrait as any).description) {
          messageParams.description = (identityTrait as any).description;
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
        messageParams.isOpen = eventData.isOpen;
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
      messageParams.isOn = eventData.isOn;
      
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
        messageParams.text = (readableTrait as any).text;
        messageId = 'examined_readable';
      }
    }
    
    // Wearable information
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      eventData.isWearable = true;
      eventData.isWorn = wearableTrait ? (wearableTrait as any).worn : false;
      messageParams.isWorn = eventData.isWorn;
      
      if (messageId === 'examined') {
        messageId = 'examined_wearable';
      }
    }
    
    // Door information
    if (noun.has(TraitType.DOOR)) {
      eventData.isDoor = true;
      messageId = 'examined_door';
      
      // Add lock status if lockable
      if (noun.has(TraitType.LOCKABLE)) {
        const lockableTrait = noun.get(TraitType.LOCKABLE);
        eventData.isLockable = true;
        eventData.isLocked = lockableTrait ? (lockableTrait as any).isLocked : false;
        messageParams.isLocked = eventData.isLocked;
      }
    }
    
    // Create the EXAMINED event
    const events: SemanticEvent[] = [];
    
    events.push(context.emit('if.event.examined', eventData));
    events.push(...context.emitSuccess(messageId, messageParams));
    
    return events;
  },
  
  group: "observation"
};

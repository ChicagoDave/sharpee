/**
 * Examining action - looks at objects in detail
 * 
 * This is a read-only action that provides detailed information about objects.
 * It validates visibility but doesn't change state.
 */

import { ActionExecutor, ActionContext, createEvent, SemanticEvent, ValidatedCommand } from '../core';
import { IFActions } from '../core/constants';
import { IFEvents, TraitType, IFEntity } from '@sharpee/world-model';

export const examiningAction: ActionExecutor = {
  id: IFActions.EXAMINING,
  aliases: ['examine', 'x', 'look at', 'inspect'],
  
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = command.directObject?.entity as IFEntity | undefined;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.EXAMINING,
        reason: 'no_target'
      }, {
        actor: actor.id
      })];
    }
    
    // Check if visible
    if (!context.canSee(noun)) {
      // Special case: examining yourself always works
      if (noun.id === actor.id) {
        return [createEvent(IFEvents.EXAMINED, {
          self: true
        }, {
          actor: actor.id,
          target: noun.id
        })];
      }
      
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.EXAMINING,
        reason: 'not_visible'
      }, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    // Build examination event data
    const eventData: Record<string, unknown> = {};
    
    // Add trait information for text generation
    if (noun.has(TraitType.IDENTITY)) {
      const identityTrait = noun.get(TraitType.IDENTITY);
      if (identityTrait) {
        eventData.hasDescription = !!(identityTrait as any).description;
      }
    }
    
    // Container information
    if (noun.has(TraitType.CONTAINER)) {
      const contents = context.world.getContents(noun.id);
      eventData.isContainer = true;
      eventData.hasContents = contents.length > 0;
      eventData.contentCount = contents.length;
      
      // Check if open/closed
      if (noun.has(TraitType.OPENABLE)) {
        const openableTrait = noun.get(TraitType.OPENABLE);
        eventData.isOpenable = true;
        eventData.isOpen = openableTrait ? (openableTrait as any).isOpen : true;
      } else {
        eventData.isOpen = true; // Containers without openable trait are always open
      }
    }
    
    // Supporter information
    if (noun.has(TraitType.SUPPORTER)) {
      const contents = context.world.getContents(noun.id);
      eventData.isSupporter = true;
      eventData.hasContents = contents.length > 0;
      eventData.contentCount = contents.length;
    }
    
    // Device information
    if (noun.has(TraitType.SWITCHABLE)) {
      const switchableTrait = noun.get(TraitType.SWITCHABLE);
      eventData.isSwitchable = true;
      eventData.isOn = switchableTrait ? (switchableTrait as any).isOn : false;
    }
    
    // Readable information
    if (noun.has(TraitType.READABLE)) {
      const readableTrait = noun.get(TraitType.READABLE);
      eventData.isReadable = true;
      eventData.hasText = readableTrait ? !!(readableTrait as any).text : false;
    }
    
    // Wearable information
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      eventData.isWearable = true;
      eventData.isWorn = wearableTrait ? (wearableTrait as any).worn : false;
    }
    
    // Lock information
    if (noun.has(TraitType.LOCKABLE)) {
      const lockableTrait = noun.get(TraitType.LOCKABLE);
      eventData.isLockable = true;
      eventData.isLocked = lockableTrait ? (lockableTrait as any).isLocked : false;
    }
    
    // Create the EXAMINED event
    return [createEvent(IFEvents.EXAMINED, eventData, {
      actor: actor.id,
      target: noun.id
    })];
  }
};

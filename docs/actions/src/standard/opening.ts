/**
 * Opening action - opens containers and doors
 * 
 * This action validates conditions for opening something and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { ActionExecutor, ActionContext, createEvent, SemanticEvent, ValidatedCommand } from '../core';
import { IFActions } from '../core/constants';
import { IFEvents, TraitType, IFEntity } from '@sharpee/world-model';

export const openingAction: ActionExecutor = {
  id: IFActions.OPENING,
  aliases: ['open'],
  
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = command.directObject?.entity as IFEntity | undefined;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.OPENING,
        reason: 'no_target'
      }, {
        actor: actor.id
      })];
    }
    
    // Check if visible
    if (!context.canSee(noun)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.OPENING,
        reason: 'not_visible'
      }, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    // Check if reachable
    if (!context.canReach(noun)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.OPENING,
        reason: 'not_reachable'
      }, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    // Check if it's openable
    if (!noun.has(TraitType.OPENABLE)) {
      return [createEvent(IFEvents.NOT_OPENABLE, {}, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    const openableTrait = noun.get(TraitType.OPENABLE);
    
    // Check if already open
    if (openableTrait && (openableTrait as any).isOpen) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.OPENING,
        reason: 'already_open'
      }, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    // Check if locked
    if (noun.has(TraitType.LOCKABLE)) {
      const lockableTrait = noun.get(TraitType.LOCKABLE);
      if (lockableTrait && (lockableTrait as any).isLocked) {
        return [createEvent(IFEvents.ACTION_FAILED, {
          action: IFActions.OPENING,
          reason: 'locked'
        }, {
          actor: actor.id,
          target: noun.id
        })];
      }
    }
    
    // Build event data
    const eventData: Record<string, unknown> = {};
    
    // Add information about what type of thing was opened
    if (noun.has(TraitType.CONTAINER)) {
      eventData.isContainer = true;
      const contents = context.world.getContents(noun.id);
      eventData.hasContents = contents.length > 0;
      eventData.revealedItems = contents.length;
    }
    
    if (noun.has(TraitType.DOOR)) {
      eventData.isDoor = true;
      // Doors connect rooms, but don't have a connected door property
      // The door itself IS the connection
    }
    
    // Create the OPENED event
    return [createEvent(IFEvents.OPENED, eventData, {
      actor: actor.id,
      target: noun.id
    })];
  }
};

// packages/world-model/src/traits/openable/openableBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { OpenableTrait } from './openableTrait';
import { SemanticEvent, createEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failures';

/**
 * Behavior for openable entities.
 * 
 * Handles the logic for opening and closing entities.
 */
export class OpenableBehavior extends Behavior {
  static requiredTraits = [TraitType.OPENABLE];
  
  /**
   * Check if an entity can be opened
   */
  static canOpen(entity: IFEntity): boolean {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    return !openable.isOpen;
  }
  
  /**
   * Check if an entity can be closed
   */
  static canClose(entity: IFEntity): boolean {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    return openable.isOpen && openable.canClose;
  }
  
  /**
   * Open the entity
   * @returns Events describing what happened
   */
  static open(entity: IFEntity, actor: IFEntity): SemanticEvent[] {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (openable.isOpen) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: 'open',
          reason: ActionFailureReason.ALREADY_OPEN,
          customMessage: openable.alreadyOpenMessage
        },
        { target: entity.id, actor: actor.id }
      )];
    }
    
    // Open it
    openable.isOpen = true;
    
    return [createEvent(
      IFEvents.OPENED,
      {
        customMessage: openable.openMessage,
        sound: openable.openSound,
        revealsContents: openable.revealsContents
      },
      { target: entity.id, actor: actor.id }
    )];
  }
  
  /**
   * Close the entity
   * @returns Events describing what happened
   */
  static close(entity: IFEntity, actor: IFEntity): SemanticEvent[] {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (!openable.isOpen) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: 'close',
          reason: ActionFailureReason.ALREADY_CLOSED,
          customMessage: openable.alreadyClosedMessage
        },
        { target: entity.id, actor: actor.id }
      )];
    }
    
    if (!openable.canClose) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: 'close',
          reason: ActionFailureReason.CANT_DO_THAT,
          customMessage: "Once opened, it can't be closed."
        },
        { target: entity.id, actor: actor.id }
      )];
    }
    
    // Close it
    openable.isOpen = false;
    
    return [createEvent(
      IFEvents.CLOSED,
      {
        customMessage: openable.closeMessage,
        sound: openable.closeSound
      },
      { target: entity.id, actor: actor.id }
    )];
  }
  
  /**
   * Toggle open/closed state
   * @returns Events from either open or close
   */
  static toggle(entity: IFEntity, actor: IFEntity): SemanticEvent[] {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (openable.isOpen) {
      return OpenableBehavior.close(entity, actor);
    } else {
      return OpenableBehavior.open(entity, actor);
    }
  }
  
  /**
   * Check if entity is currently open
   */
  static isOpen(entity: IFEntity): boolean {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    return openable.isOpen;
  }
  
  /**
   * Check if opening reveals contents
   */
  static revealsContents(entity: IFEntity): boolean {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    return openable.revealsContents;
  }
}

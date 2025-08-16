// packages/world-model/src/traits/entry/entryBehavior.ts

import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { OpenableTrait } from '../openable/openableTrait';
import { EntryTrait } from './entryTrait';
import { ISemanticEvent, createEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';

/**
 * Behavior for enterable entities.
 * Handles all logic related to entering and exiting objects.
 */
export class EntryBehavior {
  static readonly requiredTraits = [TraitType.ENTRY];
  
  /**
   * Check if an actor can enter
   */
  static canEnter(entity: IFEntity, actor: IFEntity): boolean {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    if (!trait) return false;
    
    // Basic check
    if (!trait.canEnter) {
      return false;
    }
    
    // Initialize occupants if needed
    if (!trait.occupants) {
      trait.occupants = [];
    }
    
    // Check occupancy limit
    if (trait.maxOccupants !== undefined && trait.occupants.length >= trait.maxOccupants) {
      return false;
    }
    
    // Check if already inside
    if (trait.occupants.includes(actor.id)) {
      return false;
    }
    
    // Check if entity is accessible (open if openable)
    if (entity.has(TraitType.OPENABLE)) {
      const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
      if (openable && !openable.isOpen) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Enter an entity
   */
  static enter(entity: IFEntity, actor: IFEntity): ISemanticEvent[] {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    if (!trait) {
      return [
        createEvent(IFEvents.ACTION_FAILED, {
          action: 'enter',
          reason: 'not_enterable',
          target: entity.id,
          actor: actor.id
        })
      ];
    }
    
    if (!this.canEnter(entity, actor)) {
      const reason = this.getBlockedReason(entity, actor);
      return [
        createEvent(IFEvents.ACTION_FAILED, {
          action: 'enter',
          reason,
          target: entity.id,
          actor: actor.id,
          message: reason === 'full' ? trait.fullMessage : trait.blockedMessage
        })
      ];
    }
    
    // Add actor to occupants (initialize if needed)
    if (!trait.occupants) {
      trait.occupants = [];
    }
    trait.occupants.push(actor.id);
    
    const events: ISemanticEvent[] = [];
    
    // Custom enter message
    if (trait.enterMessage) {
      events.push(
        createEvent(IFEvents.CUSTOM_MESSAGE, {
          message: trait.enterMessage,
          actor: actor.id
        })
      );
    }
    
    // Enter event
    events.push(
      createEvent(IFEvents.ENTERED, {
        actor: actor.id,
        target: entity.id,
        preposition: trait.preposition,
        posture: trait.posture
      })
    );
    
    return events;
  }
  
  /**
   * Exit an entity
   */
  static exit(entity: IFEntity, actor: IFEntity): ISemanticEvent[] {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    if (!trait) {
      return [
        createEvent(IFEvents.ACTION_FAILED, {
          action: 'exit',
          reason: 'not_enterable',
          target: entity.id,
          actor: actor.id
        })
      ];
    }
    
    // Check if actor is inside
    const index = trait.occupants.indexOf(actor.id);
    if (index === -1) {
      return [
        createEvent(IFEvents.ACTION_FAILED, {
          action: 'exit',
          reason: 'not_inside',
          target: entity.id,
          actor: actor.id
        })
      ];
    }
    
    // Remove actor from occupants
    trait.occupants.splice(index, 1);
    
    const events: ISemanticEvent[] = [];
    
    // Custom exit message
    if (trait.exitMessage) {
      events.push(
        createEvent(IFEvents.CUSTOM_MESSAGE, {
          message: trait.exitMessage,
          actor: actor.id
        })
      );
    }
    
    // Exit event
    events.push(
      createEvent(IFEvents.EXITED, {
        actor: actor.id,
        target: entity.id,
        preposition: trait.preposition
      })
    );
    
    return events;
  }
  
  /**
   * Get reason why entry is blocked
   */
  static getBlockedReason(entity: IFEntity, actor: IFEntity): string {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    if (!trait) return 'not_enterable';
    
    if (!trait.canEnter) {
      return 'entry_blocked';
    }
    
    const occupants = trait.occupants || [];
    
    if (occupants.includes(actor.id)) {
      return 'already_inside';
    }
    
    if (trait.maxOccupants !== undefined && occupants.length >= trait.maxOccupants) {
      return 'full';
    }
    
    if (entity.has(TraitType.OPENABLE)) {
      const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
      if (openable && !openable.isOpen) {
        return 'closed';
      }
    }
    
    return 'cannot_enter';
  }
  
  /**
   * Get all occupants
   */
  static getOccupants(entity: IFEntity): string[] {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    return trait ? [...(trait.occupants || [])] : [];
  }
  
  /**
   * Check if entity has occupants
   */
  static hasOccupants(entity: IFEntity): boolean {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    return trait ? (trait.occupants || []).length > 0 : false;
  }
  
  /**
   * Check if a specific actor is inside
   */
  static contains(entity: IFEntity, actorId: string): boolean {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    return trait ? (trait.occupants || []).includes(actorId) : false;
  }
  
  /**
   * Remove all occupants (used when entity is destroyed, etc.)
   */
  static evacuate(entity: IFEntity): ISemanticEvent[] {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    if (!trait || !trait.occupants || trait.occupants.length === 0) {
      return [];
    }
    
    const events: ISemanticEvent[] = [];
    const evacuees = [...trait.occupants];
    
    // Clear occupants
    trait.occupants = [];
    
    // Generate events for each evacuee
    for (const actorId of evacuees) {
      events.push(
        createEvent(IFEvents.EVACUATED, {
          actor: actorId,
          from: entity.id,
          reason: 'entity_evacuated'
        })
      );
    }
    
    return events;
  }
  
  /**
   * Get description of occupants (for external viewing)
   */
  static describeOccupants(entity: IFEntity, world: any): string | undefined {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    const occupants = trait?.occupants || [];
    if (!trait || !trait.occupantsVisible || occupants.length === 0) {
      return undefined;
    }
    
    // TODO: Look up entity names from world
    // For now, just return count
    const count = occupants.length;
    if (count === 1) {
      return `Someone is ${trait.preposition} it.`;
    } else {
      return `${count} people are ${trait.preposition} it.`;
    }
  }
  
  /**
   * Check if occupants can perceive outside
   */
  static canSeeOut(entity: IFEntity): boolean {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    return trait ? trait.canSeeOut : false;
  }
  
  /**
   * Check if sound passes through
   */
  static isSoundproof(entity: IFEntity): boolean {
    const trait = entity.get(TraitType.ENTRY) as EntryTrait;
    return trait ? trait.soundproof : false;
  }
}
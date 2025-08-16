// packages/world-model/src/traits/readable/readableBehavior.ts

import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { ReadableTrait } from './readableTrait';
import { ISemanticEvent, createEvent } from '@sharpee/core';

/**
 * Behavior for readable entities.
 * Handles all logic related to reading text, turning pages, etc.
 */
export class ReadableBehavior {
  static readonly requiredTraits = [TraitType.READABLE];
  
  /**
   * Get the current readable text
   */
  static getText(entity: IFEntity): string {
    const trait = entity.get(TraitType.READABLE) as ReadableTrait;
    if (!trait) return '';
    
    if (trait.pageContent && trait.currentPage) {
      return trait.pageContent[trait.currentPage - 1] || trait.text;
    }
    return trait.text;
  }
  
  /**
   * Mark entity as read
   */
  static markAsRead(entity: IFEntity): ISemanticEvent[] {
    const trait = entity.get(TraitType.READABLE) as ReadableTrait;
    if (!trait || trait.hasBeenRead) return [];
    
    trait.hasBeenRead = true;
    
    return [
      createEvent('if.readable.read', {
        reader: 'player', // TODO: pass in actual reader
        readable: entity.id,
        firstTime: true
      })
    ];
  }
  
  /**
   * Check if entity can be read with given ability
   */
  static canRead(entity: IFEntity, ability?: string): boolean {
    const trait = entity.get(TraitType.READABLE) as ReadableTrait;
    if (!trait) return false;
    
    if (!trait.isReadable) {
      return false;
    }
    
    if (trait.requiresAbility) {
      return ability === trait.requiredAbility;
    }
    
    return true;
  }
  
  /**
   * Turn to a specific page
   */
  static turnToPage(entity: IFEntity, page: number): ISemanticEvent[] {
    const trait = entity.get(TraitType.READABLE) as ReadableTrait;
    if (!trait || !trait.pageContent || !trait.pages) {
      return [];
    }
    
    if (page < 1 || page > trait.pages) {
      return [
        createEvent('if.action.failed', {
          action: 'turn_page',
          reason: 'invalid_page',
          entity: entity.id
        })
      ];
    }
    
    const oldPage = trait.currentPage || 1;
    trait.currentPage = page;
    
    return [
      createEvent('if.readable.page_turned', {
        readable: entity.id,
        fromPage: oldPage,
        toPage: page,
        totalPages: trait.pages
      })
    ];
  }
  
  /**
   * Turn to next page
   */
  static nextPage(entity: IFEntity): ISemanticEvent[] {
    const trait = entity.get(TraitType.READABLE) as ReadableTrait;
    if (!trait || !trait.currentPage || !trait.pages) {
      return [];
    }
    
    return this.turnToPage(entity, trait.currentPage + 1);
  }
  
  /**
   * Turn to previous page
   */
  static previousPage(entity: IFEntity): ISemanticEvent[] {
    const trait = entity.get(TraitType.READABLE) as ReadableTrait;
    if (!trait || !trait.currentPage || !trait.pages) {
      return [];
    }
    
    return this.turnToPage(entity, trait.currentPage - 1);
  }
  
  /**
   * Get a preview of the text
   */
  static getPreview(entity: IFEntity): string {
    const trait = entity.get(TraitType.READABLE) as ReadableTrait;
    if (!trait) return '';
    
    if (trait.preview) {
      return trait.preview;
    }
    
    // Generate preview from main text
    const text = this.getText(entity);
    if (text.length <= 50) {
      return text;
    }
    
    // Find a good break point
    const preview = text.substring(0, 50);
    const lastSpace = preview.lastIndexOf(' ');
    
    if (lastSpace > 30) {
      return preview.substring(0, lastSpace) + '...';
    }
    
    return preview + '...';
  }
  
  /**
   * Read the entity
   */
  static read(reader: IFEntity, readable: IFEntity): ISemanticEvent[] {
    const trait = readable.get(TraitType.READABLE) as ReadableTrait;
    if (!trait) {
      return [
        createEvent('if.action.failed', {
          action: 'read',
          reason: 'not_readable',
          actor: reader.id,
          target: readable.id
        })
      ];
    }
    
    // Check if can read
    if (!this.canRead(readable)) {
      return [
        createEvent('if.action.failed', {
          action: 'read',
          reason: trait.requiresAbility ? 'requires_ability' : 'cannot_read',
          actor: reader.id,
          target: readable.id,
          requiredAbility: trait.requiredAbility,
          message: trait.cannotReadMessage
        })
      ];
    }
    
    const events: ISemanticEvent[] = [];
    
    // Mark as read if first time
    if (!trait.hasBeenRead) {
      events.push(...this.markAsRead(readable));
    }
    
    // Main read event
    events.push(
      createEvent('if.readable.read', {
        reader: reader.id,
        readable: readable.id,
        text: this.getText(readable),
        page: trait.currentPage,
        totalPages: trait.pages,
        language: trait.language,
        readableType: trait.readableType
      })
    );
    
    return events;
  }
}
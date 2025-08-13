// packages/world-model/src/traits/openable/openableBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { OpenableTrait } from './openableTrait';

/**
 * Result of an open operation
 */
export interface OpenResult {
  success: boolean;
  alreadyOpen?: boolean;
  stateChanged?: boolean;
  openMessage?: string;
  openSound?: string;
  revealsContents?: boolean;
}

/**
 * Result of a close operation
 */
export interface CloseResult {
  success: boolean;
  alreadyClosed?: boolean;
  cantClose?: boolean;
  stateChanged?: boolean;
  closeMessage?: string;
  closeSound?: string;
}

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
   * @returns Result describing what happened
   */
  static open(entity: IFEntity): OpenResult {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (openable.isOpen) {
      return {
        success: false,
        alreadyOpen: true,
        stateChanged: false
      };
    }
    
    // Open it
    openable.isOpen = true;
    
    return {
      success: true,
      stateChanged: true,
      openMessage: openable.openMessage,
      openSound: openable.openSound,
      revealsContents: openable.revealsContents
    };
  }
  
  /**
   * Close the entity
   * @returns Result describing what happened
   */
  static close(entity: IFEntity): CloseResult {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (!openable.isOpen) {
      return {
        success: false,
        alreadyClosed: true,
        stateChanged: false
      };
    }
    
    if (!openable.canClose) {
      return {
        success: false,
        cantClose: true,
        stateChanged: false
      };
    }
    
    // Close it
    openable.isOpen = false;
    
    return {
      success: true,
      stateChanged: true,
      closeMessage: openable.closeMessage,
      closeSound: openable.closeSound
    };
  }
  
  /**
   * Toggle open/closed state
   * @returns Result from either open or close
   */
  static toggle(entity: IFEntity): OpenResult | CloseResult {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (openable.isOpen) {
      return OpenableBehavior.close(entity);
    } else {
      return OpenableBehavior.open(entity);
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

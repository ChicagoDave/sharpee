// packages/world-model/src/traits/openable/openableBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { OpenableTrait } from './openableTrait';

/**
 * Result of an open operation
 */
export interface IOpenResult {
  success: boolean;
  wasOpen?: boolean;
  wasClosed?: boolean;
}

/**
 * Result of a close operation
 */
export interface ICloseResult {
  success: boolean;
  wasClosed?: boolean;
  wasOpen?: boolean;
  cantClose?: boolean;
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
  static open(entity: IFEntity): IOpenResult {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (openable.isOpen) {
      return {
        success: false,
        wasOpen: true
      };
    }
    
    // Open it
    openable.isOpen = true;
    
    return {
      success: true,
      wasClosed: true
    };
  }
  
  /**
   * Close the entity
   * @returns Result describing what happened
   */
  static close(entity: IFEntity): ICloseResult {
    const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (!openable.isOpen) {
      return {
        success: false,
        wasClosed: true
      };
    }
    
    if (!openable.canClose) {
      return {
        success: false,
        cantClose: true,
        wasOpen: true
      };
    }
    
    // Close it
    openable.isOpen = false;
    
    return {
      success: true,
      wasOpen: true
    };
  }
  
  /**
   * Toggle open/closed state
   * @returns Result from either open or close
   */
  static toggle(entity: IFEntity): IOpenResult | ICloseResult {
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
  
}

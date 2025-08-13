// packages/world-model/src/traits/lockable/lockableBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { LockableTrait } from './lockableTrait';
import { OpenableTrait } from '../openable/openableTrait';
import { EntityId } from '@sharpee/core';
// No longer using ActionFailureReason enum

/**
 * Result of a lock operation
 */
export interface LockResult {
  success: boolean;
  alreadyLocked?: boolean;
  notClosed?: boolean;
  noKey?: boolean;
  wrongKey?: boolean;
  stateChanged?: boolean;
  lockMessage?: string;
  lockSound?: string;
}

/**
 * Result of an unlock operation
 */
export interface UnlockResult {
  success: boolean;
  alreadyUnlocked?: boolean;
  noKey?: boolean;
  wrongKey?: boolean;
  stateChanged?: boolean;
  unlockMessage?: string;
  unlockSound?: string;
}

/**
 * Behavior for lockable entities.
 * 
 * Handles the logic for locking and unlocking entities.
 * Requires LOCKABLE trait, OPENABLE is optional.
 */
export class LockableBehavior extends Behavior {
  static requiredTraits = [TraitType.LOCKABLE];
  
  /**
   * Check if a key can unlock this entity
   */
  static canUnlockWith(entity: IFEntity, keyId: EntityId): boolean {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    
    // Check specific key
    if (lockable.keyId === keyId) {
      return true;
    }
    
    // Check multiple keys
    if (lockable.keyIds && lockable.keyIds.includes(keyId)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a key can lock this entity (usually same as unlock)
   */
  static canLockWith(entity: IFEntity, keyId: EntityId): boolean {
    // By default, same keys that unlock can also lock
    return this.canUnlockWith(entity, keyId);
  }
  
  /**
   * Check if this entity requires a key to unlock
   */
  static requiresKey(entity: IFEntity): boolean {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    return !!(lockable.keyId || lockable.keyIds?.length);
  }
  
  /**
   * Check if an entity can be locked
   */
  static canLock(entity: IFEntity): boolean {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    
    // Check if open (only if openable)
    if (entity.has(TraitType.OPENABLE)) {
      const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
      if (openable.isOpen) {
        return false; // Can't lock something that's open
      }
    }
    
    return !lockable.isLocked;
  }
  
  /**
   * Check if an entity can be unlocked
   */
  static canUnlock(entity: IFEntity): boolean {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    return lockable.isLocked;
  }
  
  /**
   * Lock the entity
   * @returns Result describing what happened
   */
  static lock(entity: IFEntity, keyEntity?: IFEntity): LockResult {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    
    if (lockable.isLocked) {
      return {
        success: false,
        alreadyLocked: true,
        stateChanged: false
      };
    }
    
    // Can't lock something that's open (only check if openable)
    if (entity.has(TraitType.OPENABLE)) {
      const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
      if (openable.isOpen) {
        return {
          success: false,
          notClosed: true,
          stateChanged: false
        };
      }
    }
    
    // Check if key is required
    if (LockableBehavior.requiresKey(entity)) {
      if (!keyEntity) {
        return {
          success: false,
          noKey: true,
          stateChanged: false
        };
      }
      
      // Check if key is valid
      if (!this.canLockWith(entity, keyEntity.id)) {
        return {
          success: false,
          wrongKey: true,
          stateChanged: false
        };
      }
    }
    
    // Lock it
    lockable.isLocked = true;
    
    return {
      success: true,
      stateChanged: true,
      lockMessage: lockable.lockMessage,
      lockSound: lockable.lockSound
    };
  }
  
  /**
   * Unlock the entity with a key
   * @returns Result describing what happened
   */
  static unlock(entity: IFEntity, keyEntity?: IFEntity): UnlockResult {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    
    if (!lockable.isLocked) {
      return {
        success: false,
        alreadyUnlocked: true,
        stateChanged: false
      };
    }
    
    // Check if key is required
    if (LockableBehavior.requiresKey(entity)) {
      if (!keyEntity) {
        return {
          success: false,
          noKey: true,
          stateChanged: false
        };
      }
      
      // Check if key is valid
      if (!this.canUnlockWith(entity, keyEntity.id)) {
        return {
          success: false,
          wrongKey: true,
          stateChanged: false
        };
      }
    }
    
    // Unlock it
    lockable.isLocked = false;
    
    return {
      success: true,
      stateChanged: true,
      unlockMessage: lockable.unlockMessage,
      unlockSound: lockable.unlockSound
    };
  }
  
  /**
   * Force unlock without a key (for admin/debug)
   */
  static forceUnlock(entity: IFEntity): void {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    lockable.isLocked = false;
  }
  
  /**
   * Check if entity is currently locked
   */
  static isLocked(entity: IFEntity): boolean {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    return lockable.isLocked;
  }
  
  /**
   * Handle auto-lock when closing
   */
  static handleClose(entity: IFEntity): LockResult | null {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    
    if (lockable.autoLock && !lockable.isLocked) {
      return this.lock(entity);
    }
    
    return null;
  }
  
  /**
   * Check if we can open this entity (not locked)
   */
  static canOpen(entity: IFEntity): boolean {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    return !lockable.isLocked;
  }
  
  /**
   * Get the locked message
   */
  static getLockedMessage(entity: IFEntity): string | undefined {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    return lockable.lockedMessage;
  }
}
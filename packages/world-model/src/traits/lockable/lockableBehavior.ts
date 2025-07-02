// packages/world-model/src/traits/lockable/lockableBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { LockableTrait } from './lockableTrait';
import { OpenableTrait } from '../openable/openableTrait';
import { SemanticEvent, EntityId } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';
// No longer using ActionFailureReason enum

/**
 * Behavior for lockable entities.
 * 
 * Handles the logic for locking and unlocking entities.
 * Requires both LOCKABLE and OPENABLE traits.
 */
export class LockableBehavior extends Behavior {
  static requiredTraits = [TraitType.LOCKABLE, TraitType.OPENABLE];
  
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
   * Lock the entity
   * @returns Events describing what happened
   */
  static lock(entity: IFEntity, actor: IFEntity, keyEntity?: IFEntity): SemanticEvent[] {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    const openable = LockableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (lockable.isLocked) {
      return [{
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: IFEvents.ACTION_FAILED,
        entities: {
          actor: actor.id,
          target: entity.id
        },
        payload: {
          action: 'lock',
          reason: 'already_locked',
          customMessage: lockable.alreadyLockedMessage
        }
      }];
    }
    
    // Can't lock something that's open
    if (openable.isOpen) {
      return [{
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: IFEvents.ACTION_FAILED,
        entities: {
          actor: actor.id,
          target: entity.id
        },
        payload: {
          action: 'lock',
          reason: 'cant_do_that',
          customMessage: "You can't lock something that's open."
        }
      }];
    }
    
    // Check if key is required
    if (LockableBehavior.requiresKey(entity)) {
      if (!keyEntity) {
        return [{
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: IFEvents.ACTION_FAILED,
          entities: {
            actor: actor.id,
            target: entity.id
          },
          payload: {
            action: 'lock',
            reason: 'no_key_specified'
          }
        }];
      }
      
      // Check if key is valid
      if (!this.canLockWith(entity, keyEntity.id)) {
        return [{
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: IFEvents.ACTION_FAILED,
          entities: {
            actor: actor.id,
            target: entity.id,
            instrument: keyEntity.id
          },
          payload: {
            action: 'lock',
            reason: 'wrong_key',
            customMessage: lockable.wrongKeyMessage
          }
        }];
      }
    }
    
    // Lock it
    lockable.isLocked = true;
    
    return [{
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: IFEvents.LOCKED,
      entities: {
        actor: actor.id,
        target: entity.id,
        instrument: keyEntity?.id
      },
      payload: {
        customMessage: lockable.lockMessage,
        sound: lockable.lockSound
      }
    }];
  }
  
  /**
   * Unlock the entity with a key
   * @returns Events describing what happened
   */
  static unlock(entity: IFEntity, actor: IFEntity, keyEntity?: IFEntity): SemanticEvent[] {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    
    if (!lockable.isLocked) {
      return [{
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: IFEvents.ACTION_FAILED,
        entities: {
          actor: actor.id,
          target: entity.id
        },
        payload: {
          action: 'unlock',
          reason: 'already_unlocked',
          customMessage: lockable.alreadyUnlockedMessage
        }
      }];
    }
    
    // Check if key is required
    if (LockableBehavior.requiresKey(entity)) {
      if (!keyEntity) {
        return [{
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: IFEvents.ACTION_FAILED,
          entities: {
            actor: actor.id,
            target: entity.id
          },
          payload: {
            action: 'unlock',
            reason: 'no_key_specified'
          }
        }];
      }
      
      // Check if key is valid
      if (!this.canUnlockWith(entity, keyEntity.id)) {
        return [{
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: IFEvents.ACTION_FAILED,
          entities: {
            actor: actor.id,
            target: entity.id,
            instrument: keyEntity.id
          },
          payload: {
            action: 'unlock',
            reason: 'wrong_key',
            customMessage: lockable.wrongKeyMessage
          }
        }];
      }
    }
    
    // Unlock it
    lockable.isLocked = false;
    
    return [{
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: IFEvents.UNLOCKED,
      entities: {
        actor: actor.id,
        target: entity.id,
        instrument: keyEntity?.id
      },
      payload: {
        customMessage: lockable.unlockMessage,
        sound: lockable.unlockSound
      }
    }];
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
  static handleClose(entity: IFEntity, actor: IFEntity): SemanticEvent[] {
    const lockable = LockableBehavior.require<LockableTrait>(entity, TraitType.LOCKABLE);
    
    if (lockable.autoLock && !lockable.isLocked) {
      return this.lock(entity, actor);
    }
    
    return [];
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
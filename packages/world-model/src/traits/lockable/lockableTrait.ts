// packages/world-model/src/traits/lockable/lockableTrait.ts

import { EntityId } from '@sharpee/core';
import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface ILockableData {
  /** Whether the entity is currently locked */
  isLocked?: boolean;
  
  /** Whether the entity starts locked */
  startsLocked?: boolean;
  
  /** ID of the key entity that unlocks this */
  keyId?: EntityId;
  
  /** Multiple keys that can unlock this */
  keyIds?: EntityId[];
  
  /** Whether any key can unlock (master key support) */
  acceptsMasterKey?: boolean;
  
  /** Custom message when locking */
  lockMessage?: string;
  
  /** Custom message when unlocking */
  unlockMessage?: string;
  
  /** Custom message when already locked */
  alreadyLockedMessage?: string;
  
  /** Custom message when already unlocked */
  alreadyUnlockedMessage?: string;
  
  /** Custom message when trying to open while locked */
  lockedMessage?: string;
  
  /** Custom message when wrong key is used */
  wrongKeyMessage?: string;
  
  /** Whether this automatically locks when closed */
  autoLock?: boolean;
  
  /** Sound made when locking */
  lockSound?: string;
  
  /** Sound made when unlocking */
  unlockSound?: string;
}

/**
 * Lockable trait for entities that can be locked and unlocked.
 * Usually combined with OpenableTrait.
 * 
 * This trait contains only data - all locking/unlocking logic
 * is in LockableBehavior.
 */
export class LockableTrait implements ITrait, ILockableData {
  static readonly type = TraitType.LOCKABLE;
  readonly type = TraitType.LOCKABLE;
  
  // LockableData properties
  isLocked: boolean;
  startsLocked: boolean;
  keyId?: EntityId;
  keyIds?: EntityId[];
  acceptsMasterKey: boolean;
  lockMessage?: string;
  unlockMessage?: string;
  alreadyLockedMessage?: string;
  alreadyUnlockedMessage?: string;
  lockedMessage?: string;
  wrongKeyMessage?: string;
  autoLock: boolean;
  lockSound?: string;
  unlockSound?: string;
  
  constructor(data: ILockableData = {}) {
    // Set defaults and merge with provided data
    this.startsLocked = data.startsLocked ?? false;
    this.isLocked = data.isLocked ?? this.startsLocked;
    this.keyId = data.keyId;
    this.keyIds = data.keyIds;
    this.acceptsMasterKey = data.acceptsMasterKey ?? true;
    this.lockMessage = data.lockMessage;
    this.unlockMessage = data.unlockMessage;
    this.alreadyLockedMessage = data.alreadyLockedMessage;
    this.alreadyUnlockedMessage = data.alreadyUnlockedMessage;
    this.lockedMessage = data.lockedMessage;
    this.wrongKeyMessage = data.wrongKeyMessage;
    this.autoLock = data.autoLock ?? false;
    this.lockSound = data.lockSound;
    this.unlockSound = data.unlockSound;
  }
}

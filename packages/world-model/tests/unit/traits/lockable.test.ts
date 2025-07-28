// tests/unit/traits/lockable.test.ts

import { LockableTrait } from '../../../src/traits/lockable/lockableTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { createTestLockableContainer, createTestKey } from '../../fixtures/test-entities';

describe('LockableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new LockableTrait();
      
      expect(trait.type).toBe(TraitType.LOCKABLE);
      expect(trait.isLocked).toBe(false);
      expect(trait.startsLocked).toBe(false);
      expect(trait.acceptsMasterKey).toBe(true);
      expect(trait.autoLock).toBe(false);
      expect(trait.keyId).toBeUndefined();
      expect(trait.keyIds).toBeUndefined();
      expect(trait.lockMessage).toBeUndefined();
      expect(trait.unlockMessage).toBeUndefined();
      expect(trait.alreadyLockedMessage).toBeUndefined();
      expect(trait.alreadyUnlockedMessage).toBeUndefined();
      expect(trait.lockedMessage).toBeUndefined();
      expect(trait.wrongKeyMessage).toBeUndefined();
      expect(trait.lockSound).toBeUndefined();
      expect(trait.unlockSound).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new LockableTrait({
        isLocked: true,
        startsLocked: true,
        keyId: 'brass-key',
        acceptsMasterKey: false,
        autoLock: true,
        lockMessage: 'Click! The lock engages.',
        unlockMessage: 'The lock turns smoothly.',
        alreadyLockedMessage: 'It\'s already locked.',
        alreadyUnlockedMessage: 'It\'s already unlocked.',
        lockedMessage: 'It\'s locked tight.',
        wrongKeyMessage: 'That key doesn\'t fit.',
        lockSound: 'lock_click.mp3',
        unlockSound: 'lock_turn.mp3'
      });
      
      expect(trait.isLocked).toBe(true);
      expect(trait.startsLocked).toBe(true);
      expect(trait.keyId).toBe('brass-key');
      expect(trait.acceptsMasterKey).toBe(false);
      expect(trait.autoLock).toBe(true);
      expect(trait.lockMessage).toBe('Click! The lock engages.');
      expect(trait.unlockMessage).toBe('The lock turns smoothly.');
      expect(trait.alreadyLockedMessage).toBe('It\'s already locked.');
      expect(trait.alreadyUnlockedMessage).toBe('It\'s already unlocked.');
      expect(trait.lockedMessage).toBe('It\'s locked tight.');
      expect(trait.wrongKeyMessage).toBe('That key doesn\'t fit.');
      expect(trait.lockSound).toBe('lock_click.mp3');
      expect(trait.unlockSound).toBe('lock_turn.mp3');
    });

    it('should use startsLocked to set initial isLocked if not provided', () => {
      const trait = new LockableTrait({ startsLocked: true });
      expect(trait.isLocked).toBe(true);
      expect(trait.startsLocked).toBe(true);
    });

    it('should prefer explicit isLocked over startsLocked', () => {
      const trait = new LockableTrait({ 
        isLocked: false, 
        startsLocked: true 
      });
      expect(trait.isLocked).toBe(false);
      expect(trait.startsLocked).toBe(true);
    });
  });

  describe('key management', () => {
    it('should handle single key', () => {
      const trait = new LockableTrait({
        keyId: 'golden-key'
      });
      
      expect(trait.keyId).toBe('golden-key');
      expect(trait.keyIds).toBeUndefined();
    });

    it('should handle multiple keys', () => {
      const trait = new LockableTrait({
        keyIds: ['key1', 'key2', 'key3']
      });
      
      expect(trait.keyId).toBeUndefined();
      expect(trait.keyIds).toEqual(['key1', 'key2', 'key3']);
    });

    it('should handle both single and multiple keys', () => {
      const trait = new LockableTrait({
        keyId: 'primary-key',
        keyIds: ['backup-key-1', 'backup-key-2']
      });
      
      expect(trait.keyId).toBe('primary-key');
      expect(trait.keyIds).toEqual(['backup-key-1', 'backup-key-2']);
    });

    it('should handle master key acceptance', () => {
      const trait = new LockableTrait({
        keyId: 'specific-key',
        acceptsMasterKey: true
      });
      
      expect(trait.acceptsMasterKey).toBe(true);
    });
  });

  describe('state management', () => {
    it('should allow changing lock state', () => {
      const trait = new LockableTrait();
      
      expect(trait.isLocked).toBe(false);
      
      trait.isLocked = true;
      expect(trait.isLocked).toBe(true);
      
      trait.isLocked = false;
      expect(trait.isLocked).toBe(false);
    });

    it('should handle auto-lock behavior flag', () => {
      const trait = new LockableTrait({
        autoLock: true
      });
      
      expect(trait.autoLock).toBe(true);
      
      // The actual auto-locking behavior would be handled by LockableBehavior
      // This trait just stores the flag
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Wall Safe', 'container');
      const trait = new LockableTrait();
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.LOCKABLE)).toBe(true);
      expect(entity.getTrait(TraitType.LOCKABLE)).toBe(trait);
    });

    it('should work with lockable container', () => {
      const chest = createTestLockableContainer(world, 'Treasure Chest', true, 'gold-key');
      
      expect(chest.hasTrait(TraitType.CONTAINER)).toBe(true);
      expect(chest.hasTrait(TraitType.OPENABLE)).toBe(true);
      expect(chest.hasTrait(TraitType.LOCKABLE)).toBe(true);
      
      const lockable = chest.getTrait(TraitType.LOCKABLE) as LockableTrait;
      expect(lockable.isLocked).toBe(true);
      expect(lockable.keyId).toBe('gold-key');
    });

    it('should create matching key entity', () => {
      const key = createTestKey(world, 'Brass Key', 'brass-key');
      
      // Key has generated ID like 'i01'
      expect(key.type).toBe('item');
      expect(key.attributes.keyId).toBe('brass-key');
    });
  });

  describe('message customization', () => {
    it('should store all lock-related messages', () => {
      const trait = new LockableTrait({
        lockMessage: 'The tumblers fall into place with a satisfying click.',
        unlockMessage: 'The lock disengages with a soft snick.',
        alreadyLockedMessage: 'You try the lock, but it\'s already secure.',
        alreadyUnlockedMessage: 'The lock is already disengaged.',
        lockedMessage: 'The door refuses to budge - it\'s locked.',
        wrongKeyMessage: 'The key slides in but won\'t turn.'
      });
      
      expect(trait.lockMessage).toBe('The tumblers fall into place with a satisfying click.');
      expect(trait.unlockMessage).toBe('The lock disengages with a soft snick.');
      expect(trait.alreadyLockedMessage).toBe('You try the lock, but it\'s already secure.');
      expect(trait.alreadyUnlockedMessage).toBe('The lock is already disengaged.');
      expect(trait.lockedMessage).toBe('The door refuses to budge - it\'s locked.');
      expect(trait.wrongKeyMessage).toBe('The key slides in but won\'t turn.');
    });

    it('should allow partial message customization', () => {
      const trait = new LockableTrait({
        lockedMessage: 'Locked!',
        wrongKeyMessage: 'Wrong key!'
        // Other messages remain undefined
      });
      
      expect(trait.lockedMessage).toBe('Locked!');
      expect(trait.wrongKeyMessage).toBe('Wrong key!');
      expect(trait.lockMessage).toBeUndefined();
      expect(trait.unlockMessage).toBeUndefined();
    });
  });

  describe('sound effects', () => {
    it('should support lock/unlock sounds', () => {
      const trait = new LockableTrait({
        lockSound: 'padlock_close.mp3',
        unlockSound: 'padlock_open.mp3'
      });
      
      expect(trait.lockSound).toBe('padlock_close.mp3');
      expect(trait.unlockSound).toBe('padlock_open.mp3');
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new LockableTrait({});
      
      expect(trait.isLocked).toBe(false);
      expect(trait.startsLocked).toBe(false);
      expect(trait.acceptsMasterKey).toBe(true);
      expect(trait.autoLock).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new LockableTrait(undefined);
      
      expect(trait.isLocked).toBe(false);
      expect(trait.startsLocked).toBe(false);
      expect(trait.acceptsMasterKey).toBe(true);
      expect(trait.autoLock).toBe(false);
    });

    it('should handle entity without key requirement', () => {
      const trait = new LockableTrait({
        isLocked: true
        // No keyId specified - might be unlocked by puzzle/magic/etc
      });
      
      expect(trait.isLocked).toBe(true);
      expect(trait.keyId).toBeUndefined();
      expect(trait.keyIds).toBeUndefined();
    });

    it('should maintain type constant', () => {
      expect(LockableTrait.type).toBe(TraitType.LOCKABLE);
      
      const trait = new LockableTrait();
      expect(trait.type).toBe(TraitType.LOCKABLE);
      expect(trait.type).toBe(LockableTrait.type);
    });
  });
});

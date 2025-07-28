// tests/unit/entities/if-entity.test.ts
// Tests for the core IFEntity class

import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';

describe('IFEntity', () => {
  let entity: IFEntity;

  beforeEach(() => {
    entity = new IFEntity('i01', 'object');
  });

  describe('constructor', () => {
    it('should create entity with id and type', () => {
      const e = new IFEntity('i02', 'item');
      
      expect(e.id).toBe('i02');
      expect(e.type).toBe('item');
      expect(e.attributes).toEqual({});
      expect(e.relationships).toEqual({});
    });

    it('should accept creation params', () => {
      const e = new IFEntity('o01', 'object', {
        attributes: { displayName: 'Test Object', name: 'test', weight: 5 },
        relationships: { contains: ['i01', 'i02'] }
      });
      
      expect(e.attributes).toEqual({ displayName: 'Test Object', name: 'test', weight: 5 });
      expect(e.relationships).toEqual({ contains: ['i01', 'i02'] });
    });
  });

  describe('traits', () => {
    let identityTrait: IdentityTrait;
    let containerTrait: ContainerTrait;

    beforeEach(() => {
      identityTrait = new IdentityTrait();
      containerTrait = new ContainerTrait();
    });

    it('should add trait', () => {
      entity.add(identityTrait);
      
      expect(entity.has(TraitType.IDENTITY)).toBe(true);
      expect(entity.get(TraitType.IDENTITY)).toBe(identityTrait);
    });

    it('should remove trait', () => {
      entity.add(identityTrait);
      const removed = entity.remove(TraitType.IDENTITY);
      
      expect(removed).toBe(true);
      expect(entity.has(TraitType.IDENTITY)).toBe(false);
    });

    it('should replace existing trait of same type', () => {
      const trait1 = new IdentityTrait();
      const trait2 = new IdentityTrait();
      
      entity.add(trait1);
      entity.add(trait2);
      
      expect(entity.get(TraitType.IDENTITY)).toBe(trait2);
      expect(entity.getTraits()).toHaveLength(1);
    });

    it('should check multiple traits with hasAll', () => {
      entity.add(identityTrait);
      entity.add(containerTrait);
      
      expect(entity.hasAll(TraitType.IDENTITY, TraitType.CONTAINER)).toBe(true);
      expect(entity.hasAll(TraitType.IDENTITY, TraitType.ROOM)).toBe(false);
    });

    it('should check multiple traits with hasAny', () => {
      entity.add(identityTrait);
      
      expect(entity.hasAny(TraitType.IDENTITY, TraitType.CONTAINER)).toBe(true);
      expect(entity.hasAny(TraitType.ROOM, TraitType.DOOR)).toBe(false);
    });

    it('should get all traits', () => {
      entity.add(identityTrait);
      entity.add(containerTrait);
      
      const traits = entity.getTraits();
      expect(traits).toHaveLength(2);
      expect(traits).toContain(identityTrait);
      expect(traits).toContain(containerTrait);
    });

    it('should get all trait types', () => {
      entity.add(identityTrait);
      entity.add(containerTrait);
      
      const types = entity.getTraitTypes();
      expect(types).toHaveLength(2);
      expect(types).toContain(TraitType.IDENTITY);
      expect(types).toContain(TraitType.CONTAINER);
    });

    it('should clear all traits', () => {
      entity.add(identityTrait);
      entity.add(containerTrait);
      
      entity.clearTraits();
      
      expect(entity.getTraits()).toHaveLength(0);
      expect(entity.has(TraitType.IDENTITY)).toBe(false);
      expect(entity.has(TraitType.CONTAINER)).toBe(false);
    });

    it('should support trait aliases (getTrait, hasTrait)', () => {
      entity.add(identityTrait);
      
      expect(entity.hasTrait(TraitType.IDENTITY)).toBe(true);
      expect(entity.getTrait(TraitType.IDENTITY)).toBe(identityTrait);
    });
  });

  describe('convenience properties', () => {
    it('should identify rooms', () => {
      expect(entity.isRoom).toBe(false);
      
      entity.add(new RoomTrait());
      expect(entity.isRoom).toBe(true);
    });

    it('should identify containers', () => {
      expect(entity.canContain).toBe(false);
      expect(entity.isContainer).toBe(false);
      
      entity.add(new ContainerTrait());
      expect(entity.canContain).toBe(true);
      expect(entity.isContainer).toBe(true);
    });

    it('should identify takeable items', () => {
      expect(entity.isTakeable).toBe(true);
      
      // Rooms are not takeable
      const room = new IFEntity('room', 'room');
      room.add(new RoomTrait());
      expect(room.isTakeable).toBe(false);
    });

    it('should get name from displayName attribute first', () => {
      expect(entity.name).toBe('i01'); // Falls back to ID when no displayName
      
      // Test displayName attribute (highest priority)
      entity.attributes.displayName = 'Display Name';
      expect(entity.name).toBe('Display Name');
      
      // Test identity trait name (second priority)
      const identity = new IdentityTrait();
      identity.name = 'Identity Name';
      entity.add(identity);
      expect(entity.name).toBe('Display Name'); // displayName still takes priority
      
      // Remove displayName to test fallback
      delete entity.attributes.displayName;
      expect(entity.name).toBe('Identity Name');
      
      // Test name attribute fallback
      entity.remove(TraitType.IDENTITY);
      entity.attributes.name = 'Name Attribute';
      expect(entity.name).toBe('Name Attribute');
    });

    it('should get weight from attributes', () => {
      expect(entity.weight).toBe(0);
      
      entity.attributes.weight = 5;
      expect(entity.weight).toBe(5);
    });
  });

  describe('cloning', () => {
    it('should create deep copy with new ID', () => {
      entity.attributes = { displayName: 'Original', name: 'original', items: ['a', 'b'] };
      entity.relationships = { contains: ['i01'] };
      entity.add(new IdentityTrait());
      
      const clone = entity.clone('o02');
      
      expect(clone.id).toBe('o02');
      expect(clone.type).toBe(entity.type);
      expect(clone.attributes).toEqual(entity.attributes);
      expect(clone.attributes).not.toBe(entity.attributes);
      expect(clone.has(TraitType.IDENTITY)).toBe(true);
      
      // Verify deep copy
      (entity.attributes.items as string[]).push('c');
      expect(clone.attributes.items).toEqual(['a', 'b']);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      entity.attributes = { displayName: 'Test Object', name: 'Test', weight: 5 };
      entity.relationships = { contains: ['i02'] };
      
      const identity = new IdentityTrait();
      identity.name = 'Test Object';
      entity.add(identity);
      
      const json = entity.toJSON();
      
      expect(json).toMatchObject({
        id: 'i01',
        type: 'object',
        attributes: { displayName: 'Test Object', name: 'Test', weight: 5 },
        relationships: { contains: ['i02'] }
      });
      expect(json.traits).toHaveLength(1);
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: 'i03',
        type: 'item',
        attributes: { displayName: 'Restored Item', name: 'Restored', weight: 3 },
        relationships: { contains: ['i04', 'i05'] },
        traits: [
          { type: TraitType.IDENTITY, name: 'Restored Item' }
        ]
      };
      
      const restored = IFEntity.fromJSON(json);
      
      expect(restored.id).toBe('i03');
      expect(restored.type).toBe('item');
      expect(restored.attributes).toEqual({ displayName: 'Restored Item', name: 'Restored', weight: 3 });
      expect(restored.relationships).toEqual({ contains: ['i04', 'i05'] });
      expect(restored.has(TraitType.IDENTITY)).toBe(true);
    });
  });

  describe('openable/lockable properties', () => {
    it('should detect openable trait', () => {
      expect(entity.isOpenable).toBe(false);
      expect(entity.isOpen).toBe(false);
      
      const openable = { type: TraitType.OPENABLE, isOpen: true };
      entity.traits.set(TraitType.OPENABLE, openable as any);
      
      expect(entity.isOpenable).toBe(true);
      expect(entity.isOpen).toBe(true);
    });

    it('should detect lockable trait', () => {
      expect(entity.isLockable).toBe(false);
      expect(entity.isLocked).toBe(false);
      
      const lockable = { type: TraitType.LOCKABLE, isLocked: true };
      entity.traits.set(TraitType.LOCKABLE, lockable as any);
      
      expect(entity.isLockable).toBe(true);
      expect(entity.isLocked).toBe(true);
    });
  });

  describe('light source properties', () => {
    it('should detect light provision', () => {
      expect(entity.providesLight).toBe(false);
      
      const lightSource = { type: TraitType.LIGHT_SOURCE, isLit: true };
      entity.traits.set(TraitType.LIGHT_SOURCE, lightSource as any);
      
      expect(entity.providesLight).toBe(true);
    });
  });

  describe('switchable properties', () => {
    it('should detect switchable state', () => {
      expect(entity.isSwitchable).toBe(false);
      expect(entity.isOn).toBe(false);
      
      const switchable = { type: TraitType.SWITCHABLE, isOn: true };
      entity.traits.set(TraitType.SWITCHABLE, switchable as any);
      
      expect(entity.isSwitchable).toBe(true);
      expect(entity.isOn).toBe(true);
    });
  });

  describe('actor properties', () => {
    it('should detect actors and players', () => {
      expect(entity.isActor).toBe(false);
      expect(entity.isPlayer).toBe(false);
      
      const actor = { type: TraitType.ACTOR, isPlayer: true };
      entity.traits.set(TraitType.ACTOR, actor as any);
      
      expect(entity.isActor).toBe(true);
      expect(entity.isPlayer).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid traits', () => {
      const invalidTrait = { notType: 'invalid' };
      
      expect(() => entity.add(invalidTrait as any)).toThrow('Invalid trait');
    });
  });
});

// tests/unit/behaviors/behavior.test.ts
// Tests for the Behavior class

import { Behavior } from '../../../src/behaviors/behavior';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../../src/traits/lockable/lockableTrait';

// Test behavior implementation
class TestBehavior extends Behavior {
  static requiredTraits: (TraitType | string)[] = [TraitType.IDENTITY, TraitType.CONTAINER];
  
  static performAction(entity: IFEntity): boolean {
    const identity = this.require<IdentityTrait>(entity, TraitType.IDENTITY);
    const container = this.require<ContainerTrait>(entity, TraitType.CONTAINER);
    
    // Example behavior logic
    return identity && container ? true : false;
  }
  
  static tryOptionalAction(entity: IFEntity): string {
    const openable = this.optional<OpenableTrait>(entity, TraitType.OPENABLE);
    
    if (openable) {
      return 'has openable';
    }
    return 'no openable';
  }
}

// Test behavior with no required traits
class SimpleBehavior extends Behavior {
  static requiredTraits: (TraitType | string)[] = [];
  
  static doSomething(entity: IFEntity): string {
    return `Doing something with ${entity.id}`;
  }
}

// Test behavior with single trait requirement
class SingleTraitBehavior extends Behavior {
  static requiredTraits: (TraitType | string)[] = [TraitType.LOCKABLE];
  
  static checkLocked(entity: IFEntity): boolean {
    const lockable = this.require<LockableTrait>(entity, TraitType.LOCKABLE);
    return (lockable as any).isLocked || false;
  }
}

describe('Behavior', () => {
  let entity: IFEntity;
  
  beforeEach(() => {
    entity = new IFEntity('test-entity', 'object');
  });

  describe('trait requirements', () => {
    it('should validate entity has required traits', () => {
      // Entity missing required traits
      expect(TestBehavior.validateEntity(entity)).toBe(false);
      
      // Add required traits
      entity.add(new IdentityTrait());
      entity.add(new ContainerTrait());
      
      expect(TestBehavior.validateEntity(entity)).toBe(true);
    });

    it('should get list of missing traits', () => {
      // All traits missing
      expect(TestBehavior.getMissingTraits(entity)).toEqual([
        TraitType.IDENTITY,
        TraitType.CONTAINER
      ]);
      
      // Add one trait
      entity.add(new IdentityTrait());
      expect(TestBehavior.getMissingTraits(entity)).toEqual([
        TraitType.CONTAINER
      ]);
      
      // Add remaining trait
      entity.add(new ContainerTrait());
      expect(TestBehavior.getMissingTraits(entity)).toEqual([]);
    });

    it('should work with behaviors having no requirements', () => {
      expect(SimpleBehavior.validateEntity(entity)).toBe(true);
      expect(SimpleBehavior.getMissingTraits(entity)).toEqual([]);
    });
  });

  describe('require helper', () => {
    it('should return trait when present', () => {
      entity.add(new IdentityTrait());
      entity.add(new ContainerTrait());
      
      expect(() => TestBehavior.performAction(entity)).not.toThrow();
      expect(TestBehavior.performAction(entity)).toBe(true);
    });

    it('should throw error when required trait is missing', () => {
      entity.add(new IdentityTrait());
      // Missing ContainerTrait
      
      expect(() => TestBehavior.performAction(entity)).toThrow(
        'Entity "test-entity" missing required trait: container'
      );
    });
  });

  describe('optional helper', () => {
    it('should return trait when present', () => {
      entity.add(new IdentityTrait());
      entity.add(new ContainerTrait());
      entity.add(new OpenableTrait());
      
      expect(TestBehavior.tryOptionalAction(entity)).toBe('has openable');
    });

    it('should return undefined when trait is missing', () => {
      entity.add(new IdentityTrait());
      entity.add(new ContainerTrait());
      // No OpenableTrait
      
      expect(TestBehavior.tryOptionalAction(entity)).toBe('no openable');
      expect(() => TestBehavior.tryOptionalAction(entity)).not.toThrow();
    });
  });

  describe('behavior patterns', () => {
    it('should support behaviors that check state', () => {
      const lockable = new LockableTrait();
      (lockable as any).isLocked = true;
      entity.add(lockable);
      
      expect(SingleTraitBehavior.checkLocked(entity)).toBe(true);
      
      (lockable as any).isLocked = false;
      expect(SingleTraitBehavior.checkLocked(entity)).toBe(false);
    });

    it('should support behaviors with no requirements', () => {
      const result = SimpleBehavior.doSomething(entity);
      expect(result).toBe('Doing something with test-entity');
    });
  });

  describe('inheritance', () => {
    // Test behavior extending another behavior
    class ExtendedBehavior extends TestBehavior {
      static requiredTraits: (TraitType | string)[] = [...TestBehavior.requiredTraits, TraitType.OPENABLE];
      
      static performExtendedAction(entity: IFEntity): string {
        // Call parent behavior
        const baseResult = this.performAction(entity);
        const openable = this.require<OpenableTrait>(entity, TraitType.OPENABLE);
        
        return baseResult ? 'extended success' : 'extended failure';
      }
    }

    it('should support behavior inheritance', () => {
      expect(ExtendedBehavior.requiredTraits).toEqual([
        TraitType.IDENTITY,
        TraitType.CONTAINER,
        TraitType.OPENABLE
      ]);
      
      entity.add(new IdentityTrait());
      entity.add(new ContainerTrait());
      entity.add(new OpenableTrait());
      
      expect(ExtendedBehavior.validateEntity(entity)).toBe(true);
      expect(ExtendedBehavior.performExtendedAction(entity)).toBe('extended success');
    });
  });

  describe('error messages', () => {
    it('should provide clear error messages for missing traits', () => {
      const entity2 = new IFEntity('named-entity', 'object');
      
      expect(() => TestBehavior.performAction(entity2)).toThrow(
        'Entity "named-entity" missing required trait: identity'
      );
    });
  });

  describe('static nature', () => {
    it('should not require instantiation', () => {
      // Behaviors are used as static utility classes
      expect(typeof TestBehavior.validateEntity).toBe('function');
      expect(typeof TestBehavior.performAction).toBe('function');
      
      // No need to create instances
      expect(() => new (TestBehavior as any)()).not.toThrow();
    });
  });
});

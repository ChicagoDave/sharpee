/**
 * Tests for Capability Dispatch System (ADR-090)
 */

import { IFEntity } from '../../../src/entities/if-entity';
import { ITrait } from '../../../src/traits/trait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import {
  findTraitWithCapability,
  hasCapability,
  getEntityCapabilities,
  traitHasCapability,
  getCapableTraits,
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilityEffect,
  createEffect,
  EntityBuilder,
  buildEntity
} from '../../../src/capabilities';

// Test trait with capabilities
class TestLowerableTrait implements ITrait {
  static readonly type = 'test.lowerable';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'] as const;
  readonly type = 'test.lowerable';

  position: 'up' | 'down' = 'up';
}

// Another test trait claiming same capability (for conflict testing)
class ConflictingTrait implements ITrait {
  static readonly type = 'test.conflicting';
  static readonly capabilities = ['if.action.lowering'] as const;
  readonly type = 'test.conflicting';
}

// Test trait without capabilities
class PlainTrait implements ITrait {
  static readonly type = 'test.plain';
  readonly type = 'test.plain';
}

// Test behavior
const testBehavior: CapabilityBehavior = {
  validate(entity: IFEntity, world: any, actorId: string, sharedData: any): CapabilityValidationResult {
    const trait = entity.get(TestLowerableTrait) as TestLowerableTrait;
    if (trait?.position === 'down') {
      return { valid: false, error: 'already_down' };
    }
    return { valid: true };
  },

  execute(entity: IFEntity, world: any, actorId: string, sharedData: any): void {
    const trait = entity.get(TestLowerableTrait) as TestLowerableTrait;
    if (trait) {
      trait.position = 'down';
    }
  },

  report(entity: IFEntity, world: any, actorId: string, sharedData: any): CapabilityEffect[] {
    return [createEffect('if.event.lowered', { target: entity.id })];
  },

  blocked(entity: IFEntity, world: any, actorId: string, error: string, sharedData: any): CapabilityEffect[] {
    return [createEffect('test.event.blocked', { messageId: error })];
  }
};

describe('Capability Helpers', () => {
  let entity: IFEntity;

  beforeEach(() => {
    entity = new IFEntity('test-1', 'object');
  });

  describe('findTraitWithCapability', () => {
    it('should find trait with matching capability', () => {
      entity.add(new TestLowerableTrait());

      const trait = findTraitWithCapability(entity, 'if.action.lowering');

      expect(trait).toBeDefined();
      expect(trait?.type).toBe('test.lowerable');
    });

    it('should return undefined if no trait has capability', () => {
      entity.add(new PlainTrait());

      const trait = findTraitWithCapability(entity, 'if.action.lowering');

      expect(trait).toBeUndefined();
    });

    it('should return undefined for empty entity', () => {
      const trait = findTraitWithCapability(entity, 'if.action.lowering');

      expect(trait).toBeUndefined();
    });
  });

  describe('hasCapability', () => {
    it('should return true if entity has trait with capability', () => {
      entity.add(new TestLowerableTrait());

      expect(hasCapability(entity, 'if.action.lowering')).toBe(true);
      expect(hasCapability(entity, 'if.action.raising')).toBe(true);
    });

    it('should return false if entity lacks capability', () => {
      entity.add(new PlainTrait());

      expect(hasCapability(entity, 'if.action.lowering')).toBe(false);
    });
  });

  describe('getEntityCapabilities', () => {
    it('should return all capabilities from all traits', () => {
      entity.add(new TestLowerableTrait());

      const caps = getEntityCapabilities(entity);

      expect(caps).toContain('if.action.lowering');
      expect(caps).toContain('if.action.raising');
      expect(caps).toHaveLength(2);
    });

    it('should return empty array for entity without capable traits', () => {
      entity.add(new PlainTrait());

      const caps = getEntityCapabilities(entity);

      expect(caps).toHaveLength(0);
    });
  });

  describe('traitHasCapability', () => {
    it('should return true for trait with capability', () => {
      const trait = new TestLowerableTrait();

      expect(traitHasCapability(trait, 'if.action.lowering')).toBe(true);
    });

    it('should return false for trait without capability', () => {
      const trait = new PlainTrait();

      expect(traitHasCapability(trait, 'if.action.lowering')).toBe(false);
    });

    it('should narrow type when traitType provided', () => {
      const trait: ITrait = new TestLowerableTrait();

      if (traitHasCapability(trait, 'if.action.lowering', TestLowerableTrait)) {
        // Type should be narrowed to TestLowerableTrait
        expect(trait.position).toBe('up');
      }
    });
  });

  describe('getCapableTraits', () => {
    it('should return only traits with capabilities', () => {
      entity.add(new TestLowerableTrait());
      entity.add(new PlainTrait());

      const capableTraits = getCapableTraits(entity);

      expect(capableTraits).toHaveLength(1);
      expect(capableTraits[0].type).toBe('test.lowerable');
    });
  });
});

// ADR-207: the capability-behavior binding map is owned by each WorldModel
// instance, not a process-global registry. These tests exercise the
// WorldModel methods directly — a fresh `world` per test gives isolation for
// free (AC-3), replacing the old clearCapabilityRegistry()-in-beforeEach
// pattern.
describe('WorldModel capability-behavior bindings (ADR-207)', () => {
  describe('registerCapabilityBehavior', () => {
    it('should register a behavior for trait+capability', () => {
      const world = new WorldModel();
      world.registerCapabilityBehavior(
        TestLowerableTrait.type,
        'if.action.lowering',
        testBehavior
      );

      const trait = new TestLowerableTrait();
      expect(world.getBehaviorForCapability(trait, 'if.action.lowering')).toBe(testBehavior);
    });

    it('should overwrite on re-registration, not throw (AC-4: idempotent, last-wins)', () => {
      const world = new WorldModel();
      const secondBehavior: CapabilityBehavior = {
        ...testBehavior,
        validate: () => ({ valid: false, error: 'second_behavior' })
      };

      world.registerCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering', testBehavior);

      expect(() => {
        world.registerCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering', secondBehavior);
      }).not.toThrow();

      const trait = new TestLowerableTrait();
      expect(world.getBehaviorForCapability(trait, 'if.action.lowering')).toBe(secondBehavior);
    });
  });

  describe('getBehaviorForCapability / getBehaviorBinding', () => {
    it('should return undefined for a capability with no registered behavior on this world (AC-10)', () => {
      const world = new WorldModel();
      const trait = new TestLowerableTrait();

      expect(world.getBehaviorForCapability(trait, 'if.action.lowering')).toBeUndefined();
      expect(world.getBehaviorBinding(TestLowerableTrait.type, 'if.action.lowering')).toBeUndefined();
    });

    it('should never throw for a missing binding (AC-10)', () => {
      const world = new WorldModel();
      const trait = new TestLowerableTrait();

      expect(() => world.getBehaviorForCapability(trait, 'if.action.lowering')).not.toThrow();
    });
  });

  describe('concurrency and isolation (AC-2, AC-3)', () => {
    it('should let two worlds bind the same trait+capability key to different behaviors independently (AC-2)', () => {
      const worldA = new WorldModel();
      const worldB = new WorldModel();
      const behaviorA: CapabilityBehavior = {
        ...testBehavior,
        validate: () => ({ valid: false, error: 'from_world_a' })
      };
      const behaviorB: CapabilityBehavior = {
        ...testBehavior,
        validate: () => ({ valid: false, error: 'from_world_b' })
      };

      worldA.registerCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering', behaviorA);
      worldB.registerCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering', behaviorB);

      const trait = new TestLowerableTrait();
      expect(worldA.getBehaviorForCapability(trait, 'if.action.lowering')).toBe(behaviorA);
      expect(worldB.getBehaviorForCapability(trait, 'if.action.lowering')).toBe(behaviorB);
    });

    it('should not leak or throw across sequential loads in one process (AC-3)', () => {
      const trait = new TestLowerableTrait();

      const firstLoad = new WorldModel();
      firstLoad.registerCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering', testBehavior);
      expect(firstLoad.getBehaviorForCapability(trait, 'if.action.lowering')).toBe(testBehavior);

      // A second "load" is a fresh WorldModel — registering the same key again
      // must neither throw (unlike the old globalThis registry) nor see the
      // first load's binding.
      const secondLoad = new WorldModel();
      expect(secondLoad.getBehaviorForCapability(trait, 'if.action.lowering')).toBeUndefined();
      expect(() => {
        secondLoad.registerCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering', testBehavior);
      }).not.toThrow();
    });
  });

  describe('persistence (AC-9)', () => {
    it('should not include capability bindings in getState()/setState() — bindings are code wiring, not save data', () => {
      const world = new WorldModel();
      world.registerCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering', testBehavior);

      const state = world.getState();
      expect(JSON.stringify(state)).not.toContain('if.action.lowering');

      // Re-running "init" registration after a simulated restore repopulates
      // the map — bindings are re-established by story code, not deserialized.
      const restored = new WorldModel();
      restored.setState(state);
      const trait = new TestLowerableTrait();
      expect(restored.getBehaviorForCapability(trait, 'if.action.lowering')).toBeUndefined();

      restored.registerCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering', testBehavior);
      expect(restored.getBehaviorForCapability(trait, 'if.action.lowering')).toBe(testBehavior);
    });
  });
});

describe('CapabilityBehavior', () => {
  let entity: IFEntity;
  let world: WorldModel;

  beforeEach(() => {
    entity = new IFEntity('test-1', 'object');
    entity.add(new TestLowerableTrait());
    world = new WorldModel();
    world.registerCapabilityBehavior(
      TestLowerableTrait.type,
      'if.action.lowering',
      testBehavior
    );
  });

  it('should validate successfully when preconditions met', () => {
    const sharedData = {};
    const result = testBehavior.validate(entity, null, 'player', sharedData);

    expect(result.valid).toBe(true);
  });

  it('should fail validation when preconditions not met', () => {
    const trait = entity.get(TestLowerableTrait) as TestLowerableTrait;
    trait.position = 'down';

    const sharedData = {};
    const result = testBehavior.validate(entity, null, 'player', sharedData);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('already_down');
  });

  it('should execute mutations', () => {
    const sharedData = {};
    testBehavior.execute(entity, null, 'player', sharedData);

    const trait = entity.get(TestLowerableTrait) as TestLowerableTrait;
    expect(trait.position).toBe('down');
  });

  it('should report success effects', () => {
    const sharedData = {};
    const effects = testBehavior.report(entity, null, 'player', sharedData);

    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('if.event.lowered');
    expect(effects[0].payload.target).toBe('test-1');
  });

  it('should report blocked effects', () => {
    const sharedData = {};
    const effects = testBehavior.blocked(entity, null, 'player', 'already_down', sharedData);

    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('test.event.blocked');
    expect(effects[0].payload.messageId).toBe('already_down');
  });
});

describe('EntityBuilder', () => {
  let entity: IFEntity;

  beforeEach(() => {
    entity = new IFEntity('test-1', 'object');
  });

  describe('add', () => {
    it('should add traits without capability conflicts', () => {
      const result = buildEntity(entity)
        .add(new TestLowerableTrait())
        .add(new PlainTrait())
        .build();

      expect(result.has('test.lowerable')).toBe(true);
      expect(result.has('test.plain')).toBe(true);
    });

    it('should throw on capability conflict', () => {
      expect(() => {
        buildEntity(entity)
          .add(new TestLowerableTrait())
          .add(new ConflictingTrait())
          .build();
      }).toThrow(/capability "if.action.lowering" already claimed/);
    });

    it('should track claimed capabilities', () => {
      const builder = new EntityBuilder(entity);
      builder.add(new TestLowerableTrait());

      const claimed = builder.getClaimedCapabilities();

      expect(claimed).toContain('if.action.lowering');
      expect(claimed).toContain('if.action.raising');
    });
  });

  describe('buildEntity helper', () => {
    it('should create builder from entity', () => {
      const result = buildEntity(entity)
        .add(new PlainTrait())
        .build();

      expect(result).toBe(entity);
      expect(result.has('test.plain')).toBe(true);
    });
  });
});

describe('createEffect helper', () => {
  it('should create effect object', () => {
    const effect = createEffect('test.event', { foo: 'bar' });

    expect(effect.type).toBe('test.event');
    expect(effect.payload).toEqual({ foo: 'bar' });
  });
});

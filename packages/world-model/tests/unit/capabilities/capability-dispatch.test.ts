/**
 * Tests for Capability Dispatch System (ADR-090)
 */

import { IFEntity } from '../../../src/entities/if-entity';
import { ITrait } from '../../../src/traits/trait';
import { TraitType } from '../../../src/traits/trait-types';
import {
  findTraitWithCapability,
  hasCapability,
  getEntityCapabilities,
  traitHasCapability,
  getCapableTraits,
  registerCapabilityBehavior,
  getBehaviorForCapability,
  hasCapabilityBehavior,
  unregisterCapabilityBehavior,
  clearCapabilityRegistry,
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
  validate(entity: IFEntity, world: any, actorId: string): CapabilityValidationResult {
    const trait = entity.get(TestLowerableTrait) as TestLowerableTrait;
    if (trait?.position === 'down') {
      return { valid: false, error: 'already_down' };
    }
    return { valid: true };
  },

  execute(entity: IFEntity, world: any, actorId: string): void {
    const trait = entity.get(TestLowerableTrait) as TestLowerableTrait;
    if (trait) {
      trait.position = 'down';
    }
  },

  report(entity: IFEntity, world: any, actorId: string): CapabilityEffect[] {
    return [createEffect('if.event.lowered', { target: entity.id })];
  },

  blocked(entity: IFEntity, world: any, actorId: string, error: string): CapabilityEffect[] {
    return [createEffect('action.blocked', { messageId: error })];
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

describe('Capability Registry', () => {
  beforeEach(() => {
    clearCapabilityRegistry();
  });

  afterEach(() => {
    clearCapabilityRegistry();
  });

  describe('registerCapabilityBehavior', () => {
    it('should register a behavior for trait+capability', () => {
      registerCapabilityBehavior(
        TestLowerableTrait.type,
        'if.action.lowering',
        testBehavior
      );

      expect(hasCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering')).toBe(true);
    });

    it('should throw on duplicate registration', () => {
      registerCapabilityBehavior(
        TestLowerableTrait.type,
        'if.action.lowering',
        testBehavior
      );

      expect(() => {
        registerCapabilityBehavior(
          TestLowerableTrait.type,
          'if.action.lowering',
          testBehavior
        );
      }).toThrow(/already registered/);
    });
  });

  describe('getBehaviorForCapability', () => {
    it('should return registered behavior', () => {
      registerCapabilityBehavior(
        TestLowerableTrait.type,
        'if.action.lowering',
        testBehavior
      );

      const trait = new TestLowerableTrait();
      const behavior = getBehaviorForCapability(trait, 'if.action.lowering');

      expect(behavior).toBe(testBehavior);
    });

    it('should return undefined for unregistered', () => {
      const trait = new TestLowerableTrait();
      const behavior = getBehaviorForCapability(trait, 'if.action.lowering');

      expect(behavior).toBeUndefined();
    });
  });

  describe('unregisterCapabilityBehavior', () => {
    it('should remove registered behavior', () => {
      registerCapabilityBehavior(
        TestLowerableTrait.type,
        'if.action.lowering',
        testBehavior
      );

      unregisterCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering');

      expect(hasCapabilityBehavior(TestLowerableTrait.type, 'if.action.lowering')).toBe(false);
    });
  });
});

describe('CapabilityBehavior', () => {
  let entity: IFEntity;

  beforeEach(() => {
    entity = new IFEntity('test-1', 'object');
    entity.add(new TestLowerableTrait());
    clearCapabilityRegistry();
    registerCapabilityBehavior(
      TestLowerableTrait.type,
      'if.action.lowering',
      testBehavior
    );
  });

  afterEach(() => {
    clearCapabilityRegistry();
  });

  it('should validate successfully when preconditions met', () => {
    const result = testBehavior.validate(entity, null, 'player');

    expect(result.valid).toBe(true);
  });

  it('should fail validation when preconditions not met', () => {
    const trait = entity.get(TestLowerableTrait) as TestLowerableTrait;
    trait.position = 'down';

    const result = testBehavior.validate(entity, null, 'player');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('already_down');
  });

  it('should execute mutations', () => {
    testBehavior.execute(entity, null, 'player');

    const trait = entity.get(TestLowerableTrait) as TestLowerableTrait;
    expect(trait.position).toBe('down');
  });

  it('should report success effects', () => {
    const effects = testBehavior.report(entity, null, 'player');

    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('if.event.lowered');
    expect(effects[0].payload.target).toBe('test-1');
  });

  it('should report blocked effects', () => {
    const effects = testBehavior.blocked(entity, null, 'player', 'already_down');

    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('action.blocked');
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

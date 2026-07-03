/**
 * Tests for per-world action-interceptor bindings (ADR-118 hooks, ADR-208
 * ownership).
 *
 * The interceptor binding map is owned by each WorldModel instance, not a
 * process-global registry. These tests exercise the WorldModel methods
 * directly — a fresh `world` per test gives isolation for free (AC-3); there
 * is no global registry left to clear.
 */

import { IFEntity } from '../../../src/entities/if-entity';
import { ITrait } from '../../../src/traits/trait';
import { WorldModel } from '../../../src/world/WorldModel';
import { AuthorModel } from '../../../src/world/AuthorModel';
import { ActionInterceptor } from '../../../src/capabilities';

// Test traits — plain trait-type carriers; interceptor bindings key off the
// instance `type` string.
class GuardedTrait implements ITrait {
  static readonly type = 'test.guarded';
  readonly type = 'test.guarded';
}

class OtherTrait implements ITrait {
  static readonly type = 'test.other';
  readonly type = 'test.other';
}

// Stateless interceptor definitions (ADR-118) — distinguishable by identity
// and by the error they return from preValidate.
const blockingInterceptor: ActionInterceptor = {
  preValidate: () => ({ valid: false, error: 'test.blocked' })
};

const secondInterceptor: ActionInterceptor = {
  preValidate: () => ({ valid: false, error: 'test.blocked_second' })
};

const lowPriorityInterceptor: ActionInterceptor = {
  preValidate: () => ({ valid: false, error: 'test.low_priority' })
};

describe('WorldModel action-interceptor bindings (ADR-208)', () => {
  describe('registerActionInterceptor', () => {
    it('should register an interceptor for trait+action', () => {
      const world = new WorldModel();
      world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);

      const entity = new IFEntity('test-1', 'object');
      entity.add(new GuardedTrait());

      const result = world.getInterceptorForAction(entity, 'if.action.taking');
      expect(result?.interceptor).toBe(blockingInterceptor);
      expect(result?.trait.type).toBe(GuardedTrait.type);
      expect(result?.binding.actionId).toBe('if.action.taking');
    });

    it('should overwrite on re-registration, not throw (AC-4: idempotent, last-wins)', () => {
      const world = new WorldModel();
      world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);

      expect(() => {
        world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', secondInterceptor);
      }).not.toThrow();

      const binding = world.getInterceptorBinding(GuardedTrait.type, 'if.action.taking');
      expect(binding?.interceptor).toBe(secondInterceptor);
      expect(world.getAllActionInterceptors().size).toBe(1);
    });

    it('should default priority to 0 and store an explicit priority', () => {
      const world = new WorldModel();
      world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);
      world.registerActionInterceptor(OtherTrait.type, 'if.action.taking', secondInterceptor, {
        priority: 100
      });

      expect(world.getInterceptorBinding(GuardedTrait.type, 'if.action.taking')?.priority).toBe(0);
      expect(world.getInterceptorBinding(OtherTrait.type, 'if.action.taking')?.priority).toBe(100);
    });
  });

  describe('getInterceptorForAction / getInterceptorBinding', () => {
    it('should return undefined for an entity with no bound interceptor (AC-10)', () => {
      const world = new WorldModel();
      const entity = new IFEntity('test-1', 'object');
      entity.add(new GuardedTrait());

      expect(world.getInterceptorForAction(entity, 'if.action.taking')).toBeUndefined();
      expect(world.getInterceptorBinding(GuardedTrait.type, 'if.action.taking')).toBeUndefined();
    });

    it('should never throw for a missing binding (AC-10)', () => {
      const world = new WorldModel();
      const entity = new IFEntity('test-1', 'object');

      expect(() => world.getInterceptorForAction(entity, 'if.action.taking')).not.toThrow();
      expect(() => world.getInterceptorBinding('no.such.trait', 'if.action.taking')).not.toThrow();
    });

    it('should pick the highest-priority binding across the entity traits (ADR-118 resolution)', () => {
      const world = new WorldModel();
      world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', lowPriorityInterceptor, {
        priority: 1
      });
      world.registerActionInterceptor(OtherTrait.type, 'if.action.taking', blockingInterceptor, {
        priority: 50
      });

      const entity = new IFEntity('test-1', 'object');
      entity.add(new GuardedTrait());
      entity.add(new OtherTrait());

      const result = world.getInterceptorForAction(entity, 'if.action.taking');
      expect(result?.interceptor).toBe(blockingInterceptor);
      expect(result?.trait.type).toBe(OtherTrait.type);
      expect(result?.binding.priority).toBe(50);
    });

    it('should only match bindings for the requested action', () => {
      const world = new WorldModel();
      world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);

      const entity = new IFEntity('test-1', 'object');
      entity.add(new GuardedTrait());

      expect(world.getInterceptorForAction(entity, 'if.action.opening')).toBeUndefined();
    });
  });

  describe('concurrency and isolation (AC-2, AC-3)', () => {
    it('should let two worlds bind the same trait+action key to different interceptors independently (AC-2)', () => {
      const worldA = new WorldModel();
      const worldB = new WorldModel();

      worldA.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);
      worldB.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', secondInterceptor);

      const entity = new IFEntity('test-1', 'object');
      entity.add(new GuardedTrait());

      expect(worldA.getInterceptorForAction(entity, 'if.action.taking')?.interceptor).toBe(
        blockingInterceptor
      );
      expect(worldB.getInterceptorForAction(entity, 'if.action.taking')?.interceptor).toBe(
        secondInterceptor
      );
    });

    it('should not leak or throw across sequential loads in one process (AC-3)', () => {
      const entity = new IFEntity('test-1', 'object');
      entity.add(new GuardedTrait());

      const firstLoad = new WorldModel();
      firstLoad.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);
      expect(firstLoad.getInterceptorForAction(entity, 'if.action.taking')?.interceptor).toBe(
        blockingInterceptor
      );

      // A second "load" is a fresh WorldModel — registering the same key again
      // must neither throw (unlike the old globalThis registry) nor see the
      // first load's binding.
      const secondLoad = new WorldModel();
      expect(secondLoad.getInterceptorForAction(entity, 'if.action.taking')).toBeUndefined();
      expect(() => {
        secondLoad.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);
      }).not.toThrow();
    });
  });

  describe('getAllActionInterceptors (introspection, AC-7 surface)', () => {
    it('should enumerate registered bindings keyed by traitType:actionId', () => {
      const world = new WorldModel();
      expect(world.getAllActionInterceptors().size).toBe(0);

      world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);
      world.registerActionInterceptor(GuardedTrait.type, 'if.action.opening', secondInterceptor);

      const bindings = world.getAllActionInterceptors();
      expect(bindings.size).toBe(2);
      const binding = bindings.get(`${GuardedTrait.type}:if.action.taking`);
      expect(binding?.interceptor).toBe(blockingInterceptor);
      expect(binding?.traitType).toBe(GuardedTrait.type);
      expect(binding?.actionId).toBe('if.action.taking');
    });

    it('should reflect the live per-world map through the AuthorModel delegate', () => {
      const world = new WorldModel();
      const author = new AuthorModel(world.getDataStore(), world);

      author.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);

      // Same map, visible from both surfaces — not a stale or empty copy.
      expect(author.getAllActionInterceptors().size).toBe(1);
      expect(
        world.getAllActionInterceptors().get(`${GuardedTrait.type}:if.action.taking`)?.interceptor
      ).toBe(blockingInterceptor);

      const entity = new IFEntity('test-1', 'object');
      entity.add(new GuardedTrait());
      expect(author.getInterceptorForAction(entity, 'if.action.taking')?.interceptor).toBe(
        blockingInterceptor
      );
      expect(author.getInterceptorBinding(GuardedTrait.type, 'if.action.taking')?.interceptor).toBe(
        blockingInterceptor
      );
    });
  });

  describe('persistence (AC-9)', () => {
    it('should not include interceptor bindings in getState()/setState() — bindings are code wiring, not save data', () => {
      const world = new WorldModel();
      world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);

      const state = world.getState();
      expect(JSON.stringify(state)).not.toContain(GuardedTrait.type);

      // Re-running "init" registration after a simulated restore repopulates
      // the map — bindings are re-established by story code, not deserialized.
      const restored = new WorldModel();
      restored.setState(state);
      const entity = new IFEntity('test-1', 'object');
      entity.add(new GuardedTrait());
      expect(restored.getInterceptorForAction(entity, 'if.action.taking')).toBeUndefined();

      restored.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', blockingInterceptor);
      expect(restored.getInterceptorForAction(entity, 'if.action.taking')?.interceptor).toBe(
        blockingInterceptor
      );
    });
  });
});

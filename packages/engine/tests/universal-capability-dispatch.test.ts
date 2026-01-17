/**
 * Tests for Universal Capability Dispatch
 *
 * Verifies that story traits can intercept standard stdlib actions
 * by declaring capabilities and registering behaviors.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkCapabilityDispatch,
  executeCapabilityValidate,
  executeCapabilityExecute,
  executeCapabilityReport,
  executeCapabilityBlocked
} from '../src/capability-dispatch-helper';
import {
  WorldModel,
  ITrait,
  IFEntity,
  registerCapabilityBehavior,
  unregisterCapabilityBehavior,
  clearCapabilityRegistry,
  CapabilityBehavior,
  CapabilitySharedData
} from '@sharpee/world-model';
import { ActionContext } from '@sharpee/stdlib';

// Test trait that claims 'if.action.taking' capability
class GuardedItemTrait implements ITrait {
  static readonly type = 'test.trait.guarded_item';
  static readonly capabilities = ['if.action.taking'] as const;

  readonly type = GuardedItemTrait.type;

  constructor(public canTake: boolean = false, public guardMessage: string = 'A guardian blocks you!') {}
}

// Test trait that claims 'if.action.going' capability (for blocking movement)
class BlockingTrait implements ITrait {
  static readonly type = 'test.trait.blocking';
  static readonly capabilities = ['if.action.going'] as const;

  readonly type = BlockingTrait.type;

  constructor(public isBlocking: boolean = true, public blockMessage: string = 'The way is blocked!') {}
}

// Helper to create a mock entity with traits
function createMockEntity(id: string, name: string, traits: ITrait[]): IFEntity {
  const traitMap = new Map<string, ITrait>();
  for (const trait of traits) {
    traitMap.set(trait.type, trait);
  }

  return {
    id,
    name,
    type: 'object',
    traits: traitMap,
    get<T extends ITrait>(type: string): T | undefined {
      return traitMap.get(type) as T | undefined;
    },
    has(type: string): boolean {
      return traitMap.has(type);
    }
  } as IFEntity;
}

// Behavior for GuardedItemTrait
const guardedItemBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    const trait = entity.get<GuardedItemTrait>(GuardedItemTrait.type);
    if (!trait) {
      return { valid: false, error: 'no_trait' };
    }

    if (!trait.canTake) {
      sharedData.blockReason = trait.guardMessage;
      return { valid: false, error: 'guardian_blocks', params: { message: trait.guardMessage } };
    }

    sharedData.validated = true;
    return { valid: true };
  },

  execute(entity, world, actorId, sharedData) {
    sharedData.executed = true;
    // In real implementation, would move item to inventory
  },

  report(entity, world, actorId, sharedData) {
    return [
      { type: 'item.taken', payload: { itemId: entity.id, itemName: entity.name } }
    ];
  },

  blocked(entity, world, actorId, error, sharedData) {
    return [
      { type: 'action.blocked', payload: { messageId: error, message: sharedData.blockReason || 'blocked' } }
    ];
  }
};

// Behavior for BlockingTrait
const blockingBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    const trait = entity.get<BlockingTrait>(BlockingTrait.type);
    if (!trait) {
      return { valid: false, error: 'no_trait' };
    }

    if (trait.isBlocking) {
      sharedData.blockReason = trait.blockMessage;
      return { valid: false, error: 'passage_blocked', params: { message: trait.blockMessage } };
    }

    return { valid: true };
  },

  execute(entity, world, actorId, sharedData) {
    // Allow passage through
  },

  report(entity, world, actorId, sharedData) {
    return [];
  },

  blocked(entity, world, actorId, error, sharedData) {
    return [
      { type: 'movement.blocked', payload: { messageId: error, message: sharedData.blockReason } }
    ];
  }
};

describe('Universal Capability Dispatch', () => {
  beforeEach(() => {
    // Register test behaviors
    registerCapabilityBehavior(GuardedItemTrait.type, 'if.action.taking', guardedItemBehavior);
    registerCapabilityBehavior(BlockingTrait.type, 'if.action.going', blockingBehavior);
  });

  afterEach(() => {
    // Clean up registered behaviors
    unregisterCapabilityBehavior(GuardedItemTrait.type, 'if.action.taking');
    unregisterCapabilityBehavior(BlockingTrait.type, 'if.action.going');
  });

  describe('checkCapabilityDispatch', () => {
    it('should return shouldDispatch=true for entity with matching capability', () => {
      const entity = createMockEntity('axe', 'bloody axe', [new GuardedItemTrait(false, 'The troll guards it!')]);

      const result = checkCapabilityDispatch('if.action.taking', entity);

      expect(result.shouldDispatch).toBe(true);
      expect(result.trait).toBeDefined();
      expect(result.behavior).toBeDefined();
      expect(result.entity).toBe(entity);
    });

    it('should return shouldDispatch=false for entity without capability', () => {
      const entity = createMockEntity('sword', 'rusty sword', []);

      const result = checkCapabilityDispatch('if.action.taking', entity);

      expect(result.shouldDispatch).toBe(false);
      expect(result.trait).toBeUndefined();
      expect(result.behavior).toBeUndefined();
    });

    it('should return shouldDispatch=false for undefined target', () => {
      const result = checkCapabilityDispatch('if.action.taking', undefined);

      expect(result.shouldDispatch).toBe(false);
    });

    it('should return shouldDispatch=false for unregistered capability', () => {
      const entity = createMockEntity('door', 'wooden door', [new GuardedItemTrait()]);

      // Check for a capability that's not registered
      const result = checkCapabilityDispatch('if.action.opening', entity);

      expect(result.shouldDispatch).toBe(false);
    });

    it('should find correct behavior for blocking trait', () => {
      const entity = createMockEntity('troll', 'nasty troll', [new BlockingTrait(true, 'The troll blocks your way!')]);

      const result = checkCapabilityDispatch('if.action.going', entity);

      expect(result.shouldDispatch).toBe(true);
      expect(result.trait?.type).toBe(BlockingTrait.type);
    });
  });

  describe('executeCapabilityValidate', () => {
    it('should delegate validation to behavior and return valid=true when allowed', () => {
      const entity = createMockEntity('unguarded', 'unguarded item', [new GuardedItemTrait(true)]);
      const check = checkCapabilityDispatch('if.action.taking', entity);

      const mockContext = {
        world: {} as WorldModel,
        player: { id: 'player-1' }
      } as ActionContext;

      const result = executeCapabilityValidate(check, mockContext);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as any).sharedData.validated).toBe(true);
    });

    it('should delegate validation to behavior and return valid=false when blocked', () => {
      const entity = createMockEntity('guarded', 'guarded item', [new GuardedItemTrait(false, 'Guardian says no!')]);
      const check = checkCapabilityDispatch('if.action.taking', entity);

      const mockContext = {
        world: {} as WorldModel,
        player: { id: 'player-1' }
      } as ActionContext;

      const result = executeCapabilityValidate(check, mockContext);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('guardian_blocks');
      expect(result.params?.message).toBe('Guardian says no!');
    });
  });

  describe('executeCapabilityExecute', () => {
    it('should call behavior execute phase', () => {
      const entity = createMockEntity('item', 'test item', [new GuardedItemTrait(true)]);
      const check = checkCapabilityDispatch('if.action.taking', entity);

      const mockContext = {
        world: {} as WorldModel,
        player: { id: 'player-1' },
        command: { directObject: { entity } }
      } as ActionContext;

      // First validate to populate data
      const validation = executeCapabilityValidate(check, mockContext);
      (mockContext as any).validationResult = validation;

      // Then execute
      executeCapabilityExecute(mockContext);

      expect((validation.data as any).sharedData.executed).toBe(true);
    });
  });

  describe('executeCapabilityReport', () => {
    it('should return events from behavior report phase', () => {
      const entity = createMockEntity('item', 'test item', [new GuardedItemTrait(true)]);
      const check = checkCapabilityDispatch('if.action.taking', entity);

      const mockContext = {
        world: {} as WorldModel,
        player: { id: 'player-1' },
        command: { directObject: { entity } },
        event: (type: string, payload: any) => ({ type, data: payload })
      } as unknown as ActionContext;

      // Validate to populate data
      const validation = executeCapabilityValidate(check, mockContext);
      (mockContext as any).validationResult = validation;

      // Execute
      executeCapabilityExecute(mockContext);

      // Report
      const events = executeCapabilityReport(mockContext);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('item.taken');
      expect(events[0].data.itemName).toBe('test item');
    });
  });

  describe('executeCapabilityBlocked', () => {
    it('should return blocked events from behavior', () => {
      const entity = createMockEntity('guarded', 'guarded item', [new GuardedItemTrait(false, 'No touching!')]);
      const check = checkCapabilityDispatch('if.action.taking', entity);

      const mockContext = {
        world: {} as WorldModel,
        player: { id: 'player-1' },
        command: { directObject: { entity } },
        event: (type: string, payload: any) => ({ type, data: payload })
      } as unknown as ActionContext;

      // Validate (will fail)
      const validation = executeCapabilityValidate(check, mockContext);
      (mockContext as any).validationResult = validation;

      // Get blocked events
      const events = executeCapabilityBlocked(mockContext, validation, 'if.action.taking');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.blocked');
      expect(events[0].data.message).toBe('No touching!');
    });
  });

  describe('integration scenarios', () => {
    it('should support troll blocking passage scenario', () => {
      const troll = createMockEntity('troll-1', 'nasty troll', [
        new BlockingTrait(true, 'The troll bars the way!')
      ]);

      // Check dispatch for going action with troll as target
      const check = checkCapabilityDispatch('if.action.going', troll);

      expect(check.shouldDispatch).toBe(true);

      // Validate - should be blocked
      const mockContext = {
        world: {} as WorldModel,
        player: { id: 'player-1' },
        command: { directObject: { entity: troll } },
        event: (type: string, payload: any) => ({ type, data: payload })
      } as unknown as ActionContext;

      const result = executeCapabilityValidate(check, mockContext);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('passage_blocked');
    });

    it('should support guarded treasure scenario', () => {
      const axe = createMockEntity('axe-1', 'bloody axe', [
        new GuardedItemTrait(false, 'The troll guards the axe fiercely!')
      ]);

      const check = checkCapabilityDispatch('if.action.taking', axe);
      expect(check.shouldDispatch).toBe(true);

      const mockContext = {
        world: {} as WorldModel,
        player: { id: 'player-1' },
        command: { directObject: { entity: axe } },
        event: (type: string, payload: any) => ({ type, data: payload })
      } as unknown as ActionContext;

      const result = executeCapabilityValidate(check, mockContext);
      expect(result.valid).toBe(false);
      expect(result.params?.message).toBe('The troll guards the axe fiercely!');
    });

    it('should allow taking unguarded items normally', () => {
      // Item without any capability trait - dispatch should not apply
      const sword = createMockEntity('sword-1', 'rusty sword', []);

      const check = checkCapabilityDispatch('if.action.taking', sword);
      expect(check.shouldDispatch).toBe(false);
      // Normal stdlib taking action would handle this
    });
  });
});

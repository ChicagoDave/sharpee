#!/bin/bash

echo "Fixing integration test file..."

cat > /mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/action-behaviors/pulling/pulling-refactored.integration.test.ts << 'EOF'
/**
 * Integration tests for pulling-refactored action
 * 
 * Tests the complete flow of the refactored pulling action with
 * the ActionBehavior system, including:
 * - Registry integration
 * - Behavior selection
 * - End-to-end action execution
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionBehaviorRegistry } from '../../../../src/action-behaviors/ActionBehaviorRegistry';
import { LeverPullBehavior } from '../../../../src/action-behaviors/pulling/LeverPullBehavior';
import { CordPullBehavior } from '../../../../src/action-behaviors/pulling/CordPullBehavior';
import { AttachedPullBehavior } from '../../../../src/action-behaviors/pulling/AttachedPullBehavior';
import { HeavyPullBehavior } from '../../../../src/action-behaviors/pulling/HeavyPullBehavior';
import { DefaultPullBehavior } from '../../../../src/action-behaviors/pulling/DefaultPullBehavior';
import { TraitType, LeverTrait, CordTrait, PullableTrait, AttachedTrait, MovableTrait, BellPullTrait } from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import { createMockContext } from '../../../../src/action-behaviors/utils';
import { createMockEntity } from '../test-helpers';

describe('Pulling Action with ActionBehaviors (Integration)', () => {
  let registry: ActionBehaviorRegistry;
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    registry = new ActionBehaviorRegistry();
    
    // Register all pulling behaviors
    registry.register(LeverPullBehavior, {
      action: 'pulling',
      tags: ['lever', 'mechanism']
    });
    
    registry.register(CordPullBehavior, {
      action: 'pulling',
      tags: ['cord', 'rope', 'bell']
    });
    
    registry.register(AttachedPullBehavior, {
      action: 'pulling',
      tags: ['attached', 'detach']
    });
    
    registry.register(HeavyPullBehavior, {
      action: 'pulling',
      tags: ['heavy', 'weight']
    });
    
    registry.register(DefaultPullBehavior, {
      action: 'pulling',
      tags: ['default', 'fallback']
    });

    context = createMockContext();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Registry Behavior Selection', () => {
    test('should select LeverPullBehavior for lever entities', () => {
      const lever = createMockEntity(
        'lever-1',
        'lever',
        new Map([
          [TraitType.LEVER, { type: TraitType.LEVER } as LeverTrait]
        ])
      );

      const behavior = registry.find(lever, 'pulling');
      expect(behavior).toBe(LeverPullBehavior);
    });

    test('should select CordPullBehavior for cord entities', () => {
      const cord = createMockEntity(
        'cord-1',
        'cord',
        new Map([
          [TraitType.CORD, { type: TraitType.CORD } as CordTrait]
        ])
      );

      const behavior = registry.find(cord, 'pulling');
      expect(behavior).toBe(CordPullBehavior);
    });

    test('should select AttachedPullBehavior for attached pullable entities', () => {
      const attached = createMockEntity(
        'poster-1',
        'poster',
        new Map([
          [TraitType.ATTACHED, { type: TraitType.ATTACHED } as AttachedTrait],
          [TraitType.PULLABLE, { type: TraitType.PULLABLE } as PullableTrait]
        ])
      );

      const behavior = registry.find(attached, 'pulling');
      expect(behavior).toBe(AttachedPullBehavior);
    });

    test('should select HeavyPullBehavior for heavy objects', () => {
      const heavy = createMockEntity(
        'boulder-1',
        'boulder',
        new Map([
          [TraitType.PULLABLE, { type: TraitType.PULLABLE, pullType: 'heavy' } as PullableTrait],
          [TraitType.MOVABLE, { type: TraitType.MOVABLE } as MovableTrait]
        ]),
        { weight: 500 }
      );

      const behavior = registry.find(heavy, 'pulling');
      expect(behavior).toBe(HeavyPullBehavior);
    });

    test('should select DefaultPullBehavior as fallback', () => {
      const basic = createMockEntity(
        'handle-1',
        'handle',
        new Map([
          [TraitType.PULLABLE, { type: TraitType.PULLABLE } as PullableTrait]
        ])
      );

      const behavior = registry.find(basic, 'pulling');
      expect(behavior).toBe(DefaultPullBehavior);
    });

    test('should respect priority ordering', () => {
      // Create an entity that could match multiple behaviors
      const multiMatch = createMockEntity(
        'complex-1',
        'complex',
        new Map([
          [TraitType.PULLABLE, { 
            type: TraitType.PULLABLE,
            pullType: 'cord'
          } as PullableTrait],
          [TraitType.CORD, { type: TraitType.CORD } as CordTrait]
        ]),
        { weight: 500 }
      );

      const behavior = registry.find(multiMatch, 'pulling');
      // CordPullBehavior has priority 8, HeavyPullBehavior has priority 3
      expect(behavior).toBe(CordPullBehavior);
    });
  });

  describe('End-to-End Action Flow', () => {
    test('should validate and execute lever pull', () => {
      const lever = createMockEntity(
        'lever-1',
        'control lever',
        new Map([
          [TraitType.LEVER, {
            type: TraitType.LEVER,
            position: 'up',
            stuck: false
          } as LeverTrait]
        ])
      );

      const behavior = registry.find(lever, 'pulling');
      expect(behavior).toBe(LeverPullBehavior);

      const validation = behavior!.validate(lever, context);
      expect(validation.valid).toBe(true);

      const result = behavior!.execute(lever, context);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('lever_pulled');
      expect(result.events).toHaveLength(1);
    });

    test('should validate and execute cord pull with bell', () => {
      const bellCord = createMockEntity(
        'bell-cord-1',
        'bell pull',
        new Map([
          [TraitType.CORD, {
            type: TraitType.CORD,
            breakable: false,
            connectedTo: 'bell'
          } as CordTrait],
          [TraitType.BELL_PULL, {
            type: TraitType.BELL_PULL,
            bellId: 'bell-1',
            soundDescription: 'DING!'
          } as BellPullTrait]
        ])
      );

      const behavior = registry.find(bellCord, 'pulling');
      expect(behavior).toBe(CordPullBehavior);

      const validation = behavior!.validate(bellCord, context);
      expect(validation.valid).toBe(true);

      const result = behavior!.execute(bellCord, context);
      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe('cord_pulled');
    });

    test('should handle behavior not found gracefully', () => {
      const nonPullable = createMockEntity(
        'table-1',
        'table',
        new Map()
      );

      const behavior = registry.find(nonPullable, 'pulling');
      expect(behavior).toBeNull();
    });
  });

  describe('Registry Management', () => {
    test('should list all registered behaviors', () => {
      const behaviors = registry.list();
      expect(behaviors).toHaveLength(5);
      expect(behaviors.map(b => b.name)).toContain('LeverPullBehavior');
      expect(behaviors.map(b => b.name)).toContain('CordPullBehavior');
      expect(behaviors.map(b => b.name)).toContain('AttachedPullBehavior');
      expect(behaviors.map(b => b.name)).toContain('HeavyPullBehavior');
      expect(behaviors.map(b => b.name)).toContain('DefaultPullBehavior');
    });

    test('should list behaviors by action', () => {
      const pullingBehaviors = registry.list('pulling');
      expect(pullingBehaviors).toHaveLength(5);

      const pushingBehaviors = registry.list('pushing');
      expect(pushingBehaviors).toHaveLength(0);
    });

    test('should list behaviors by tag', () => {
      const leverBehaviors = registry.list(undefined, 'lever');
      expect(leverBehaviors).toHaveLength(1);
      expect(leverBehaviors[0].name).toBe('LeverPullBehavior');

      const defaultBehaviors = registry.list(undefined, 'default');
      expect(leverBehaviors).toHaveLength(1);
      expect(defaultBehaviors[0].name).toBe('DefaultPullBehavior');
    });

    test('should clear registry', () => {
      expect(registry.list()).toHaveLength(5);
      registry.clear();
      expect(registry.list()).toHaveLength(0);
    });
  });

  describe('Multiple Behavior Matching', () => {
    test('should find all matching behaviors', () => {
      const pullable = createMockEntity(
        'generic-1',
        'pullable',
        new Map([
          [TraitType.PULLABLE, { type: TraitType.PULLABLE } as PullableTrait]
        ])
      );

      const behaviors = registry.findAll(pullable, 'pulling');
      // DefaultPullBehavior should match any pullable
      expect(behaviors).toContain(DefaultPullBehavior);
    });

    test('should order behaviors by priority', () => {
      const complexEntity = createMockEntity(
        'complex-2',
        'complex entity',
        new Map([
          [TraitType.LEVER, { type: TraitType.LEVER } as LeverTrait],
          [TraitType.PULLABLE, { type: TraitType.PULLABLE } as PullableTrait]
        ])
      );

      const behaviors = registry.findAll(complexEntity, 'pulling');
      expect(behaviors.length).toBeGreaterThanOrEqual(2);
      // LeverPullBehavior should come first (priority 10)
      expect(behaviors[0]).toBe(LeverPullBehavior);
      // DefaultPullBehavior should be later (priority 1)
      expect(behaviors[behaviors.length - 1]).toBe(DefaultPullBehavior);
    });
  });

  describe('Debug Support', () => {
    test('should provide debug information', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const lever = createMockEntity(
        'lever-debug',
        'debug lever',
        new Map([
          [TraitType.LEVER, { type: TraitType.LEVER } as LeverTrait]
        ])
      );

      // Enable debug mode
      process.env.DEBUG_BEHAVIORS = 'true';
      
      registry.find(lever, 'pulling');
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      delete process.env.DEBUG_BEHAVIORS;
    });
  });
});
EOF

echo "Integration test file has been fixed!"
#!/bin/bash

echo "Fixing remaining behavior test files..."

# Update HeavyPullBehavior.test.ts
cat > /mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/action-behaviors/pulling/HeavyPullBehavior.test.ts << 'EOF'
/**
 * Unit tests for HeavyPullBehavior
 * 
 * Tests heavy object pull mechanics including:
 * - Strength requirements
 * - Movement mechanics
 * - Effort messages
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { HeavyPullBehavior } from '../../../../src/action-behaviors/pulling/HeavyPullBehavior';
import { createMockContext } from '../../../../src/action-behaviors/utils';
import { TraitType, PullableTrait, MovableTrait } from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import { createMockEntity } from '../test-helpers';

describe('HeavyPullBehavior', () => {
  let context: ReturnType<typeof createMockContext>;
  let heavyObject: IFEntity;

  beforeEach(() => {
    context = createMockContext();
    heavyObject = createMockEntity(
      'boulder-1',
      'boulder',
      new Map([
        [TraitType.PULLABLE, {
          type: TraitType.PULLABLE,
          pullType: 'heavy'
        } as PullableTrait],
        [TraitType.MOVABLE, {
          type: TraitType.MOVABLE,
          requiresStrength: 15
        } as MovableTrait]
      ]),
      { weight: 500 }
    );
  });

  describe('canHandle', () => {
    test('should handle heavy objects (weight > 50)', () => {
      const heavy = createMockEntity(
        'crate-1',
        'heavy crate',
        new Map([
          [TraitType.MOVABLE, {
            type: TraitType.MOVABLE
          } as MovableTrait]
        ]),
        { weight: 75 }
      );
      expect(HeavyPullBehavior.canHandle(heavy, 'pulling')).toBe(true);
    });

    test('should handle pullable with heavy type', () => {
      expect(HeavyPullBehavior.canHandle(heavyObject, 'pulling')).toBe(true);
    });

    test('should not handle light pullable entities', () => {
      const light = createMockEntity(
        'box-1',
        'small box',
        new Map([
          [TraitType.PULLABLE, {
            type: TraitType.PULLABLE
          } as PullableTrait]
        ]),
        { weight: 10 }
      );
      expect(HeavyPullBehavior.canHandle(light, 'pulling')).toBe(false);
    });

    test('should not handle non-pullable heavy entities', () => {
      const nonPullable = createMockEntity(
        'statue-1',
        'statue',
        new Map(),
        { weight: 200 }
      );
      expect(HeavyPullBehavior.canHandle(nonPullable, 'pulling')).toBe(false);
    });

    test('should only handle pulling action', () => {
      expect(HeavyPullBehavior.canHandle(heavyObject, 'pushing')).toBe(false);
    });
  });

  describe('validate', () => {
    test('should validate movable heavy object with sufficient strength', () => {
      context.actor = { ...context.actor, strength: 20 };
      const result = HeavyPullBehavior.validate(heavyObject, context);
      expect(result.valid).toBe(true);
    });

    test('should reject heavy object with insufficient strength', () => {
      context.actor = { ...context.actor, strength: 5 };
      const result = HeavyPullBehavior.validate(heavyObject, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('too_heavy');
    });

    test('should reject immovable heavy object', () => {
      const immovable = createMockEntity(
        'wall-1',
        'stone wall',
        new Map([
          [TraitType.PULLABLE, {
            type: TraitType.PULLABLE,
            pullType: 'heavy'
          } as PullableTrait]
        ]),
        { weight: 1000 }
      );
      
      context.actor = { ...context.actor, strength: 50 };
      const result = HeavyPullBehavior.validate(immovable, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('immovable');
    });

    test('should reject if object is being worn', () => {
      context.actor = { ...context.actor, wearing: ['boulder-1'], strength: 20 };
      const result = HeavyPullBehavior.validate(heavyObject, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('wearing_it');
    });
  });

  describe('execute', () => {
    test('should pull heavy object in specified direction', () => {
      context.actor = { ...context.actor, strength: 20 };
      context.command.direction = 'north';
      
      const result = HeavyPullBehavior.execute(heavyObject, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('heavy_pulled_direction');
      expect(result.params).toEqual({ direction: 'north' });
      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toMatchObject({
        type: 'object_pulled',
        data: {
          entity: heavyObject.id,
          direction: 'north'
        }
      });
      expect(result.events[1]).toMatchObject({
        type: 'object_moved',
        data: {
          entity: heavyObject.id,
          direction: 'north'
        }
      });
    });

    test('should pull heavy object without direction', () => {
      context.actor = { ...context.actor, strength: 20 };
      
      const result = HeavyPullBehavior.execute(heavyObject, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('heavy_pulled');
      expect(result.events).toHaveLength(1);
    });

    test('should show effort for very heavy objects', () => {
      const veryHeavy = createMockEntity(
        'massive-1',
        'massive boulder',
        new Map([
          [TraitType.PULLABLE, {
            type: TraitType.PULLABLE,
            pullType: 'heavy'
          } as PullableTrait],
          [TraitType.MOVABLE, {
            type: TraitType.MOVABLE,
            requiresStrength: 19
          } as MovableTrait]
        ]),
        { weight: 900 }
      );
      
      context.actor = { ...context.actor, strength: 20 };
      
      const result = HeavyPullBehavior.execute(veryHeavy, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('heavy_pulled_with_effort');
    });

    test('should handle partial movement', () => {
      const stuck = createMockEntity(
        'stuck-1',
        'stuck crate',
        new Map([
          [TraitType.PULLABLE, {
            type: TraitType.PULLABLE,
            pullType: 'heavy',
            partialMovement: true
          } as PullableTrait],
          [TraitType.MOVABLE, {
            type: TraitType.MOVABLE
          } as MovableTrait]
        ]),
        { weight: 100 }
      );
      
      context.actor = { ...context.actor, strength: 15 };
      
      const result = HeavyPullBehavior.execute(stuck, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('heavy_pulled_partially');
    });
  });

  describe('priority', () => {
    test('should have low priority as specialized handler', () => {
      expect(HeavyPullBehavior.priority).toBe(3);
    });
  });
});
EOF

echo "HeavyPullBehavior.test.ts updated"

# Update LeverPullBehavior.test.ts
cat > /mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/action-behaviors/pulling/LeverPullBehavior.test.ts << 'EOF'
/**
 * Unit tests for LeverPullBehavior
 * 
 * Tests lever-specific pull mechanics including:
 * - Basic lever pulling
 * - Spring-loaded levers
 * - Stuck levers
 * - Toggle states
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { LeverPullBehavior } from '../../../../src/action-behaviors/pulling/LeverPullBehavior';
import { createMockContext } from '../../../../src/action-behaviors/utils';
import { TraitType, LeverTrait } from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import { createMockEntity } from '../test-helpers';

describe('LeverPullBehavior', () => {
  let context: ReturnType<typeof createMockContext>;
  let lever: IFEntity;

  beforeEach(() => {
    context = createMockContext();
    lever = createMockEntity(
      'lever-1',
      'brass lever',
      new Map([
        [TraitType.LEVER, {
          type: TraitType.LEVER,
          position: 'up',
          springLoaded: false,
          stuck: false
        } as LeverTrait]
      ])
    );
  });

  describe('canHandle', () => {
    test('should handle entities with LEVER trait', () => {
      expect(LeverPullBehavior.canHandle(lever, 'pulling')).toBe(true);
    });

    test('should not handle entities without LEVER trait', () => {
      const nonLever = createMockEntity('switch-1', 'switch', new Map());
      expect(LeverPullBehavior.canHandle(nonLever, 'pulling')).toBe(false);
    });

    test('should only handle pulling action', () => {
      expect(LeverPullBehavior.canHandle(lever, 'pushing')).toBe(false);
    });
  });

  describe('validate', () => {
    test('should validate pullable lever', () => {
      const result = LeverPullBehavior.validate(lever, context);
      expect(result.valid).toBe(true);
    });

    test('should reject stuck lever', () => {
      const stuckLever = createMockEntity(
        'stuck-lever-1',
        'rusty lever',
        new Map([
          [TraitType.LEVER, {
            type: TraitType.LEVER,
            position: 'up',
            stuck: true
          } as LeverTrait]
        ])
      );

      const result = LeverPullBehavior.validate(stuckLever, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('lever_stuck');
    });

    test('should handle lever already in down position', () => {
      const downLever = createMockEntity(
        'down-lever-1',
        'lever',
        new Map([
          [TraitType.LEVER, {
            type: TraitType.LEVER,
            position: 'down'
          } as LeverTrait]
        ])
      );

      const result = LeverPullBehavior.validate(downLever, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('lever_already_down');
    });
  });

  describe('execute', () => {
    test('should pull lever from up to down', () => {
      const result = LeverPullBehavior.execute(lever, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('lever_pulled');
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        type: 'lever_moved',
        data: {
          entity: lever.id,
          from: 'up',
          to: 'down'
        }
      });
    });

    test('should handle spring-loaded lever', () => {
      const springLever = createMockEntity(
        'spring-lever-1',
        'spring lever',
        new Map([
          [TraitType.LEVER, {
            type: TraitType.LEVER,
            position: 'up',
            springLoaded: true,
            springDelay: 2000
          } as LeverTrait]
        ])
      );

      const result = LeverPullBehavior.execute(springLever, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('lever_pulled_spring');
      expect(result.events).toHaveLength(2);
      expect(result.events[1]).toMatchObject({
        type: 'lever_spring_back',
        data: {
          entity: springLever.id,
          delay: 2000
        }
      });
    });

    test('should handle lever with special effect', () => {
      const effectLever = createMockEntity(
        'effect-lever-1',
        'mysterious lever',
        new Map([
          [TraitType.LEVER, {
            type: TraitType.LEVER,
            position: 'up',
            connectedTo: 'secret_door',
            onPull: 'A rumbling sound echoes through the room.'
          } as LeverTrait]
        ])
      );

      const result = LeverPullBehavior.execute(effectLever, context);
      
      expect(result.success).toBe(true);
      expect(result.additionalMessage).toBe('A rumbling sound echoes through the room.');
      expect(result.events).toHaveLength(2);
      expect(result.events[1]).toMatchObject({
        type: 'mechanism_activated',
        data: {
          mechanismId: 'secret_door'
        }
      });
    });

    test('should toggle lever position', () => {
      const toggleLever = createMockEntity(
        'toggle-lever-1',
        'toggle lever',
        new Map([
          [TraitType.LEVER, {
            type: TraitType.LEVER,
            position: 'middle',
            positions: ['up', 'middle', 'down']
          } as LeverTrait]
        ])
      );

      const result = LeverPullBehavior.execute(toggleLever, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('lever_toggled');
      expect(result.params).toEqual({ from: 'middle', to: 'down' });
    });
  });

  describe('priority', () => {
    test('should have highest priority as specialized handler', () => {
      expect(LeverPullBehavior.priority).toBe(10);
    });
  });
});
EOF

echo "LeverPullBehavior.test.ts updated"

echo "All test files have been fixed!"
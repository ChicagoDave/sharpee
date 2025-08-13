#!/bin/bash

# Fix all behavior test files to use createMockEntity helper

echo "Fixing behavior test files to use createMockEntity helper..."

# Update CordPullBehavior.test.ts
cat > /mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/action-behaviors/pulling/CordPullBehavior.test.ts << 'EOF'
/**
 * Unit tests for CordPullBehavior
 * 
 * Tests cord-specific pull mechanics including:
 * - Basic cord pulling
 * - Bell pull cords
 * - Breakable cords
 * - Ropes and chains
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CordPullBehavior } from '../../../../src/action-behaviors/pulling/CordPullBehavior';
import { createMockContext } from '../../../../src/action-behaviors/utils';
import { TraitType, CordTrait, BellPullTrait, PullableTrait } from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import { createMockEntity } from '../test-helpers';

describe('CordPullBehavior', () => {
  let context: ReturnType<typeof createMockContext>;
  let cord: IFEntity;

  beforeEach(() => {
    context = createMockContext();
    cord = createMockEntity(
      'cord-1',
      'rope',
      new Map([
        [TraitType.CORD, {
          type: TraitType.CORD,
          breakable: false,
          maxPulls: undefined
        } as CordTrait]
      ])
    );
  });

  describe('canHandle', () => {
    test('should handle entities with CORD trait', () => {
      expect(CordPullBehavior.canHandle(cord, 'pulling')).toBe(true);
    });

    test('should handle entities with PULLABLE trait of cord type', () => {
      const pullableCord = createMockEntity(
        'pullable-cord',
        'chain',
        new Map([
          [TraitType.PULLABLE, {
            type: TraitType.PULLABLE,
            pullType: 'cord'
          } as PullableTrait]
        ])
      );
      expect(CordPullBehavior.canHandle(pullableCord, 'pulling')).toBe(true);
    });

    test('should not handle entities without cord-related traits', () => {
      const nonCord = createMockEntity('non-cord', 'thing', new Map());
      expect(CordPullBehavior.canHandle(nonCord, 'pulling')).toBe(false);
    });

    test('should only handle pulling action', () => {
      expect(CordPullBehavior.canHandle(cord, 'pushing')).toBe(false);
    });
  });

  describe('validate', () => {
    test('should validate pullable cord', () => {
      const result = CordPullBehavior.validate(cord, context);
      expect(result.valid).toBe(true);
    });

    test('should handle bell pull cords', () => {
      const bellPull = createMockEntity(
        'bell-pull-1',
        'bell pull',
        new Map([
          [TraitType.CORD, {
            type: TraitType.CORD,
            connectedTo: 'bell'
          } as CordTrait],
          [TraitType.BELL_PULL, {
            type: TraitType.BELL_PULL,
            bellId: 'bell-1',
            soundDescription: 'DING!'
          } as BellPullTrait]
        ])
      );

      const result = CordPullBehavior.validate(bellPull, context);
      expect(result.valid).toBe(true);
    });

    test('should reject broken cord', () => {
      const brokenCord = createMockEntity(
        'broken-cord-1',
        'frayed rope',
        new Map([
          [TraitType.CORD, {
            type: TraitType.CORD,
            broken: true
          } as CordTrait]
        ])
      );

      const result = CordPullBehavior.validate(brokenCord, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('cord_broken');
    });

    test('should check pull count for limited cords', () => {
      const limitedCord = createMockEntity(
        'limited-cord-1',
        'old rope',
        new Map([
          [TraitType.CORD, {
            type: TraitType.CORD,
            breakable: true,
            maxPulls: 3,
            pullCount: 3
          } as CordTrait]
        ])
      );

      const result = CordPullBehavior.validate(limitedCord, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('cord_at_limit');
    });
  });

  describe('execute', () => {
    test('should pull basic cord', () => {
      const result = CordPullBehavior.execute(cord, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('cord_pulled');
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        type: 'cord_pulled',
        data: {
          entity: cord.id
        }
      });
    });

    test('should ring bell when pulling bell cord', () => {
      const bellPull = createMockEntity(
        'bell-pull-1',
        'bell pull',
        new Map([
          [TraitType.CORD, {
            type: TraitType.CORD,
            connectedTo: 'bell'
          } as CordTrait],
          [TraitType.BELL_PULL, {
            type: TraitType.BELL_PULL,
            bellId: 'bell-1',
            soundDescription: 'DING DONG!'
          } as BellPullTrait]
        ])
      );

      const result = CordPullBehavior.execute(bellPull, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('bell_rang');
      expect(result.additionalMessage).toBe('DING DONG!');
      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toMatchObject({
        type: 'cord_pulled',
        data: {
          entity: bellPull.id
        }
      });
      expect(result.events[1]).toMatchObject({
        type: 'bell_rang',
        data: {
          bellId: 'bell-1',
          sound: 'DING DONG!'
        }
      });
    });

    test('should handle breakable cord', () => {
      const breakableCord = createMockEntity(
        'breakable-cord-1',
        'frayed rope',
        new Map([
          [TraitType.CORD, {
            type: TraitType.CORD,
            breakable: true,
            maxPulls: 2,
            pullCount: 1
          } as CordTrait]
        ])
      );

      const result = CordPullBehavior.execute(breakableCord, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('cord_about_to_break');
      expect(result.params).toEqual({ remaining: 1 });
    });

    test('should break cord at limit', () => {
      const aboutToBreak = createMockEntity(
        'about-to-break-1',
        'frayed rope',
        new Map([
          [TraitType.CORD, {
            type: TraitType.CORD,
            breakable: true,
            maxPulls: 1,
            pullCount: 0
          } as CordTrait]
        ])
      );

      const result = CordPullBehavior.execute(aboutToBreak, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('cord_broke');
      expect(result.events).toHaveLength(2);
      expect(result.events[1]).toMatchObject({
        type: 'cord_broke',
        data: {
          entity: aboutToBreak.id
        }
      });
    });
  });

  describe('priority', () => {
    test('should have high priority as specialized handler', () => {
      expect(CordPullBehavior.priority).toBe(8);
    });
  });
});
EOF

echo "CordPullBehavior.test.ts updated"

echo "All test files have been updated to use createMockEntity helper"
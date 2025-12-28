/**
 * Tests for SchedulerService (ADR-071)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SchedulerService,
  createSchedulerService,
  Daemon,
  Fuse,
  SchedulerContext,
} from '../../../src/scheduler';
import { WorldModel, IFEntity } from '@sharpee/world-model';

// Mock WorldModel
function createMockWorld(): WorldModel {
  return {
    getLocation: vi.fn().mockReturnValue('room-1'),
    getEntity: vi.fn().mockReturnValue(null),
    getPlayer: vi.fn().mockReturnValue({ id: 'player' }),
    getAllEntities: vi.fn().mockReturnValue([]),
    getContents: vi.fn().mockReturnValue([]),
  } as unknown as WorldModel;
}

describe('SchedulerService', () => {
  let scheduler: SchedulerService;
  let mockWorld: WorldModel;

  beforeEach(() => {
    scheduler = new SchedulerService(12345); // Fixed seed for determinism
    mockWorld = createMockWorld();
    vi.clearAllMocks();
  });

  describe('daemon management', () => {
    it('should register a daemon', () => {
      const daemon: Daemon = {
        id: 'test-daemon',
        name: 'Test Daemon',
        run: () => [],
      };

      scheduler.registerDaemon(daemon);
      expect(scheduler.hasDaemon('test-daemon')).toBe(true);
    });

    it('should throw when registering duplicate daemon ID', () => {
      const daemon: Daemon = {
        id: 'test-daemon',
        name: 'Test Daemon',
        run: () => [],
      };

      scheduler.registerDaemon(daemon);
      expect(() => scheduler.registerDaemon(daemon)).toThrow();
    });

    it('should remove a daemon', () => {
      const daemon: Daemon = {
        id: 'test-daemon',
        name: 'Test Daemon',
        run: () => [],
      };

      scheduler.registerDaemon(daemon);
      scheduler.removeDaemon('test-daemon');
      expect(scheduler.hasDaemon('test-daemon')).toBe(false);
    });

    it('should pause and resume a daemon', () => {
      const runFn = vi.fn().mockReturnValue([]);
      const daemon: Daemon = {
        id: 'test-daemon',
        name: 'Test Daemon',
        run: runFn,
      };

      scheduler.registerDaemon(daemon);

      // Run once
      scheduler.tick(mockWorld, 1, 'player');
      expect(runFn).toHaveBeenCalledTimes(1);

      // Pause and run again
      scheduler.pauseDaemon('test-daemon');
      scheduler.tick(mockWorld, 2, 'player');
      expect(runFn).toHaveBeenCalledTimes(1); // Still 1, didn't run

      // Resume and run again
      scheduler.resumeDaemon('test-daemon');
      scheduler.tick(mockWorld, 3, 'player');
      expect(runFn).toHaveBeenCalledTimes(2);
    });

    it('should run daemons in priority order', () => {
      const order: string[] = [];

      scheduler.registerDaemon({
        id: 'low',
        name: 'Low Priority',
        priority: 1,
        run: () => {
          order.push('low');
          return [];
        },
      });

      scheduler.registerDaemon({
        id: 'high',
        name: 'High Priority',
        priority: 10,
        run: () => {
          order.push('high');
          return [];
        },
      });

      scheduler.registerDaemon({
        id: 'medium',
        name: 'Medium Priority',
        priority: 5,
        run: () => {
          order.push('medium');
          return [];
        },
      });

      scheduler.tick(mockWorld, 1, 'player');

      expect(order).toEqual(['high', 'medium', 'low']);
    });

    it('should only run daemon if condition is met', () => {
      const runFn = vi.fn().mockReturnValue([]);
      let shouldRun = false;

      scheduler.registerDaemon({
        id: 'conditional',
        name: 'Conditional Daemon',
        condition: () => shouldRun,
        run: runFn,
      });

      scheduler.tick(mockWorld, 1, 'player');
      expect(runFn).not.toHaveBeenCalled();

      shouldRun = true;
      scheduler.tick(mockWorld, 2, 'player');
      expect(runFn).toHaveBeenCalledTimes(1);
    });

    it('should remove runOnce daemons after first successful run', () => {
      const runFn = vi.fn().mockReturnValue([{ type: 'test' }]);

      scheduler.registerDaemon({
        id: 'once',
        name: 'Run Once Daemon',
        runOnce: true,
        run: runFn,
      });

      scheduler.tick(mockWorld, 1, 'player');
      expect(runFn).toHaveBeenCalledTimes(1);
      expect(scheduler.hasDaemon('once')).toBe(false);
    });
  });

  describe('fuse management', () => {
    it('should set a fuse', () => {
      const fuse: Fuse = {
        id: 'test-fuse',
        name: 'Test Fuse',
        turns: 3,
        trigger: () => [],
      };

      scheduler.setFuse(fuse);
      expect(scheduler.hasFuse('test-fuse')).toBe(true);
      expect(scheduler.getFuseRemaining('test-fuse')).toBe(3);
    });

    it('should count down and trigger fuse', () => {
      const triggerFn = vi.fn().mockReturnValue([{ type: 'fuse.triggered' }]);

      scheduler.setFuse({
        id: 'countdown',
        name: 'Countdown Fuse',
        turns: 3,
        trigger: triggerFn,
      });

      // Turn 1: 3 -> 2
      let result = scheduler.tick(mockWorld, 1, 'player');
      expect(scheduler.getFuseRemaining('countdown')).toBe(2);
      expect(triggerFn).not.toHaveBeenCalled();

      // Turn 2: 2 -> 1
      result = scheduler.tick(mockWorld, 2, 'player');
      expect(scheduler.getFuseRemaining('countdown')).toBe(1);
      expect(triggerFn).not.toHaveBeenCalled();

      // Turn 3: 1 -> 0 (triggers)
      result = scheduler.tick(mockWorld, 3, 'player');
      expect(triggerFn).toHaveBeenCalledTimes(1);
      expect(result.fusesTriggered).toContain('countdown');
      expect(scheduler.hasFuse('countdown')).toBe(false); // Removed after trigger
    });

    it('should cancel a fuse and call onCancel', () => {
      const cancelFn = vi.fn().mockReturnValue([{ type: 'fuse.cancelled' }]);
      const triggerFn = vi.fn().mockReturnValue([]);

      scheduler.setFuse({
        id: 'cancellable',
        name: 'Cancellable Fuse',
        turns: 5,
        trigger: triggerFn,
        onCancel: cancelFn,
      });

      const events = scheduler.cancelFuse('cancellable');

      expect(cancelFn).toHaveBeenCalled();
      expect(events).toHaveLength(1);
      expect(scheduler.hasFuse('cancellable')).toBe(false);
    });

    it('should adjust fuse turns', () => {
      scheduler.setFuse({
        id: 'adjustable',
        name: 'Adjustable Fuse',
        turns: 5,
        trigger: () => [],
      });

      expect(scheduler.getFuseRemaining('adjustable')).toBe(5);

      scheduler.adjustFuse('adjustable', -2);
      expect(scheduler.getFuseRemaining('adjustable')).toBe(3);

      scheduler.adjustFuse('adjustable', 10);
      expect(scheduler.getFuseRemaining('adjustable')).toBe(13);
    });

    it('should pause and resume a fuse', () => {
      const triggerFn = vi.fn().mockReturnValue([]);

      scheduler.setFuse({
        id: 'pausable',
        name: 'Pausable Fuse',
        turns: 2,
        trigger: triggerFn,
      });

      // Tick once
      scheduler.tick(mockWorld, 1, 'player');
      expect(scheduler.getFuseRemaining('pausable')).toBe(1);

      // Pause and tick
      scheduler.pauseFuse('pausable');
      scheduler.tick(mockWorld, 2, 'player');
      expect(scheduler.getFuseRemaining('pausable')).toBe(1); // Didn't decrement

      // Resume and tick
      scheduler.resumeFuse('pausable');
      scheduler.tick(mockWorld, 3, 'player');
      expect(triggerFn).toHaveBeenCalled();
    });

    it('should respect tickCondition', () => {
      const triggerFn = vi.fn().mockReturnValue([]);
      let shouldTick = false;

      scheduler.setFuse({
        id: 'conditional',
        name: 'Conditional Fuse',
        turns: 2,
        trigger: triggerFn,
        tickCondition: () => shouldTick,
      });

      // Condition false - doesn't tick
      scheduler.tick(mockWorld, 1, 'player');
      expect(scheduler.getFuseRemaining('conditional')).toBe(2);

      // Condition true - ticks
      shouldTick = true;
      scheduler.tick(mockWorld, 2, 'player');
      expect(scheduler.getFuseRemaining('conditional')).toBe(1);
    });

    it('should repeat fuses', () => {
      const triggerFn = vi.fn().mockReturnValue([{ type: 'heartbeat' }]);

      scheduler.setFuse({
        id: 'repeating',
        name: 'Repeating Fuse',
        turns: 2,
        repeat: true,
        trigger: triggerFn,
      });

      // First cycle
      scheduler.tick(mockWorld, 1, 'player');
      scheduler.tick(mockWorld, 2, 'player');
      expect(triggerFn).toHaveBeenCalledTimes(1);
      expect(scheduler.hasFuse('repeating')).toBe(true);
      expect(scheduler.getFuseRemaining('repeating')).toBe(2); // Reset

      // Second cycle
      scheduler.tick(mockWorld, 3, 'player');
      scheduler.tick(mockWorld, 4, 'player');
      expect(triggerFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('entity cleanup', () => {
    it('should cancel fuses bound to entity', () => {
      const cancelFn = vi.fn().mockReturnValue([]);

      scheduler.setFuse({
        id: 'entity-fuse',
        name: 'Entity Bound Fuse',
        turns: 5,
        trigger: () => [],
        onCancel: cancelFn,
        entityId: 'lantern',
      });

      scheduler.setFuse({
        id: 'other-fuse',
        name: 'Other Fuse',
        turns: 5,
        trigger: () => [],
      });

      scheduler.cleanupEntity('lantern');

      expect(scheduler.hasFuse('entity-fuse')).toBe(false);
      expect(scheduler.hasFuse('other-fuse')).toBe(true);
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  describe('serialization', () => {
    it('should save and restore state', () => {
      scheduler.registerDaemon({
        id: 'test-daemon',
        name: 'Test Daemon',
        run: () => [],
      });

      scheduler.setFuse({
        id: 'test-fuse',
        name: 'Test Fuse',
        turns: 5,
        trigger: () => [],
      });

      // Tick a few times
      scheduler.tick(mockWorld, 1, 'player');
      scheduler.tick(mockWorld, 2, 'player');

      // Save state
      const state = scheduler.getState();

      expect(state.turn).toBe(2);
      expect(state.fuses).toHaveLength(1);
      expect(state.fuses[0].turnsRemaining).toBe(3);
      expect(state.daemons).toHaveLength(1);

      // Create new scheduler and restore
      const newScheduler = new SchedulerService();

      // Must re-register daemons/fuses before restoring state
      newScheduler.registerDaemon({
        id: 'test-daemon',
        name: 'Test Daemon',
        run: () => [],
      });

      newScheduler.setFuse({
        id: 'test-fuse',
        name: 'Test Fuse',
        turns: 5,
        trigger: () => [],
      });

      newScheduler.setState(state);

      expect(newScheduler.getFuseRemaining('test-fuse')).toBe(3);
    });
  });

  describe('seeded random', () => {
    it('should provide deterministic random', () => {
      const random = scheduler.getRandom();

      // With fixed seed, should get same sequence
      const values: number[] = [];
      for (let i = 0; i < 5; i++) {
        values.push(random.int(1, 100));
      }

      // Reset seed and verify same sequence
      random.setSeed(12345);
      for (let i = 0; i < 5; i++) {
        expect(random.int(1, 100)).toBe(values[i]);
      }
    });

    it('should provide chance function', () => {
      const random = scheduler.getRandom();
      random.setSeed(12345);

      // With probability 1, always true
      expect(random.chance(1)).toBe(true);

      // With probability 0, always false
      expect(random.chance(0)).toBe(false);
    });

    it('should pick from array', () => {
      const random = scheduler.getRandom();
      random.setSeed(12345);

      const items = ['a', 'b', 'c', 'd', 'e'];
      const picked = random.pick(items);

      expect(items).toContain(picked);
    });

    it('should shuffle array', () => {
      const random = scheduler.getRandom();
      random.setSeed(12345);

      const items = [1, 2, 3, 4, 5];
      const shuffled = random.shuffle(items);

      // Same elements
      expect(shuffled.sort()).toEqual(items.sort());

      // Different order (statistically very likely)
      // We just verify it returns the right length
      expect(shuffled.length).toBe(items.length);
    });
  });

  describe('introspection', () => {
    it('should return active daemons info', () => {
      scheduler.registerDaemon({
        id: 'daemon-1',
        name: 'Daemon One',
        priority: 5,
        run: () => [],
      });

      scheduler.registerDaemon({
        id: 'daemon-2',
        name: 'Daemon Two',
        priority: 10,
        run: () => [],
      });

      scheduler.pauseDaemon('daemon-1');

      const infos = scheduler.getActiveDaemons();

      expect(infos).toHaveLength(2);
      expect(infos[0].id).toBe('daemon-2'); // Higher priority first
      expect(infos[0].priority).toBe(10);
      expect(infos[1].id).toBe('daemon-1');
      expect(infos[1].isPaused).toBe(true);
    });

    it('should return active fuses info', () => {
      scheduler.setFuse({
        id: 'fuse-1',
        name: 'Fuse One',
        turns: 5,
        priority: 1,
        trigger: () => [],
      });

      scheduler.setFuse({
        id: 'fuse-2',
        name: 'Fuse Two',
        turns: 3,
        priority: 10,
        repeat: true,
        trigger: () => [],
      });

      scheduler.tick(mockWorld, 1, 'player');

      const infos = scheduler.getActiveFuses();

      expect(infos).toHaveLength(2);
      expect(infos[0].id).toBe('fuse-2'); // Higher priority first
      expect(infos[0].turnsRemaining).toBe(2);
      expect(infos[0].repeat).toBe(true);
      expect(infos[1].turnsRemaining).toBe(4);
    });
  });
});

describe('createSchedulerService', () => {
  it('should create a scheduler service', () => {
    const scheduler = createSchedulerService();
    expect(scheduler).toBeDefined();
    expect(scheduler.hasDaemon).toBeDefined();
    expect(scheduler.setFuse).toBeDefined();
  });

  it('should accept optional seed', () => {
    const scheduler1 = createSchedulerService(12345);
    const scheduler2 = createSchedulerService(12345);

    const random1 = scheduler1.getRandom();
    const random2 = scheduler2.getRandom();

    // Same seed should produce same sequence
    expect(random1.next()).toBe(random2.next());
  });
});

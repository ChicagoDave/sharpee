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
} from '@sharpee/plugin-scheduler';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { EngineRandomService } from '../../../src/engine-random-service';

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
  let testRandom: EngineRandomService;

  beforeEach(() => {
    scheduler = new SchedulerService();
    testRandom = new EngineRandomService(12345); // Fixed master seed for determinism
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
      scheduler.tick(mockWorld, 1, 'player', testRandom);
      expect(runFn).toHaveBeenCalledTimes(1);

      // Pause and run again
      scheduler.pauseDaemon('test-daemon');
      scheduler.tick(mockWorld, 2, 'player', testRandom);
      expect(runFn).toHaveBeenCalledTimes(1); // Still 1, didn't run

      // Resume and run again
      scheduler.resumeDaemon('test-daemon');
      scheduler.tick(mockWorld, 3, 'player', testRandom);
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

      scheduler.tick(mockWorld, 1, 'player', testRandom);

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

      scheduler.tick(mockWorld, 1, 'player', testRandom);
      expect(runFn).not.toHaveBeenCalled();

      shouldRun = true;
      scheduler.tick(mockWorld, 2, 'player', testRandom);
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

      scheduler.tick(mockWorld, 1, 'player', testRandom);
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

      // Turn 1: skipped (skipNextTick — fuse doesn't count the turn it was set)
      let result = scheduler.tick(mockWorld, 1, 'player', testRandom);
      expect(scheduler.getFuseRemaining('countdown')).toBe(3);
      expect(triggerFn).not.toHaveBeenCalled();

      // Turn 2: 3 -> 2
      result = scheduler.tick(mockWorld, 2, 'player', testRandom);
      expect(scheduler.getFuseRemaining('countdown')).toBe(2);
      expect(triggerFn).not.toHaveBeenCalled();

      // Turn 3: 2 -> 1
      result = scheduler.tick(mockWorld, 3, 'player', testRandom);
      expect(scheduler.getFuseRemaining('countdown')).toBe(1);
      expect(triggerFn).not.toHaveBeenCalled();

      // Turn 4: 1 -> 0 (triggers)
      result = scheduler.tick(mockWorld, 4, 'player', testRandom);
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

      // Tick 1: skipped (skipNextTick)
      scheduler.tick(mockWorld, 1, 'player', testRandom);
      expect(scheduler.getFuseRemaining('pausable')).toBe(2);

      // Tick 2: 2 -> 1
      scheduler.tick(mockWorld, 2, 'player', testRandom);
      expect(scheduler.getFuseRemaining('pausable')).toBe(1);

      // Pause and tick
      scheduler.pauseFuse('pausable');
      scheduler.tick(mockWorld, 3, 'player', testRandom);
      expect(scheduler.getFuseRemaining('pausable')).toBe(1); // Didn't decrement

      // Resume and tick — 1 -> 0 (triggers)
      scheduler.resumeFuse('pausable');
      scheduler.tick(mockWorld, 4, 'player', testRandom);
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
      scheduler.tick(mockWorld, 1, 'player', testRandom);
      expect(scheduler.getFuseRemaining('conditional')).toBe(2);

      // Condition true - ticks
      shouldTick = true;
      scheduler.tick(mockWorld, 2, 'player', testRandom);
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

      // Tick 1: skipped (skipNextTick)
      scheduler.tick(mockWorld, 1, 'player', testRandom);
      // Ticks 2-3: countdown 2 -> 1 -> 0 (triggers)
      scheduler.tick(mockWorld, 2, 'player', testRandom);
      scheduler.tick(mockWorld, 3, 'player', testRandom);
      expect(triggerFn).toHaveBeenCalledTimes(1);
      expect(scheduler.hasFuse('repeating')).toBe(true);
      expect(scheduler.getFuseRemaining('repeating')).toBe(2); // Reset

      // Second cycle (no skipNextTick on repeat reset)
      scheduler.tick(mockWorld, 4, 'player', testRandom);
      scheduler.tick(mockWorld, 5, 'player', testRandom);
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
      scheduler.tick(mockWorld, 1, 'player', testRandom);
      scheduler.tick(mockWorld, 2, 'player', testRandom);

      // Save state
      const state = scheduler.getState();

      expect(state.turn).toBe(2);
      expect(state.fuses).toHaveLength(1);
      expect(state.fuses[0].turnsRemaining).toBe(4); // turns=5, tick 1 skipped, tick 2 decremented once
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

      expect(newScheduler.getFuseRemaining('test-fuse')).toBe(4); // matches saved state
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

      scheduler.tick(mockWorld, 1, 'player', testRandom);

      const infos = scheduler.getActiveFuses();

      expect(infos).toHaveLength(2);
      expect(infos[0].id).toBe('fuse-2'); // Higher priority first
      expect(infos[0].turnsRemaining).toBe(3); // tick 1 skipped (skipNextTick)
      expect(infos[0].repeat).toBe(true);
      expect(infos[1].turnsRemaining).toBe(5); // tick 1 skipped (skipNextTick)
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

  it('owns no stream of its own (ADR-293) — the tick context carries the passed RandomService', () => {
    const service = createSchedulerService();
    const passed = new EngineRandomService(777);
    let seen: unknown = null;

    service.registerDaemon({
      id: 'capture-random',
      name: 'Capture Random',
      run: (ctx) => {
        seen = ctx.random;
        return [];
      },
    });
    service.tick(createMockWorld(), 1, 'player', passed);

    expect(seen).toBe(passed);
  });
});

/**
 * Tests for SceneEvaluationPlugin (ADR-149 Phase 6+7).
 *
 * Covers: scene activation, deactivation, recurring scenes, activeTurns
 * tracking, event emission, condition errors, multiple simultaneous scenes.
 * Owner context: @sharpee/engine — turn cycle
 */

import { SceneEvaluationPlugin } from '../../src/scene-evaluation-plugin';
import { WorldModel, SceneTrait, TraitType, EntityType } from '@sharpee/world-model';
import { createSeededRandom } from '@sharpee/core';
import type { TurnPluginContext } from '@sharpee/plugins';

function makeContext(world: WorldModel, turn: number): TurnPluginContext {
  return {
    world,
    turn,
    playerId: 'player',
    playerLocation: 'r01',
    random: createSeededRandom(),
  };
}

describe('SceneEvaluationPlugin', () => {
  let plugin: SceneEvaluationPlugin;
  let world: WorldModel;

  beforeEach(() => {
    plugin = new SceneEvaluationPlugin();
    world = new WorldModel();
  });

  it('should have correct id and priority', () => {
    expect(plugin.id).toBe('sharpee.scene-evaluation');
    expect(plugin.priority).toBe(60);
  });

  it('should return empty array when no scenes registered', () => {
    const events = plugin.onAfterAction(makeContext(world, 1));

    expect(events).toEqual([]);
  });

  describe('scene activation', () => {
    it('should activate a waiting scene when begin() returns true', () => {
      world.createScene('scene-flood', {
        name: 'The Flood',
        begin: () => true,
        end: () => false,
      });

      const events = plugin.onAfterAction(makeContext(world, 5));

      // Verify state mutation
      const trait = world.getEntity('scene-flood')!.get<SceneTrait>(TraitType.SCENE)!;
      expect(trait.state).toBe('active');
      expect(trait.activeTurns).toBe(1);
      expect(trait.beganAtTurn).toBe(5);

      // Verify event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('if.event.scene_began');
      expect((events[0].data as any).sceneId).toBe('scene-flood');
      expect((events[0].data as any).sceneName).toBe('The Flood');
      expect((events[0].data as any).turn).toBe(5);
    });

    it('should NOT activate a waiting scene when begin() returns false', () => {
      world.createScene('scene-flood', {
        name: 'The Flood',
        begin: () => false,
        end: () => false,
      });

      const events = plugin.onAfterAction(makeContext(world, 1));

      const trait = world.getEntity('scene-flood')!.get<SceneTrait>(TraitType.SCENE)!;
      expect(trait.state).toBe('waiting');
      expect(events).toHaveLength(0);
    });
  });

  describe('activeTurns tracking', () => {
    it('should increment activeTurns each turn the scene is active', () => {
      world.createScene('scene-flood', {
        name: 'The Flood',
        begin: () => true,
        end: () => false,
      });

      // Turn 1: activates (activeTurns = 1)
      plugin.onAfterAction(makeContext(world, 1));
      expect(world.getEntity('scene-flood')!.get<SceneTrait>(TraitType.SCENE)!.activeTurns).toBe(1);

      // Turn 2: increments (activeTurns = 2)
      plugin.onAfterAction(makeContext(world, 2));
      expect(world.getEntity('scene-flood')!.get<SceneTrait>(TraitType.SCENE)!.activeTurns).toBe(2);

      // Turn 3: increments (activeTurns = 3)
      plugin.onAfterAction(makeContext(world, 3));
      expect(world.getEntity('scene-flood')!.get<SceneTrait>(TraitType.SCENE)!.activeTurns).toBe(3);
    });
  });

  describe('scene deactivation', () => {
    it('should end an active scene when end() returns true', () => {
      let shouldEnd = false;
      world.createScene('scene-flood', {
        name: 'The Flood',
        begin: () => true,
        end: () => shouldEnd,
      });

      // Turn 1: activate
      plugin.onAfterAction(makeContext(world, 1));

      // Turn 2: still active
      plugin.onAfterAction(makeContext(world, 2));

      // Turn 3: end it
      shouldEnd = true;
      const events = plugin.onAfterAction(makeContext(world, 3));

      const trait = world.getEntity('scene-flood')!.get<SceneTrait>(TraitType.SCENE)!;
      expect(trait.state).toBe('ended');
      expect(trait.endedAtTurn).toBe(3);
      expect(trait.activeTurns).toBe(0);

      // Verify event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('if.event.scene_ended');
      expect((events[0].data as any).sceneId).toBe('scene-flood');
      expect((events[0].data as any).totalTurns).toBe(2);
    });

    it('should not re-evaluate an ended non-recurring scene', () => {
      let beginCount = 0;
      world.createScene('scene-flood', {
        name: 'The Flood',
        begin: () => { beginCount++; return true; },
        end: () => true,
      });

      // Turn 1: activate + immediately end
      plugin.onAfterAction(makeContext(world, 1));
      // begin fires once (activates), end fires (ends)

      // Turn 2: should not fire begin again
      const prevCount = beginCount;
      plugin.onAfterAction(makeContext(world, 2));

      const trait = world.getEntity('scene-flood')!.get<SceneTrait>(TraitType.SCENE)!;
      expect(trait.state).toBe('ended');
      expect(beginCount).toBe(prevCount); // begin NOT called again
    });
  });

  describe('recurring scenes', () => {
    it('should transition to waiting (not ended) for recurring scenes', () => {
      world.createScene('scene-patrol', {
        name: 'Guard Patrol',
        begin: () => true,
        end: () => true,
        recurring: true,
      });

      // Turn 1: activate
      plugin.onAfterAction(makeContext(world, 1));
      // Same turn: end evaluates on active, transitions to waiting

      // After one full cycle, should be back to waiting
      const trait = world.getEntity('scene-patrol')!.get<SceneTrait>(TraitType.SCENE)!;
      // activate on turn 1, then end evaluates next turn
      // Actually on turn 1, it activates. On turn 2, end() fires and it goes back to waiting
      plugin.onAfterAction(makeContext(world, 2));

      expect(trait.state).toBe('waiting');
      expect(trait.endedAtTurn).toBe(2);
    });

    it('should re-activate a recurring scene after it ends', () => {
      let cycle = 0;
      world.createScene('scene-patrol', {
        name: 'Guard Patrol',
        begin: () => true,
        end: () => cycle > 0, // ends after first active turn
        recurring: true,
      });

      // Turn 1: activate (cycle=0, end=false)
      plugin.onAfterAction(makeContext(world, 1));
      expect(world.getEntity('scene-patrol')!.get<SceneTrait>(TraitType.SCENE)!.state).toBe('active');

      // Turn 2: end (cycle=1)
      cycle = 1;
      plugin.onAfterAction(makeContext(world, 2));
      expect(world.getEntity('scene-patrol')!.get<SceneTrait>(TraitType.SCENE)!.state).toBe('waiting');

      // Turn 3: re-activate
      plugin.onAfterAction(makeContext(world, 3));
      expect(world.getEntity('scene-patrol')!.get<SceneTrait>(TraitType.SCENE)!.state).toBe('active');
      expect(world.getEntity('scene-patrol')!.get<SceneTrait>(TraitType.SCENE)!.beganAtTurn).toBe(3);
    });
  });

  describe('multiple simultaneous scenes', () => {
    it('should evaluate all scenes independently', () => {
      world.createScene('scene-a', {
        name: 'Scene A',
        begin: () => true,
        end: () => false,
      });
      world.createScene('scene-b', {
        name: 'Scene B',
        begin: () => true,
        end: () => false,
      });

      const events = plugin.onAfterAction(makeContext(world, 1));

      expect(world.isSceneActive('scene-a')).toBe(true);
      expect(world.isSceneActive('scene-b')).toBe(true);
      expect(events).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should skip scene if begin condition throws', () => {
      world.createScene('scene-broken', {
        name: 'Broken',
        begin: () => { throw new Error('oops'); },
        end: () => false,
      });

      const events = plugin.onAfterAction(makeContext(world, 1));

      expect(world.getEntity('scene-broken')!.get<SceneTrait>(TraitType.SCENE)!.state).toBe('waiting');
      expect(events).toHaveLength(0);
    });

    it('should skip end if end condition throws', () => {
      let shouldBegin = true;
      world.createScene('scene-broken', {
        name: 'Broken',
        begin: () => shouldBegin,
        end: () => { throw new Error('oops'); },
      });

      // Turn 1: activate
      plugin.onAfterAction(makeContext(world, 1));
      shouldBegin = false;

      // Turn 2: end throws — scene stays active, activeTurns increments
      const events = plugin.onAfterAction(makeContext(world, 2));

      const trait = world.getEntity('scene-broken')!.get<SceneTrait>(TraitType.SCENE)!;
      expect(trait.state).toBe('active');
      expect(trait.activeTurns).toBe(2);
      expect(events).toHaveLength(0);
    });

    it('should skip scene if entity was removed', () => {
      world.createScene('scene-temp', {
        name: 'Temporary',
        begin: () => true,
        end: () => false,
      });

      world.removeEntity('scene-temp');

      const events = plugin.onAfterAction(makeContext(world, 1));
      expect(events).toHaveLength(0);
    });
  });
});

/**
 * Golden test for the pulling action.
 *
 * A thing can be pulled when it carries the marker (`PullableTrait`) or when
 * an interceptor claims the pull for it; what the pull does is that
 * interceptor's to say, and a pull succeeds every time (GH #706). Phases are driven through the phase runner, the path the
 * engine's executor takes, so interceptor hooks fire.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { pullingAction } from '../../../src/actions/standard/pulling';
import { IFActions } from '../../../src/actions/constants';
import { runValidatePhase } from '../../../src/actions/lifecycle/phase-runner';
import { TraitType, WorldModel, IFEntity, PullableTrait, WearableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  createCommand,
  addTestMarker,
  TEST_MARKER_TRAIT
} from '../../test-utils';

describe('pullingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(pullingAction.id).toBe(IFActions.PULLING);
    });

    test('should declare exactly the messages it can emit', () => {
      expect([...(pullingAction.requiredMessages ?? [])].sort()).toEqual([
        'cant_pull_that',
        'detached',
        'no_target',
        'not_reachable',
        'not_visible',
        'pulled',
        'wont_budge',
        'worn'
      ]);
    });

    test('should belong to interaction group', () => {
      expect(pullingAction.group).toBe('interaction');
    });
  });

  describe('Validation', () => {
    let world: WorldModel;
    let player: IFEntity;
    let room: IFEntity;

    beforeEach(() => {
      const setup = setupBasicWorld();
      world = setup.world;
      player = setup.player;
      room = setup.room;
    });

    test('should fail when no target specified', () => {
      const command = createCommand(IFActions.PULLING);
      const context = createRealTestContext(pullingAction, world, command);

      const result = runValidatePhase(pullingAction, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_target');
    });

    test('should fail when target is not pullable', () => {
      const box = world.createEntity('box', 'object');
      world.moveEntity(box.id, room.id);
      expect(box.has(TraitType.PULLABLE)).toBe(false);

      const command = createCommand(IFActions.PULLING, { entity: box });
      const context = createRealTestContext(pullingAction, world, command);

      const result = runValidatePhase(pullingAction, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('cant_pull_that');
    });

    test('should fail when pulling worn items', () => {
      const shirt = world.createEntity('shirt', 'object');
      shirt.add(new WearableTrait({ isWorn: true }));
      shirt.add(new PullableTrait());
      world.moveEntity(shirt.id, player.id);

      const command = createCommand(IFActions.PULLING, { entity: shirt });
      const context = createRealTestContext(pullingAction, world, command);

      const result = runValidatePhase(pullingAction, context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('worn');
    });
  });

  describe('Execution', () => {
    let world: WorldModel;
    let room: IFEntity;

    beforeEach(() => {
      const setup = setupBasicWorld();
      world = setup.world;
      room = setup.room;
    });

    /** Pull `target` once through the full lifecycle and return the events. */
    const pull = (target: IFEntity) => {
      const command = createCommand(IFActions.PULLING, { entity: target });
      const context = createRealTestContext(pullingAction, world, command);
      return executeWithValidation(pullingAction, context);
    };

    test('should emit the pulled event and nothing else', () => {
      const rope = world.createEntity('rope', 'object');
      rope.add(new PullableTrait());
      world.moveEntity(rope.id, room.id);

      const events = pull(rope);
      expect(events).toHaveLength(1);
      expectEvent(events, 'if.event.pulled', {
        target: rope.id,
        targetName: 'rope',
        messageId: `${pullingAction.id}.pulled`,
        params: { target: { name: 'rope' } }
      });
      expect(events[0].data).not.toHaveProperty('blocked');
    });

    test('should succeed on every pull, reaching the interceptor each time', () => {
      const rope = world.createEntity('rope', 'object');
      rope.add(new PullableTrait());
      addTestMarker(rope);
      world.moveEntity(rope.id, room.id);

      const reached = { postValidate: 0, postExecute: 0 };
      world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.PULLING, {
        postValidate() {
          reached.postValidate++;
          return null;
        },
        postExecute() {
          reached.postExecute++;
        }
      });

      for (let attempt = 1; attempt <= 3; attempt++) {
        const events = pull(rope);
        expectEvent(events, 'if.event.pulled', {
          target: rope.id,
          messageId: `${pullingAction.id}.pulled`
        });
        expect(events[0].data).not.toHaveProperty('blocked');
        expect(reached).toEqual({ postValidate: attempt, postExecute: attempt });
      }
    });

    test('should leave the thing where it is and its marker unchanged', () => {
      const rope = world.createEntity('rope', 'object');
      rope.add(new PullableTrait());
      world.moveEntity(rope.id, room.id);

      pull(rope);
      pull(rope);

      expect(world.getLocation(rope.id)).toBe(room.id);
      expect(Object.keys(rope.get(TraitType.PULLABLE)!)).toEqual(['type']);
    });

    test('a thing with no marker is pulled when an interceptor claims the pull', () => {
      const statue = world.createEntity('statue', 'object');
      addTestMarker(statue);
      world.moveEntity(statue.id, room.id);
      expect(statue.has(TraitType.PULLABLE)).toBe(false);

      const reached = { postValidate: 0, postExecute: 0 };
      world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.PULLING, {
        claims: (target) => target.id === statue.id,
        postValidate() {
          reached.postValidate++;
          return null;
        },
        postExecute(_target, w) {
          reached.postExecute++;
          w.setStateValue('statue.pulls', reached.postExecute);
        }
      });

      for (let attempt = 1; attempt <= 2; attempt++) {
        const events = pull(statue);
        expectEvent(events, 'if.event.pulled', {
          target: statue.id,
          messageId: `${pullingAction.id}.pulled`
        });
        expect(events[0].data).not.toHaveProperty('blocked');
        expect(reached).toEqual({ postValidate: attempt, postExecute: attempt });
        expect(world.getStateValue('statue.pulls')).toBe(attempt);
      }
      // The pull did not make it pullable: the interceptor is its only say.
      expect(statue.has(TraitType.PULLABLE)).toBe(false);
    });

    test('an interceptor that does not claim the thing leaves it unpullable', () => {
      const statue = world.createEntity('statue', 'object');
      addTestMarker(statue);
      world.moveEntity(statue.id, room.id);

      const reached = { postValidate: 0, postExecute: 0 };
      world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.PULLING, {
        claims: () => false,
        postValidate() {
          reached.postValidate++;
          return null;
        },
        postExecute() {
          reached.postExecute++;
        }
      });

      const events = pull(statue);
      expectEvent(events, 'if.event.pulled', {
        blocked: true,
        reason: 'cant_pull_that',
        targetId: statue.id
      });
      expect(reached).toEqual({ postValidate: 0, postExecute: 0 });
    });
  });
});

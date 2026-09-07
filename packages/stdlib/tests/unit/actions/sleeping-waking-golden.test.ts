/**
 * Golden tests for the sleeping and waking actions — signal pattern
 * (P-15, GH #362; plan secret-letter-port-platform-defects Phase 7).
 *
 * Both actions:
 * - always validate (lifecycle hooks aside)
 * - mutate nothing
 * - report one event carrying the stock line as its message id
 * - consult the actor's ROOM through their lifecycle descriptor, so a
 *   room-registered interceptor (a Chord `on the player sleeping`) fires
 *
 * Behavior Statement (sleepingAction / wakingAction):
 *   DOES    emit `if.event.slept` / `if.event.woken` with message id
 *           `<action>.not_tired` / `<action>.already_awake` and the actor's
 *           location; mutates nothing.
 *   WHEN    the player types sleep / wake, in any room.
 *   BECAUSE a story reacts through the room's interceptor; with no reaction,
 *           the stock line stands.
 *   REJECTS only on an interceptor veto, with the veto's error and a
 *           `*_blocked` event.
 */

import { describe, test, expect } from 'vitest';
import { sleepingAction, sleepingLifecycle } from '../../../src/actions/standard/sleeping';
import { wakingAction, wakingLifecycle } from '../../../src/actions/standard/waking';
import { interceptorConsultingActionIds } from '../../../src/actions/lifecycle/registry';
import { IFActions } from '../../../src/actions/constants';
import type { Action } from '../../../src/actions/enhanced-types';
import {
  createRealTestContext,
  expectEvent,
  createCommand,
  setupBasicWorld,
  TEST_MARKER_TRAIT
} from '../../test-utils';

const cases = [
  { name: 'sleeping', action: sleepingAction, id: IFActions.SLEEPING, lifecycle: sleepingLifecycle, event: 'if.event.slept', message: 'not_tired', blocked: 'if.event.sleep_blocked' },
  { name: 'waking', action: wakingAction, id: IFActions.WAKING, lifecycle: wakingLifecycle, event: 'if.event.woken', message: 'already_awake', blocked: 'if.event.wake_blocked' },
] as const;

for (const c of cases) {
  describe(`${c.name}Action (signal pattern)`, () => {
    test('metadata: id, required message, meta group, no objects', () => {
      expect(c.action.id).toBe(c.id);
      expect(c.action.requiredMessages).toContain(c.message);
      expect(c.action.group).toBe('meta');
      expect(c.action.metadata.requiresDirectObject).toBe(false);
      expect(c.action.metadata.requiresIndirectObject).toBe(false);
    });

    test('is a wired action — its id is in the interceptor-consulting set (ADR-228 D5)', () => {
      expect(interceptorConsultingActionIds.has(c.id)).toBe(true);
      expect(c.lifecycle.slots.map((s) => s.id)).toEqual(['location']);
    });

    test('validate always passes; execute mutates nothing and stores the location', () => {
      const { world, player, room } = setupBasicWorld();
      const context = createRealTestContext(c.action as Action, world, createCommand(c.id));
      const before = world.getLocation(player.id);

      expect(c.action.validate(context).valid).toBe(true);
      expect(c.action.execute(context)).toBeUndefined();

      expect(world.getLocation(player.id)).toBe(before);
      expect(context.sharedData.locationId).toBe(room.id);
      expect(context.sharedData.locationName).toBe('Test Room');
    });

    test(`report emits ${c.event} with the stock message id and the location`, () => {
      const { world, room } = setupBasicWorld();
      const context = createRealTestContext(c.action as Action, world, createCommand(c.id));
      c.action.execute(context);
      const events = c.action.report!(context);

      expectEvent(events, c.event, {
        messageId: `${c.id}.${c.message}`,
        location: room.id,
        locationName: 'Test Room'
      });
    });

    test('the actor\'s room is consulted: a room interceptor vetoes and the stock line never renders', () => {
      const { world, room } = setupBasicWorld();
      room.add({ type: TEST_MARKER_TRAIT } as any);
      world.registerActionInterceptor(TEST_MARKER_TRAIT, c.id, {
        preValidate() {
          return { valid: false, error: 'test.room_says_no' };
        },
      });
      const context = createRealTestContext(c.action as Action, world, createCommand(c.id));

      const validation = c.action.validate(context);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('test.room_says_no');
      const events = c.action.blocked!(context, validation);
      expect(events.some((e) => e.type === c.blocked)).toBe(true);
      expect(events.some((e) => e.type === c.event)).toBe(false);
    });

    test('the actor\'s room is consulted: a room interceptor reacts after the report', () => {
      const { world, room } = setupBasicWorld();
      room.add({ type: TEST_MARKER_TRAIT } as any);
      world.registerActionInterceptor(TEST_MARKER_TRAIT, c.id, {
        postExecute(_target, w) {
          w.setStateValue(`${c.name}.reacted`, true);
        },
      });
      const context = createRealTestContext(c.action as Action, world, createCommand(c.id));

      expect(c.action.validate(context).valid).toBe(true);
      c.action.execute(context);
      c.action.report!(context);

      expect(world.getStateValue(`${c.name}.reacted`)).toBe(true);
    });
  });
}

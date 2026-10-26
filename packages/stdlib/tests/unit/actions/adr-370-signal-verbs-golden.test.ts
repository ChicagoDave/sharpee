/**
 * Golden tests for the ADR-370 signal verbs — jumping, saying yes / no /
 * sorry, kissing, waving.
 *
 * Behavior Statement (jumping, saying_yes, saying_no, saying_sorry):
 *   DOES    emit one report event whose message id is the stock line and
 *           whose data names the room (and, for the saying three, the scene
 *           speaker when the actor is in a live conversation scene);
 *           mutates nothing.
 *   WHEN    the player types the bare verb anywhere.
 *   BECAUSE a story reacts through the consulted entity — the room, or the
 *           person asked; with no reaction the stock line stands.
 *   REJECTS only on an interceptor veto, with a `*_blocked` event.
 *
 * Behavior Statement (kissing):
 *   DOES    emit `if.event.kissed` with `kissed_person` for an actor target,
 *           `kissed_thing` otherwise; mutates nothing; consults the target.
 *   REJECTS no target (`no_target`), or a veto.
 *
 * Behavior Statement (waving):
 *   DOES    emit `if.event.waved` with `waved_hands` (no object; the room is
 *           consulted) or `waved` (a held object; the object is consulted);
 *           mutates nothing.
 *   REJECTS the object is not held (`not_held`): a blocked event, no waved event.
 */

import { describe, test, expect } from 'vitest';
import { TraitType } from '@sharpee/world-model';
import { jumpingAction, jumpingLifecycle } from '../../../src/actions/standard/jumping';
import { sayingYesAction, sayingYesLifecycle } from '../../../src/actions/standard/saying_yes';
import { sayingNoAction, sayingNoLifecycle } from '../../../src/actions/standard/saying_no';
import { sayingSorryAction, sayingSorryLifecycle } from '../../../src/actions/standard/saying_sorry';
import { kissingAction, kissingLifecycle } from '../../../src/actions/standard/kissing';
import { wavingAction, wavingLifecycle } from '../../../src/actions/standard/waving';
import { interceptorConsultingActionIds } from '../../../src/actions/lifecycle/registry';
import { IFActions } from '../../../src/actions/constants';
import type { Action } from '../../../src/actions/enhanced-types';
import { runBlockedPhase, runExecutePhase, runReportPhase, runValidatePhase } from '../../../src/actions/lifecycle/phase-runner';
import {
  createRealTestContext,
  expectEvent,
  createCommand,
  setupBasicWorld,
  TEST_MARKER_TRAIT
} from '../../test-utils';

const roomSignals = [
  { name: 'jumping', action: jumpingAction, id: IFActions.JUMPING, lifecycle: jumpingLifecycle, event: 'if.event.jumped', message: 'jumped', blocked: 'if.event.jump_blocked', slot: 'location' },
  { name: 'saying_yes', action: sayingYesAction, id: IFActions.SAYING_YES, lifecycle: sayingYesLifecycle, event: 'if.event.said_yes', message: 'nobody_asked', blocked: 'if.event.say_yes_blocked', slot: 'target' },
  { name: 'saying_no', action: sayingNoAction, id: IFActions.SAYING_NO, lifecycle: sayingNoLifecycle, event: 'if.event.said_no', message: 'nobody_asked', blocked: 'if.event.say_no_blocked', slot: 'target' },
  { name: 'saying_sorry', action: sayingSorryAction, id: IFActions.SAYING_SORRY, lifecycle: sayingSorryLifecycle, event: 'if.event.said_sorry', message: 'nothing_to_apologize_for', blocked: 'if.event.say_sorry_blocked', slot: 'target' },
] as const;

for (const c of roomSignals) {
  describe(`${c.name}Action (signal pattern, ADR-370)`, () => {
    test('metadata: id, stock message, no objects; wired in the registry (ADR-228 D5)', () => {
      expect(c.action.id).toBe(c.id);
      expect(c.action.requiredMessages).toContain(c.message);
      expect(c.action.metadata.requiresDirectObject).toBe(false);
      expect(interceptorConsultingActionIds.has(c.id)).toBe(true);
      expect(c.lifecycle.slots.map((s) => s.id)).toEqual([c.slot]);
    });

    test('validate passes; execute mutates nothing; report carries the stock line and the room', () => {
      const { world, player, room } = setupBasicWorld();
      const context = createRealTestContext(c.action as Action, world, createCommand(c.id));
      const before = world.getLocation(player.id);

      expect(runValidatePhase(c.action as Action, context).valid).toBe(true);
      runExecutePhase(c.action as Action, context);
      expect(world.getLocation(player.id)).toBe(before);

      const events = runReportPhase(c.action as Action, context);
      expectEvent(events, c.event, {
        messageId: `${c.id}.${c.message}`,
        location: room.id,
        locationName: 'Test Room'
      });
    });

    test('the room is consulted: a room interceptor vetoes and the stock line never renders', () => {
      const { world, room } = setupBasicWorld();
      room.add({ type: TEST_MARKER_TRAIT } as any);
      world.registerActionInterceptor(TEST_MARKER_TRAIT, c.id, {
        preValidate() {
          return { valid: false, error: 'test.room_says_no' };
        },
      });
      const context = createRealTestContext(c.action as Action, world, createCommand(c.id));

      const validation = runValidatePhase(c.action as Action, context);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('test.room_says_no');
      const events = runBlockedPhase(c.action as Action, context, validation);
      expect(events.some((e) => e.type === c.blocked)).toBe(true);
      expect(events.some((e) => e.type === c.event)).toBe(false);
    });
  });
}

describe('the saying actions consult the scene speaker when the actor is in a live scene (ADR-370 D1a)', () => {
  function worldWithScene() {
    const { world, player, room } = setupBasicWorld();
    const quint = world.createEntity('pad master', 'actor');
    quint.add({ type: TraitType.ACTOR });
    quint.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(quint.id, room.id);
    // A live scene between the player and Quint, written where the runtime
    // keeps it (`character.scenes`), so `sceneWith` finds it.
    world.setStateValue('character.scenes', {
      nextSceneSeq: 2,
      scenes: {
        s1: {
          id: 's1',
          participantIds: [player.id, quint.id],
          openedBy: { kind: 'talk' },
          floorHolderId: null,
          openExchange: null,
          openedTurn: 1,
          lastMoveTurn: 1
        }
      },
      mannerRotation: {}
    });
    return { world, player, room, quint };
  }

  for (const c of roomSignals.slice(1)) {
    test(`${c.name}: the speaker's interceptor fires and the report names the speaker`, () => {
      const { world, quint } = worldWithScene();
      world.registerActionInterceptor(TEST_MARKER_TRAIT, c.id, {
        postExecute(_target, w) {
          w.setStateValue(`${c.name}.speaker-reacted`, true);
        },
      });
      const context = createRealTestContext(c.action as Action, world, createCommand(c.id));

      expect(runValidatePhase(c.action as Action, context).valid).toBe(true);
      runExecutePhase(c.action as Action, context);
      const events = runReportPhase(c.action as Action, context);

      expect(world.getStateValue(`${c.name}.speaker-reacted`)).toBe(true);
      expectEvent(events, c.event, { speaker: quint.id, speakerName: 'pad master' });
    });
  }

  test('with no scene, a person in the room is not consulted and the report names no speaker', () => {
    const { world, room } = setupBasicWorld();
    const quint = world.createEntity('pad master', 'actor');
    quint.add({ type: TraitType.ACTOR });
    quint.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(quint.id, room.id);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SAYING_YES, {
      postExecute(_target, w) {
        w.setStateValue('yes.speaker-reacted', true);
      },
    });
    const context = createRealTestContext(sayingYesAction, world, createCommand(IFActions.SAYING_YES));
    runValidatePhase(sayingYesAction, context);
    runExecutePhase(sayingYesAction, context);
    const events = runReportPhase(sayingYesAction, context);

    expect(world.getStateValue('yes.speaker-reacted')).toBeUndefined();
    const said = events.find((e) => e.type === 'if.event.said_yes')!;
    expect((said.data as any).speaker).toBeUndefined();
  });
});

describe('kissingAction (ADR-370)', () => {
  test('metadata and registry', () => {
    expect(kissingAction.id).toBe(IFActions.KISSING);
    expect(kissingAction.requiredMessages).toEqual(expect.arrayContaining(['no_target', 'kissed_person', 'kissed_thing']));
    expect(kissingAction.metadata.requiresDirectObject).toBe(true);
    expect(interceptorConsultingActionIds.has(IFActions.KISSING)).toBe(true);
    expect(kissingLifecycle.slots.map((s) => s.id)).toEqual(['target']);
  });

  test('a person: kissed_person; a thing: kissed_thing; nothing moves', () => {
    const { world, room } = setupBasicWorld();
    const quint = world.createEntity('pad master', 'actor');
    quint.add({ type: TraitType.ACTOR });
    const crate = world.createEntity('mail crate', 'object');
    world.moveEntity(quint.id, room.id);
    world.moveEntity(crate.id, room.id);

    for (const [target, message] of [[quint, 'kissed_person'], [crate, 'kissed_thing']] as const) {
      const context = createRealTestContext(kissingAction, world, createCommand(IFActions.KISSING, { entity: target }));
      expect(runValidatePhase(kissingAction, context).valid).toBe(true);
      runExecutePhase(kissingAction, context);
      const events = runReportPhase(kissingAction, context);
      expectEvent(events, 'if.event.kissed', {
        messageId: `${IFActions.KISSING}.${message}`,
        target: target.id,
        isPerson: target === quint
      });
      expect(world.getLocation(target.id)).toBe(room.id);
    }
  });

  test('no target refuses with no_target', () => {
    const { world } = setupBasicWorld();
    const context = createRealTestContext(kissingAction, world, createCommand(IFActions.KISSING));
    const validation = runValidatePhase(kissingAction, context);
    expect(validation).toEqual({ valid: false, error: 'no_target' });
    const events = runBlockedPhase(kissingAction, context, validation);
    expectEvent(events, 'if.event.kiss_blocked', { messageId: `${IFActions.KISSING}.no_target` });
  });

  test('the target is consulted: a reaction on the kissed thing fires', () => {
    const { world, room } = setupBasicWorld();
    const crate = world.createEntity('mail crate', 'object');
    crate.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(crate.id, room.id);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.KISSING, {
      postExecute(_target, w) {
        w.setStateValue('crate.kissed', true);
      },
    });
    const context = createRealTestContext(kissingAction, world, createCommand(IFActions.KISSING, { entity: crate }));
    runValidatePhase(kissingAction, context);
    runExecutePhase(kissingAction, context);
    runReportPhase(kissingAction, context);
    expect(world.getStateValue('crate.kissed')).toBe(true);
  });
});

describe('wavingAction (ADR-370)', () => {
  test('metadata and registry', () => {
    expect(wavingAction.id).toBe(IFActions.WAVING);
    expect(wavingAction.requiredMessages).toEqual(expect.arrayContaining(['not_held', 'waved_hands', 'waved']));
    expect(wavingAction.metadata.requiresDirectObject).toBe(false);
    expect(interceptorConsultingActionIds.has(IFActions.WAVING)).toBe(true);
    expect(wavingLifecycle.slots.map((s) => s.id)).toEqual(['target']);
  });

  test('bare wave: waved_hands, the room consulted', () => {
    const { world, room } = setupBasicWorld();
    room.add({ type: TEST_MARKER_TRAIT } as any);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.WAVING, {
      postExecute(_target, w) {
        w.setStateValue('room.waved-at', true);
      },
    });
    const context = createRealTestContext(wavingAction, world, createCommand(IFActions.WAVING));
    expect(runValidatePhase(wavingAction, context).valid).toBe(true);
    runExecutePhase(wavingAction, context);
    const events = runReportPhase(wavingAction, context);
    expectEvent(events, 'if.event.waved', { messageId: `${IFActions.WAVING}.waved_hands`, location: room.id });
    expect((events[0].data as any).target).toBeUndefined();
    expect(world.getStateValue('room.waved-at')).toBe(true);
  });

  test('wave a held thing: waved, the thing consulted and not the room', () => {
    const { world, player, room } = setupBasicWorld();
    const flag = world.createEntity('route flag', 'object');
    flag.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(flag.id, player.id);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.WAVING, {
      postExecute(target, w) {
        w.setStateValue('waved-id', target.id);
      },
    });
    const context = createRealTestContext(wavingAction, world, createCommand(IFActions.WAVING, { entity: flag }));
    expect(runValidatePhase(wavingAction, context).valid).toBe(true);
    runExecutePhase(wavingAction, context);
    const events = runReportPhase(wavingAction, context);
    expectEvent(events, 'if.event.waved', { messageId: `${IFActions.WAVING}.waved`, target: flag.id, location: room.id });
    expect(world.getStateValue('waved-id')).toBe(flag.id);
    expect(world.getLocation(flag.id)).toBe(player.id);
  });

  test('wave a thing on the floor refuses with not_held and emits no waved event', () => {
    const { world, room } = setupBasicWorld();
    const flag = world.createEntity('route flag', 'object');
    world.moveEntity(flag.id, room.id);
    const context = createRealTestContext(wavingAction, world, createCommand(IFActions.WAVING, { entity: flag }));
    const validation = runValidatePhase(wavingAction, context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('not_held');
    const events = runBlockedPhase(wavingAction, context, validation);
    expectEvent(events, 'if.event.wave_blocked', { messageId: `${IFActions.WAVING}.not_held` });
    expect(events.some((e) => e.type === 'if.event.waved')).toBe(false);
  });
});

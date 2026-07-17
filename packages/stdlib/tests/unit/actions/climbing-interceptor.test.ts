/**
 * Climbing action — ADR-118 interceptor hooks (ADR-228 Phase 5).
 *
 * climbing.ts was never wired for interceptors: a registered `(trait,
 * if.action.climbing)` interceptor — e.g. what Chord's `on climbing it`
 * clause lowers to — sat in the registry and silently never fired. These
 * tests pin the full hook contract: preValidate veto, postExecute mutation
 * after the standard player move, postReport emit/override, and the
 * no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { climbingAction } from '../../../src/actions/standard/climbing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withObject('stone ledge', {
    // Enterable supporter — climbable per validateObjectClimbing.
    [TraitType.SUPPORTER]: { type: TraitType.SUPPORTER, enterable: true },
    // Inert marker trait — the interceptor registration key.
    [TEST_MARKER_TRAIT]: { type: TEST_MARKER_TRAIT }
  });
  return result;
};

const drive = (world: WorldModel, object: any) => {
  const context = createRealTestContext(
    climbingAction,
    world,
    createCommand(IFActions.CLIMBING, { entity: object })
  );
  const validation = climbingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: climbingAction.blocked(context, validation) };
  }
  climbingAction.execute(context);
  return { context, validation, events: climbingAction.report(context) };
};

describe('Climbing interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the climb — the player does not move', () => {
    const { world, player, room, object } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.CLIMBING, {
      preValidate() {
        return { valid: false, error: 'test.too_slippery' };
      },
    });

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.too_slippery');
    // THE state assertion: the player was NOT moved onto the ledge.
    expect(world.getLocation(player.id)).toBe(room.id);
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
    expect(events.some(e => e.type === 'if.event.climbed')).toBe(true);
  });

  test('postExecute runs after the standard move and its mutation persists', () => {
    const { world, player, object } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.CLIMBING, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard move already happened (interceptor runs post).
        expect(w.getLocation(player.id)).toBe(target.id);
        w.setStateValue('ledge.creaked', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, object);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('ledge.creaked')).toBe(true);
    expect(world.getLocation(player.id)).toBe(object.id);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the climbed messageId', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.CLIMBING, {
      postReport() {
        return {
          override: { messageId: 'ledge.custom_climbed' },
          emit: [{ type: 'ledge.effect', payload: { messageId: 'ledge.crumble' } }],
        };
      },
    });

    const { events } = drive(world, object);

    const climbed = events.find(e => e.type === 'if.event.climbed')!;
    expect((climbed.data as any).messageId).toBe('ledge.custom_climbed');
    const effect = events.find(e => e.type === 'ledge.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('ledge.crumble');
  });

  test('no interceptor: behavior unchanged, standard climbed event', () => {
    const { world, player, object } = setup();

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(true);
    expect(world.getLocation(player.id)).toBe(object.id);
    const climbed = events.find(e => e.type === 'if.event.climbed')!;
    expect((climbed.data as any).messageId).toBe('if.action.climbing.climbed_onto');
  });
});

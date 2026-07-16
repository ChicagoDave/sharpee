/**
 * Touching action — ADR-118 interceptor hooks (ADR-228 Phase 4).
 *
 * touching.ts was never wired for interceptors: a registered `(trait,
 * if.action.touching)` interceptor — e.g. what Chord's `on touching it`
 * clause lowers to — sat in the registry and silently never fired. These
 * tests pin the full hook contract: preValidate veto, postExecute mutation
 * after the standard (mutation-free) execute, postReport emit/override,
 * and the no-interceptor passthrough.
 *
 * Touching has no standard world mutation, so the preValidate "no state
 * change" assertion pins that the interceptor's own postExecute never ran.
 */

import { describe, test, expect } from 'vitest';
import { touchingAction } from '../../../src/actions/standard/touching';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withObject('marble statue', {
    // Benign trait used purely as the interceptor registration key.
    [TraitType.READABLE]: { type: TraitType.READABLE, text: '' }
  });
  return result;
};

const drive = (world: WorldModel, object: any) => {
  const context = createRealTestContext(
    touchingAction,
    world,
    createCommand(IFActions.TOUCHING, { entity: object, text: 'marble statue' })
  );
  const validation = touchingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: touchingAction.blocked(context, validation) };
  }
  touchingAction.execute(context);
  return { context, validation, events: touchingAction.report(context) };
};

describe('Touching interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the touch — postExecute never runs, no state change', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.TOUCHING, {
      preValidate() {
        return { valid: false, error: 'test.statue_cursed' };
      },
      postExecute(target, w) {
        w.setStateValue('statue.touched', true);
      },
    });

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.statue_cursed');
    // THE state assertion: the vetoed touch produced NO state change.
    expect(world.getStateValue('statue.touched')).toBeUndefined();
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
    expect(events.some(e => e.type === 'if.event.touch_blocked')).toBe(true);
  });

  test('postExecute runs after the standard execute and its mutation persists', () => {
    const { world, object } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.TOUCHING, {
      postExecute(_target, w) {
        calls.push('postExecute');
        w.setStateValue('statue.awakened', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, object);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('statue.awakened')).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the touched messageId', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.TOUCHING, {
      postReport() {
        return {
          override: { messageId: 'statue.custom_touched' },
          emit: [{ type: 'statue.effect', payload: { messageId: 'statue.shiver' } }],
        };
      },
    });

    const { events } = drive(world, object);

    const touched = events.find(e => e.type === 'if.event.touched')!;
    expect((touched.data as any).messageId).toBe('statue.custom_touched');
    const effect = events.find(e => e.type === 'statue.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('statue.shiver');
  });

  test('no interceptor: behavior unchanged, standard touched event', () => {
    const { world, object } = setup();

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(true);
    const touched = events.find(e => e.type === 'if.event.touched')!;
    expect((touched.data as any).messageId).toBe('if.action.touching.touched');
  });
});

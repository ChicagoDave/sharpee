/**
 * Listening action — ADR-118 interceptor hooks (ADR-228 Phase 5).
 *
 * listening.ts was never wired for interceptors: a registered `(trait,
 * if.action.listening)` interceptor — e.g. what Chord's `on listening it`
 * clause lowers to — sat in the registry and silently never fired. These
 * tests pin the full hook contract: preValidate veto, postExecute mutation
 * after the standard (mutation-free) execute, postReport emit/override,
 * and the no-interceptor passthrough.
 *
 * Listening has no standard world mutation, so the preValidate "no state
 * change" assertion pins that the interceptor's own postExecute never ran.
 */

import { describe, test, expect } from 'vitest';
import { listeningAction } from '../../../src/actions/standard/listening';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withObject('humming generator', {
    // Switched-on device — gives the deterministic 'device_running' message.
    [TraitType.SWITCHABLE]: { type: TraitType.SWITCHABLE, isOn: true },
    // Benign trait used purely as the interceptor registration key.
    [TraitType.READABLE]: { type: TraitType.READABLE, text: '' }
  });
  return result;
};

const drive = (world: WorldModel, object: any) => {
  const context = createRealTestContext(
    listeningAction,
    world,
    createCommand(IFActions.LISTENING, { entity: object })
  );
  const validation = listeningAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: listeningAction.blocked(context, validation) };
  }
  listeningAction.execute(context);
  return { context, validation, events: listeningAction.report(context) };
};

describe('Listening interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the listen — postExecute never runs, no state change', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.LISTENING, {
      preValidate() {
        return { valid: false, error: 'test.deafening_roar' };
      },
      postExecute(_target, w) {
        w.setStateValue('generator.heard', true);
      },
    });

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.deafening_roar');
    // THE state assertion: the vetoed listen produced NO state change.
    expect(world.getStateValue('generator.heard')).toBeUndefined();
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
    expect(events.some(e => e.type === 'if.event.listen_blocked')).toBe(true);
  });

  test('postExecute runs after the standard execute and its mutation persists', () => {
    const { world, object } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.LISTENING, {
      postExecute(_target, w) {
        calls.push('postExecute');
        w.setStateValue('generator.noticed', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, object);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('generator.noticed')).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the listened messageId', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.LISTENING, {
      postReport() {
        return {
          override: { messageId: 'generator.custom_listened' },
          emit: [{ type: 'generator.effect', payload: { messageId: 'generator.sputter' } }],
        };
      },
    });

    const { events } = drive(world, object);

    const listened = events.find(e => e.type === 'if.event.listened')!;
    expect((listened.data as any).messageId).toBe('generator.custom_listened');
    const effect = events.find(e => e.type === 'generator.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('generator.sputter');
  });

  test('no interceptor: behavior unchanged, standard listened event', () => {
    const { world, object } = setup();

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(true);
    const listened = events.find(e => e.type === 'if.event.listened')!;
    expect((listened.data as any).messageId).toBe('if.action.listening.device_running');
  });
});

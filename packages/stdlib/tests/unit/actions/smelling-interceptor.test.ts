/**
 * Smelling action — ADR-118 interceptor hooks (ADR-228 Phase 5).
 *
 * smelling.ts was never wired for interceptors: a registered `(trait,
 * if.action.smelling)` interceptor — e.g. what Chord's `on smelling it`
 * clause lowers to — sat in the registry and silently never fired. These
 * tests pin the full hook contract: preValidate veto, postExecute mutation
 * after the standard (mutation-free) execute, postReport emit/override,
 * and the no-interceptor passthrough.
 *
 * Smelling has no standard world mutation, so the preValidate "no state
 * change" assertion pins that the interceptor's own postExecute never ran.
 */

import { describe, test, expect } from 'vitest';
import { smellingAction } from '../../../src/actions/standard/smelling';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withObject('ripe cheese', {
    // Edible (non-liquid) — gives the deterministic 'food_scent' message.
    [TraitType.EDIBLE]: { type: TraitType.EDIBLE, servings: 1 },
    // Inert marker trait — the interceptor registration key.
    [TEST_MARKER_TRAIT]: { type: TEST_MARKER_TRAIT }
  });
  return result;
};

const drive = (world: WorldModel, object: any) => {
  const context = createRealTestContext(
    smellingAction,
    world,
    createCommand(IFActions.SMELLING, { entity: object })
  );
  const validation = smellingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: smellingAction.blocked(context, validation) };
  }
  smellingAction.execute(context);
  return { context, validation, events: smellingAction.report(context) };
};

describe('Smelling interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the smell — postExecute never runs, no state change', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SMELLING, {
      preValidate() {
        return { valid: false, error: 'test.nose_blocked' };
      },
      postExecute(_target, w) {
        w.setStateValue('cheese.smelled', true);
      },
    });

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.nose_blocked');
    // THE state assertion: the vetoed smell produced NO state change.
    expect(world.getStateValue('cheese.smelled')).toBeUndefined();
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
    expect(events.some(e => e.type === 'if.event.smell_blocked')).toBe(true);
  });

  test('postExecute runs after the standard execute and its mutation persists', () => {
    const { world, object } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SMELLING, {
      postExecute(_target, w) {
        calls.push('postExecute');
        w.setStateValue('cheese.noticed', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, object);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('cheese.noticed')).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the smelled messageId', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SMELLING, {
      postReport() {
        return {
          override: { messageId: 'cheese.custom_smelled' },
          emit: [{ type: 'cheese.effect', payload: { messageId: 'cheese.reek' } }],
        };
      },
    });

    const { events } = drive(world, object);

    const smelled = events.find(e => e.type === 'if.event.smelled')!;
    expect((smelled.data as any).messageId).toBe('cheese.custom_smelled');
    const effect = events.find(e => e.type === 'cheese.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('cheese.reek');
  });

  test('no interceptor: behavior unchanged, standard smelled event', () => {
    const { world, object } = setup();

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(true);
    const smelled = events.find(e => e.type === 'if.event.smelled')!;
    expect((smelled.data as any).messageId).toBe('if.action.smelling.food_scent');
  });
});

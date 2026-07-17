/**
 * Eating action — ADR-118 interceptor hooks (ADR-227 Phase 2 seam-fix).
 *
 * eating.ts was never wired for interceptors: a registered `(trait,
 * if.action.eating)` interceptor — e.g. what Chord's `on eating it` clause
 * lowers to — sat in the registry and silently never fired. These tests
 * pin the full hook contract: preValidate veto, postExecute mutation after
 * the standard consumption, postReport emit/override, and the no-interceptor
 * passthrough.
 */

import { describe, test, expect } from 'vitest';
import { eatingAction } from '../../../src/actions/standard/eating';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, EdibleTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withInventoryItem('seed cake', {
    [TraitType.EDIBLE]: {
      type: TraitType.EDIBLE,
      servings: 1,
      taste: 'tasty'
    },
    // Inert marker trait — the interceptor registration key.
    [TEST_MARKER_TRAIT]: { type: TEST_MARKER_TRAIT }
  });
  return result;
};

const drive = (world: WorldModel, item: any) => {
  const context = createRealTestContext(
    eatingAction,
    world,
    createCommand(IFActions.EATING, { entity: item, text: 'seed cake' })
  );
  const validation = eatingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: eatingAction.blocked(context, validation) };
  }
  eatingAction.execute(context);
  return { context, validation, events: eatingAction.report(context) };
};

describe('Eating interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the eat — nothing is consumed', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.EATING, {
      preValidate() {
        return { valid: false, error: 'test.too_hot_to_eat' };
      },
    });

    const { validation, events } = drive(world, item);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.too_hot_to_eat');
    // THE state assertion: the serving was NOT consumed.
    const edible = item.get(TraitType.EDIBLE) as EdibleTrait;
    expect(edible.servings).toBe(1);
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
  });

  test('postExecute runs after the standard consumption and its mutation persists', () => {
    const { world, item } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.EATING, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard consumption already happened (interceptor runs post).
        const edible = target.get(TraitType.EDIBLE) as EdibleTrait;
        expect(edible.servings).toBe(0);
        w.setStateValue('cake.effect_applied', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, item);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('cake.effect_applied')).toBe(true);
    expect((item.get(TraitType.EDIBLE) as EdibleTrait).servings).toBe(0);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the eaten messageId', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.EATING, {
      postReport() {
        return {
          override: { messageId: 'cake.custom_eaten' },
          emit: [{ type: 'cake.effect', payload: { messageId: 'cake.shrink' } }],
        };
      },
    });

    const { events } = drive(world, item);

    const eaten = events.find(e => e.type === 'if.event.eaten')!;
    expect((eaten.data as any).messageId).toBe('cake.custom_eaten');
    const effect = events.find(e => e.type === 'cake.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('cake.shrink');
  });

  test('no interceptor: behavior unchanged, standard eaten event', () => {
    const { world, item } = setup();

    const { validation, events } = drive(world, item);

    expect(validation.valid).toBe(true);
    expect((item.get(TraitType.EDIBLE) as EdibleTrait).servings).toBe(0);
    const eaten = events.find(e => e.type === 'if.event.eaten')!;
    expect((eaten.data as any).messageId).toBe('if.action.eating.tasty');
  });
});

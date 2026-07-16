/**
 * Drinking action — ADR-118 interceptor hooks (ADR-228 Phase 4).
 *
 * drinking.ts was never wired for interceptors: a registered `(trait,
 * if.action.drinking)` interceptor — e.g. what Chord's `on drinking it`
 * clause lowers to — sat in the registry and silently never fired. These
 * tests pin the full hook contract: preValidate veto, postExecute mutation
 * after the standard consumption, postReport emit/override, and the
 * no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { drinkingAction } from '../../../src/actions/standard/drinking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, EdibleTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withInventoryItem('elixir', {
    [TraitType.EDIBLE]: {
      type: TraitType.EDIBLE,
      servings: 1,
      liquid: true
    },
    // Benign trait used purely as the interceptor registration key.
    [TraitType.READABLE]: { type: TraitType.READABLE, text: '' }
  });
  return result;
};

const drive = (world: WorldModel, item: any) => {
  const context = createRealTestContext(
    drinkingAction,
    world,
    createCommand(IFActions.DRINKING, { entity: item, text: 'elixir' })
  );
  const validation = drinkingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: drinkingAction.blocked(context, validation) };
  }
  drinkingAction.execute(context);
  return { context, validation, events: drinkingAction.report(context) };
};

describe('Drinking interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the drink — nothing is consumed', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.DRINKING, {
      preValidate() {
        return { valid: false, error: 'test.too_hot_to_drink' };
      },
    });

    const { validation, events } = drive(world, item);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.too_hot_to_drink');
    // THE state assertion: the serving was NOT consumed.
    const edible = item.get(TraitType.EDIBLE) as EdibleTrait;
    expect(edible.servings).toBe(1);
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
    expect(events.some(e => e.type === 'if.event.drunk')).toBe(true);
  });

  test('postExecute runs after the standard consumption and its mutation persists', () => {
    const { world, item } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.DRINKING, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard consumption already happened (interceptor runs post).
        const edible = target.get(TraitType.EDIBLE) as EdibleTrait;
        expect(edible.servings).toBe(0);
        w.setStateValue('elixir.effect_applied', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, item);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('elixir.effect_applied')).toBe(true);
    expect((item.get(TraitType.EDIBLE) as EdibleTrait).servings).toBe(0);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the drunk messageId', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.DRINKING, {
      postReport() {
        return {
          override: { messageId: 'elixir.custom_drunk' },
          emit: [{ type: 'elixir.effect', payload: { messageId: 'elixir.glow' } }],
        };
      },
    });

    const { events } = drive(world, item);

    const drunk = events.find(e => e.type === 'if.event.drunk')!;
    expect((drunk.data as any).messageId).toBe('elixir.custom_drunk');
    const effect = events.find(e => e.type === 'elixir.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('elixir.glow');
  });

  test('no interceptor: behavior unchanged, standard drunk event', () => {
    const { world, item } = setup();

    const { validation, events } = drive(world, item);

    expect(validation.valid).toBe(true);
    expect((item.get(TraitType.EDIBLE) as EdibleTrait).servings).toBe(0);
    const drunk = events.find(e => e.type === 'if.event.drunk')!;
    expect((drunk.data as any).messageId).toBe('if.action.drinking.drunk');
  });
});

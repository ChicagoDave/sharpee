/**
 * Wearing action — ADR-118 interceptor hooks (ADR-228 Phase 4).
 *
 * wearing.ts was never wired for interceptors: a registered `(trait,
 * if.action.wearing)` interceptor sat in the registry and silently never
 * fired. These tests pin the full hook contract: preValidate veto,
 * postExecute mutation after the standard wear, postReport emit/override,
 * and the no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { wearingAction } from '../../../src/actions/standard/wearing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, WearableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withInventoryItem('leather cloak', {
    [TraitType.WEARABLE]: {
      type: TraitType.WEARABLE,
      worn: false,
      bodyPart: 'torso'
    },
    // Benign trait used purely as the interceptor registration key.
    [TraitType.READABLE]: { type: TraitType.READABLE, text: '' }
  });
  return result;
};

const drive = (world: WorldModel, item: any) => {
  const context = createRealTestContext(
    wearingAction,
    world,
    createCommand(IFActions.WEARING, { entity: item, text: 'leather cloak' })
  );
  const validation = wearingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: wearingAction.blocked(context, validation) };
  }
  wearingAction.execute(context);
  return { context, validation, events: wearingAction.report(context) };
};

describe('Wearing interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the wear — item is not worn', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.WEARING, {
      preValidate() {
        return { valid: false, error: 'test.cloak_is_cursed' };
      },
    });

    const { validation, events } = drive(world, item);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.cloak_is_cursed');
    // THE state assertion: the item was NOT worn.
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    expect(wearable.worn).toBe(false);
    expect(events.some(e => e.type === 'if.event.wear_blocked')).toBe(true);
  });

  test('postExecute runs after the standard wear and its mutation persists', () => {
    const { world, item } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.WEARING, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard wear already happened (interceptor runs post).
        const wearable = target.get(TraitType.WEARABLE) as WearableTrait;
        expect(wearable.worn).toBe(true);
        w.setStateValue('cloak.effect_applied', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, item);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('cloak.effect_applied')).toBe(true);
    expect((item.get(TraitType.WEARABLE) as WearableTrait).worn).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the worn messageId', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.WEARING, {
      postReport() {
        return {
          override: { messageId: 'cloak.custom_worn' },
          emit: [{ type: 'cloak.effect', payload: { messageId: 'cloak.shimmer' } }],
        };
      },
    });

    const { events } = drive(world, item);

    const worn = events.find(e => e.type === 'if.event.worn')!;
    expect((worn.data as any).messageId).toBe('cloak.custom_worn');
    const effect = events.find(e => e.type === 'cloak.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('cloak.shimmer');
  });

  test('no interceptor: behavior unchanged, standard worn event', () => {
    const { world, item } = setup();

    const { validation, events } = drive(world, item);

    expect(validation.valid).toBe(true);
    expect((item.get(TraitType.WEARABLE) as WearableTrait).worn).toBe(true);
    const worn = events.find(e => e.type === 'if.event.worn')!;
    expect((worn.data as any).messageId).toBe('if.action.wearing.worn');
  });
});

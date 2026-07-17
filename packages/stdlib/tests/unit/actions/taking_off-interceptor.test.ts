/**
 * Taking off action — ADR-118 interceptor hooks (ADR-228 Phase 4 wiring).
 *
 * taking-off.ts was never wired for interceptors: a registered `(trait,
 * if.action.taking_off)` interceptor sat in the registry and silently
 * never fired. These tests pin the full hook contract through the shared
 * lifecycle engine: preValidate veto (item stays worn), postExecute
 * mutation after the standard removal, postReport emit/override, and the
 * no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { takingOffAction } from '../../../src/actions/standard/taking_off';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, WearableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  createCommand,
  setupBasicWorld,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const hat = world.createEntity('wool hat', 'object');
  hat.add({
    type: TraitType.WEARABLE,
    worn: true,
    wornBy: player.id,
    bodyPart: 'head'
  });
  // Inert marker trait — the interceptor registration key.
  hat.add({ type: TEST_MARKER_TRAIT } as any);
  world.moveEntity(hat.id, player.id);
  return { world, player, room, hat };
};

const drive = (world: WorldModel, hat: any) => {
  const context = createRealTestContext(
    takingOffAction,
    world,
    createCommand(IFActions.TAKING_OFF, { entity: hat, text: 'wool hat' })
  );
  const validation = takingOffAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: takingOffAction.blocked(context, validation) };
  }
  takingOffAction.execute(context);
  return { context, validation, events: takingOffAction.report(context) };
};

describe('Taking off interceptor hooks (ADR-118 / ADR-228)', () => {
  test('preValidate veto blocks the removal — item is still worn', () => {
    const { world, hat } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.TAKING_OFF, {
      preValidate() {
        return { valid: false, error: 'test.hat_is_stuck' };
      },
    });

    const { validation, events } = drive(world, hat);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.hat_is_stuck');
    // THE state assertion: still worn.
    const wearable = hat.get(TraitType.WEARABLE) as WearableTrait;
    expect(wearable.worn).toBe(true);
    expect(events.some(e => e.type === 'if.event.take_off_blocked')).toBe(true);
  });

  test('postExecute runs after the standard removal and its mutation persists', () => {
    const { world, hat } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.TAKING_OFF, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard removal already happened (interceptor runs post).
        const wearable = target.get(TraitType.WEARABLE) as WearableTrait;
        expect(wearable.worn).toBe(false);
        w.setStateValue('hat.hair_mussed', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, hat);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('hat.hair_mussed')).toBe(true);
    expect((hat.get(TraitType.WEARABLE) as WearableTrait).worn).toBe(false);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the removed messageId', () => {
    const { world, hat } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.TAKING_OFF, {
      postReport() {
        return {
          override: { messageId: 'hat.custom_removed' },
          emit: [{ type: 'hat.breeze', payload: { messageId: 'hat.head_feels_cold' } }],
        };
      },
    });

    const { events } = drive(world, hat);

    const removed = events.find(e => e.type === 'if.event.removed')!;
    expect((removed.data as any).messageId).toBe('hat.custom_removed');
    const breeze = events.find(e => e.type === 'hat.breeze');
    expect(breeze).toBeDefined();
    const breezeData = ((breeze!.data as any)?.data ?? breeze!.data) as any;
    expect(breezeData.messageId).toBe('hat.head_feels_cold');
  });

  test('no interceptor: behavior unchanged, standard removed event', () => {
    const { world, hat } = setup();

    const { validation, events } = drive(world, hat);

    expect(validation.valid).toBe(true);
    expect((hat.get(TraitType.WEARABLE) as WearableTrait).worn).toBe(false);
    const removed = events.find(e => e.type === 'if.event.removed')!;
    expect((removed.data as any).messageId).toBe('if.action.taking_off.removed');
  });
});

describe('Folded execute-phase refusals (ADR-229 R1)', () => {
  test('layering blocker refuses in validate and reaches onBlocked — item still worn', () => {
    const { world, player, hat } = setup();
    (hat.get(TraitType.WEARABLE) as WearableTrait).layer = 1;
    const balaclava = world.createEntity('balaclava', 'object');
    balaclava.add({
      type: TraitType.WEARABLE,
      worn: true,
      wornBy: player.id,
      bodyPart: 'head',
      layer: 2
    });
    world.moveEntity(balaclava.id, player.id);

    let blockedError: string | undefined;
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.TAKING_OFF, {
      onBlocked(_e, _w, _a, error) {
        blockedError = error;
        return { override: { messageId: 'test.pinned_underneath' } };
      },
    });

    const { validation, events } = drive(world, hat);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('prevents_removal');
    expect(blockedError).toBe('prevents_removal');
    const blocked = events.find(e => e.type === 'if.event.take_off_blocked')!;
    expect((blocked.data as any).messageId).toBe('test.pinned_underneath');
    // THE state assertion: still worn.
    expect((hat.get(TraitType.WEARABLE) as WearableTrait).worn).toBe(true);
  });

  test('the cursed-flag probe refuses through the folded path and reaches onBlocked', () => {
    const { world, hat } = setup();
    (hat.get(TraitType.WEARABLE) as any).cursed = true;

    let blockedError: string | undefined;
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.TAKING_OFF, {
      onBlocked(_e, _w, _a, error) {
        blockedError = error;
        return { override: { messageId: 'test.hat_tightens' } };
      },
    });

    const { validation, events } = drive(world, hat);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('cant_remove');
    expect(blockedError).toBe('cant_remove');
    const blocked = events.find(e => e.type === 'if.event.take_off_blocked')!;
    expect((blocked.data as any).messageId).toBe('test.hat_tightens');
    expect((hat.get(TraitType.WEARABLE) as WearableTrait).worn).toBe(true);
  });
});

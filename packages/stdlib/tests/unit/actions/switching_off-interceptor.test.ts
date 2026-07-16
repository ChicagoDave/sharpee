/**
 * Switching off action — ADR-118 interceptor hooks (ADR-228 Phase 4).
 *
 * switching_off.ts was never wired for interceptors while its mirror
 * switching_on.ts was — a registered `(trait, if.action.switching_off)`
 * interceptor sat in the registry and silently never fired. These tests
 * pin the full hook contract: preValidate veto, postExecute mutation after
 * the standard switch-off, postReport emit/override, and the
 * no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { switchingOffAction } from '../../../src/actions/standard/switching_off';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, SwitchableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withObject('brass lantern', {
    [TraitType.SWITCHABLE]: {
      type: TraitType.SWITCHABLE,
      isOn: true
    },
    // Benign trait used purely as the interceptor registration key.
    [TraitType.READABLE]: { type: TraitType.READABLE, text: '' }
  });
  return result;
};

const drive = (world: WorldModel, target: any) => {
  const context = createRealTestContext(
    switchingOffAction,
    world,
    createCommand(IFActions.SWITCHING_OFF, { entity: target, text: 'brass lantern' })
  );
  const validation = switchingOffAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: switchingOffAction.blocked(context, validation) };
  }
  switchingOffAction.execute(context);
  return { context, validation, events: switchingOffAction.report(context) };
};

describe('Switching off interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the switch-off — device stays on', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.SWITCHING_OFF, {
      preValidate() {
        return { valid: false, error: 'test.switch_is_stuck' };
      },
    });

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.switch_is_stuck');
    // THE state assertion: the device was NOT switched off.
    const switchable = object.get(TraitType.SWITCHABLE) as SwitchableTrait;
    expect(switchable.isOn).toBe(true);
    expect(events.some(e => e.type === 'if.event.switch_off_blocked')).toBe(true);
  });

  test('postExecute runs after the standard switch-off and its mutation persists', () => {
    const { world, object } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.SWITCHING_OFF, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard switch-off already happened (interceptor runs post).
        const switchable = target.get(TraitType.SWITCHABLE) as SwitchableTrait;
        expect(switchable.isOn).toBe(false);
        w.setStateValue('lantern.off_effect_applied', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, object);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('lantern.off_effect_applied')).toBe(true);
    expect((object.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn).toBe(false);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the switched_off messageId', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.SWITCHING_OFF, {
      postReport() {
        return {
          override: { messageId: 'lantern.custom_off' },
          emit: [{ type: 'lantern.effect', payload: { messageId: 'lantern.fizzle' } }],
        };
      },
    });

    const { events } = drive(world, object);

    const switchedOff = events.find(e => e.type === 'if.event.switched_off')!;
    expect((switchedOff.data as any).messageId).toBe('lantern.custom_off');
    const effect = events.find(e => e.type === 'lantern.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('lantern.fizzle');
  });

  test('no interceptor: behavior unchanged, standard switched_off event', () => {
    const { world, object } = setup();

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(true);
    expect((object.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn).toBe(false);
    const switchedOff = events.find(e => e.type === 'if.event.switched_off')!;
    expect((switchedOff.data as any).messageId).toBe('if.action.switching_off.device_stops');
  });
});

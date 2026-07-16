/**
 * Hiding action — ADR-118 interceptor hooks (ADR-228 Phase 5).
 *
 * hiding.ts was never wired for interceptors: a registered `(trait,
 * if.action.hiding)` interceptor — e.g. what Chord's `on hiding it`
 * clause lowers to — sat in the registry and silently never fired. These
 * tests pin the full hook contract: preValidate veto, postExecute mutation
 * after the standard concealment, postReport emit/override, and the
 * no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { hidingAction } from '../../../src/actions/standard/hiding/hiding';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, ConcealmentTrait, isConcealed } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withObject('velvet curtain', {
    // Benign trait used purely as the interceptor registration key.
    [TraitType.READABLE]: { type: TraitType.READABLE, text: '' }
  });
  result.object.add(new ConcealmentTrait({
    positions: ['behind'],
    quality: 'good',
  }));
  return result;
};

const drive = (world: WorldModel, object: any) => {
  const context = createRealTestContext(
    hidingAction,
    world,
    createCommand(IFActions.HIDING, { entity: object, extras: { position: 'behind' } })
  );
  const validation = hidingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: hidingAction.blocked(context, validation) };
  }
  hidingAction.execute(context);
  return { context, validation, events: hidingAction.report(context) };
};

describe('Hiding interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the hide — the player is not concealed', () => {
    const { world, player, object } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.HIDING, {
      preValidate() {
        return { valid: false, error: 'test.curtain_too_thin' };
      },
    });

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.curtain_too_thin');
    // THE state assertion: the player was NOT concealed.
    expect(isConcealed(player)).toBe(false);
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
    expect(events.some(e => e.type === 'if.event.hide_blocked')).toBe(true);
  });

  test('postExecute runs after the standard concealment and its mutation persists', () => {
    const { world, player, object } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.HIDING, {
      postExecute(_target, w) {
        calls.push('postExecute');
        // Standard concealment already happened (interceptor runs post).
        expect(isConcealed(player)).toBe(true);
        w.setStateValue('curtain.rustled', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, object);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('curtain.rustled')).toBe(true);
    expect(isConcealed(player)).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the concealed messageId', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.HIDING, {
      postReport() {
        return {
          override: { messageId: 'curtain.custom_hidden' },
          emit: [{ type: 'curtain.effect', payload: { messageId: 'curtain.sway' } }],
        };
      },
    });

    const { events } = drive(world, object);

    const concealed = events.find(e => e.type === 'if.event.player_concealed')!;
    expect((concealed.data as any).messageId).toBe('curtain.custom_hidden');
    const effect = events.find(e => e.type === 'curtain.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('curtain.sway');
  });

  test('no interceptor: behavior unchanged, standard player_concealed event', () => {
    const { world, player, object } = setup();

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(true);
    expect(isConcealed(player)).toBe(true);
    const concealed = events.find(e => e.type === 'if.event.player_concealed')!;
    expect((concealed.data as any).messageId).toBe('if.action.hiding.behind');
  });
});

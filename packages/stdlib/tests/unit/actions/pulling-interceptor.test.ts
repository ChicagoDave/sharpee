/**
 * Pulling action — ADR-118 interceptor hooks (ADR-228 Phase 4).
 *
 * pulling.ts was never wired for interceptors: a registered `(trait,
 * if.action.pulling)` interceptor — e.g. what Chord's `on pulling it`
 * clause lowers to — sat in the registry and silently never fired. These
 * tests pin the full hook contract: preValidate veto, postExecute mutation
 * after the standard pull, postReport emit/override, and the
 * no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { pullingAction } from '../../../src/actions/standard/pulling';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, PullableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  TestData,
  createCommand,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

const setup = () => {
  const result = TestData.withObject('bell rope', {
    [TraitType.PULLABLE]: {
      type: TraitType.PULLABLE,
      pullType: 'cord',
      state: 'default',
      pullCount: 0
    },
    // Inert marker trait — the interceptor registration key.
    [TEST_MARKER_TRAIT]: { type: TEST_MARKER_TRAIT }
  });
  return result;
};

const drive = (world: WorldModel, object: any) => {
  const context = createRealTestContext(
    pullingAction,
    world,
    createCommand(IFActions.PULLING, { entity: object, text: 'bell rope' })
  );
  const validation = pullingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: pullingAction.blocked(context, validation) };
  }
  pullingAction.execute(context);
  return { context, validation, events: pullingAction.report(context) };
};

describe('Pulling interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the pull — pullable state unchanged', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.PULLING, {
      preValidate() {
        return { valid: false, error: 'test.rope_electrified' };
      },
    });

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.rope_electrified');
    // THE state assertion: the pullable was NOT pulled.
    const pullable = object.get(TraitType.PULLABLE) as PullableTrait;
    expect(pullable.state).toBe('default');
    expect(pullable.pullCount).toBe(0);
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
    expect(events.some(e => e.type === 'if.event.pulled')).toBe(true);
  });

  test('postExecute runs after the standard pull and its mutation persists', () => {
    const { world, object } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.PULLING, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard pull already happened (interceptor runs post).
        const pullable = target.get(TraitType.PULLABLE) as PullableTrait;
        expect(pullable.state).toBe('pulled');
        expect(pullable.pullCount).toBe(1);
        w.setStateValue('rope.bell_rang', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, object);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('rope.bell_rang')).toBe(true);
    expect((object.get(TraitType.PULLABLE) as PullableTrait).state).toBe('pulled');
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the pulled messageId', () => {
    const { world, object } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.PULLING, {
      postReport() {
        return {
          override: { messageId: 'rope.custom_pulled' },
          emit: [{ type: 'rope.effect', payload: { messageId: 'rope.chime' } }],
        };
      },
    });

    const { events } = drive(world, object);

    const pulled = events.find(e => e.type === 'if.event.pulled')!;
    expect((pulled.data as any).messageId).toBe('rope.custom_pulled');
    const effect = events.find(e => e.type === 'rope.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('rope.chime');
  });

  test('no interceptor: behavior unchanged, standard pulled event', () => {
    const { world, object } = setup();

    const { validation, events } = drive(world, object);

    expect(validation.valid).toBe(true);
    const pullable = object.get(TraitType.PULLABLE) as PullableTrait;
    expect(pullable.state).toBe('pulled');
    expect(pullable.pullCount).toBe(1);
    const pulled = events.find(e => e.type === 'if.event.pulled')!;
    expect((pulled.data as any).messageId).toBe('if.action.pulling.pulled');
  });
});

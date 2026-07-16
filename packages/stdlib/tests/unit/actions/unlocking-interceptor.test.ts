/**
 * Unlocking action — ADR-118 interceptor hooks (ADR-228 Phase 4 wiring).
 *
 * unlocking.ts was never wired for interceptors: a registered `(trait,
 * if.action.unlocking)` interceptor sat in the registry and silently never
 * fired. These tests pin the full hook contract through the shared
 * lifecycle engine: preValidate veto (with NO state change), postExecute
 * mutation after the standard unlock, postReport emit/override, and the
 * no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { unlockingAction } from '../../../src/actions/standard/unlocking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, LockableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  createCommand,
  setupBasicWorld,
} from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const key = world.createEntity('iron key', 'object');
  const chest = world.createEntity('iron chest', 'object');
  chest.add({
    type: TraitType.LOCKABLE,
    isLocked: true,
    keyId: key.id
  });
  // Benign trait used purely as the interceptor registration key.
  chest.add({ type: TraitType.READABLE, text: '' });
  world.moveEntity(chest.id, room.id);
  world.moveEntity(key.id, player.id);
  return { world, player, room, chest, key };
};

const drive = (world: WorldModel, chest: any, key: any) => {
  const context = createRealTestContext(
    unlockingAction,
    world,
    createCommand(IFActions.UNLOCKING, {
      entity: chest,
      secondEntity: key,
      preposition: 'with'
    })
  );
  const validation = unlockingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: unlockingAction.blocked(context, validation) };
  }
  unlockingAction.execute(context);
  return { context, validation, events: unlockingAction.report(context) };
};

describe('Unlocking interceptor hooks (ADR-118 / ADR-228)', () => {
  test('preValidate veto blocks the unlock — target stays locked', () => {
    const { world, chest, key } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.UNLOCKING, {
      preValidate() {
        return { valid: false, error: 'test.lock_is_jammed' };
      },
    });

    const { validation, events } = drive(world, chest, key);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.lock_is_jammed');
    // THE state assertion: still locked.
    const lockable = chest.get(TraitType.LOCKABLE) as LockableTrait;
    expect(lockable.isLocked).toBe(true);
    expect(events.some(e => e.type === 'if.event.unlock_blocked')).toBe(true);
  });

  test('postExecute runs after the standard unlock and its mutation persists', () => {
    const { world, chest, key } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.UNLOCKING, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard unlock already happened (interceptor runs post).
        const lockable = target.get(TraitType.LOCKABLE) as LockableTrait;
        expect(lockable.isLocked).toBe(false);
        w.setStateValue('chest.click_heard', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, chest, key);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('chest.click_heard')).toBe(true);
    expect((chest.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the unlocked messageId', () => {
    const { world, chest, key } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.UNLOCKING, {
      postReport() {
        return {
          override: { messageId: 'chest.custom_unlocked' },
          emit: [{ type: 'chest.creak', payload: { messageId: 'chest.creaks_open' } }],
        };
      },
    });

    const { events } = drive(world, chest, key);

    const unlocked = events.find(e => e.type === 'if.event.unlocked')!;
    expect((unlocked.data as any).messageId).toBe('chest.custom_unlocked');
    const creak = events.find(e => e.type === 'chest.creak');
    expect(creak).toBeDefined();
    const creakData = ((creak!.data as any)?.data ?? creak!.data) as any;
    expect(creakData.messageId).toBe('chest.creaks_open');
  });

  test('no interceptor: behavior unchanged, standard unlocked event', () => {
    const { world, chest, key } = setup();

    const { validation, events } = drive(world, chest, key);

    expect(validation.valid).toBe(true);
    expect((chest.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
    const unlocked = events.find(e => e.type === 'if.event.unlocked')!;
    expect((unlocked.data as any).messageId).toBe('if.action.unlocking.unlocked_with');
  });
});

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
  TEST_MARKER_TRAIT,
  SECOND_TEST_MARKER_TRAIT,
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
  // Inert marker trait — the interceptor registration key.
  chest.add({ type: TEST_MARKER_TRAIT } as any);
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
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.UNLOCKING, {
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
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.UNLOCKING, {
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
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.UNLOCKING, {
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

describe('Key slot (ADR-229 R2)', () => {
  test('explicit key is consulted after the target, with seeded target context', () => {
    const { world, chest, key } = setup();
    // Inert marker trait — a distinct interceptor registration key for the key slot.
    key.add({ type: SECOND_TEST_MARKER_TRAIT } as any);

    const fired: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.UNLOCKING, {
      postExecute(entity, _w, _a, data) {
        fired.push('target');
        expect(entity.id).toBe(chest.id);
        expect(data.keyId).toBe(key.id); // symmetric seedData
      },
    });
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.UNLOCKING, {
      postExecute(entity, _w, _a, data) {
        fired.push('key');
        expect(entity.id).toBe(key.id);
        expect(data.targetId).toBe(chest.id); // key consultation sees the target
      },
    });

    drive(world, chest, key);

    // Published order (D3-B): target first, key second.
    expect(fired).toEqual(['target', 'key']);
  });

  test('a key-side preValidate veto blocks the unlock — target stays locked', () => {
    const { world, chest, key } = setup();
    // Inert marker trait — a distinct interceptor registration key for the key slot.
    key.add({ type: SECOND_TEST_MARKER_TRAIT } as any);
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.UNLOCKING, {
      preValidate() {
        return { valid: false, error: 'test.key_crumbles' };
      },
    });

    const { validation, events } = drive(world, chest, key);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.key_crumbles');
    // THE state assertion: still locked.
    expect((chest.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(true);
    expect(events.some(e => e.type === 'if.event.unlock_blocked')).toBe(true);
  });

  test('no key named: the key slot is not consulted', () => {
    const { world, player, room } = setupBasicWorld();
    // Keyless lock so UNLOCK CHEST is valid with no key in the command.
    const chest = world.createEntity('plain chest', 'object');
    chest.add({ type: TraitType.LOCKABLE, isLocked: true });
    world.moveEntity(chest.id, room.id);
    const key = world.createEntity('iron key', 'object');
    // Inert marker trait — a distinct interceptor registration key for the key slot.
    key.add({ type: SECOND_TEST_MARKER_TRAIT } as any);
    world.moveEntity(key.id, player.id);

    let keyConsulted = false;
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.UNLOCKING, {
      preValidate() {
        keyConsulted = true;
        return null;
      },
    });

    const context = createRealTestContext(
      unlockingAction,
      world,
      createCommand(IFActions.UNLOCKING, { entity: chest })
    );
    const validation = unlockingAction.validate(context);
    expect(validation.valid).toBe(true);
    unlockingAction.execute(context);
    unlockingAction.report(context);

    expect(keyConsulted).toBe(false);
    expect((chest.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
  });
});

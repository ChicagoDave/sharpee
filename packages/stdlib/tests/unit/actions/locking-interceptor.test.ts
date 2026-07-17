/**
 * Locking action — ADR-118 interceptor hooks (ADR-228 Phase 4 wiring).
 *
 * locking.ts was never wired for interceptors: a registered `(trait,
 * if.action.locking)` interceptor sat in the registry and silently never
 * fired. These tests pin the full hook contract through the shared
 * lifecycle engine: preValidate veto (with NO state change), postExecute
 * mutation after the standard lock, postReport emit/override, and the
 * no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { lockingAction } from '../../../src/actions/standard/locking';
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
    isLocked: false,
    keyId: key.id
  });
  // Inert marker trait — the target-side interceptor registration key.
  chest.add({ type: TEST_MARKER_TRAIT } as any);
  world.moveEntity(chest.id, room.id);
  world.moveEntity(key.id, player.id);
  return { world, player, room, chest, key };
};

const drive = (world: WorldModel, chest: any, key: any) => {
  const context = createRealTestContext(
    lockingAction,
    world,
    createCommand(IFActions.LOCKING, {
      entity: chest,
      secondEntity: key,
      preposition: 'with'
    })
  );
  const validation = lockingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: lockingAction.blocked(context, validation) };
  }
  lockingAction.execute(context);
  return { context, validation, events: lockingAction.report(context) };
};

describe('Locking interceptor hooks (ADR-118 / ADR-228)', () => {
  test('preValidate veto blocks the lock — target stays unlocked', () => {
    const { world, chest, key } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.LOCKING, {
      preValidate() {
        return { valid: false, error: 'test.bolt_is_bent' };
      },
    });

    const { validation, events } = drive(world, chest, key);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.bolt_is_bent');
    // THE state assertion: still unlocked.
    const lockable = chest.get(TraitType.LOCKABLE) as LockableTrait;
    expect(lockable.isLocked).toBe(false);
    expect(events.some(e => e.type === 'if.event.lock_blocked')).toBe(true);
  });

  test('postExecute runs after the standard lock and its mutation persists', () => {
    const { world, chest, key } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.LOCKING, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard lock already happened (interceptor runs post).
        const lockable = target.get(TraitType.LOCKABLE) as LockableTrait;
        expect(lockable.isLocked).toBe(true);
        w.setStateValue('chest.ward_engaged', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, chest, key);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('chest.ward_engaged')).toBe(true);
    expect((chest.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the locked messageId', () => {
    const { world, chest, key } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.LOCKING, {
      postReport() {
        return {
          override: { messageId: 'chest.custom_locked' },
          emit: [{ type: 'chest.hum', payload: { messageId: 'chest.ward_hums' } }],
        };
      },
    });

    const { events } = drive(world, chest, key);

    const locked = events.find(e => e.type === 'if.event.locked')!;
    expect((locked.data as any).messageId).toBe('chest.custom_locked');
    const hum = events.find(e => e.type === 'chest.hum');
    expect(hum).toBeDefined();
    const humData = ((hum!.data as any)?.data ?? hum!.data) as any;
    expect(humData.messageId).toBe('chest.ward_hums');
  });

  test('no interceptor: behavior unchanged, standard locked event', () => {
    const { world, chest, key } = setup();

    const { validation, events } = drive(world, chest, key);

    expect(validation.valid).toBe(true);
    expect((chest.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(true);
    const locked = events.find(e => e.type === 'if.event.locked')!;
    expect((locked.data as any).messageId).toBe('if.action.locking.locked_with');
  });
});

describe('Key slot (ADR-229 R2)', () => {
  test('explicit key is consulted after the target, with seeded target context', () => {
    const { world, chest, key } = setup();
    // Inert marker trait (second, distinct) — the key-slot registration key.
    key.add({ type: SECOND_TEST_MARKER_TRAIT } as any);

    const fired: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.LOCKING, {
      postExecute(entity, _w, _a, data) {
        fired.push('target');
        expect(entity.id).toBe(chest.id);
        expect(data.keyId).toBe(key.id); // symmetric seedData
      },
    });
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.LOCKING, {
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

  test('a key-side preValidate veto blocks the lock — target stays unlocked', () => {
    const { world, chest, key } = setup();
    // Inert marker trait (second, distinct) — the key-slot registration key.
    key.add({ type: SECOND_TEST_MARKER_TRAIT } as any);
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.LOCKING, {
      preValidate() {
        return { valid: false, error: 'test.key_bent' };
      },
    });

    const { validation, events } = drive(world, chest, key);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.key_bent');
    // THE state assertion: still unlocked.
    expect((chest.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
    expect(events.some(e => e.type === 'if.event.lock_blocked')).toBe(true);
  });

  test('no key named: the key slot is not consulted', () => {
    const { world, player, room } = setupBasicWorld();
    // Keyless lock so LOCK CHEST is valid with no key in the command.
    const chest = world.createEntity('plain chest', 'object');
    chest.add({ type: TraitType.LOCKABLE, isLocked: false });
    world.moveEntity(chest.id, room.id);
    const key = world.createEntity('iron key', 'object');
    // Inert marker trait (second, distinct) — the key-slot registration key.
    key.add({ type: SECOND_TEST_MARKER_TRAIT } as any);
    world.moveEntity(key.id, player.id);

    let keyConsulted = false;
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.LOCKING, {
      preValidate() {
        keyConsulted = true;
        return null;
      },
    });

    const context = createRealTestContext(
      lockingAction,
      world,
      createCommand(IFActions.LOCKING, { entity: chest })
    );
    const validation = lockingAction.validate(context);
    expect(validation.valid).toBe(true);
    lockingAction.execute(context);
    lockingAction.report(context);

    expect(keyConsulted).toBe(false);
    expect((chest.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(true);
  });
});

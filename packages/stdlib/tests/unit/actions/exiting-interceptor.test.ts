/**
 * Exiting action — ADR-228 implicit-entity pinning tests.
 *
 * EXIT takes no noun: the consultable entity (the container/supporter the
 * actor is inside/on) resolves implicitly from the actor's location. Pins
 * the full hook contract on that implicit slot — `on exiting it` on a
 * boat/cage/bed fires.
 */

import { describe, test, expect } from 'vitest';
import { exitingAction } from '../../../src/actions/standard/exiting';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { setupBasicWorld, createRealTestContext, createCommand, TEST_MARKER_TRAIT } from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const cage = world.createEntity('iron cage', 'object');
  cage.add({ type: TraitType.CONTAINER } as any);
  cage.add({ type: TraitType.ENTERABLE, canEnter: true } as any);
  // Inert marker trait — the interceptor registration key.
  cage.add({ type: TEST_MARKER_TRAIT } as any);
  world.moveEntity(cage.id, room.id);
  world.moveEntity(player.id, cage.id); // player starts inside
  return { world, player, room, cage };
};

const drive = (world: WorldModel) => {
  const command = createCommand(IFActions.EXITING);
  const context = createRealTestContext(exitingAction, world, command);
  const validation = exitingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: exitingAction.blocked!(context, validation) };
  }
  exitingAction.execute(context);
  return { context, validation, events: exitingAction.report(context) };
};

describe('Exiting interceptor hooks on the implicit container (ADR-228)', () => {
  test('preValidate veto blocks the exit — the actor stays inside; onBlocked decorates', () => {
    const { world, player, cage } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.EXITING, {
      preValidate(entity) {
        expect(entity.id).toBe(cage.id); // implicit resolution found the cage
        return { valid: false, error: 'test.cage_sealed' };
      },
      onBlocked(_e, _w, _a, error) {
        expect(error).toBe('test.cage_sealed');
        return { emit: [{ type: 'cage.rattles', payload: {} }] };
      },
    });

    const { validation, events } = drive(world);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.cage_sealed');
    // THE state assertion: still inside the cage.
    expect(world.getLocation(player.id)).toBe(cage.id);
    expect(events.some(e => e.type === 'if.event.exited' && (e.data as any).blocked)).toBe(true);
    expect(events.some(e => e.type === 'cage.rattles')).toBe(true);
  });

  test('postExecute runs after the move; postReport override lands on if.event.exited', () => {
    const { world, player, room, cage } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.EXITING, {
      postExecute(_e, w) {
        calls.push('postExecute');
        // The move already happened (hook runs post).
        expect(w.getLocation(player.id)).toBe(room.id);
        w.setStateValue('cage.exited', true);
      },
      postReport() {
        calls.push('postReport');
        return { override: { messageId: 'test.cage.squeaky_exit' } };
      },
    });

    const { events } = drive(world);

    expect(world.getLocation(player.id)).toBe(room.id);
    expect(world.getStateValue('cage.exited')).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
    const exited = events.find(e => e.type === 'if.event.exited')!;
    expect((exited.data as any).messageId).toBe('test.cage.squeaky_exit');
  });

  test('directly in a room: implicit slot resolves nothing, standard already_outside block', () => {
    const { world, player, room, cage } = setup();
    world.moveEntity(player.id, room.id); // not inside anything
    const fired: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.EXITING, {
      preValidate() { fired.push('cage'); return null; },
    });

    const { validation } = drive(world);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('already_outside');
    // The cage's hook did not fire — it isn't part of this command.
    expect(fired).toEqual([]);
  });
});

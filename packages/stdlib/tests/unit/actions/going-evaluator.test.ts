/**
 * going-evaluator.test.ts — ADR-240 Phase 1: going's two blocked-exit read
 * sites consult the per-world evaluator registry FIRST. A registered
 * `exit.blocked.*` evaluator blocks a room with NO RoomTrait.blockedExits
 * entry at all (proving the registry path is independent of the trait
 * map), its message comes from `exit.message.*` resolved at refusal time,
 * a `false` evaluator overrides a stamped block, and unregistered rooms
 * fall through to the trait map unchanged.
 */
import { describe, test, expect } from 'vitest';
import { goingAction, exitBlockedKey, exitMessageKey } from '../../../src/actions/standard/going';
import { IFActions } from '../../../src/actions/constants';
import { Direction, RoomBehavior, RoomTrait, TraitType } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../test-utils';

function goNorth(world: any) {
  const command = createCommand(IFActions.GOING);
  command.parsed.extras = { direction: Direction.NORTH };
  const context = createRealTestContext(goingAction, world, command);
  return { validation: goingAction.validate(context), context };
}

describe('ADR-240: going consults the evaluator registry first', () => {
  test('a registered exit.blocked → true blocks with NO trait-map entry, message from exit.message', () => {
    const { world, room } = setupBasicWorld();
    const room2 = world.createEntity('North Field', 'object');
    room2.add({ type: TraitType.ROOM });
    room.getTrait(RoomTrait)!.exits = { [Direction.NORTH]: { destination: room2.id } };

    let sealed = true;
    world.registerEvaluator(exitBlockedKey(room.id, Direction.NORTH), () => sealed);
    world.registerEvaluator(exitMessageKey(room.id, Direction.NORTH), () => 'The way is sealed by frost.');

    const blocked = goNorth(world);
    expect(blocked.validation.valid).toBe(false);
    expect(blocked.validation.error).toBe('movement_blocked');
    expect(blocked.validation.params?.message).toBe('The way is sealed by frost.');

    // Mutations are instant: flip the condition, no event in between.
    sealed = false;
    const open = goNorth(world);
    expect(open.validation.valid).toBe(true);
  });

  test('a registered exit.blocked → false overrides a STAMPED trait-map block', () => {
    const { world, room } = setupBasicWorld();
    const room2 = world.createEntity('North Field', 'object');
    room2.add({ type: TraitType.ROOM });
    room.getTrait(RoomTrait)!.exits = { [Direction.NORTH]: { destination: room2.id } };
    RoomBehavior.blockExit(room, Direction.NORTH, 'Stamped shut.');

    // Trait map says blocked; registry says open — registry is authoritative.
    world.registerEvaluator(exitBlockedKey(room.id, Direction.NORTH), () => false);
    expect(goNorth(world).validation.valid).toBe(true);
  });

  test('unregistered rooms fall through to the trait map unchanged', () => {
    const { world, room } = setupBasicWorld();
    const room2 = world.createEntity('North Field', 'object');
    room2.add({ type: TraitType.ROOM });
    room.getTrait(RoomTrait)!.exits = { [Direction.NORTH]: { destination: room2.id } };
    RoomBehavior.blockExit(room, Direction.NORTH, 'Stamped shut.');

    const result = goNorth(world);
    expect(result.validation.valid).toBe(false);
    expect(result.validation.params?.message).toBe('Stamped shut.');
  });
});

/**
 * going-first-visit-description.test.ts — GH #326: arriving in a room by
 * going shows the room's initial description (Chord's `first time` prose,
 * lowered to RoomTrait.initialDescription) in place of the standing
 * description on the first visit only, exactly as the looking action does
 * for a first `look`. The second arrival shows the standing description,
 * and a room without an initial description is unchanged. Assertions read
 * the emitted room-description event's snapshot and top-level field, and
 * the room's visited flag.
 */
import { describe, test, expect } from 'vitest';
import { goingAction } from '../../../src/actions/standard/going';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, Direction, RoomTrait, IdentityTrait, RoomBehavior, type IFEntity } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, executeWithValidation, createCommand } from '../../test-utils';

const STANDING = 'Commerce Street, the way out.';
const FIRST = 'You made it.';

function worldWithFirstTimeRoom(withInitial = true) {
  const { world, player, room } = setupBasicWorld();
  const street = world.createEntity('Commerce Street', 'room');
  street.add(new RoomTrait(withInitial ? { initialDescription: FIRST } : {}));
  street.add(new IdentityTrait({ name: 'Commerce Street', description: STANDING }));
  room.getTrait(RoomTrait)!.exits = { [Direction.EAST]: { destination: street.id } };
  street.getTrait(RoomTrait)!.exits = { [Direction.WEST]: { destination: room.id } };
  return { world, player, room, street };
}

function go(world: ReturnType<typeof setupBasicWorld>['world'], direction: string) {
  const command = createCommand(IFActions.GOING);
  command.parsed.extras = { direction };
  const context = createRealTestContext(goingAction, world, command);
  return executeWithValidation(goingAction, context);
}

function roomDescriptionOf(events: ReturnType<typeof go>) {
  const event = events.find((e) => e.type === 'if.event.room.description');
  expect(event, 'the arrival emits a room description').toBeDefined();
  const data = event!.data as { roomDescription: string; room: { description?: string } };
  return { top: data.roomDescription, snapshot: data.room.description };
}

describe('GH #326: first arrival by going shows the initial description', () => {
  test('the first arrival renders the initial description on both the snapshot and the top-level field', () => {
    const { world, street } = worldWithFirstTimeRoom();
    expect(RoomBehavior.hasBeenVisited(street)).toBe(false);

    const { top, snapshot } = roomDescriptionOf(go(world, Direction.EAST));

    expect(top).toBe(FIRST);
    expect(snapshot).toBe(FIRST);
    expect(RoomBehavior.hasBeenVisited(street)).toBe(true);
  });

  test('the second arrival renders the standing description', () => {
    const { world } = worldWithFirstTimeRoom();
    go(world, Direction.EAST);
    go(world, Direction.WEST);

    const { top, snapshot } = roomDescriptionOf(go(world, Direction.EAST));

    expect(top).toBe(STANDING);
    expect(snapshot).toBe(STANDING);
  });

  test('a room without an initial description renders its standing description on the first arrival', () => {
    const { world } = worldWithFirstTimeRoom(false);

    const { top, snapshot } = roomDescriptionOf(go(world, Direction.EAST));

    expect(top).toBe(STANDING);
    expect(snapshot).toBe(STANDING);
  });
});

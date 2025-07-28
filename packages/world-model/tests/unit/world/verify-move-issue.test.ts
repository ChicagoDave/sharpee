// verify-move-issue.test.ts - Verify the moveEntity issue

import { WorldModel } from '../../../src/world/WorldModel';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';

describe('Verify moveEntity issue', () => {
  it('should not allow moving items into closed containers', () => {
    const world = new WorldModel();

    const room = world.createEntity('Room', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());

    const cabinet = world.createEntity('Cabinet', 'container');
    cabinet.add(new ContainerTrait());
    cabinet.add(new OpenableTrait({ isOpen: false })); // Closed!

    const medicine = world.createEntity('Medicine', 'item');

    world.moveEntity(cabinet.id, room.id);

    const moved = world.moveEntity(medicine.id, cabinet.id);

    // Now open the cabinet and try again
    const openable = cabinet.getTrait('openable') as any;
    openable.isOpen = true;

    const moved2 = world.moveEntity(medicine.id, cabinet.id);
  });
});

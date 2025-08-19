// Debug test for worn item visibility

import { WorldModel } from '../src/world/WorldModel';
import { createTestRoom, createTestActor } from './fixtures/test-entities';
import { WearableTrait } from '../src/traits/wearable/wearableTrait';

describe('Debug Worn Visibility', () => {
  it('should debug worn item visibility', () => {
    const world = new WorldModel();
    const room = createTestRoom(world, 'Room');
    const player = createTestActor(world, 'Player');
    const npc = createTestActor(world, 'Noble');
    const crown = world.createEntity('Golden Crown', 'item');
    
    const crownWearable = new WearableTrait();
    (crownWearable as any).isWorn = true;
    (crownWearable as any).wornBy = npc.id;
    crown.add(crownWearable);

    world.moveEntity(player.id, room.id);
    world.moveEntity(npc.id, room.id);
    world.moveEntity(crown.id, npc.id);
    
    const visible = world.getVisible(player.id);
    
    expect(visible).toContain(npc);
    expect(visible).toContain(crown);
  });
});

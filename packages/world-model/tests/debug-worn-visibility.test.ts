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

    console.log('=== DEBUG INFO ===');
    console.log('Player location:', world.getLocation(player.id));
    console.log('NPC location:', world.getLocation(npc.id));
    console.log('Crown location:', world.getLocation(crown.id));
    
    const inScope = world.getInScope(player.id);
    console.log('\nIn scope entities:', inScope.map(e => ({ id: e.id, name: e.attributes.name })));
    
    const npcContents = world.getContents(npc.id, { includeWorn: true });
    console.log('\nNPC contents (with worn):', npcContents.map(e => ({ id: e.id, name: e.attributes.name })));
    
    const npcContentsNoWorn = world.getContents(npc.id, { includeWorn: false });
    console.log('\nNPC contents (without worn):', npcContentsNoWorn.map(e => ({ id: e.id, name: e.attributes.name })));
    
    const visible = world.getVisible(player.id);
    console.log('\nVisible entities:', visible.map(e => ({ id: e.id, name: e.attributes.name })));
    
    // Check visibility of each entity
    console.log('\nVisibility checks:');
    console.log('Can see room?', world.canSee(player.id, room.id));
    console.log('Can see NPC?', world.canSee(player.id, npc.id));
    console.log('Can see crown?', world.canSee(player.id, crown.id));
    
    expect(visible).toContain(npc);
    expect(visible).toContain(crown);
  });
});

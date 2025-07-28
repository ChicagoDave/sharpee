// Example: Basic darkness in Interactive Fiction
import { WorldModel } from '../src/world/WorldModel';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { LightSourceTrait } from '../src/traits/light-source/lightSourceTrait';

// Create world
const world = new WorldModel();

// Create a lit kitchen
const kitchen = world.createEntity('kitchen', 'Kitchen');
kitchen.add(new RoomTrait({ 
  isDark: false  // Kitchen is lit (default)
}));
kitchen.add(new ContainerTrait());

// Create a dark cellar
const cellar = world.createEntity('cellar', 'Cellar');
cellar.add(new RoomTrait({ 
  isDark: true   // Cellar is dark!
}));
cellar.add(new ContainerTrait());

// Create a lamp
const lamp = world.createEntity('lamp', 'Brass Lamp');
lamp.add(new LightSourceTrait({ 
  isLit: false   // Lamp starts off
}));

// Create player
const player = world.createEntity('player', 'Player');
player.add(new ContainerTrait());

// Place everything
world.moveEntity('player', 'kitchen');
world.moveEntity('lamp', 'kitchen');

// In the kitchen (lit room), player can see everything
console.log('In kitchen:', world.getVisible('player').map(e => e.type));
// Output: ['Kitchen', 'Brass Lamp']

// Move to cellar without lamp
world.moveEntity('player', 'cellar');
console.log('In dark cellar:', world.getVisible('player').map(e => e.type));
// Output: [] - can't see anything!

// Go back and get the lamp
world.moveEntity('player', 'kitchen');
world.moveEntity('lamp', 'player'); // Pick up lamp

// Turn on the lamp
const lampEntity = world.getEntity('lamp')!;
const lightTrait = lampEntity.getTrait('light-source') as LightSourceTrait;
lightTrait.isOn = true;

// Now go to cellar with lit lamp
world.moveEntity('player', 'cellar');
console.log('In cellar with lamp:', world.getVisible('player').map(e => e.type));
// Output: ['Cellar', 'Brass Lamp'] - can see!

// Authors can also dynamically control room lighting
const cellarRoom = world.getEntity('cellar')!;
const roomTrait = cellarRoom.getTrait('room') as RoomTrait;

// Turn on the lights in the cellar (maybe player found a light switch)
roomTrait.isDark = false;
console.log('Cellar lights on:', world.getVisible('player').map(e => e.type));
// Output: ['Cellar', 'Brass Lamp'] - can see even without lamp now

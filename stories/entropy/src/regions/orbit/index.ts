/**
 * Orbit Region — Above battlefield, planetary orbit, Cho 'Tak Ru enemy ship
 *
 * Rooms: Above Lost Battlefield, Planetary Orbit, Outside Ship,
 *        Airlock, Inside Ship, Bridge
 * Contains the orbital encounter, airlock puzzle, and ship AI confrontation.
 * The Cho 'Tak Ru becomes Chrysilya's ship for the rest of the game.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  SceneryTrait,
  OpenableTrait,
  EntityType,
  Direction,
} from '@sharpee/world-model';

// Room IDs
export const OrbitRoomIds = {
  ABOVE_BATTLEFIELD: 'above-battlefield',
  ORBIT: 'orbit',
  OUTSIDE_SHIP: 'outside-ship',
  AIRLOCK: 'airlock',
  INSIDE_SHIP: 'inside-ship',
  BRIDGE: 'bridge',
} as const;

/**
 * Create orbit/ship rooms and objects.
 */
export function createOrbitRegion(world: WorldModel): void {
  // --- Above Lost Battlefield ---
  const alb = world.createEntity(OrbitRoomIds.ABOVE_BATTLEFIELD, EntityType.ROOM);
  alb.add(new IdentityTrait({
    name: 'Above the Lost Battlefield',
    description:
      'You hover three hundred meters above the devastation. The full scope of the '
      + 'destruction is visible from here — craters pockmark the landscape in every '
      + 'direction, smoke rises from a thousand fires, and the red sky stretches '
      + 'to every horizon.',
  }));
  // TODO: Requires flight skin to reach (u_to from battlefield)

  // --- Planetary Orbit ---
  const orb = world.createEntity(OrbitRoomIds.ORBIT, EntityType.ROOM);
  orb.add(new IdentityTrait({
    name: 'Planetary Orbit',
    description:
      'You float in low orbit above Earthangelos. The planet below is shrouded in '
      + 'ash and smoke. Stars burn with cold indifference above.',
  }));
  // TODO: SpaceShip daemon shows Cho 'Tak Ru approaching/receding

  // --- Outside Ship (Cho 'Tak Ru hull) ---
  const os = world.createEntity(OrbitRoomIds.OUTSIDE_SHIP, EntityType.ROOM);
  os.add(new IdentityTrait({
    name: 'Outside Ship',
    description:
      'You cling to the outer hull of the Cho \'Tak Ru, a Tra \'Jan Gore reconnaissance '
      + 'vessel. The hull is dark and angular. A small button is mounted beside '
      + 'the outer airlock door.',
  }));

  const hullButton = world.createEntity('hull-button', EntityType.OBJECT);
  hullButton.add(new IdentityTrait({
    name: 'button',
    aliases: ['small button'],
    description: 'A small recessed button beside the outer airlock door.',
  }));
  hullButton.add(new SceneryTrait());
  world.moveEntity(hullButton.id, os.id);
  // TODO: Push button to board ship

  // --- Airlock (Cho 'Tak Ru) ---
  const al = world.createEntity(OrbitRoomIds.AIRLOCK, EntityType.ROOM);
  al.add(new IdentityTrait({
    name: 'Air-Lock',
    description:
      'A cramped airlock chamber. An inner hatch leads deeper into the ship. '
      + 'An outer hatch leads to space. A control panel with three buttons — '
      + 'green, white, and red — is mounted on the wall.',
  }));
  // TODO: Pressurization state, inner/outer hatch state

  // Airlock control panel
  const panel = world.createEntity('airlock-panel', EntityType.OBJECT);
  panel.add(new IdentityTrait({
    name: 'panel',
    aliases: ['control panel', 'controls'],
    description: 'A control panel with three buttons and two cable sockets.',
  }));
  panel.add(new SceneryTrait());
  world.moveEntity(panel.id, al.id);
  // TODO: Attachable trait for safety cable

  // Green button — opens inner hatch
  const greenButton = world.createEntity('green-button', EntityType.OBJECT);
  greenButton.add(new IdentityTrait({
    name: 'green button',
    aliases: ['green'],
    description: 'A green button labeled with alien script.',
  }));
  greenButton.add(new SceneryTrait());
  world.moveEntity(greenButton.id, al.id);

  // White button — toggles pressurization
  const whiteButton = world.createEntity('white-button', EntityType.OBJECT);
  whiteButton.add(new IdentityTrait({
    name: 'white button',
    aliases: ['white'],
    description: 'A white button labeled with alien script.',
  }));
  whiteButton.add(new SceneryTrait());
  world.moveEntity(whiteButton.id, al.id);

  // Red button — toggles outer hatch
  const redButton = world.createEntity('red-button', EntityType.OBJECT);
  redButton.add(new IdentityTrait({
    name: 'red button',
    aliases: ['red'],
    description: 'A red button labeled with alien script.',
  }));
  redButton.add(new SceneryTrait());
  world.moveEntity(redButton.id, al.id);

  // Inner and outer hatches
  const innerHatch = world.createEntity('inner-hatch', EntityType.OBJECT);
  innerHatch.add(new IdentityTrait({
    name: 'inner hatch',
    aliases: ['inner', 'hatch'],
    description: 'A heavy inner hatch leading deeper into the ship.',
  }));
  innerHatch.add(new SceneryTrait());
  innerHatch.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(innerHatch.id, al.id);

  const outerHatch = world.createEntity('outer-hatch', EntityType.OBJECT);
  outerHatch.add(new IdentityTrait({
    name: 'outer hatch',
    aliases: ['outer', 'exterior'],
    description: 'A reinforced outer hatch. Beyond it: vacuum.',
  }));
  outerHatch.add(new SceneryTrait());
  outerHatch.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(outerHatch.id, al.id);

  // --- Inside Ship ---
  const ins = world.createEntity(OrbitRoomIds.INSIDE_SHIP, EntityType.ROOM);
  ins.add(new IdentityTrait({
    name: 'Inside Ship',
    description:
      'A utilitarian cabin. The walls are bare alloy, the lighting harsh and angular. '
      + 'Lockers line one wall. The airlock is behind you. The bridge lies ahead.',
  }));

  // Plasma rifle
  const plasmaRifle = world.createEntity('plasma-rifle', EntityType.OBJECT);
  plasmaRifle.add(new IdentityTrait({
    name: 'plasma rifle',
    aliases: ['rifle', 'weapon', 'gun'],
    description: 'A Tra \'Jan Gore plasma rifle. Heavy, angular, lethal.',
  }));
  world.moveEntity(plasmaRifle.id, ins.id);
  // TODO: Shoot action, combat with Tra 'Jan Gore soldier

  // --- Bridge ---
  const br = world.createEntity(OrbitRoomIds.BRIDGE, EntityType.ROOM);
  br.add(new IdentityTrait({
    name: 'Bridge',
    description:
      'The command center of the Cho \'Tak Ru. Angular consoles surround a central '
      + 'command chair. The viewscreen shows the ash-covered planet below.',
  }));
  // TODO: Ship AI confrontation triggered here
  // TODO: Memory flashback (time displacement device revelation)
  // TODO: Core interface for AE Field connection
}

/**
 * Connect orbit rooms.
 */
export function connectOrbitRooms(world: WorldModel): void {
  const w = world as any;

  // Above Battlefield → Orbit
  w.connectRooms(OrbitRoomIds.ABOVE_BATTLEFIELD, OrbitRoomIds.ORBIT, Direction.UP);

  // Outside Ship → Airlock (gated by hull button)
  // TODO: Conditional — push button to open

  // Airlock → Inside Ship (gated by green button / inner hatch)
  // TODO: Conditional — inner hatch must be open

  // Inside Ship → Bridge
  w.connectRooms(OrbitRoomIds.INSIDE_SHIP, OrbitRoomIds.BRIDGE, Direction.IN);
}

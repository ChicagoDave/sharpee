/**
 * World initialization for the regression test story.
 *
 * Creates all rooms, objects, and NPCs. Extracted from the Story class
 * so that new test entities can be added without bloating index.ts.
 *
 * Public interface: setupWorld(), getRoomIds()
 * Owner: npm regression test suite
 */

import {
  WorldModel,
  EntityType,
  Direction,
  AuthorModel,
  registerCapabilityBehavior,
  hasCapabilityBehavior,
} from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  SupporterTrait,
  RoomTrait,
  SceneryTrait,
  OpenableTrait,
  LockableTrait,
  ReadableTrait,
  SwitchableTrait,
  LightSourceTrait,
  WearableTrait,
  NpcTrait,
  EdibleTrait,
  ClothingTrait,
  PushableTrait,
  PullableTrait,
  ButtonTrait,
  ClimbableTrait,
  EnterableTrait,
  VehicleTrait,
  DoorTrait,
  AttachedTrait,
  MoveableSceneryTrait,
  WeaponTrait,
  CombatantTrait,
  BreakableTrait,
} from '@sharpee/world-model';
import { registerBasicCombat } from '@sharpee/ext-basic-combat';
import { InspectableTrait } from './traits';
import { inspectBehavior, INSPECT_ACTION_ID } from './behaviors';

/** Room IDs set during world setup, accessed by actions and tests. */
const roomIds = {
  controlRoom: '',
  serverRoom: '',
  supplyCloset: '',
  rooftop: '',
  utilityRoom: '',
};

/**
 * Returns the room IDs set during world initialization.
 */
export function getRoomIds(): Readonly<typeof roomIds> {
  return roomIds;
}

/**
 * Build the four-room facility and place all objects.
 *
 * @param world - The world model to populate
 */
export function setupWorld(world: WorldModel): void {
  world.setMaxScore(50);

  const player = world.getPlayer()!;

  // ---- ROOMS ----

  const controlRoom = world.createEntity('Control Room', EntityType.ROOM);
  controlRoom.add(new RoomTrait({ exits: {}, isDark: false }));
  controlRoom.add(
    new IdentityTrait({
      name: 'Control Room',
      description:
        'The main control room of the maintenance facility. Banks of monitors line the walls. A sturdy workbench dominates the center of the room. Exits lead east to the server room and south to the supply closet.',
      aliases: ['control room', 'control'],
      properName: false,
      article: 'the',
    }),
  );
  roomIds.controlRoom = controlRoom.id;

  const serverRoom = world.createEntity('Server Room', EntityType.ROOM);
  serverRoom.add(new RoomTrait({ exits: {}, isDark: false }));
  serverRoom.add(
    new IdentityTrait({
      name: 'Server Room',
      description:
        'Rows of humming server racks fill this chilly room. Status LEDs blink in hypnotic patterns. A maintenance bot trundles between the racks. The control room is to the west and the rooftop is to the south.',
      aliases: ['server room', 'servers'],
      properName: false,
      article: 'the',
    }),
  );
  roomIds.serverRoom = serverRoom.id;

  const supplyCloset = world.createEntity('Supply Closet', EntityType.ROOM);
  supplyCloset.add(new RoomTrait({ exits: {}, isDark: true }));
  supplyCloset.add(
    new IdentityTrait({
      name: 'Supply Closet',
      description:
        'A cramped closet lined with metal shelves. The air smells of machine oil and old circuit boards. The control room is back to the north. A passage leads east to the rooftop.',
      aliases: ['supply closet', 'closet'],
      properName: false,
      article: 'the',
    }),
  );
  roomIds.supplyCloset = supplyCloset.id;

  const rooftop = world.createEntity('Rooftop', EntityType.ROOM);
  rooftop.add(new RoomTrait({ exits: {}, isDark: false }));
  rooftop.add(
    new IdentityTrait({
      name: 'Rooftop',
      description:
        'The flat rooftop of the facility. A large antenna array rises from a concrete base. The wind whips across the open space. Doors lead north to the server room and west to the supply closet.',
      aliases: ['rooftop', 'roof'],
      properName: false,
      article: 'the',
    }),
  );
  roomIds.rooftop = rooftop.id;

  // ---- CONNECTIONS ----

  world.connectRooms(controlRoom.id, serverRoom.id, Direction.EAST);
  world.connectRooms(controlRoom.id, supplyCloset.id, Direction.SOUTH);
  world.connectRooms(serverRoom.id, rooftop.id, Direction.SOUTH);
  world.connectRooms(supplyCloset.id, rooftop.id, Direction.EAST);

  // ---- SCENERY ----

  const monitors = world.createEntity('monitors', EntityType.ITEM);
  monitors.add(
    new IdentityTrait({
      name: 'monitors',
      description: 'A bank of CRT monitors displaying scrolling system logs.',
      aliases: ['monitors', 'screens', 'displays'],
      properName: false,
      article: 'the',
    }),
  );
  monitors.add(new SceneryTrait());
  world.moveEntity(monitors.id, controlRoom.id);

  const antenna = world.createEntity('antenna', EntityType.ITEM);
  antenna.add(
    new IdentityTrait({
      name: 'antenna array',
      description:
        'A forest of aluminum rods and dish receivers mounted on a heavy steel frame.',
      aliases: ['antenna', 'antenna array', 'array', 'dish'],
      properName: false,
      article: 'the',
    }),
  );
  antenna.add(new SceneryTrait());
  world.moveEntity(antenna.id, rooftop.id);

  // ---- SUPPORTER (workbench) ----

  const workbench = world.createEntity('workbench', EntityType.ITEM);
  workbench.add(
    new IdentityTrait({
      name: 'workbench',
      description: 'A heavy steel workbench bolted to the floor.',
      aliases: ['workbench', 'bench', 'table'],
      properName: false,
      article: 'a',
    }),
  );
  workbench.add(new SceneryTrait());
  workbench.add(new SupporterTrait({ capacity: { maxItems: 5 } }));
  world.moveEntity(workbench.id, controlRoom.id);

  // ---- PORTABLE OBJECTS ----

  const clipboard = world.createEntity('clipboard', EntityType.ITEM);
  clipboard.add(
    new IdentityTrait({
      name: 'clipboard',
      description: 'A battered metal clipboard with a maintenance checklist.',
      aliases: ['clipboard', 'checklist'],
      properName: false,
      article: 'a',
    }),
  );
  clipboard.add(
    new ReadableTrait({
      text: 'MAINTENANCE CHECKLIST:\n1. Check server rack temperatures\n2. Inspect antenna alignment\n3. Restock supply closet\n4. Run diagnostic ping',
    }),
  );
  world.moveEntity(clipboard.id, controlRoom.id);

  // ---- WEARABLE (hard hat) ----

  const hardHat = world.createEntity('hard hat', EntityType.ITEM);
  hardHat.add(
    new IdentityTrait({
      name: 'hard hat',
      description: 'A bright yellow hard hat with a facility logo.',
      aliases: ['hard hat', 'hat', 'helmet'],
      properName: false,
      article: 'a',
    }),
  );
  hardHat.add(new WearableTrait({ slot: 'head' }));
  world.moveEntity(hardHat.id, controlRoom.id);

  // ---- CONTAINER (toolbox, openable + lockable) ----

  const toolbox = world.createEntity('toolbox', EntityType.ITEM);
  toolbox.add(
    new IdentityTrait({
      name: 'toolbox',
      description: 'A red metal toolbox with a small padlock.',
      aliases: ['toolbox', 'tool box', 'box'],
      properName: false,
      article: 'a',
    }),
  );
  toolbox.add(new SceneryTrait());
  toolbox.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
  toolbox.add(new OpenableTrait({ isOpen: false }));
  toolbox.add(new LockableTrait({ isLocked: true, keyId: '' }));
  world.moveEntity(toolbox.id, supplyCloset.id);

  // Wrench inside the toolbox (placed using AuthorModel to bypass closed-container check)
  const wrench = world.createEntity('wrench', EntityType.ITEM);
  wrench.add(
    new IdentityTrait({
      name: 'wrench',
      description: 'A heavy adjustable wrench.',
      aliases: ['wrench', 'spanner'],
      properName: false,
      article: 'a',
    }),
  );
  const authorModel = new AuthorModel(world.getDataStore());
  authorModel.moveEntity(wrench.id, toolbox.id);

  // Key for the toolbox
  const toolboxKey = world.createEntity('small key', EntityType.ITEM);
  toolboxKey.add(
    new IdentityTrait({
      name: 'small key',
      description: 'A small brass key that looks like it fits a padlock.',
      aliases: ['key', 'small key', 'brass key'],
      properName: false,
      article: 'a',
    }),
  );
  world.moveEntity(toolboxKey.id, controlRoom.id);

  // Wire up the lock
  const lockTrait = toolbox.get(LockableTrait);
  if (lockTrait) {
    lockTrait.keyId = toolboxKey.id;
  }

  // ---- SWITCHABLE + LIGHT SOURCE (flashlight) ----

  const flashlight = world.createEntity('flashlight', EntityType.ITEM);
  flashlight.add(
    new IdentityTrait({
      name: 'flashlight',
      description: 'A heavy-duty yellow flashlight.',
      aliases: ['flashlight', 'torch', 'light', 'lamp'],
      properName: false,
      article: 'a',
    }),
  );
  flashlight.add(new SwitchableTrait({ isOn: false }));
  flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
  world.moveEntity(flashlight.id, controlRoom.id);

  // ---- INSPECTABLE (server rack — capability dispatch) ----

  const serverRack = world.createEntity('server rack', EntityType.ITEM);
  serverRack.add(
    new IdentityTrait({
      name: 'server rack',
      description:
        'A tall black server rack with blinking LEDs. It looks like it could be inspected more closely.',
      aliases: ['server rack', 'rack', 'server', 'servers'],
      properName: false,
      article: 'a',
    }),
  );
  serverRack.add(new SceneryTrait());
  serverRack.add(new InspectableTrait('Temperature: 22°C. Load: 73%. All drives healthy.'));
  world.moveEntity(serverRack.id, serverRoom.id);

  // Register capability behavior
  if (!hasCapabilityBehavior(InspectableTrait.type, INSPECT_ACTION_ID)) {
    registerCapabilityBehavior(InspectableTrait.type, INSPECT_ACTION_ID, inspectBehavior);
  }

  // ---- NPC (maintenance bot) ----

  const bot = world.createEntity('maintenance bot', EntityType.ACTOR);
  bot.add(
    new IdentityTrait({
      name: 'maintenance bot',
      description:
        'A squat wheeled robot with a rotating optical sensor and a toolbelt of tiny arms.',
      aliases: ['bot', 'maintenance bot', 'robot'],
      properName: false,
      article: 'a',
    }),
  );
  bot.add(new ActorTrait({ isPlayer: false }));
  bot.add(new NpcTrait({ behaviorId: 'regression-patrol-bot' }));
  world.moveEntity(bot.id, serverRoom.id);

  // ---- EDIBLE (energy bar) ----

  const energyBar = world.createEntity('energy bar', EntityType.ITEM);
  energyBar.add(
    new IdentityTrait({
      name: 'energy bar',
      description: 'A foil-wrapped energy bar with "FACILITY FUEL" printed on the label.',
      aliases: ['energy bar', 'bar', 'snack'],
      properName: false,
      article: 'an',
    }),
  );
  energyBar.add(new EdibleTrait({ nutrition: 3, taste: 'bland' }));
  world.moveEntity(energyBar.id, controlRoom.id);

  // ---- CLOTHING (lab coat — layered over other wearables) ----

  const labCoat = world.createEntity('lab coat', EntityType.ITEM);
  labCoat.add(
    new IdentityTrait({
      name: 'lab coat',
      description: 'A white lab coat with "MAINTENANCE" embroidered on the breast pocket.',
      aliases: ['lab coat', 'coat', 'white coat'],
      properName: false,
      article: 'a',
    }),
  );
  labCoat.add(new ClothingTrait({ slot: 'torso', layer: 2, material: 'cotton', style: 'professional' }));
  world.moveEntity(labCoat.id, serverRoom.id);

  // ---- PUSHABLE (heavy crate) ----

  const crate = world.createEntity('heavy crate', EntityType.ITEM);
  crate.add(
    new IdentityTrait({
      name: 'heavy crate',
      description: 'A large wooden crate stamped with "FRAGILE — SERVER PARTS".',
      aliases: ['heavy crate', 'crate', 'wooden crate'],
      properName: false,
      article: 'a',
    }),
  );
  crate.add(new SceneryTrait());
  crate.add(new PushableTrait({ pushType: 'heavy' }));
  world.moveEntity(crate.id, serverRoom.id);

  // ---- PULLABLE (lever) ----

  const lever = world.createEntity('lever', EntityType.ITEM);
  lever.add(
    new IdentityTrait({
      name: 'lever',
      description: 'A metal lever set into the wall, currently in the up position.',
      aliases: ['lever', 'metal lever', 'handle'],
      properName: false,
      article: 'a',
    }),
  );
  lever.add(new SceneryTrait());
  lever.add(new PullableTrait({ pullType: 'lever', repeatable: true }));
  world.moveEntity(lever.id, supplyCloset.id);

  // ---- BUTTON (wall button) ----

  const wallButton = world.createEntity('red button', EntityType.ITEM);
  wallButton.add(
    new IdentityTrait({
      name: 'red button',
      description: 'A large red button mounted on the wall next to the door.',
      aliases: ['red button', 'button', 'wall button'],
      properName: false,
      article: 'a',
    }),
  );
  wallButton.add(new SceneryTrait());
  wallButton.add(new ButtonTrait({ latching: true, color: 'red', shape: 'round', label: 'ALERT' }));
  wallButton.add(new PushableTrait({ pushType: 'button' }));
  world.moveEntity(wallButton.id, rooftop.id);

  // ---- CLIMBABLE (ladder) ----

  const ladder = world.createEntity('ladder', EntityType.ITEM);
  ladder.add(
    new IdentityTrait({
      name: 'ladder',
      description: 'A sturdy metal ladder bolted to the wall, leading up to the antenna platform.',
      aliases: ['ladder', 'metal ladder'],
      properName: false,
      article: 'a',
    }),
  );
  ladder.add(new SceneryTrait());
  ladder.add(new ClimbableTrait({ direction: 'up' }));
  world.moveEntity(ladder.id, rooftop.id);

  // ---- ENTERABLE (maintenance booth) ----

  const booth = world.createEntity('maintenance booth', EntityType.ITEM);
  booth.add(
    new IdentityTrait({
      name: 'maintenance booth',
      description: 'A small enclosed booth with a glass window, used for equipment check-in.',
      aliases: ['maintenance booth', 'booth', 'check-in booth'],
      properName: false,
      article: 'a',
    }),
  );
  booth.add(new SceneryTrait());
  booth.add(new EnterableTrait({ preposition: 'in' }));
  booth.add(new ContainerTrait({ capacity: { maxItems: 2 } }));
  world.moveEntity(booth.id, controlRoom.id);

  // ---- VEHICLE (utility cart) ----

  const cart = world.createEntity('utility cart', EntityType.ITEM);
  cart.add(
    new IdentityTrait({
      name: 'utility cart',
      description: 'A battery-powered utility cart with a flat cargo bed.',
      aliases: ['utility cart', 'cart', 'vehicle'],
      properName: false,
      article: 'a',
    }),
  );
  cart.add(new SceneryTrait());
  cart.add(new EnterableTrait({ preposition: 'in' }));
  cart.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
  cart.add(new VehicleTrait({ vehicleType: 'generic' }));
  world.moveEntity(cart.id, rooftop.id);

  // ---- UTILITY ROOM (behind a door from Rooftop) ----

  const utilityRoom = world.createEntity('Utility Room', EntityType.ROOM);
  utilityRoom.add(new RoomTrait({ exits: {}, isDark: false }));
  utilityRoom.add(
    new IdentityTrait({
      name: 'Utility Room',
      description:
        'A small room packed with electrical panels and breaker boxes. A heavy steel door leads back west to the rooftop.',
      aliases: ['utility room', 'utility'],
      properName: false,
      article: 'the',
    }),
  );
  roomIds.utilityRoom = utilityRoom.id;

  // Connect Utility Room to Rooftop (east from Rooftop, west from Utility Room)
  // The door entity controls passage
  world.connectRooms(rooftop.id, utilityRoom.id, Direction.EAST);

  // ---- DOOR (between Rooftop and Utility Room) ----

  const steelDoor = world.createEntity('steel door', EntityType.ITEM);
  steelDoor.add(
    new IdentityTrait({
      name: 'steel door',
      description: 'A heavy steel door with a small porthole window.',
      aliases: ['steel door', 'door', 'heavy door'],
      properName: false,
      article: 'a',
    }),
  );
  steelDoor.add(new SceneryTrait());
  steelDoor.add(new DoorTrait({ room1: rooftop.id, room2: utilityRoom.id }));
  steelDoor.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(steelDoor.id, rooftop.id);

  // ---- ATTACHED (cable in Utility Room) ----

  const cable = world.createEntity('cable', EntityType.ITEM);
  cable.add(
    new IdentityTrait({
      name: 'cable',
      description: 'A thick power cable dangling from a junction box on the wall.',
      aliases: ['cable', 'power cable', 'cord'],
      properName: false,
      article: 'a',
    }),
  );
  cable.add(new SceneryTrait());
  cable.add(new AttachedTrait({ attachmentType: 'stuck', detachable: false }));
  world.moveEntity(cable.id, utilityRoom.id);

  // ---- MOVEABLE SCENERY (metal panel in Utility Room) ----

  const panel = world.createEntity('metal panel', EntityType.ITEM);
  panel.add(
    new IdentityTrait({
      name: 'metal panel',
      description: 'A loose metal panel leaning against the wall. It looks heavy but moveable.',
      aliases: ['metal panel', 'panel', 'loose panel'],
      properName: false,
      article: 'a',
    }),
  );
  panel.add(new MoveableSceneryTrait({ weightClass: 'heavy' }));
  world.moveEntity(panel.id, utilityRoom.id);

  // ---- WEAPON (crowbar) ----

  const crowbar = world.createEntity('crowbar', EntityType.ITEM);
  crowbar.add(
    new IdentityTrait({
      name: 'crowbar',
      description: 'A heavy steel crowbar. Good for prying things open — or self-defense.',
      aliases: ['crowbar', 'bar', 'pry bar'],
      properName: false,
      article: 'a',
    }),
  );
  crowbar.add(new WeaponTrait({ damage: 3 }));
  world.moveEntity(crowbar.id, utilityRoom.id);

  // ---- COMBATANT (training dummy in Server Room) ----

  const dummy = world.createEntity('training dummy', EntityType.ITEM);
  dummy.add(
    new IdentityTrait({
      name: 'training dummy',
      description: 'A padded training dummy bolted to a post. It has a target painted on its chest.',
      aliases: ['training dummy', 'dummy', 'target dummy'],
      properName: false,
      article: 'a',
    }),
  );
  dummy.add(new SceneryTrait());
  dummy.add(new CombatantTrait({ health: 5, maxHealth: 5, hostile: false, canRetaliate: false }));
  world.moveEntity(dummy.id, serverRoom.id);

  // ---- BREAKABLE (glass panel on Rooftop) ----

  const glassPanel = world.createEntity('glass panel', EntityType.ITEM);
  glassPanel.add(
    new IdentityTrait({
      name: 'glass panel',
      description: 'A thin glass panel covering an emergency access hatch.',
      aliases: ['glass panel', 'glass', 'panel cover'],
      properName: false,
      article: 'a',
    }),
  );
  glassPanel.add(new SceneryTrait());
  glassPanel.add(new BreakableTrait());
  world.moveEntity(glassPanel.id, rooftop.id);

  // ---- REGISTER COMBAT SYSTEM ----
  // Guard: interceptor registry is global; second story load throws if already registered
  try {
    registerBasicCombat();
  } catch {
    // Already registered from a previous transcript run in the same process
  }

  // ---- PLACE PLAYER ----

  world.moveEntity(player.id, controlRoom.id);
}

/**
 * Balloon Objects - Hot air balloon and components for volcano navigation
 *
 * The balloon is a transparent vehicle that rises/descends through the volcano shaft.
 * - Receptacle: brazier that holds burning objects (controls lift)
 * - Cloth bag: visual component, inflates when something burns in receptacle
 * - Hooks: at ledge positions for tying the braided rope to dock
 *
 * From FORTRAN: BALLO(98), RECEP(99), HOOK1(102), HOOK2(103), DBALL(113)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  SceneryTrait,
  VehicleTrait,
  EntityType
} from '@sharpee/world-model';

/**
 * Balloon state stored on the balloon entity
 */
export interface BalloonState {
  /** Current position in volcano shaft */
  position: BalloonPosition;

  /** Which hook the braided rope is tied to (null if not tethered) */
  tetheredTo: 'hook1' | 'hook2' | null;

  /** Entity ID of object burning in receptacle (null if empty) */
  burningObject: string | null;

  /** Whether balloon daemon is enabled (disabled when tethered) */
  daemonEnabled: boolean;
}

/**
 * Balloon positions matching FORTRAN constants
 */
export type BalloonPosition =
  | 'vlbot'   // Volcano Bottom (126) - ground level
  | 'vair1'   // Mid-air 1 (127) - just above bottom
  | 'vair2'   // Mid-air 2 (128) - near ledg2/Narrow Ledge
  | 'vair3'   // Mid-air 3 (129)
  | 'vair4'   // Mid-air 4 (130) - TOP, crash zone!
  | 'ledg2'   // Ledge 2 (131) - dockable, W to Narrow Ledge
  | 'ledg3'   // Ledge 3 (132) - dockable
  | 'ledg4';  // Ledge 4 (133) - dockable, W to Wide Ledge

/**
 * Check if position is a ledge (can dock)
 */
export function isLedgePosition(pos: BalloonPosition): boolean {
  return pos === 'ledg2' || pos === 'ledg3' || pos === 'ledg4';
}

/**
 * Check if position is mid-air (no exits)
 */
export function isMidairPosition(pos: BalloonPosition): boolean {
  return pos === 'vair1' || pos === 'vair2' || pos === 'vair3' || pos === 'vair4';
}

/**
 * Get the next position up (for ascending)
 */
export function nextPositionUp(pos: BalloonPosition): BalloonPosition | null {
  const upMap: Record<BalloonPosition, BalloonPosition | null> = {
    'vlbot': 'vair1',
    'vair1': 'vair2',
    'vair2': 'vair3',
    'vair3': 'vair4',
    'vair4': null, // Crash!
    'ledg2': 'vair2', // Drift from ledge
    'ledg3': 'vair3',
    'ledg4': 'vair4',
  };
  return upMap[pos];
}

/**
 * Get the next position down (for descending)
 */
export function nextPositionDown(pos: BalloonPosition): BalloonPosition | null {
  const downMap: Record<BalloonPosition, BalloonPosition | null> = {
    'vlbot': null, // Already at bottom
    'vair1': 'vlbot',
    'vair2': 'vair1',
    'vair3': 'vair2',
    'vair4': 'vair3',
    'ledg2': 'vair2', // Drift from ledge (same as up - always drifts to midair)
    'ledg3': 'vair3',
    'ledg4': 'vair4',
  };
  return downMap[pos];
}

/**
 * Get midair position corresponding to a ledge
 */
export function ledgeToMidair(pos: BalloonPosition): BalloonPosition {
  const ledgeMap: Record<string, BalloonPosition> = {
    'ledg2': 'vair2',
    'ledg3': 'vair3',
    'ledg4': 'vair4',
  };
  return ledgeMap[pos] || pos;
}

/**
 * Room IDs needed for balloon exit mechanics
 */
export interface BalloonRoomIds {
  volcanoBottom: string;
  narrowLedge: string;  // ledg2 exit
  wideLedge: string;    // ledg4 exit
}

/**
 * Create all balloon-related objects
 */
export function createBalloonObjects(world: WorldModel, roomIds: BalloonRoomIds): {
  balloonId: string;
  receptacleId: string;
  hook1Id: string;
  hook2Id: string;
  ropeId: string;
} {
  const balloon = createBalloon(world, roomIds);
  const receptacle = createReceptacle(world, balloon.id);
  const clothBag = createClothBag(world, balloon.id);
  const hook1 = createHook(world, 'hook1', balloon.id);
  const hook2 = createHook(world, 'hook2', balloon.id);
  const rope = createBraidedRope(world, balloon.id);

  // Create dead balloon template (will be spawned on crash)
  createDeadBalloon(world);

  return {
    balloonId: balloon.id,
    receptacleId: receptacle.id,
    hook1Id: hook1.id,
    hook2Id: hook2.id,
    ropeId: rope.id,
  };
}

/**
 * Balloon basket - the main vehicle
 */
function createBalloon(world: WorldModel, roomIds: BalloonRoomIds): IFEntity {
  const balloon = world.createEntity('balloon', EntityType.ITEM);

  balloon.add(new IdentityTrait({
    name: 'balloon',
    aliases: ['wicker basket', 'basket', 'hot air balloon', 'balloon basket'],
    description: 'This is a large and extremely heavy wicker basket. An enormous cloth bag is draped over the side and is firmly attached to the basket. A metal receptacle is fastened to the center of the basket. Dangling from the basket is a piece of braided wire.',
    properName: false,
    article: 'a'
  }));

  balloon.add(new ContainerTrait({
    capacity: { maxItems: 10, maxWeight: 100 },
    enterable: true
  }));

  balloon.add(new VehicleTrait({
    vehicleType: 'aircraft',
    transparent: true,
    blocksWalkingMovement: true,
    requiresExitBeforeLeaving: true,
    currentPosition: 'vlbot',
    isOperational: false, // Not operational until something is burning
    notOperationalReason: 'The balloon is not inflated.',
    positionRooms: {
      'vlbot': roomIds.volcanoBottom,
      // Ledge positions map to actual ledge rooms for exit
      'ledg2': roomIds.narrowLedge,  // Narrow Ledge
      'ledg3': roomIds.narrowLedge,  // No dedicated room, use Narrow Ledge
      'ledg4': roomIds.wideLedge,    // Wide Ledge
      // Mid-air positions are virtual - no exit possible
      // vair1, vair2, vair3, vair4 have no room mappings
    }
  }));

  // Store balloon state
  const balloonState: BalloonState = {
    position: 'vlbot',
    tetheredTo: null,
    burningObject: null,
    daemonEnabled: true,
  };
  (balloon as any).balloonState = balloonState;

  world.moveEntity(balloon.id, roomIds.volcanoBottom);
  return balloon;
}

/**
 * Receptacle - brazier for burning objects
 */
function createReceptacle(world: WorldModel, balloonId: string): IFEntity {
  const receptacle = world.createEntity('receptacle', EntityType.ITEM);

  receptacle.add(new IdentityTrait({
    name: 'receptacle',
    aliases: ['brazier', 'burner', 'fire holder'],
    description: 'This is a metal receptacle designed to hold burning objects. It has an opening that can be covered to control the heat.',
    properName: false,
    article: 'a'
  }));

  receptacle.add(new ContainerTrait({
    capacity: { maxItems: 1, maxWeight: 10 },
    enterable: false
  }));

  receptacle.add(new OpenableTrait({
    isOpen: false // Starts closed
  }));

  receptacle.add(new SceneryTrait());

  world.moveEntity(receptacle.id, balloonId);
  return receptacle;
}

/**
 * Cloth bag - visual component of balloon
 */
function createClothBag(world: WorldModel, balloonId: string): IFEntity {
  const clothBag = world.createEntity('cloth bag', EntityType.SCENERY);

  clothBag.add(new IdentityTrait({
    name: 'cloth bag',
    aliases: ['silk bag', 'balloon bag', 'silk balloon', 'bag'],
    description: 'The cloth bag is draped over the basket.', // msg 543
    properName: false,
    article: 'a'
  }));

  clothBag.add(new SceneryTrait());

  // Track inflation state
  (clothBag as any).isInflated = false;

  world.moveEntity(clothBag.id, balloonId);
  return clothBag;
}

/**
 * Hook - for tying the braided rope to dock at ledges
 *
 * FORTRAN has HOOK1 and HOOK2 at different ledge positions.
 * The hooks are on the balloon itself, but only usable at ledge positions.
 */
function createHook(world: WorldModel, hookName: string, balloonId: string): IFEntity {
  const hook = world.createEntity(hookName, EntityType.SCENERY);

  hook.add(new IdentityTrait({
    name: 'hook',
    aliases: ['metal hook', 'balloon hook'],
    description: 'A sturdy metal hook attached to the side of the basket.',
    properName: false,
    article: 'a'
  }));

  hook.add(new SceneryTrait());

  // Track which hook this is
  (hook as any).hookId = hookName;

  world.moveEntity(hook.id, balloonId);
  return hook;
}

/**
 * Braided wire - used to tie balloon to hooks at ledges
 *
 * FORTRAN: BROPE(101) - dangles from balloon basket, used for docking
 * Game text calls it "braided wire" not "rope"
 */
function createBraidedRope(world: WorldModel, balloonId: string): IFEntity {
  const wire = world.createEntity('braided wire', EntityType.SCENERY);

  wire.add(new IdentityTrait({
    name: 'braided wire',
    aliases: ['wire', 'braided rope', 'rope', 'cord', 'line', 'tether'],
    description: 'A piece of braided wire dangles from the basket.',
    properName: false,
    article: 'a'
  }));

  wire.add(new SceneryTrait()); // Part of the balloon, not takeable

  // Track what hook (if any) the wire is tied to
  (wire as any).tiedTo = null;

  world.moveEntity(wire.id, balloonId);
  return wire;
}

/**
 * Dead balloon - created when balloon crashes
 * This replaces the balloon after a crash.
 */
function createDeadBalloon(world: WorldModel): IFEntity {
  const deadBalloon = world.createEntity('dead balloon', EntityType.SCENERY);

  deadBalloon.add(new IdentityTrait({
    name: 'dead balloon',
    aliases: ['crashed balloon', 'destroyed balloon', 'wreckage'],
    description: 'The remains of the balloon lie scattered about. The basket is smashed and the silk is torn beyond repair.',
    properName: false,
    article: 'a'
  }));

  deadBalloon.add(new SceneryTrait());

  // Don't place it anywhere - it will be placed when balloon crashes
  // Store in limbo (null location)
  return deadBalloon;
}

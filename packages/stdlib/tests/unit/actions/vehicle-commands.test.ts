/**
 * The vehicle command sets and boarding (ADR-366 D5b, D5c, D5d, D5i, D7, D7a;
 * Chord 4.0 Phase 11 Slice 4): steering sets and clears a compass vehicle's
 * heading, setting-course sends a flight vehicle, entering boards a vehicle
 * with rooms aboard into its boarding room, exiting refuses off the hatch,
 * and the vehicle command transformer re-aims `go`, `steer` and `exit`
 * aboard. Every assertion reads trait fields, locations or the parsed
 * command the transformer returns.
 */

import { describe, test, expect } from 'vitest';
import {
  AboardTrait,
  Direction,
  DoorTrait,
  EnterableTrait,
  ContainerTrait,
  IdentityTrait,
  OpenableTrait,
  RoomTrait,
  VehicleTrait,
  type IFEntity,
  type IParsedCommand,
  type VehicleMovementConfig,
  WorldModel,
  exitBlockedKey,
  exitHiddenKey,
  exitMessageKey,
} from '@sharpee/world-model';
import { steeringAction } from '../../../src/actions/standard/steering';
import { settingCourseAction } from '../../../src/actions/standard/setting_course';
import { enteringAction } from '../../../src/actions/standard/entering';
import { exitingAction } from '../../../src/actions/standard/exiting';
import { createVehicleCommandTransformer } from '../../../src/actions/standard/vehicle-command-transformer';
import { IFActions } from '../../../src/actions/constants';
import { createCommand, createRealTestContext, executeWithValidation, setupBasicWorld, validateTyped } from '../../test-utils';

interface Harbour {
  world: WorldModel;
  player: IFEntity;
  room: IFEntity;
  reef: IFEntity;
}

function harbour(): Harbour {
  const { world, player, room } = setupBasicWorld();
  const reef = world.createEntity('Reef', 'object');
  reef.add(new RoomTrait());
  reef.add(new IdentityTrait({ name: 'Reef' }));
  room.getTrait(RoomTrait)!.exits = { [Direction.NORTH]: { destination: reef.id } };
  return { world, player, room, reef };
}

function vehicle(world: WorldModel, name: string, trait: VehicleTrait, at: IFEntity, enterable = true): IFEntity {
  const v = world.createEntity(name, 'object');
  v.add(new IdentityTrait({ name }));
  if (enterable) {
    v.add(new ContainerTrait());
    v.add(new EnterableTrait());
  }
  v.add(trait);
  world.moveEntity(v.id, at.id);
  return v;
}

function compassShip(world: WorldModel, at: IFEntity, commands: string[] = ['compass']): IFEntity {
  return vehicle(world, 'Marigold', new VehicleTrait({ movement: { kind: 'compass', drive: 'player', pace: 1 }, commands }), at);
}

function messageIds(events: { data?: any }[]): string[] {
  return events.map((e) => e.data?.messageId).filter((id): id is string => typeof id === 'string');
}

function steer(world: WorldModel, direction?: string) {
  const command = createCommand(IFActions.STEERING, { verb: direction ? 'steer' : 'heave to' });
  if (direction) command.parsed.extras = { direction };
  return executeWithValidation(steeringAction, createRealTestContext(steeringAction, world, command));
}

/** `set course for <destination>` typed, through the real parser and validator (F5); bare, built by hand. */
function setCourse(world: WorldModel, destination?: string) {
  const command = destination === undefined
    ? createCommand(IFActions.SETTING_COURSE, { verb: 'set course for' })
    : validateTyped(settingCourseAction, world, `set course for ${destination}`);
  return executeWithValidation(settingCourseAction, createRealTestContext(settingCourseAction, world, command));
}

describe('steering (ADR-366 D5c, D5i)', () => {
  test('steer <direction> aboard a compass vehicle that lists the set writes the heading and arms the pace', () => {
    const { world, player, room } = harbour();
    const ship = compassShip(world, room);
    world.moveEntity(player.id, ship.id);

    const events = steer(world, Direction.NORTH);

    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'compass', heading: Direction.NORTH, turnsToStep: 1 });
    expect(messageIds(events)).toContain('if.action.steering.steered');
    // The step is the machine's, not the action's: the ship has not moved yet.
    expect(world.getLocation(ship.id)).toBe(room.id);
  });

  test('heave to clears the heading; heave to at rest is refused as not under way', () => {
    const { world, player, room } = harbour();
    const ship = compassShip(world, room);
    world.moveEntity(player.id, ship.id);
    steer(world, Direction.NORTH);

    const hove = steer(world);
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'compass', heading: null, turnsToStep: 0 });
    expect(messageIds(hove)).toContain('if.action.steering.hove_to');

    const again = steer(world);
    expect(messageIds(again)).toContain('if.action.steering.not_under_way');
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'compass', heading: null, turnsToStep: 0 });
  });

  test('on foot, and aboard a vehicle without the compass set, the refusal names the case and nothing moves', () => {
    const { world, player, room } = harbour();
    const ship = compassShip(world, room);
    expect(messageIds(steer(world, Direction.NORTH))).toContain('if.action.steering.not_in_vehicle');
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'compass', heading: null });
    expect(world.getLocation(player.id)).toBe(room.id);

    const tram = vehicle(world, 'tram car', new VehicleTrait({ movement: { kind: 'line', stops: [room.id, 'x'], oneWay: false, drive: 'control', pace: 1 } }), room);
    world.moveEntity(player.id, tram.id);
    expect(messageIds(steer(world, Direction.NORTH))).toContain('if.action.steering.vehicle_no_such_command');
    expect(tram.get(VehicleTrait)!.movement).toMatchObject({ kind: 'line', underWay: false });
  });

  test('a rider in a room aboard a compass vehicle steers it', () => {
    const { world, player, room } = harbour();
    const ship = vehicle(world, 'Marigold', new VehicleTrait({ movement: { kind: 'compass', drive: 'player', pace: 2 }, commands: ['compass'] }), room, false);
    const deck = world.createEntity('Deck', 'object');
    deck.add(new RoomTrait());
    deck.add(new AboardTrait({ vehicleId: ship.id }));
    world.moveEntity(deck.id, ship.id);
    world.moveEntity(player.id, deck.id);

    steer(world, Direction.EAST);
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'compass', heading: Direction.EAST, turnsToStep: 2 });
  });
});

describe('setting course (ADR-366 D5d, D5i)', () => {
  function sparrow(world: WorldModel, at: IFEntity, reef: IFEntity, commands: string[] = ['destinations']): IFEntity {
    const movement: VehicleMovementConfig = { kind: 'flight', drive: 'player', destinations: [at.id, reef.id], pace: 2 };
    const ship = vehicle(world, 'Sparrow', new VehicleTrait({ movement, commands }), at, false);
    const airlock = world.createEntity('Airlock', 'object');
    airlock.add(new RoomTrait());
    airlock.add(new AboardTrait({ vehicleId: ship.id, outside: { [Direction.WEST]: { candidates: [at.id, reef.id] } } }));
    world.moveEntity(airlock.id, ship.id);
    return ship;
  }

  test('set course for a destination, by its name with or without the article, records where the ship is bound', () => {
    const { world, player, room, reef } = harbour();
    const ship = sparrow(world, room, reef);
    world.moveEntity(player.id, world.getContents(ship.id)[0].id);

    const events = setCourse(world, 'the Reef');
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'flight', destination: reef.id, turnsRemaining: 2 });
    expect(messageIds(events)).toContain('if.action.setting_course.course_set');
    // Nothing has moved: the departure is the machine's.
    expect(world.getLocation(ship.id)).toBe(room.id);
  });

  test('a destination room answers to its alias, resolved by the validator, not read by the action (F5)', () => {
    const { world, player, room, reef } = harbour();
    reef.get(IdentityTrait)!.aliases = ['coral shelf'];
    const ship = sparrow(world, room, reef);
    world.moveEntity(player.id, world.getContents(ship.id)[0].id);

    const command = validateTyped(settingCourseAction, world, 'set course for the coral shelf');
    expect(command.topic).toMatchObject({ text: 'the coral shelf', entity: reef.id });
    const events = executeWithValidation(settingCourseAction, createRealTestContext(settingCourseAction, world, command));
    expect(messageIds(events)).toContain('if.action.setting_course.course_set');
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'flight', destination: reef.id, turnsRemaining: 2 });
  });

  test('a room that is not among the destinations does not resolve, even by its exact name', () => {
    const { world, player, room, reef } = harbour();
    const ship = sparrow(world, room, reef);
    const elsewhere = world.createEntity('Lighthouse', 'object');
    elsewhere.add(new RoomTrait());
    elsewhere.add(new IdentityTrait({ name: 'Lighthouse' }));
    world.moveEntity(player.id, world.getContents(ship.id)[0].id);

    expect(validateTyped(settingCourseAction, world, 'set course for Lighthouse').topic!.entity).toBeUndefined();
    expect(messageIds(setCourse(world, 'Lighthouse'))).toContain('if.action.setting_course.not_a_destination');
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'flight', destination: null, turnsRemaining: 0 });
  });

  test('a name that is no destination, the room the ship is at, a missing name, and a ship under way each refuse', () => {
    const { world, player, room, reef } = harbour();
    const ship = sparrow(world, room, reef);
    world.moveEntity(player.id, world.getContents(ship.id)[0].id);

    expect(messageIds(setCourse(world, 'Atlantis'))).toContain('if.action.setting_course.not_a_destination');
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'flight', destination: null, turnsRemaining: 0 });
    expect(messageIds(setCourse(world, room.name))).toContain('if.action.setting_course.already_there');
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'flight', destination: null, turnsRemaining: 0 });
    expect(messageIds(setCourse(world))).toContain('if.action.setting_course.no_destination');
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'flight', destination: null, turnsRemaining: 0 });

    setCourse(world, 'Reef');
    expect(messageIds(setCourse(world, 'Reef'))).toContain('if.action.setting_course.vehicle_under_way');
    // The refusal leaves the voyage as set: still bound for the Reef, the trip untouched.
    expect(ship.get(VehicleTrait)!.movement).toMatchObject({ kind: 'flight', destination: reef.id, turnsRemaining: 2 });
  });

  test('on foot, and aboard a vehicle without the destinations set, the refusal names the case', () => {
    const { world, player, room, reef } = harbour();
    expect(messageIds(setCourse(world, 'Reef'))).toContain('if.action.setting_course.not_in_vehicle');
    const ship = compassShip(world, room);
    world.moveEntity(player.id, ship.id);
    expect(messageIds(setCourse(world, 'Reef'))).toContain('if.action.setting_course.vehicle_no_such_command');
    void reef;
  });
});

describe('boarding and the hatch (ADR-366 D7, D7a)', () => {
  function shipWithRooms(world: WorldModel, at: IFEntity, hatchOpen: boolean | undefined): { ship: IFEntity; airlock: IFEntity; hold: IFEntity; hatch?: IFEntity } {
    const ship = vehicle(world, 'Sparrow', new VehicleTrait({ movement: { kind: 'flight', drive: 'control', destinations: [at.id, 'elsewhere'], pace: 1 } }), at, false);
    const airlock = world.createEntity('Airlock', 'object');
    airlock.add(new RoomTrait());
    airlock.add(new IdentityTrait({ name: 'Airlock', description: 'A closet.' }));
    const hold = world.createEntity('Hold', 'object');
    hold.add(new RoomTrait());
    hold.add(new AboardTrait({ vehicleId: ship.id }));
    let hatch: IFEntity | undefined;
    if (hatchOpen !== undefined) {
      hatch = world.createEntity('hatch', 'object');
      hatch.add(new IdentityTrait({ name: 'hatch' }));
      hatch.add(new DoorTrait({ room1: airlock.id, room2: at.id }));
      hatch.add(new OpenableTrait({ isOpen: hatchOpen }));
      world.moveEntity(hatch.id, airlock.id);
    }
    airlock.add(new AboardTrait({ vehicleId: ship.id, outside: { [Direction.WEST]: { candidates: [at.id], ...(hatch ? { via: hatch.id } : {}) } } }));
    world.moveEntity(airlock.id, ship.id);
    world.moveEntity(hold.id, ship.id);
    ship.get(VehicleTrait)!.boardedThrough = airlock.id;
    return { ship, airlock, hold, hatch };
  }

  function enter(world: WorldModel, target: IFEntity, verb = 'enter') {
    // `board` is typed through the real parser, so the boarding gesture is
    // the one `board the vehicle`'s `means gesture` line hands entering (F5).
    const command = verb === 'board'
      ? validateTyped(enteringAction, world, `board ${target.name}`)
      : createCommand(IFActions.ENTERING, { entity: target, verb });
    return executeWithValidation(enteringAction, createRealTestContext(enteringAction, world, command));
  }

  test('enter or board a vehicle with rooms aboard puts the player in its boarding room and describes it', () => {
    const { world, player, room } = harbour();
    const { ship, airlock } = shipWithRooms(world, room, undefined);

    const events = enter(world, ship, 'board');

    expect(world.getLocation(player.id)).toBe(airlock.id);
    expect(world.getContainingRoom(player.id)?.id).toBe(airlock.id);
    expect(messageIds(events)).toContain('if.action.entering.boarded');
    expect(events.some((e) => e.type === 'if.event.room.description' && (e.data as { roomId?: string }).roomId === airlock.id)).toBe(true);
  });

  test('a closed hatch refuses boarding; an open one admits; aboard already, boarding again refuses', () => {
    const { world, player, room } = harbour();
    const { ship, airlock, hatch, hold } = shipWithRooms(world, room, false);

    expect(messageIds(enter(world, ship))).toContain('if.action.entering.container_closed');
    expect(world.getLocation(player.id)).toBe(room.id);

    hatch!.get(OpenableTrait)!.isOpen = true;
    enter(world, ship);
    expect(world.getLocation(player.id)).toBe(airlock.id);

    // Aboard already, the ship is no longer in reach from the Hold: scope
    // refuses before the boarding branch, and the player stays put.
    world.moveEntity(player.id, hold.id);
    const again = enter(world, ship);
    expect(messageIds(again)).not.toContain('if.action.entering.boarded');
    expect(again.some((e) => (e.data as { blocked?: unknown })?.blocked === true || e.type === 'action.error' || e.type.includes('blocked'))).toBe(true);
    expect(world.getLocation(player.id)).toBe(hold.id);
  });

  test('`board` on a vehicle without rooms aboard refuses as not boardable; `enter` still enters it', () => {
    const { world, player, room } = harbour();
    const bucket = vehicle(world, 'bucket', new VehicleTrait({ movement: { kind: 'none' } }), room);

    expect(messageIds(enter(world, bucket, 'board'))).toContain('if.action.entering.vehicle_not_boardable');
    expect(world.getLocation(player.id)).toBe(room.id);

    enter(world, bucket);
    expect(world.getLocation(player.id)).toBe(bucket.id);
  });

  test('`get on` carries no boarding gesture, so it enters a vehicle `board` refuses', () => {
    const { world, player, room } = harbour();
    const bucket = vehicle(world, 'bucket', new VehicleTrait({ movement: { kind: 'none' } }), room);

    const command = validateTyped(enteringAction, world, 'get on bucket');
    expect(command.parsed.extras?.gesture).toBeUndefined();
    const events = executeWithValidation(enteringAction, createRealTestContext(enteringAction, world, command));
    expect(messageIds(events)).not.toContain('if.action.entering.vehicle_not_boardable');
    expect(world.getLocation(player.id)).toBe(bucket.id);
  });

  test('boarding asks traversal: a `while` hiding the outside way refuses until it holds; a block on the way out keeps no one off (F10)', () => {
    const { world, player, room } = harbour();
    const { ship, airlock } = shipWithRooms(world, room, undefined);
    let hidden = true;
    world.registerEvaluator(exitHiddenKey(airlock.id, Direction.WEST), () => hidden);

    expect(messageIds(enter(world, ship, 'board'))).toContain('if.action.entering.vehicle_not_boardable');
    expect(world.getLocation(player.id)).toBe(room.id);

    // The block is the way out's own line (UPPS: `down is blocked while the
    // courier ship is not at the Loading Dock`); boarding is the way in.
    hidden = false;
    world.registerEvaluator(exitBlockedKey(airlock.id, Direction.WEST), () => true);
    world.registerEvaluator(exitMessageKey(airlock.id, Direction.WEST), () => 'The gangway is raised.');
    enter(world, ship, 'board');
    expect(world.getLocation(player.id)).toBe(airlock.id);
  });

  test('exit in a room aboard with two ways off open refuses as ambiguous and nothing moves (Q2)', () => {
    const { world, player, room } = harbour();
    const { ship, airlock } = shipWithRooms(world, room, undefined);
    airlock.get(AboardTrait)!.computedExits[Direction.EAST] = { candidates: [room.id] };
    world.moveEntity(player.id, airlock.id);
    const transform = createVehicleCommandTransformer();

    const exitCommand = createCommand(IFActions.EXITING, { verb: 'exit' });
    expect(transform(exitCommand.parsed, world).action).toBe(IFActions.EXITING);
    const events = executeWithValidation(exitingAction, createRealTestContext(exitingAction, world, exitCommand));

    expect(messageIds(events)).toContain('if.action.exiting.outside_ambiguous');
    expect(world.getLocation(player.id)).toBe(airlock.id);
    expect(world.getLocation(ship.id)).toBe(room.id);
  });

  test('exit aboard takes the one way traversal grants, and with none granted goes by the first so going refuses it (Q2)', () => {
    const { world, player, room } = harbour();
    const { airlock } = shipWithRooms(world, room, undefined);
    airlock.get(AboardTrait)!.computedExits[Direction.EAST] = { candidates: [room.id] };
    world.moveEntity(player.id, airlock.id);
    const transform = createVehicleCommandTransformer();
    let westHidden = true;
    let eastHidden = false;
    world.registerEvaluator(exitHiddenKey(airlock.id, Direction.WEST), () => westHidden);
    world.registerEvaluator(exitHiddenKey(airlock.id, Direction.EAST), () => eastHidden);

    const out = transform(createCommand(IFActions.EXITING, { verb: 'exit' }).parsed, world);
    expect(out.action).toBe(IFActions.GOING);
    expect(out.extras).toEqual({ direction: Direction.EAST });

    eastHidden = true;
    const none = transform(createCommand(IFActions.EXITING, { verb: 'exit' }).parsed, world);
    expect(none.action).toBe(IFActions.GOING);
    expect(none.extras).toEqual({ direction: Direction.WEST });
    westHidden = false;
    expect(transform(createCommand(IFActions.EXITING, { verb: 'exit' }).parsed, world).extras).toEqual({ direction: Direction.WEST });
  });

  test('exit in a room aboard with no outside exit refuses as not at the hatch', () => {
    const { world, player, room } = harbour();
    const { hold } = shipWithRooms(world, room, undefined);
    world.moveEntity(player.id, hold.id);

    const command = createCommand(IFActions.EXITING, { verb: 'exit' });
    const events = executeWithValidation(exitingAction, createRealTestContext(exitingAction, world, command));

    expect(messageIds(events)).toContain('if.action.exiting.vehicle_not_at_hatch');
    expect(world.getLocation(player.id)).toBe(hold.id);
  });
});

describe('the vehicle command transformer (ADR-366 D5b, D5c, D7)', () => {
  const transform = createVehicleCommandTransformer();

  function parsed(action: string, extras?: Record<string, unknown>, noun?: string): IParsedCommand {
    return {
      rawInput: action,
      tokens: [],
      structure: {
        verb: { tokens: [0], text: action.split('.').pop()!, head: action.split('.').pop()! },
        ...(noun ? { directObject: { tokens: [1], text: noun, head: noun, modifiers: [], articles: [], determiners: [], candidates: [noun] } } : {}),
      },
      pattern: 'TEST',
      confidence: 1,
      action,
      ...(extras ? { extras } : {}),
    } as IParsedCommand;
  }

  test('go <direction> aboard a compass vehicle with the set becomes steering, and keeps the direction', () => {
    const { world, player, room } = harbour();
    const ship = compassShip(world, room);
    world.moveEntity(player.id, ship.id);
    const out = transform(parsed(IFActions.GOING, { direction: Direction.NORTH }), world);
    expect(out.action).toBe(IFActions.STEERING);
    expect(out.extras).toEqual({ direction: Direction.NORTH });
  });

  test('steer <direction> aboard a streets vehicle becomes going', () => {
    const { world, player, room } = harbour();
    const car = vehicle(world, 'car', new VehicleTrait({ movement: { kind: 'streets' }, commands: ['compass'] }), room);
    world.moveEntity(player.id, car.id);
    const out = transform(parsed(IFActions.STEERING, { direction: Direction.NORTH }), world);
    expect(out.action).toBe(IFActions.GOING);
    expect(out.extras).toEqual({ direction: Direction.NORTH });
  });

  test('go aboard a compass vehicle that does not list the set, a line vehicle, or on foot is left to going', () => {
    const { world, player, room } = harbour();
    expect(transform(parsed(IFActions.GOING, { direction: Direction.NORTH }), world).action).toBe(IFActions.GOING);
    const ship = compassShip(world, room, []);
    world.moveEntity(player.id, ship.id);
    expect(transform(parsed(IFActions.GOING, { direction: Direction.NORTH }), world).action).toBe(IFActions.GOING);
    const tram = vehicle(world, 'tram car', new VehicleTrait({ movement: { kind: 'line', stops: [room.id, 'x'], oneWay: false, drive: 'control', pace: 1 } }), room);
    world.moveEntity(player.id, tram.id);
    expect(transform(parsed(IFActions.GOING, { direction: Direction.NORTH }), world).action).toBe(IFActions.GOING);
  });

  test('exit in a boarding room with a `to outside` exit becomes going that way, with the noun dropped; elsewhere aboard it stays exiting', () => {
    const { world, player, room } = harbour();
    const ship = vehicle(world, 'Sparrow', new VehicleTrait({ movement: { kind: 'flight', drive: 'control', destinations: [room.id, 'x'], pace: 1 } }), room, false);
    const airlock = world.createEntity('Airlock', 'object');
    airlock.add(new RoomTrait());
    airlock.add(new AboardTrait({ vehicleId: ship.id, outside: { [Direction.WEST]: { candidates: [room.id] } } }));
    const hold = world.createEntity('Hold', 'object');
    hold.add(new RoomTrait());
    hold.add(new AboardTrait({ vehicleId: ship.id }));
    world.moveEntity(airlock.id, ship.id);
    world.moveEntity(hold.id, ship.id);

    world.moveEntity(player.id, airlock.id);
    const out = transform(parsed(IFActions.EXITING, undefined, 'Sparrow'), world);
    expect(out.action).toBe(IFActions.GOING);
    expect(out.extras).toEqual({ direction: Direction.WEST });
    expect(out.structure.directObject).toBeUndefined();

    world.moveEntity(player.id, hold.id);
    expect(transform(parsed(IFActions.EXITING), world).action).toBe(IFActions.EXITING);
    world.moveEntity(player.id, room.id);
    expect(transform(parsed(IFActions.EXITING), world).action).toBe(IFActions.EXITING);
  });
});

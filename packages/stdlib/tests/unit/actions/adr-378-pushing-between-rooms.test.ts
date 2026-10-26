/**
 * adr-378-pushing-between-rooms.test.ts — pushing a thing through an exit
 * (ADR-378 D6, D7; AC-4) and going by a way the home answers (D0, D1a, D3).
 *
 * Every case drives the action through the phase runner on a real
 * WorldModel and asserts on locations — where the cart and the actor are
 * afterwards — never on the events alone. The refusals a push inherits
 * from going arrive in going's words (D7): the pushed event's messageId is
 * `if.action.going.<line>`.
 */

import { describe, test, expect } from 'vitest';
import {
  TraitType,
  Direction,
  RoomTrait,
  DoorTrait,
  PushableTrait,
  VehicleTrait,
  WorldModel,
  IFEntity,
  exitHiddenKey,
  type Admittance,
} from '@sharpee/world-model';
import { pushingAction } from '../../../src/actions/standard/pushing';
import { goingAction } from '../../../src/actions/standard/going';
import { IFActions } from '../../../src/actions/constants';
import {
  setupBasicWorld,
  createRealTestContext,
  createCommand,
  executeWithValidation,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

interface Fixture {
  world: WorldModel;
  player: IFEntity;
  room: IFEntity;
  dock: IFEntity;
  cart: IFEntity;
}

/** An `admits` list as Chord writes it (`pushing` admits every pushable) as the admittance the loader lowers it to. */
function admittance(words: string[]): Admittance {
  return { vehicles: words.filter((w) => w !== 'pushing'), pushed: words.includes('pushing') ? 'any' : [] };
}

/** room --north--> dock, a pushable cart in room; the dock admits nothing unless told. */
function setup(options: { admits?: string[]; exitAdmits?: string[]; closedDoor?: boolean; oneWay?: boolean } = {}): Fixture {
  const { world, player, room } = setupBasicWorld();
  const dock = world.createEntity('Loading Dock', 'room');
  dock.add(new RoomTrait({ admits: options.admits ? admittance(options.admits) : undefined }));
  let door: IFEntity | undefined;
  if (options.closedDoor) {
    door = world.createEntity('dock door', 'door');
    door.add(new DoorTrait({ room1: room.id, room2: dock.id }));
    door.add({ type: TraitType.OPENABLE, isOpen: false } as any);
  }
  world.connectRooms(room.id, dock.id, Direction.NORTH, door?.id, { oneWay: options.oneWay });
  if (options.exitAdmits) room.getTrait(RoomTrait)!.exits[Direction.NORTH]!.admits = admittance(options.exitAdmits);
  const cart = world.createEntity('mail cart', 'object');
  cart.add(new PushableTrait());
  world.moveEntity(cart.id, room.id);
  return { world, player, room, dock, cart };
}

function push(world: WorldModel, cart: IFEntity, direction?: string) {
  const command = createCommand(IFActions.PUSHING, { entity: cart });
  if (direction) command.parsed.extras = { direction };
  const context = createRealTestContext(pushingAction, world, command);
  return executeWithValidation(pushingAction, context);
}

const messageIds = (events: { data?: any }[]) => events.map((e) => e.data?.messageId).filter(Boolean) as string[];

describe('push <thing> <direction> (ADR-378 D6, D7)', () => {
  test('with an east exit only, refuses in going\'s words and nothing moves', () => {
    const { world, player, room, cart } = setup();
    delete room.getTrait(RoomTrait)!.exits[Direction.NORTH];
    const east = world.createEntity('Yard', 'room');
    east.add(new RoomTrait());
    world.connectRooms(room.id, east.id, Direction.EAST);

    const events = push(world, cart, Direction.NORTH);

    expect(messageIds(events)).toContain('if.action.going.no_exit_that_way');
    expect(world.getLocation(cart.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(room.id);
  });

  test('on a way that does not admit pushing, refuses cannot_push_that_way and nothing moves', () => {
    const { world, player, room, cart } = setup();

    const events = push(world, cart, Direction.NORTH);

    expect(messageIds(events)).toContain('if.action.pushing.cannot_push_that_way');
    expect(world.getLocation(cart.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(room.id);
  });

  test('on a way the room admits, the cart and the actor are both in the destination afterwards', () => {
    const { world, player, room, dock, cart } = setup({ admits: ['pushing'] });
    expect(world.getLocation(cart.id)).toBe(room.id);

    const events = push(world, cart, Direction.NORTH);

    expect(world.getLocation(cart.id)).toBe(dock.id);
    expect(world.getLocation(player.id)).toBe(dock.id);
    const pushed = events.find((e) => e.type === 'if.event.pushed')!;
    expect(pushed.data).toMatchObject({
      messageId: 'if.action.pushing.pushed_direction',
      params: { direction: Direction.NORTH },
      moved: true,
      destinationId: dock.id,
    });
    // Going's arrival narration follows, with the cart already there.
    const pushedIndex = events.indexOf(pushed);
    const description = events.findIndex((e) => e.type === 'if.event.room.description');
    expect(description).toBeGreaterThan(pushedIndex);
    expect(events.find((e) => e.type === 'if.event.list.contents')!.data).toMatchObject({ itemIds: [cart.id] });
  });

  test('the exit line\'s own admits wins over the room\'s', () => {
    const { world, dock, cart } = setup({ admits: [], exitAdmits: ['pushing'] });
    push(world, cart, Direction.NORTH);
    expect(world.getLocation(cart.id)).toBe(dock.id);
  });

  test('through a closed door, refuses door_closed in going\'s words and nothing moves', () => {
    const { world, player, room, cart } = setup({ admits: ['pushing'], closedDoor: true });

    const events = push(world, cart, Direction.NORTH);

    expect(messageIds(events)).toContain('if.action.going.door_closed');
    expect(world.getLocation(cart.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(room.id);
  });

  test('a switchable pushable pushed with a direction it cannot take refuses and is not toggled', () => {
    const { world, room, cart } = setup();
    cart.add({ type: TraitType.SWITCHABLE, isOn: false } as any);

    const events = push(world, cart, Direction.NORTH);

    expect(messageIds(events)).toContain('if.action.pushing.cannot_push_that_way');
    expect((cart.get(TraitType.SWITCHABLE) as { isOn: boolean }).isOn).toBe(false);
    expect(world.getLocation(cart.id)).toBe(room.id);
  });

  test('aboard a line vehicle, refuses vehicle_ride in going\'s words', () => {
    const { world, player, room, cart } = setup({ admits: ['pushing'] });
    const tram = world.createEntity('tram', 'object');
    tram.add(new VehicleTrait({ movement: { kind: 'line', stops: ['a', 'b'], oneWay: false, drive: 'control' } }));
    tram.add({ type: TraitType.CONTAINER, enterable: true } as any);
    world.moveEntity(tram.id, room.id);
    world.moveEntity(player.id, tram.id);

    const events = push(world, cart, Direction.NORTH);

    expect(messageIds(events).some((id) => id.endsWith('vehicle_ride'))).toBe(true);
    expect(world.getLocation(cart.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(tram.id);
  });

  test('a carried thing pushed with a direction refuses carrying_it', () => {
    const { world, player, cart } = setup({ admits: ['pushing'] });
    world.moveEntity(cart.id, player.id);

    const events = push(world, cart, Direction.NORTH);

    expect(messageIds(events)).toContain('if.action.pushing.carrying_it');
    expect(world.getLocation(cart.id)).toBe(player.id);
  });

  test('going\'s hooks fire for the push under both ids (ADR-228 D6): the destination\'s entering_room sees it, a going veto on the source stops it', () => {
    const { world, player, room, dock, cart } = setup({ admits: ['pushing'] });
    const fired: string[] = [];
    dock.add({ type: TEST_MARKER_TRAIT } as any);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.ENTERING_ROOM, {
      postExecute() { fired.push('entering_room.postExecute'); },
    });
    push(world, cart, Direction.NORTH);
    expect(fired).toEqual(['entering_room.postExecute']);
    expect(world.getLocation(cart.id)).toBe(dock.id);

    // And a going-id veto on the source room refuses the push with its own line.
    const second = setup({ admits: ['pushing'] });
    second.room.add({ type: TEST_MARKER_TRAIT } as any);
    second.world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.GOING, {
      preValidate() { return { valid: false, error: 'test.floor_too_rough' }; },
    });
    const events = push(second.world, second.cart, Direction.NORTH);
    expect(messageIds(events)).toContain('test.floor_too_rough');
    expect(second.world.getLocation(second.cart.id)).toBe(second.room.id);
    expect(second.world.getLocation(second.player.id)).toBe(second.room.id);
    expect(world.getLocation(player.id)).toBe(dock.id);
    expect(room.id).not.toBe(dock.id);
  });
});

describe('push <thing> with no direction is the press (ADR-378 D6)', () => {
  test('a switchable thing is toggled and says so', () => {
    const { world, cart } = setup();
    cart.add({ type: TraitType.SWITCHABLE, isOn: false } as any);
    const events = push(world, cart);
    expect((cart.get(TraitType.SWITCHABLE) as { isOn: boolean }).isOn).toBe(true);
    expect(messageIds(events)).toContain('if.action.pushing.switch_toggled');
  });

  test('anything else takes the push with the stock line and stays where it is', () => {
    const { world, room, cart } = setup();
    const events = push(world, cart);
    expect(messageIds(events)).toContain('if.action.pushing.button_pushed');
    expect(world.getLocation(cart.id)).toBe(room.id);
  });
});

describe('going by a way the home answers (ADR-378 D0, D1a, D3)', () => {
  function go(world: WorldModel, direction: string) {
    const command = createCommand(IFActions.GOING);
    command.parsed.extras = { direction };
    return executeWithValidation(goingAction, createRealTestContext(goingAction, world, command));
  }

  test('a passage key through an open door moves the actor; closed, it refuses door_closed', () => {
    const { world, player, room } = setupBasicWorld();
    const loft = world.createEntity('Loft', 'room');
    loft.add(new RoomTrait());
    const hatch = world.createEntity('hatch', 'door');
    hatch.add(new DoorTrait({ room1: room.id, room2: loft.id }));
    hatch.add({ type: TraitType.OPENABLE, isOpen: false } as any);
    world.connectRooms(room.id, loft.id, 'passage:climb-the-rope', hatch.id, { oneWay: true });

    expect(messageIds(go(world, 'passage:climb-the-rope'))).toContain('if.action.going.door_closed');
    expect(world.getLocation(player.id)).toBe(room.id);

    (hatch.get(TraitType.OPENABLE) as { isOpen: boolean }).isOpen = true;
    go(world, 'passage:climb-the-rope');
    expect(world.getLocation(player.id)).toBe(loft.id);
  });

  test('a hidden exit refuses no_exit_that_way while its condition is false, and works once it holds', () => {
    const { world, player, room, dock } = setup();
    const yard = world.createEntity('Yard', 'room');
    yard.add(new RoomTrait());
    world.connectRooms(room.id, yard.id, Direction.EAST);
    let hidden = true;
    world.registerEvaluator(exitHiddenKey(room.id, Direction.NORTH), () => hidden);

    expect(messageIds(go(world, Direction.NORTH))).toContain('if.action.going.no_exit_that_way');
    expect(world.getLocation(player.id)).toBe(room.id);

    hidden = false;
    go(world, Direction.NORTH);
    expect(world.getLocation(player.id)).toBe(dock.id);
  });

  test('a room whose only exit is hidden reports no_exits', () => {
    const { world, room } = setup();
    world.registerEvaluator(exitHiddenKey(room.id, Direction.NORTH), () => true);
    expect(messageIds(go(world, Direction.NORTH))).toContain('if.action.going.no_exits');
  });

  test('a hidden exit beats a blocked one: existence is read first', () => {
    const { world, player, room } = setup();
    room.getTrait(RoomTrait)!.blockedExits = { [Direction.NORTH]: 'The way is barred.' } as any;
    expect(messageIds(go(world, Direction.NORTH))).toContain('if.action.going.movement_blocked');
    world.registerEvaluator(exitHiddenKey(room.id, Direction.NORTH), () => true);
    expect(messageIds(go(world, Direction.NORTH))).toContain('if.action.going.no_exits');
    expect(world.getLocation(player.id)).toBe(room.id);
  });
});

describe('the push follows wherever going took the actor (ADR-378 D6; mutation gaps closed)', () => {
  test('aboard a steered vehicle the cart arrives beside the vehicle, and the actor stays inside it', () => {
    const { world, player, room, dock, cart } = setup();
    const car = world.createEntity('car', 'object');
    car.add(new VehicleTrait({ movement: { kind: 'streets' } }));
    car.add({ type: TraitType.CONTAINER, enterable: true } as any);
    world.moveEntity(car.id, room.id);
    world.moveEntity(player.id, car.id);
    dock.getTrait(RoomTrait)!.admits = admittance([car.id, 'pushing']);

    push(world, cart, Direction.NORTH);

    expect(world.getLocation(car.id)).toBe(dock.id);
    expect(world.getLocation(player.id)).toBe(car.id);
    expect(world.getLocation(cart.id)).toBe(dock.id);
  });

  test('aboard a steered vehicle the way must admit both: the car without the cart, or the cart without the car, refuses and nothing moves', () => {
    const { world, player, room, dock, cart } = setup();
    const car = world.createEntity('car', 'object');
    car.add(new VehicleTrait({ movement: { kind: 'streets' } }));
    car.add({ type: TraitType.CONTAINER, enterable: true } as any);
    world.moveEntity(car.id, room.id);
    world.moveEntity(player.id, car.id);

    dock.getTrait(RoomTrait)!.admits = admittance([car.id]);
    expect(messageIds(push(world, cart, Direction.NORTH))).toContain('if.action.pushing.cannot_push_that_way');
    expect(world.getLocation(car.id)).toBe(room.id);
    expect(world.getLocation(cart.id)).toBe(room.id);

    dock.getTrait(RoomTrait)!.admits = admittance(['pushing']);
    expect(messageIds(push(world, cart, Direction.NORTH))).toContain('if.action.going.vehicle_cannot_go');
    expect(world.getLocation(car.id)).toBe(room.id);
    expect(world.getLocation(cart.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(car.id);
  });

  test('a computed way whose resolution comes back blocked leaves the cart and the actor in place', () => {
    const { world, player, room, dock, cart } = setup({ admits: ['pushing'] });
    const CARRIER = 'test.trait.carrier';
    room.add({ type: CARRIER, computedExitsAll: { candidates: [dock.id] } } as any);
    world.registerExitResolver(CARRIER, () => ({ kind: 'blocked', messageId: 'test.exit_blocked' }));

    const events = push(world, cart, Direction.NORTH);

    expect(world.getLocation(cart.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(room.id);
    expect(messageIds(events)).toContain('test.exit_blocked');
    expect(events.find((e) => e.type === 'if.event.pushed')).toBeUndefined();
  });
});

describe("the thing's own way (ADR-378 D6b)", () => {
  test('a cart named in the exit\'s admitted pushed things is pushed through; another pushable on the same way is refused', () => {
    const { world, player, room, dock, cart } = setup();
    const crate = world.createEntity('crate', 'object');
    crate.add(new PushableTrait());
    world.moveEntity(crate.id, room.id);
    room.getTrait(RoomTrait)!.exits[Direction.NORTH]!.admits = { pushed: [cart.id] };

    const refused = push(world, crate, Direction.NORTH);
    expect(messageIds(refused)).toContain('if.action.pushing.cannot_push_that_way');
    expect(world.getLocation(crate.id)).toBe(room.id);

    push(world, cart, Direction.NORTH);
    expect(world.getLocation(cart.id)).toBe(dock.id);
    expect(world.getLocation(player.id)).toBe(dock.id);
  });
});

describe('a push through a computed way (F1)', () => {
  /** The north way from room is computed: the dock or the yard, the resolver drawing `to`. */
  function computedNorth(to: 'dock' | 'yard', options: { dockPushing: boolean; yardPushing: boolean }) {
    const fixture = setup({ admits: options.dockPushing ? ['pushing'] : [] });
    const { world, room, dock } = fixture;
    const yard = world.createEntity('Yard', 'room');
    yard.add(new RoomTrait({ admits: options.yardPushing ? admittance(['pushing']) : undefined }));
    room.add({ type: 'test.trait.turntable', computedExits: { [Direction.NORTH]: { candidates: [dock.id, yard.id] } } } as never);
    let draws = 0;
    world.registerExitResolver('test.trait.turntable', () => {
      draws += 1;
      return { kind: 'exit', destination: to === 'dock' ? dock.id : yard.id };
    });
    return { ...fixture, yard, draws: () => draws };
  }

  test('a drawn room that admits pushing takes the cart and the actor', () => {
    const { world, player, yard, cart, draws } = computedNorth('yard', { dockPushing: false, yardPushing: true });

    push(world, cart, Direction.NORTH);

    expect(world.getLocation(cart.id)).toBe(yard.id);
    expect(world.getLocation(player.id)).toBe(yard.id);
    expect(draws()).toBe(1);
  });

  test('a drawn room that does not admit pushing refuses cannot_push_that_way, and neither moves', () => {
    const { world, player, room, cart, draws } = computedNorth('dock', { dockPushing: false, yardPushing: true });

    const events = push(world, cart, Direction.NORTH);

    expect(messageIds(events)).toContain('if.action.pushing.cannot_push_that_way');
    expect(world.getLocation(cart.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(room.id);
    expect(draws()).toBe(1);
  });

  test('no candidate admits pushing: refused before the draw, and neither moves', () => {
    const { world, player, room, cart, draws } = computedNorth('yard', { dockPushing: false, yardPushing: false });

    const events = push(world, cart, Direction.NORTH);

    expect(messageIds(events)).toContain('if.action.pushing.cannot_push_that_way');
    expect(world.getLocation(cart.id)).toBe(room.id);
    expect(world.getLocation(player.id)).toBe(room.id);
    expect(draws()).toBe(0);
  });
});

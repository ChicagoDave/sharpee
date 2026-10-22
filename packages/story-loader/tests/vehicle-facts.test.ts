/**
 * vehicle-facts.test.ts — the vehicle machine's facts reach the story
 * (alignment fixes Phase 4: Q6 A, D11 a, Q5 C), through the REAL engine.
 *
 * A passenger carried into a room by a vehicle with no rooms aboard
 * arrives: the room's `after the player entering` clause and a `when the
 * player moves` clause each fire once, and the passenger is still in the
 * vehicle. A floating thing's drift and its wash-up each fire `when <thing>
 * moves` once. A watcher in a dark room reads nothing of a vehicle
 * arriving, and the arrival is still a recorded fact. Every assertion
 * reads the world, the turn's events, or the turn's rendered text.
 */
import { describe, expect, it } from 'vitest';
import { FloatingTrait, startVehicle, VehicleTrait, type IFEntity, type VehicleOpenModel } from '@sharpee/world-model';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const FUNICULAR = (upper: string) => `story
  title: The Funicular
  authors:
    T
  id: the-funicular
  story-version: 0.0.1

create the Lower Station
  a room

  The lower station.

create the Upper Station
${upper}

  The upper station.

  after the player entering
    phrase upper-reached
  end after

create the funicular
  a vehicle
  in the Lower Station
  movement: line
  carries: in
  drive: control
  stops: the Lower Station, the Upper Station
  direction: one-way
  pace: 1 turn

  A funicular car.

create the switch
  a thing, pushable
  in the funicular

  A switch.

  on the player pushing
    start the funicular
  end on

create the ticket
  a thing
  in the Lower Station

  A ticket.

  when the player moves
    phrase player-moved
  end when

create Alex
  a person
  playable
  starts in the Lower Station

  You.

before the game starts
  change the player to Alex
end before

define phrase upper-reached
  The upper station opens around you.
end phrase

define phrase player-moved
  You have moved.
end phrase
`;

const POOL = `story
  title: The Pool
  authors:
    T
  id: the-pool
  story-version: 0.0.1
  use expanses

create the Pool
  an expanse
  size: 5 by 5
  drift: 1 unit every 1 turn

  A pool.

  landmarks
    the Shore: 0, 0
  end landmarks

create the Shore
  a room
  seen from afar: a shore

  The shore.

create the bottle
  a thing, floats
  in the Pool at 2, 2

  A bottle.

create the gull
  a thing
  in the Shore

  A gull.

  when the bottle moves
    phrase bottle-moved
  end when

create Alex
  a person
  playable
  starts in the Shore

  You.

before the game starts
  change the player to Alex
end before

define phrase bottle-moved
  The gull watches the bottle.
end phrase
`;

const RAFT_POOL = `story
  title: The Raft
  authors:
    T
  id: the-raft
  story-version: 0.0.1
  use expanses

create the Pool
  an expanse
  size: 5 by 5

  A pool.

  landmarks
    the Shore: 0, 0
  end landmarks

create the Shore
  a room
  seen from afar: a shore

  The shore.

create the raft
  a vehicle
  in the Pool at 2, 3
  movement: open
  carries: in
  drive: control
  pace: 1 turn
  stride: 1 unit
  sight: 3
  seen from afar: a raft

  A raft.

create Alex
  a person
  playable
  starts in the Shore

  You.

before the game starts
  change the player to Alex
end before
`;

function named(b: BootedTurns, name: string): IFEntity {
  const found = b.world.getAllEntities().find((e) => e.name === name);
  expect(found, name).toBeDefined();
  return found!;
}

function count(text: string, line: string): number {
  return text.split(line).length - 1;
}

describe('a passenger carried into a room arrives (Q6 A)', () => {
  it('the room\'s `after the player entering` and `when the player moves` fire once, and the player is still aboard', async () => {
    const b = await bootTurns(FUNICULAR('  a room'));
    await b.turn('enter funicular');
    const { events, text } = await b.turnText('push switch');

    const funicular = named(b, 'funicular');
    expect(b.world.getLocation(funicular.id)).toBe(named(b, 'Upper Station').id);
    expect(b.world.getLocation(b.player.id)).toBe(funicular.id);
    expect(count(text, 'The upper station opens around you.')).toBe(1);
    expect(count(text, 'You have moved.')).toBe(1);
    const arrival = events.find((e) => e.type === 'if.event.actor_moved' && (e.data as { vehicleId?: string }).vehicleId === funicular.id)!;
    expect(arrival.data).toMatchObject({ actorId: b.player.id, fromRoom: named(b, 'Lower Station').id, toRoom: named(b, 'Upper Station').id });
    expect(text).toContain('The funicular arrives at the Upper Station.');
  });

  it('a player who stays behind does not arrive: neither clause fires', async () => {
    const b = await bootTurns(FUNICULAR('  a room'));
    startVehicle(b.world, named(b, 'funicular'));
    const { text } = await b.turnText('wait');

    expect(b.world.getLocation(named(b, 'funicular').id)).toBe(named(b, 'Upper Station').id);
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Lower Station').id);
    expect(text).not.toContain('The upper station opens around you.');
    expect(text).not.toContain('You have moved.');
  });
});

describe('a watcher in the dark (Q5 C)', () => {
  it('reads nothing of a vehicle arriving in a dark room; the arrival is still recorded there', async () => {
    const b = await bootTurns(FUNICULAR('  a room, dark'));
    b.world.moveEntity(b.player.id, named(b, 'Upper Station').id);
    startVehicle(b.world, named(b, 'funicular'));
    const { events, text } = await b.turnText('wait');

    expect(b.world.getLocation(named(b, 'funicular').id)).toBe(named(b, 'Upper Station').id);
    expect(text).not.toContain('arrives');
    const blocked = events.find((e) => e.type === 'if.event.perception.blocked' && (e.data as { originalType?: string }).originalType === 'if.event.vehicle_arrived');
    expect(blocked).toMatchObject({ presence: 'present', entities: { location: named(b, 'Upper Station').id } });
  });
});

describe('drift is a move (D11 a)', () => {
  it('each drift step fires `when the bottle moves` once and records where the bottle went', async () => {
    const b = await bootTurns(POOL);
    const bottle = named(b, 'bottle');
    const { events, text } = await b.turnText('wait');

    const drifted = events.find((e) => e.type === 'if.event.drifted')!;
    const cell = bottle.get(FloatingTrait)!.position!;
    expect(Math.max(Math.abs(cell.x - 2), Math.abs(cell.y - 2))).toBe(1);
    expect(drifted.data).toMatchObject({ actorId: bottle.id, expanseId: named(b, 'Pool').id, cell });
    expect(count(text, 'The gull watches the bottle.')).toBe(1);
  });

  it('a wash-up fires `when the bottle moves` once, and the bottle is in the landmark\'s room', async () => {
    const b = await bootTurns(POOL);
    const bottle = named(b, 'bottle');
    bottle.get(FloatingTrait)!.position = { x: 1, y: 1 };
    // Every drift out of (1, 1) that does not wash up still drifts; walk until the shore takes it.
    let washed: { events: unknown[]; text: string } | undefined;
    for (let i = 0; i < 40 && !washed; i++) {
      const turn = await b.turnText('wait');
      if (turn.events.some((e) => e.type === 'if.event.washed_up')) washed = turn;
    }

    expect(washed, 'the bottle washed up within 40 turns at the seed').toBeDefined();
    expect(b.world.getLocation(bottle.id)).toBe(named(b, 'Shore').id);
    expect(count(washed!.text, 'The gull watches the bottle.')).toBe(1);
  });
});

describe('an edge is a rider\'s experience (Q5 C)', () => {
  it('a raft nobody rides reaching the edge is recorded where it stopped, with no line, and the player ashore is absent from it', async () => {
    const b = await bootTurns(RAFT_POOL);
    const raft = named(b, 'raft');
    startVehicle(b.world, raft, 'NORTH');
    let edge;
    for (let i = 0; i < 3 && !edge; i++) {
      edge = (await b.turnText('wait')).events.find((e) => e.type === 'if.event.expanse_edge_reached');
    }

    expect(edge).toMatchObject({ presence: 'absent', entities: { location: named(b, 'Pool').id }, data: { side: 'NORTH', aboard: false } });
    expect(edge!.data).not.toHaveProperty('messageId');
    expect((raft.get(VehicleTrait)!.model as VehicleOpenModel)).toMatchObject({ atEdge: 'NORTH', position: { x: 2, y: 4 } });
  });
});

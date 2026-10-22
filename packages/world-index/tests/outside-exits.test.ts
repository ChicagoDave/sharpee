/**
 * outside-exits.test.ts — the mirror wires a room aboard a vehicle to the
 * rooms outside it, as the loader does (ADR-321 D3: one pinned test per rule).
 *
 * A `west to outside` exit names no room: the loader resolves it on each use
 * to the room the vehicle is in, one of the vehicle's candidate rooms. The
 * mirror reads the same rule (`vehicleCandidateRoomIds`), so the World tab's
 * map and reach connect the Airlock to each room the Sparrow can be in, the
 * edge carries no bearing and no mirrored return, and the exit is never
 * reported broken.
 */
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { outsideRoomsOf, undirectedExits, wiredEdges } from '../src/loader-semantics.js';
import { layoutMap } from '../src/map.js';
import { deriveReach } from '../src/reach.js';
import { roomsOf } from '../src/story.js';

const SOURCE = `story
  title: Conveyances
  authors:
    T
  id: conveyances
  story-version: 0.0.1

create the Well Bottom
  a room
  up to the Top of the Well

  The bottom of the well.

create the Top of the Well
  a room

  The top of the well.

create the Sparrow
  a vehicle
  in the Well Bottom
  movement: flight
  drive: control
  destinations: the Well Bottom, the Top of the Well
  pace: 5 turns
  aboard: the Airlock, the Hold
  boarded through: the Airlock

  A courier.

create the Airlock
  a room
  east to the Hold
  west to outside

  A closet.

create the Hold
  a room

  A hold.

create Alex
  a person
  playable
  starts in the Airlock

  You.

before the game starts
  change the player to Alex
end before
`;

function irOf(source: string): StoryIR {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error' && d.code !== 'analysis.missing-ifid');
  if (errors.length > 0) throw new Error(errors.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return result.ir;
}

describe('a `to outside` exit in the mirror (ADR-366 D7)', () => {
  const ir = irOf(SOURCE);
  const rooms = roomsOf(ir);
  const known = new Set(rooms.map((room) => room.id));

  it('leads to every room the vehicle can be in', () => {
    expect(outsideRoomsOf(ir.entities, 'airlock')).toEqual(['well-bottom', 'top-of-the-well']);
    expect(outsideRoomsOf(ir.entities, 'well-bottom')).toEqual([]);
  });

  it('is a wired edge to each, with no bearing and no mirrored return', () => {
    const edges = wiredEdges(rooms, (id) => known.has(id), ir.entities);
    const outside = edges.filter((edge) => edge.outside === true);
    expect(outside).toEqual([
      { from: 'airlock', to: 'well-bottom', direction: 'west', via: null, authored: true, outside: true },
      { from: 'airlock', to: 'top-of-the-well', direction: 'west', via: null, authored: true, outside: true },
    ]);
    expect(edges.filter((edge) => edge.to === 'airlock' && edge.direction === 'east')).toEqual([]);
  });

  it('connects the Airlock to the rooms outside in the adjacency', () => {
    const adjacency = undirectedExits(rooms, (id) => known.has(id), ir.entities);
    expect([...(adjacency.get('airlock') ?? [])].sort()).toEqual(['hold', 'top-of-the-well', 'well-bottom']);
    expect(adjacency.get('well-bottom')?.has('airlock')).toBe(true);
  });

  it('is never a broken exit, and reach walks out of the Airlock', () => {
    const reach = deriveReach(ir);
    expect(reach.brokenExits).toEqual([]);
    expect(reach.rooms.reachable).toEqual(expect.arrayContaining(['airlock', 'well-bottom', 'top-of-the-well']));
    expect(reach.rooms.unreached).toEqual([]);
  });

  it('draws a connection on the map for each room outside', () => {
    const map = layoutMap(ir);
    const pairs = map.connections.map((connection) => connection.rooms.join('|'));
    expect(pairs).toEqual(expect.arrayContaining(['airlock|well-bottom', 'airlock|top-of-the-well']));
  });
});

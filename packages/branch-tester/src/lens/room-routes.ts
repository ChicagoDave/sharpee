/**
 * room-routes.ts — the shortest route from a story's opening to each of its
 * rooms, over the exits open at the start (ADR-408 D3, Amendment 1).
 *
 * Purpose: a lens asks its question in every room a player can walk to, and
 * reaching a room needs a route, not a search of world states (ADR-294 D23
 * retired that search; ADR-408 Amendment 1 measured it again). The exits are
 * the loader's own (`wiredEdges`, inferred reverses included). The ones shut
 * at the start come from world-index's `deriveReach`: its `blocked` edges
 * stay shut, its `lifted` edges open only after the player does something,
 * and an exit that exists only `while` a condition holds is not counted as
 * open. A breadth-first search over what is left gives each room its
 * shortest route; every other room is unrouted, with the reason the player
 * cannot simply walk there.
 *
 * Pure: it reads the IR and the reach result and touches no engine. Whether
 * a typed route really arrives is the runner's question.
 *
 * Public interface: `planRoomRoutes`, `RoomRoute`, `RouteStep`,
 *   `UnroutedRoom`, `RoomRoutes`.
 * Owner context: @sharpee/branch-tester — the lenses (ADR-408 D3).
 */

import type { StoryIR } from '@sharpee/chord';
import { roomsOf, startRoomOf, wiredEdges, type ReachResult } from '@sharpee/world-index';

/** One move along a route. */
export interface RouteStep {
  /** What the player types: a compass word, or a passage's first form. */
  readonly command: string;
  /** The IR id of the door the move passes through, when it passes through one. */
  readonly door?: string;
  /** The IR id of the room the move arrives in. */
  readonly to: string;
}

/** A room and the shortest route that reaches it from the opening. */
export interface RoomRoute {
  /** The room's IR id. */
  readonly roomId: string;
  /** The moves from the opening room; empty for the opening room itself. */
  readonly steps: readonly RouteStep[];
}

/** A room no open route reaches, and why. */
export interface UnroutedRoom {
  /** The room's IR id. */
  readonly roomId: string;
  /** In the author's terms: reach's reason for the first shut way in, or that nothing leads there. */
  readonly reason: string;
}

/** Every declared room, routed or not. */
export interface RoomRoutes {
  /** The opening room's IR id; absent when the story places no player. */
  readonly start?: string;
  /** Routed rooms, nearest first (ties in the loader's edge order), the opening room first. */
  readonly routes: readonly RoomRoute[];
  readonly unrouted: readonly UnroutedRoom[];
}

const keyOf = (from: string, direction: string): string => `${from}\u0000${direction}`;

/**
 * Plan the shortest route to every room from the opening.
 *
 * @param ir the compiled story
 * @param reach `deriveReach(ir)`, for the ways shut at the start
 * @returns the routes, and the rooms no open route reaches with the reason
 */
export function planRoomRoutes(ir: StoryIR, reach: ReachResult): RoomRoutes {
  const rooms = roomsOf(ir);
  const roomIds = new Set(rooms.map((room) => room.id));
  const start = startRoomOf(ir);
  const edges = wiredEdges(rooms, (id) => roomIds.has(id), ir.entities ?? []);

  const nameOf = (id: string): string => ir.entities.find((entity) => entity.id === id)?.name ?? id;
  const wayOf = (from: string, direction: string): string => `the ${direction} way from ${nameOf(from)}`;

  /** Why each way shut at the start is shut, by (from, direction). */
  const shut = new Map<string, string>();
  // A blocked edge stays shut however the player plays: reach's reason is why.
  for (const edge of reach.blocked) shut.set(keyOf(edge.from, edge.direction), `${wayOf(edge.from, edge.direction)} stays shut: ${edge.reason}`);
  // A lifted edge opens once the player acts; reach's reason says why it CAN
  // open, so the lens names what opening it takes instead.
  for (const edge of reach.lifted) {
    const what = edge.obstacle === 'lock' ? 'locked' : 'guarded';
    const takes = edge.requires.length ? ` until the player deals with ${edge.requires.map(nameOf).join(', ')}` : ' until the player acts';
    shut.set(keyOf(edge.from, edge.direction), `${wayOf(edge.from, edge.direction)} is ${what}${takes}`);
  }
  for (const edge of edges) {
    if (edge.condition && !shut.has(keyOf(edge.from, edge.direction))) {
      shut.set(keyOf(edge.from, edge.direction), `${wayOf(edge.from, edge.label ?? edge.direction)} exists only while its condition holds`);
    }
  }

  if (start === undefined || !roomIds.has(start)) {
    return { routes: [], unrouted: rooms.map((room) => ({ roomId: room.id, reason: 'the story places no player in a room' })) };
  }

  const routeTo = new Map<string, RouteStep[]>([[start, []]]);
  const order: string[] = [start];
  /** The first shut way into each room the search could not enter, for its reason. */
  const shutInto = new Map<string, string>();
  for (let index = 0; index < order.length; index++) {
    const here = order[index];
    for (const edge of edges) {
      if (edge.from !== here || edge.outside || !roomIds.has(edge.to)) continue;
      const reason = shut.get(keyOf(edge.from, edge.direction));
      if (reason !== undefined) {
        if (!shutInto.has(edge.to)) shutInto.set(edge.to, reason);
        continue;
      }
      if (routeTo.has(edge.to)) continue;
      const step: RouteStep = { command: edge.label ?? edge.direction, to: edge.to, ...(edge.via ? { door: edge.via } : {}) };
      routeTo.set(edge.to, [...routeTo.get(here)!, step]);
      order.push(edge.to);
    }
  }

  // A room with no shut way straight into it lies beyond one that has: find
  // the nearest such room on a path over every exit, shut or not, and name it.
  const beyond = new Map<string, string>();
  const frontier = [...shutInto.keys()];
  const seenBeyond = new Set<string>([...routeTo.keys(), ...frontier]);
  for (let index = 0; index < frontier.length; index++) {
    const here = frontier[index];
    const gate = beyond.get(here) ?? here;
    for (const edge of edges) {
      if (edge.from !== here || edge.outside || !roomIds.has(edge.to) || seenBeyond.has(edge.to)) continue;
      seenBeyond.add(edge.to);
      beyond.set(edge.to, gate);
      frontier.push(edge.to);
    }
  }

  return {
    start,
    routes: order.map((roomId) => ({ roomId, steps: routeTo.get(roomId)! })),
    unrouted: rooms
      .filter((room) => !routeTo.has(room.id))
      .map((room) => {
        const direct = shutInto.get(room.id);
        if (direct !== undefined) return { roomId: room.id, reason: direct };
        const gate = beyond.get(room.id);
        if (gate !== undefined) return { roomId: room.id, reason: `it lies beyond ${nameOf(gate)}, and ${shutInto.get(gate)}` };
        return { roomId: room.id, reason: 'no exit from any room leads here' };
      }),
  };
}

/**
 * map.ts — what shape is the place?
 *
 * Purpose: the Map view of the World Index (ADR-321 D7). Rooms are laid out by
 * walking wired exits from the start room and stepping one cell per compass
 * direction. Two rooms can legitimately claim the same cell — a real house puts
 * a study and a hillside in the same compass sector — so a collision pushes the
 * arriving room to the nearest free cell rather than dropping it, which would
 * strand every room behind it.
 *
 * Public interface: layoutMap and its result types.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract: the manual overrides are supplied by the caller, so persisting them
 * stays the IDE's business.
 *
 * @packageDocumentation
 * @see ADR-321 D7: a compass grid with collision resolution and persisted
 *   manual nudges
 */

import type { StoryIR } from '@sharpee/chord';
import { wiredEdges } from './loader-semantics.js';
import { roomsOf, startRoomOf } from './story.js';

/** A grid cell: east, north, and up, in whole steps from the start room. */
export interface Cell {
  /** East is positive. */
  x: number;
  /** North is positive. */
  y: number;
  /** Up is positive — a z-level, not a diagonal. */
  z: number;
}

/** One compass step. */
const STEP: Readonly<Record<string, Cell>> = {
  north: { x: 0, y: 1, z: 0 },
  south: { x: 0, y: -1, z: 0 },
  east: { x: 1, y: 0, z: 0 },
  west: { x: -1, y: 0, z: 0 },
  northeast: { x: 1, y: 1, z: 0 },
  northwest: { x: -1, y: 1, z: 0 },
  southeast: { x: 1, y: -1, z: 0 },
  southwest: { x: -1, y: -1, z: 0 },
  up: { x: 0, y: 0, z: 1 },
  down: { x: 0, y: 0, z: -1 },
};

/** How far out the search for a free cell will go before giving up. */
const MAX_DISPLACEMENT_RADIUS = 4;

/** A room pushed off its compass cell because another room was already there. */
export interface ResolvedCollision {
  /** The room that was pushed. */
  room: string;
  /** The room already holding the cell. */
  heldBy: string;
  /** The cell the compass asked for. */
  wanted: Cell;
  /** The cell it was placed in instead. */
  placed: Cell;
  /** The move that led here. */
  from: string;
  /** The direction of that move. */
  direction: string;
}

/**
 * A cycle that does not close: the same room, two different cells.
 *
 * A room the solver displaced is never reported here — its cell disagrees with
 * the compass by construction, and the collision record is where that is said.
 * Skew means the author's own geometry disagrees with itself.
 */
export interface DirectionSkew {
  /** The room the walk arrived at again. */
  room: string;
  /** Where it already sits. */
  sits: Cell;
  /** Where this move says it should be. */
  wanted: Cell;
  /** The move that disagrees. */
  from: string;
  /** Its direction. */
  direction: string;
}

/** The Map view for one story. */
export interface MapResult {
  /** The room play begins in, placed at the origin. */
  start?: string;
  /** Every placed room's cell, by room id. */
  positions: ReadonlyMap<string, Cell>;
  /** Rooms the walk never reached — connected to nothing it could follow. */
  unplaced: string[];
  /** Collisions the solver resolved by displacement. */
  collisions: ResolvedCollision[];
  /** Cycles that disagree with themselves. */
  skews: DirectionSkew[];
  /** Undirected room pairs with a wired connection between them. */
  connections: Array<{ rooms: [string, string]; via: string | null }>;
}

/** Options for the layout — a manual position wins over the solver. */
export interface LayoutOptions {
  /**
   * Per-story manual positions, by room id. The author nudges what the solver
   * renders badly; the caller owns where these are persisted.
   */
  overrides?: ReadonlyMap<string, Cell>;
}

/** The key a cell occupies in the taken-cell index. */
function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y},${cell.z}`;
}

/** Whether two cells are the same. */
function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/**
 * Cells at a given ring distance from a centre, on the same z-level.
 *
 * Displacement stays in the plane: pushing a collided room up a floor would
 * claim a z-level the author never wrote.
 *
 * @param centre the cell the compass asked for
 * @param radius the ring distance
 * @returns every cell on that ring, nearest-first by construction
 */
function ringAround(centre: Cell, radius: number): Cell[] {
  const ring: Cell[] = [];
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
      ring.push({ x: centre.x + dx, y: centre.y + dy, z: centre.z });
    }
  }
  return ring;
}

/**
 * The nearest free cell to the one the compass asked for.
 *
 * @param wanted the cell the compass asked for
 * @param taken the cells already occupied
 * @returns a free cell, or undefined when the neighbourhood is full out to the
 *   search limit
 */
function nearestFreeCell(wanted: Cell, taken: ReadonlyMap<string, string>): Cell | undefined {
  for (let radius = 1; radius <= MAX_DISPLACEMENT_RADIUS; radius += 1) {
    for (const candidate of ringAround(wanted, radius)) {
      if (!taken.has(cellKey(candidate))) return candidate;
    }
  }
  return undefined;
}

/**
 * Lay the story's rooms out on a compass grid.
 *
 * @param ir the story IR
 * @param options manual positions to honour ahead of the solver
 * @returns a cell per placed room, the collisions resolved, the skews found, the
 *   rooms left unplaced, and the connections between them
 */
export function layoutMap(ir: StoryIR, options: LayoutOptions = {}): MapResult {
  const rooms = roomsOf(ir);
  const roomIds = new Set(rooms.map((room) => room.id));
  const edges = wiredEdges(rooms, (id) => roomIds.has(id));

  const outgoing = new Map<string, typeof edges>();
  for (const edge of edges) {
    const list = outgoing.get(edge.from);
    if (list === undefined) outgoing.set(edge.from, [edge]);
    else list.push(edge);
  }

  const positions = new Map<string, Cell>();
  const taken = new Map<string, string>();
  const collisions: ResolvedCollision[] = [];
  const skews: DirectionSkew[] = [];
  const displaced = new Set<string>();

  const place = (roomId: string, cell: Cell): void => {
    positions.set(roomId, cell);
    taken.set(cellKey(cell), roomId);
  };

  for (const [roomId, cell] of options.overrides ?? []) {
    if (!roomIds.has(roomId) || taken.has(cellKey(cell))) continue;
    place(roomId, cell);
  }

  const start = startRoomOf(ir);
  if (start !== undefined && roomIds.has(start)) {
    if (!positions.has(start)) {
      const origin = { x: 0, y: 0, z: 0 };
      place(start, taken.has(cellKey(origin)) ? (nearestFreeCell(origin, taken) ?? origin) : origin);
    }

    const queue = [start];
    const queued = new Set([start]);
    while (queue.length > 0) {
      const roomId = queue.shift() as string;
      const here = positions.get(roomId) as Cell;
      for (const edge of outgoing.get(roomId) ?? []) {
        const step = STEP[edge.direction];
        if (step === undefined) continue;
        const wanted = { x: here.x + step.x, y: here.y + step.y, z: here.z + step.z };

        const already = positions.get(edge.to);
        if (already !== undefined) {
          if (!sameCell(already, wanted) && !displaced.has(edge.to) && !displaced.has(roomId)) {
            skews.push({ room: edge.to, sits: already, wanted, from: roomId, direction: edge.direction });
          }
          if (!queued.has(edge.to)) {
            queued.add(edge.to);
            queue.push(edge.to);
          }
          continue;
        }

        const holder = taken.get(cellKey(wanted));
        if (holder !== undefined) {
          const free = nearestFreeCell(wanted, taken);
          if (free === undefined) continue;
          collisions.push({ room: edge.to, heldBy: holder, wanted, placed: free, from: roomId, direction: edge.direction });
          displaced.add(edge.to);
          place(edge.to, free);
        } else {
          place(edge.to, wanted);
        }
        if (!queued.has(edge.to)) {
          queued.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
  }

  const connections = new Map<string, { rooms: [string, string]; via: string | null }>();
  for (const edge of edges) {
    // Code-unit order, the default sort's order, stated as a compare function.
    const pair = [edge.from, edge.to].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)) as [string, string];
    const key = pair.join('|');
    const existing = connections.get(key);
    if (existing === undefined) connections.set(key, { rooms: pair, via: edge.via });
    else if (existing.via === null && edge.via !== null) existing.via = edge.via;
  }

  return {
    start,
    positions,
    unplaced: rooms.filter((room) => !positions.has(room.id)).map((room) => room.id),
    collisions,
    skews,
    connections: [...connections.values()],
  };
}

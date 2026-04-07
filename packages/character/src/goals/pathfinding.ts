/**
 * NPC pathfinding (ADR-145)
 *
 * BFS over room connection graph filtered by NPC movement profile.
 * NPCs can only pathfind through rooms they know and passages they
 * have access to.
 *
 * Public interface: findNextRoom, RoomGraph, RoomConnection.
 * Owner context: @sharpee/character / goals
 */

import { MovementProfile } from './goal-types';

// ---------------------------------------------------------------------------
// Room graph types
// ---------------------------------------------------------------------------

/** A connection between two rooms. */
export interface RoomConnection {
  /** Source room ID. */
  from: string;

  /** Destination room ID. */
  to: string;

  /** Optional passage/connection ID (for access checking). */
  passageId?: string;
}

/**
 * A room graph — adjacency list representation.
 * The caller (NpcService or test harness) provides this from the world model.
 */
export interface RoomGraph {
  /** Get all connections from a room. */
  getConnections(roomId: string): RoomConnection[];
}

/**
 * Simple room graph implementation for testing.
 * Production code can implement the RoomGraph interface directly.
 */
export class SimpleRoomGraph implements RoomGraph {
  private connections: Map<string, RoomConnection[]> = new Map();

  /**
   * Add a bidirectional connection between two rooms.
   *
   * @param from - Source room ID
   * @param to - Destination room ID
   * @param passageId - Optional passage ID
   */
  addConnection(from: string, to: string, passageId?: string): void {
    this.addDirected(from, to, passageId);
    this.addDirected(to, from, passageId);
  }

  /**
   * Add a one-way connection.
   *
   * @param from - Source room ID
   * @param to - Destination room ID
   * @param passageId - Optional passage ID
   */
  addDirected(from: string, to: string, passageId?: string): void {
    const existing = this.connections.get(from) ?? [];
    existing.push({ from, to, passageId });
    this.connections.set(from, existing);
  }

  getConnections(roomId: string): RoomConnection[] {
    return this.connections.get(roomId) ?? [];
  }
}

// ---------------------------------------------------------------------------
// Pathfinding
// ---------------------------------------------------------------------------

/**
 * Find the next room the NPC should move to on the shortest path
 * toward a target room, filtered by movement profile.
 *
 * Uses BFS (breadth-first search) over the room graph. Only traverses
 * rooms the NPC knows about and passages the NPC has access to.
 *
 * @param currentRoom - The NPC's current room ID
 * @param targetRoom - The destination room ID
 * @param graph - The room connection graph
 * @param movement - The NPC's movement profile
 * @returns The next room ID to move to, or null if unreachable
 */
export function findNextRoom(
  currentRoom: string,
  targetRoom: string,
  graph: RoomGraph,
  movement: MovementProfile,
): string | null {
  if (currentRoom === targetRoom) return null; // Already there

  // BFS
  const visited = new Set<string>();
  // Queue entries: [roomId, firstStepFromCurrent]
  const queue: [string, string][] = [];

  visited.add(currentRoom);

  // Seed with adjacent rooms
  for (const conn of graph.getConnections(currentRoom)) {
    if (!canTraverse(conn, movement)) continue;
    if (!knowsRoom(conn.to, movement)) continue;

    if (conn.to === targetRoom) return conn.to;

    visited.add(conn.to);
    queue.push([conn.to, conn.to]); // firstStep is this neighbor
  }

  // BFS loop
  while (queue.length > 0) {
    const [room, firstStep] = queue.shift()!;

    for (const conn of graph.getConnections(room)) {
      if (visited.has(conn.to)) continue;
      if (!canTraverse(conn, movement)) continue;
      if (!knowsRoom(conn.to, movement)) continue;

      if (conn.to === targetRoom) return firstStep;

      visited.add(conn.to);
      queue.push([conn.to, firstStep]);
    }
  }

  return null; // Unreachable
}

// ---------------------------------------------------------------------------
// Movement profile checks
// ---------------------------------------------------------------------------

/**
 * Check if the NPC can traverse a connection.
 * If the connection has a passageId, the NPC must have access to it.
 */
function canTraverse(conn: RoomConnection, movement: MovementProfile): boolean {
  if (!conn.passageId) return true; // No passage restriction
  if (movement.access === 'all') return true;
  return movement.access.includes(conn.passageId);
}

/**
 * Check if the NPC knows about a room.
 */
function knowsRoom(roomId: string, movement: MovementProfile): boolean {
  if (movement.knows === 'all') return true;
  return movement.knows.includes(roomId);
}

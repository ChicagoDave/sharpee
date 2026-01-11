/**
 * Navigator for Smart Transcript Directives (ADR-092)
 *
 * Handles NAVIGATE TO directives by pathfinding to target rooms
 * and executing GO commands. Handles random outcomes (e.g., Round Room
 * carousel) by recalculating path when actual location differs from expected.
 */

import { NavigateResult } from './types';

// WorldModel interface (minimal subset needed for navigation)
interface WorldModelLike {
  getLocation(entityId: string): string | undefined;
  getEntity(entityId: string): any | undefined;
  findByTrait(traitType: string): any[];
  findWhere(predicate: (entity: any) => boolean): any[];
  findPath(fromRoomId: string, toRoomId: string): string[] | null;
}

// GameEngine interface for command execution
interface GameEngineLike {
  executeCommand(input: string): Promise<string> | string;
}

// Constants
const MAX_NAVIGATE_ATTEMPTS = 50;  // Max attempts to handle random outcomes
const ROOM_TRAIT_TYPE = 'if.trait.room';

/**
 * Calculate room-to-room distance using BFS
 * Returns Infinity if no path exists
 */
function calculateRoomDistance(
  world: WorldModelLike,
  fromRoomId: string,
  toRoomId: string
): number {
  if (fromRoomId === toRoomId) return 0;

  const visited = new Set<string>();
  const queue: { roomId: string; distance: number }[] = [{ roomId: fromRoomId, distance: 0 }];

  while (queue.length > 0) {
    const { roomId, distance } = queue.shift()!;

    if (visited.has(roomId)) continue;
    visited.add(roomId);

    const room = world.getEntity(roomId);
    const roomTrait = room?.get?.('room') || room?.getTrait?.('room');
    if (!roomTrait?.exits) continue;

    for (const [_direction, exitInfo] of Object.entries(roomTrait.exits)) {
      if (!exitInfo) continue;

      let dest: string | undefined;
      if (typeof exitInfo === 'string') {
        dest = exitInfo;
      } else if (typeof exitInfo === 'object') {
        dest = (exitInfo as any).destination;
      }

      if (!dest) continue;

      // Found destination!
      if (dest === toRoomId) {
        return distance + 1;
      }

      // Add to queue if not visited
      if (!visited.has(dest)) {
        queue.push({ roomId: dest, distance: distance + 1 });
      }
    }
  }

  return Infinity; // No path found
}

/**
 * Find a room by name (searches identity.name)
 */
function findRoomByName(world: WorldModelLike, name: string): any | null {
  const nameLower = name.toLowerCase();

  const rooms = world.findWhere((entity: any) => {
    // Check if it's a room
    const roomTrait = entity.get?.('room') || entity.traits?.get?.('room');
    if (!roomTrait) return false;

    const identity = entity.get?.('identity') || entity.traits?.get?.('identity');
    if (!identity) return false;

    const entityName = (identity.name || '').toLowerCase();
    const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

    return entityName === nameLower ||
           entityName.includes(nameLower) ||
           aliases.some((a: string) => a === nameLower || a.includes(nameLower));
  });

  return rooms[0] || null;
}

/**
 * Get the name of a room by ID
 */
function getRoomName(world: WorldModelLike, roomId: string): string {
  const room = world.getEntity(roomId);
  if (!room) return roomId;

  const identity = room.get?.('identity') || room.traits?.get?.('identity');
  return identity?.name || roomId;
}

/**
 * Get the direction that leads from one room to another
 */
function getDirectionToRoom(
  world: WorldModelLike,
  fromRoomId: string,
  toRoomId: string
): string | null {
  const fromRoom = world.getEntity(fromRoomId);
  if (!fromRoom) return null;

  const roomTrait = fromRoom.get?.('room') || fromRoom.traits?.get?.('room');
  if (!roomTrait || !roomTrait.exits) return null;

  // Check each exit to find one that leads to the target room
  for (const [direction, exitInfo] of Object.entries(roomTrait.exits)) {
    if (!exitInfo) continue;

    let destination: string | undefined;

    if (typeof exitInfo === 'string') {
      destination = exitInfo;
    } else if (typeof exitInfo === 'object') {
      destination = (exitInfo as any).destination;
    }

    if (destination === toRoomId) {
      return direction.toLowerCase();
    }
  }

  return null;
}

/**
 * Execute navigation to a target room
 *
 * Uses pathfinding to find route, executes GO commands, and handles
 * random outcomes by recalculating path from actual location.
 */
export async function executeNavigate(
  targetRoomName: string,
  world: WorldModelLike,
  engine: GameEngineLike,
  playerId: string,
  verbose: boolean = false
): Promise<NavigateResult> {
  const path: string[] = [];
  const commands: string[] = [];

  // Find target room
  if (verbose) {
    console.log(`  [NAVIGATE] Searching for room: "${targetRoomName}"`);
  }
  const targetRoom = findRoomByName(world, targetRoomName);
  if (!targetRoom) {
    if (verbose) {
      // Debug: list all rooms to see what's available
      const allRooms = world.findWhere((e: any) => {
        const roomTrait = e.get?.('room') || e.getTrait?.('room');
        return !!roomTrait;
      });
      console.log(`  [NAVIGATE] Available rooms: ${allRooms.map((r: any) => {
        const identity = r.get?.('identity') || r.getTrait?.('identity');
        return identity?.name || r.id;
      }).join(', ')}`);
    }
    return {
      success: false,
      path,
      commands,
      error: `Target room "${targetRoomName}" not found`
    };
  }
  if (verbose) {
    console.log(`  [NAVIGATE] Found target room: ${targetRoom.id}`);
  }

  const targetRoomId = targetRoom.id;

  // Check if already at destination
  let currentRoomId = world.getLocation(playerId);
  if (!currentRoomId) {
    return {
      success: false,
      path,
      commands,
      error: 'Player location unknown'
    };
  }

  if (currentRoomId === targetRoomId) {
    if (verbose) {
      console.log(`  [NAVIGATE] Already at "${targetRoomName}"`);
    }
    return {
      success: true,
      path: [getRoomName(world, currentRoomId)],
      commands
    };
  }

  // Navigation loop - keep trying until we reach destination or run out of attempts
  let attempts = 0;

  if (verbose) {
    console.log(`  [NAVIGATE] Starting navigation from ${currentRoomId} to ${targetRoomId}`);
  }

  while (attempts < MAX_NAVIGATE_ATTEMPTS) {
    attempts++;

    currentRoomId = world.getLocation(playerId);
    if (!currentRoomId) {
      return {
        success: false,
        path,
        commands,
        error: 'Player location unknown'
      };
    }

    // Already at destination?
    if (currentRoomId === targetRoomId) {
      if (verbose) {
        console.log(`  [NAVIGATE] Arrived at "${targetRoomName}" after ${commands.length} commands`);
      }
      return {
        success: true,
        path,
        commands
      };
    }

    // Find an exit that leads toward the destination
    // We check each exit and verify it leads closer using findPath
    const currentRoom = world.getEntity(currentRoomId);
    const roomTrait = currentRoom?.get?.('room') || currentRoom?.getTrait?.('room');

    if (!roomTrait?.exits) {
      return {
        success: false,
        path,
        commands,
        error: `No exits from "${getRoomName(world, currentRoomId)}"`
      };
    }

    // Find the best exit (one that gets us closest to destination)
    let nextRoomId: string | null = null;
    let bestDirection: string | null = null;
    let shortestPathLength = Infinity;

    for (const [direction, exitInfo] of Object.entries(roomTrait.exits)) {
      if (!exitInfo) continue;

      let dest: string | undefined;
      if (typeof exitInfo === 'string') {
        dest = exitInfo;
      } else if (typeof exitInfo === 'object') {
        dest = (exitInfo as any).destination;
      }

      if (!dest) continue;

      // If this exit leads directly to destination, use it immediately
      if (dest === targetRoomId) {
        nextRoomId = dest;
        bestDirection = direction;
        shortestPathLength = 0;
        break;
      }

      // Calculate actual room distance from this exit to destination
      const distanceFromDest = calculateRoomDistance(world, dest, targetRoomId);
      if (distanceFromDest < Infinity && distanceFromDest < shortestPathLength) {
        nextRoomId = dest;
        bestDirection = direction;
        shortestPathLength = distanceFromDest;
      }
    }

    if (!nextRoomId || !bestDirection) {
      return {
        success: false,
        path,
        commands,
        error: `No path from "${getRoomName(world, currentRoomId)}" toward "${targetRoomName}"`
      };
    }

    // Record current room name
    const currentRoomName = getRoomName(world, currentRoomId);
    if (path.length === 0 || path[path.length - 1] !== currentRoomName) {
      path.push(currentRoomName);
    }

    // Execute direction command (parser uses just the direction, not "go direction")
    const command = bestDirection.toLowerCase();
    commands.push(command);

    if (verbose) {
      console.log(`  [NAVIGATE] ${currentRoomName} -> go ${bestDirection.toLowerCase()}`);
    }

    try {
      await engine.executeCommand(command);
    } catch (e) {
      return {
        success: false,
        path,
        commands,
        error: `Command failed: ${command} - ${e instanceof Error ? e.message : String(e)}`
      };
    }

    // Verify we moved to expected room (or handle random outcome)
    const newRoomId = world.getLocation(playerId);

    if (newRoomId !== nextRoomId && newRoomId !== currentRoomId) {
      // We moved, but not to expected room (e.g., Round Room carousel)
      // This is OK - we'll recalculate path from wherever we are
      if (verbose) {
        console.log(`  [NAVIGATE] Ended up in "${getRoomName(world, newRoomId!)}" (expected "${getRoomName(world, nextRoomId)}")`);
      }
    } else if (newRoomId === currentRoomId) {
      // Didn't move at all - blocked?
      return {
        success: false,
        path,
        commands,
        error: `Blocked: could not go ${bestDirection.toLowerCase()} from "${currentRoomName}"`
      };
    }

    // Update path with new location
    if (newRoomId) {
      const newRoomName = getRoomName(world, newRoomId);
      path.push(newRoomName);
    }
  }

  // Exceeded max attempts
  return {
    success: false,
    path,
    commands,
    error: `Navigation exceeded ${MAX_NAVIGATE_ATTEMPTS} attempts (random outcomes?)`
  };
}

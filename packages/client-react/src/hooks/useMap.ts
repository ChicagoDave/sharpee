/**
 * useMap - Hook for tracking and persisting exploration map data
 *
 * Builds a spatial map as the player explores:
 * - Positions rooms on a grid based on direction traveled
 * - Persists to localStorage so map survives refresh
 * - Tracks connections between rooms
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameState } from '../context/GameContext';
import type { CurrentRoom, RoomExit } from '../types/game-state';

/**
 * Direction offsets for grid positioning
 */
const DIRECTION_OFFSETS: Record<string, { dx: number; dy: number; dz: number }> = {
  north: { dx: 0, dy: -1, dz: 0 },
  south: { dx: 0, dy: 1, dz: 0 },
  east: { dx: 1, dy: 0, dz: 0 },
  west: { dx: -1, dy: 0, dz: 0 },
  northeast: { dx: 1, dy: -1, dz: 0 },
  northwest: { dx: -1, dy: -1, dz: 0 },
  southeast: { dx: 1, dy: 1, dz: 0 },
  southwest: { dx: -1, dy: 1, dz: 0 },
  up: { dx: 0, dy: 0, dz: 1 },
  down: { dx: 0, dy: 0, dz: -1 },
  // Aliases
  n: { dx: 0, dy: -1, dz: 0 },
  s: { dx: 0, dy: 1, dz: 0 },
  e: { dx: 1, dy: 0, dz: 0 },
  w: { dx: -1, dy: 0, dz: 0 },
  ne: { dx: 1, dy: -1, dz: 0 },
  nw: { dx: -1, dy: -1, dz: 0 },
  se: { dx: 1, dy: 1, dz: 0 },
  sw: { dx: -1, dy: 1, dz: 0 },
  u: { dx: 0, dy: 0, dz: 1 },
  d: { dx: 0, dy: 0, dz: -1 },
};

/**
 * A room on the exploration map
 */
export interface MapRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number; // Level (up/down)
  exits: RoomExit[];
  visited: boolean;
}

/**
 * A connection between two rooms
 */
export interface MapConnection {
  fromId: string;
  toId: string;
  direction: string;
}

/**
 * Complete map state
 */
export interface MapState {
  rooms: Map<string, MapRoom>;
  connections: MapConnection[];
  currentRoomId: string | null;
  currentLevel: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Serializable version for localStorage
 */
interface SerializedMapState {
  rooms: Array<[string, MapRoom]>;
  connections: MapConnection[];
}

const STORAGE_KEY_PREFIX = 'sharpee-map-';

function loadMapFromStorage(storyId: string): SerializedMapState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PREFIX + storyId);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore localStorage errors (private mode, quota, etc.)
  }
  return null;
}

function saveMapToStorage(storyId: string, state: MapState): void {
  try {
    const serialized: SerializedMapState = {
      rooms: Array.from(state.rooms.entries()),
      connections: state.connections,
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + storyId, JSON.stringify(serialized));
  } catch {
    // Ignore localStorage errors
  }
}

function calculateBounds(rooms: Map<string, MapRoom>): MapState['bounds'] {
  let minX = 0,
    maxX = 0,
    minY = 0,
    maxY = 0;
  for (const room of rooms.values()) {
    minX = Math.min(minX, room.x);
    maxX = Math.max(maxX, room.x);
    minY = Math.min(minY, room.y);
    maxY = Math.max(maxY, room.y);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Hook to manage exploration map state
 */
export function useMap(storyId: string): MapState & {
  clearMap: () => void;
} {
  const { currentRoom } = useGameState();
  const previousRoomRef = useRef<CurrentRoom | null>(null);

  // Initialize from localStorage
  const [mapState, setMapState] = useState<MapState>(() => {
    const saved = loadMapFromStorage(storyId);
    if (saved) {
      const rooms = new Map(saved.rooms);
      return {
        rooms,
        connections: saved.connections,
        currentRoomId: null,
        currentLevel: 0,
        bounds: calculateBounds(rooms),
      };
    }
    return {
      rooms: new Map(),
      connections: [],
      currentRoomId: null,
      currentLevel: 0,
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    };
  });

  // Get direction from event data (arrivedFrom) - no need to infer
  const getArrivalDirection = useCallback(
    (toRoom: CurrentRoom): string | null => {
      // The direction is provided by the if.event.actor_moved event
      return toRoom.arrivedFrom || null;
    },
    []
  );

  // Update map when room changes
  useEffect(() => {
    if (!currentRoom) return;

    // IMPORTANT: Capture prevRoom BEFORE setMapState to avoid ref timing issues
    const prevRoom = previousRoomRef.current;
    const direction = getArrivalDirection(currentRoom);

    setMapState((prev) => {
      const rooms = new Map(prev.rooms);
      const connections = [...prev.connections];
      let newLevel = prev.currentLevel;

      // Build set of occupied positions for collision detection
      const isOccupied = (testX: number, testY: number, testZ: number): boolean => {
        for (const room of rooms.values()) {
          if (room.x === testX && room.y === testY && room.z === testZ) {
            return true;
          }
        }
        return false;
      };

      /**
       * Find position that respects compass directionality.
       *
       * Key principle: When going WEST, the new room MUST be to the left (x < prevX).
       * If the ideal position is occupied, we offset perpendicular to the travel
       * direction while still maintaining the directional constraint.
       *
       * For example, going WEST from (1,-1) with (0,-1) occupied:
       * - Try (0,-2) - still west, offset north
       * - Try (0,0) - still west, offset south
       * - Try (-1,-1) - further west
       * - etc.
       */
      const findDirectionalPosition = (
        prevX: number,
        prevY: number,
        prevZ: number,
        dir: string
      ): { x: number; y: number; z: number } => {
        const offset = DIRECTION_OFFSETS[dir] || { dx: 0, dy: 0, dz: 0 };
        const idealX = prevX + offset.dx;
        const idealY = prevY + offset.dy;
        const idealZ = prevZ + offset.dz;

        // If ideal position is free, use it
        if (!isOccupied(idealX, idealY, idealZ)) {
          return { x: idealX, y: idealY, z: idealZ };
        }

        // Determine perpendicular offsets based on travel direction
        // For E/W travel: offset N/S (perpendicular)
        // For N/S travel: offset E/W (perpendicular)
        // For diagonal: try both perpendicular axes
        const perpOffsets: Array<{ dx: number; dy: number }> = [];

        if (offset.dx !== 0 && offset.dy === 0) {
          // Horizontal travel (E/W) - offset vertically
          perpOffsets.push({ dx: 0, dy: -1 }, { dx: 0, dy: 1 }); // N, S
        } else if (offset.dx === 0 && offset.dy !== 0) {
          // Vertical travel (N/S) - offset horizontally
          perpOffsets.push({ dx: 1, dy: 0 }, { dx: -1, dy: 0 }); // E, W
        } else if (offset.dx !== 0 && offset.dy !== 0) {
          // Diagonal travel - offset on both perpendicular axes
          perpOffsets.push(
            { dx: -offset.dx, dy: 0 }, // opposite horizontal
            { dx: 0, dy: -offset.dy }, // opposite vertical
            { dx: offset.dx, dy: 0 },  // same horizontal
            { dx: 0, dy: offset.dy }   // same vertical
          );
        }

        // Try positions that maintain the primary direction but offset perpendicularly
        // Expand outward: distance 1, 2, 3...
        for (let dist = 1; dist <= 5; dist++) {
          for (const perp of perpOffsets) {
            const testX = idealX + perp.dx * dist;
            const testY = idealY + perp.dy * dist;
            if (!isOccupied(testX, testY, idealZ)) {
              return { x: testX, y: testY, z: idealZ };
            }
          }

          // Also try going further in the primary direction
          const furtherX = prevX + offset.dx * (dist + 1);
          const furtherY = prevY + offset.dy * (dist + 1);
          if (!isOccupied(furtherX, furtherY, idealZ)) {
            return { x: furtherX, y: furtherY, z: idealZ };
          }

          // And combinations: further + perpendicular
          for (const perp of perpOffsets) {
            for (let perpDist = 1; perpDist <= dist; perpDist++) {
              const testX = furtherX + perp.dx * perpDist;
              const testY = furtherY + perp.dy * perpDist;
              if (!isOccupied(testX, testY, idealZ)) {
                return { x: testX, y: testY, z: idealZ };
              }
            }
          }
        }

        // Fallback: just find any open spot nearby
        for (let r = 1; r <= 10; r++) {
          for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
              if (!isOccupied(prevX + dx, prevY + dy, prevZ)) {
                return { x: prevX + dx, y: prevY + dy, z: prevZ };
              }
            }
          }
        }

        return { x: prevX + 10, y: prevY, z: prevZ };
      };

      // Find any unoccupied adjacent position (when direction unknown)
      const findAnyAdjacentPosition = (
        refX: number,
        refY: number,
        refZ: number
      ): { x: number; y: number; z: number } => {
        const directions = ['east', 'south', 'west', 'north', 'southeast', 'southwest', 'northeast', 'northwest'];
        for (const dir of directions) {
          const offset = DIRECTION_OFFSETS[dir];
          if (!isOccupied(refX + offset.dx, refY + offset.dy, refZ + offset.dz)) {
            return { x: refX + offset.dx, y: refY + offset.dy, z: refZ + offset.dz };
          }
        }
        // Spiral outward
        for (let r = 2; r <= 5; r++) {
          for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
              if (Math.abs(dx) === r || Math.abs(dy) === r) {
                if (!isOccupied(refX + dx, refY + dy, refZ)) {
                  return { x: refX + dx, y: refY + dy, z: refZ };
                }
              }
            }
          }
        }
        return { x: refX + 10, y: refY, z: refZ };
      };

      // Calculate position for new room
      let x = 0,
        y = 0,
        z = 0;

      if (rooms.has(currentRoom.id)) {
        // Room already mapped - just update current
        const existing = rooms.get(currentRoom.id)!;
        x = existing.x;
        y = existing.y;
        z = existing.z;
        newLevel = z;
      } else if (prevRoom && rooms.has(prevRoom.id) && direction) {
        // Position relative to previous room, respecting compass direction
        const prevMapRoom = rooms.get(prevRoom.id)!;
        const pos = findDirectionalPosition(prevMapRoom.x, prevMapRoom.y, prevMapRoom.z, direction);
        x = pos.x;
        y = pos.y;
        z = pos.z;
        newLevel = z;
      } else if (prevRoom && rooms.has(prevRoom.id)) {
        // Direction unknown - find an unoccupied adjacent position
        const prevMapRoom = rooms.get(prevRoom.id)!;
        const pos = findAnyAdjacentPosition(prevMapRoom.x, prevMapRoom.y, prevMapRoom.z);
        x = pos.x;
        y = pos.y;
        z = pos.z;
        newLevel = z;
      }
      // else: first room, position at origin (0,0,0)

      // Add connection if moving from a previous room (regardless of known direction)
      if (prevRoom && rooms.has(prevRoom.id) && !rooms.has(currentRoom.id)) {
        const connectionExists = connections.some(
          (c) =>
            (c.fromId === prevRoom.id && c.toId === currentRoom.id) ||
            (c.fromId === currentRoom.id && c.toId === prevRoom.id)
        );
        if (!connectionExists) {
          connections.push({
            fromId: prevRoom.id,
            toId: currentRoom.id,
            direction: direction || 'unknown',
          });
        }
      }

      // Add or update room
      rooms.set(currentRoom.id, {
        id: currentRoom.id,
        name: currentRoom.name,
        x,
        y,
        z,
        exits: currentRoom.exits,
        visited: true,
      });

      const newState: MapState = {
        rooms,
        connections,
        currentRoomId: currentRoom.id,
        currentLevel: newLevel,
        bounds: calculateBounds(rooms),
      };

      // Save to localStorage
      saveMapToStorage(storyId, newState);

      return newState;
    });

    // Track previous room for next move
    previousRoomRef.current = currentRoom;
  }, [currentRoom, storyId, getArrivalDirection]);

  // Clear map function
  const clearMap = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + storyId);
    } catch {
      // Ignore
    }
    setMapState({
      rooms: new Map(),
      connections: [],
      currentRoomId: null,
      currentLevel: 0,
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    });
    previousRoomRef.current = null;
  }, [storyId]);

  return {
    ...mapState,
    clearMap,
  };
}

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
 * Opposite direction mapping for back-tracking
 */
const OPPOSITE_DIRECTION: Record<string, string> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  northeast: 'southwest',
  northwest: 'southeast',
  southeast: 'northwest',
  southwest: 'northeast',
  up: 'down',
  down: 'up',
  n: 's',
  s: 'n',
  e: 'w',
  w: 'e',
  ne: 'sw',
  nw: 'se',
  se: 'nw',
  sw: 'ne',
  u: 'd',
  d: 'u',
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
  const lastMoveDirection = useRef<string | null>(null);

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

  // Track direction from last command (simplified: check transcript for movement)
  // In a full implementation, we'd get this from the event data
  const inferDirection = useCallback(
    (fromRoom: CurrentRoom | null, toRoom: CurrentRoom): string | null => {
      if (!fromRoom) return null;

      // Check if the destination matches one of our exits
      const exitToNew = fromRoom.exits.find((e) => e.destination === toRoom.id);
      if (exitToNew) {
        return exitToNew.direction.toLowerCase();
      }

      return null;
    },
    []
  );

  // Update map when room changes
  useEffect(() => {
    if (!currentRoom) return;

    setMapState((prev) => {
      const rooms = new Map(prev.rooms);
      const connections = [...prev.connections];
      let newLevel = prev.currentLevel;

      // Get the previous room
      const prevRoom = previousRoomRef.current;
      const direction = inferDirection(prevRoom, currentRoom);

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
        // Position relative to previous room based on known direction
        const prevMapRoom = rooms.get(prevRoom.id)!;
        const offset = DIRECTION_OFFSETS[direction] || { dx: 0, dy: 0, dz: 0 };
        x = prevMapRoom.x + offset.dx;
        y = prevMapRoom.y + offset.dy;
        z = prevMapRoom.z + offset.dz;
        newLevel = z;
      } else if (prevRoom && rooms.has(prevRoom.id)) {
        // Direction unknown - find an unoccupied adjacent position
        const prevMapRoom = rooms.get(prevRoom.id)!;
        const occupiedPositions = new Set(
          Array.from(rooms.values()).map((r) => `${r.x},${r.y},${r.z}`)
        );

        // Try directions in order: E, S, W, N, SE, SW, NE, NW
        const fallbackDirections = ['east', 'south', 'west', 'north', 'southeast', 'southwest', 'northeast', 'northwest'];
        for (const dir of fallbackDirections) {
          const offset = DIRECTION_OFFSETS[dir];
          const testX = prevMapRoom.x + offset.dx;
          const testY = prevMapRoom.y + offset.dy;
          const testZ = prevMapRoom.z + offset.dz;
          if (!occupiedPositions.has(`${testX},${testY},${testZ}`)) {
            x = testX;
            y = testY;
            z = testZ;
            break;
          }
        }
        newLevel = z;

        // Add connection if not exists
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
      // else: first room, position at origin (0,0,0)

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
  }, [currentRoom, storyId, inferDirection]);

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

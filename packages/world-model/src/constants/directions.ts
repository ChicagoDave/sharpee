/**
 * Language-agnostic direction constants for Interactive Fiction
 * These constants represent spatial relationships, not English words
 */

export const Direction = {
  NORTH: 'NORTH',
  SOUTH: 'SOUTH',
  EAST: 'EAST',
  WEST: 'WEST',
  NORTHEAST: 'NORTHEAST',
  NORTHWEST: 'NORTHWEST',
  SOUTHEAST: 'SOUTHEAST',
  SOUTHWEST: 'SOUTHWEST',
  UP: 'UP',
  DOWN: 'DOWN',
  IN: 'IN',
  OUT: 'OUT'
} as const;

export type DirectionType = typeof Direction[keyof typeof Direction];

/**
 * Map of opposite directions using constants
 */
export const DirectionOpposites: Record<DirectionType, DirectionType> = {
  [Direction.NORTH]: Direction.SOUTH,
  [Direction.SOUTH]: Direction.NORTH,
  [Direction.EAST]: Direction.WEST,
  [Direction.WEST]: Direction.EAST,
  [Direction.NORTHEAST]: Direction.SOUTHWEST,
  [Direction.NORTHWEST]: Direction.SOUTHEAST,
  [Direction.SOUTHEAST]: Direction.NORTHWEST,
  [Direction.SOUTHWEST]: Direction.NORTHEAST,
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.IN]: Direction.OUT,
  [Direction.OUT]: Direction.IN
};

/**
 * Get the opposite direction
 */
export function getOppositeDirection(direction: DirectionType): DirectionType {
  return DirectionOpposites[direction];
}

/**
 * Check if a value is a valid Direction constant
 */
export function isDirection(value: unknown): value is DirectionType {
  return typeof value === 'string' && Object.values(Direction).includes(value as DirectionType);
}

/**
 * Language-agnostic direction constants for Interactive Fiction
 *
 * These constants represent spatial relationships, not English words.
 * The parser owns the mapping from English words to these constants.
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

/**
 * The key of a passage: an exit reached by its own command words rather than
 * a compass word (ADR-378 D1). `passage:` followed by the passage's first
 * form, words hyphenated (`passage:climb-the-rope`). A passage has no
 * opposite, so no reverse exit is ever inferred for one.
 */
export type PassageKey = `passage:${string}`;

/**
 * What a room's exits are keyed by (ADR-378 D1a): a compass direction or a
 * passage. Every reader of exits takes this, not `DirectionType`.
 */
export type ExitKey = DirectionType | PassageKey;

/** The prefix every passage key carries. */
export const PASSAGE_KEY_PREFIX = 'passage:';

/**
 * Check if a value is a passage key
 */
export function isPassageKey(value: unknown): value is PassageKey {
  return typeof value === 'string' && value.startsWith(PASSAGE_KEY_PREFIX) && value.length > PASSAGE_KEY_PREFIX.length;
}

/**
 * Build a passage key from a passage's first form.
 *
 * @param words - The form's words, as the author wrote them
 * @returns `passage:<words-hyphenated>`, lower-cased
 */
export function passageKey(words: readonly string[]): PassageKey {
  return `${PASSAGE_KEY_PREFIX}${words.map((w) => w.toLowerCase()).join('-')}`;
}

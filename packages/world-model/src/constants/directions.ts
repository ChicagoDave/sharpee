/**
 * Language-agnostic direction constants for Interactive Fiction
 *
 * These constants represent spatial relationships, not English words.
 * Direction vocabularies (ADR-143) control how these constants are
 * presented to and accepted from the player.
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

// ---------------------------------------------------------------------------
// Direction Vocabularies (ADR-143)
// ---------------------------------------------------------------------------

/**
 * A single entry in a direction vocabulary.
 *
 * @property display  - The word shown to the player (e.g., "fore")
 * @property words    - All words the parser accepts for this direction (e.g., ["fore", "f", "forward"])
 */
export interface DirectionEntry {
  display: string;
  words: string[];
}

/**
 * A named set of direction-word mappings.
 *
 * Only directions present in the entries map are available to the player.
 * A vocabulary that omits NORTHEAST means diagonal movement is not recognized.
 */
export interface DirectionVocabulary {
  id: string;
  entries: Partial<Record<DirectionType, DirectionEntry>>;
}

/**
 * Pre-defined compass vocabulary (the default).
 */
export const CompassVocabulary: DirectionVocabulary = {
  id: 'compass',
  entries: {
    [Direction.NORTH]:     { display: 'north',     words: ['north', 'n'] },
    [Direction.SOUTH]:     { display: 'south',     words: ['south', 's'] },
    [Direction.EAST]:      { display: 'east',      words: ['east', 'e'] },
    [Direction.WEST]:      { display: 'west',      words: ['west', 'w'] },
    [Direction.NORTHEAST]: { display: 'northeast', words: ['northeast', 'ne'] },
    [Direction.NORTHWEST]: { display: 'northwest', words: ['northwest', 'nw'] },
    [Direction.SOUTHEAST]: { display: 'southeast', words: ['southeast', 'se'] },
    [Direction.SOUTHWEST]: { display: 'southwest', words: ['southwest', 'sw'] },
    [Direction.UP]:        { display: 'up',        words: ['up', 'u'] },
    [Direction.DOWN]:      { display: 'down',      words: ['down', 'd'] },
    [Direction.IN]:        { display: 'in',        words: ['in', 'inside'] },
    [Direction.OUT]:       { display: 'out',       words: ['out', 'outside'] },
  }
};

/**
 * Naval vocabulary — relative to the vessel.
 *
 * Maps cardinal directions to shipboard equivalents.
 * Diagonals are omitted (ships don't have northeast).
 */
export const NavalVocabulary: DirectionVocabulary = {
  id: 'naval',
  entries: {
    [Direction.NORTH]: { display: 'fore',        words: ['fore', 'f', 'forward', 'bow'] },
    [Direction.SOUTH]: { display: 'aft',         words: ['aft', 'a', 'back', 'stern'] },
    [Direction.EAST]:  { display: 'starboard',   words: ['starboard', 'sb', 'right'] },
    [Direction.WEST]:  { display: 'port',        words: ['port', 'p', 'left'] },
    [Direction.UP]:    { display: 'topside',     words: ['topside', 'ts', 'up', 'u'] },
    [Direction.DOWN]:  { display: 'below decks', words: ['below', 'below decks', 'bd', 'down', 'd'] },
    [Direction.IN]:    { display: 'in',          words: ['in', 'inside'] },
    [Direction.OUT]:   { display: 'out',         words: ['out', 'outside'] },
  }
};

/**
 * Minimal vocabulary — for caves, abstract spaces, interiors.
 *
 * Only vertical and threshold directions. No compass.
 */
export const MinimalVocabulary: DirectionVocabulary = {
  id: 'minimal',
  entries: {
    [Direction.UP]:   { display: 'up',   words: ['up', 'u', 'climb'] },
    [Direction.DOWN]: { display: 'down', words: ['down', 'd', 'descend'] },
    [Direction.IN]:   { display: 'in',   words: ['in', 'inside', 'enter', 'deeper'] },
    [Direction.OUT]:  { display: 'out',  words: ['out', 'outside', 'exit', 'back'] },
  }
};

/**
 * Registry of named direction vocabularies.
 *
 * Stories retrieve the registry from the world model and call
 * `useVocabulary()` or `rename()` to configure direction words
 * from a single point.
 */
export class DirectionVocabularyRegistry {
  private vocabularies = new Map<string, DirectionVocabulary>();
  private active: DirectionVocabulary;
  private listeners: Array<(vocab: DirectionVocabulary) => void> = [];

  constructor() {
    // Register built-in vocabularies
    this.vocabularies.set('compass', CompassVocabulary);
    this.vocabularies.set('naval', NavalVocabulary);
    this.vocabularies.set('minimal', MinimalVocabulary);
    this.active = CompassVocabulary;
  }

  /**
   * Register a custom vocabulary.
   */
  define(vocab: DirectionVocabulary): void {
    this.vocabularies.set(vocab.id, vocab);
  }

  /**
   * Get a vocabulary by name.
   */
  get(id: string): DirectionVocabulary | undefined {
    return this.vocabularies.get(id);
  }

  /**
   * Switch the active vocabulary by name.
   * Notifies all listeners (parser, grammar) to rebuild their mappings.
   */
  useVocabulary(id: string): void {
    const vocab = this.vocabularies.get(id);
    if (!vocab) {
      throw new Error(`Unknown direction vocabulary: '${id}'. Available: ${[...this.vocabularies.keys()].join(', ')}`);
    }
    this.active = vocab;
    this.notifyListeners();
  }

  /**
   * Rename a single direction in the active vocabulary.
   * Creates a modified copy so the original named vocabulary is not mutated.
   */
  rename(direction: DirectionType, entry: DirectionEntry): void {
    // If active is a named vocabulary, clone it as 'custom'
    if (this.active.id !== 'custom') {
      this.active = {
        id: 'custom',
        entries: { ...this.active.entries }
      };
    }
    this.active.entries[direction] = entry;
    this.notifyListeners();
  }

  /**
   * Add alias words to a direction without replacing the existing ones.
   */
  alias(direction: DirectionType, entry: DirectionEntry): void {
    if (this.active.id !== 'custom') {
      this.active = {
        id: 'custom',
        entries: { ...this.active.entries }
      };
    }
    const existing = this.active.entries[direction];
    if (existing) {
      // Merge words, use new display name
      const mergedWords = [...new Set([...existing.words, ...entry.words])];
      this.active.entries[direction] = { display: entry.display, words: mergedWords };
    } else {
      this.active.entries[direction] = entry;
    }
    this.notifyListeners();
  }

  /**
   * Get the currently active vocabulary.
   */
  getActive(): DirectionVocabulary {
    return this.active;
  }

  /**
   * Get the display name for a direction in the active vocabulary.
   * Falls back to lowercase direction constant if not in vocabulary.
   */
  getDisplayName(direction: DirectionType): string {
    const entry = this.active.entries[direction];
    return entry?.display ?? direction.toLowerCase();
  }

  /**
   * Register a listener that is called when the active vocabulary changes.
   * Used by the parser to rebuild direction mappings.
   */
  onVocabularyChange(listener: (vocab: DirectionVocabulary) => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.active);
    }
  }
}

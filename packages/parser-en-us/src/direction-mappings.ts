/**
 * English-specific direction mappings for the parser
 *
 * Maps English words and abbreviations to language-agnostic Direction constants.
 * Mappings are mutable — they update when a direction vocabulary is activated
 * via the DirectionVocabularyRegistry (ADR-143).
 */

import { Direction, DirectionType, DirectionVocabulary, CompassVocabulary } from '@sharpee/world-model';

/**
 * Current word → Direction constant mappings.
 * Rebuilt when the active vocabulary changes.
 */
let activeWords: Record<string, DirectionType> = {};

/**
 * Current abbreviation → Direction constant mappings.
 * Rebuilt when the active vocabulary changes.
 */
let activeAbbreviations: Record<string, DirectionType> = {};

/**
 * Current Direction constant → display name mappings.
 * Rebuilt when the active vocabulary changes.
 */
let activeDisplayNames: Record<string, string> = {};

/**
 * Build parser maps from a direction vocabulary.
 */
function buildMaps(vocab: DirectionVocabulary): void {
  const words: Record<string, DirectionType> = {};
  const abbreviations: Record<string, DirectionType> = {};
  const displayNames: Record<string, string> = {};

  for (const [dirConstant, entry] of Object.entries(vocab.entries)) {
    if (!entry) continue;
    const dir = dirConstant as DirectionType;
    displayNames[dir] = entry.display;

    for (const word of entry.words) {
      const normalized = word.toLowerCase();
      if (normalized.length <= 2 && !normalized.includes(' ')) {
        // Short forms go in abbreviations (checked first for specificity)
        abbreviations[normalized] = dir;
      }
      // All forms also go in the words map
      words[normalized] = dir;
    }
  }

  activeWords = words;
  activeAbbreviations = abbreviations;
  activeDisplayNames = displayNames;
}

// Initialize with compass vocabulary
buildMaps(CompassVocabulary);

/**
 * Rebuild direction mappings from a new vocabulary.
 * Called by the vocabulary registry's change listener.
 */
export function setActiveVocabulary(vocab: DirectionVocabulary): void {
  buildMaps(vocab);
}

/**
 * Read-only access to current word mappings.
 * Used by grammar pattern generation.
 */
export function getDirectionWords(): Readonly<Record<string, DirectionType>> {
  return activeWords;
}

/**
 * Read-only access to current abbreviation mappings.
 */
export function getDirectionAbbreviations(): Readonly<Record<string, DirectionType>> {
  return activeAbbreviations;
}

/**
 * Build a grammar-compatible direction map from the active vocabulary.
 * Returns `{ canonical: aliases[] }` where canonical is the lowercase
 * direction constant name (e.g., 'north') and aliases are the words
 * the player can type.
 *
 * Used by grammar.ts to register direction patterns.
 */
export function getGrammarDirectionMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  // Iterate the active vocabulary's words map and group by direction constant
  const grouped = new Map<DirectionType, string[]>();

  for (const [word, dir] of Object.entries(activeWords)) {
    const existing = grouped.get(dir) || [];
    existing.push(word);
    grouped.set(dir, existing);
  }

  for (const [dir, words] of grouped) {
    // Canonical key is lowercase direction constant name (e.g., 'north')
    // This is what the grammar engine stores in defaultSemantics.direction
    // and what parseDirection receives after grammar matching.
    map[dir.toLowerCase()] = words;
  }

  return map;
}

// Legacy exports for backward compatibility — existing code imports these names.
// They now delegate to the active maps.

/**
 * @deprecated Use getDirectionWords() for the current active mappings.
 */
export const DirectionWords: Record<string, DirectionType> = new Proxy({} as Record<string, DirectionType>, {
  get(_target, prop: string) {
    return activeWords[prop];
  },
  has(_target, prop: string) {
    return prop in activeWords;
  },
  ownKeys() {
    return Object.keys(activeWords);
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    if (prop in activeWords) {
      return { configurable: true, enumerable: true, value: activeWords[prop] };
    }
    return undefined;
  }
});

/**
 * @deprecated Use getDirectionAbbreviations() for the current active mappings.
 */
export const DirectionAbbreviations: Record<string, DirectionType> = new Proxy({} as Record<string, DirectionType>, {
  get(_target, prop: string) {
    return activeAbbreviations[prop];
  },
  has(_target, prop: string) {
    return prop in activeAbbreviations;
  },
  ownKeys() {
    return Object.keys(activeAbbreviations);
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    if (prop in activeAbbreviations) {
      return { configurable: true, enumerable: true, value: activeAbbreviations[prop] };
    }
    return undefined;
  }
});

/**
 * Parse a direction string to a Direction constant.
 * Checks abbreviations first (more specific), then full words.
 * Returns null if the string is not recognized in the active vocabulary.
 */
export function parseDirection(input: string): DirectionType | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  // Check abbreviations first (more specific)
  if (activeAbbreviations[normalized]) {
    return activeAbbreviations[normalized];
  }

  // Then check full words
  if (activeWords[normalized]) {
    return activeWords[normalized];
  }

  return null;
}

/**
 * Get the display name for a Direction constant in the active vocabulary.
 * Used for output — "You go fore." instead of "You go north."
 */
export function getDirectionWord(direction: DirectionType): string {
  const display = activeDisplayNames[direction];
  if (display) return display;

  // Fallback to lowercase version of constant
  return direction.toLowerCase();
}

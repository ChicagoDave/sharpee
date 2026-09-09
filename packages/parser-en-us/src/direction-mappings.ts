/**
 * English-specific direction mappings for the parser
 *
 * Maps English words and abbreviations to language-agnostic Direction constants.
 * These are static compass-direction mappings owned by the parser locale.
 */

import { Direction, type DirectionType } from '@sharpee/world-model';

/**
 * Full English words → Direction constant mappings.
 */
const DirectionWords: Record<string, DirectionType> = {
  'north': Direction.NORTH,
  'south': Direction.SOUTH,
  'east': Direction.EAST,
  'west': Direction.WEST,
  'northeast': Direction.NORTHEAST,
  'northwest': Direction.NORTHWEST,
  'southeast': Direction.SOUTHEAST,
  'southwest': Direction.SOUTHWEST,
  'up': Direction.UP,
  'down': Direction.DOWN,
  'in': Direction.IN,
  'inside': Direction.IN,
  'out': Direction.OUT,
  'outside': Direction.OUT,
};

/**
 * Abbreviations → Direction constant mappings.
 */
const DirectionAbbreviations: Record<string, DirectionType> = {
  'n': Direction.NORTH,
  's': Direction.SOUTH,
  'e': Direction.EAST,
  'w': Direction.WEST,
  'ne': Direction.NORTHEAST,
  'nw': Direction.NORTHWEST,
  'se': Direction.SOUTHEAST,
  'sw': Direction.SOUTHWEST,
  'u': Direction.UP,
  'd': Direction.DOWN,
};

/**
 * Parse a direction string to a Direction constant.
 * Checks abbreviations first (more specific), then full words.
 * Returns null if the string is not recognized.
 */
export function parseDirection(input: string): DirectionType | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  // Check abbreviations first (more specific)
  if (DirectionAbbreviations[normalized]) {
    return DirectionAbbreviations[normalized];
  }

  // Then check full words
  if (DirectionWords[normalized]) {
    return DirectionWords[normalized];
  }

  return null;
}

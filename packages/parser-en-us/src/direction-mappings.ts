/**
 * English-specific direction mappings for the parser
 * Maps English words and abbreviations to language-agnostic Direction constants
 */

import { Direction } from '@sharpee/world-model';

/**
 * Map English direction words to Direction constants
 */
export const DirectionWords: Record<string, Direction> = {
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
  'outside': Direction.OUT
};

/**
 * Map English abbreviations to Direction constants
 */
export const DirectionAbbreviations: Record<string, Direction> = {
  'n': Direction.NORTH,
  's': Direction.SOUTH,
  'e': Direction.EAST,
  'w': Direction.WEST,
  'ne': Direction.NORTHEAST,
  'nw': Direction.NORTHWEST,
  'se': Direction.SOUTHEAST,
  'sw': Direction.SOUTHWEST,
  'u': Direction.UP,
  'd': Direction.DOWN
};

/**
 * Parse an English direction string to a Direction constant
 * Returns null if the string is not a recognized direction
 */
export function parseDirection(input: string): Direction | null {
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

/**
 * Get the English word for a Direction constant
 * Used for display/output
 */
export function getDirectionWord(direction: Direction): string {
  // Find the first matching English word for this direction
  for (const [word, dir] of Object.entries(DirectionWords)) {
    if (dir === direction) {
      // Prefer the primary forms (not 'inside'/'outside')
      if (direction === Direction.IN && word === 'inside') continue;
      if (direction === Direction.OUT && word === 'outside') continue;
      return word;
    }
  }
  
  // Fallback to lowercase version of constant
  return direction.toLowerCase();
}
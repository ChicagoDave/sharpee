/**
 * Standard directions in Interactive Fiction
 */
export type Direction = 'north' | 'south' | 'east' | 'west' | 
                       'northeast' | 'northwest' | 'southeast' | 'southwest' |
                       'up' | 'down' | 'in' | 'out';

/**
 * Map of opposite directions
 */
const opposites: Record<string, string> = {
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
  in: 'out',
  out: 'in',
  // Common abbreviations
  n: 's',
  s: 'n',
  e: 'w',
  w: 'e',
  ne: 'sw',
  nw: 'se',
  se: 'nw',
  sw: 'ne',
  u: 'd',
  d: 'u'
};

/**
 * Get the opposite direction
 */
export function getOppositeDirection(direction: string): string | undefined {
  return opposites[direction.toLowerCase()];
}

/**
 * Check if a string is a valid direction
 */
export function isDirection(str: string): str is Direction {
  const normalized = str.toLowerCase();
  return normalized in opposites;
}

/**
 * Normalize direction abbreviations
 */
export function normalizeDirection(direction: string): string {
  const abbrevMap: Record<string, string> = {
    n: 'north',
    s: 'south',
    e: 'east',
    w: 'west',
    ne: 'northeast',
    nw: 'northwest',
    se: 'southeast',
    sw: 'southwest',
    u: 'up',
    d: 'down'
  };
  
  const lower = direction.toLowerCase();
  return abbrevMap[lower] || lower;
}

/**
 * GDT Command Parser
 *
 * Parses two-letter GDT commands from user input.
 * Mimics the original 1981 Zork GDT interface.
 */

import { GDTCommand, GDTCommandCode } from './types';

/**
 * All valid GDT command codes
 */
const VALID_CODES = new Set<string>([
  // Display commands
  'DA', 'DR', 'DO', 'DC', 'DX', 'DH', 'DL', 'DV', 'DF', 'DS', 'DN', 'DM', 'DT', 'DP', 'D2', 'DZ',
  // Alter commands
  'AH', 'AO', 'AR', 'AF', 'AC', 'AA', 'AX', 'AV', 'AN', 'AZ',
  // Toggle commands
  'NC', 'ND', 'NR', 'NT', 'RC', 'RD', 'RR', 'RT',
  // Utility commands
  'TK', 'PD', 'HE', 'EX',
  // Puzzle debug
  'PZ',
  // Trivia debug
  'TQ',
  // Kill entity
  'KL'
]);

/**
 * Parse a GDT command from input string
 *
 * @param input - Raw user input
 * @returns Parsed command or null if invalid
 *
 * @example
 * parseGDTCommand('DA')       // { code: 'DA', args: [], raw: 'DA' }
 * parseGDTCommand('AH living-room')  // { code: 'AH', args: ['living-room'], raw: 'AH living-room' }
 * parseGDTCommand('hello')    // null (not a valid GDT command)
 */
export function parseGDTCommand(input: string): GDTCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match two-letter code at start, optionally followed by arguments
  const match = trimmed.match(/^([A-Za-z]{2})(?:\s+(.*))?$/);
  if (!match) return null;

  const code = match[1].toUpperCase();
  if (!VALID_CODES.has(code)) return null;

  const argsStr = match[2] || '';
  const args = argsStr.split(/\s+/).filter(Boolean);

  return {
    code: code as GDTCommandCode,
    args,
    raw: trimmed
  };
}

/**
 * Check if input looks like a GDT command
 *
 * @param input - Raw user input
 * @returns True if this appears to be a GDT command
 */
export function isGDTCommand(input: string): boolean {
  return parseGDTCommand(input) !== null;
}

/**
 * Get all valid GDT command codes
 */
export function getValidCodes(): GDTCommandCode[] {
  return Array.from(VALID_CODES) as GDTCommandCode[];
}

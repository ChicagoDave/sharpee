/**
 * List Formatters
 *
 * Formatters for joining arrays of items into prose.
 *
 * @see ADR-095 Message Templates with Formatters
 */

import type { Formatter, EntityInfo } from './types.js';

/**
 * Extract name from value (string or EntityInfo)
 */
function getName(value: string | EntityInfo): string {
  return typeof value === 'string' ? value : value.name;
}

/**
 * Ensure value is an array
 */
function ensureArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => getName(v));
  }
  return [getName(value as string | EntityInfo)];
}

/**
 * "list" formatter - join with commas and "and"
 *
 * Single: "a sword"
 * Two: "a sword and a key"
 * Three+: "a sword, a key, and a coin"
 */
export const listFormatter: Formatter = (value, _context) => {
  const items = ensureArray(value);

  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  const allButLast = items.slice(0, -1);
  const last = items[items.length - 1];
  return `${allButLast.join(', ')}, and ${last}`;
};

/**
 * "or-list" formatter - join with commas and "or"
 *
 * Single: "north"
 * Two: "north or south"
 * Three+: "north, south, or east"
 */
export const orListFormatter: Formatter = (value, _context) => {
  const items = ensureArray(value);

  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} or ${items[1]}`;

  const allButLast = items.slice(0, -1);
  const last = items[items.length - 1];
  return `${allButLast.join(', ')}, or ${last}`;
};

/**
 * "comma-list" formatter - join with commas only (no conjunction)
 *
 * "a sword, a key, a coin"
 */
export const commaListFormatter: Formatter = (value, _context) => {
  const items = ensureArray(value);
  return items.join(', ');
};

/**
 * "count" formatter - number + noun (with pluralization)
 *
 * Example: {items:count} with 3 swords → "3 swords"
 * Example: {items:count} with 1 sword → "1 sword"
 */
export const countFormatter: Formatter = (value, _context) => {
  const items = ensureArray(value);
  const count = items.length;

  if (count === 0) return 'nothing';
  if (count === 1) return `1 ${items[0]}`;

  // For count > 1, assume the items are already formatted
  // The item name should be pluralized by caller or be inherently plural
  return `${count} items`;
};

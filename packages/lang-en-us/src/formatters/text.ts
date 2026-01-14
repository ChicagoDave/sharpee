/**
 * Text Formatters
 *
 * Formatters for case transformation and text manipulation.
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
 * "cap" formatter - capitalize first letter
 *
 * "sword" → "Sword"
 */
export const capFormatter: Formatter = (value, _context) => {
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((v) => capFormatter(v, _context)).join(', ');
  }

  const text = getName(value);
  if (!text) return '';

  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * "upper" formatter - all uppercase
 *
 * "sword" → "SWORD"
 */
export const upperFormatter: Formatter = (value, _context) => {
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((v) => upperFormatter(v, _context)).join(', ');
  }

  const text = getName(value);
  return text.toUpperCase();
};

/**
 * "lower" formatter - all lowercase
 *
 * "SWORD" → "sword"
 */
export const lowerFormatter: Formatter = (value, _context) => {
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((v) => lowerFormatter(v, _context)).join(', ');
  }

  const text = getName(value);
  return text.toLowerCase();
};

/**
 * "title" formatter - title case (capitalize each word)
 *
 * "brass lantern" → "Brass Lantern"
 */
export const titleFormatter: Formatter = (value, _context) => {
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((v) => titleFormatter(v, _context)).join(', ');
  }

  const text = getName(value);
  if (!text) return '';

  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

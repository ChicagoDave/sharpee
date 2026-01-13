/**
 * Article Formatters
 *
 * Formatters for adding articles to nouns based on noun type.
 *
 * @see ADR-095 Message Templates with Formatters
 */

import type { Formatter, EntityInfo, FormatterContext } from './types.js';

/**
 * Get indefinite article for a word (a/an)
 */
function getIndefiniteArticle(word: string): string {
  if (!word || word.length === 0) return 'a';

  const lower = word.toLowerCase();

  // Special cases
  if (lower.startsWith('hour')) return 'an';
  if (lower.startsWith('honest')) return 'an';
  if (lower.startsWith('heir')) return 'an';
  if (lower.startsWith('uni')) return 'a';  // university
  if (lower.startsWith('one')) return 'a';   // one-way

  const firstChar = lower[0];
  const vowels = ['a', 'e', 'i', 'o', 'u'];

  return vowels.includes(firstChar) ? 'an' : 'a';
}

/**
 * Extract name from value (string or EntityInfo)
 */
function getName(value: string | EntityInfo): string {
  return typeof value === 'string' ? value : value.name;
}

/**
 * Get entity info from value
 */
function getEntityInfo(value: string | EntityInfo): EntityInfo {
  if (typeof value === 'string') {
    return { name: value };
  }
  return value;
}

/**
 * "a" formatter - indefinite article
 *
 * Respects nounType:
 * - common: "a sword" / "an apple"
 * - proper: "John" (no article)
 * - mass: "some water"
 * - unique: "the sun"
 * - plural: "swords" (no article for indefinite plural)
 */
export const aFormatter: Formatter = (value, _context) => {
  // Handle arrays - format each item
  if (Array.isArray(value)) {
    return value.map((v) => aFormatter(v, _context)).join(', ');
  }

  const info = getEntityInfo(value);
  const name = info.name;

  // Check noun type
  const nounType = info.nounType ?? (info.properName ? 'proper' : 'common');

  switch (nounType) {
    case 'proper':
      return name; // No article for proper names
    case 'mass':
      return `some ${name}`;
    case 'unique':
      return `the ${name}`;
    case 'plural':
      return name; // No article for indefinite plurals
    case 'common':
    default:
      // Check if entity has custom article
      if (info.article && info.article !== 'a' && info.article !== 'an') {
        return `${info.article} ${name}`;
      }
      return `${getIndefiniteArticle(name)} ${name}`;
  }
};

/**
 * "the" formatter - definite article
 *
 * Respects nounType:
 * - proper: "John" (no article)
 * - all others: "the X"
 */
export const theFormatter: Formatter = (value, _context) => {
  // Handle arrays - format each item
  if (Array.isArray(value)) {
    return value.map((v) => theFormatter(v, _context)).join(', ');
  }

  const info = getEntityInfo(value);
  const name = info.name;

  // Check noun type
  const nounType = info.nounType ?? (info.properName ? 'proper' : 'common');

  if (nounType === 'proper') {
    return name; // No article for proper names
  }

  return `the ${name}`;
};

/**
 * "some" formatter - partitive article
 *
 * Primarily for mass nouns: "some water"
 * Also works for plurals: "some coins"
 */
export const someFormatter: Formatter = (value, _context) => {
  // Handle arrays - format each item
  if (Array.isArray(value)) {
    return value.map((v) => someFormatter(v, _context)).join(', ');
  }

  const info = getEntityInfo(value);
  const name = info.name;

  // Check noun type
  const nounType = info.nounType ?? (info.properName ? 'proper' : 'common');

  if (nounType === 'proper') {
    return name; // No article for proper names
  }

  return `some ${name}`;
};

/**
 * "your" formatter - possessive
 *
 * Creates "your X" phrases
 */
export const yourFormatter: Formatter = (value, _context) => {
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((v) => yourFormatter(v, _context)).join(', ');
  }

  const name = getName(value);
  return `your ${name}`;
};

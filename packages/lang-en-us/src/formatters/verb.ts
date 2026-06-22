/**
 * Verb-Agreement Formatters
 *
 * Formatters that emit a verb form agreeing in number with the entity they
 * are keyed to, so templates need not hardcode a singular verb. The verb is
 * chosen from the entity's grammatical number, mirroring how the article
 * formatters choose articles from `nounType`.
 *
 * Syntax keys the formatter to a placeholder, e.g. `{is:item}` resolves the
 * `item` value and emits the agreeing copula:
 *
 *   "{the:cap:item} {is:item} fixed in place."
 *     → "The white house is fixed in place."   (singular)
 *     → "The pygmy goats are fixed in place."  (plural)
 *
 * An entity is treated as plural when its `nounType` is `'plural'` or its
 * `grammaticalNumber` is `'plural'`. A bare string (no EntityInfo metadata)
 * or a missing value falls back to the singular form.
 *
 * @see ADR-095 Message Templates with Formatters
 * @see ADR-089 Grammatical Number
 */

import type { Formatter, EntityInfo } from './types.js';

/**
 * Decide whether a formatter value should take a plural verb.
 *
 * @param value - The placeholder value (EntityInfo, string, or array thereof).
 * @returns true when the value is grammatically plural.
 */
function isPlural(value: string | string[] | EntityInfo | EntityInfo[]): boolean {
  // An array of values reads as plural unless it holds exactly one item.
  if (Array.isArray(value)) {
    return value.length !== 1;
  }
  if (typeof value === 'string') {
    return false; // No metadata on a bare string — default to singular.
  }
  return value.nounType === 'plural' || value.grammaticalNumber === 'plural';
}

/**
 * Build a copula/auxiliary formatter that emits `singular` or `plural`
 * depending on the value's grammatical number.
 *
 * @param singular - Verb form for singular subjects (e.g. "is").
 * @param plural - Verb form for plural subjects (e.g. "are").
 * @returns A Formatter that returns the agreeing form.
 */
function makeAgreementFormatter(singular: string, plural: string): Formatter {
  return (value, _context) => (isPlural(value) ? plural : singular);
}

/** "is" formatter — emits "is" (singular) or "are" (plural). */
export const isFormatter: Formatter = makeAgreementFormatter('is', 'are');

/** "was" formatter — emits "was" (singular) or "were" (plural). */
export const wasFormatter: Formatter = makeAgreementFormatter('was', 'were');

/** "has" formatter — emits "has" (singular) or "have" (plural). */
export const hasFormatter: Formatter = makeAgreementFormatter('has', 'have');

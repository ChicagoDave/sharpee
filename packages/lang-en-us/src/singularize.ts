/**
 * English noun singulars, and the two numbers of a noun (ADR-407 D5, Amendment 4).
 *
 * Purpose: the singular side of English number, beside `pluralize.ts`, which is
 * the plural side. Both read the irregulars from `data/words.ts`, so `geese` and
 * `goose` are paired in one place.
 *
 * **Outside the story runtime, for now.** Only the `nouns` subpath imports this
 * file, so a published story does not carry it (ADR-407 AC-3). It is a sibling
 * of `pluralize.ts` and not part of the nouns subpath, so that if the noun
 * matcher is taught both numbers (issue 836), the runtime imports this same
 * file, and a lens and the parser read number from one function.
 *
 * Not `EnglishLanguageProvider.lemmatize`: that is a stemmer (`candles` gives
 * `candl`, `shed` gives `sh`), and no runtime code calls it.
 *
 * Public interface: `singularize(noun)`, `numberForms(noun)`.
 *
 * Owner context: @sharpee/lang-en-us — English number.
 */

import type { NounNumberForms } from '@sharpee/if-domain';
import { irregularPlurals } from './data/words.js';
import { pluralize } from './pluralize.js';

/**
 * Nouns whose singular and plural are the same word, including the ones with no
 * singular at all (`bellows`, `tongs`): no other form to try.
 */
const SAME_IN_BOTH_NUMBERS: ReadonlySet<string> = new Set([
  'sheep', 'deer', 'fish', 'moose', 'swine', 'aircraft', 'series', 'species',
  'bellows', 'tongs', 'scissors', 'shears', 'pliers', 'trousers',
]);

/** Singulars that end in a lone `s` and so read like plurals to the rules below. */
const SINGULARS_ENDING_IN_S: ReadonlySet<string> = new Set([
  'lens', 'gas', 'canvas', 'atlas', 'bias', 'chaos', 'cosmos', 'news', 'trellis',
]);

/** The singulars the irregular table pairs, so a singular is never singularized again. */
const IRREGULAR_SINGULARS: ReadonlySet<string> = new Set(irregularPlurals.values());

/**
 * The singular of an English noun.
 *
 * In order: a noun the same in both numbers, an irregular plural (`geese`), an
 * irregular singular (`goose`), a lone-`s` singular (`lens`) and its plural
 * (`lenses`); then the rules: `-ies` to `-y`; `-sses`, `-xes`, `-ches`, `-shes`
 * lose `-es`; `-ss`, `-us`, `-is` are already singular; any other final `s`
 * goes (`candles`, `houses`, `shoes`). A word with no final `s` is singular.
 *
 * @param noun one word, any casing
 * @returns its singular, lowercased; the word itself, lowercased, when it is already singular
 */
export function singularize(noun: string): string {
  const lower = noun.toLowerCase();
  if (lower.length === 0) return lower;
  if (SAME_IN_BOTH_NUMBERS.has(lower) || SINGULARS_ENDING_IN_S.has(lower)) return lower;
  const irregular = irregularPlurals.get(lower);
  if (irregular !== undefined) return irregular;
  if (IRREGULAR_SINGULARS.has(lower)) return lower;
  if (lower.endsWith('es') && SINGULARS_ENDING_IN_S.has(lower.slice(0, -2))) return lower.slice(0, -2);
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (/(?:ss|x|ch|sh)es$/.test(lower)) return lower.slice(0, -2);
  if (/(?:ss|us|is)$/.test(lower)) return lower;
  if (lower.endsWith('s') && lower.length > 2) return lower.slice(0, -1);
  return lower;
}

/**
 * One English noun's singular and plural (ADR-407 D5, Amendment 4).
 *
 * A noun that `singularize` changes is plural, and is its own plural; any other
 * noun is singular, and `pluralize` gives its plural. A noun the same in both
 * numbers returns itself twice.
 *
 * @param noun one word, any casing (`candles`, `Pricket`)
 * @returns both forms, lowercased
 */
export function numberForms(noun: string): NounNumberForms {
  const lower = noun.toLowerCase();
  const singular = singularize(lower);
  if (singular !== lower) return { singular, plural: lower };
  if (SAME_IN_BOTH_NUMBERS.has(lower)) return { singular: lower, plural: lower };
  return { singular: lower, plural: pluralize(lower).toLowerCase() };
}

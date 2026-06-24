/**
 * List Formatters
 *
 * Formatters for joining arrays of items into prose.
 *
 * @see ADR-095 Message Templates with Formatters
 */

import type { Formatter, EntityInfo, FormatterContext } from './types.js';
import { aFormatter, theFormatter } from './article.js';
import { pluralize } from '../pluralize.js';
import { countWord } from '../number-words.js';

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

/** True for a bare string element (no entity metadata to article/group). */
function isBare(v: unknown): v is string {
  return typeof v === 'string';
}

/** A common noun groups by name; proper/mass/unique/plural do not. */
function isCommonNoun(ei: EntityInfo): boolean {
  const nounType = ei.nounType ?? (ei.properName ? 'proper' : 'common');
  return nounType === 'common';
}

/**
 * Render each element into a phrase. In indefinite mode, identical common-noun
 * entities group and pluralize ("two goats"); bare strings render as-is (no
 * article), preserving plain name lists. In definite mode, every entity becomes
 * "the X" with no grouping.
 */
function renderListParts(
  value: unknown,
  mode: 'indefinite' | 'definite',
  context: FormatterContext,
): string[] {
  const arr = Array.isArray(value) ? value : value == null ? [] : [value];

  if (mode === 'definite') {
    return arr.map((v) => (isBare(v) ? v : (theFormatter(v as EntityInfo, context) as string)));
  }

  type Part = { value: unknown; ei?: EntityInfo; count: number };
  const parts: Part[] = [];
  const groupIndex = new Map<string, number>();
  for (const v of arr) {
    if (!isBare(v) && isCommonNoun(v as EntityInfo)) {
      const ei = v as EntityInfo;
      const existing = groupIndex.get(ei.name);
      if (existing !== undefined) {
        parts[existing].count++;
        continue;
      }
      groupIndex.set(ei.name, parts.length);
      parts.push({ value: v, ei, count: 1 });
    } else {
      parts.push({ value: v, count: 1 });
    }
  }

  return parts.map((p) => {
    if (p.count > 1 && p.ei) {
      const plural = p.ei.plural ?? pluralize(p.ei.name);
      return `${countWord(p.count)} ${plural}`;
    }
    return isBare(p.value) ? (p.value as string) : (aFormatter(p.value as EntityInfo, context) as string);
  });
}

/** Join rendered parts with commas and a conjunction; serial comma per setting. */
function joinList(parts: string[], conjunction: string, context: FormatterContext): string {
  if (parts.length === 0) return 'nothing';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${conjunction} ${parts[1]}`;
  const serial = context?.settings?.serialComma ?? true;
  const head = parts.slice(0, -1).join(', ');
  const last = parts[parts.length - 1];
  return serial ? `${head}, ${conjunction} ${last}` : `${head} ${conjunction} ${last}`;
}

/**
 * "list" formatter — natural-language list of entities (ADR-190).
 *
 * Each `EntityInfo` element gets its indefinite article ("a goat", "an apple",
 * "some sand"); identical common nouns group and pluralize ("two goats"); the
 * parts join with commas and "and", with the serial (Oxford) comma controlled by
 * the story's `serialComma` setting (default on). Bare strings render as-is.
 * Empty → "nothing".
 *
 *   {list:items} → "a goat, two rabbits, and a parrot"
 */
export const listFormatter: Formatter = (value, context) =>
  joinList(renderListParts(value, 'indefinite', context), 'and', context);

/**
 * "the-list" formatter — definite variant: "the goat, the rabbit, and the parrot".
 * No count-grouping (definite items are individuated); proper names take no article.
 */
export const theListFormatter: Formatter = (value, context) =>
  joinList(renderListParts(value, 'definite', context), 'and', context);

/**
 * "names" formatter — plain name join (the pre-ADR-190 `list` behavior) for
 * non-entity string lists: no articles, no grouping. Empty → "".
 */
export const namesFormatter: Formatter = (value, context) => {
  const items = ensureArray(value);
  if (items.length === 0) return '';
  return joinList(items, 'and', context);
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

/** First element's noun name and optional plural override (EntityInfo or string). */
function firstNoun(value: unknown): { name: string; plural?: string } {
  const arr = Array.isArray(value) ? value : value == null ? [] : [value];
  const first = arr[0];
  if (first && typeof first === 'object' && 'name' in first) {
    const ei = first as EntityInfo;
    return { name: ei.name, plural: ei.plural };
  }
  return { name: first == null ? '' : String(first) };
}

/**
 * "count" formatter - a count word plus the (pluralized) noun.
 *
 * Spells out 1–10, numeric for 11+ (ADR-190). Uses the entity's `plural` override
 * (from `IdentityTrait.plural`) when present, else the `pluralize()` heuristic.
 *
 * Example: {count:items} with 3 swords → "three swords"
 * Example: {count:items} with 1 sword → "one sword"
 * Example: {count:items} with 0       → "nothing"
 */
export const countFormatter: Formatter = (value, _context) => {
  const count = Array.isArray(value) ? value.length : value == null ? 0 : 1;
  if (count === 0) return 'nothing';

  const { name, plural } = firstNoun(value);
  if (count === 1) return `one ${name}`;

  const pluralNoun = plural ?? pluralize(name);
  return `${countWord(count)} ${pluralNoun}`;
};

// packages/lang-en-us/src/pluralize.ts
//
// English noun pluralization, extracted as a free function so the formatters
// (list, count) can use it without depending on LanguageProvider. The provider's
// `pluralize` method delegates here. Irregulars come from ./data/words.

import { irregularPlurals } from './data/words';

/**
 * Pluralize an English noun. Checks the irregular map first (preserving the
 * original case pattern), then applies regular rules (-es / -ies / -ves / -s).
 *
 * @param noun singular noun, e.g. "coin", "goose"
 * @returns the plural form, e.g. "coins", "geese"
 */
export function pluralize(noun: string): string {
  if (!noun) return 's';

  const lower = noun.toLowerCase();

  // Irregulars: the map is plural -> singular, so reverse-lookup by singular.
  for (const [plural, singular] of irregularPlurals) {
    if (singular === lower) {
      if (noun === noun.toUpperCase()) return plural.toUpperCase();
      if (noun[0] === noun[0].toUpperCase()) return plural[0].toUpperCase() + plural.slice(1);
      return plural;
    }
  }

  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') ||
      lower.endsWith('ch') || lower.endsWith('sh')) {
    return noun + 'es';
  }

  if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower[lower.length - 2])) {
    if (noun === noun.toUpperCase()) return noun.slice(0, -1) + 'IES';
    return noun.slice(0, -1) + 'ies';
  }

  if (lower.endsWith('fe')) return noun.slice(0, -2) + 'ves';
  if (lower.endsWith('f')) return noun.slice(0, -1) + 'ves';

  return noun + 's';
}

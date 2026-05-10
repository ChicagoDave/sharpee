/**
 * Class-name resolver — bare bracket name → final CSS class name.
 *
 * Public interface: `resolveClassName`. Used by the parser to settle
 * the platform-vs-author distinction at parse time so the wire shape
 * carries renderer-ready strings.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Platform vs author classes
 * @see ADR-174 §Internal interfaces
 */

import { PLATFORM_VOCABULARY } from './platform-vocabulary';

/**
 * Resolve a bracketed name to its final CSS class name.
 *
 * Platform names (those listed in `PLATFORM_VOCABULARY`) receive the
 * `sharpee-` prefix. Author names — anything else — pass through
 * verbatim. Empty input returns the empty string; the caller is
 * responsible for the AC-12 no-op-wrapper behavior, since the
 * resolver is a pure mapping.
 *
 * @param rawName Bare name as written between `[` and `:` in the
 *                template, e.g., `em`, `thief-taunt`.
 * @returns Final class name to place on the wire as
 *          `IDecoration.className`.
 */
export function resolveClassName(rawName: string): string {
  if (rawName === '') return '';
  if (PLATFORM_VOCABULARY.has(rawName)) {
    return `sharpee-${rawName}`;
  }
  return rawName;
}

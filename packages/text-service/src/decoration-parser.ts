/**
 * Decoration Parser — no-op passthrough.
 *
 * Per ADR-174, decoration parsing now lives in
 * `@sharpee/engine/src/prose-pipeline/decorations/parser.ts`. The
 * `text-service` package is in the process of being removed
 * (Phase 2 retires its remaining wire-production exports;
 * Phase 3 deletes the package). The block-production path inside
 * `text-service` no longer parses decorations — templates pass
 * through as a single plain-text `TextContent` entry.
 *
 * This shim exists so callers within `text-service.ts` and the
 * handler files keep compiling until Phase 1 sub-phase 1.4 ports
 * the handlers to engine. After Phase 1, no first-party caller
 * imports this function.
 *
 * Public interface: `parseDecorations(text)` returns `[text]` (or
 * `[]` for empty input). `hasDecorations(text)` returns `false`.
 *
 * Owner context: `@sharpee/text-service` — deprecated package.
 *
 * @see ADR-174 §Migration phasing
 */

import type { TextContent } from '@sharpee/text-blocks';

/**
 * No-op passthrough — wraps the input string as a single TextContent
 * entry. Bracket markup is no longer parsed here.
 */
export function parseDecorations(text: string): TextContent[] {
  if (!text) return [];
  return [text];
}

/**
 * Always `false` post-ADR-174. Kept to preserve the export surface
 * during Phase 1; will be removed alongside the package in Phase 3.
 */
export function hasDecorations(_text: string): boolean {
  return false;
}

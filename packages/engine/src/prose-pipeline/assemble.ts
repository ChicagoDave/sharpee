/**
 * Block assembly stage — wraps a resolved template string into an
 * `ITextBlock`, parsing decorations along the way.
 *
 * Public interface: `createBlock`, `extractValue`. Used internally
 * by handler families and the pipeline orchestration.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline. Lives
 * at `prose-pipeline/assemble.ts` (not under `stages/`) per ADR-174
 * §Engine-internal prose pipeline layout.
 *
 * @see ADR-174 §Markup syntax (decoration parsing)
 * @see ADR-133 (preserved): blocks have keys and structured content.
 */

import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { parseDecorations } from './decorations/parser';

/**
 * Create an `ITextBlock` from a key and a resolved template string.
 *
 * The template is fed through the bracket-decoration parser; templates
 * with no markers produce a single-string `content` array, matching
 * the existing no-op-decoration shape.
 */
export function createBlock(key: string, text: string): ITextBlock {
  const content: TextContent[] = parseDecorations(text);
  return { key, content: content.length === 0 ? [''] : content };
}

/**
 * Extract a string value from a direct primitive or a function wrapper.
 *
 * Returns null for falsy values, function returns, or thrown errors.
 * Used by handlers that pull data out of event payloads with mixed
 * shapes (string, number, () => string, etc.).
 */
export function extractValue(value: unknown): string | null {
  if (typeof value === 'function') {
    try {
      const result = value();
      return result ? String(result) : null;
    } catch {
      return null;
    }
  }

  return value ? String(value) : null;
}

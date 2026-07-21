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
import { parseDecorations } from './decorations/parser.js';

/**
 * Options for `createBlock`.
 */
export interface CreateBlockOptions {
  /**
   * Mark the block as a visual continuation of its predecessor — the
   * renderer collapses the paragraph margin so the two lines stack
   * flush. Used by handlers that split former multi-line content into
   * multiple single-line blocks. See `ITextBlock.tight` for the
   * invariant that a tight block must not appear first in a packet.
   */
  tight?: boolean;

  /**
   * Optional semantic CSS class the browser renderer applies to the
   * rendered element in addition to `main-entry`. See
   * `ITextBlock.className`.
   */
  className?: string;
}

/**
 * Create an `ITextBlock` from a key and a resolved template string.
 *
 * The template is fed through the bracket-decoration parser; templates
 * with no markers produce a single-string `content` array, matching
 * the existing no-op-decoration shape.
 *
 * Pass `{ tight: true }` to mark this block as a continuation of the
 * preceding block (renderer collapses inter-block margin).
 *
 * Callers that may receive text containing `\n` should use
 * `createBlocks` instead, which lifts newlines to block boundaries.
 */
export function createBlock(
  key: string,
  text: string,
  opts?: CreateBlockOptions,
): ITextBlock {
  const content: TextContent[] = parseDecorations(text);
  const block: ITextBlock = {
    key,
    content: content.length === 0 ? [''] : content,
    ...(opts?.tight ? { tight: true } : {}),
    ...(opts?.className ? { className: opts.className } : {}),
  };
  return block;
}

/**
 * Create one or more `ITextBlock`s from a key and a (possibly
 * multi-line) resolved template string.
 *
 * Newlines in the text are *lifted* to block boundaries — no block's
 * `content` ever carries `\n` (the precondition for removing
 * `white-space: pre-line` from the prose pane). Splitting policy:
 *
 *  - `\n\n+` (one or more blank lines) → next block is a fresh
 *    paragraph (no `tight` flag); the renderer applies the prose
 *    pane's paragraph margin.
 *  - `\n` (single newline) → next block carries `tight: true`; the
 *    renderer collapses the inter-block margin so the lines stack
 *    flush, matching the legacy `pre-line` line-break behavior.
 *
 * Edge cases: leading/trailing whitespace is trimmed; empty
 * paragraphs (between `\n\n\n` etc.) are dropped; empty input
 * returns a single empty block.
 */
export function createBlocks(key: string, text: string): ITextBlock[] {
  const trimmed = text.trim();
  if (!trimmed) return [createBlock(key, '')];
  const paragraphs = trimmed.split(/\n\n+/).filter((p) => p.length > 0);
  const blocks: ITextBlock[] = [];
  for (const para of paragraphs) {
    const lines = para.split('\n');
    for (let i = 0; i < lines.length; i++) {
      blocks.push(
        createBlock(key, lines[i], i > 0 ? { tight: true } : undefined),
      );
    }
  }
  return blocks;
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

/**
 * @sharpee/channel-service/utils — `main` channel entry joining.
 *
 * Owner context: platform package. The ONE definition of how a `main`
 * channel packet's entries become a single plain-text string.
 *
 * Why this is shared rather than inlined by each consumer: two consumers
 * project the same packets to text — the headless bootstrap harness
 * (`@sharpee/bootstrap`, what `sharpee test` compares against) and the
 * browser client's IDE recording bridge (`@sharpee/platform-browser`,
 * ADR-277 D5 / ADR-282 D2). They MUST agree character-for-character, since
 * ADR-282's blessed verbatim assertions are captured through one and
 * replayed through the other. They previously each carried their own copy
 * of this rule and silently diverged on paragraph boundaries: the bridge
 * joined every entry with `'\n'` while the harness used `'\n\n'` for
 * non-tight entries, so a blessed two-paragraph response failed on its
 * first headless run (found 2026-07-28; see ADR-282's amendment).
 *
 * Public interface:
 *  - `joinMainEntries(entries)` — one packet's entries as plain text.
 *
 * @see ADR-282 — Play-to-test — D2 and its 2026-07-28 amendment
 * @see ADR-163 — Channel-Service Platform
 */

import type { TextContent } from '@sharpee/text-blocks';
import { flattenContent } from './flatten.js';

/**
 * Flatten one `main` channel packet's entries to plain text.
 *
 * Accepts both entry shapes seen on the wire: the `MainEntry` object
 * (`{ content, tight? }`) and the legacy bare `TextContent[]`. Anything
 * else is skipped, as is any entry whose flattened text is blank.
 *
 * Entries are separated by a blank line, except `tight` entries — which
 * continue the previous line with a single newline, matching how the
 * client collapses the inter-paragraph margin for them.
 *
 * @param entries — the packet's `main` payload.
 * @returns the joined text, or `''` when nothing renderable is present.
 */
export function joinMainEntries(entries: unknown): string {
  if (!Array.isArray(entries) || entries.length === 0) return '';

  let out = '';
  for (const raw of entries) {
    let content: ReadonlyArray<TextContent>;
    let tight = false;

    if (Array.isArray(raw)) {
      content = raw as ReadonlyArray<TextContent>;
    } else if (raw && typeof raw === 'object' && Array.isArray((raw as { content?: unknown }).content)) {
      const entry = raw as { content: ReadonlyArray<TextContent>; tight?: unknown };
      content = entry.content;
      tight = Boolean(entry.tight);
    } else {
      continue;
    }

    const text = flattenContent(content);
    if (!text.trim()) continue;
    if (out) out += tight ? '\n' : '\n\n';
    out += text;
  }
  return out;
}

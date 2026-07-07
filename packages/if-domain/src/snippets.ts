/**
 * @file Room-description snippet contracts (ADR-209).
 *
 * Purpose: declare the wire types for author-written snippet maps — text
 * spliced into room descriptions at explicit `{snippet:name}` markers — and
 * the shared marker-extraction helper both the engine (load-time validation)
 * and stdlib (render-time scan) consume.
 *
 * Public interface: `SnippetText`, `SnippetEntry`, `SnippetMap`,
 * `SNIPPET_MARKER_PATTERN`, `extractSnippetMarkers`.
 *
 * Owner context: `@sharpee/if-domain` — these types are shared by world-model
 * (RoomTrait storage), stdlib (scan/gate/resolve in the looking action), and
 * lang-en-us (realization), so per the co-located wire-type rule they live
 * here, beside the phrase contract. INVARIANT: no runtime-specific types and
 * no locale logic — snippet TEXT is opaque author prose; selection semantics
 * ride the existing `Choice` machinery (phrase.ts).
 */

/**
 * One snippet text: a raw author string, or a message id resolved through the
 * language provider (the multilingual path — consistent with NPC actions'
 * `{ text } | { messageId }` split, ADR-209 resolution Q6).
 */
export type SnippetText = { text: string } | { messageId: string };

/**
 * One marker's entry in a room's snippet map (ADR-209 Interface contracts):
 * - `string` — one text, spliced verbatim every render.
 * - `string[]` — short form: `cycling` over the texts (resolution Q3).
 * - `SnippetText & { mentions? }` — one text with an optional presence gate.
 * - long form — explicit selector over `texts`, optional presence gate.
 *
 * `mentions` is a serializable entity id doing two jobs (resolution Q7):
 * coverage-lint metadata, and a presence gate — the entry renders only while
 * that entity is transitively contained in the room (resolution Q9).
 */
export type SnippetEntry =
  | string                                    // one text, spliced every render
  | string[]                                  // short form: cycling over texts
  | (SnippetText & { mentions?: string })     // one text with optional gate
  | {
      selector?: 'cycling' | 'stopping' | 'sticky' | 'random' | 'firstTime';
      texts: Array<string | SnippetText>;
      mentions?: string;                      // entity id; gates the whole entry
    };

/**
 * A room's marker→snippet table, supplied by the author. Plain, serializable
 * data: it rides the room trait through save/load; selection counters live in
 * the text-state store (`Choice`), never here.
 */
export type SnippetMap = Record<string, SnippetEntry>;

/**
 * The `{snippet:name}` marker pattern. Marker names are identifier-like
 * (letters, digits, `_`, `-`); anything else inside the braces is not a
 * marker and passes through as literal prose (a room WITHOUT a snippet map is
 * never scanned at all — ADR-209 semantics 5, AC-7).
 */
export const SNIPPET_MARKER_PATTERN = /\{snippet:([A-Za-z0-9_-]+)\}/g;

/**
 * Extract the marker names appearing in a description text, in order of first
 * appearance, deduplicated (a duplicate marker resolves once per render —
 * ADR-209 resolution Q8).
 *
 * Shared, pure helper: the engine's load-time unbound-marker validation and
 * stdlib's render-time scan must agree on what a marker IS, so both import
 * this one implementation.
 *
 * @param text a room `description` or `initialDescription` text
 * @returns the distinct marker names, in first-appearance order
 */
export function extractSnippetMarkers(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const match of text.matchAll(SNIPPET_MARKER_PATTERN)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

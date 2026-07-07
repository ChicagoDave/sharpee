/**
 * Room-description snippet resolver (ADR-209) — the scan/gate/resolve pass.
 *
 * Splits a room description at `{snippet:name}` markers and builds the spliced
 * `Sequence` phrase: `Verbatim` prose segments interleaved with each marker's
 * resolved value (`Literal` for a fixed text, `Choice` for a variant list,
 * `Empty` for a gated-out / empty entry). Purely mechanical — every rendered
 * character is author-written.
 *
 * Public interface: `resolveSnippetDescription`, `SnippetWorldQueries`.
 *
 * Owner context: `@sharpee/stdlib` — stdlib owns the scan and the gate
 * (ADR-209 boundary resolution). The engine's room-description handler is the
 * call site (it holds the world and the language provider at render time);
 * the Assembler stays world-blind and realizes what it is handed. Choice
 * picks are NOT made here — variant selection stays under the Assembler's
 * single authority, keyed `(roomId, markerName)`.
 */

import type {
  Phrase,
  Sequence,
  SnippetEntry,
  SnippetMap,
  SnippetText,
} from '@sharpee/if-domain';
import { SNIPPET_MARKER_PATTERN } from '@sharpee/if-domain';

/**
 * The world surface the presence gate needs — a structural subset of
 * if-domain's `RenderWorld`, so the engine can pass its render world through
 * unchanged and tests can hand in a stub.
 */
export interface SnippetWorldQueries {
  /** Resolve an entity by id, or undefined if absent (destroyed). */
  getEntity(entityId: string): unknown | undefined;
  /** The room transitively containing an entity, if any. */
  getContainingRoom(entityId: string): { id: string } | undefined;
}

/** A snippet entry normalized to one shape for resolution. */
interface NormalizedEntry {
  texts: Array<string | SnippetText>;
  /** Set only for variant lists; a single fixed text has no selector. */
  selector?: 'cycling' | 'stopping' | 'sticky' | 'random' | 'firstTime';
  mentions?: string;
}

/** Normalize the four `SnippetEntry` forms (ADR-209 Interface contracts). */
function normalizeEntry(entry: SnippetEntry): NormalizedEntry {
  if (typeof entry === 'string') {
    return { texts: [entry] };
  }
  if (Array.isArray(entry)) {
    // Short list form: default selector is `cycling` (ADR-209 resolution Q3).
    return { texts: entry, selector: 'cycling' };
  }
  if ('texts' in entry) {
    return { texts: entry.texts, selector: entry.selector ?? 'cycling', mentions: entry.mentions };
  }
  // SnippetText & { mentions? } — one text with an optional gate.
  return { texts: [entry], mentions: entry.mentions };
}

/**
 * Resolve one text item to its author string. A `{ messageId }` item resolves
 * through the supplied language-provider seam; a missing message follows the
 * broken-build log posture (splices nothing, warns) rather than throwing.
 */
function resolveText(
  item: string | SnippetText,
  roomId: string,
  marker: string,
  resolveMessage?: (messageId: string) => string | undefined,
): string {
  if (typeof item === 'string') return item;
  if ('text' in item) return item.text;
  const resolved = resolveMessage?.(item.messageId);
  if (resolved === undefined) {
    // eslint-disable-next-line no-console
    console.warn(
      `[snippet] room "${roomId}": message '${item.messageId}' for marker '${marker}' not found`,
    );
    return '';
  }
  return resolved;
}

/**
 * Resolve the description text of a snippet-bearing room to its spliced
 * `Sequence` (ADR-209).
 *
 * Semantics, per the ADR:
 * - A marker resolves once per render: duplicate occurrences receive the SAME
 *   resolved phrase, and same-key Choice picks agree within one realize pass
 *   (AC-8; the Assembler advances the counter once).
 * - A `mentions` entry renders only while that entity is transitively
 *   contained in this room (resolutions Q7/Q9); gated-out or empty-string
 *   entries splice nothing (AC-4).
 * - An unbound marker (map mutated at runtime after load-time validation)
 *   splices nothing and logs — never throws mid-turn.
 *
 * @param text the room `description` or `initialDescription` prose
 * @param roomId the room's entity id — the Choice counter primary key
 * @param snippets the room's marker→snippet table
 * @param world presence-gate queries (engine render world or a test stub)
 * @param resolveMessage language-provider seam for `{ messageId }` texts;
 *   returns undefined for an unknown id (AC-10 missing-message behavior)
 * @returns the spliced Sequence, ready to bind as the `description` param
 */
export function resolveSnippetDescription(
  text: string,
  roomId: string,
  snippets: SnippetMap,
  world: SnippetWorldQueries,
  resolveMessage?: (messageId: string) => string | undefined,
): Sequence {
  // Split on the shared marker pattern; its one capture group interleaves the
  // marker names between prose segments: [prose, name, prose, name, ...].
  const pieces = text.split(new RegExp(SNIPPET_MARKER_PATTERN.source));
  const parts: Phrase[] = [];
  // One resolution per marker name (duplicate markers reuse it — AC-8).
  const resolved = new Map<string, Phrase>();

  const resolveMarker = (name: string): Phrase => {
    const entry = snippets[name];
    if (entry === undefined) {
      // eslint-disable-next-line no-console
      console.warn(`[snippet] room "${roomId}": marker '${name}' has no entry`);
      return { kind: 'empty' };
    }
    const norm = normalizeEntry(entry);

    // Presence gate: transitive containment in this room (Q9). A destroyed
    // entity has no containing room and gates the entry out the same way.
    if (norm.mentions !== undefined) {
      const present =
        world.getEntity(norm.mentions) !== undefined &&
        world.getContainingRoom(norm.mentions)?.id === roomId;
      if (!present) return { kind: 'empty' };
    }

    const texts = norm.texts.map((t) => resolveText(t, roomId, name, resolveMessage));

    // Single fixed text (string / SnippetText form): Literal, every render.
    if (norm.selector === undefined) {
      const only = texts[0] ?? '';
      return only === '' ? { kind: 'empty' } : { kind: 'literal', text: only };
    }

    // Variant list: the Assembler picks at realize time, keyed (roomId, name).
    // An empty-string variant is a legal absent-on-some-visits alternative.
    if (texts.length === 0) return { kind: 'empty' };
    return {
      kind: 'choice',
      selector: norm.selector,
      alternatives: texts.map<Phrase>((t) =>
        t === '' ? { kind: 'empty' } : { kind: 'literal', text: t },
      ),
      entityId: roomId,
      messageKey: name,
    };
  };

  for (let i = 0; i < pieces.length; i++) {
    if (i % 2 === 0) {
      // Prose segment — opaque author text, exempt from whitespace collapse.
      if (pieces[i] !== '') parts.push({ kind: 'verbatim', text: pieces[i] });
    } else {
      const name = pieces[i];
      let phrase = resolved.get(name);
      if (phrase === undefined) {
        phrase = resolveMarker(name);
        resolved.set(name, phrase);
      }
      parts.push(phrase);
    }
  }

  return { kind: 'seq', parts };
}

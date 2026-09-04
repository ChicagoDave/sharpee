/**
 * @sharpee/channel-service/utils — composing and flattening a turn's prose.
 *
 * Owner context: platform package. The ONE definition of two rules every
 * surface that shows prose to a person needs:
 *
 *  - `composeProse(payload)` — which entries a turn's prose consists of,
 *    and in what order (ADR-300 D9). The engine emits seven prose
 *    channels plus `preferred-layout`; putting them back in the engine's
 *    intended sequence is this function.
 *  - `joinProseEntries(entries)` — how that sequence becomes one plain
 *    text string.
 *
 * Why these are shared rather than inlined by each consumer: several
 * consumers project the same packets to text — the headless bootstrap
 * harness (`@sharpee/bootstrap`, what `sharpee test` compares against),
 * the CLI bundle, the browser client's IDE recording bridge
 * (`@sharpee/platform-browser`, ADR-277 D5 / ADR-282 D2), and the
 * multi-user pane. They MUST agree character-for-character, since
 * ADR-282's blessed verbatim assertions are captured through one and
 * replayed through the other. The join rule previously had two copies
 * that silently diverged on paragraph boundaries: the bridge joined
 * every entry with `'\n'` while the harness used `'\n\n'` for non-tight
 * entries, so a blessed two-paragraph response failed on its first
 * headless run (found 2026-07-28; see ADR-282's amendment). Composition
 * is kept here for the same reason, before it can grow a second copy.
 *
 * Composition is a *client* rule applied to a *preference*. A client is
 * free to reorder or ignore `preferred-layout` — that is the point of
 * ADR-300 D9. This function is what "honour it" means.
 *
 * Public interface: `composeProse`, `joinProseEntries`, `packetProseText`,
 * and the presence presentation rule (`ProsePresentationOptions`,
 * `showsEntry`, `presenceLabel`) every client applies the same way.
 * The channel-id vocabulary itself (`PREFERRED_LAYOUT_CHANNEL`,
 * `PROSE_CHANNEL_IDS`) is wire protocol and lives in `@sharpee/if-domain`.
 *
 * @see ADR-300 — Addressable Channels and the Canonical Transcript — D8, D9
 * @see ADR-282 — Play-to-test — D2 and its 2026-07-28 amendment
 * @see ADR-163 — Channel-Service Platform
 */

import type { TextContent } from '@sharpee/text-blocks';
import { PREFERRED_LAYOUT_CHANNEL } from '@sharpee/if-domain';
import { flattenContent } from './flatten.js';

/**
 * Compose one turn packet's prose entries into the engine's intended
 * reading order (ADR-300 D9).
 *
 * Walks `payload['preferred-layout']` — a list naming, per position, the
 * channel that produced that entry — and takes each named channel's next
 * unconsumed entry. A channel id repeating in the list means that
 * channel produced more than one entry this turn, and each occurrence
 * advances that channel's cursor, so interleaved output (an action
 * result printed before a room name, say) reconstructs exactly.
 *
 * Returns `[]` when the packet carries no layout — a turn that produced
 * no prose, or a packet from a surface that does not emit the ordering
 * channel. Positions naming a channel absent from the payload are
 * skipped rather than throwing: a missing channel means the client was
 * not sent it, which is a subscription fact, not a corrupt packet.
 *
 * @param payload — a `TurnPacket.payload`, or any equivalent map of
 *   channel id → emitted value (turns are stored in that shape).
 * @returns the turn's prose entries in reading order.
 */
export function composeProse(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const map = payload as Record<string, unknown>;

  const layout = map[PREFERRED_LAYOUT_CHANNEL];
  if (!Array.isArray(layout) || layout.length === 0) return [];

  const cursors = new Map<string, number>();
  const composed: unknown[] = [];

  for (const raw of layout) {
    if (typeof raw !== 'string') continue;
    const at = cursors.get(raw) ?? 0;
    cursors.set(raw, at + 1);
    const entries = map[raw];
    if (!Array.isArray(entries)) continue;
    if (at < entries.length) composed.push(entries[at]);
  }

  return composed;
}

/**
 * Flatten a sequence of prose entries to plain text.
 *
 * Accepts both entry shapes seen on the wire: the `ProseEntry` object
 * (`{ content, tight? }`) and the legacy bare `TextContent[]`. Anything
 * else is skipped, as is any entry whose flattened text is blank.
 *
 * Entries are separated by a blank line, except `tight` entries — which
 * continue the previous line with a single newline, matching how the
 * client collapses the inter-paragraph margin for them.
 *
 * Callers holding a whole packet should pass `composeProse(payload)`
 * rather than one channel's array: `tight` refers to the entry's
 * predecessor in the *composed* sequence, which may sit on a different
 * channel.
 *
 * Presence-tagged entries (ADR-328 D3) are presented per `opts`: by
 * default an `absent` entry is skipped; in omniscient mode every entry
 * shows, labelled by location.
 *
 * @param entries — prose entries in reading order.
 * @param opts — presence presentation; absent = the platform default.
 * @returns the joined text, or `''` when nothing renderable is present.
 */
export function joinProseEntries(entries: unknown, opts: ProsePresentationOptions = {}): string {
  if (!Array.isArray(entries) || entries.length === 0) return '';

  let out = '';
  for (const raw of entries) {
    let content: ReadonlyArray<TextContent>;
    let tight = false;
    let presence: ProsePresence | undefined;
    let location: string | undefined;

    if (Array.isArray(raw)) {
      content = raw as ReadonlyArray<TextContent>;
    } else if (raw && typeof raw === 'object' && Array.isArray((raw as { content?: unknown }).content)) {
      const entry = raw as {
        content: ReadonlyArray<TextContent>;
        tight?: unknown;
        presence?: unknown;
        location?: unknown;
      };
      content = entry.content;
      tight = Boolean(entry.tight);
      presence = readPresence(entry.presence);
      location = typeof entry.location === 'string' ? entry.location : undefined;
    } else {
      continue;
    }

    if (!showsEntry(presence, opts)) continue;
    let text = flattenContent(content);
    if (!text.trim()) continue;
    const label = presenceLabel(presence, location, opts);
    if (label) text = `${label} ${text}`;
    if (out) out += tight ? '\n' : '\n\n';
    out += text;
  }
  return out;
}

/**
 * A prose entry's presence tag as it appears on the wire (ADR-328 D3).
 * The same union as `ITextBlock.presence`.
 */
export type ProsePresence = 'present' | 'absent' | 'concealed';

/**
 * How a surface presents presence-tagged prose (ADR-328 D3).
 *
 * - `default` — the platform default: `present` and `concealed` entries
 *   show, `absent` entries are hidden. What a player sees, and what a
 *   transcript's goldens mean.
 * - `omniscient` — every entry shows; tagged entries are prefixed with a
 *   `[<location>]` label so off-stage narration reads as such. The IDE's
 *   Play panel and the transcript-tester's `presence: omniscient` header
 *   use it to watch actors off-stage.
 */
export interface ProsePresentationOptions {
  /** Presentation mode. Absent = `default`. */
  presence?: 'default' | 'omniscient';
  /**
   * Resolve a location id to the label the omniscient prefix shows.
   * Absent = the id itself. Surfaces with a world hand in a name lookup.
   */
  locationLabel?: (locationId: string) => string;
}

/** Read a wire presence value defensively — anything else is "untagged". */
function readPresence(value: unknown): ProsePresence | undefined {
  return value === 'present' || value === 'absent' || value === 'concealed' ? value : undefined;
}

/**
 * The default-mode rule, stated once: hide `absent`, show everything else.
 * Omniscient shows all.
 */
export function showsEntry(presence: ProsePresence | undefined, opts: ProsePresentationOptions = {}): boolean {
  if (opts.presence === 'omniscient') return true;
  return presence !== 'absent';
}

/**
 * The omniscient label for a tagged entry — `[<location>]`, or `[<presence>]`
 * when the entry carries no location. Empty in default mode and for
 * untagged entries.
 */
export function presenceLabel(
  presence: ProsePresence | undefined,
  location: string | undefined,
  opts: ProsePresentationOptions = {},
): string {
  if (opts.presence !== 'omniscient' || presence === undefined) return '';
  if (location === undefined) return `[${presence}]`;
  return `[${opts.locationLabel ? opts.locationLabel(location) : location}]`;
}

/**
 * Compose and flatten in one step — one turn packet's prose as plain
 * text. The form every headless surface wants.
 *
 * @param payload — a `TurnPacket.payload`.
 * @param opts — presence presentation (ADR-328 D3); absent = default.
 * @returns the turn's prose as text, or `''` when it produced none.
 */
export function packetProseText(payload: unknown, opts: ProsePresentationOptions = {}): string {
  return joinProseEntries(composeProse(payload), opts);
}

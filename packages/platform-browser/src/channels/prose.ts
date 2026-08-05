/**
 * @sharpee/platform-browser/channels/prose — prose channel renderers.
 *
 * Owner context: browser default. Implements ADR-300 D8/D9 rendering for
 * the browser: the seven prose channels each get a renderer, and
 * `preferred-layout` decides what order this turn's entries appear in.
 *
 * Why one factory instead of seven independent renderers: the dispatcher
 * calls `onValue` per channel (ADR-165 §4), so seven independent
 * renderers would append in *manifest* order — a fixed order, which
 * ADR-300 D9 rejects by name because it is wrong the moment a turn emits
 * an action result before a room description. So the prose renderers
 * buffer their entries, and the `preferred-layout` renderer flushes the
 * buffer in the engine's order.
 *
 * That makes this a *client* honouring a preference, which is the whole
 * point of D9 — swapping this flush for one that sorts differently
 * changes what the player sees with no engine change.
 *
 * **Ordering invariant**: `preferred-layout` must be dispatched after the
 * prose channels, i.e. registered after them in the channel registry.
 * `@sharpee/stdlib`'s `STANDARD_CHANNELS` does that and pins it with a
 * test.
 *
 * Public interface: {@link createProseChannelRenderers}.
 */

import { composeProse, joinProseEntries, type ChannelRenderer } from '@sharpee/channel-service';
import { PREFERRED_LAYOUT_CHANNEL } from '@sharpee/if-domain';
import type { ChannelDefinition, ProseEntry } from '@sharpee/if-domain';
import type { TextContent } from '@sharpee/text-blocks';
import { renderTextContent } from './text-content.js';

export interface ProseChannelRendererOptions {
  /**
   * Optional callback fired after appending. The browser client uses
   * this to scroll the slot's containing window to the bottom.
   */
  onAfterAppend?(slot: HTMLElement): void;

  /**
   * Optional callback fired with this turn's composed prose flattened to
   * plain text, by the same rule the headless harness uses
   * (`composeProse` then `joinProseEntries`).
   *
   * Exists so the IDE recording bridge can serialize what the ENGINE said
   * rather than re-reading the DOM: `textContent` loses the tight/loose
   * distinction, so a blessed multi-paragraph assertion captured from the
   * DOM would not match headless (ADR-282 D2 and its 2026-07-28
   * amendment). Not fired when the turn flattens to nothing.
   */
  onEntriesText?(text: string): void;
}

/**
 * A set of renderers covering every prose channel plus the ordering
 * channel that flushes them, sharing one buffer.
 */
export interface ProseChannelRenderers {
  /** Channel id → renderer. Register each with the `Renderer`. */
  readonly byChannelId: ReadonlyMap<string, ChannelRenderer>;
  /**
   * Render one whole turn payload at once.
   *
   * For surfaces that hold complete turns rather than consuming a
   * dispatched packet stream — zifmia replays a room's stored transcript
   * this way, and a backlog turn is a payload map, not a live dispatch.
   * Equivalent to letting the dispatcher walk the same payload, so both
   * paths compose through the same rule.
   */
  renderPayload(payload: Record<string, unknown>): void;
  /**
   * Empty the slot and drop any half-buffered turn. Same effect as the
   * dispatcher's `clear` channel, for surfaces that reset the pane
   * themselves (zifmia does when a room's transcript is replaced).
   */
  clear(): void;
}

/**
 * Construct the default browser prose renderers.
 *
 * Each entry becomes one `<p class="main-entry prose-<channel>">` in the
 * slot. Entries with `tight: true` also get `main-entry--tight` so CSS
 * can collapse the inter-paragraph margin against the previous entry —
 * which, after D8, is routinely an entry from a different channel, so
 * the class is only correct because the flush renders in composed order.
 *
 * @param slot — the prose slot HTMLElement (typically a `<div>` or
 *   `<article>` inside a scrolling container).
 * @param proseChannelIds — the prose channel ids to render, normally
 *   stdlib's `PROSE_CHANNEL_IDS`.
 * @param opts — append and recording hooks.
 * @returns the renderers, keyed by the channel id to register them under.
 */
export function createProseChannelRenderers(
  slot: HTMLElement,
  proseChannelIds: ReadonlyArray<string>,
  opts: ProseChannelRendererOptions = {},
): ProseChannelRenderers {
  const doc = slot.ownerDocument;

  /** This turn's entries per channel, filled as the dispatcher walks. */
  let buffered: Record<string, unknown[]> = {};

  const byChannelId = new Map<string, ChannelRenderer>();

  function clearSlot(): void {
    buffered = {};
    // Reset slot DOM. State store is reset by the dispatcher.
    while (slot.firstChild) slot.removeChild(slot.firstChild);
  }

  for (const channelId of proseChannelIds) {
    byChannelId.set(channelId, {
      onValue(value: unknown): void {
        if (!Array.isArray(value) || value.length === 0) return;
        (buffered[channelId] ??= []).push(...value);
      },
      onClear(): void {
        clearSlot();
      },
    });
  }

  byChannelId.set(PREFERRED_LAYOUT_CHANNEL, {
    onValue(value: unknown): void {
      const composed = composeProse({ ...buffered, [PREFERRED_LAYOUT_CHANNEL]: value });
      buffered = {};
      if (composed.length === 0) return;

      // Report the engine's own text BEFORE rendering, so the recording
      // bridge never depends on what the DOM ends up looking like.
      if (opts.onEntriesText) {
        const text = joinProseEntries(composed);
        if (text) opts.onEntriesText(text);
      }

      let appended = false;
      for (let i = 0; i < composed.length; i += 1) {
        const entry = normalizeEntry(composed[i]);
        if (!entry) continue;
        const p = doc.createElement('p');
        p.classList.add('main-entry');
        const source = layoutChannelAt(value, i);
        if (source) p.classList.add(`prose-${source}`);
        if (entry.tight) p.classList.add('main-entry--tight');
        if (entry.className) p.classList.add(entry.className);
        // No `white-space: pre-line`. Engine handlers split `\n` into
        // block boundaries via `createBlocks`; entries marked `tight`
        // get the `main-entry--tight` class so the inter-paragraph
        // margin collapses and continuation lines stack flush.
        // `entry.className` carries semantic identity (game-title,
        // story-version, etc.) for per-piece CSS styling.
        p.appendChild(renderTextContent(doc, entry.content));
        slot.appendChild(p);
        appended = true;
      }
      if (appended) opts.onAfterAppend?.(slot);
    },
    onClear(): void {
      clearSlot();
    },
  });

  return {
    byChannelId,
    clear: clearSlot,
    renderPayload(payload: Record<string, unknown>): void {
      for (const channelId of proseChannelIds) {
        byChannelId
          .get(channelId)
          ?.onValue(payload[channelId], proseDefinition(channelId));
      }
      byChannelId
        .get(PREFERRED_LAYOUT_CHANNEL)
        ?.onValue(payload[PREFERRED_LAYOUT_CHANNEL], layoutDefinition());
    },
  };
}

/**
 * Synthesize the manifest entry for a prose channel. `renderPayload`
 * replays a stored turn rather than a dispatched packet, so there is no
 * live manifest to quote; the shape is fixed by stdlib's definitions.
 */
function proseDefinition(id: string): ChannelDefinition {
  return { id, contentType: 'json', mode: 'append', emit: 'sparse' };
}

/** Manifest entry for `preferred-layout`. See {@link proseDefinition}. */
function layoutDefinition(): ChannelDefinition {
  return { id: PREFERRED_LAYOUT_CHANNEL, contentType: 'json', mode: 'replace', emit: 'always' };
}

/**
 * The channel id at position `i` of a `preferred-layout` value, or
 * `null` when the value is not a usable layout. Used only to tag the
 * rendered element with its source channel for CSS.
 */
function layoutChannelAt(layout: unknown, i: number): string | null {
  if (!Array.isArray(layout)) return null;
  const id = layout[i];
  return typeof id === 'string' && id ? id : null;
}

/**
 * Accept either the `ProseEntry` shape or the legacy bare
 * `TextContent[]` array shape (saves and pre-refactor packets in
 * flight). Returns null for anything that doesn't look like an entry.
 */
function normalizeEntry(raw: unknown): ProseEntry | null {
  if (Array.isArray(raw)) {
    return { content: raw as ReadonlyArray<TextContent> };
  }
  if (raw && typeof raw === 'object' && 'content' in raw) {
    const obj = raw as { content: unknown; tight?: unknown; className?: unknown };
    if (!Array.isArray(obj.content)) return null;
    return {
      content: obj.content as ReadonlyArray<TextContent>,
      ...(obj.tight ? { tight: true } : {}),
      ...(typeof obj.className === 'string' && obj.className
        ? { className: obj.className }
        : {}),
    };
  }
  return null;
}

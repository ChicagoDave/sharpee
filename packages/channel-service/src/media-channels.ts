/**
 * @sharpee/channel-service — media channel definitions
 *
 * Owner context: platform package. The media channels from ADR-163 §7
 * folding ADR-101's media events into the universal channel-I/O wire.
 * Pre-registered by the consumer's bootstrap (typically after
 * `registerStandardChannels` and before story init) via
 * `registerMediaChannels`.
 *
 * Capability gating (ADR-163 §6): every media channel is gated by a
 * `ClientCapabilities` boolean flag. The CMGT producer omits gated
 * channels from a client's manifest when the flag is `false`. Story
 * init runs unconditionally — channels register regardless of declared
 * capabilities; filtering happens at manifest production time.
 *
 * **`clear` is registered ungated.** ADR-163 §6 lists `clear` among the
 * capability-gated media channels but does not name a specific
 * capability flag. `clear` operates on `append`-mode channels (notably
 * the always-present `main`), so gating it would mean some clients
 * could never reset accumulated prose — which contradicts §10's
 * truncation invariant. The platform therefore registers `clear`
 * unconditionally; a future capability flag can be added without a
 * wire change.
 *
 * **Dynamic media channels** — `image:<layer>` for non-conventional
 * layers (anything beyond the three from ADR-101 §"Layout") and
 * `ambient:<id>` (entirely story-defined per §7) are NOT registered
 * here. Stories register them directly via `registerChannel({ id:
 * 'image:foo', ... }, { gatedBy: 'images' })`. The convenience helper
 * `registerAmbientChannel(id)` wraps the boilerplate for the common
 * ambient case.
 *
 * @see ADR-163 — Channel-Service Platform — decisions 6, 7, 8
 * @see ADR-101 — Graphical Client Architecture (REPLACED) — for the
 *   media event vocabulary that folded into these channels.
 */

import type { ChannelDefinition } from './wire';
import { registerChannel } from './registry';
import type { CapabilityFlag } from './registry';

/**
 * Channel ids for the media channels registered by the platform.
 *
 * The dynamic `image:<layer>` channels (`image:background`,
 * `image:main`, `image:overlay`) follow ADR-101 §"Layout"'s
 * conventional layer naming. Stories register additional layers as
 * needed (e.g., `image:portrait`, `image:overlay-2`).
 */
export const MEDIA_CHANNEL_IDS = {
  // Image channels (gated by `images`)
  IMAGE_PRELOAD: 'image:preload',
  IMAGE_BACKGROUND: 'image:background',
  IMAGE_MAIN: 'image:main',
  IMAGE_OVERLAY: 'image:overlay',

  // Audio channels
  SOUND: 'sound',
  MUSIC: 'music',

  // Animation channels (gated by `animations`)
  ANIMATION: 'animation',
  ANIMATE: 'animate',

  // Visual channels
  TRANSITION: 'transition',
  LAYOUT: 'layout',
  CLEAR: 'clear',
} as const;

export type MediaChannelId =
  (typeof MEDIA_CHANNEL_IDS)[keyof typeof MEDIA_CHANNEL_IDS];

/**
 * One entry in the media-channel registration table. Bundles the
 * `ChannelDefinition` with its gating capability so `registerMediaChannels`
 * can iterate uniformly. `gatedBy: undefined` registers the channel
 * unconditionally (used only for `clear`).
 */
interface MediaChannelEntry {
  readonly def: ChannelDefinition;
  readonly gatedBy: CapabilityFlag | undefined;
}

/**
 * Media channel definitions per ADR-163 §7.
 *
 * Mode and emit policy follow the §7 mapping table verbatim:
 * - replace-mode media channels register `emit: 'always'` so a
 *   mid-session join sees current image/music/ambient/layout state
 *   from any recent turn packet.
 * - event-mode media channels register `emit: 'sparse'` — they fire
 *   exactly when triggered and have no current value to populate idle
 *   turns with.
 *
 * `image:preload` is event-mode despite carrying image data: it tells
 * the renderer to download an asset, not to display one. Treating it
 * as event-mode means joining renderers don't re-trigger preloads
 * they've already cached.
 */
export const MEDIA_CHANNELS: ReadonlyArray<MediaChannelEntry> = [
  // ─── Image channels (gated by `images`) ────────────────────────────
  {
    def: { id: MEDIA_CHANNEL_IDS.IMAGE_PRELOAD, contentType: 'json', mode: 'event', emit: 'sparse' },
    gatedBy: 'images',
  },
  {
    def: { id: MEDIA_CHANNEL_IDS.IMAGE_BACKGROUND, contentType: 'json', mode: 'replace', emit: 'always' },
    gatedBy: 'images',
  },
  {
    def: { id: MEDIA_CHANNEL_IDS.IMAGE_MAIN, contentType: 'json', mode: 'replace', emit: 'always' },
    gatedBy: 'images',
  },
  {
    def: { id: MEDIA_CHANNEL_IDS.IMAGE_OVERLAY, contentType: 'json', mode: 'replace', emit: 'always' },
    gatedBy: 'images',
  },

  // ─── Audio channels ────────────────────────────────────────────────
  {
    def: { id: MEDIA_CHANNEL_IDS.SOUND, contentType: 'json', mode: 'event', emit: 'sparse' },
    gatedBy: 'sound',
  },
  {
    def: { id: MEDIA_CHANNEL_IDS.MUSIC, contentType: 'json', mode: 'replace', emit: 'always' },
    gatedBy: 'music',
  },

  // ─── Animation channels (gated by `animations`) ────────────────────
  {
    def: { id: MEDIA_CHANNEL_IDS.ANIMATION, contentType: 'json', mode: 'event', emit: 'sparse' },
    gatedBy: 'animations',
  },
  {
    def: { id: MEDIA_CHANNEL_IDS.ANIMATE, contentType: 'json', mode: 'event', emit: 'sparse' },
    gatedBy: 'animations',
  },

  // ─── Visual channels ───────────────────────────────────────────────
  {
    def: { id: MEDIA_CHANNEL_IDS.TRANSITION, contentType: 'json', mode: 'event', emit: 'sparse' },
    gatedBy: 'transitions',
  },
  {
    def: { id: MEDIA_CHANNEL_IDS.LAYOUT, contentType: 'json', mode: 'replace', emit: 'always' },
    gatedBy: 'splitPane',
  },
  {
    def: { id: MEDIA_CHANNEL_IDS.CLEAR, contentType: 'json', mode: 'event', emit: 'sparse' },
    gatedBy: undefined,
  },
];

/**
 * Register the platform media channels with the current session.
 *
 * Called by the consumer's bootstrap path after `registerHello` and
 * `registerStandardChannels`, before story init runs (so stories see
 * media channels available for their own routing rules).
 *
 * Story init does NOT depend on `getCapabilities()` for these
 * registrations — channels register unconditionally per the
 * "story-init-runs-unconditionally" invariant (ADR-163 §11). Per-client
 * filtering happens at `produceCmgtManifest` time using the recorded
 * `gatedBy` flag.
 */
export function registerMediaChannels(): void {
  for (const entry of MEDIA_CHANNELS) {
    if (entry.gatedBy === undefined) {
      registerChannel(entry.def);
    } else {
      registerChannel(entry.def, { gatedBy: entry.gatedBy });
    }
  }
}

/**
 * Register a story-defined `ambient:<id>` channel.
 *
 * Convenience wrapper for the common ambient-audio case. Ambient
 * channels are inherently story-defined (ADR-163 §7 — `ambient:<id>`
 * has no platform-known id set), so the platform does not pre-register
 * them. Stories call this once per ambient layer they use.
 *
 * @param ambientId — the suffix portion (e.g., `'wind'` registers
 *   the channel `'ambient:wind'`).
 */
export function registerAmbientChannel(ambientId: string): void {
  registerChannel(
    {
      id: `ambient:${ambientId}`,
      contentType: 'json',
      mode: 'replace',
      emit: 'always',
    },
    { gatedBy: 'sound' },
  );
}

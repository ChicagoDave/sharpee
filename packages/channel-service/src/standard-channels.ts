/**
 * @sharpee/channel-service — standard channel definitions
 *
 * Owner context: platform package. The ten engine-sourced standard
 * channels from ADR-163 §4. Pre-registered by the consumer's bootstrap
 * (CLI, platform-browser, multi-user worker) via `registerStandardChannels`.
 *
 * All ten standard channels register with `emit: 'always'` (ADR-163 §5
 * invariant). Including `info` and `ifid` which carry near-static
 * values; the bandwidth cost is negligible and the rule stays uniform.
 *
 * Standard channels are NOT capability-gated — they always exist on
 * every surface (§6).
 *
 * @see ADR-163 — Channel-Service Platform — decisions 4, 5, 6, 11
 */

import type { ChannelDefinition } from './wire';
import { registerChannel } from './registry';

/**
 * Channel ids for the ten platform standard channels.
 *
 * Used as wire identifiers and as the `emit.channel` target of rules.
 * Frozen at the const-assertion type level so consumers see the
 * literal-string types.
 */
export const STANDARD_CHANNEL_IDS = {
  /** Narrative prose; `TextContent[]` per emission (decorations preserved). */
  MAIN: 'main',
  /** Input prompt (default `> `). */
  PROMPT: 'prompt',
  /** Status-line location name. */
  LOCATION: 'location',
  /** `{ current: number, max: number | null }`. */
  SCORE: 'score',
  /** Turn count. */
  TURN: 'turn',
  /** Death notification. */
  DEATH: 'death',
  /** Endgame text. */
  ENDGAME: 'endgame',
  /** Transient score-change announcement. */
  SCORE_NOTIFY: 'score_notify',
  /** `{ title, author, version }` — emitted at start, re-emitted on ABOUT. */
  INFO: 'info',
  /** IFID — emitted at start, re-emitted on ABOUT. */
  IFID: 'ifid',
} as const;

export type StandardChannelId =
  (typeof STANDARD_CHANNEL_IDS)[keyof typeof STANDARD_CHANNEL_IDS];

/**
 * The ten standard channel definitions (ADR-163 §4 table).
 *
 * Order is preserved for stable iteration in tests and manifests;
 * channel-service itself does not depend on the order.
 */
export const STANDARD_CHANNELS: ReadonlyArray<ChannelDefinition> = [
  { id: STANDARD_CHANNEL_IDS.MAIN, contentType: 'json', mode: 'append', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.PROMPT, contentType: 'text', mode: 'replace', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.LOCATION, contentType: 'text', mode: 'replace', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.SCORE, contentType: 'json', mode: 'replace', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.TURN, contentType: 'number', mode: 'replace', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.DEATH, contentType: 'text', mode: 'event', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.ENDGAME, contentType: 'text', mode: 'event', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.SCORE_NOTIFY, contentType: 'text', mode: 'event', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.INFO, contentType: 'json', mode: 'replace', emit: 'always' },
  { id: STANDARD_CHANNEL_IDS.IFID, contentType: 'text', mode: 'replace', emit: 'always' },
];

/**
 * Register the ten standard channels with the current session.
 *
 * Called by the consumer's bootstrap path after `registerHello` and
 * before any story init that depends on standard channels existing.
 *
 * Throws (via `registerChannel`) if any standard channel id is already
 * taken — that would indicate a story tried to shadow a standard
 * channel, which is a story bug.
 */
export function registerStandardChannels(): void {
  for (const def of STANDARD_CHANNELS) {
    registerChannel(def);
  }
}

/**
 * @sharpee/stdlib/channels — block-key → channel-id routing for prose.
 *
 * Owner context: stdlib language layer. ADR-300 D8 dissolved the
 * catch-all `main` channel: each prose-shaped block key now has its own
 * channel, so a client receives `room-description` and `action-result`
 * as separate signals instead of one append stream it was expected to
 * concatenate. No channel means "the prose window" any more.
 *
 * `PROSE_CHANNEL_BY_BLOCK_KEY` is the whole routing table. It is the
 * single place the mapping lives: the seven prose channels' closures
 * read it, and so does `preferred-layout`'s (ADR-300 D9), which is what
 * keeps the ordering signal and the channels it orders from drifting
 * apart.
 *
 * Block keys absent from this map are NOT routed to a prose channel —
 * status keys are read from world state by the score/turn/location
 * channels, the banner has `BANNER_KEYS`, and stories extend by
 * registering their own `IOChannel` (last-write-wins on channel id) per
 * ADR-163 §6.
 *
 * The channel *ids* are wire vocabulary and live in
 * `@sharpee/if-domain` (`PROSE_CHANNEL_IDS`) so producer and consumers
 * cannot drift. What this file owns is the engine-side half: which text
 * block key routes to which of those ids.
 *
 * Public interface: `PROSE_CHANNEL_BY_BLOCK_KEY`, `BANNER_KEYS`.
 *
 * @see ADR-300 — Addressable Channels and the Canonical Transcript — D8, D9
 * @see ADR-163 — Channel-Service Platform — §6, §7, §14
 */

import type { ProseChannelId } from '@sharpee/if-domain';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';

/**
 * The prose routing table: which channel carries each prose-shaped
 * block key. Iteration order is the order the channels are registered
 * in `STANDARD_CHANNELS`, which is *not* a render order — the render
 * order is per-turn and rides `preferred-layout`.
 *
 * Typed on `ProseChannelId` so adding a route to an id that is not in
 * if-domain's wire vocabulary fails to compile rather than emitting a
 * channel no consumer knows how to render.
 */
export const PROSE_CHANNEL_BY_BLOCK_KEY: ReadonlyMap<string, ProseChannelId> = new Map<
  string,
  ProseChannelId
>([
  [CORE_BLOCK_KEYS.ROOM_NAME, 'room-name'],
  [CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'room-description'],
  [CORE_BLOCK_KEYS.ROOM_CONTENTS, 'room-contents'],
  [CORE_BLOCK_KEYS.ACTION_RESULT, 'action-result'],
  [CORE_BLOCK_KEYS.ACTION_BLOCKED, 'action-blocked'],
  [CORE_BLOCK_KEYS.ERROR, 'error'],
  [CORE_BLOCK_KEYS.GAME_MESSAGE, 'game-message'],
]);

/**
 * Block keys whose content flows into the `banner` channel.
 *
 * The opening banner used to ride `main`, which meant the title, the version
 * lines and the credits all arrived glued to whatever the first command
 * printed — one undivided lump that a test could only assert on as a whole.
 * On its own channel it is addressable: the banner, the prologue and the first
 * command's response become three things a transcript can check separately.
 */
export const BANNER_KEYS: ReadonlySet<string> = new Set<string>([
  CORE_BLOCK_KEYS.GAME_BANNER,
]);

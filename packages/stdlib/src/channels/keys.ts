/**
 * @sharpee/stdlib/channels — block-key sets used by standard channels.
 *
 * Owner context: stdlib language layer. The standard `main` channel's
 * closure routes prose-shaped blocks (room descriptions, action
 * results, banners, etc.) into the append-mode main transcript.
 * `MAIN_KEYS` names every `CORE_BLOCK_KEYS` entry that should land in
 * the main channel.
 *
 * Block keys not in this set are NOT routed to main automatically —
 * stories override or extend by registering their own `IOChannel`
 * (last-write-wins on channel id) per ADR-163 §6.
 *
 * @see ADR-163 — Channel-Service Platform — §6, §7, §14
 */

import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';

/**
 * Block keys whose content flows into the `main` channel (append mode,
 * decoration-preserving). Status blocks (`status.score`, `status.turns`,
 * `status.room`) are intentionally absent — those values are now read
 * from world state directly by the score/turn/location channels.
 */
export const MAIN_KEYS: ReadonlySet<string> = new Set<string>([
  CORE_BLOCK_KEYS.ROOM_NAME,
  CORE_BLOCK_KEYS.ROOM_DESCRIPTION,
  CORE_BLOCK_KEYS.ROOM_CONTENTS,
  CORE_BLOCK_KEYS.ACTION_RESULT,
  CORE_BLOCK_KEYS.ACTION_BLOCKED,
  CORE_BLOCK_KEYS.ERROR,
  CORE_BLOCK_KEYS.GAME_MESSAGE,
  CORE_BLOCK_KEYS.GAME_BANNER,
]);

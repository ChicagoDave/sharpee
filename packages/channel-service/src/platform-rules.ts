/**
 * @sharpee/channel-service — platform default rules
 *
 * Owner context: platform package. The default rule set covering the
 * 12 `CORE_BLOCK_KEYS` declared by `@sharpee/text-blocks`. Routes
 * engine output to the ten standard channels from ADR-163 §4.
 *
 * Stories override platform rules by registering higher-priority rules
 * for the same key (per AC-10 conflict resolution). Stories opt out of
 * platform routing for a key by registering a higher-priority rule
 * that emits to a different channel (or to a no-op channel).
 *
 * @see ADR-163 — Channel-Service Platform — decisions 4, 12; AC-1, AC-10
 */

import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ChannelRule } from './types';
import { STANDARD_CHANNEL_IDS } from './standard-channels';
import { addRules } from './registry';

/**
 * Flatten an `ITextBlock`'s content array to a plain string.
 *
 * Recursively concatenates string nodes and strips decoration wrappers
 * (preserving their inner content). Used by the score-extractor below
 * and by the producer's built-in `'string'` and `'number'` extracts.
 */
export function flattenContent(content: ReadonlyArray<TextContent>): string {
  let out = '';
  for (const node of content) {
    if (typeof node === 'string') {
      out += node;
    } else {
      out += flattenContent(node.content);
    }
  }
  return out;
}

/**
 * Custom extractor for `status.score` blocks.
 *
 * Today's stdlib emits `status.score` as a plain string like `'42'` or
 * `'42 / 100'`. The `score` channel expects `{ current, max }`. This
 * extractor parses both shapes and returns `null` for unparseable
 * values (so the producer can drop the emission rather than write
 * garbage to the wire).
 */
function extractScore(block: ITextBlock): { current: number; max: number | null } | null {
  const flat = flattenContent(block.content).trim();
  if (flat === '') return null;
  const slashMatch = flat.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) {
    return { current: Number(slashMatch[1]), max: Number(slashMatch[2]) };
  }
  const intMatch = flat.match(/^(-?\d+)$/);
  if (intMatch) {
    return { current: Number(intMatch[1]), max: null };
  }
  return null;
}

/**
 * Default platform rule set covering all 12 `CORE_BLOCK_KEYS`.
 *
 * All rules use the default priority (0). Stories register at higher
 * priority to override.
 *
 * `room.name` fans out to two channels: `main` (append, decoration-
 * preserving) and `location` (replace, plain string for the status
 * line). The same source block emits to both — the channel's `mode`
 * determines whether the value accumulates or replaces.
 */
export const platformRules: ReadonlyArray<ChannelRule> = [
  // room.name → main (append, content) + location (replace, string)
  {
    when: { key: CORE_BLOCK_KEYS.ROOM_NAME },
    emit: { channel: STANDARD_CHANNEL_IDS.MAIN, extract: 'content' },
  },
  {
    when: { key: CORE_BLOCK_KEYS.ROOM_NAME },
    emit: { channel: STANDARD_CHANNEL_IDS.LOCATION, extract: 'string' },
  },

  // room.description → main
  {
    when: { key: CORE_BLOCK_KEYS.ROOM_DESCRIPTION },
    emit: { channel: STANDARD_CHANNEL_IDS.MAIN, extract: 'content' },
  },

  // room.contents → main
  {
    when: { key: CORE_BLOCK_KEYS.ROOM_CONTENTS },
    emit: { channel: STANDARD_CHANNEL_IDS.MAIN, extract: 'content' },
  },

  // action.result → main
  {
    when: { key: CORE_BLOCK_KEYS.ACTION_RESULT },
    emit: { channel: STANDARD_CHANNEL_IDS.MAIN, extract: 'content' },
  },

  // action.blocked → main
  {
    when: { key: CORE_BLOCK_KEYS.ACTION_BLOCKED },
    emit: { channel: STANDARD_CHANNEL_IDS.MAIN, extract: 'content' },
  },

  // status.room → location (replace, plain string for the status line)
  {
    when: { key: CORE_BLOCK_KEYS.STATUS_ROOM },
    emit: { channel: STANDARD_CHANNEL_IDS.LOCATION, extract: 'string' },
  },

  // status.score → score (replace, structured {current, max})
  {
    when: { key: CORE_BLOCK_KEYS.STATUS_SCORE },
    emit: { channel: STANDARD_CHANNEL_IDS.SCORE, extract: extractScore },
  },

  // status.turns → turn (replace, number)
  {
    when: { key: CORE_BLOCK_KEYS.STATUS_TURNS },
    emit: { channel: STANDARD_CHANNEL_IDS.TURN, extract: 'number' },
  },

  // error → main (rendered as prose; story may override to a dedicated error channel)
  {
    when: { key: CORE_BLOCK_KEYS.ERROR },
    emit: { channel: STANDARD_CHANNEL_IDS.MAIN, extract: 'content' },
  },

  // prompt → prompt (replace, plain string)
  {
    when: { key: CORE_BLOCK_KEYS.PROMPT },
    emit: { channel: STANDARD_CHANNEL_IDS.PROMPT, extract: 'string' },
  },

  // game.message → main
  {
    when: { key: CORE_BLOCK_KEYS.GAME_MESSAGE },
    emit: { channel: STANDARD_CHANNEL_IDS.MAIN, extract: 'content' },
  },

  // game.banner → main
  {
    when: { key: CORE_BLOCK_KEYS.GAME_BANNER },
    emit: { channel: STANDARD_CHANNEL_IDS.MAIN, extract: 'content' },
  },
];

/**
 * Add the platform default rules to the current session.
 *
 * Called by the consumer's bootstrap path after `registerStandardChannels`,
 * before story init runs. Stories can then add higher-priority rules to
 * override per-key routing.
 */
export function registerPlatformRules(): void {
  addRules(platformRules);
}

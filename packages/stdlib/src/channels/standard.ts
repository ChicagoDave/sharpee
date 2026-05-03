/**
 * @sharpee/stdlib/channels — standard `IOChannel` definitions.
 *
 * Owner context: stdlib language layer. The ten platform-vocabulary
 * channels from ADR-163 §4 — co-located with stdlib because their
 * closures read stdlib data sources (capabilities, blocks the
 * text-service produces, world projections).
 *
 * Per ADR-163 §6, channels are self-contained: each `IOChannel`
 * carries its identity, configuration, and a closure that computes
 * the channel's value for the current turn from the
 * `ChannelProduceContext`. There is no separate rule schema or
 * routing layer; closures are the routing.
 *
 * **Standard channels are NOT capability-gated** (per §6 — they exist
 * on every surface). Media channels gate; standards do not.
 *
 * @see ADR-163 — Channel-Service Platform — §4, §5, §6
 */

import type { IOChannel } from '@sharpee/if-domain';
import type { TextContent } from '@sharpee/text-blocks';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ScoringData } from '../capabilities/scoring';
import { MAIN_KEYS } from './keys';
import { playerLocationName, readCapability } from './world-helpers';

/**
 * Local copy of the `flattenContent` helper. stdlib intentionally does
 * not depend on `@sharpee/channel-service` (the engine composes that
 * with stdlib's registry; making stdlib reach back into the runtime
 * package would invert the dependency direction). The function is
 * small enough to inline.
 */
function flattenContent(content: ReadonlyArray<TextContent>): string {
  let out = '';
  for (const node of content) {
    if (typeof node === 'string') out += node;
    else out += flattenContent(node.content);
  }
  return out;
}

/**
 * Event types the standard channels listen for. Stories or extensions
 * that want to populate `death`, `endgame`, or `score_notify` emit
 * events of these types; stdlib does not emit them itself.
 *
 * The values match the `if.event.*` namespacing convention. An event
 * carries its message in `event.data.message` (string).
 */
export const STANDARD_CHANNEL_EVENTS = {
  PLAYER_DIED: 'if.event.player_died',
  GAME_WON: 'if.event.game_won',
  GAME_LOST: 'if.event.game_lost',
  SCORE_CHANGED: 'if.event.score_changed',
} as const;

/**
 * Story-info capability shape consumed by `infoChannel` and
 * `ifidChannel`. Stories populate this capability at start; engine
 * bootstrap also populates it from the loaded story metadata.
 */
interface StoryInfoData {
  title?: string;
  author?: string;
  version?: string;
  ifid?: string;
}

/**
 * Project an event's `data.message` field as a string, or `undefined`
 * if the event has no string message. Used by death / endgame /
 * score_notify channels to extract their payload.
 */
function eventMessage(event: { data?: unknown }): string | undefined {
  const data = event.data as { message?: unknown } | undefined;
  if (!data) return undefined;
  if (typeof data.message !== 'string') return undefined;
  return data.message;
}

/**
 * `main` — append-mode prose transcript. Carries `TextContent[]`
 * arrays so renderers can preserve decorations. Closure projects every
 * block whose key is in `MAIN_KEYS` into the channel's append stream.
 */
export const mainChannel: IOChannel<TextContent[]> = {
  id: 'main',
  contentType: 'json',
  mode: 'append',
  emit: 'always',
  produce: (ctx) => {
    const entries: TextContent[][] = [];
    for (const block of ctx.blocks) {
      if (MAIN_KEYS.has(block.key)) {
        entries.push([...block.content]);
      }
    }
    return entries;
  },
};

/**
 * `prompt` — replace-mode input prompt. Defaults to `'> '` when no
 * prompt block is emitted, so the renderer always has a sensible
 * placeholder. Closure flattens the prompt block's content to plain
 * string (decorations stripped).
 */
export const promptChannel: IOChannel<string> = {
  id: 'prompt',
  contentType: 'text',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    for (const block of ctx.blocks) {
      if (block.key === CORE_BLOCK_KEYS.PROMPT) {
        return flattenContent(block.content);
      }
    }
    return '> ';
  },
};

/**
 * `location` — replace-mode status-line location name. Closure reads
 * the player's containing room from the world and returns its display
 * name. Returns `undefined` (the channel re-emits its prevValue) if
 * the world has no player or the room cannot be resolved.
 */
export const locationChannel: IOChannel<string> = {
  id: 'location',
  contentType: 'text',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => playerLocationName(ctx),
};

/**
 * `score` — replace-mode `{current, max}` payload. Closure reads the
 * `scoring` capability from the world. Emits `undefined` (re-emits
 * prev) when the capability is absent.
 *
 * `max: null` (not `0`) signals an unbounded score per ADR-163 §4
 * commentary; `maxScore: 0` in the capability is treated as null since
 * a 0-cap scoring system has no usable progress fraction.
 */
export const scoreChannel: IOChannel<{ current: number; max: number | null }> = {
  id: 'score',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    const cap = readCapability<ScoringData>(ctx, 'scoring');
    if (!cap) return undefined;
    const current = typeof cap.scoreValue === 'number' ? cap.scoreValue : 0;
    const max = typeof cap.maxScore === 'number' && cap.maxScore > 0 ? cap.maxScore : null;
    return { current, max };
  },
};

/**
 * `turn` — replace-mode turn count. Closure returns `ctx.turn`
 * directly. Always emits because the turn counter changes every turn.
 */
export const turnChannel: IOChannel<number> = {
  id: 'turn',
  contentType: 'number',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => ctx.turn,
};

/**
 * `info` — replace-mode story metadata `{title, author, version}`.
 * Closure reads the `storyInfo` capability. Stories or the engine
 * register and populate this capability at startup.
 */
export const infoChannel: IOChannel<{ title?: string; author?: string; version?: string }> = {
  id: 'info',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    const cap = readCapability<StoryInfoData>(ctx, 'storyInfo');
    if (!cap) return undefined;
    return {
      title: cap.title,
      author: cap.author,
      version: cap.version,
    };
  },
};

/**
 * `ifid` — replace-mode IFID string. Closure reads `storyInfo.ifid`.
 */
export const ifidChannel: IOChannel<string> = {
  id: 'ifid',
  contentType: 'text',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    const cap = readCapability<StoryInfoData>(ctx, 'storyInfo');
    if (!cap || typeof cap.ifid !== 'string') return undefined;
    return cap.ifid;
  },
};

/**
 * `death` — event-mode death notification. Closure looks for an
 * `if.event.player_died` event in this turn's events and projects its
 * `data.message` field. Stories that want different death handling
 * register a replacement `IOChannel` with id `'death'` (last-write-wins
 * per ADR-163 §6).
 */
export const deathChannel: IOChannel<string> = {
  id: 'death',
  contentType: 'text',
  mode: 'event',
  emit: 'sparse',
  produce: (ctx) => {
    for (const event of ctx.events) {
      if (event.type === STANDARD_CHANNEL_EVENTS.PLAYER_DIED) {
        return eventMessage(event);
      }
    }
    return undefined;
  },
};

/**
 * `endgame` — event-mode endgame notification (game won OR game lost
 * — the closure folds both into one channel since renderers typically
 * present them similarly). Closure scans for either event type and
 * returns the message of the first match.
 */
export const endgameChannel: IOChannel<string> = {
  id: 'endgame',
  contentType: 'text',
  mode: 'event',
  emit: 'sparse',
  produce: (ctx) => {
    for (const event of ctx.events) {
      if (
        event.type === STANDARD_CHANNEL_EVENTS.GAME_WON ||
        event.type === STANDARD_CHANNEL_EVENTS.GAME_LOST
      ) {
        return eventMessage(event);
      }
    }
    return undefined;
  },
};

/**
 * `score_notify` — event-mode transient score-change announcement.
 * Closure scans for `if.event.score_changed` and emits its message.
 */
export const scoreNotifyChannel: IOChannel<string> = {
  id: 'score_notify',
  contentType: 'text',
  mode: 'event',
  emit: 'sparse',
  produce: (ctx) => {
    for (const event of ctx.events) {
      if (event.type === STANDARD_CHANNEL_EVENTS.SCORE_CHANGED) {
        return eventMessage(event);
      }
    }
    return undefined;
  },
};

/**
 * The ten platform-standard channels in iteration order. Order is
 * preserved for stable diffing in tests and manifests; the
 * `ChannelService` itself does not depend on ordering.
 */
export const STANDARD_CHANNELS: ReadonlyArray<IOChannel> = [
  mainChannel,
  promptChannel,
  locationChannel,
  scoreChannel,
  turnChannel,
  infoChannel,
  ifidChannel,
  deathChannel,
  endgameChannel,
  scoreNotifyChannel,
];

/**
 * Channel id literals for the platform-standard set. Used by tests
 * and consumers that need string-literal types.
 */
export const STANDARD_CHANNEL_IDS = {
  MAIN: 'main',
  PROMPT: 'prompt',
  LOCATION: 'location',
  SCORE: 'score',
  TURN: 'turn',
  INFO: 'info',
  IFID: 'ifid',
  DEATH: 'death',
  ENDGAME: 'endgame',
  SCORE_NOTIFY: 'score_notify',
} as const;

export type StandardChannelId =
  (typeof STANDARD_CHANNEL_IDS)[keyof typeof STANDARD_CHANNEL_IDS];

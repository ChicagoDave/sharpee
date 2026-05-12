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

import type { IOChannel, MainEntry } from '@sharpee/if-domain';
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
 * The values align with what the engine and stdlib extensions actually
 * emit today:
 *
 * - `game.won` / `game.lost` — engine emits these from `engine.stop()`
 *   via `createGameWonEvent` / `createGameLostEvent` (core/events).
 * - `combat.player_died` — emitted by the `@sharpee/ext-basic-combat`
 *   extension. Stories not using basic-combat that want a death
 *   channel emission must either fire `combat.player_died` themselves
 *   or override `deathChannel` with their own closure.
 * - `game.score_changed` — no production emitter today. The channel
 *   listens for it, but it stays silent until a story or extension
 *   adopts the convention. Listed for forward-compatibility.
 *
 * Each event carries its message in `event.data.message` (string).
 */
export const STANDARD_CHANNEL_EVENTS = {
  PLAYER_DIED: 'combat.player_died',
  GAME_WON: 'game.won',
  GAME_LOST: 'game.lost',
  SCORE_CHANGED: 'game.score_changed',
} as const;

/**
 * Story-info capability shape consumed by `infoChannel` and
 * `ifidChannel`. Engine bootstrap populates this from the merged
 * `StoryConfig` + `StoryInfoTrait` payload; stories may override
 * specific fields after start.
 *
 * Field provenance:
 *  - title / author / version — `StoryConfig` (fallback to
 *    `StoryInfoTrait` if config omits)
 *  - ifid — `StoryConfig.ifid`
 *  - description — `StoryConfig.description` or `StoryInfoTrait.description`
 *  - buildDate — `StoryConfig.buildDate` or `StoryInfoTrait.buildDate`
 *  - engineVersion / clientVersion — `StoryInfoTrait` (set by build
 *    pipelines)
 */
interface StoryInfoData {
  title?: string;
  author?: string;
  version?: string;
  ifid?: string;
  description?: string;
  buildDate?: string;
  engineVersion?: string;
  clientVersion?: string;
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
 * `main` — append-mode prose transcript. Carries `MainEntry` objects
 * (`{ content, tight? }`) so renderers can preserve decorations *and*
 * the per-entry visual-continuation hint introduced by the pre-line
 * removal (session 2026-05-12). Closure projects every block whose key
 * is in `MAIN_KEYS` into the channel's append stream.
 */
export const mainChannel: IOChannel<MainEntry> = {
  id: 'main',
  contentType: 'json',
  mode: 'append',
  emit: 'always',
  produce: (ctx) => {
    const entries: MainEntry[] = [];
    for (const block of ctx.blocks) {
      if (MAIN_KEYS.has(block.key)) {
        entries.push({
          content: [...block.content],
          ...(block.tight ? { tight: true } : {}),
        });
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
 * `score` — replace-mode `{current, max}` payload.
 *
 * Reads the canonical ADR-129 score ledger first (`world.getScore()`
 * and `world.getMaxScore()`); falls back to the legacy `scoring`
 * capability's `scoreValue`/`maxScore` for older worlds that haven't
 * adopted the ledger. The fallback path also serves stories that
 * track score outside the ledger (rare; ADR-129 is the recommended
 * pattern).
 *
 * `max: null` (not `0`) signals an unbounded score per ADR-163 §4
 * commentary; `maxScore: 0` is treated as null since a 0-cap scoring
 * system has no usable progress fraction.
 *
 * Returns `undefined` only when the world is missing entirely (test
 * harness with a stub) — `always`-mode then re-emits prev.
 */
export const scoreChannel: IOChannel<{ current: number; max: number | null }> = {
  id: 'score',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    // Try the ADR-129 ledger first.
    const world = ctx.world as
      | {
          getScore?: () => number;
          getMaxScore?: () => number;
        }
      | undefined;
    if (world && typeof world.getScore === 'function') {
      const current = world.getScore();
      const maxRaw = typeof world.getMaxScore === 'function' ? world.getMaxScore() : 0;
      const max = typeof maxRaw === 'number' && maxRaw > 0 ? maxRaw : null;
      return { current, max };
    }
    // Fall back to the legacy `scoring` capability.
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
 * Wire shape for the `info` channel — full story metadata.
 *
 * Optional fields are omitted from the emitted payload when empty so
 * renderers can branch cleanly on presence. The engine populates the
 * underlying `storyInfo` capability from `StoryConfig` + `StoryInfoTrait`
 * during `setStory()`.
 */
export interface StoryInfoPayload {
  title?: string;
  author?: string;
  version?: string;
  description?: string;
  buildDate?: string;
  engineVersion?: string;
  clientVersion?: string;
}

/**
 * `info` — replace-mode story metadata. Closure projects every
 * non-empty field from the `storyInfo` capability into a single
 * payload object. The same payload is consumed by the browser
 * `info` renderer (sets `document.title` + `data-*` attributes) and
 * by any author-supplied dashboards.
 */
export const infoChannel: IOChannel<StoryInfoPayload> = {
  id: 'info',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    const cap = readCapability<StoryInfoData>(ctx, 'storyInfo');
    if (!cap) return undefined;
    const payload: StoryInfoPayload = {};
    if (cap.title) payload.title = cap.title;
    if (cap.author) payload.author = cap.author;
    if (cap.version) payload.version = cap.version;
    if (cap.description) payload.description = cap.description;
    if (cap.buildDate) payload.buildDate = cap.buildDate;
    if (cap.engineVersion) payload.engineVersion = cap.engineVersion;
    if (cap.clientVersion) payload.clientVersion = cap.clientVersion;
    return payload;
  },
};

/**
 * `ifid` — replace-mode IFID string. Closure reads `storyInfo.ifid`
 * and skips emission when the value is empty (sparse-suppress style),
 * so stories without an IFID don't emit empty strings into the
 * channel state.
 */
export const ifidChannel: IOChannel<string> = {
  id: 'ifid',
  contentType: 'text',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    const cap = readCapability<StoryInfoData>(ctx, 'storyInfo');
    if (!cap || typeof cap.ifid !== 'string' || cap.ifid.length === 0) {
      return undefined;
    }
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
 * Discriminator values for `LifecyclePayload`.
 *
 * - `save_failed` — save handler reported failure or threw.
 * - `restore_failed` — restore handler returned no data, threw, or
 *   was not registered.
 * - `restore_completed` — restore succeeded; renderers should refresh
 *   any cached UI derived from world state.
 */
export type LifecycleEventKind =
  | 'save_failed'
  | 'restore_failed'
  | 'restore_completed';

/**
 * Wire shape for the `lifecycle` channel. `message` is populated for
 * the failure kinds and copied verbatim from the platform event's
 * `payload.error` field. Successful kinds (`restore_completed`) carry
 * no message — they are pure signals.
 */
export interface LifecyclePayload {
  kind: LifecycleEventKind;
  message?: string;
}

/**
 * Map a platform event's type to the lifecycle channel's discriminator.
 * Returns `undefined` for non-lifecycle events so the channel closure
 * can ignore them.
 */
function lifecycleKind(eventType: string): LifecycleEventKind | undefined {
  if (eventType === 'platform.save_failed') return 'save_failed';
  if (eventType === 'platform.restore_failed') return 'restore_failed';
  if (eventType === 'platform.restore_completed') return 'restore_completed';
  return undefined;
}

/**
 * Read `payload.error` from a platform-event-shaped object. Platform
 * events store completion data on `payload`, not on the
 * `ISemanticEvent.data` field that stdlib's other channels use, so
 * lifecycle has its own reader. Returns `undefined` for non-string or
 * absent values.
 */
function platformEventError(event: unknown): string | undefined {
  const payload = (event as { payload?: unknown }).payload as
    | { error?: unknown }
    | undefined;
  if (!payload) return undefined;
  if (typeof payload.error !== 'string') return undefined;
  return payload.error;
}

/**
 * `lifecycle` — event-mode save/restore signals. Projects the trio of
 * platform completion events (`platform.save_failed`,
 * `platform.restore_failed`, `platform.restore_completed`) into a
 * single sparse channel.
 *
 * Renderers branch on `payload.kind`: failures display `payload.message`
 * (or a fallback string), `restore_completed` triggers UI refresh
 * without text. Sparse-emit semantics mean turns without a lifecycle
 * event suppress emission entirely — the channel value retains its
 * prior state on quiet turns.
 *
 * If multiple lifecycle events appear in one turn, the **last** one
 * wins. In practice this is unobservable since each save/restore
 * operation produces exactly one completion event, but the rule is
 * documented so test authors don't expect first-wins semantics.
 */
export const lifecycleChannel: IOChannel<LifecyclePayload> = {
  id: 'lifecycle',
  contentType: 'json',
  mode: 'event',
  emit: 'sparse',
  produce: (ctx) => {
    let result: LifecyclePayload | undefined;
    for (const event of ctx.events) {
      const kind = lifecycleKind(event.type);
      if (!kind) continue;
      const message = platformEventError(event);
      result = message !== undefined ? { kind, message } : { kind };
    }
    return result;
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
  lifecycleChannel,
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
  LIFECYCLE: 'lifecycle',
} as const;

export type StandardChannelId =
  (typeof STANDARD_CHANNEL_IDS)[keyof typeof STANDARD_CHANNEL_IDS];

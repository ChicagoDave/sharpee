/**
 * @sharpee/stdlib/channels — standard `IOChannel` definitions.
 *
 * Owner context: stdlib language layer. The platform-vocabulary
 * channels from ADR-163 §4 — co-located with stdlib because their
 * closures read stdlib data sources (capabilities, blocks the
 * text-service produces, world projections).
 *
 * Per ADR-300 D8 there is no `main`: the seven prose elements each have
 * their own channel and the turn's reading order rides `preferred-layout`
 * (D9). Nothing here is "the prose window" — assembling one is the
 * client's decision, and `composeProse` in `@sharpee/channel-service` is
 * the shared rule for clients that want the engine's own order.
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

import type { IOChannel, ProseEntry, ProseChannelId } from '@sharpee/if-domain';
import { PREFERRED_LAYOUT_CHANNEL } from '@sharpee/if-domain';
import type { TextContent } from '@sharpee/text-blocks';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';
import { PLAYER_DIED_EVENT } from '../death/index.js';
import { PROSE_CHANNEL_BY_BLOCK_KEY, BANNER_KEYS } from './keys.js';
import { playerLocationName, readCapability } from './world-helpers.js';
import { characterAuthorChannel } from './character-author.js';

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
 * - `if.event.player.died` — the canonical player-death event (ADR-224),
 *   emitted by `killPlayer` from any death mechanism (combat, hazard,
 *   grue, gas). Re-pointed here from the pre-ADR-224 `combat.player_died`
 *   (a hard cutover — no alias; that name and its `@sharpee/ext-basic-combat`
 *   producer are retired). The `PLAYER_DIED` constant is the canonical
 *   `PLAYER_DIED_EVENT` imported from the `death` module so emitter and
 *   channel never drift (one wire shape).
 * - `game.score_changed` — no production emitter today. The channel
 *   listens for it, but it stays silent until a story or extension
 *   adopts the convention. Listed for forward-compatibility.
 *
 * Each event carries its message in `event.data.message` (string).
 */
export const STANDARD_CHANNEL_EVENTS = {
  PLAYER_DIED: PLAYER_DIED_EVENT,
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
 *  - title / authors / testers / version — `StoryConfig` (title falls
 *    back to `StoryInfoTrait` if config omits; authors/testers are
 *    arrays per ADR-298 — the wire stays data-only, consumers join)
 *  - ifid — `StoryConfig.ifid`
 *  - description — `StoryConfig.description` or `StoryInfoTrait.description`
 *  - prologue — `StoryConfig.prologue`, resolved to text by the engine
 *    at story start (phrase references included, ADR-298 D3)
 *  - buildDate — `StoryConfig.buildDate` or `StoryInfoTrait.buildDate`
 *  - engineVersion / clientVersion — `StoryInfoTrait` (set by build
 *    pipelines)
 */
interface StoryInfoData {
  title?: string;
  authors?: string[];
  testers?: string[];
  version?: string;
  ifid?: string;
  description?: string;
  prologue?: string;
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
 * Project one text block into a `ProseEntry`. Shared by every prose
 * channel's closure so the seven agree on entry shape by construction.
 */
function toProseEntry(block: {
  content: ReadonlyArray<TextContent>;
  tight?: boolean;
  className?: string;
}): ProseEntry {
  return {
    content: [...block.content],
    ...(block.tight ? { tight: true } : {}),
    ...(block.className ? { className: block.className } : {}),
  };
}

/**
 * Build one prose channel (ADR-300 D8).
 *
 * Each prose channel is append-mode `ProseEntry[]` carrying only the
 * blocks routed to its id, and `sparse` — a turn that produced no
 * `error` block does not emit an empty `error` array. A client that
 * wants the whole turn's prose reads `preferred-layout` and composes;
 * no channel is the prose window.
 *
 * @param id — the channel id, as it appears in `PROSE_CHANNEL_BY_BLOCK_KEY`
 */
function createProseChannel(id: ProseChannelId): IOChannel<ProseEntry> {
  return {
    id,
    contentType: 'json',
    mode: 'append',
    emit: 'sparse',
    produce: (ctx) => {
      const entries: ProseEntry[] = [];
      for (const block of ctx.blocks) {
        if (PROSE_CHANNEL_BY_BLOCK_KEY.get(block.key) === id) {
          entries.push(toProseEntry(block));
        }
      }
      return entries;
    },
  };
}

/** `room-name` — the room title line. */
export const roomNameChannel = createProseChannel('room-name');
/** `room-description` — the room's body prose. */
export const roomDescriptionChannel = createProseChannel('room-description');
/** `room-contents` — what is visible in the room. */
export const roomContentsChannel = createProseChannel('room-contents');
/** `action-result` — an action's success narration. */
export const actionResultChannel = createProseChannel('action-result');
/** `action-blocked` — why an action refused. */
export const actionBlockedChannel = createProseChannel('action-blocked');
/** `error` — parser and system errors. */
export const errorChannel = createProseChannel('error');
/** `game-message` — story and game-level messages. */
export const gameMessageChannel = createProseChannel('game-message');

/**
 * Every prose channel, in `PROSE_CHANNEL_IDS` order. Registration order,
 * not render order — see `preferredLayoutChannel`.
 */
export const PROSE_CHANNELS: ReadonlyArray<IOChannel<ProseEntry>> = [
  roomNameChannel,
  roomDescriptionChannel,
  roomContentsChannel,
  actionResultChannel,
  actionBlockedChannel,
  errorChannel,
  gameMessageChannel,
];

/**
 * `preferred-layout` — replace-mode reading order for this turn's prose
 * (ADR-300 D9).
 *
 * One entry per prose entry emitted this turn, naming the channel that
 * produced it, in block order. A channel id repeats when it produced
 * more than one entry, so the list reconstructs the engine's sequence
 * exactly — including the interleavings a fixed render order gets
 * wrong, like a move whose action result prints before the room name.
 *
 * It emits `always`, including the empty array on a turn that produced
 * no prose: a client composing from it needs to know the turn said
 * nothing, not re-render the previous turn.
 *
 * The engine's ordering knowledge does not vanish with `main` — it
 * stops being smuggled inside an append stream and becomes a signal a
 * client is free to disagree with.
 */
export const preferredLayoutChannel: IOChannel<string[]> = {
  id: PREFERRED_LAYOUT_CHANNEL,
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    const order: string[] = [];
    for (const block of ctx.blocks) {
      const channelId = PROSE_CHANNEL_BY_BLOCK_KEY.get(block.key);
      if (channelId !== undefined) order.push(channelId);
    }
    return order;
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
    // The ADR-129 ledger is the single home for scoring state (ADR-260 D1).
    // The `scoring` capability this once fell back to is deleted — it was
    // never registered by any production path, and the fallback was
    // unreachable anyway, since every world exposes getScore().
    const world = ctx.world as
      | {
          getScore?: () => number;
          getMaxScore?: () => number;
        }
      | undefined;
    if (!world || typeof world.getScore !== 'function') return undefined;
    const current = world.getScore();
    const maxRaw = typeof world.getMaxScore === 'function' ? world.getMaxScore() : 0;
    const max = typeof maxRaw === 'number' && maxRaw > 0 ? maxRaw : null;
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
  authors?: string[];
  testers?: string[];
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
    if (cap.authors?.length) payload.authors = cap.authors;
    if (cap.testers?.length) payload.testers = cap.testers;
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
 * Structured opening banner (ADR-163 §channel content types).
 *
 * Each piece is its own property rather than a run of prose lines, so a client
 * decides how the title, the versions and the credits are laid out instead of
 * receiving somebody else's paragraph breaks. A test can name one piece.
 */
export interface BannerData {
  title?: string;
  storyVersion?: string;
  platformVersion?: string;
  subtitle?: string;
  credits?: string[];
  /** Story-supplied closing lines (`game.banner.story-tail`). */
  tail?: string[];
}

/**
 * `banner` — replace-mode opening banner, carried as structured JSON.
 *
 * Its own channel rather than part of `main` so the opening is addressable:
 * the banner, the prologue and the first command's response become three
 * things a transcript can check separately, and a client can put the banner
 * wherever it wants instead of wherever the prose happened to land.
 *
 * The engine builds these blocks once, from `game.started`, so a turn that
 * produces none emits nothing.
 */
export const bannerChannel: IOChannel<BannerData> = {
  id: 'banner',
  contentType: 'json',
  mode: 'replace',
  emit: 'sparse',
  produce: (ctx) => {
    const banner: BannerData = {};
    let found = false;

    for (const block of ctx.blocks) {
      if (!BANNER_KEYS.has(block.key)) continue;
      found = true;
      const text = flattenContent(block.content);

      switch (block.className) {
        case 'game-title':        banner.title = text; break;
        case 'story-version':     banner.storyVersion = text; break;
        case 'platform-version':  banner.platformVersion = text; break;
        case 'sub-title':         banner.subtitle = text; break;
        case 'author-list':       (banner.credits ??= []).push(text); break;
        case 'banner-spacer':     break;
        // The story tail carries no class — it is whatever the story added.
        default:                  if (text) (banner.tail ??= []).push(text); break;
      }
    }

    return found ? banner : undefined;
  },
};

/**
 * `prologue` — replace-mode pre-banner prologue text (ADR-298 D3).
 * Closure reads `storyInfo.prologue` — resolved text the engine wrote
 * at story start (phrase references already resolved through the
 * phrase machinery) — and skips emission when absent or empty
 * (sparse-suppress, same pattern as `ifidChannel`). Emitted once in
 * practice: the value is set before the first packet and replace-mode
 * carries it unchanged. The platform's default client rendering order
 * places it before the banner.
 */
export const prologueChannel: IOChannel<string> = {
  id: 'prologue',
  contentType: 'text',
  mode: 'replace',
  emit: 'always',
  produce: (ctx) => {
    const cap = readCapability<StoryInfoData>(ctx, 'storyInfo');
    if (!cap || typeof cap.prologue !== 'string' || cap.prologue.length === 0) {
      return undefined;
    }
    return cap.prologue;
  },
};

/**
 * `death` — event-mode death notification. Closure looks for the
 * canonical `if.event.player.died` event (ADR-224) in this turn's events
 * and projects its `data.message` field. Stories that want different death
 * handling register a replacement `IOChannel` with id `'death'`
 * (last-write-wins per ADR-163 §6).
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
 * The platform-standard channels in iteration order. Order is
 * preserved for stable diffing in tests and manifests; the
 * `ChannelService` itself does not depend on ordering.
 */
export const STANDARD_CHANNELS: ReadonlyArray<IOChannel> = [
  // ORDER-SENSITIVE, part 1 — the opening precedes the turn it opens.
  // `prologue` and `banner` are story-start emissions that must reach a
  // client BEFORE the prose flush below, because a client that appends
  // each channel's output as it is dispatched renders them in this order.
  // Registered after `preferred-layout` they landed *behind* the first
  // room description (ADR-298 D3 says the prologue precedes the banner and
  // the banner opens the game). The CLI is unaffected either way: it
  // renders the banner through the prose path's classed blocks, not this
  // channel. `channels/standard.test.ts` pins this.
  prologueChannel,
  bannerChannel,
  // ADR-300 D9 — ORDER-SENSITIVE, part 2. `preferred-layout` must be
  // registered after every prose channel: the manifest is walked in
  // registration order, so a client that composes prose by buffering each
  // channel's entries and flushing them when the layout arrives depends on
  // the layout arriving last. `channels/standard.test.ts` pins this.
  ...PROSE_CHANNELS,
  preferredLayoutChannel,
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
  characterAuthorChannel,
];

/**
 * Channel id literals for the platform-standard set. Used by tests
 * and consumers that need string-literal types.
 */
export const STANDARD_CHANNEL_IDS = {
  ROOM_NAME: 'room-name',
  ROOM_DESCRIPTION: 'room-description',
  ROOM_CONTENTS: 'room-contents',
  ACTION_RESULT: 'action-result',
  ACTION_BLOCKED: 'action-blocked',
  ERROR: 'error',
  GAME_MESSAGE: 'game-message',
  PREFERRED_LAYOUT: 'preferred-layout',
  PROMPT: 'prompt',
  LOCATION: 'location',
  SCORE: 'score',
  TURN: 'turn',
  INFO: 'info',
  IFID: 'ifid',
  PROLOGUE: 'prologue',
  BANNER: 'banner',
  DEATH: 'death',
  ENDGAME: 'endgame',
  SCORE_NOTIFY: 'score_notify',
  LIFECYCLE: 'lifecycle',
  CHARACTER: 'character',
} as const;

export type StandardChannelId =
  (typeof STANDARD_CHANNEL_IDS)[keyof typeof STANDARD_CHANNEL_IDS];

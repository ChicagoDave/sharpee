/**
 * @sharpee/stdlib/channels — public surface.
 *
 * Owner context: stdlib language layer. Standard `IOChannel` vocabulary
 * for Sharpee's channel-I/O system (ADR-163 §6, §7, §14). Engine
 * bootstrap imports `channelRegistry` for `ChannelService` construction;
 * stories add or override channels via the `Story.registerChannels`
 * hook on the same registry.
 *
 * Public interface:
 *
 * - `channelRegistry` — the canonical `IChannelRegistry` instance,
 *   pre-populated with the ten standard channels + eleven static
 *   media channels.
 * - `StdlibChannelRegistry` — the underlying class (exported for tests
 *   and for any consumer that wants an isolated registry).
 * - Standard channel constants — the seven prose channels (ADR-300 D8),
 *   `preferredLayoutChannel` (D9), `promptChannel`, `scoreChannel`, etc.
 *   Plus `PROSE_CHANNELS`, `STANDARD_CHANNELS`, `STANDARD_CHANNEL_IDS`,
 *   `STANDARD_CHANNEL_EVENTS`, `StandardChannelId`.
 * - Media channel constants — `imageBackgroundChannel`,
 *   `imageMainChannel`, `imageOverlayChannel`, `imagePreloadChannel`,
 *   `soundChannel`, `musicChannel`, `animationChannel`,
 *   `animateChannel`, `transitionChannel`, `layoutChannel`,
 *   `clearChannel`. Plus `MEDIA_CHANNELS`, `MEDIA_CHANNEL_IDS`,
 *   `MEDIA_EVENT_TYPES`, `MediaChannelId`, `MediaEventType`.
 * - Builders for dynamic channels — `createImageChannel(layer)`,
 *   `createAmbientChannel(id)`. Plus `imageChannelIdFromEvent` helper.
 * - `PROSE_CHANNEL_BY_BLOCK_KEY` — the block-key → channel routing table
 *   the seven prose channels and `preferred-layout` share. The ids
 *   themselves come from `@sharpee/if-domain`.
 * - `BANNER_KEYS` — block-key set the `bannerChannel` filters against.
 *
 * Re-exports the `IChannelRegistry` and `IOChannel` types from
 * `@sharpee/if-domain` so authors can write channel definitions
 * without a separate import line.
 */

export { channelRegistry, StdlibChannelRegistry } from './registry.js';

export {
  // Prose channels (ADR-300 D8) and the ordering signal (D9)
  roomNameChannel,
  roomDescriptionChannel,
  roomContentsChannel,
  actionResultChannel,
  actionBlockedChannel,
  errorChannel,
  gameMessageChannel,
  PROSE_CHANNELS,
  preferredLayoutChannel,
  // Channel objects
  promptChannel,
  locationChannel,
  scoreChannel,
  turnChannel,
  infoChannel,
  ifidChannel,
  prologueChannel,
  bannerChannel,
  deathChannel,
  endgameChannel,
  scoreNotifyChannel,
  lifecycleChannel,
  // Sets
  STANDARD_CHANNELS,
  STANDARD_CHANNEL_IDS,
  STANDARD_CHANNEL_EVENTS,
  // Types
  type StandardChannelId,
  type BannerData,
  type LifecycleEventKind,
  type LifecyclePayload,
} from './standard.js';

// The character author channel (ADR-318 D11 — "explain this NPC's turn")
export {
  characterAuthorChannel,
  type CharacterAuthorRow,
} from './character-author.js';

// The scene wire channels (ADR-320 D12 — scene events, exchange
// response affordances, and D14 thread continuability, author-gated
// per AC11)
export {
  sceneChannel,
  exchangeAffordancesChannel,
  threadAffordancesChannel,
  type SceneChannelRow,
} from './scene.js';

export {
  // Channel objects
  imagePreloadChannel,
  imageBackgroundChannel,
  imageMainChannel,
  imageOverlayChannel,
  soundChannel,
  musicChannel,
  animationChannel,
  animateChannel,
  transitionChannel,
  layoutChannel,
  clearChannel,
  // Sets
  MEDIA_CHANNELS,
  MEDIA_CHANNEL_IDS,
  MEDIA_EVENT_TYPES,
  // Builders
  createImageChannel,
  createAmbientChannel,
  imageChannelIdFromEvent,
  // Types
  type MediaChannelId,
  type MediaEventType,
} from './media.js';

// Spatial sound channel (ADR-172)
export {
  audibilityChannel,
  SOUND_CHANNELS,
  SOUND_CHANNEL_IDS,
  SOUND_EVENT_TYPES,
  type SoundChannelId,
  type SoundEventType,
} from './sound-events.js';

export { PROSE_CHANNEL_BY_BLOCK_KEY, BANNER_KEYS } from './keys.js';

// Re-export the registry/channel types from if-domain for author
// convenience — story code can `import { type IChannelRegistry } from
// '@sharpee/stdlib'` without a second import line.
export type { IChannelRegistry, IOChannel, ChannelProduceContext } from '@sharpee/if-domain';

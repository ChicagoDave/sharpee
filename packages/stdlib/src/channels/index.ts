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
 * - Standard channel constants — `mainChannel`, `promptChannel`,
 *   `scoreChannel`, etc. Plus `STANDARD_CHANNELS`, `STANDARD_CHANNEL_IDS`,
 *   `STANDARD_CHANNEL_EVENTS`, `StandardChannelId`.
 * - Media channel constants — `imageBackgroundChannel`,
 *   `imageMainChannel`, `imageOverlayChannel`, `imagePreloadChannel`,
 *   `soundChannel`, `musicChannel`, `animationChannel`,
 *   `animateChannel`, `transitionChannel`, `layoutChannel`,
 *   `clearChannel`. Plus `MEDIA_CHANNELS`, `MEDIA_CHANNEL_IDS`,
 *   `MEDIA_EVENT_TYPES`, `MediaChannelId`, `MediaEventType`.
 * - Builders for dynamic channels — `createImageChannel(layer)`,
 *   `createAmbientChannel(id)`. Plus `imageChannelIdFromEvent` helper.
 * - `MAIN_KEYS` — block-key set the `mainChannel` filters against.
 *
 * Re-exports the `IChannelRegistry` and `IOChannel` types from
 * `@sharpee/if-domain` so authors can write channel definitions
 * without a separate import line.
 */

export { channelRegistry, StdlibChannelRegistry } from './registry';

export {
  // Channel objects
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
  // Sets
  STANDARD_CHANNELS,
  STANDARD_CHANNEL_IDS,
  STANDARD_CHANNEL_EVENTS,
  // Types
  type StandardChannelId,
  type LifecycleEventKind,
  type LifecyclePayload,
} from './standard';

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
} from './media';

// Spatial sound channel (ADR-172)
export {
  audibilityChannel,
  SOUND_CHANNELS,
  SOUND_CHANNEL_IDS,
  SOUND_EVENT_TYPES,
  type SoundChannelId,
  type SoundEventType,
} from './sound-events';

export { MAIN_KEYS } from './keys';

// Re-export the registry/channel types from if-domain for author
// convenience — story code can `import { type IChannelRegistry } from
// '@sharpee/stdlib'` without a second import line.
export type { IChannelRegistry, IOChannel, ChannelProduceContext } from '@sharpee/if-domain';

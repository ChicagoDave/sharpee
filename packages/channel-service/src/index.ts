/**
 * @sharpee/channel-service
 *
 * Universal channel-I/O wire producer for Sharpee surfaces.
 *
 * Owner context: platform package — runs in-process wherever the engine runs
 * (Node CLI, multi-user server, browser zifmia, platform-browser).
 *
 * Public interface (per ADR-163 decision 12):
 * - Wire-protocol types — `HelloPacket`, `CmgtPacket`, `TurnPacket`,
 *   `CommandPacket`, `ChannelDefinition`, `ChannelContentType`,
 *   `ClientCapabilities`. Re-exported from `./wire`.
 * - Registry functions — `registerChannel`, `getChannelRegistry`,
 *   `getCapabilities`, `addRule`, `addRules`, `registerHello`. (pending)
 * - Producers — `produceCmgtManifest`, `produceTurnPacket`. (pending)
 *
 * @see ADR-163 — Channel-Service Platform
 */

// Wire-protocol types (AC-2)
export type {
  HelloPacket,
  CmgtPacket,
  TurnPacket,
  CommandPacket,
  WirePacket,
  ChannelDefinition,
  ChannelContentType,
  ChannelMode,
  ChannelEmitPolicy,
  ClientCapabilities,
  Decoder,
  DecoderState,
} from './wire';
export { createDecoder } from './wire';

// Producer-side rule types (decision 12, §7)
export type {
  ChannelRule,
  ChannelRuleWhen,
  ChannelRuleEmit,
  ChannelRuleExtract,
  ChannelRuleInput,
  ChannelRuleChannelResolver,
} from './types';

// Registry (decision 12, AC-11)
export {
  registerHello,
  getCapabilities,
  registerChannel,
  getChannelRegistry,
  addRule,
  addRules,
  resetSession,
  type RegisterChannelOptions,
  type CapabilityFlag,
} from './registry';

// CMGT producer (decisions 6, 11, AC-4, AC-5, AC-11)
export {
  produceCmgtManifest,
  PROTOCOL_VERSION,
} from './produce-cmgt';

// Turn producer (decisions 1, 5, 10, 12, AC-3, AC-9, AC-10, AC-11)
export {
  produceTurnPacket,
  type ProduceTurnPacketInput,
} from './produce-turn';

// Standard channels (decision 4, AC-1)
export {
  STANDARD_CHANNEL_IDS,
  STANDARD_CHANNELS,
  registerStandardChannels,
  type StandardChannelId,
} from './standard-channels';

// Platform default rules (decision 12, AC-1)
export {
  platformRules,
  registerPlatformRules,
  flattenContent,
} from './platform-rules';

// Media channels (decisions 6, 7, AC-6)
export {
  MEDIA_CHANNEL_IDS,
  MEDIA_CHANNELS,
  registerMediaChannels,
  registerAmbientChannel,
  type MediaChannelId,
} from './media-channels';

// Media routing rules (decisions 7, 9, AC-6)
export {
  MEDIA_EVENT_TYPES,
  mediaRules,
  registerMediaRules,
  type MediaEventType,
} from './media-rules';

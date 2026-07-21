/**
 * @sharpee/if-domain/channels — channel-I/O type contracts.
 *
 * Owner context: domain layer. Single canonical home for the channel
 * type contracts shared across the channel-I/O subsystem (ADR-163 §14
 * + CLAUDE.md rule 7b).
 *
 * Public interface:
 *
 * - `IOChannel<T>`, `IChannelRegistry`, `ChannelProduceContext` — the
 *   closure-per-channel definition contract (ADR-163 §6, §7).
 * - `ChannelContentType`, `ChannelMode`, `ChannelEmitPolicy` — channel
 *   configuration enums (§3, §4, §5).
 * - `ClientCapabilities`, `CapabilityFlag` — capability declaration and
 *   the gating discriminator (§2, §6).
 * - `ChannelDefinition`, `HelloPacket`, `CmgtPacket`, `TurnPacket`,
 *   `CommandPacket`, `WirePacket` — wire-protocol packets (§1, §11).
 *
 * @see ADR-163 — Channel-Service Platform
 */

export type {
  ChannelContentType,
  ChannelMode,
  ChannelEmitPolicy,
  ClientCapabilities,
  CapabilityFlag,
  ChannelProduceContext,
  IOChannel,
  IChannelRegistry,
  MainEntry,
} from './types.js';

export type {
  ChannelDefinition,
  HelloPacket,
  CmgtPacket,
  TurnPacket,
  CommandPacket,
  WirePacket,
} from './wire.js';

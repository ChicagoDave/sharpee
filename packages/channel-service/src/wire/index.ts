/**
 * @sharpee/channel-service/wire
 *
 * Wire-protocol module — re-exports the seven public wire types
 * declared by ADR-163 §12 / AC-2. Imported directly by every Sharpee
 * surface (CLI, platform-browser, zifmia, multi-user server, multi-user
 * client) per CLAUDE.md rule 7b.
 */

export type {
  // Packet kinds
  HelloPacket,
  CmgtPacket,
  TurnPacket,
  CommandPacket,
  WirePacket,
  // Channel descriptors
  ChannelDefinition,
  ChannelContentType,
  ChannelMode,
  ChannelEmitPolicy,
  // Capability negotiation
  ClientCapabilities,
} from './types';

export { createDecoder, type Decoder, type DecoderState } from './decoder';

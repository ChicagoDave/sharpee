/**
 * @sharpee/channel-service/wire
 *
 * Wire-protocol module — re-exports the wire-protocol types from
 * `@sharpee/if-domain`, the canonical home for channel type contracts
 * (CLAUDE.md rule 7b, ADR-163 §14).
 *
 * Why this subpath still exists: a number of consumers historically
 * imported wire types from `@sharpee/channel-service/wire`. Keeping the
 * subpath stable means those imports continue to resolve after the
 * R1 rewrite. New code should import from `@sharpee/if-domain` directly.
 *
 * The decoder is the only runtime symbol exported here — its
 * implementation stays in this package because it carries
 * bootstrap-order enforcement state.
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
} from '@sharpee/if-domain';

export { createDecoder, type Decoder, type DecoderState } from './decoder.js';

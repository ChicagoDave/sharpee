/**
 * WebSocket wire types re-exported from the server's authoritative definitions.
 *
 * Public interface: {@link ClientMsg}, {@link ServerMsg}, {@link RoomSnapshot},
 * {@link ParticipantSummary}, {@link Tier}, {@link TextBlock},
 * {@link DomainEvent}.
 *
 * Bounded context: client-facing WebSocket protocol (ADR-153 Interface Contracts).
 *
 * Unlike the HTTP shapes in `./api.ts` (which are hand-mirrored to keep the
 * client self-contained), the WS protocol types are re-exported from the
 * server source via relative import. The WS surface is the hot path for
 * Plans 02–04 — keeping one authoritative definition avoids silent drift as
 * new `ServerMsg` kinds land.
 */

export type {
  ClientMsg,
  ServerMsg,
  RoomSnapshot,
  ParticipantSummary,
  ChatEntry,
  Tier,
  TextBlock,
  DomainEvent,
} from '../../../src/wire/browser-server';

// ADR-162 world-model replication: re-export the read-only narrowing
// from the server-side wire-type module so the client uses the same
// authoritative definition (per CLAUDE.md rule 7b — co-located wire-type
// sharing).
export type {
  ReadOnlyWorldModel,
  SerializedWorldModel,
} from '../../../src/wire/world-mirror';

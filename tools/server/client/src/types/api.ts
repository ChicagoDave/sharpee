/**
 * HTTP wire types — re-exported from the server's authoritative
 * definitions in `../../../src/wire/http-api`.
 *
 * Public interface: re-exports the contracts the client uses against the
 * Node server's HTTP routes (ADR-153 Interface Contracts, ADR-161
 * identity lifecycle).
 *
 * Bounded context: HTTP boundary between client and server. Both sides
 * import from the same file under `tools/server/src/wire/`. Any rename
 * or removal on the server compiles the client in the same commit, or
 * fails the type checker in the same commit — drift is mechanically
 * prevented.
 *
 * Companion to `./wire.ts`, which re-exports the WebSocket protocol
 * types from `../../src/wire/browser-server`.
 */

export type {
  ErrorEnvelope,
  StorySummary,
  ListStoriesResponse,
  RoomParticipantSummary,
  RoomSummary,
  ListRoomsResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  ResolveCodeResponse,
  RenameRoomRequest,
  RenameRoomResponse,
  CreateIdentityRequest,
  CreateIdentityResponse,
  UploadIdentityRequest,
  UploadIdentityResponse,
  EraseIdentityRequest,
  EraseIdentityResponse,
} from '../../../src/wire/http-api';

/**
 * HTTP wire protocol — request and response shapes shared between the
 * Node server and the browser client.
 *
 * Public interface: {@link ErrorEnvelope}, {@link StorySummary},
 * {@link ListStoriesResponse}, {@link RoomSummary},
 * {@link ListRoomsResponse}, {@link CreateRoomRequest},
 * {@link CreateRoomResponse}, {@link JoinRoomRequest},
 * {@link JoinRoomResponse}, {@link ResolveCodeResponse},
 * {@link RenameRoomRequest}, {@link RenameRoomResponse},
 * {@link CreateIdentityRequest}, {@link CreateIdentityResponse},
 * {@link UploadIdentityRequest}, {@link UploadIdentityResponse},
 * {@link EraseIdentityRequest}, {@link EraseIdentityResponse}.
 *
 * Bounded context: HTTP boundary between client and server (ADR-153
 * frontend addendum). Companion to {@link ./browser-server.ts}, which
 * defines the WebSocket protocol. Both files are imported by the client
 * via the `../../../src/wire/*` relative path so a server change either
 * compiles the client in the same commit or fails the type checker in
 * the same commit — drift is mechanically prevented.
 *
 * Invariants:
 *   - Types here MUST NOT reference Node-only or DOM-only globals
 *     (`Buffer`, `fs.Stats`, `DOMException`, …). Both runtimes import
 *     this file and either-side breakage is silent until a consumer
 *     gets reached.
 *   - Field naming uses `snake_case` to match JSON conventions on the
 *     wire and avoid client/server casing drift.
 *   - Adding a field is always safe; renaming or removing a field
 *     touches both sides — that is the whole point of co-locating the
 *     definitions.
 *
 * The `*Deps` and `*Body` (raw-parser) interfaces remain in their
 * route files because they are server-only — `*Deps` describes
 * dependency-injection at registration time and `*Body` is a
 * runtime-validation receiver for untrusted JSON whose fields are all
 * `unknown` until narrowed.
 */

// ---------- Error envelope ----------

/** Uniform 4xx/5xx body shape used across every HTTP route. */
export interface ErrorEnvelope {
  code: string;
  detail: string;
}

// ---------- GET /api/stories ----------

export interface StorySummary {
  slug: string;
  title: string;
  path: string;
}

export interface ListStoriesResponse {
  stories: StorySummary[];
}

// ---------- GET /api/rooms ----------

/**
 * One participant in a room, projected onto the public landing-page
 * roster. ADR-161: Handle replaces the old `display_name` field; the
 * server resolves `participants.identity_id → identities.handle` at
 * read time.
 */
export interface RoomParticipantSummary {
  handle: string;
}

/**
 * Public, non-secret room summary returned to the landing page.
 *
 * `participants` is the connected roster as Handles; the client
 * derives the count from `participants.length` and may render the
 * Handles inline as a roster preview (ADR-161 Phase F).
 */
export interface RoomSummary {
  room_id: string;
  title: string;
  story_slug: string;
  participants: RoomParticipantSummary[];
  last_activity_at: string;
}

export interface ListRoomsResponse {
  rooms: RoomSummary[];
}

// ---------- POST /api/rooms ----------

export interface CreateRoomRequest {
  story_slug: string;
  title: string;
  handle: string;
  passcode: string;
  captcha_token?: string;
}

export interface CreateRoomResponse {
  room_id: string;
  join_code: string;
  join_url: string;
  token: string;
  tier: 'primary_host';
  participant_id: string;
}

// ---------- POST /api/rooms/:room_id/join ----------

export interface JoinRoomRequest {
  handle: string;
  passcode: string;
  captcha_token?: string;
}

export interface JoinRoomResponse {
  participant_id: string;
  token: string;
  tier: 'participant' | 'command_entrant' | 'co_host' | 'primary_host';
}

// ---------- GET /r/:code ----------

export interface ResolveCodeResponse {
  room_id: string;
  title: string;
  story_slug: string;
  pinned: boolean;
}

// ---------- PATCH /api/rooms/:room_id ----------

export interface RenameRoomRequest {
  title: string;
}

export interface RenameRoomResponse {
  room_id: string;
  title: string;
}

// ---------- ADR-161 identity lifecycle ----------

export interface CreateIdentityRequest {
  handle: string;
}

export interface CreateIdentityResponse {
  id: string;
  handle: string;
  /** Plaintext passcode — returned exactly once at creation time. */
  passcode: string;
}

export interface UploadIdentityRequest {
  id: string;
  handle: string;
  passcode: string;
}

export interface UploadIdentityResponse {
  id: string;
  handle: string;
}

export interface EraseIdentityRequest {
  handle: string;
  passcode: string;
}

export interface EraseIdentityResponse {
  erased: true;
}

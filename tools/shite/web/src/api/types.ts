/**
 * @module zifmia/web/api/types
 * @purpose Wire-type definitions for the Zifmia HTTP API as consumed
 *   by the web client. Mirrors the response shapes emitted by
 *   `tools/zifmia/src/server/*` route handlers.
 * @owner Zifmia web client (tools/zifmia/web).
 *
 * The web bundle and the Fastify server live in the same repo and the
 * same typed language; per CLAUDE.md rule 8b, this file is the wire
 * contract. When the server's response shape changes, this file
 * changes in the same commit. No runtime-specific types
 * (`Buffer`, `fs.Stats`, etc.) appear here so the file remains safe to
 * import from both sides.
 */

/**
 * Successful body of `POST /api/identities` (handle claim) — the new
 * identity row. No passcode or session token per the 2026-05-12
 * ADR-161 amendment. `isAdmin` is included so the client can decide
 * whether to surface the `#admin` route immediately after creation.
 */
export interface IdentityRecord {
  id: string;
  handle: string;
  isAdmin: boolean;
}

/** Successful body of `POST /api/identities/erase`. */
export interface EraseResponse {
  erased: string;
}

/**
 * Successful body of `GET /rooms`. Mirrors `Room` from
 * `tools/zifmia/src/storage/types.ts` (server-side wire shape). Listed
 * verbatim here so the web bundle does not pull in server-only modules
 * (`better-sqlite3`, etc.).
 */
export interface RoomSummary {
  id: string;
  storyId: string;
  bundleVersion: string;
  title: string;
  public: boolean;
  createdBy: string;
  createdAt: number;
  closedAt?: number;
}

/**
 * Successful body of `POST /rooms`. The server returns the full
 * created `Room`; the client treats it as a `RoomSummary` for
 * navigation purposes.
 */
export type CreatedRoom = RoomSummary;

/** Request body for `POST /rooms`. */
export interface CreateRoomRequest {
  storyId: string;
  title: string;
  /** Optional; defaults to true on the server when omitted. */
  public?: boolean;
}

/**
 * One entry in `GET /stories`. Public projection of
 * `StoryLibraryEntry` — drops admin-only fields (`installedBy`,
 * `installedAt`, per-version list).
 */
export interface StorySummary {
  storyId: string;
  title: string;
  version: string;
}

/** Successful body of `GET /stories`. */
export interface StoriesResponse {
  stories: StorySummary[];
}

/**
 * Submitter attribution on transcript entries and turn broadcasts.
 * Mirrors the shape produced by the engine wire (`TranscriptEntry`)
 * and the WebSocket `turn:broadcast` payload.
 */
export interface TurnSubmitter {
  identityId: string;
  handle: string;
}

/**
 * Forwardable engine event. The server-side `TurnEvent` carries
 * `type` (`if.event.*` / `platform.*`) and an opaque `data`. The web
 * client treats the field as pass-through for the channel-service
 * renderer; no per-type unpacking happens at the type level.
 */
export interface TurnEvent {
  type: string;
  data: Record<string, unknown>;
}

/** One entry in the transcript window returned by `GET /rooms/:id/state`. */
export interface TranscriptEntry {
  turn: number;
  command: string;
  submitter: TurnSubmitter;
  /** Raw text blocks from the engine. Always present. */
  blocks: unknown[];
  /** Forwarded engine events. Always present. */
  events: TurnEvent[];
  /**
   * Channel-typed `TurnPacket` from `@sharpee/if-domain`. Optional:
   * entries written before Phase 6c-server have no channelPacket and
   * the client falls back to plain-text rendering of `blocks`.
   */
  channelPacket?: ChannelTurnPacket;
}

/**
 * Re-exported channel wire types. Importing from `@sharpee/if-domain`
 * directly is also valid; this alias keeps the call-site clear that
 * the wire packet (not anything else named TurnPacket) is meant.
 */
export type ChannelTurnPacket = import('@sharpee/if-domain').TurnPacket;
export type ChannelCmgtPacket = import('@sharpee/if-domain').CmgtPacket;

/** Successful body of `GET /rooms/:id/state`. */
export interface RoomStateBody {
  /** Capability-filtered manifest for the room's pinned bundle. */
  cmgt: ChannelCmgtPacket | null;
  transcript: TranscriptEntry[];
  /** Reserved for future channel-state snapshots (Phase 6 follow-up). */
  currentValues: Record<string, unknown>;
}

/**
 * Successful body of `POST /rooms/:id/command`. Mirrors the engine
 * wire's `TurnPacket` (see `tools/zifmia/src/engine/types.ts`). The
 * submitter receives this as the HTTP response; observers receive
 * the same payload via WS `turn:broadcast`.
 */
export interface TurnPacketResponse {
  turn: number;
  blocks: unknown[];
  events: TurnEvent[];
  channelPacket: ChannelTurnPacket;
}

/**
 * One named-save row. Mirrors `NamedSave` from the server's storage
 * types (`tools/zifmia/src/storage/types.ts`).
 */
export interface NamedSave {
  saveId: string;
  roomId: string;
  atTurn: number;
  label: string;
  createdBy: string;
  createdAt: number;
}

/** Request body for `POST /rooms/:id/saves`. */
export interface CreateNamedSaveRequest {
  label: string;
  /** Optional — defaults to the latest save_blob's turn. */
  atTurn?: number;
}

/** Successful body of `POST /rooms/:id/restore`. */
export interface RestoreResponse {
  roomId: string;
  atTurn: number;
}

// ── Admin (6f-admin) ─────────────────────────────────────────────

/**
 * Full admin projection of a `StoryLibraryEntry` row. Mirrors the
 * server type; the admin endpoint serializes every field (unlike the
 * public `StorySummary` which collapses to one entry per storyId).
 */
export interface AdminStoryEntry {
  storyId: string;
  version: string;
  ifid: string;
  title: string;
  installedBy: string;
  installedAt: number;
  active: boolean;
}

/** Successful body of `GET /admin/stories`. */
export interface AdminStoriesResponse {
  stories: AdminStoryEntry[];
}

/**
 * Audit log row (admin-only). Mirrors the server `AuditEntry`. The
 * `detail` field is a JSON string per the server contract — clients
 * may parse it lazily when rendering.
 */
export interface AdminAuditEntry {
  id: string;
  ts: number;
  actorId: string | null;
  action: string;
  targetKind: 'story' | 'room' | 'identity' | 'system';
  targetId: string;
  detail: string;
}

/** Successful body of `GET /admin/audit`. */
export interface AdminAuditResponse {
  entries: AdminAuditEntry[];
}

/**
 * Public projection of an identity row returned by
 * `GET /admin/identities`. Never carries `passcodeHash`.
 */
export interface AdminIdentitySummary {
  id: string;
  handle: string;
  isAdmin: boolean;
  createdAt: number;
}

/** Successful body of `GET /admin/identities?handle=...`. */
export interface AdminIdentitiesResponse {
  identities: AdminIdentitySummary[];
}

/**
 * Successful body of `POST /admin/identities/:id/erase`.
 *
 * Per the 2026-05-12 ADR-161 amendment, the "rescue the user" UX is
 * admin-driven erase (frees the handle) followed by the user
 * re-claiming via `POST /api/identities`. There is no passcode to
 * reset.
 */
export interface AdminEraseResponse {
  erased: string;
  identityId: string;
}

/** Server error envelopes share a common shape: `{error, detail?}`. */
export interface ServerError {
  error: string;
  detail?: string;
}

/**
 * Discriminated result for client-side API calls. `ok=true` carries
 * the typed response body; `ok=false` carries the server's error
 * envelope plus the HTTP status. Callers branch on `result.ok` and
 * never throw on expected-4xx outcomes.
 */
export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string; detail?: string };

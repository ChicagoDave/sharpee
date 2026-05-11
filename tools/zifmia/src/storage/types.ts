/**
 * @module @sharpee/zifmia/storage/types
 * @purpose Domain shapes for every row that lives in the Zifmia storage adapter.
 * @owner Zifmia server — adapter contract (ADR-175 §3 state inventory).
 *
 * These types are the wire-level view of the persistent state inventory in
 * ADR-175 §Decision 3. Every adapter implementation (SQLite, Postgres)
 * round-trips these shapes verbatim. Adding a field here is an ADR-level
 * change — it expands the durable state the server promises to hold.
 */

/** ADR-161 identity row. */
export interface Identity {
  id: string;
  handle: string;
  passcodeHash: string;
  createdAt: number;
}

/** A `(storyId, version)` pair pinning a room to the bundle version that
 * produced its saves. Per ADR-175 §AC-5: in-flight rooms finish under
 * the bundle version they were created under. */
export interface BundleRef {
  storyId: string;
  version: string;
}

/** ADR-175 Decision 3 — room metadata. */
export interface Room {
  id: string;
  storyId: string;
  bundleVersion: string;
  title: string;
  public: boolean;
  createdBy: string;
  createdAt: number;
  /** Set when an admin kills the room; absent on active rooms. */
  closedAt?: number;
}

/** ADR-175 Decision 3 / ADR-164 §4 — one row per turn, keyed on
 * `(roomId, turn)`. Payload is the gzipped `world.toJSON()` containing
 * both world state and transcript. */
export interface SaveBlob {
  roomId: string;
  turn: number;
  /** Save format version per ADR-164 Decision 7 (currently v3). */
  formatVersion: number;
  /** Bundle that produced this blob — pinned per ADR-175 §AC-5. */
  bundleVersion: string;
  payload: Uint8Array;
  createdAt: number;
}

/** ADR-175 Decision 5 — pointer into the `save_blobs` stream. */
export interface NamedSave {
  saveId: string;
  roomId: string;
  atTurn: number;
  label: string;
  createdBy: string;
  createdAt: number;
}

/** ADR-164 §3 chat message row. */
export interface ChatMessage {
  id: string;
  roomId: string;
  fromId: string;
  /** Denormalized handle at send time — message attribution is fixed
   * even if the sender later renames. */
  fromHandle: string;
  text: string;
  ts: number;
}

/** ADR-175 §AC-12 — story library row. Bundles themselves live in a
 * separate table keyed on `(storyId, version)`. */
export interface StoryLibraryEntry {
  storyId: string;
  version: string;
  ifid: string;
  title: string;
  installedBy: string;
  installedAt: number;
  /** False once an admin removes the story; existing rooms continue
   * but no new rooms can be created against this version. */
  active: boolean;
}

/** ADR-175 §4 — admin audit log entry. */
export interface AuditEntry {
  id: string;
  ts: number;
  /** Identity that performed the action; null for system-originated
   * events. */
  actorId: string | null;
  /** Dotted action name, e.g. `story.install`, `room.kill`,
   * `identity.passcode_reset`. */
  action: string;
  targetKind: 'story' | 'room' | 'identity' | 'system';
  targetId: string;
  /** JSON-encoded detail payload. Adapter stores it as a string. */
  detail: string;
}

/** Adapter self-description used by `/health` and operator diagnostics. */
export interface AdapterDescription {
  kind: 'sqlite' | 'postgres';
  /** Driver-reported version string, for debugging only. */
  driverVersion: string;
}

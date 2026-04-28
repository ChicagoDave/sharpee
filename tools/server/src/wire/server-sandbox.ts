/**
 * Wire protocol between the Node server and the Deno story sandbox.
 *
 * Public interface: the discriminated union {@link SandboxMessage}
 * (every message that can travel in either direction) and the
 * directional unions {@link ServerToSandboxMessage} / {@link SandboxToServerMessage}.
 *
 * Bounded context: runtime host interface (ADR-153 Decision 1, Decision 2).
 * Messages are JSON, newline-delimited over the sandbox process's stdio.
 * Binary save blobs are base64-encoded inside the JSON envelope.
 */

import type { TextBlock, DomainEvent } from './primitives.js';
import type { SerializedWorldModel } from './world-mirror.js';

/** Current wire protocol version. Servers and sandboxes that disagree refuse to proceed. */
export const PROTOCOL_VERSION = 1;

// ---------- Lifecycle ----------

export interface Init {
  kind: 'INIT';
  room_id: string;
  story_file: string;
  seed?: string;
  protocol: number;
}

export interface Ready {
  kind: 'READY';
  story_metadata: { title: string; author?: string; version?: string };
}

export interface Shutdown {
  kind: 'SHUTDOWN';
}

export interface Exited {
  kind: 'EXITED';
  reason: 'clean' | 'crash' | 'limit' | 'shutdown';
  stats?: unknown;
}

// ---------- Turn execution ----------

export interface Command {
  kind: 'COMMAND';
  turn_id: string;
  input: string;
  actor?: string;
}

export interface Output {
  kind: 'OUTPUT';
  turn_id: string;
  text_blocks: TextBlock[];
  events: DomainEvent[];
  /**
   * Serialized world snapshot (ADR-162). Receivers hydrate via
   * `new WorldModel().loadJSON(world)`. Sandbox always populates
   * this on a successful turn; on `world.toJSON()` failure the
   * sandbox emits an ERROR (`phase: 'turn'`) and suppresses the
   * OUTPUT entirely.
   */
  world: SerializedWorldModel;
}

export interface Cancel {
  kind: 'CANCEL';
  turn_id: string;
}

// ---------- Save / Restore ----------

export interface SaveRequest {
  kind: 'SAVE';
  save_id: string;
}

export interface SaveResponse {
  kind: 'SAVED';
  save_id: string;
  blob_b64: string;
}

export interface Restore {
  kind: 'RESTORE';
  save_id: string;
  blob_b64: string;
}

export interface Restored {
  kind: 'RESTORED';
  save_id: string;
  text_blocks: TextBlock[];
  /**
   * Post-restore world snapshot (ADR-162). Clients re-hydrate without
   * waiting for the next look. Sandbox always populates this on a
   * successful restore; on `world.toJSON()` failure the sandbox emits
   * an ERROR (`phase: 'turn'`) and suppresses the RESTORED entirely.
   */
  world: SerializedWorldModel;
}

// ---------- Status (ADR-162 Decision 6) ----------

/**
 * Request a fresh world snapshot from the sandbox without executing a turn.
 * Used by the server's welcome path when no held mirror exists.
 */
export interface StatusRequest {
  kind: 'STATUS_REQUEST';
}

/**
 * Sandbox reply to a {@link StatusRequest}: a serialized world snapshot
 * captured immediately, with no turn execution and no event side effects.
 */
export interface Status {
  kind: 'STATUS';
  world: SerializedWorldModel;
}

// ---------- Health + errors ----------

export interface Heartbeat {
  kind: 'HEARTBEAT';
  turn_id?: string;
  stats?: unknown;
}

export interface WireError {
  kind: 'ERROR';
  phase: 'init' | 'turn' | 'save' | 'restore' | 'limit';
  turn_id?: string;
  detail: string;
}

export type ServerToSandboxMessage = Init | Command | Cancel | SaveRequest | Restore | StatusRequest | Shutdown;
export type SandboxToServerMessage = Ready | Output | SaveResponse | Restored | Status | Heartbeat | WireError | Exited;
export type SandboxMessage = ServerToSandboxMessage | SandboxToServerMessage;

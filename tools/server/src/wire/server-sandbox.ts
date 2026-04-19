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

import type { TextBlock, DomainEvent } from '../repositories/types.js';

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

export type ServerToSandboxMessage = Init | Command | Cancel | SaveRequest | Restore | Shutdown;
export type SandboxToServerMessage = Ready | Output | SaveResponse | Restored | Heartbeat | WireError | Exited;
export type SandboxMessage = ServerToSandboxMessage | SandboxToServerMessage;

/**
 * @module @sharpee/zifmia/engine/save-envelope
 * @purpose Zifmia's outer wrapper around the engine's `ISaveData`.
 *   Adds a per-room transcript window so mid-session joiners can
 *   replay the last N turns without re-running the engine. Phase 4a
 *   (ADR-175 §4 / AC-7) — transcript truncation lives here.
 * @owner Zifmia engine boundary (tools/zifmia/engine).
 *
 * Invariants:
 *  - Every `save_blobs.payload` written after Phase 4a is a
 *    `ZifmiaSaveEnvelope` encoded by {@link encodeEnvelope}. Phase 4a
 *    is a hard cutover — prior raw-`ISaveData` blobs are not read by
 *    this version of the executor (per the project's "no
 *    backwards-compatibility" stance).
 *  - The transcript is append-only-with-truncation: each new entry is
 *    pushed onto the back, then the array is sliced to the last
 *    {@link TRANSCRIPT_WINDOW} entries. Absolute turn numbers are
 *    preserved on each `TranscriptEntry`; the window is a *size* cap,
 *    not a turn-number cap, so the world score / turn counter on the
 *    embedded `ISaveData.metadata.turnCount` keeps growing past 1000.
 *  - Envelope version is `1` for v1; bump it only when adding a
 *    non-additive field. New optional fields do not require a bump.
 */

import { gunzipSync, gzipSync, strFromU8 } from 'fflate';

import type { ISaveData } from '@sharpee/core';
import type { ITextBlock } from '@sharpee/text-blocks';

import type { TurnEvent } from './types';

/**
 * Maximum number of `TranscriptEntry` rows retained inside the save
 * blob. ADR-175 §AC-7 — `look` on a 1500-turn session must rejoin
 * with exactly 1000 entries in the in-blob transcript.
 */
export const TRANSCRIPT_WINDOW = 1000;

/**
 * One row in the per-room transcript window. Each entry corresponds
 * to a turn that landed (engine-throw turns produce no entry, since
 * no save_blob is written). Submitter info is captured so rejoining
 * clients can render attributable lines without re-fetching identity.
 */
export interface TranscriptEntry {
  /** Absolute turn number (== save_blob.turn). */
  turn: number;
  /** The raw command string the player submitted (trimmed). */
  command: string;
  /** Identity that submitted the turn — captured for client rendering. */
  submitter: {
    identityId: string;
    handle: string;
  };
  /** Text blocks the engine emitted during this turn. */
  blocks: ITextBlock[];
  /** Forwardable events emitted during this turn. */
  events: TurnEvent[];
}

/**
 * The full payload Zifmia writes into a `save_blobs.payload` cell.
 *
 * Field order is significant: `envelopeVersion` MUST be first so a
 * future probe can read it without parsing the rest. The
 * gzip+JSON.stringify path preserves field order across encode/decode
 * round-trips.
 */
export interface ZifmiaSaveEnvelope {
  /** Schema version of this envelope. Currently `1`. */
  envelopeVersion: 1;
  /** Engine's `ISaveData` for the turn that landed. */
  saveData: ISaveData;
  /** Last ≤ TRANSCRIPT_WINDOW turn records, oldest-first. */
  transcript: TranscriptEntry[];
}

/**
 * Append `next` to `prior` and slice the resulting array to the last
 * `window` entries.
 *
 * DOES: returns a new array; does not mutate `prior`.
 * WHEN: each successful turn — the executor calls this with the prior
 *   transcript from the latest save_blob and the new entry it just
 *   captured.
 * BECAUSE: truncation is the in-blob mechanism for bounding
 *   per-room save size and rejoin latency (ADR-175 §AC-7).
 * REJECTS WHEN: `window < 1` (programming error).
 */
export function appendAndTruncate(
  prior: readonly TranscriptEntry[],
  next: TranscriptEntry,
  window: number = TRANSCRIPT_WINDOW,
): TranscriptEntry[] {
  if (!Number.isInteger(window) || window < 1) {
    throw new Error(
      `save-envelope: transcript window must be a positive integer, got ${window}`,
    );
  }
  const combined = [...prior, next];
  if (combined.length <= window) return combined;
  return combined.slice(combined.length - window);
}

/**
 * Encode an envelope to the byte payload stored in `save_blobs.payload`.
 *
 * Outer gzip compresses the un-gzipped fields (eventSource,
 * turnHistory, transcript). The world snapshot inside `saveData` is
 * already gzipped+base64; double-gzipping it is a no-op cost-wise.
 */
export function encodeEnvelope(envelope: ZifmiaSaveEnvelope): Uint8Array {
  return gzipSync(new TextEncoder().encode(JSON.stringify(envelope)));
}

/**
 * Decode a `save_blobs.payload` cell back to its envelope. Throws if
 * the payload is not a valid gzipped JSON envelope or if the version
 * is unknown.
 *
 * Phase 4a hard-cutover: any blob written by a pre-Phase-4a Zifmia
 * (raw `ISaveData` without an envelope) will fail this decode. Per
 * the project's no-back-compat stance, that's intentional — operators
 * cut over by replaying or discarding old saves.
 */
export function decodeEnvelope(blob: Uint8Array): ZifmiaSaveEnvelope {
  const text = strFromU8(gunzipSync(blob));
  const parsed = JSON.parse(text) as { envelopeVersion?: unknown };
  if (parsed.envelopeVersion !== 1) {
    throw new Error(
      `save-envelope: unsupported envelopeVersion ${String(parsed.envelopeVersion)}`,
    );
  }
  return parsed as ZifmiaSaveEnvelope;
}

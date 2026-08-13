/**
 * @module tests/engine/save-envelope.test
 * @purpose Unit tests for the Phase 4a save envelope: encode/decode
 *   round-trip, transcript truncation, version rejection.
 * @owner Zifmia engine tests.
 *
 * Behavior Statement (rule 12):
 *  - DOES — `appendAndTruncate` appends the next entry and slices to
 *    the last `window` entries.
 *  - DOES — round-trip via `encodeEnvelope` / `decodeEnvelope`
 *    preserves every field (`envelopeVersion`, `saveData`, `transcript`).
 *  - REJECTS WHEN — `appendAndTruncate` called with `window < 1`.
 *  - REJECTS WHEN — `decodeEnvelope` sees an unknown `envelopeVersion`.
 */

import { describe, expect, it } from 'vitest';
import { gzipSync } from 'fflate';

import type { ISaveData } from '@sharpee/core';

import {
  TRANSCRIPT_WINDOW,
  appendAndTruncate,
  decodeEnvelope,
  encodeEnvelope,
  type TranscriptEntry,
  type ZifmiaSaveEnvelope,
} from '../../src/engine/save-envelope';

function makeEntry(turn: number): TranscriptEntry {
  return {
    turn,
    command: `cmd-${turn}`,
    submitter: { identityId: `id-${turn}`, handle: `handle-${turn}` },
    blocks: [{ kind: 'paragraph', text: `block ${turn}` } as never],
    events: [{ type: 'if.event.test', data: { turn } }],
  };
}

function makeSaveData(turn: number): ISaveData {
  return {
    version: '2.0.0',
    timestamp: 1_700_000_000_000,
    metadata: {
      storyId: 'fixture',
      storyVersion: '1.0.0',
      turnCount: turn,
    },
    engineState: {
      eventSource: [],
      worldSnapshot: 'eJwDAAAAAAE=',
      turnHistory: [],
    },
    storyConfig: {
      id: 'fixture',
      version: '1.0.0',
      title: 'Fixture',
      author: 'tester',
    },
  };
}

describe('appendAndTruncate', () => {
  it('appends below the cap without truncation', () => {
    const prior: TranscriptEntry[] = [makeEntry(1), makeEntry(2)];
    const next = makeEntry(3);
    const out = appendAndTruncate(prior, next, 10);
    expect(out).toHaveLength(3);
    expect(out.map((e) => e.turn)).toEqual([1, 2, 3]);
  });

  it('drops the oldest entries once over the cap', () => {
    const prior: TranscriptEntry[] = Array.from({ length: 1000 }, (_, i) =>
      makeEntry(i + 1),
    );
    const next = makeEntry(1001);
    const out = appendAndTruncate(prior, next, 1000);
    expect(out).toHaveLength(1000);
    expect(out[0].turn).toBe(2);
    expect(out[out.length - 1].turn).toBe(1001);
  });

  it('uses the default TRANSCRIPT_WINDOW when none is supplied', () => {
    expect(TRANSCRIPT_WINDOW).toBe(1000);
    const prior: TranscriptEntry[] = Array.from({ length: 1000 }, (_, i) =>
      makeEntry(i + 1),
    );
    const out = appendAndTruncate(prior, makeEntry(1001));
    expect(out).toHaveLength(1000);
    expect(out[0].turn).toBe(2);
  });

  it('does not mutate the input array', () => {
    const prior: TranscriptEntry[] = [makeEntry(1)];
    const snapshot = [...prior];
    appendAndTruncate(prior, makeEntry(2), 10);
    expect(prior).toEqual(snapshot);
  });

  it('rejects window < 1', () => {
    expect(() => appendAndTruncate([], makeEntry(1), 0)).toThrow(/positive integer/);
    expect(() => appendAndTruncate([], makeEntry(1), -1)).toThrow(/positive integer/);
    expect(() => appendAndTruncate([], makeEntry(1), 1.5)).toThrow(/positive integer/);
  });

  it('window=1 keeps only the newest entry', () => {
    const out = appendAndTruncate(
      [makeEntry(1), makeEntry(2), makeEntry(3)],
      makeEntry(4),
      1,
    );
    expect(out).toHaveLength(1);
    expect(out[0].turn).toBe(4);
  });
});

describe('encodeEnvelope / decodeEnvelope', () => {
  it('round-trips an envelope with empty transcript', () => {
    const envelope: ZifmiaSaveEnvelope = {
      envelopeVersion: 1,
      saveData: makeSaveData(1),
      transcript: [],
    };
    const decoded = decodeEnvelope(encodeEnvelope(envelope));
    expect(decoded.envelopeVersion).toBe(1);
    expect(decoded.saveData.metadata.turnCount).toBe(1);
    expect(decoded.transcript).toEqual([]);
  });

  it('round-trips an envelope with a populated transcript window', () => {
    const transcript = Array.from({ length: 17 }, (_, i) => makeEntry(i + 1));
    const envelope: ZifmiaSaveEnvelope = {
      envelopeVersion: 1,
      saveData: makeSaveData(17),
      transcript,
    };
    const decoded = decodeEnvelope(encodeEnvelope(envelope));
    expect(decoded.transcript).toHaveLength(17);
    expect(decoded.transcript[0]).toEqual(transcript[0]);
    expect(decoded.transcript[16]).toEqual(transcript[16]);
  });

  it('rejects an unknown envelopeVersion', () => {
    const malformed = gzipSync(
      new TextEncoder().encode(
        JSON.stringify({ envelopeVersion: 99, saveData: makeSaveData(1), transcript: [] }),
      ),
    );
    expect(() => decodeEnvelope(malformed)).toThrow(/unsupported envelopeVersion 99/);
  });

  it('rejects a missing envelopeVersion (raw ISaveData blob)', () => {
    // Pre-Phase-4a payloads were raw `ISaveData` — hard cutover means
    // they must fail loud rather than silently produce empty transcripts.
    const raw = gzipSync(new TextEncoder().encode(JSON.stringify(makeSaveData(1))));
    expect(() => decodeEnvelope(raw)).toThrow(/unsupported envelopeVersion/);
  });

  it('round-trips channelPacket on transcript entries written by Phase 6c-server', () => {
    const entry: TranscriptEntry = {
      ...makeEntry(7),
      channelPacket: {
        kind: 'turn',
        turn_id: '7',
        payload: { main: [[{ kind: 'text', text: 'hello' }]] }
      },
    };
    const envelope: ZifmiaSaveEnvelope = {
      envelopeVersion: 1,
      saveData: makeSaveData(7),
      transcript: [entry],
    };
    const decoded = decodeEnvelope(encodeEnvelope(envelope));
    expect(decoded.transcript[0].channelPacket).toEqual(entry.channelPacket);
  });

  it('decodes pre-6c-server entries (no channelPacket field) with channelPacket undefined', () => {
    // Simulate a v1 transcript entry written before Phase 6c-server —
    // every other field present, channelPacket absent. The decoder
    // must accept it and leave channelPacket undefined so the wire
    // layer can ship the entry as-is.
    const legacyEntryJson = {
      turn: 3,
      command: 'look',
      submitter: { identityId: 'id-3', handle: 'handle-3' },
      blocks: [{ kind: 'paragraph', text: 'block 3' }],
      events: [{ type: 'if.event.test', data: { turn: 3 } }],
      // No channelPacket field.
    };
    const envelopeJson = {
      envelopeVersion: 1,
      saveData: makeSaveData(3),
      transcript: [legacyEntryJson],
    };
    const payload = gzipSync(
      new TextEncoder().encode(JSON.stringify(envelopeJson)),
    );
    const decoded = decodeEnvelope(payload);
    expect(decoded.transcript[0].channelPacket).toBeUndefined();
    expect(decoded.transcript[0].command).toBe('look');
  });
});

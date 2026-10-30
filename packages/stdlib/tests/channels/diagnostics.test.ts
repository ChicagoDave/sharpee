/**
 * diagnostics.test.ts — the author-facing `diagnostics` channel (ADR-388 D5).
 *
 * Behavior Statement — `diagnosticsChannel.produce`
 *   DOES: emits one `save-reconciled` row per `platform.save_reconciled`
 *         event on the turn, carrying the report payload verbatim (minus the
 *         platform event's empty `context`), and nothing on a turn without one.
 *   WHEN: the channel is produced for a turn; it is gated on `authorChannels`.
 *   BECAUSE: the full reconciliation report is for the author, never the
 *            player (D5, Q-2).
 *   REJECTS WHEN: never — an absent report is an absent row.
 */
import { describe, expect, it } from 'vitest';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import { createSaveReconciledEvent, createRestoreCompletedEvent, type IRestoreReconciliation } from '@sharpee/core';
import { diagnosticsChannel, STANDARD_CHANNELS } from '../../src/channels';

const REPORT: IRestoreReconciliation = {
  savedStamp: 'aaa',
  currentStamp: 'bbb',
  addedEntities: ['attic'],
  addedExits: ['hall north -> attic'],
  droppedKeys: ['chord.occurrence.clause.lamp.on-examining-by-player'],
  reseededLandings: ['market'],
  unmappable: [{ key: 'chord.chapter.current', saved: 'yard', declared: ['market', 'lane'] }],
};

const ctx = (events: ChannelProduceContext['events']): ChannelProduceContext => ({ world: undefined, events, blocks: [], turn: 7, prevValue: undefined });

describe('diagnostics channel', () => {
  it('is a standard, author-gated, append channel', () => {
    expect(STANDARD_CHANNELS.map((c) => c.id)).toContain('diagnostics');
    expect(diagnosticsChannel.gatedBy).toBe('authorChannels');
    expect(diagnosticsChannel.mode).toBe('append');
  });

  it('projects a save_reconciled platform event into one row carrying the report', () => {
    const rows = diagnosticsChannel.produce(ctx([createRestoreCompletedEvent(true), createSaveReconciledEvent(REPORT)]));
    expect(rows).toEqual([{ turn: 7, kind: 'save-reconciled', data: REPORT }]);
  });

  it('emits nothing on a turn with no report', () => {
    expect(diagnosticsChannel.produce(ctx([createRestoreCompletedEvent(true)]))).toBeUndefined();
  });
});

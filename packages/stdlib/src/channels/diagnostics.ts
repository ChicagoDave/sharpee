/**
 * diagnostics.ts — the author-facing `diagnostics` channel.
 *
 * Purpose: carries platform reports meant for the author, not the player —
 * today the restore reconciliation report (ADR-388 D5): every key a restore
 * added, dropped, re-seeded or could not map when a save met an edited
 * story. The IDE's Play surface and the CLI show it; a player surface never
 * sees it, because the channel is gated on `authorChannels` like the other
 * author channels (ADR-163 §7).
 *
 * Public interface: diagnosticsChannel, DiagnosticsRow.
 * Owner context: @sharpee/stdlib channels.
 */
import type { IOChannel } from '@sharpee/if-domain';
import { PlatformEventType } from '@sharpee/core';

/** One diagnostics row: a report kind and its payload, verbatim. */
export interface DiagnosticsRow {
  /** Turn the report was delivered on. */
  turn: number;
  /** What the row carries; `save-reconciled` is an `IRestoreReconciliation`. */
  kind: 'save-reconciled';
  /** The report, verbatim. */
  data: Record<string, unknown>;
}

/**
 * Read a platform event's `payload`. Platform events carry their data on
 * `payload`, not `ISemanticEvent.data` (see the lifecycle channel).
 */
function platformPayload(event: unknown): Record<string, unknown> {
  const payload = (event as { payload?: unknown }).payload;
  return typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
}

/**
 * `diagnostics` — append-mode, sparse, author-gated. Projects
 * `platform.save_reconciled` into one row per report.
 */
export const diagnosticsChannel: IOChannel<DiagnosticsRow> = {
  id: 'diagnostics',
  contentType: 'json',
  mode: 'append',
  emit: 'sparse',
  gatedBy: 'authorChannels',
  produce: (ctx) => {
    const rows: DiagnosticsRow[] = [];
    for (const event of ctx.events) {
      if (event.type !== PlatformEventType.SAVE_RECONCILED) continue;
      const { context: _context, ...report } = platformPayload(event);
      rows.push({ turn: ctx.turn, kind: 'save-reconciled', data: report });
    }
    return rows.length > 0 ? rows : undefined;
  },
};

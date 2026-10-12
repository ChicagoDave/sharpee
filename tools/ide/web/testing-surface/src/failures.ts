/**
 * failures.ts — the failure list the Testing tab steps through (ADR-357 D6,
 * D10): one list over the derived tier and the tree, derived failures first,
 * then one stop per failing card in run order; stale failures stay in the
 * list and are counted apart; the "failures only" switch narrows the outline
 * to the lines with a failed, errored or unreached result and, with text
 * typed, to those whose failure message contains it.
 *
 * Pure: reads the run column's state and returns data the views render. The
 * stepping itself (select the line, scroll to the card, focus the derived
 * row) is main.ts's, through the D9 landing.
 *
 * Public interface: FailureStop, failureStopsOf, filterStops, stepIndex,
 *   failureCountText, narrowedLineIds.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import type { CommandOutcome, RunColumnState, TranscriptRunResult } from './run';

/** One place next/previous stops: a derived-tier failure, or a failing card. */
export type FailureStop =
  | {
      kind: 'derived';
      /** Position in the run's `derived` rows — what the view focuses. */
      index: number;
      label: string;
      message: string;
      stale: boolean;
    }
  | {
      kind: 'card';
      lineId: string;
      /** The failing card's id when the wire named it (D9); absent lands at the line's top. */
      cardId?: string;
      /** Index into the line's `commands`; absent for an errored line with no failing command. */
      command?: number;
      label: string;
      message: string;
      stale: boolean;
    };

/**
 * Every stop, in walking order (AC-7): derived failures and errors in arrival
 * order, then tree failures in run order — the lines as they finished, each
 * line's failing cards in card order. An errored line with no failing card
 * is one stop at its line. Unreached lines are not stops: they are what a
 * blocking card blocks. Stale failures stay (D6), flagged.
 *
 * @param run the run column's state
 * @returns the stops; empty when nothing failed (AC-9)
 */
export function failureStopsOf(run: RunColumnState): FailureStop[] {
  const stops: FailureStop[] = [];
  run.derived.forEach((row, index) => {
    if (row.status !== 'failed' && row.status !== 'error') return;
    const message = row.status === 'error'
      ? `error${row.detail !== undefined ? `: ${row.detail}` : ''}`
      : row.failure ?? row.detail ?? 'failed';
    stops.push({ kind: 'derived', index, label: row.label, message, stale: run.derivedStale === true });
  });
  for (const [lineId, result] of run.results) {
    if (result.status !== 'failed' && result.status !== 'error') continue;
    const label = result.label ?? run.labels.get(lineId) ?? lineId;
    const stale = result.stale === true;
    const failing = result.commands
      .map((command, index) => ({ command, index }))
      .filter(({ command }) => isFailingCard(command));
    if (failing.length === 0) {
      stops.push({ kind: 'card', lineId, label, message: result.firstFailure?.message ?? result.status, stale });
      continue;
    }
    for (const { command, index } of failing) {
      stops.push({
        kind: 'card',
        lineId,
        ...(command.cardId !== undefined ? { cardId: command.cardId } : {}),
        command: index,
        label: `${label} · ${command.input}`,
        message: command.failure ?? 'failed',
        stale,
      });
    }
  }
  return stops;
}

/** A card the run failed on: not passed, not skipped. */
function isFailingCard(command: CommandOutcome): boolean {
  return !command.passed && !command.skipped;
}

/**
 * The stops whose label or message contains `query`, case-insensitively —
 * the text filter inside the switch (D6: failure text is searchable here and
 * nowhere else). An empty query keeps every stop.
 */
export function filterStops(stops: readonly FailureStop[], query: string): FailureStop[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [...stops];
  return stops.filter((stop) =>
    stop.label.toLowerCase().includes(needle) || stop.message.toLowerCase().includes(needle));
}

/**
 * The index next (`+1`) or previous (`-1`) lands on, wrapping at the ends;
 * `undefined` when there is nothing to step to (AC-9). From no current
 * position, next is the first stop and previous the last.
 */
export function stepIndex(count: number, current: number | undefined, delta: 1 | -1): number | undefined {
  if (count <= 0) return undefined;
  if (current === undefined || current < 0 || current >= count) return delta === 1 ? 0 : count - 1;
  return (current + delta + count) % count;
}

/**
 * The count beside the list: `no failures`, `3 failing`, or `3 failing, 1
 * edited since run` — stale failures are in the count and named apart (D6),
 * so a failure becoming stale never reads as fixed.
 */
export function failureCountText(stops: readonly FailureStop[]): string {
  if (stops.length === 0) return 'no failures';
  const stale = stops.filter((stop) => stop.stale).length;
  const text = `${stops.length} failing`;
  return stale > 0 ? `${text}, ${stale} edited since run` : text;
}

/**
 * The lines the switch keeps in the outline (AC-8): those with a failed,
 * errored or unreached result. With `query`, only the lines holding a stop
 * that matches it, or an unreached line whose blocker message matches.
 */
export function narrowedLineIds(run: RunColumnState, query: string): Set<string> {
  const needle = query.trim().toLowerCase();
  const kept = new Set<string>();
  if (needle.length === 0) {
    for (const [lineId, result] of run.results) if (isNarrowable(result)) kept.add(lineId);
    return kept;
  }
  for (const stop of filterStops(failureStopsOf(run), query)) {
    if (stop.kind === 'card') kept.add(stop.lineId);
  }
  for (const [lineId, result] of run.results) {
    if (result.status === 'unreached' && (result.firstFailure?.message ?? '').toLowerCase().includes(needle)) kept.add(lineId);
  }
  return kept;
}

function isNarrowable(result: TranscriptRunResult): boolean {
  return result.status === 'failed' || result.status === 'error' || result.status === 'unreached';
}

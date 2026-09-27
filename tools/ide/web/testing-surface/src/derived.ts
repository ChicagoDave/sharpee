/**
 * derived.ts — the run column's derived-tier state (ADR-356 D5 on the wire,
 * GH #524 Phase 2).
 *
 * Purpose: shape the `derived-branch` and `derived-summary` events the run
 *   column folds into what the column shows. One row per clause branch in
 *   arrival order; the failures (and engine errors) first and open, the
 *   passes grouped by their subject — the label's first segment, so
 *   `vine · on pruning · when flowering` belongs to `vine` — and the SKIPPED
 *   branches grouped by their named arrange-floor shape. D5a made visible: a
 *   SKIP is a gap with a name, never a failure, and it is shown rather than
 *   hidden — grouped, so a story at the floor's edge (secret-letter's 363 of
 *   721) does not drown the tab. The three ratios and their gap lists render
 *   as the CLI report's OWN lines (`formatDerivedRun`'s tail and
 *   `formatCoverageSummary`, reproduced character for character and pinned by
 *   a golden test against the real formatters), so the tab and `sharpee test`
 *   cannot drift apart unnoticed.
 *
 * Public interface: DerivedBranchRow, DerivedSummary, DerivedGroups,
 *   SourceSpan, derivedRowOf, derivedSummaryOf, subjectOf, restOf,
 *   groupDerivedRows, siteLabel, endingSiteLabel, derivedReportLines.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type {
  DerivedBranchEvent,
  DerivedEndingGap,
  DerivedRunSummaryEvent,
  RunEventEnvelope,
} from '@sharpee/ide-protocol/run-events';

/** The compiler's span as the wire carries it — imported through the event, never mirrored. */
export type SourceSpan = NonNullable<DerivedBranchEvent['span']>;

/** One derived branch's outcome as the column keeps it: the event minus its envelope. */
export type DerivedBranchRow = Omit<DerivedBranchEvent, keyof RunEventEnvelope | 'type'>;

/** The run's three ratios and gap lists: the event minus its envelope. */
export type DerivedSummary = Omit<DerivedRunSummaryEvent, keyof RunEventEnvelope | 'type'>;

/** The rows the column shows, in the order the column shows them. */
export interface DerivedGroups {
  /** Failed and errored branches, arrival order — first and always open. */
  failures: DerivedBranchRow[];
  /** Passed branches by subject, subjects in first-seen order. */
  subjects: Array<{ subject: string; rows: DerivedBranchRow[] }>;
  /** SKIPPED branches by shape, shapes in first-seen order. */
  shapes: Array<{ shape: string; rows: DerivedBranchRow[] }>;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
}

/** The label's segment separator, as the enumerator writes it. */
const LABEL_SEPARATOR = ' · ';

/**
 * Keeps a `derived-branch` event's payload, envelope dropped, optional
 * fields present only when the wire carried them.
 *
 * @param event the decoded event
 * @returns the row the column keeps
 */
export function derivedRowOf(event: DerivedBranchEvent): DerivedBranchRow {
  return {
    label: event.label,
    span: event.span,
    status: event.status,
    ...(event.shape !== undefined ? { shape: event.shape } : {}),
    ...(event.detail !== undefined ? { detail: event.detail } : {}),
    ...(event.failure !== undefined ? { failure: event.failure } : {}),
    ...(event.command !== undefined ? { command: event.command } : {}),
    ...(event.arranged !== undefined ? { arranged: event.arranged } : {}),
  };
}

/**
 * Keeps a `derived-summary` event's payload, envelope dropped.
 *
 * @param event the decoded event
 * @returns the summary the column keeps
 */
export function derivedSummaryOf(event: DerivedRunSummaryEvent): DerivedSummary {
  return { branches: event.branches, endings: event.endings, rooms: event.rooms };
}

/**
 * The subject a label belongs to: its first segment (`vine`, `Tobias`,
 * `story`). A label with no separator is its own subject.
 *
 * @param label the enumerator's label
 * @returns the subject
 */
export function subjectOf(label: string): string {
  const at = label.indexOf(LABEL_SEPARATOR);
  return at < 0 ? label : label.slice(0, at);
}

/**
 * The label after its subject (`on pruning · when flowering`), or the whole
 * label when it has no separator.
 *
 * @param label the enumerator's label
 * @returns the rest
 */
export function restOf(label: string): string {
  const at = label.indexOf(LABEL_SEPARATOR);
  return at < 0 ? label : label.slice(at + LABEL_SEPARATOR.length);
}

/**
 * Groups the rows for display: failures and errors first in arrival order,
 * passes by subject, SKIPPED by shape (a SKIPPED row without a shape — a
 * producer predating the field — groups under `skipped`).
 *
 * @param rows the rows in arrival order
 * @returns the groups and the four counts
 */
export function groupDerivedRows(rows: DerivedBranchRow[]): DerivedGroups {
  const failures: DerivedBranchRow[] = [];
  const subjects = new Map<string, DerivedBranchRow[]>();
  const shapes = new Map<string, DerivedBranchRow[]>();
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let errors = 0;
  for (const row of rows) {
    switch (row.status) {
      case 'passed': {
        passed += 1;
        const subject = subjectOf(row.label);
        const list = subjects.get(subject) ?? [];
        list.push(row);
        subjects.set(subject, list);
        break;
      }
      case 'failed':
        failed += 1;
        failures.push(row);
        break;
      case 'error':
        errors += 1;
        failures.push(row);
        break;
      case 'skipped': {
        skipped += 1;
        const shape = row.shape ?? 'skipped';
        const list = shapes.get(shape) ?? [];
        list.push(row);
        shapes.set(shape, list);
        break;
      }
    }
  }
  return {
    failures,
    subjects: [...subjects].map(([subject, list]) => ({ subject, rows: list })),
    shapes: [...shapes].map(([shape, list]) => ({ shape, rows: list })),
    passed,
    failed,
    skipped,
    errors,
  };
}

/**
 * A span's site for the column: `file:line` for an imported file, `line N`
 * for the main story file (the column does not know the file's name; the
 * host resolves a missing file to it).
 *
 * @param span the span, or null when the compiler carried none
 * @returns the label, or undefined for no span
 */
export function siteLabel(span: SourceSpan | null): string | undefined {
  if (!span) return undefined;
  return span.file !== undefined ? `${span.file}:${span.line}` : `line ${span.line}`;
}

/**
 * An ending gap's site for the column, same rule as {@link siteLabel}.
 *
 * @param gap the ending
 * @returns the label, or undefined when the ending carries no line
 */
export function endingSiteLabel(gap: DerivedEndingGap): string | undefined {
  if (gap.line === null) return undefined;
  return gap.file !== null ? `${gap.file}:${gap.line}` : `line ${gap.line}`;
}

/** `file:line` or `(no span)`, as the CLI's `lineSiteOf` writes it. */
function cliLineSite(line: number | null, file: string | undefined): string {
  return line === null ? '(no span)' : `${file ?? 'line'}:${line}`;
}

/**
 * The three ratios and their gap lists as `sharpee test` prints them — the
 * tail of `formatDerivedRun` (from its blank line) followed by
 * `formatCoverageSummary`, character for character. A consumer that wants
 * the CLI's words gets them here and never re-derives them.
 *
 * @param summary the run's summary
 * @param storyFile the story file's name for main-file sites, as the CLI is given it
 * @returns the report lines
 */
export function derivedReportLines(summary: DerivedSummary, storyFile?: string): string[] {
  const rows: string[] = [];
  const { branches, endings, rooms } = summary;
  rows.push('');
  rows.push(`Branches exercised: ${branches.exercised} / ${branches.declared}`);
  if (branches.failed > 0) {
    rows.push(`Derived failures: ${branches.failed}`);
  }
  if (branches.gaps.length > 0) {
    rows.push(`Not exercised (${branches.gaps.length}):`);
    for (const gap of branches.gaps) {
      const where = gap.span ? `${gap.span.file ?? storyFile ?? 'line'}:${gap.span.line}` : '(no span)';
      const why = gap.status === 'error' ? 'error' : gap.shape ?? 'skipped';
      rows.push(`  ${where} · ${gap.label} — ${why}${gap.detail !== undefined ? ` (${gap.detail})` : ''}`);
    }
  }
  rows.push('');
  rows.push(`Endings reached: ${endings.reached} / ${endings.declared}`);
  if (endings.unreached.length > 0) {
    rows.push(`Not reached (${endings.unreached.length}):`);
    for (const ending of endings.unreached) {
      rows.push(`  ${cliLineSite(ending.line, ending.file ?? storyFile)} · ${ending.id} (${ending.statement})`);
    }
  }
  if (endings.unnamed.length > 0) {
    rows.push(`Endings declared without an id (${endings.unnamed.length}) — no END STATE card can name them:`);
    for (const ending of endings.unnamed) {
      rows.push(`  ${cliLineSite(ending.line, ending.file ?? storyFile)} · ${ending.statement}`);
    }
  }
  rows.push(`Rooms entered: ${rooms.entered} / ${rooms.declared}`);
  if (rooms.unentered.length > 0) {
    rows.push(`Not entered (${rooms.unentered.length}):`);
    for (const room of rooms.unentered) rows.push(`  ${room}`);
  }
  return rows;
}

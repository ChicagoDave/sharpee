/**
 * lens.ts — the run column's examinable-lens state (ADR-408 D8 on the wire).
 *
 * Purpose: shape the `lens-finding` and `lens-summary` events the run column
 *   folds into what the lens section renders from: one row per finding in
 *   arrival order, the run's soundness summary or its refusal, and — when a
 *   run ends with no `lens-summary` at all — why the section has nothing to
 *   show. A run whose stream closed normally (exit 0 or 1) yet carried no
 *   summary came from a `sharpee` that has no lens tier (ADR-408 AC-4, GH
 *   #653), and the section says so rather than showing an empty list. A run
 *   that stopped before its tiers (exit 2 or 3) never reached the lens, and
 *   the section says that instead. Findings never touch the tally: a lens
 *   never gates (D7).
 *
 *
 * It also holds what the section's cards are built from, so the DOM layer
 * only lays them out: the class strips (No text first; not-a-thing findings
 * counted, never listed, as the console does without `--all`), the
 * soundness lines, and each link's source request. A request carries the
 * phrase's range (`column` and `length`, ADR-408 D9) when devkit located
 * the phrase, and only a line otherwise, so a host that reads only the line
 * behaves as before (AC-6). Every word an author reads that the CLI also
 * prints — class titles, source words, the footer — comes from
 * branch-tester's `lens-words`, so the two cannot drift.
 *
 * Public interface: LensFindingRow, LensSummary, LensAbsence, LensStatus,
 *   lensFindingRowOf, lensSummaryOf, lensAbsenceAt, lensStatusOf,
 *   lensAbsenceText, SourceRange, SourceRequest, LensStrip,
 *   LENS_STRIP_ORDER, lensStripsOf, lensSourceRequest, lensSourceLabel,
 *   lensCardRequest, lensDescriptionRequest, lensSoundnessLines,
 *   lensHeaderText, lensCardLines, openSourcePost.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { ExaminableKind } from '@sharpee/ide-protocol';
import type { LensFindingEvent, LensFindingSource, LensSummaryEvent, RunEventEnvelope } from '@sharpee/ide-protocol/run-events';
import { examinableClassTitle, lensSourceWords, LENS_SOUNDNESS_FOOTER } from '@sharpee/branch-tester/lens-words';

/** One finding as the column keeps it: the event minus its envelope. */
export type LensFindingRow = Omit<LensFindingEvent, keyof RunEventEnvelope | 'type'>;

/** The lens's soundness line or refusal: the event minus its envelope. */
export type LensSummary = Omit<LensSummaryEvent, keyof RunEventEnvelope | 'type'>;

/** Why a finished run carried no `lens-summary`. */
export type LensAbsence = 'toolchain-without-lens' | 'run-stopped-early';

/** What the lens section shows, decided from the column's state. */
export type LensStatus =
  | { readonly kind: 'not-run' }
  | { readonly kind: 'running' }
  | { readonly kind: 'refused'; readonly message: string }
  | { readonly kind: 'reported'; readonly summary: LensSummary }
  | { readonly kind: 'absent'; readonly absence: LensAbsence };

/**
 * Keeps a `lens-finding` event's payload, envelope dropped.
 *
 * @param event the decoded event
 * @returns the row the column keeps
 */
export function lensFindingRowOf(event: LensFindingEvent): LensFindingRow {
  const { schemaVersion: _v, seq: _s, elapsedMs: _e, type: _t, ...row } = event;
  return row;
}

/**
 * Keeps a `lens-summary` event's payload, envelope dropped.
 *
 * @param event the decoded event
 * @returns the summary the column keeps
 */
export function lensSummaryOf(event: LensSummaryEvent): LensSummary {
  const { schemaVersion: _v, seq: _s, elapsedMs: _e, type: _t, ...summary } = event;
  return summary;
}

/**
 * Why a run that closed its stream carried no `lens-summary`, read off its
 * `run-end` exit code: 2 (the tree was refused or defective) and 3 (the story
 * would not load) stop the command before its tiers; 0 and 1 mean the tiers
 * ran, so a missing summary means this `sharpee` has no lens tier.
 *
 * @param exitCode the `run-end` event's exit code
 * @returns the absence to name
 */
export function lensAbsenceAt(exitCode: number): LensAbsence {
  return exitCode >= 2 ? 'run-stopped-early' : 'toolchain-without-lens';
}

/**
 * What the lens section shows.
 *
 * @param state the column's lens fields and whether a run is in flight
 * @returns the summary or refusal once it arrived; the absence once a run
 *   ended without one; running while the stream is open; not-run before
 *   any run
 */
export function lensStatusOf(state: {
  readonly inFlight: boolean;
  readonly lensSummary?: LensSummary;
  readonly lensAbsence?: LensAbsence;
}): LensStatus {
  if (state.lensSummary !== undefined) {
    return state.lensSummary.refusal !== undefined
      ? { kind: 'refused', message: state.lensSummary.refusal }
      : { kind: 'reported', summary: state.lensSummary };
  }
  if (state.lensAbsence !== undefined) return { kind: 'absent', absence: state.lensAbsence };
  return state.inFlight ? { kind: 'running' } : { kind: 'not-run' };
}

/**
 * The section's sentence for a run that carried no lens results.
 *
 * @param absence why there were none
 * @returns the sentence the section shows in place of findings
 */
export function lensAbsenceText(absence: LensAbsence): string {
  return absence === 'toolchain-without-lens'
    ? 'This project\'s sharpee does not run the examinable lens. Update the toolchain to see nouns the player reads but cannot use.'
    : 'The run stopped before the examinable lens; it runs once the tree runs.';
}

/** The phrase's range on a source request (ADR-408 D9): a 1-based column and a length in UTF-16 code units. */
export interface SourceRange {
  readonly column: number;
  readonly length: number;
}

/**
 * A place in the author's source a link asks the host to open: the file
 * relative to the story file's directory (null for the story file), the
 * 1-based line, and the phrase's range when there is one.
 */
export interface SourceRequest {
  readonly file: string | null;
  readonly line: number;
  readonly range?: SourceRange;
}

/**
 * The `openSource` post's body (ADR-408 D9): `{file, line}`, plus `column`
 * and `length` when the request carries the phrase's range. A host that
 * reads only `file` and `line` opens the line, as before (AC-6).
 *
 * @param file the file relative to the story file's directory, null for the story file
 * @param line the 1-based line
 * @param range the phrase's range on that line, when there is one
 * @returns the body the page posts under `openSource`
 */
export function openSourcePost(file: string | null, line: number, range?: SourceRange): { file: string | null; line: number; column?: number; length?: number } {
  return range === undefined ? { file, line } : { file, line, column: range.column, length: range.length };
}

/** The finding classes, in the order the section shows their strips. */
export const LENS_STRIP_ORDER: readonly ExaminableKind[] = ['resolved-default', 'not-in-scope', 'number-form', 'ambiguous', 'unclassified'];

/** One class's strip: its title, the findings it lists, and how many not-a-thing findings it only counts. */
export interface LensStrip {
  readonly kind: ExaminableKind;
  readonly title: string;
  readonly listed: readonly LensFindingRow[];
  readonly notAThing: number;
}

/**
 * The section's strips, in `LENS_STRIP_ORDER`, each in arrival order.
 *
 * @param rows the column's lens findings
 * @returns one strip per class with at least one finding; a not-a-thing
 *   finding is counted in its strip and never listed; a `resolved-described`
 *   row, which is not a finding, is in no strip
 */
export function lensStripsOf(rows: readonly LensFindingRow[]): LensStrip[] {
  const strips: LensStrip[] = [];
  for (const kind of LENS_STRIP_ORDER) {
    const inClass = rows.filter((row) => row.kind === kind);
    if (inClass.length === 0) continue;
    strips.push({
      kind,
      title: examinableClassTitle(kind),
      listed: inClass.filter((row) => row.thing),
      notAThing: inClass.filter((row) => !row.thing).length,
    });
  }
  return strips;
}

/**
 * One source's request: the phrase's range when devkit located it, else its
 * passage's first line.
 *
 * @param source a finding's source
 * @returns the request; null when the source has no span at all
 */
export function lensSourceRequest(source: LensFindingSource): SourceRequest | null {
  if (source.at !== undefined && source.length !== undefined) {
    return { file: source.at.file ?? null, line: source.at.line, range: { column: source.at.column, length: source.length } };
  }
  if (source.span === null) return null;
  return { file: source.span.file ?? null, line: source.span.line };
}

/**
 * A source link's label: its owner and kind, then the line it opens.
 *
 * @param source a finding's source
 * @returns `Scullery description · line 19`, or the words alone with no span
 */
export function lensSourceLabel(source: LensFindingSource): string {
  const request = lensSourceRequest(source);
  return request === null ? lensSourceWords(source) : `${lensSourceWords(source)} · line ${request.line}`;
}

/**
 * What activating a card asks for: the first located source's range, else
 * the first source with a span, line only.
 *
 * @param row a lens finding
 * @returns the request; null when no source has a span
 */
export function lensCardRequest(row: LensFindingRow): SourceRequest | null {
  const located = row.sources.find((source) => source.at !== undefined && source.length !== undefined);
  if (located !== undefined) return lensSourceRequest(located);
  for (const source of row.sources) {
    const request = lensSourceRequest(source);
    if (request !== null) return request;
  }
  return null;
}

/**
 * A No-text card's "Write the description" offer (ADR-408 D10): the target's
 * declaration line, line only.
 *
 * @param row a lens finding
 * @returns the request for a `resolved-default` finding whose target's
 *   declaration span is known; null for any other
 */
export function lensDescriptionRequest(row: LensFindingRow): SourceRequest | null {
  if (row.kind !== 'resolved-default' || row.targetSpan === undefined || row.targetSpan === null) return null;
  return { file: row.targetSpan.file ?? null, line: row.targetSpan.line };
}

/**
 * The section's soundness lines (ADR-322 D7): the seed, the budget, why the
 * lens stopped, rooms reached of declared, each room not reached with its
 * reason, then the lens's own footer.
 *
 * @param summary a reported (not refused) lens summary
 * @returns the lines, in display order
 */
export function lensSoundnessLines(summary: LensSummary): string[] {
  const lines = [`seed ${summary.seed} · budget ${summary.maxSeconds} s`];
  const reach = summary.reach;
  if (reach !== undefined) {
    const stopped = reach.stoppedBy === 'budget' ? 'the time budget ran out' : 'every route typed';
    lines[0] += ` · ${stopped}`;
    lines.push(`rooms reached ${reach.roomsReached} of ${reach.roomsDeclared} declared`);
    for (const room of reach.unreached) lines.push(`not reached: ${room.room} — ${room.reason}`);
  }
  lines.push(LENS_SOUNDNESS_FOOTER.join(' '));
  return lines;
}

/**
 * The section header's title.
 *
 * @param rows the column's lens findings
 * @returns `examinable lens · <n> findings`, counting every finding
 */
export function lensHeaderText(rows: readonly LensFindingRow[]): string {
  const findings = rows.filter((row) => row.kind !== 'resolved-described').length;
  return `examinable lens · ${findings} finding${findings === 1 ? '' : 's'}`;
}

/**
 * A card's text: the phrase as the prose wrote it (with the form that did
 * resolve, for a number-form finding), the class title, the target, and the
 * rooms.
 *
 * @param row a lens finding
 * @returns the phrase line, the badge, and the rooms line
 */
export function lensCardLines(row: LensFindingRow): { phrase: string; badge: string; rooms: string } {
  const resolved = row.resolvedForm !== undefined ? `  (${JSON.stringify(row.resolvedForm)} resolves)` : '';
  const target = row.target !== undefined ? `  → ${row.target}` : '';
  return {
    phrase: `${JSON.stringify(row.phrase)}${resolved}${target}`,
    badge: examinableClassTitle(row.kind),
    rooms: `in ${row.rooms.map((room) => room.room).join(', ')}`,
  };
}

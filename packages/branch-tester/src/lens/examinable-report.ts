/**
 * examinable-report.ts — the examinable lens's words: the console form of a
 * report, the one vocabulary the CLI prints and the Testing tab reads
 * (ADR-408 Consequences), as `claim-report` is for claims.
 *
 * Purpose: a soundness header (story, seed, rooms reached of declared and
 * each room not reached with its reason, phrases examined, counts by
 * class), then the findings
 * that recur in more than one room, then each room with only the findings
 * unique to it, then the soundness footer: findings are real, absence is
 * not proof (ADR-322 D7).
 *
 * Sources: each passage a phrase was read from prints as its owner and kind
 * (`Scullery description`), followed by its file and line when the caller
 * supplies a locator. The lens never resolves spans; the caller is the
 * consumer that does (ADR-333 D2, ADR-408 D4).
 *
 * Public interface: `formatExaminableReport`, `LensSourceLocator`,
 *   `LensSourcePlace`.
 * Owner context: @sharpee/branch-tester — the lenses (ADR-408 D3).
 */

import type { ExaminableFinding, ExaminableLensReport, ExaminableRow, LensSource, LensSourceKind } from '@sharpee/ide-protocol';
import { isFinding } from './examinable-classify.js';

/** Where a source's passage sits: a file as the author names it, and a 1-based line. */
export interface LensSourcePlace {
  readonly file: string;
  readonly line: number;
}

/** The caller's span resolution for a source; undefined when it has none. */
export type LensSourceLocator = (source: LensSource) => LensSourcePlace | undefined;

const KIND_WORDS: Readonly<Record<LensSourceKind, string>> = {
  description: 'description',
  'first-visit': 'first-visit text',
  state: 'state text',
};

/** One source as the console names it: owner, kind, and its place when known. */
function sourceWords(source: LensSource, locate: LensSourceLocator | undefined): string {
  const place = locate?.(source);
  return `${source.ownerName} ${KIND_WORDS[source.kind]}${place ? ` at ${place.file}:${place.line}` : ''}`;
}

/** The two lines for one row or folded finding. */
function rowLines(row: ExaminableRow | ExaminableFinding, locate: LensSourceLocator | undefined): string[] {
  const target = row.target ? `  -> ${row.target}` : '';
  const resolved = row.resolvedForm ? `  (${JSON.stringify(row.resolvedForm)} resolves)` : '';
  const flag = row.thing ? '' : '  (not-a-thing)';
  return [
    `   ${row.kind.padEnd(19)} ${JSON.stringify(row.phrase)}${resolved}${target}${flag}`,
    `   ${''.padEnd(19)}   from: ${row.sources.map((source) => sourceWords(source, locate)).join(', ')}   [${row.detail}]`,
  ];
}

const keyOf = (row: { phrase: string; kind: string; detail: string; targetId?: string }): string => JSON.stringify([row.phrase, row.kind, row.detail, row.targetId ?? null]);

/**
 * The console form of a report.
 *
 * @param story the story file's name, from the lens document
 * @param report the document's report
 * @param options `all` also shows described resolutions and not-a-thing
 *   rows; `locate` resolves each source to its file and line
 * @returns the lines, in print order, with blank separators
 */
export function formatExaminableReport(
  story: string,
  report: ExaminableLensReport,
  options: { readonly all?: boolean; readonly locate?: LensSourceLocator } = {},
): string[] {
  const all = options.all === true;
  const locate = options.locate;
  const reach = report.reach;
  const visible = (row: ExaminableRow | ExaminableFinding): boolean => all || row.thing;
  const out: string[] = [
    '',
    `story             ${story}  (seed ${report.seed})`,
    `rooms reached     ${reach.roomsReached} of ${reach.roomsDeclared} declared  (${(reach.ms / 1000).toFixed(1)}s of ${reach.maxSeconds}s, ${reach.commandsTyped} moves typed)`,
    ...reach.unreached.map((room) => `  not reached     ${room.room}: ${room.reason}`),
    `phrases examined  ${report.phrasesExecuted}`,
    `by class          ${Object.entries(report.counts).map(([kind, count]) => `${kind} ${count}`).join(', ')}`,
    '',
  ];

  const recurring = report.findings.filter((finding) => finding.rooms.length > 1);
  const recurringKeys = new Set(recurring.map(keyOf));
  const recurringShown = recurring.filter(visible);
  if (recurringShown.length) {
    out.push(`== seen in more than one room  (${recurringShown.length} findings)`);
    for (const finding of recurringShown) {
      out.push(...rowLines(finding, locate));
      out.push(`   ${''.padEnd(19)}   in ${finding.rooms.length} rooms: ${finding.rooms.map((room) => room.room).join(', ')}`);
    }
    out.push('');
  }

  for (const room of report.rooms) {
    const unique = (row: ExaminableRow): boolean => !recurringKeys.has(keyOf(row));
    const shown = room.rows.filter((row) => (all || isFinding(row)) && visible(row) && unique(row));
    const hidden = room.rows.filter((row) => isFinding(row) && !visible(row)).length;
    const folded = room.rows.filter((row) => isFinding(row) && visible(row) && !unique(row)).length;
    out.push(`== ${room.room}  [${room.path.length ? room.path.join(', ') : 'start'}]`);
    if (room.ended) { out.push('   (the game has ended in this state; nothing examined)', ''); continue; }
    if (shown.length === 0) out.push(`   (no findings unique to this room${hidden ? `; ${hidden} hidden as not-a-thing` : ''})`);
    for (const row of shown) out.push(...rowLines(row, locate));
    if (hidden && shown.length) out.push(`   (${hidden} more hidden as not-a-thing; --all shows them)`);
    if (folded) out.push(`   (${folded} listed above under "seen in more than one room")`);
    out.push('');
  }

  out.push(
    'Findings are real: each phrase was executed through the engine in the state',
    'a route first reached its room in. Absence is not proof: rooms no route',
    'reached, and prose only shown in other states, were not examined.',
    '',
  );
  return out;
}

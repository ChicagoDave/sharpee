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
 * Public interface: `formatExaminableReport`.
 * Owner context: @sharpee/branch-tester — the lenses (ADR-408 D3).
 */

import { isFinding, type ExaminableFinding, type ExaminableRow } from './examinable-classify.js';
import type { ExaminableLensReport } from './examinable-lens.js';

/** The two lines for one row or folded finding. */
function rowLines(row: ExaminableRow | ExaminableFinding): string[] {
  const target = row.target ? `  -> ${row.target}` : '';
  const resolved = row.resolvedForm ? `  (${JSON.stringify(row.resolvedForm)} resolves)` : '';
  const flag = row.thing ? '' : '  (not-a-thing)';
  return [
    `   ${row.kind.padEnd(19)} ${JSON.stringify(row.phrase)}${resolved}${target}${flag}`,
    `   ${''.padEnd(19)}   from: ${row.sources.join(', ')}   [${row.detail}]`,
  ];
}

const keyOf = (row: { phrase: string; kind: string; detail: string }): string => JSON.stringify([row.phrase, row.kind, row.detail]);

/**
 * The console form of a report.
 *
 * @param report a lens report
 * @param options `all` also shows described resolutions and not-a-thing rows
 * @returns the lines, in print order, with blank separators
 */
export function formatExaminableReport(report: ExaminableLensReport, options: { readonly all?: boolean } = {}): string[] {
  const all = options.all === true;
  const reach = report.reach;
  const visible = (row: ExaminableRow | ExaminableFinding): boolean => all || row.thing;
  const out: string[] = [
    '',
    `story             ${report.story}  (seed ${report.seed})`,
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
      out.push(...rowLines(finding));
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
    for (const row of shown) out.push(...rowLines(row));
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

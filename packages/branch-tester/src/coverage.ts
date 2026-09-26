/**
 * coverage.ts — the derived suite's branch coverage report (ADR-356 D5).
 *
 * Purpose: turn a derived run into the one number ADR-356 promises and the
 * list that gives the number its meaning — branches exercised over
 * branches declared, and every branch that was not exercised named by its
 * source span, so an author reads "the `when fruiting` arm at
 * `fernhill.story:564` was never run" and not a percentage. The denominator
 * is the enumerator's record count, so the ratio is complete relative to
 * what the author wrote (D5).
 *
 * A branch is EXERCISED when its command ran and its claims were evaluated
 * — passed or failed. A SKIPPED branch (a precondition or command the floor
 * cannot express, D2) and an errored one (the engine threw) are declared and
 * not exercised; they are the gaps. A failed branch is exercised and is
 * reported as a failure with its first failing claim, not as a gap.
 *
 * The other two ratios D5 names read what D4's END STATE cards and the two
 * tiers' room tracking supply: endings reached over endings declared (an
 * ending is reached when a tree line's END STATE card for it passed), and
 * rooms entered over rooms declared (the union of the rooms the derived
 * tier arranged or reached and the rooms the tree's replays walked). An
 * unreached ending or an unentered room is a gap in the ratio, never a
 * failure (D5a) — the report is the finding.
 *
 * Public interface: `branchCoverageOf`, `endingCoverageOf`, `roomCoverageOf`,
 * `formatDerivedRun`, `formatCoverageSummary`, `BranchCoverage`, `BranchGap`,
 * `EndingCoverage`, `RoomCoverage`.
 * Owner context: @sharpee/branch-tester — the runtime that executes what
 * ADR-356 derives.
 *
 * References: ADR-356 D4 (END STATE cards), D5 (the three ratios and the
 * gap lists), D5a (a failure fails the build, a SKIP never does — the exit
 * code is the caller's; this module only counts), AC-6 (a declared ending no
 * card carries is reported as unreached), AC-8 (gaps carry the branch's span).
 */

import type { IREntity, Span } from '@sharpee/chord';
import type { DeclaredEnding } from '@sharpee/world-index';
import type { DerivedOutcome, DerivedSuiteResult } from './derived-runner.js';

/** One declared branch the run did not exercise. */
export interface BranchGap {
  label: string;
  status: 'skipped' | 'error';
  /** The named shape, for a SKIPPED branch. */
  shape?: string;
  detail?: string;
  span: Span | null;
}

/** The branches ratio and its gaps. */
export interface BranchCoverage {
  /** The enumerator's record count — the denominator. */
  declared: number;
  /** Branches whose command ran and whose claims were evaluated (passed or failed). */
  exercised: number;
  passed: number;
  failed: number;
  gaps: BranchGap[];
}

/** The endings ratio and its gaps. */
export interface EndingCoverage {
  /** Named endings the story declares — the denominator. */
  declared: number;
  /** Named endings some END STATE card proved. */
  reached: number;
  /** Named endings no passing END STATE card carries. */
  unreached: DeclaredEnding[];
  /** Endings declared without a phrase key — no card can name them; listed apart, never in the ratio. */
  unnamed: DeclaredEnding[];
}

/** The rooms ratio and its gaps. */
export interface RoomCoverage {
  declared: number;
  entered: number;
  /** Declared rooms neither tier placed the player in. */
  unentered: IREntity[];
}

/**
 * The endings ratio: which of the story's named endings a passing END STATE
 * card proved (ADR-356 D4/D5).
 *
 * @param declared the story's declared endings (`endingsOf(ir)`)
 * @param reached the ending ids whose END STATE cards passed (`TreeDocumentRunResult.endingsReached`)
 * @returns the ratio's two numbers, the unreached endings, and the unnameable ones
 */
export function endingCoverageOf(declared: DeclaredEnding[], reached: string[]): EndingCoverage {
  const named = declared.filter((ending): ending is DeclaredEnding & { id: string } => ending.id !== null);
  const unnamed = declared.filter((ending) => ending.id === null);
  const unreached = named.filter((ending) => !reached.includes(ending.id));
  return { declared: named.length, reached: named.length - unreached.length, unreached, unnamed };
}

/**
 * The rooms ratio: which of the story's declared rooms the player stood in
 * during either tier (ADR-356 D5).
 *
 * @param declared the story's rooms (`roomsOf(ir)`)
 * @param entered room IR ids from the tree run and the derived run, in any order
 * @returns the ratio's two numbers and the rooms never entered
 */
export function roomCoverageOf(declared: IREntity[], entered: string[]): RoomCoverage {
  const unentered = declared.filter((room) => !entered.includes(room.id));
  return { declared: declared.length, entered: declared.length - unentered.length, unentered };
}

/**
 * Render the endings and rooms ratios as plain lines, each gap named — the
 * tail of the report `formatDerivedRun` starts.
 *
 * @param endings the endings ratio
 * @param rooms the rooms ratio
 * @param storyFile the story file's name, for `file:line` sites; spans alone otherwise
 * @returns the lines, empty-line separated from what precedes them
 */
export function formatCoverageSummary(endings: EndingCoverage, rooms: RoomCoverage, storyFile?: string): string[] {
  const rows: string[] = [];
  rows.push('');
  rows.push(`Endings reached: ${endings.reached} / ${endings.declared}`);
  if (endings.unreached.length > 0) {
    rows.push(`Not reached (${endings.unreached.length}):`);
    for (const ending of endings.unreached) {
      rows.push(`  ${lineSiteOf(ending.line, ending.file ?? storyFile)} · ${ending.id} (${ending.statement})`);
    }
  }
  if (endings.unnamed.length > 0) {
    rows.push(`Endings declared without an id (${endings.unnamed.length}) — no END STATE card can name them:`);
    for (const ending of endings.unnamed) {
      rows.push(`  ${lineSiteOf(ending.line, ending.file ?? storyFile)} · ${ending.statement}`);
    }
  }
  rows.push(`Rooms entered: ${rooms.entered} / ${rooms.declared}`);
  if (rooms.unentered.length > 0) {
    rows.push(`Not entered (${rooms.unentered.length}):`);
    for (const room of rooms.unentered) rows.push(`  ${room.id}`);
  }
  return rows;
}

/**
 * The branch coverage of one derived run.
 *
 * @param run the suite result, one outcome per enumerated branch
 * @returns the ratio's two numbers, the pass/fail split, and every gap by span
 */
export function branchCoverageOf(run: DerivedSuiteResult): BranchCoverage {
  const gaps: BranchGap[] = [];
  let passed = 0;
  let failed = 0;
  for (const outcome of run.outcomes) {
    switch (outcome.status) {
      case 'passed':
        passed += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      case 'skipped':
      case 'error':
        gaps.push({
          label: outcome.label,
          status: outcome.status,
          ...(outcome.shape !== undefined ? { shape: outcome.shape } : {}),
          ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
          span: outcome.span,
        });
        break;
    }
  }
  return { declared: run.total, exercised: passed + failed, passed, failed, gaps };
}

/**
 * Render a derived run as plain lines: one row per branch, then the ratio,
 * then the gaps by span. Mirrors `formatTreeDocumentRun`'s idiom — a pass is
 * the information, a failure cites its claim, a gap cites its shape.
 *
 * @param run the suite result
 * @param storyFile the story file's name, for `file:line` sites; spans alone otherwise
 * @returns the report, one line per entry
 */
export function formatDerivedRun(run: DerivedSuiteResult, storyFile?: string): string[] {
  const coverage = branchCoverageOf(run);
  const rows: string[] = [];
  rows.push(`Derived rule tests (ADR-356): ${run.total} branch${run.total === 1 ? '' : 'es'}`);
  for (const outcome of run.outcomes) {
    const site = siteOf(outcome.span, storyFile);
    switch (outcome.status) {
      case 'passed':
        rows.push(`✓ ${outcome.label}`);
        break;
      case 'failed': {
        const cite = firstFailureOf(outcome);
        rows.push(`✗ ${outcome.label}${cite !== undefined ? ` — ${cite}` : ''}${site}`);
        break;
      }
      case 'skipped':
        rows.push(`◌ ${outcome.label} — SKIPPED ${outcome.shape ?? ''}${outcome.detail !== undefined ? `: ${outcome.detail}` : ''}${site}`);
        break;
      case 'error':
        rows.push(`✗ ${outcome.label} — error${outcome.detail !== undefined ? `: ${outcome.detail}` : ''}${site}`);
        break;
    }
  }
  rows.push('');
  rows.push(`Branches exercised: ${coverage.exercised} / ${coverage.declared}`);
  if (coverage.failed > 0) {
    rows.push(`Derived failures: ${coverage.failed}`);
  }
  if (coverage.gaps.length > 0) {
    rows.push(`Not exercised (${coverage.gaps.length}):`);
    for (const gap of coverage.gaps) {
      const where = gap.span ? `${gap.span.file ?? storyFile ?? 'line'}:${gap.span.line}` : '(no span)';
      const why = gap.status === 'error' ? 'error' : gap.shape ?? 'skipped';
      rows.push(`  ${where} · ${gap.label} — ${why}${gap.detail !== undefined ? ` (${gap.detail})` : ''}`);
    }
  }
  return rows;
}

/** The first failing claim of an outcome, or its detail (a parse failure), for the failure row. */
function firstFailureOf(outcome: DerivedOutcome): string | undefined {
  const claim = outcome.claims.find((candidate) => !candidate.passed);
  if (claim) return `${claim.claim}${claim.message !== undefined ? `: ${claim.message}` : ''}`;
  return outcome.detail;
}

/**
 * `file:line` for a source line, or `(no span)`. A span in an imported
 * `.chord` file names that file; only a span in the main file falls back to
 * the story file's name.
 */
function lineSiteOf(line: number | null, file?: string): string {
  return line === null ? '(no span)' : `${file ?? 'line'}:${line}`;
}

/** ` (file:line)` for a span, or nothing — the span's own file when it has one. */
function siteOf(span: Span | null, storyFile?: string): string {
  if (!span) return '';
  return ` (${span.file ?? storyFile ?? 'line'}:${span.line})`;
}

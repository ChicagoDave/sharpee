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
 * Only the branches ratio ships here: the endings and rooms ratios depend
 * on D4's END STATE cards, which a later plan lands.
 *
 * Public interface: `branchCoverageOf`, `formatDerivedRun`, `BranchCoverage`,
 * `BranchGap`.
 * Owner context: @sharpee/branch-tester — the runtime that executes what
 * ADR-356 derives.
 *
 * References: ADR-356 D5 (the ratio and the gap list), D5a (a failure fails
 * the build, a SKIP never does — the exit code is the caller's; this module
 * only counts), AC-8 (gaps carry the branch's span).
 */

import type { Span } from '@sharpee/chord';
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
      const where = gap.span ? `${storyFile ?? 'line'}:${gap.span.line}` : '(no span)';
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

/** ` (file:line)` for a span, or nothing. */
function siteOf(span: Span | null, storyFile?: string): string {
  if (!span) return '';
  return ` (${storyFile ?? 'line'}:${span.line})`;
}

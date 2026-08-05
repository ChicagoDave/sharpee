/**
 * tree-report.ts — reporting a tree run (ADR-302 D13).
 *
 * **Unreached is not failed.** When an interior node fails, everything hanging
 * off it never ran — and reporting those as failures is worse than useless: a
 * broken spine node near the root would report a wall of red proportional to
 * how much of the story depends on it, burying the one thing that actually
 * broke. One broken node produces **one failure** and a count of what it
 * blocked, with the originating node named.
 *
 * This matters more in v2 than it would have in v1, because D13 abolishes the
 * `tests/transcripts/` versus `walkthroughs/` split: a story is ONE tree, so
 * focused tests hang off the spine node that establishes their state. A spine
 * break therefore blocks tests rather than merely other walkthroughs, and the
 * count of blocked tests is a real signal about blast radius — not noise.
 *
 * Public interface: `summarizeTreeRun`, `formatTreeRun`, `TreeRunSummary`.
 * Owner context: branch-tester (testing tooling).
 *
 * @see ADR-302 — Transcript Branches — D13, AC-7
 */

import { NodeRunOutcome, TreeRunResult } from './tree-runner.js';

/** One originating failure and what it blocked. */
export interface BlockedGroup {
  /** Stem of the node that failed. */
  readonly origin: string;
  /** Why it failed, as the runner reported it. */
  readonly error?: string;
  /** Stems that never ran because of it, in execution order. */
  readonly unreached: string[];
}

/** Counts and groupings over a tree run. */
export interface TreeRunSummary {
  readonly passed: number;
  readonly failed: number;
  readonly unreached: number;
  /** One entry per originating failure, each carrying what it blocked. */
  readonly blocked: BlockedGroup[];
  /** Structural defects; non-empty means nothing ran (D11). */
  readonly defects: TreeRunResult['defects'];
  /** True when the run is green: no defects, no failures. */
  readonly ok: boolean;
}

/**
 * Summarize a tree run (ADR-302 D13, AC-7).
 *
 * `failed` counts originating failures only. A node that never ran is counted
 * in `unreached` and attributed to the ancestor that blocked it — never added
 * to the failure count, which is the whole point of the decision.
 */
export function summarizeTreeRun(run: TreeRunResult): TreeRunSummary {
  let passed = 0;
  let failed = 0;
  const groups = new Map<string, BlockedGroup>();

  for (const outcome of run.outcomes) {
    if (outcome.status === 'unreached') {
      const origin = outcome.blockedBy ?? '(unknown)';
      const group = groups.get(origin) ?? { origin, unreached: [] };
      group.unreached.push(outcome.stem);
      groups.set(origin, group);
      continue;
    }
    if (outcome.result?.status === 'passed') {
      passed += 1;
      continue;
    }
    failed += 1;
    const existing = groups.get(outcome.stem);
    const group: BlockedGroup = {
      origin: outcome.stem,
      ...(errorOf(outcome) !== undefined ? { error: errorOf(outcome) } : {}),
      unreached: existing?.unreached ?? [],
    };
    groups.set(outcome.stem, group);
  }

  const blocked = [...groups.values()];
  const unreached = blocked.reduce((n, g) => n + g.unreached.length, 0);

  return {
    passed,
    failed,
    unreached,
    blocked,
    defects: run.defects,
    ok: run.defects.length === 0 && failed === 0,
  };
}

/**
 * Render a tree run as plain lines.
 *
 * A defective tree renders its defects and nothing else — there is no run to
 * describe, and printing "0 passed" beside a structural error invites reading
 * it as a result (D11).
 */
export function formatTreeRun(run: TreeRunResult): string[] {
  const summary = summarizeTreeRun(run);
  const lines: string[] = [];

  if (summary.defects.length > 0) {
    lines.push(`Tree is malformed — ${summary.defects.length} defect(s); nothing ran.`);
    for (const defect of summary.defects) {
      lines.push(`  ${defect.kind}: ${defect.message}`);
    }
    return lines;
  }

  for (const group of summary.blocked) {
    if (group.unreached.length === 0) {
      lines.push(`✗ ${group.origin}${group.error ? ` — ${group.error}` : ''}`);
      continue;
    }
    lines.push(
      `✗ ${group.origin}${group.error ? ` — ${group.error}` : ''}` +
        ` (blocked ${group.unreached.length}: ${group.unreached.join(', ')})`,
    );
  }

  // Unreached is named on its own line as well as in the group, so the count
  // reads as blast radius rather than as more failures.
  const parts = [`${summary.passed} passed`];
  if (summary.failed > 0) parts.push(`${summary.failed} failed`);
  if (summary.unreached > 0) parts.push(`${summary.unreached} unreached`);
  lines.push(parts.join(', '));

  return lines;
}

/**
 * The runner's own message for a failed node, if it gave one.
 *
 * Three places carry one, in narrowing order: a run-level error (a parse
 * failure, a stale recording), a command-level `error` (a failed directive),
 * and a failed assertion's message. Taking the first available keeps the
 * report saying what the runner said, rather than re-deriving a description
 * of the failure from its parts.
 */
function errorOf(outcome: NodeRunOutcome): string | undefined {
  const result = outcome.result;
  if (!result) return undefined;
  if (result.errorMessage) return result.errorMessage;

  for (const command of result.commands ?? []) {
    if (command.passed) continue;
    if (command.error) return command.error;
    const assertion = command.assertionResults?.find((a) => !a.passed);
    if (assertion?.message) return `${command.command.input}: ${assertion.message}`;
    return command.command.input;
  }
  return undefined;
}

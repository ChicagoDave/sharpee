/**
 * AC-13 — CLI surface real-path test (ADR-163 Phase 3).
 *
 * Spawns the production bundle (`dist/cli/sharpee.js`) as a child process
 * and runs a deterministic Dungeo walkthrough through it. Asserts that
 * the CLI's channel-service-driven output path produces a passing
 * transcript run.
 *
 * Real-path constraint (CLAUDE.md rule 12a): no stub of an owned
 * dependency. The test invokes `node dist/cli/sharpee.js --test ...`
 * exactly as a user would. Channel-service, text-service, engine,
 * and the bundle wiring are all exercised by their real code paths.
 *
 * Fixture choice: `wt-01-get-torch-early.transcript`. Standalone
 * (no chain), all `[OK: contains "..."]` assertions, no thief-RNG —
 * troll combat introduces variable attack-count but pass/fail outcome
 * is deterministic (combat eventually succeeds; transcript expects
 * post-troll content).
 *
 * What this gates: the CLI's wire path through channel-service. If
 * `produceTurnPacket` produces wrong `main` content, or the bundle's
 * `flattenContent` join breaks, or a regression to the `text:output`
 * listener wiring occurs, this test fails on the production bundle —
 * not in isolation.
 *
 * @see ADR-163 — Channel-Service Platform — AC-13
 * @see docs/work/channel-io-unification/plan-20260501-adr-163-phase-3-cli-migration.md
 */

import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../..');
const CLI_BUNDLE = resolve(REPO_ROOT, 'dist/cli/sharpee.js');
const FIXTURE_TRANSCRIPT = resolve(
  REPO_ROOT,
  'stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript'
);

describe('AC-13 — CLI surface real-path test', () => {
  it('runs wt-01 through dist/cli/sharpee.js and reports a passing transcript', () => {
    // Pre-condition: bundle and fixture must exist on disk. If either is
    // absent, surface a clear message rather than a confusing spawn error.
    expect(
      existsSync(CLI_BUNDLE),
      'dist/cli/sharpee.js missing — run ./build.sh -s dungeo first'
    ).toBe(true);
    expect(
      existsSync(FIXTURE_TRANSCRIPT),
      `${FIXTURE_TRANSCRIPT} missing`
    ).toBe(true);

    const proc = spawnSync(
      'node',
      [CLI_BUNDLE, '--test', FIXTURE_TRANSCRIPT],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        timeout: 60_000,
      }
    );

    expect(proc.error, 'spawn failed: ' + (proc.error?.message ?? '')).toBeUndefined();
    expect(proc.status, `exit ${proc.status}; stderr=${proc.stderr}`).toBe(0);

    // Transcript-tester output: per-command "PASS"/"FAIL" lines, then a
    // summary like "  N passed (Mms)" or "  X passed, Y failed". A
    // fully passing run does NOT print the "failed" word in its summary.
    const stdout = proc.stdout ?? '';
    expect(stdout, 'no stdout from CLI').not.toEqual('');

    // Real-path assertion: every command in the transcript reported PASS.
    // We avoid asserting an exact PASS count because troll combat varies
    // attack iterations. We assert no FAIL lines and a non-zero pass.
    const failLines = stdout
      .split('\n')
      .filter((line) => /\bFAIL\b/.test(line));
    expect(failLines, `transcript reported failures:\n${failLines.join('\n')}`)
      .toEqual([]);

    const summaryMatch = stdout.match(/(\d+)\s+passed/);
    expect(summaryMatch, 'no pass-count summary in stdout').not.toBeNull();
    const passed = Number(summaryMatch![1]);
    expect(passed, 'expected at least 30 passing assertions').toBeGreaterThanOrEqual(30);
  });

  it('produces non-empty main-channel content for the opening room', () => {
    // A second sanity check: the opening turn (look in West of House)
    // must produce content containing the room name. If channel-service's
    // `main` routing dropped the room.name block, this would fail.
    const proc = spawnSync(
      'node',
      [CLI_BUNDLE, '--test', '--verbose', FIXTURE_TRANSCRIPT],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        timeout: 60_000,
      }
    );

    expect(proc.status).toBe(0);
    expect(proc.stdout).toContain('West of House');
  });
});

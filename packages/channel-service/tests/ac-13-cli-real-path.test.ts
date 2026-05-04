/**
 * AC-13 (refresh) — CLI surface real-path test.
 *
 * Drives `dist/cli/sharpee.js` end-to-end via `--test <transcript>`
 * against a known-good Dungeo walkthrough. Validates that the
 * channel-driven CLI consumer (`scripts/bundle-entry.js` rewritten in
 * R6) feeds main-channel entries to stdout correctly so transcripts
 * pass.
 *
 * Real-path: the test exercises the actual production CLI bundle —
 * same code that ships to authors and runs in CI walkthrough chains.
 * No stubs. Per CLAUDE.md rule 12a, this is the acceptance gate for R6.
 *
 * Skips gracefully when:
 *  - `dist/cli/sharpee.js` is not built. Run `./build.sh -s dungeo` to
 *    build.
 *  - The Dungeo walkthrough fixture is not present.
 *
 * The test pipes output through Node's `child_process.spawnSync` so
 * the bundle runs in a fresh process — no module-cache pollution
 * from the test runner.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = resolve(__dirname, '../../..');
const CLI_BUNDLE = resolve(REPO_ROOT, 'dist/cli/sharpee.js');
const WALKTHROUGH = resolve(
  REPO_ROOT,
  'stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript',
);

const BUNDLE_PRESENT = existsSync(CLI_BUNDLE);
const WALKTHROUGH_PRESENT = existsSync(WALKTHROUGH);

const skipReason = !BUNDLE_PRESENT
  ? 'dist/cli/sharpee.js missing — run ./build.sh -s dungeo'
  : !WALKTHROUGH_PRESENT
    ? `walkthrough fixture missing: ${WALKTHROUGH}`
    : '';

describe.skipIf(!BUNDLE_PRESENT || !WALKTHROUGH_PRESENT)(
  `AC-13 — CLI real-path against dist/cli/sharpee.js${skipReason ? ` (skip: ${skipReason})` : ''}`,
  () => {
    it('runs wt-01-get-torch-early through the bundle and reports a passing transcript', () => {
      const result = spawnSync(
        process.execPath,
        [CLI_BUNDLE, '--test', WALKTHROUGH],
        {
          cwd: REPO_ROOT,
          encoding: 'utf-8',
          timeout: 60000,
        },
      );

      expect(result.error, result.error?.message).toBeUndefined();
      expect(result.status, `stderr:\n${result.stderr}`).toBe(0);

      const stdout = result.stdout ?? '';
      // Channel-driven path produces the standard transcript-tester
      // output. The PASS lines and final summary indicate success.
      expect(stdout).toMatch(/passed/);
      expect(stdout).not.toMatch(/\bfailed\b/i);
      // Each command in the transcript reports a PASS line — the
      // wt-01 fixture has 35 commands.
      const passCount = (stdout.match(/PASS/g) ?? []).length;
      expect(passCount).toBeGreaterThan(0);
    }, 90000);

    it('CLI bundle does not call the deleted produceTurnPacket / produceCmgtManifest APIs', () => {
      // Quick smoke: spawn the bundle with a single command. If the
      // bundle still references rule-based exports, it crashes during
      // setup with TypeError.
      const result = spawnSync(
        process.execPath,
        [CLI_BUNDLE, '--exec', 'look'],
        {
          cwd: REPO_ROOT,
          encoding: 'utf-8',
          timeout: 30000,
        },
      );
      expect(result.status, `stderr:\n${result.stderr}`).toBe(0);
      // Negative assertions — the rule-based bootstrap is gone
      expect(result.stderr).not.toMatch(/resetSession is not a function/);
      expect(result.stderr).not.toMatch(/registerHello is not a function/);
      expect(result.stderr).not.toMatch(/produceTurnPacket is not a function/);
      expect(result.stderr).not.toMatch(/produceCmgtManifest is not a function/);
      // Positive assertion — the channel-driven path produced output
      expect(result.stdout).toContain('West of House');
    }, 60000);
  },
);

if (!BUNDLE_PRESENT || !WALKTHROUGH_PRESENT) {
  // eslint-disable-next-line no-console
  console.log(`[ac-13] Skipping — ${skipReason}`);
}

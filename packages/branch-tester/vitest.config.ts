/**
 * vitest.config.ts — test configuration for @sharpee/branch-tester.
 *
 * Its one job is telling the whole-corpus sweep tests where the corpus is. That
 * belongs here rather than in the tests: a config file may know where it sits in
 * a repository, a unit test may not.
 *
 * This file is the single place the corpus is declared — edit the path below to
 * point the sweeps elsewhere, or remove the `env` block to disable them. Note
 * that `test.env` wins over an inherited shell variable (verified 2026-08-05:
 * `SHARPEE_TRANSCRIPT_CORPUS= vitest run` still swept the corpus), so the shell
 * is not a way to override this. Outside the repository this file is not
 * published, no corpus is configured, and the sweeps report as skipped —
 * verified the same day: 5 skipped, 19 passed, with the config moved aside.
 *
 * Owner context: branch-tester (tooling).
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const packageDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    env: {
      // NO corpus is configured yet (ADR-302 D16). This harness's stories are
      // the ones that will carry `continues:`, and the in-repo directory split
      // that separates them from v1's has not landed — Phase 10. Pointing the
      // sweeps at `stories/` meanwhile would sweep v1's corpus through v2's
      // parser, which is precisely the cross-harness reading D16 exists to
      // prevent. The sweeps report as skipped until a root is named here.
      //
      // SHARPEE_TRANSCRIPT_CORPUS: resolve(packageDir, '../../<v2 stories>'),
    },
  },
});

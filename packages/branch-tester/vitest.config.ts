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
import { workspaceAliases } from '../../vitest.shared';

const packageDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    env: {
      // This harness's own corpus (ADR-302 D16). `branch-stories/` is a
      // separate top-level directory from `stories/`, and each harness looks
      // only at its own — the directory IS the harness assignment, so a story
      // cannot be read by the wrong one by accident. Absent from a published
      // tarball, where the sweeps then skip rather than passing over zero
      // files.
      SHARPEE_TRANSCRIPT_CORPUS: resolve(packageDir, '../../branch-stories'),
    },
  },
});

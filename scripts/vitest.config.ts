/**
 * vitest.config.ts — test configuration for the repo-level suites in
 * `scripts/__tests__/`, which drive the assembled CLI bundle
 * (`dist/cli/sharpee.js`) that repokit builds from `scripts/bundle-entry.js`.
 * That entry point is a repo script owned by no package, so its tests sit
 * beside it rather than under `packages/`.
 *
 * Public interface: `pnpm test:scripts` (which passes `--config` explicitly).
 *
 * This file deliberately does NOT live at the repository root. Vitest resolves
 * a missing config by searching upward from its working directory, so a root
 * `vitest.config.ts` is on the search path of every workspace member — and the
 * two that run vitest with no local config of their own, `tools/repokit` and
 * `packages/devkit`, silently adopted it and died with "No test files found"
 * against this file's include pattern (verified 2026-08-14: `turbo run test:ci
 * --filter=@sharpee/repokit` failed, 80 passing tests collected as 0). Kept
 * under `scripts/`, which is nobody's ancestor, it can only be loaded by the
 * `--config` flag that names it.
 *
 * Owner context: repo tooling (not published; no package owns it).
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  test: {
    // Anchored to the repo root so the include pattern below reads the same
    // way it would from a root config, and does not depend on the caller's cwd.
    root: repoRoot,
    globals: true,
    environment: 'node',
    include: ['scripts/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-esm/**'],
  },
});

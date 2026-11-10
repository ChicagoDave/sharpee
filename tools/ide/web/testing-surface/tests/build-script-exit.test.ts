/**
 * build-script-exit.test.ts — the Xcode pre-build wrapper's exit status.
 *
 * Purpose: pins what `tools/ide/build-testing-surface.sh` tells Xcode when the
 *   bundle build fails. The wrapper is copied into a scratch directory beside
 *   a stand-in `web/testing-surface/build.mjs` whose only job is to exit with
 *   a chosen status, so the wrapper's own decision is the thing under test.
 *   The real build's refusal is pinned in bundle-inputs.test.ts.
 * Owner context: tools/ide — TestingSurface.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const realScript = resolve(here, '../../../build-testing-surface.sh');

interface WrapperRun {
  status: number | null;
  output: string;
}

describe('build-testing-surface.sh exit status', () => {
  let scratch = '';

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'testing-surface-wrapper-'));
    mkdirSync(join(scratch, 'web/testing-surface'), { recursive: true });
    copyFileSync(realScript, join(scratch, 'build-testing-surface.sh'));
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  /** Runs the copied wrapper against a stand-in build that exits `buildStatus`. */
  function runWrapper(buildStatus: number, extraEnv: Record<string, string> = {}): WrapperRun {
    writeFileSync(
      join(scratch, 'web/testing-surface/build.mjs'),
      `process.exit(${buildStatus});\n`,
    );
    const env = { ...process.env, ...extraEnv };
    if (!('TESTING_SURFACE_OPTIONAL' in extraEnv)) delete env.TESTING_SURFACE_OPTIONAL;
    const result = spawnSync('/bin/bash', [join(scratch, 'build-testing-surface.sh')], {
      env,
      encoding: 'utf8',
    });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  }

  it('fails the pre-build with an error line when the build ran and failed', () => {
    const run = runWrapper(1);
    expect(run.status).toBe(1);
    expect(run.output).toContain('error: testing play surface bundle failed to build');
  });

  it('exits clean and silent when the build succeeds', () => {
    const run = runWrapper(0);
    expect(run.status).toBe(0);
    expect(run.output).not.toContain('error:');
    expect(run.output).not.toContain('warning:');
  });

  it('downgrades a failed build to a warning only under TESTING_SURFACE_OPTIONAL=1', () => {
    const run = runWrapper(1, { TESTING_SURFACE_OPTIONAL: '1' });
    expect(run.status).toBe(0);
    expect(run.output).toContain('warning: TESTING_SURFACE_OPTIONAL=1');
  });

  it('keeps a missing build script a warning', () => {
    rmSync(join(scratch, 'web/testing-surface'), { recursive: true, force: true });
    const result = spawnSync('/bin/bash', [join(scratch, 'build-testing-surface.sh')], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('warning:');
  });
});

/**
 * REAL-PATH test — @sharpee/helpers across the CLI-bundle / external-story
 * boundary (issue #146, ADR-140 Amendment 1, ADR-178 Amendment 1).
 *
 * Drives the production bundle `dist/cli/sharpee.js` against an *external*
 * story directory that resolves @sharpee/helpers from its own `node_modules`.
 * No injection, no stub, no override: the bundle inlines its own copy of
 * @sharpee/world-model while the story resolves the workspace copy, so the two
 * sides genuinely hold different `WorldModel` class objects. That is the
 * condition under which the retired `world.helpers()` prototype patch failed.
 *
 * The fixture reports the boundary state on `[boundary]` lines and this test
 * asserts on them, so the run cannot pass vacuously by accidentally sharing one
 * module graph.
 *
 * Skips gracefully when `dist/cli/sharpee.js` is not built (run
 * `./repokit bundle`).
 *
 * Owner context: @sharpee/helpers
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PACKAGE_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const CLI_BUNDLE = resolve(REPO_ROOT, 'dist/cli/sharpee.js');
const FIXTURE = resolve(__dirname, 'fixtures/external-story');
const WORLD_MODEL_PACKAGE = resolve(REPO_ROOT, 'packages/world-model');

const BUNDLE_PRESENT = existsSync(CLI_BUNDLE);
const skipReason = BUNDLE_PRESENT ? '' : 'dist/cli/sharpee.js missing — run ./repokit bundle';

let storyDir = '';

/**
 * Materialize the fixture as a self-contained external story: `dist/index.js`
 * plus a `node_modules` that resolves the two @sharpee packages the story
 * imports. Symlinks (not copies) so the test always runs against the current
 * workspace build rather than a snapshot.
 */
function materializeExternalStory(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sharpee-helpers-boundary-'));

  mkdirSync(join(dir, 'dist'), { recursive: true });
  copyFileSync(join(FIXTURE, 'story.js'), join(dir, 'dist', 'index.js'));
  copyFileSync(join(FIXTURE, 'package.json'), join(dir, 'package.json'));

  const scope = join(dir, 'node_modules', '@sharpee');
  mkdirSync(scope, { recursive: true });
  symlinkSync(PACKAGE_ROOT, join(scope, 'helpers'), 'dir');
  symlinkSync(WORLD_MODEL_PACKAGE, join(scope, 'world-model'), 'dir');

  return dir;
}

describe.skipIf(!BUNDLE_PRESENT)(
  `@sharpee/helpers across the CLI-bundle boundary${skipReason ? ` (skip: ${skipReason})` : ''}`,
  () => {
    let stdout = '';
    let stderr = '';
    let status: number | null = null;

    beforeAll(() => {
      storyDir = materializeExternalStory();

      const result = spawnSync(process.execPath, [CLI_BUNDLE, '--exec', 'look', '--story', storyDir], {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        timeout: 60000,
      });

      expect(result.error, result.error?.message).toBeUndefined();
      stdout = result.stdout ?? '';
      stderr = result.stderr ?? '';
      status = result.status;
    }, 90000);

    afterAll(() => {
      if (storyDir) rmSync(storyDir, { recursive: true, force: true });
    });

    it('runs the external story to completion through the bundle', () => {
      expect(status, `stderr:\n${stderr}`).toBe(0);
      expect(stderr).not.toMatch(/helpers is not a function/);
    });

    it('straddles a genuine module-graph boundary (guards against a vacuous pass)', () => {
      // If these ever flip, the fixture stopped reproducing #146's condition
      // and the assertions below would no longer mean anything.
      expect(stdout, `stdout:\n${stdout}`).toContain('[boundary] sameWorldModelClass=false');
      expect(stdout).toContain('[boundary] worldHelpers=undefined');
    });

    it('confirms the retired prototype augmentation is absent story-side', () => {
      expect(stdout).toContain('[boundary] prototypeHelpers=undefined');
    });

    it('builds the world through createHelpers(world) across that boundary', () => {
      // The real assertion: entities created by story-side builders are present
      // in the engine's world and render through the bundle's own output path.
      expect(stdout).toContain('Marble Hall');
      expect(stdout).toContain('A cool marble hall.');
      expect(stdout).toContain('brass lamp');
    });
  },
);

if (!BUNDLE_PRESENT) {
  // eslint-disable-next-line no-console
  console.log(`[helpers-boundary] Skipping — ${skipReason}`);
}

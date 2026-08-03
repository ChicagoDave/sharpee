/**
 * Tests for the bundle CLI's --restore path (ADR-293 D7, Phase A/7 fixup).
 *
 * `--restore <name>` must go through the engine's real save format — the
 * version reader runs, RNG stream states ride along — and must loudly
 * reject pre-ADR-293 snapshots and missing files. Exercised end-to-end via
 * `spawnSync` against the real compiled bundle (`dist/cli/sharpee.js`) and
 * a real save produced by the real `$save` pipeline, so the contract the
 * test asserts is the contract authors get.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');
const BUNDLE = join(REPO_ROOT, 'dist', 'cli', 'sharpee.js');
const STORY_DIR = join(REPO_ROOT, 'stories', 'dungeo');
const SAVES_DIR = join(STORY_DIR, 'saves');

// Fixture saves are namespaced so cleanup can never touch real saves.
const FIXTURE_SAVE = 'clitest-restore-fixture';
const LEGACY_SAVE = 'clitest-legacy-snapshot';
const fixtureFiles = [
  join(SAVES_DIR, `${FIXTURE_SAVE}.json`),
  join(SAVES_DIR, `${LEGACY_SAVE}.json`)
];

const tmpDirs: string[] = [];

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [BUNDLE, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 60_000
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

beforeAll(() => {
  // Produce a REAL save through the real $save pipeline at a pinned seed.
  const dir = mkdtempSync(join(tmpdir(), 'cli-restore-'));
  tmpDirs.push(dir);
  const transcript = join(dir, 'save-maker.transcript');
  writeFileSync(
    transcript,
    'title: CLI Restore Fixture Maker\nstory: dungeo\nseed: 4242\n---\n\n> north\n[OK: contains "North of House"]\n\n$save ' +
      FIXTURE_SAVE +
      '\n',
    'utf-8'
  );
  const made = runCli(['--test', transcript, '--story', STORY_DIR]);
  if (!existsSync(fixtureFiles[0])) {
    throw new Error(`fixture $save did not produce ${fixtureFiles[0]}:\n${made.stdout}\n${made.stderr}`);
  }
  // A pre-ADR-293 tester snapshot: no save-format version.
  writeFileSync(fixtureFiles[1], JSON.stringify({ worldState: '{}', pluginStates: {} }), 'utf-8');
});

afterAll(() => {
  for (const f of fixtureFiles) {
    rmSync(f, { force: true });
  }
  for (const d of tmpDirs) {
    rmSync(d, { recursive: true, force: true });
  }
});

describe('--exec --restore through the real save format', () => {
  it('restores a real save and continues from its state', () => {
    const result = runCli([
      '--exec',
      'look',
      '--story',
      STORY_DIR,
      '--restore',
      FIXTURE_SAVE,
      '--seed',
      '4242'
    ]);
    expect(result.status).toBe(0);
    // The save was taken after `north` from West of House.
    expect(result.stdout).toContain('North of House');
  });

  it('rejects a legacy snapshot with a named error and exit 1', () => {
    const result = runCli(['--exec', 'look', '--story', STORY_DIR, '--restore', LEGACY_SAVE]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('legacy snapshot');
    // The world must not have been touched: no game output for `look`.
    expect(result.stdout).not.toContain('West of House');
  });

  it('rejects a missing save by name with exit 1', () => {
    const result = runCli(['--exec', 'look', '--story', STORY_DIR, '--restore', 'clitest-no-such-save']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Save file not found');
  });
});

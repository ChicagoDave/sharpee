/**
 * version-stamp.test.ts — the author-side stamp carries story facts only.
 *
 * It used to stamp an ENGINE_VERSION too, which the generated entry passed into
 * `storyInfo` and the `version` action printed — so a build tool was the player's
 * authority on which engine was running, and got it wrong (the `^<major>.0.0`
 * dependency range, stripped of its caret, told every 5.x author build to say
 * "5.0.0" under a 5.4.0 engine). The engine version now has exactly one source,
 * the stamped platform constant its readers import.
 *
 * Owner context: @sharpee/devkit — standalone (author-project) commands (ADR-185).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stampVersion } from './version-stamp.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const temps: string[] = [];

/** Create a throwaway story project whose package.json carries `version`. */
function project(version: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'sharpee-version-stamp-'));
  temps.push(dir);
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', version }));
  return dir;
}

/** Read one `export const NAME = '…'` value out of a stamped version.ts. */
function stamped(dir: string, name: string): string | undefined {
  const src = readFileSync(join(dir, 'src', 'version.ts'), 'utf-8');
  return new RegExp(`export const ${name} = '([^']*)'`).exec(src)?.[1];
}

afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

describe('stampVersion', () => {
  it('stamps no engine version at all — the platform constant is its only source', () => {
    const dir = project('0.3.0');

    stampVersion(dir, 'demo');

    const src = readFileSync(join(dir, 'src', 'version.ts'), 'utf-8');
    expect(src).not.toContain('ENGINE_VERSION');
    expect(src).not.toContain('engineVersion');
  });

  it('leaves the platform constant as the one place the engine version is written', () => {
    const dir = project('0.3.0');

    stampVersion(dir, 'demo');

    // stdlib's engine-version.ts, stamped by ./repokit build, still carries it —
    // this is the source that stays, and the author stamp must not shadow it.
    const stdlibSrc = readFileSync(
      join(REPO_ROOT, 'packages', 'stdlib', 'src', 'actions', 'standard', 'version', 'engine-version.ts'),
      'utf-8',
    );
    expect(/export const ENGINE_VERSION = '[^']+'/.test(stdlibSrc)).toBe(true);
    expect(stamped(dir, 'ENGINE_VERSION')).toBeUndefined();
  });

  it('takes STORY_VERSION from the project package.json, and stamps a build date', () => {
    const dir = project('0.3.0');

    stampVersion(dir, 'demo');

    expect(stamped(dir, 'STORY_VERSION')).toBe('0.3.0');
    expect(stamped(dir, 'BUILD_DATE')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('overwrites a stale stamp left by an earlier build', () => {
    const dir = project('0.3.0');
    writeFileSync(
      join(dir, 'src', 'version.ts'),
      "export const STORY_VERSION = '0.1.0';\nexport const ENGINE_VERSION = '5.0.0';\n",
    );

    stampVersion(dir, 'demo');

    expect(stamped(dir, 'STORY_VERSION')).toBe('0.3.0');
    expect(stamped(dir, 'ENGINE_VERSION')).toBeUndefined(); // and the stale one is gone
  });
});

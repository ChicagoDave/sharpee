/**
 * StoryHealth validation tests — REAL engine boot against the real
 * dungeo bundle for OK; synthetic bad path for failure.
 *
 * ADR-178 §AC-6: `reason` is a discriminated union. The synthetic
 * missing-package test below is the REAL-PATH test the ADR requires
 * (no engine stub) — we construct a minimal .sharpee zip on disk that
 * imports a non-existent package and assert the checker classifies it
 * as `{ kind: 'missing_package', package: '<name>' }`.
 */

import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { zipSync, strToU8 } from 'fflate';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  createStoryHealthChecker,
  validateScannerEntries,
  withHealthFilter,
  formatReason,
} from '../src/engine/story-health.js';
import { createStoryScanner } from '../src/stories/scanner.js';
import { clearStoryCacheForTests } from '../src/engine/bundle-loader.js';

const REPO_ROOT = join(__dirname, '..', '..', '..');
const STORIES_DIR = join(REPO_ROOT, 'dist', 'stories');

const tmpRoots: string[] = [];

function makeSyntheticBundle(options: {
  slug: string;
  storyJs: string;
}): string {
  const dir = mkdtempSync(join(tmpdir(), 'zifmia-bad-bundle-'));
  tmpRoots.push(dir);
  const meta = {
    format: 'sharpee-story',
    formatVersion: 1,
    id: options.slug,
    title: options.slug,
    author: 'test',
    version: '1.0.0',
    description: '',
    sharpeeVersion: '>=0.0.0',
    ifid: '',
    hasAssets: false,
    hasTheme: false,
    preferredTheme: 'classic-light',
  };
  const zipped = zipSync({
    'meta.json': strToU8(JSON.stringify(meta)),
    'story.js': strToU8(options.storyJs),
  });
  const filePath = join(dir, `${options.slug}.sharpee`);
  writeFileSync(filePath, zipped);
  return filePath;
}

afterAll(() => {
  for (const dir of tmpRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('StoryHealth (REAL-PATH)', () => {
  beforeEach(() => {
    clearStoryCacheForTests();
  });

  it('validates dungeo.sharpee → ok with manifest', async () => {
    const checker = createStoryHealthChecker();
    const report = await checker.validate({
      slug: 'dungeo',
      path: join(STORIES_DIR, 'dungeo.sharpee'),
    });
    expect(report.ok).toBe(true);
    expect(report.manifest).toBeDefined();
    expect(report.reason).toBeUndefined();
  }, 60_000);

  it('flags a non-existent bundle path as unhealthy with kind=unknown', async () => {
    const checker = createStoryHealthChecker();
    const report = await checker.validate({
      slug: 'nonexistent',
      path: '/tmp/zifmia-nope.sharpee',
    });
    expect(report.ok).toBe(false);
    expect(report.reason).toBeDefined();
    // A missing file is not a missing package — it's a filesystem error.
    expect(report.reason?.kind).toBe('unknown');
  }, 30_000);

  it('classifies an out-of-baseline import as kind=missing_package with the package name', async () => {
    const bundlePath = makeSyntheticBundle({
      slug: 'bad-import',
      storyJs:
        "import 'nonexistent-baseline-package-xyz';\nexport const story = { config: { id: 'bad-import', version: '1.0.0', name: 'bad' } };\n",
    });
    const checker = createStoryHealthChecker();
    const report = await checker.validate({
      slug: 'bad-import',
      path: bundlePath,
    });
    expect(report.ok).toBe(false);
    expect(report.reason).toEqual({
      kind: 'missing_package',
      package: 'nonexistent-baseline-package-xyz',
    });
  }, 30_000);

  it('formatReason renders each union arm as a single line', () => {
    expect(formatReason({ kind: 'missing_package', package: '@sharpee/foo' }))
      .toBe('missing package: @sharpee/foo');
    expect(
      formatReason({ kind: 'manifest_emission_failed', message: 'boom' })
    ).toBe('manifest emission failed: boom');
    expect(formatReason({ kind: 'unknown', message: 'oops' })).toBe('oops');
  });

  it('validateScannerEntries returns one report per entry', async () => {
    const scanner = createStoryScanner({ dir: STORIES_DIR });
    const checker = createStoryHealthChecker();
    const reports = await validateScannerEntries(scanner, checker);
    expect(reports).toHaveLength(scanner.list().length);
    const dungeo = reports.find((r) => r.slug === 'dungeo');
    expect(dungeo?.ok).toBe(true);
  }, 60_000);

  it('withHealthFilter hides unhealthy slugs from GET /api/stories', () => {
    const scanner = createStoryScanner({
      entries: [
        { slug: 'good', path: '/fake/good.sharpee' },
        { slug: 'bad', path: '/fake/bad.sharpee' },
      ],
    });
    const filtered = withHealthFilter(scanner, new Set(['bad']));
    expect(filtered.list().map((e) => e.slug)).toEqual(['good']);
    expect(filtered.has('bad')).toBe(false);
    expect(filtered.has('good')).toBe(true);
    expect(filtered.get('bad')).toBeUndefined();
  });
});

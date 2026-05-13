/**
 * StoryHealth validation tests — REAL engine boot against the real
 * dungeo bundle for OK; synthetic bad path for failure.
 */

import { join } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { createStoryHealthChecker, validateScannerEntries, withHealthFilter } from '../src/engine/story-health.js';
import { createStoryScanner } from '../src/stories/scanner.js';
import { clearStoryCacheForTests } from '../src/engine/bundle-loader.js';

const REPO_ROOT = join(__dirname, '..', '..', '..');
const STORIES_DIR = join(REPO_ROOT, 'dist', 'stories');

describe('StoryHealth (REAL-PATH)', () => {
  beforeEach(() => {
    clearStoryCacheForTests();
  });

  it('validates dungeo.sharpee → ok with manifest', async () => {
    const checker = createStoryHealthChecker();
    const report = await checker.validate({
      slug: 'dungeo',
      path: join(STORIES_DIR, 'dungeo.sharpee')
    });
    expect(report.ok).toBe(true);
    expect(report.manifest).toBeDefined();
  }, 60_000);

  it('flags a non-existent bundle as unhealthy with a reason', async () => {
    const checker = createStoryHealthChecker();
    const report = await checker.validate({
      slug: 'nonexistent',
      path: '/tmp/zifmia-nope.sharpee'
    });
    expect(report.ok).toBe(false);
    expect(report.reason).toBeDefined();
  }, 30_000);

  it('validateScannerEntries returns one report per entry', async () => {
    const scanner = createStoryScanner({ dir: STORIES_DIR });
    const checker = createStoryHealthChecker();
    const reports = await validateScannerEntries(scanner, checker);
    expect(reports).toHaveLength(scanner.list().length);
    // dungeo should be present and healthy.
    const dungeo = reports.find((r) => r.slug === 'dungeo');
    expect(dungeo?.ok).toBe(true);
  }, 60_000);

  it('withHealthFilter hides unhealthy slugs from GET /api/stories', () => {
    const scanner = createStoryScanner({
      entries: [
        { slug: 'good', path: '/fake/good.sharpee' },
        { slug: 'bad', path: '/fake/bad.sharpee' }
      ]
    });
    const filtered = withHealthFilter(scanner, new Set(['bad']));
    expect(filtered.list().map((e) => e.slug)).toEqual(['good']);
    expect(filtered.has('bad')).toBe(false);
    expect(filtered.has('good')).toBe(true);
    expect(filtered.get('bad')).toBeUndefined();
  });
});

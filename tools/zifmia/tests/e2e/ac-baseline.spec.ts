/**
 * AC-baseline — Story Runtime Baseline coverage (ADR-178 §AC-4 + §AC-6).
 *
 * REAL-PATH: spawned `node dist/main.js`, no app.inject, no stub. The
 * baseline_version value must round-trip from the manifest through the
 * server to a real HTTP client, and a bundle that imports a
 * non-baseline package must fail its boot-time health check and be
 * excluded from `GET /api/stories`.
 */

import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';

interface StoriesResponse {
  baseline_version: number;
  stories: Array<{ slug: string }>;
}

function makeBadBundle(slug: string, missingPackage: string): {
  filePath: string;
  cleanup: () => void;
} {
  const dir = mkdtempSync(join(tmpdir(), 'zifmia-bad-bundle-e2e-'));
  const meta = {
    format: 'sharpee-story',
    formatVersion: 1,
    id: slug,
    title: slug,
    author: 'e2e',
    version: '1.0.0',
    description: '',
    sharpeeVersion: '>=0.0.0',
    ifid: '',
    hasAssets: false,
    hasTheme: false,
    preferredTheme: 'classic-light',
  };
  const storyJs = `import '${missingPackage}';\nexport const story = { config: { id: '${slug}', version: '1.0.0', name: '${slug}' } };\n`;
  const zipped = zipSync({
    'meta.json': strToU8(JSON.stringify(meta)),
    'story.js': strToU8(storyJs),
  });
  const filePath = join(dir, `${slug}.sharpee`);
  writeFileSync(filePath, zipped);
  return {
    filePath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test('AC-baseline: GET /api/stories includes top-level baseline_version', async () => {
  const server: ZifmiaProcess = await spawnZifmiaServer();
  try {
    const res = await fetch(`${server.baseURL}/api/stories`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as StoriesResponse;

    expect(typeof body.baseline_version).toBe('number');
    expect(Number.isInteger(body.baseline_version)).toBe(true);
    expect(body.baseline_version).toBeGreaterThan(0);

    // Per-story rows MUST NOT carry the field — it's server-wide.
    expect(Array.isArray(body.stories)).toBe(true);
    for (const story of body.stories) {
      expect(story).not.toHaveProperty('baseline_version');
    }
  } finally {
    await server.stop();
  }
});

test('AC-baseline: bundle importing non-baseline package is excluded from GET /api/stories', async () => {
  const missingPackage = 'nonexistent-baseline-pkg-adr178-e2e';
  const bad = makeBadBundle('bad-adr178', missingPackage);

  try {
    const server: ZifmiaProcess = await spawnZifmiaServer({
      seedStories: [
        'dungeo.sharpee',
        { name: 'bad-adr178.sharpee', sourcePath: bad.filePath },
      ],
      captureStderr: true,
    });
    try {
      const body = (await (
        await fetch(`${server.baseURL}/api/stories`)
      ).json()) as StoriesResponse;

      const slugs = body.stories.map((s) => s.slug);
      expect(slugs).toContain('dungeo');
      expect(slugs).not.toContain('bad-adr178');

      // Boot log surfaces the offending package name so operators can
      // act on the failure without grepping a free-text error string.
      const stderr = server.stderrLog();
      expect(stderr).toContain('bad-adr178');
      expect(stderr).toContain(missingPackage);
    } finally {
      await server.stop();
    }
  } finally {
    bad.cleanup();
  }
});

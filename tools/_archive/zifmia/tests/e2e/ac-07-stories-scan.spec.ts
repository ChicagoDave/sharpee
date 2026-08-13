/**
 * AC-7 — directory-scanned stories.
 *
 * ADR-177 §AC-7: "Dropping a new `.sharpee` file into `stories/` and
 * sending SIGHUP makes it appear in `GET /api/stories`. Removing the
 * file removes it from the list."
 *
 * REAL-PATH: spawned server, real filesystem, real SIGHUP signal.
 */

import { test, expect } from '@playwright/test';
import { copyFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { getJSON } from './helpers/api';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const SOURCE_BUNDLE = join(REPO_ROOT, 'dist', 'stories', 'dungeo.sharpee');

interface StoriesResponse {
  stories: Array<{ slug: string }>;
}

async function listSlugs(baseURL: string): Promise<string[]> {
  const r = await getJSON<StoriesResponse>(baseURL, '/api/stories');
  return r.stories.map((s) => s.slug).sort();
}

async function waitForSlug(
  baseURL: string,
  predicate: (slugs: string[]) => boolean,
  timeoutMs = 3000
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let last: string[] = [];
  while (Date.now() < deadline) {
    last = await listSlugs(baseURL);
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, 50));
  }
  return last;
}

test('AC-7: SIGHUP rescans stories — drop appears, removal disappears', async () => {
  // Boot with no seeded stories so we can observe the empty -> 1 -> 0 path.
  const server: ZifmiaProcess = await spawnZifmiaServer({ seedStories: [] });
  try {
    expect(await listSlugs(server.baseURL)).toEqual([]);

    // Drop a bundle and SIGHUP.
    const dropPath = join(server.storiesDir, 'dungeo.sharpee');
    copyFileSync(SOURCE_BUNDLE, dropPath);

    server.child.kill('SIGHUP');
    const afterDrop = await waitForSlug(server.baseURL, (s) => s.includes('dungeo'));
    expect(afterDrop).toContain('dungeo');

    // Remove and SIGHUP.
    unlinkSync(dropPath);
    server.child.kill('SIGHUP');
    const afterRemove = await waitForSlug(server.baseURL, (s) => !s.includes('dungeo'));
    expect(afterRemove).not.toContain('dungeo');
  } finally {
    await server.stop();
  }
});

test('AC-7: seeded boot exposes story without SIGHUP', async () => {
  const server: ZifmiaProcess = await spawnZifmiaServer();
  try {
    const slugs = await listSlugs(server.baseURL);
    expect(slugs).toContain('dungeo');
  } finally {
    await server.stop();
  }
});

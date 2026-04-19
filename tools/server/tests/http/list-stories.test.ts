/**
 * GET /api/stories behavior tests.
 *
 * Behavior Statement — listStoriesRoute
 *   DOES: returns an array of { slug, title, path } for every `.sharpee`
 *         file in STORIES_DIR; returns an empty array if the directory is
 *         empty or missing.
 *   WHEN: a GET request hits the endpoint.
 *   BECAUSE: the operator preloads stories and the room-creation UI needs
 *            to list them for the user (ADR-153 Decision 3).
 *   REJECTS WHEN: never — the endpoint always returns 200.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

describe('GET /api/stories', () => {
  let app: TestAppHandle;

  afterEach(() => {
    app?.cleanup();
  });

  it('lists two stories when the directory holds two .sharpee files', async () => {
    app = buildTestApp({ stories: ['zork', 'cloak'] });
    const res = await app.fetch('/api/stories');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stories: Array<{ slug: string; title: string; path: string }> };
    const slugs = body.stories.map((s) => s.slug).sort();
    expect(slugs).toEqual(['cloak', 'zork']);
    for (const s of body.stories) {
      expect(s.path).toContain(`${s.slug}.sharpee`);
    }
  });

  it('returns an empty array for an empty stories directory', async () => {
    app = buildTestApp({ stories: [] });
    const res = await app.fetch('/api/stories');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stories: unknown[] };
    expect(body.stories).toEqual([]);
  });
});

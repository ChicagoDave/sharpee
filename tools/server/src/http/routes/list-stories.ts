/**
 * GET /api/stories — lists `.sharpee` files visible to the server.
 *
 * Public interface: {@link registerListStoriesRoute}, {@link ListStoriesDeps}.
 * Bounded context: HTTP layer (ADR-153 Decision 3 — operator-loaded stories).
 */

import type { Hono } from 'hono';
import type { StoryScanner } from '../../stories/scanner.js';

export interface ListStoriesDeps {
  stories: StoryScanner;
}

export interface ListStoriesResponse {
  stories: Array<{ slug: string; title: string; path: string }>;
}

export function registerListStoriesRoute(app: Hono, deps: ListStoriesDeps): void {
  app.get('/api/stories', (c) => {
    const response: ListStoriesResponse = { stories: deps.stories.list() };
    return c.json(response, 200);
  });
}

/**
 * GET /api/stories — lists `.sharpee` files visible to the server.
 *
 * Public interface: {@link registerListStoriesRoute}, {@link ListStoriesDeps}.
 * Wire types (`StorySummary`, `ListStoriesResponse`) live in
 * `../../wire/http-api.ts` — shared with the browser client.
 *
 * Bounded context: HTTP layer (ADR-153 Decision 3 — operator-loaded stories).
 */

import type { Hono } from 'hono';
import type { StoryScanner } from '../../stories/scanner.js';
import type { ListStoriesResponse } from '../../wire/http-api.js';

export interface ListStoriesDeps {
  stories: StoryScanner;
}

export function registerListStoriesRoute(app: Hono, deps: ListStoriesDeps): void {
  app.get('/api/stories', (c) => {
    const response: ListStoriesResponse = { stories: deps.stories.list() };
    return c.json(response, 200);
  });
}

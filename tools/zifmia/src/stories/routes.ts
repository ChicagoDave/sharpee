/**
 * Stories HTTP route per ADR-177 §4.
 *
 * Public interface: {@link registerStoriesRoutes}.
 * Owner: zifmia server, HTTP surface.
 *
 * Route shipped here:
 *   GET /api/stories — list available stories (directory-scanned).
 *
 * No POST surface; stories are operator-managed via the filesystem
 * (ADR-177 §7 + "Constrains Future Sessions" — no upload endpoint).
 */

import type { FastifyInstance } from 'fastify';
import type { StoryScanner } from './scanner.js';

export function registerStoriesRoutes(app: FastifyInstance, scanner: StoryScanner): void {
  app.get('/api/stories', async () => ({
    stories: scanner.list().map((e) => ({ slug: e.slug }))
  }));
}

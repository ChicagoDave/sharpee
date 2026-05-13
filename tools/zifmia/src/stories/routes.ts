/**
 * Stories HTTP route per ADR-177 §4 and ADR-178 §AC-4.
 *
 * Public interface: {@link registerStoriesRoutes}.
 * Owner: zifmia server, HTTP surface.
 *
 * Route shipped here:
 *   GET /api/stories — list available stories (directory-scanned).
 *
 * Response shape: `{ baseline_version: number, stories: [{ slug }] }`.
 * `baseline_version` is the Story Runtime Baseline version this Zifmia
 * image ships (ADR-178). It lives at the top level, not on per-story
 * rows, because it is a server-wide constant.
 *
 * No POST surface; stories are operator-managed via the filesystem
 * (ADR-177 §7 + "Constrains Future Sessions" — no upload endpoint).
 */

import type { FastifyInstance } from 'fastify';
import { BASELINE_VERSION } from '@sharpee/story-runtime-baseline';
import type { StoryScanner } from './scanner.js';

export function registerStoriesRoutes(app: FastifyInstance, scanner: StoryScanner): void {
  app.get('/api/stories', async () => ({
    baseline_version: BASELINE_VERSION,
    stories: scanner.list().map((e) => ({ slug: e.slug }))
  }));
}

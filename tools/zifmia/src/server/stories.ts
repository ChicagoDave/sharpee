/**
 * @module @sharpee/zifmia/server/stories
 * @purpose Public story-library read route — `GET /stories`. Returns
 *   the set of active stories available for room creation, collapsed
 *   to one entry per `storyId` at its most-recently-installed version.
 *   Mirrors the version-selection rule used by `POST /rooms`
 *   (rooms.ts: most-recent install wins; version-string tiebreaker).
 * @owner Zifmia server (tools/zifmia/server).
 *
 * The route is unauthenticated by design: the room-creation dropdown
 * in the lobby is rendered before a user picks a room, and the data
 * (storyId, title, version) is already exposed via `GET /rooms`
 * indirectly (rooms carry `storyId` + `bundleVersion`). Admin-only
 * fields (`installedBy`, `installedAt`, the full per-version list)
 * stay behind `GET /admin/stories`.
 */

import type { FastifyInstance } from 'fastify';

import type { StorageAdapter } from '../storage/adapter';

export interface StoryRouteOptions {
  adapter: StorageAdapter;
}

/** Wire shape of one row in the `GET /stories` response. */
export interface StorySummary {
  storyId: string;
  title: string;
  version: string;
}

interface StoriesResponseBody {
  stories: StorySummary[];
}

export function registerStoriesRoute(
  app: FastifyInstance,
  options: StoryRouteOptions
): void {
  app.get('/stories', async (): Promise<StoriesResponseBody> => {
    const entries = await options.adapter.listStories({ activeOnly: true });
    // Group by storyId, then pick the most-recently-installed version
    // per group (matches the latest-version rule in rooms.ts).
    const byStory = new Map<string, typeof entries>();
    for (const entry of entries) {
      const bucket = byStory.get(entry.storyId);
      if (bucket) {
        bucket.push(entry);
      } else {
        byStory.set(entry.storyId, [entry]);
      }
    }
    const summaries: StorySummary[] = [];
    for (const [storyId, versions] of byStory) {
      versions.sort((a, b) => {
        if (b.installedAt !== a.installedAt) {
          return b.installedAt - a.installedAt;
        }
        return b.version.localeCompare(a.version);
      });
      const latest = versions[0];
      summaries.push({
        storyId,
        title: latest.title,
        version: latest.version
      });
    }
    summaries.sort((a, b) => a.title.localeCompare(b.title));
    return { stories: summaries };
  });
}

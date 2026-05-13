/**
 * Channel-manifest cache: one cached `CmgtPacket` per story slug.
 *
 * Public interface: {@link ManifestCache}, {@link createManifestCache}.
 * Owner: zifmia server, engine domain.
 *
 * The engine emits `channel:manifest` once during `setStory()` /
 * `start()`. The manifest is a function of the story (and its
 * channel registrations) — it does not vary across rooms running
 * the same story. The cache lazily boots a one-shot engine on first
 * request per slug and stores the captured manifest for subsequent
 * lookups. `StoryHealth.validate()` uses the same boot path to smoke-
 * test a freshly-scanned bundle.
 */

import type { CmgtPacket } from '@sharpee/if-domain';
import type { StoryScanner } from '../stories/scanner.js';
import { captureManifest } from './turn-executor.js';
import { loadStoryFromFile } from './bundle-loader.js';

export interface ManifestCache {
  /** Resolve the manifest for `slug`, booting the engine on cache miss. */
  get(slug: string): Promise<CmgtPacket | null>;
  /** Drop the cached manifest for `slug` (after a rescan). */
  invalidate(slug: string): void;
  /** Drop all cached manifests. */
  clear(): void;
}

export interface CreateManifestCacheOptions {
  scanner: StoryScanner;
}

export function createManifestCache(options: CreateManifestCacheOptions): ManifestCache {
  const cache = new Map<string, Promise<CmgtPacket | null>>();

  return {
    get(slug) {
      const cached = cache.get(slug);
      if (cached) return cached;
      const entry = options.scanner.get(slug);
      if (!entry) return Promise.resolve(null);
      const promise = (async () => {
        const story = await loadStoryFromFile({ storyId: slug, filePath: entry.path });
        return captureManifest(story);
      })();
      cache.set(slug, promise);
      return promise;
    },
    invalidate(slug) {
      cache.delete(slug);
    },
    clear() {
      cache.clear();
    }
  };
}

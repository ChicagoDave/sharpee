/**
 * StoryHealth — per-story engine boot validation per ADR-177 §7.
 *
 * Public interface: {@link StoryHealthChecker},
 * {@link createStoryHealthChecker}, {@link validateScannerEntries}.
 * Owner: zifmia server, engine domain.
 *
 * Boots a one-shot engine for each scanned `.sharpee` bundle and
 * confirms the manifest emission. Failed stories are flagged in the
 * boot log; the scanner excludes them from `GET /api/stories`.
 *
 * The boot is heavy (one full GameEngine instantiation per story);
 * the manifest cache amortizes by sharing the same engine boot path.
 * For the initial check, we run validation in parallel-but-bounded
 * fashion (sequential by default — operators with many stories can
 * tune via `concurrency`).
 */

import type { CmgtPacket } from '@sharpee/if-domain';
import { loadStoryFromFile } from './bundle-loader.js';
import { captureManifest } from './turn-executor.js';
import type { StoryScanner, StoryEntry } from '../stories/scanner.js';

export interface StoryHealthReport {
  readonly slug: string;
  readonly path: string;
  readonly ok: boolean;
  readonly reason?: string;
  readonly manifest?: CmgtPacket | null;
}

export interface StoryHealthChecker {
  validate(entry: StoryEntry): Promise<StoryHealthReport>;
}

export function createStoryHealthChecker(): StoryHealthChecker {
  return {
    async validate(entry) {
      try {
        const story = await loadStoryFromFile({ storyId: entry.slug, filePath: entry.path });
        const manifest = await captureManifest(story);
        return { slug: entry.slug, path: entry.path, ok: true, manifest };
      } catch (err) {
        return {
          slug: entry.slug,
          path: entry.path,
          ok: false,
          reason: err instanceof Error ? err.message : String(err)
        };
      }
    }
  };
}

/**
 * Validate every entry currently listed by the scanner. Returns the
 * reports for callers that want to log + display.
 */
export async function validateScannerEntries(
  scanner: StoryScanner,
  checker: StoryHealthChecker
): Promise<StoryHealthReport[]> {
  const reports: StoryHealthReport[] = [];
  for (const entry of scanner.list()) {
    reports.push(await checker.validate(entry));
  }
  return reports;
}

/**
 * Filtered scanner adapter — wraps an inner scanner and excludes
 * slugs flagged unhealthy by a prior validation run. Used by the
 * `GET /api/stories` route to keep broken bundles invisible.
 */
export function withHealthFilter(
  inner: StoryScanner,
  unhealthySlugs: ReadonlySet<string>
): StoryScanner {
  return {
    list: () => inner.list().filter((e) => !unhealthySlugs.has(e.slug)),
    has: (slug) => !unhealthySlugs.has(slug) && inner.has(slug),
    get: (slug) => (unhealthySlugs.has(slug) ? undefined : inner.get(slug)),
    rescan: () => inner.rescan()
  };
}

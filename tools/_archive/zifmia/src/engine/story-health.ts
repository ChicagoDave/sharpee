/**
 * StoryHealth — per-story engine boot validation per ADR-177 §7 and
 * ADR-178 §AC-6.
 *
 * Public interface: {@link StoryHealthChecker},
 * {@link createStoryHealthChecker}, {@link validateScannerEntries},
 * {@link withHealthFilter}, {@link formatReason}.
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
 *
 * ADR-178 reshape: `reason` is a discriminated union over
 * `'missing_package' | 'manifest_emission_failed' | 'unknown'` so the
 * boot log and any future `/health` endpoint can surface the
 * offending package name without parsing free-text error strings.
 */

import type { CmgtPacket } from '@sharpee/if-domain';
import { loadStoryFromFile } from './bundle-loader.js';
import { captureManifest } from './turn-executor.js';
import type { StoryScanner, StoryEntry } from '../stories/scanner.js';

export type StoryHealthFailureReason =
  | { kind: 'missing_package'; package: string }
  | { kind: 'manifest_emission_failed'; message: string }
  | { kind: 'unknown'; message: string };

export interface StoryHealthReport {
  readonly slug: string;
  readonly path: string;
  readonly ok: boolean;
  readonly reason?: StoryHealthFailureReason;
  readonly manifest?: CmgtPacket | null;
}

export interface StoryHealthChecker {
  validate(entry: StoryEntry): Promise<StoryHealthReport>;
}

const MODULE_NOT_FOUND_PATTERNS: ReadonlyArray<RegExp> = [
  // Node ESM: "Cannot find package '<name>' imported from <importer>"
  /Cannot find package '([^']+)'/,
  // Node CJS: "Cannot find module '<name>'"
  /Cannot find module '([^']+)'/,
  // Vite/Vitest loader: "Failed to load url <name> (resolved id: <name>)"
  // — surfaced when story.js is imported through vitest's loader rather
  // than Node's native ESM resolver (unit test mode).
  /Failed to load url ([^ ]+) \(resolved id:/,
];

/**
 * Extract the offending bare package name from a Node module-not-found
 * error message. Strips subpath segments (`@sharpee/stdlib/foo` →
 * `@sharpee/stdlib`) so callers can compare against the baseline list.
 */
function extractMissingPackage(message: string): string | undefined {
  for (const pattern of MODULE_NOT_FOUND_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const raw = match[1];
      if (raw.startsWith('@')) {
        const [scope, name] = raw.split('/');
        return name ? `${scope}/${name}` : scope;
      }
      return raw.split('/')[0];
    }
  }
  return undefined;
}

function classifyLoadError(err: unknown): StoryHealthFailureReason {
  const message = err instanceof Error ? err.message : String(err);
  const pkg = extractMissingPackage(message);
  if (pkg) {
    return { kind: 'missing_package', package: pkg };
  }
  return { kind: 'unknown', message };
}

/**
 * Render a failure reason as a human-readable string for boot logs.
 *
 * DOES: returns a single-line string keyed on `reason.kind` — names the
 * offending package for `missing_package`, prefixes the underlying
 * message for `manifest_emission_failed` and `unknown`.
 * WHEN: called by the boot log or any consumer that needs to display
 * a failure to a human (operator log, future `/health` endpoint).
 * BECAUSE: the union is machine-readable; consumers that want to print
 * it need a single rendering convention so log output stays consistent
 * regardless of where the failure originated.
 */
export function formatReason(reason: StoryHealthFailureReason): string {
  switch (reason.kind) {
    case 'missing_package':
      return `missing package: ${reason.package}`;
    case 'manifest_emission_failed':
      return `manifest emission failed: ${reason.message}`;
    case 'unknown':
      return reason.message;
  }
}

export function createStoryHealthChecker(): StoryHealthChecker {
  return {
    async validate(entry) {
      let story;
      try {
        story = await loadStoryFromFile({ storyId: entry.slug, filePath: entry.path });
      } catch (err) {
        return {
          slug: entry.slug,
          path: entry.path,
          ok: false,
          reason: classifyLoadError(err),
        };
      }

      try {
        const manifest = await captureManifest(story);
        return { slug: entry.slug, path: entry.path, ok: true, manifest };
      } catch (err) {
        return {
          slug: entry.slug,
          path: entry.path,
          ok: false,
          reason: {
            kind: 'manifest_emission_failed',
            message: err instanceof Error ? err.message : String(err),
          },
        };
      }
    },
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
    rescan: () => inner.rescan(),
  };
}

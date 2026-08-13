/**
 * StoryScanner — minimal Phase 2 implementation.
 *
 * Public interface: {@link StoryScanner}, {@link createStoryScanner},
 * {@link StoryEntry}.
 * Owner: zifmia server, stories domain.
 *
 * Per ADR-177 §7, the server enumerates `stories/` on boot. Phase 2
 * delivers basic directory listing — the per-story health check
 * (`StoryHealth.validate()` via a brief engine instantiation) is
 * deferred to Phase 5 or 7 per the plan.
 *
 * What counts as a story for Phase 2:
 *   - Files matching `*.sharpee` (the runtime bundle format).
 *
 * Boot model:
 *   - `createStoryScanner({ dir })` reads the directory eagerly and
 *     caches the list. Operator drops a new bundle → SIGHUP triggers
 *     `rescan()` (Phase 5 or 7 wires SIGHUP).
 *   - For testing, pass `{ entries }` to inject a fixed list and skip
 *     filesystem I/O entirely. This is NOT a stub-of-owned-dependency
 *     per CLAUDE.md rule 13a — the scanner's *contract* is "expose a
 *     list of slugs"; how the list is sourced is an implementation
 *     detail. Tests of the filesystem path live alongside the helper.
 */

import { readdirSync, statSync } from 'node:fs';
import { extname, join, basename } from 'node:path';

export interface StoryEntry {
  /** Slug used in URLs (`POST /api/rooms { story_slug }`). */
  readonly slug: string;
  /** Absolute or repo-relative path to the bundle file. */
  readonly path: string;
}

export interface StoryScanner {
  list(): readonly StoryEntry[];
  has(slug: string): boolean;
  get(slug: string): StoryEntry | undefined;
  rescan(): void;
}

export interface CreateStoryScannerOptions {
  /** Directory to scan for `*.sharpee` files. */
  dir?: string;
  /** Bypass filesystem and use this list (tests). */
  entries?: readonly StoryEntry[];
}

function scanDirectory(dir: string): StoryEntry[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out: StoryEntry[] = [];
  for (const name of names) {
    if (extname(name).toLowerCase() !== '.sharpee') continue;
    const full = join(dir, name);
    try {
      const s = statSync(full);
      if (!s.isFile()) continue;
    } catch {
      continue;
    }
    out.push({ slug: basename(name, extname(name)), path: full });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Construct a StoryScanner. Provide `dir` to scan a filesystem
 * directory, or `entries` to inject a fixed list (tests).
 */
export function createStoryScanner(options: CreateStoryScannerOptions): StoryScanner {
  let cache: StoryEntry[] = [];

  const refresh = () => {
    if (options.entries) {
      cache = [...options.entries];
    } else if (options.dir) {
      cache = scanDirectory(options.dir);
    } else {
      cache = [];
    }
  };

  refresh();

  return {
    list: () => cache,
    has: (slug: string) => cache.some((e) => e.slug === slug),
    get: (slug: string) => cache.find((e) => e.slug === slug),
    rescan: refresh
  };
}

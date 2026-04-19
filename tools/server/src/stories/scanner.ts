/**
 * Story scanner — lists `.sharpee` files available to the server.
 *
 * Public interface: {@link StoryScanner}, {@link createStoryScanner},
 * {@link StoryEntry}.
 * Bounded context: story loading (ADR-153 Decision 3 — operator-loaded,
 * never user-uploaded).
 *
 * The scanner never introspects the file contents; title/author/version
 * metadata lives inside the compiled story and is surfaced by the
 * sandbox's `READY` message at runtime (Phase 4+).
 */

import { readdirSync, existsSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';

export interface StoryEntry {
  /** Filename minus `.sharpee` extension. The canonical identifier in the API. */
  slug: string;
  /** Absolute path to the `.sharpee` file on disk. */
  path: string;
  /** Human-visible title. Until the sandbox supplies one, equals the slug. */
  title: string;
}

export interface StoryScanner {
  list(): StoryEntry[];
  findBySlug(slug: string): StoryEntry | null;
}

/**
 * Scan `storiesDir` for `.sharpee` files.
 *
 * @param storiesDir absolute path; need not exist (a missing dir yields `[]`).
 * @returns a StoryScanner bound to the directory.
 */
export function createStoryScanner(storiesDir: string): StoryScanner {
  function list(): StoryEntry[] {
    if (!existsSync(storiesDir)) return [];
    return readdirSync(storiesDir)
      .filter((f) => extname(f) === '.sharpee')
      .map((f) => ({
        slug: basename(f, '.sharpee'),
        path: resolve(storiesDir, f),
        title: basename(f, '.sharpee'),
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug));
  }

  return {
    list,
    findBySlug(slug) {
      return list().find((s) => s.slug === slug) ?? null;
    },
  };
}

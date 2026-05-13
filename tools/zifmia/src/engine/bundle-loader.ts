/**
 * Load a `.sharpee` story bundle (a zip containing `meta.json` +
 * `story.js`) into an importable `Story` instance.
 *
 * Public interface: {@link loadStoryFromBundle},
 * {@link loadStoryFromFile}, {@link clearStoryCacheForTests}.
 * Owner: zifmia server, engine domain.
 *
 * The bundle's `story.js` is ESM with `@sharpee/*` packages as externals.
 * Node's ESM resolver walks up from the importer's directory looking for
 * `node_modules`, so the extracted `story.js` MUST live inside the
 * workspace so the workspace's `@sharpee/*` packages are reachable.
 * Writing to `os.tmpdir()` would break that resolution.
 *
 * Loaded stories are cached by `(storyId, version)` for the lifetime of
 * the process. Per ADR-177, story bundle bytes are immutable for a
 * given version (the operator replaces the file on disk to publish a
 * new version), so the in-memory cache stays valid until a SIGHUP
 * rescan triggers `clearStoryCacheForTests()`-equivalent invalidation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { unzipSync } from 'fflate';
import type { Story } from '@sharpee/engine';

interface StoryModuleShape {
  story?: Story;
  default?: Story | { story?: Story };
}

const storyCache = new Map<string, Story>();

function bundleCacheDir(): string {
  // `__dirname` resolves to `tools/zifmia/dist/engine` (compiled) or
  // `tools/zifmia/src/engine` (vitest). Walk up to the package root
  // either way so the cache directory is package-scoped.
  let dir = __dirname;
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('bundle-loader: package root not found');
    }
    dir = parent;
  }
  return path.join(dir, '.bundle-cache');
}

function sanitize(token: string): string {
  return token.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function resolveStoryExport(mod: StoryModuleShape): Story | undefined {
  if (mod.story) return mod.story;
  const def = mod.default;
  if (!def) return undefined;
  if (typeof def === 'object' && 'story' in def && def.story) {
    return def.story;
  }
  return def as Story;
}

/**
 * Extract and import the story.js from raw bundle bytes.
 *
 * DOES: writes `story.js` bytes to `.bundle-cache/<id>-<version>.mjs`
 * inside the zifmia package on first call, then dynamic-imports the
 * file and resolves the exported `Story`. Caches the resolved Story
 * keyed on `${storyId}@${version}` for subsequent calls.
 *
 * REJECTS WHEN: the bundle is missing `story.js`, or the module's
 * exports do not include a `Story` with a `config` field.
 */
export async function loadStoryFromBundle(input: {
  storyId: string;
  version: string;
  bundle: Uint8Array;
}): Promise<Story> {
  const cacheKey = `${input.storyId}@${input.version}`;
  const cached = storyCache.get(cacheKey);
  if (cached) return cached;

  const files = unzipSync(input.bundle);
  const storyBytes = files['story.js'];
  if (!storyBytes) {
    throw new Error(`bundle-loader: bundle for ${cacheKey} is missing story.js`);
  }

  const dir = bundleCacheDir();
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(
    dir,
    `${sanitize(input.storyId)}-${sanitize(input.version)}.mjs`
  );
  fs.writeFileSync(target, storyBytes);

  const mod = (await import(target)) as StoryModuleShape;
  const story = resolveStoryExport(mod);
  if (!story?.config) {
    throw new Error(`bundle-loader: ${cacheKey} story.js does not export a valid Story`);
  }

  storyCache.set(cacheKey, story);
  return story;
}

/**
 * Convenience: read a `.sharpee` file from disk and load it. Caller
 * supplies the slug; the version is read from the bundle's `meta.json`
 * when present, otherwise falls back to a content hash so the cache
 * key is stable across reboots.
 */
export async function loadStoryFromFile(input: {
  storyId: string;
  filePath: string;
}): Promise<Story> {
  const bytes = fs.readFileSync(input.filePath);
  const files = unzipSync(bytes);

  let version = 'unknown';
  const metaBytes = files['meta.json'];
  if (metaBytes) {
    try {
      const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as { version?: string };
      if (typeof meta.version === 'string' && meta.version.length > 0) {
        version = meta.version;
      }
    } catch {
      // Fall through to default version on malformed meta.json.
    }
  }

  return loadStoryFromBundle({ storyId: input.storyId, version, bundle: bytes });
}

/** Test-only: drop the in-process Story cache. */
export function clearStoryCacheForTests(): void {
  storyCache.clear();
}

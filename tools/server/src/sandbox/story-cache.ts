/**
 * Install-time bundle cache — mtime-keyed wrapper over compileStoryBundle.
 *
 * Public interface: {@link getCompiledBundle}.
 * Bounded context: sandbox install-time compilation (ADR-153 Phase 4
 *   remediation plan, sub-phase 4-REMEDIATION-2).
 *
 * Operator model: a `.sharpee` file lands in /data/stories/. The first room
 * spawn that asks for it triggers a compile; subsequent spawns find the
 * compiled artifact in /data/stories-compiled/ (or
 * `$STORIES_COMPILED_DIR`) and skip the work. When the source file's mtime
 * advances (operator dropped in a new version), the cached bundle is
 * rebuilt on the next lookup.
 *
 * Concurrency: a per-source in-flight map deduplicates concurrent lookups
 * for the same story so two simultaneous room spawns never race the esbuild
 * call on the same source.
 */

import { promises as fs } from 'node:fs';
import { basename, extname, join, resolve as resolvePath } from 'node:path';
import { compileStoryBundle } from './story-bundler.js';

/** Minimum size (bytes) for a cached bundle to be considered intact. */
const MIN_BUNDLE_BYTES = 1_000;

/**
 * Per-source in-flight promises so two concurrent lookups for the same
 * story share a single compilation. Keyed by absolute source path.
 */
const inFlight = new Map<string, Promise<string>>();

function cacheDir(): string {
  return process.env.STORIES_COMPILED_DIR ?? '/data/stories-compiled';
}

/** Derive the cached bundle path matching story-bundler's slug scheme. */
function expectedBundlePath(sourcePath: string): string {
  const file = basename(sourcePath);
  const slug = file
    .slice(0, file.length - extname(file).length)
    .replace(/[^a-zA-Z0-9._-]/g, '-');
  return join(cacheDir(), `${slug}.host.js`);
}

/** Decide whether the cached bundle is fresh relative to the source. */
async function cachedIsFresh(
  sourcePath: string,
  bundlePath: string,
): Promise<boolean> {
  const [sourceStat, bundleStat] = await Promise.all([
    fs.stat(sourcePath),
    fs.stat(bundlePath).catch(() => null),
  ]);
  if (!bundleStat) return false;
  if (!bundleStat.isFile()) return false;
  if (bundleStat.size < MIN_BUNDLE_BYTES) return false;
  // Treat ties as fresh — fs mtime resolution is coarser than test wall time.
  if (bundleStat.mtimeMs < sourceStat.mtimeMs) return false;
  return true;
}

/**
 * Return the absolute path to the compiled Deno-runnable ESM for this story,
 * compiling on miss and on source-mtime-newer.
 *
 * @param sourcePath Path to a `.sharpee` file. Absolute or cwd-relative.
 * @returns Absolute path to the compiled bundle at `<cacheDir>/<slug>.host.js`.
 */
export async function getCompiledBundle(sourcePath: string): Promise<string> {
  const absSource = resolvePath(sourcePath);
  const bundlePath = expectedBundlePath(absSource);

  if (await cachedIsFresh(absSource, bundlePath)) {
    return bundlePath;
  }

  const existing = inFlight.get(absSource);
  if (existing) return existing;

  const compile = (async (): Promise<string> => {
    await fs.mkdir(cacheDir(), { recursive: true });
    const result = await compileStoryBundle(absSource, { outDir: cacheDir() });
    return result.bundlePath;
  })();

  inFlight.set(absSource, compile);
  try {
    return await compile;
  } finally {
    inFlight.delete(absSource);
  }
}

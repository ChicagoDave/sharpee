/**
 * @module fixtures/build-bundle
 * @purpose Compile and zip the tiny-story fixture into a real `.sharpee`
 *   bundle (meta.json + story.js) for use in turn-executor tests.
 * @owner Zifmia test fixtures.
 *
 * Why a real bundle: per Coding Discipline rule 13a (Integration
 * Reality), a phase named "Turn lifecycle integration" must exercise
 * the real bundle-load path, not a stub. So tests install the bundle
 * via `adapter.installStoryBundle` and the executor extracts and
 * imports `story.js` exactly the way production will.
 *
 * The compiled `story.js` is ESM with `@sharpee/*` as externals,
 * matching the contract used by `@sharpee/bridge` and the production
 * `build.sh -s <story>` output.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';
import { zipSync } from 'fflate';

import { config as tinyConfig } from './tiny-story/story';
import { config as crashingConfig } from './crashing-story/story';

/**
 * Resolve a path under `tests/fixtures/` independently of whether this
 * file is loaded from its source location (under tsx / vitest) or from
 * a compiled output directory (under `node` against `dist-perf` or
 * similar). Walks up from `__dirname` looking for the package root,
 * then joins the well-known source path. Necessary because the
 * fixture's `story.ts` only exists in the source tree — esbuild
 * compiles it on demand, and the entry path must point at the real TS
 * file regardless of where the runner sits in the filesystem.
 */
function fixtureSourcePath(...segments: string[]): string {
  let dir = __dirname;
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('build-bundle: package root not found');
    dir = parent;
  }
  return path.join(dir, 'tests', 'fixtures', ...segments);
}

interface FixtureSpec {
  /** Source path of the fixture's `story.ts` entry. */
  entry: string;
  /** Story config to project into the bundle's `meta.json`. */
  config: typeof tinyConfig;
  /** IFID stamped into the bundle metadata. */
  ifid: string;
}

/** One bundle per fixture, built lazily and cached for the process. */
const bundleCache = new Map<string, Uint8Array>();

async function buildFixture(spec: FixtureSpec): Promise<Uint8Array> {
  const cached = bundleCache.get(spec.config.id);
  if (cached) return cached;

  const result = await esbuild.build({
    entryPoints: [spec.entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    external: ['@sharpee/*'],
    legalComments: 'none',
  });
  if (result.errors.length > 0) {
    throw new Error(
      `build-bundle: esbuild failures for ${spec.config.id}:\n${result.errors
        .map((e) => e.text)
        .join('\n')}`,
    );
  }
  const storyJs = result.outputFiles[0].contents;
  const metaBytes = new TextEncoder().encode(
    JSON.stringify({
      format: 'sharpee-story',
      formatVersion: 1,
      id: spec.config.id,
      title: spec.config.title,
      author: spec.config.author,
      version: spec.config.version,
      description: spec.config.description,
      ifid: spec.ifid,
      hasAssets: false,
      hasTheme: false,
    }),
  );
  const zipped = zipSync({
    'meta.json': metaBytes,
    'story.js': storyJs,
  });
  bundleCache.set(spec.config.id, zipped);
  return zipped;
}

/** Test-only — drop every cached bundle so an edit to a fixture source
 * takes effect on the next call within the same process. */
export function clearTinyFixtureCacheForTests(): void {
  bundleCache.clear();
}

export async function buildTinyFixtureBundle(): Promise<Uint8Array> {
  return buildFixture({
    entry: fixtureSourcePath('tiny-story', 'story.ts'),
    config: tinyConfig,
    ifid: 'TEST-FIXTURE-0001',
  });
}

export async function buildCrashingFixtureBundle(): Promise<Uint8Array> {
  return buildFixture({
    entry: fixtureSourcePath('crashing-story', 'story.ts'),
    config: crashingConfig,
    ifid: 'TEST-FIXTURE-CRASH-0001',
  });
}

export const tinyFixtureConfig = tinyConfig;
export const crashingFixtureConfig = crashingConfig;

/** Convenience for tests that want to write the bundle to disk for
 * inspection. Not used by the test suite directly. */
export async function writeTinyFixtureBundleTo(dest: string): Promise<void> {
  const bundle = await buildTinyFixtureBundle();
  fs.writeFileSync(dest, bundle);
}

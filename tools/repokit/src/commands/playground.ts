/**
 * playground.ts — `./repokit build --playground`: the story-agnostic in-browser
 * playground bundle (ADR-191 Phase 1, Chord mode).
 *
 * Delegates to the ONE shared build core (`buildPlaygroundBundle` in
 * @sharpee/devkit's browser-core, ADR-252 D5 pattern) with the in-repo
 * resolution env, then version-pins the output into the website under
 * `website/public/playground/v<X.Y.Z>/`. A version bump is a deliberate
 * re-run of this command, never a side effect of an unrelated build (ADR-191).
 *
 * Owner context: @sharpee/repokit (in-repo platform build, ADR-187). Assumes the
 * platform packages are already built (esbuild bundles @sharpee/* from dist).
 *
 * Public interface: buildPlaygroundClient(root, opts) -> void.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type PlaygroundBuildEnv, buildPlaygroundBundle } from '@sharpee/devkit';

export interface PlaygroundBuildOptions {
  quiet?: boolean;
}

/** Read the lockstep platform (sharpee) version — the pinned playground version. */
function sharpeeVersion(root: string): string {
  return JSON.parse(readFileSync(join(root, 'packages', 'sharpee', 'package.json'), 'utf8')).version;
}

/**
 * Version-pinned website sync: replicate the built bundle into
 * website/public/playground/v<version>/. Clears the target first so a rebuild of
 * the same version is a clean overwrite. No-op if there is no website.
 */
function syncToWebsite(root: string, outDir: string, version: string): void {
  const publicDir = join(root, 'website', 'public');
  if (!existsSync(publicDir)) return;
  const playgroundDir = join(publicDir, 'playground');
  const pinnedDir = join(playgroundDir, `v${version}`);
  rmSync(pinnedDir, { recursive: true, force: true });
  mkdirSync(pinnedDir, { recursive: true });
  cpSync(outDir, pinnedDir, { recursive: true });
  // Manifest the site reads to resolve the current pinned version (AC-8) — so
  // the page tracks the version without hardcoding it.
  writeFileSync(join(playgroundDir, 'current.json'), JSON.stringify({ version }) + '\n');
}

/**
 * Build the story-agnostic playground bundle into dist/playground/ and pin it to
 * website/public/playground/v<X.Y.Z>/. Reuses the shared core; the in-repo env is
 * the only difference from an author build.
 * @throws if game.js is missing or empty after esbuild (surfaced by the core).
 */
export function buildPlaygroundClient(root: string, opts: PlaygroundBuildOptions = {}): void {
  const env: PlaygroundBuildEnv = {
    stylesDir: join(root, 'packages', 'platform-browser', 'styles'),
    templatesDir: join(root, 'packages', 'devkit', 'templates', 'browser'),
    esbuildCwd: root,
    engineVersion: sharpeeVersion(root),
    sync: (outDir, version) => syncToWebsite(root, outDir, version),
  };
  buildPlaygroundBundle(env, { quiet: opts.quiet });
}

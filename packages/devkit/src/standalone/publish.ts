/**
 * publish.ts — `sharpee publish`: the finish line for a Chord story (ADR-284).
 *
 * Produces the v1 distributable artifact (ADR-284 D2): a zip of the
 * self-contained browser build. Unzip anywhere, open `index.html`, the story
 * runs — which is also exactly the shape itch.io's HTML-project flow accepts.
 *
 * The mechanics live HERE, not in the IDE (D1): Chord Writer's Publish tab
 * invokes this through the resolved toolchain, so a terminal author and an IDE
 * author get the identical artifact and there is no IDE-only publish path.
 *
 * Publication is where Treaty of Babel compliance stops being advisory: a
 * missing `ifid:` is only a compile-time WARNING (ADR-298), but publish
 * hard-errors on it (ADR-298 D5). The check runs before anything is built, so a
 * refused publish leaves no bundle and no half-artifact behind.
 *
 * Public interface: runPublishCommand(args, targetArg), checkPublishable(storyFile),
 * zipDirectory(dir), PublishError.
 * Owner context: packages/devkit — the author CLI.
 */

import * as fs from 'fs';
import * as path from 'path';
import { zipSync } from 'fflate';
import { compile } from '@sharpee/chord';
import { buildBrowser, type BrowserBuildEnv } from './browser-core.js';
import { resolveEngineStylesDir } from './build-browser.js';
import { findStoryFile, makeFsImportResolver } from './author-game.js';
import { StoryConfigError, reconcileHeader } from './story-config.js';
import { platformRanges } from './init.js';

/** A refusal raised before anything is written. */
export class PublishError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PublishError';
  }
}

/** What a publishable story reports about itself. */
export interface PublishTarget {
  storyFile: string;
  projectDir: string;
  storyId: string;
  ifid: string;
}

/** What a completed publish produced. */
export interface PublishResult extends PublishTarget {
  /** The built browser bundle that was zipped (`dist/web/<id>`). */
  outDir: string;
  zipPath: string;
  bytes: number;
}

/**
 * Reads a story's header and decides whether it may be published.
 *
 * Deliberately separate from the build and free of any writing, so the refusal
 * paths can be tested without producing an artifact — and so the IDE's Publish
 * tab can show the preconditions before the author presses anything.
 *
 * @param storyFile absolute or relative path to the `.story` file
 * @returns the story's id and IFID
 * @throws PublishError `publish.story-missing` when the file is not there,
 *   `publish.compile-failed` when the story does not compile (publishing a
 *   story that cannot load is never what the author meant),
 *   `publish.story-config-broken` when the config sidecar exists but cannot
 *   serve as identity (ADR-309 D5 — fix or restore it, never re-mint), or
 *   `publish.missing-ifid` when the story has no identity anywhere —
 *   ADR-309 D6's backstop; publish reconciles but never mints.
 */
export function checkPublishable(storyFile: string): PublishTarget {
  const resolved = path.resolve(storyFile);
  if (!fs.existsSync(resolved)) {
    throw new PublishError('publish.story-missing', `no such story file: ${storyFile}`);
  }
  const projectDir = path.dirname(resolved);

  // ADR-309 D6: publish reconciles through the same shared function the
  // builds use — but with minting DISABLED. Publication must never invent
  // identity: a clone whose config went missing deserves the refusal below,
  // not a silently forked IFID. Adoption (header → new config) still runs.
  try {
    reconcileHeader(resolved, { mint: false });
  } catch (error) {
    if (error instanceof StoryConfigError) {
      throw new PublishError('publish.story-config-broken', error.message);
    }
    throw error;
  }

  const result = compile(fs.readFileSync(resolved, 'utf-8'), {
    importResolver: makeFsImportResolver(projectDir),
  });

  if (!result.ok) {
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    const first = errors[0];
    throw new PublishError(
      'publish.compile-failed',
      `${path.basename(resolved)} does not compile — ${errors.length} error(s), first: ` +
        `${first ? `[${first.code}] ${first.message}` : 'unknown'}`,
    );
  }

  const fields = result.ir.meta.fields;
  const storyId = fields.id ?? 'my-story';
  const ifid = fields.ifid;

  if (!ifid || ifid.trim() === '') {
    // ADR-309 D6's backstop: reconciliation above adopts or renders identity
    // whenever any exists, so reaching here means the story has NO identity
    // anywhere — no config, no header line. Publication never invents one
    // (a clone missing its committed config must refuse, not silently fork),
    // so the remedy is a host that mints at a creation moment.
    throw new PublishError(
      'publish.missing-ifid',
      `${path.basename(resolved)} has no identity — no story config and no \`ifid:\` ` +
        `header (ADR-074, ADR-309). If this story ever had one, restore its ` +
        `\`<story-name>.config.json\` from version control; otherwise run ` +
        `\`sharpee build\` once (or open the story in Chord Writer) to mint it.`,
    );
  }

  return { storyFile: resolved, projectDir, storyId, ifid: ifid.trim() };
}

/**
 * Reads a directory tree into the entry map `zipSync` takes.
 *
 * Paths are stored RELATIVE to `dir` with `/` separators, so `index.html` lands
 * at the root of the archive — the structure itch.io requires and the one
 * pinned by test.
 *
 * `index-testing.html` (root only) is excluded: it is the IDE's testing
 * surface (ADR-306 Phase 2), emitted by every browser build but never part
 * of the published artifact.
 */
export function zipDirectory(dir: string): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  const walk = (current: string, base: string): void => {
    for (const name of fs.readdirSync(current).sort()) {
      const full = path.join(current, name);
      const rel = base ? `${base}/${name}` : name;
      if (rel === 'index-testing.html') continue;
      if (fs.statSync(full).isDirectory()) walk(full, rel);
      else entries[rel] = new Uint8Array(fs.readFileSync(full));
    }
  };
  walk(dir, '');
  return zipSync(entries);
}

/**
 * `sharpee publish [<file>.story | dir] [--out <path>] [--no-minify] [--no-menu]`.
 *
 * @returns the process exit code — 0 on success, 2 on a refusal.
 */
export async function runPublishCommand(args: string[], targetArg?: string): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return 0;
  }

  let target: PublishTarget;
  try {
    target = checkPublishable(resolveStoryFile(targetArg));
  } catch (error) {
    if (error instanceof PublishError) {
      console.error(`\npublish: ${error.message}\n`);
      return 2;
    }
    throw error;
  }

  console.log(`\n📦 Publishing ${target.storyId}\n`);

  const env: BrowserBuildEnv = {
    stylesDir: resolveEngineStylesDir(target.projectDir),
    templatesDir: templatesDir(),
    esbuildCwd: target.projectDir,
    engineVersion: platformRanges().sharpeeRange.replace(/^[\^~]/, ''),
  };

  // A published artifact must contain exactly what THIS build produced.
  // `buildBrowser` writes into `dist/web/<id>` without clearing it, so without
  // this a file from an earlier build ships to strangers — caught in practice:
  // the first real publish of fernhill carried a `game.js.map` five hours older
  // than its `game.js`, despite `sourcemap: false`.
  cleanOutputDirectory(target.projectDir, target.storyId);

  let outDir: string;
  try {
    outDir = buildBrowser(target.storyFile, env, {
      minify: !args.includes('--no-minify'),
      sourcemap: false, // a published artifact carries no source map
      // ADR-290 D6 (GH #196): the author chooses; default menu-on, and the
      // consequence of menu-off is said here, where the choice is made.
      menu: !args.includes('--no-menu'),
    });
    if (args.includes('--no-menu')) {
      console.log('  ⚠ --no-menu: the page has no Save, Restore, Restart or Quit — players get none unless your page supplies them.');
    }
  } catch (error) {
    console.error(`\npublish: build failed — ${error instanceof Error ? error.message : error}\n`);
    return 2;
  }

  const outIndex = args.indexOf('--out');
  const zipPath =
    outIndex >= 0 && args[outIndex + 1]
      ? path.resolve(args[outIndex + 1])
      : path.join(target.projectDir, 'dist', `${target.storyId}.zip`);

  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  fs.writeFileSync(zipPath, zipDirectory(outDir));
  const bytes = fs.statSync(zipPath).size;

  console.log('');
  console.log(`  IFID:   ${target.ifid}`);
  // A relative path that climbs out of cwd is harder to read than the absolute
  // one it saves nothing over.
  const shown = path.relative(process.cwd(), zipPath);
  console.log(
    `  Output: ${shown.startsWith('..') ? zipPath : shown} (${(bytes / 1024 / 1024).toFixed(1)} MB)`,
  );
  console.log('');
  console.log('  Unzip anywhere and open index.html, or upload the zip to itch.io.');
  console.log('');
  return 0;
}

/**
 * Removes a story's browser-build output directory so the next build starts
 * empty.
 *
 * `dist/web/<id>` is where `buildBrowser` writes (browser-core), and it does not
 * clear the directory first — which is right for an iterative build and wrong
 * for a published artifact.
 *
 * @param projectDir the folder holding the `.story` file
 * @param storyId the header's `id:`
 * @returns the directory that was cleared (whether or not it existed)
 */
export function cleanOutputDirectory(projectDir: string, storyId: string): string {
  const outDir = path.join(projectDir, 'dist', 'web', storyId);
  fs.rmSync(outDir, { recursive: true, force: true });
  return outDir;
}

/** A `.story` file, or a directory holding exactly one. */
function resolveStoryFile(targetArg?: string): string {
  if (targetArg && targetArg.endsWith('.story')) return targetArg;
  const dir = targetArg ? path.resolve(targetArg) : process.cwd();
  const found = findStoryFile(dir);
  if (!found) {
    throw new PublishError('publish.story-missing', `no .story file in ${dir}`);
  }
  return found;
}

/** The bundled browser templates, resolved as build-browser resolves them. */
function templatesDir(): string {
  const near = path.join(__dirname, '..', 'templates', 'browser');
  return fs.existsSync(near) ? near : path.join(__dirname, '..', '..', 'templates', 'browser');
}

const USAGE = `
sharpee publish [<file>.story | dir] [options]

  Builds the story's self-contained browser client and zips it. Unzip anywhere
  and open index.html — or upload the zip to itch.io's HTML-project flow.

  A story with no \`ifid:\` is REFUSED before anything is built: publication
  requires a Treaty of Babel identifier (ADR-074/ADR-284).

Options:
  --out <path>    Where to write the zip (default: dist/<story-id>.zip)
  --no-minify     Leave the bundle unminified
  --no-menu       Strip the in-page menu bar. The page then has NO Save / Restore /
                  Restart / Quit unless your own page supplies them (ADR-290 D6).
`;

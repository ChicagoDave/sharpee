/**
 * browser.ts — `devkit build <story> --browser`: the self-contained single-player
 * web app at dist/web/<story>/ (build.sh build_browser_client, 877-952).
 *
 * Owner context: @sharpee/devkit (ADR-180 Phase 3b). The author's player-facing
 * deliverable (AC-9): an IIFE game.js + css + html that boots in one load, portable
 * to any static host. Was byte-for-byte parity with build.sh; ADR-188 diverges on
 * CSS — the engine CSS (base/engine/decorations) comes from @sharpee/platform-browser,
 * and each built-in theme the story lists in `sharpee.themes` is copied from
 * platform-browser's styles/themes/ into dist/web/themes/ + wired into index.html;
 * an author's own theme is a [data-theme] block in the override stylesheet, listed
 * inline as { id, name } (ADR-188).
 *
 * Public interface: buildBrowserClient(root, story, opts) -> void.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  type BrowserBuildEnv,
  buildBrowser,
  findStoryFile,
  resolveWiredThemes,
  copyWiredThemes,
  injectThemes,
} from '@sharpee/devkit';
import { resolveStoryDir } from '../repo';

export interface BrowserBuildOptions {
  quiet?: boolean;
}

/** Read `sharpee.themes` entries (built-in ids and/or { id, name }) from a story. */
function readThemes(storyDir: string): unknown[] {
  const pkgPath = join(storyDir, 'package.json');
  if (!existsSync(pkgPath)) return [];
  const themes = JSON.parse(readFileSync(pkgPath, 'utf8')).sharpee?.themes;
  return Array.isArray(themes) ? themes : [];
}

/**
 * The in-repo `.story` (Chord) story path (ADR-252 D5): if the story directory
 * holds a `.story` file, this is a Chord project — return its absolute path so the
 * caller delegates to the shared build core. Null for a TypeScript story (dungeo).
 */
export function chordStoryFile(root: string, story: string): string | null {
  const storyDir = resolveStoryDir(root, story);
  if (!storyDir) return null;
  return findStoryFile(storyDir);
}

/** Read the lockstep platform (sharpee) version — stamped into the story's version.ts. */
function sharpeeVersion(root: string): string {
  return JSON.parse(readFileSync(join(root, 'packages', 'sharpee', 'package.json'), 'utf8')).version;
}

/**
 * The website mirror: replicate the WHOLE built app into website/public/web/<id>.
 *
 * The mirror must be a faithful copy of `outDir` (dist/web/<id>/), not a hand-picked
 * subset: the browser client `fetch`es `./story.story` (+ `./imports.json`) and compiles
 * at boot, links the story's own CSS (e.g. fernhill.css), and loads runtime assets from
 * `audio/`/`images/`. Copying only game.js + engine CSS left `/play` fatally broken
 * (no story source, no story CSS, no media). We clear the target first so de-listed
 * files (a removed theme, a renamed asset) never linger, then recursively copy the
 * entire output tree — guaranteeing parity with the devkit author build.
 */
export function mirrorToWebsite(root: string, outDir: string, storyId: string): void {
  if (!existsSync(join(root, 'website', 'public'))) return;
  const webDir = join(root, 'website', 'public', 'web', storyId);
  rmSync(webDir, { recursive: true, force: true });
  mkdirSync(webDir, { recursive: true });
  cpSync(outDir, webDir, { recursive: true });
}

/**
 * Build the browser client for `story` into dist/web/<id>/. Assumes platform +
 * story (incl. ESM where applicable) are already built.
 *
 * ADR-252 D5: a Chord `.story` story delegates to the ONE shared build core (with
 * the in-repo resolution env), so it produces output identical (modulo the build
 * stamp) to the devkit author build. A TypeScript story (dungeo) keeps the legacy
 * path below, unchanged.
 * @throws if the story or its browser-entry.ts is missing, or game.js is empty after esbuild.
 */
export function buildBrowserClient(root: string, story: string, opts: BrowserBuildOptions = {}): void {
  const log = (m: string) => !opts.quiet && console.log(m);

  // Chord path: delegate to the shared core (ADR-252 D5).
  const storyFile = chordStoryFile(root, story);
  if (storyFile) {
    const env: BrowserBuildEnv = {
      stylesDir: join(root, 'packages', 'platform-browser', 'styles'),
      templatesDir: join(root, 'packages', 'devkit', 'templates', 'browser'),
      esbuildCwd: root,
      engineVersion: sharpeeVersion(root),
      mirror: (outDir, storyId) => mirrorToWebsite(root, outDir, storyId),
    };
    buildBrowser(storyFile, env, { quiet: opts.quiet });
    return;
  }

  // TypeScript path (dungeo): the legacy in-repo browser build, unchanged.
  const storyDir = resolveStoryDir(root, story);
  if (!storyDir) throw new Error(`story not found: ${story}`);
  const entry = join(storyDir, 'src', 'browser-entry.ts');
  if (!existsSync(entry)) throw new Error(`browser entry not found: ${entry}`);

  const outRel = join('dist', 'web', story);
  const outDir = join(root, outRel);
  mkdirSync(outDir, { recursive: true });
  log(`=== Building Browser Client: ${story} ===`);

  // Bundle — verbatim build.sh esbuild invocation (single platform-browser alias; the
  // IIFE bakes the platform + story into one payload, so the page boots in a single load).
  execFileSync(
    'npx',
    [
      'esbuild',
      join(storyDir, 'src', 'browser-entry.ts'),
      '--bundle',
      '--platform=browser',
      '--target=es2020',
      '--format=iife',
      '--global-name=SharpeeGame',
      `--outfile=${join(outRel, 'game.js')}`,
      '--sourcemap',
      '--minify',
      '--conditions=require',
      '--define:process.env.PARSER_DEBUG=undefined',
      '--define:process.env.DEBUG_PRONOUNS=undefined',
      '--define:process.env.NODE_ENV="production"',
      `--alias:@sharpee/platform-browser=${join(root, 'packages', 'platform-browser', 'dist', 'index.js')}`,
    ],
    { cwd: root, stdio: opts.quiet ? 'ignore' : 'inherit' },
  );

  const tpl = join(root, 'templates', 'browser');
  // Resolve the themes the story listed: built-in ids (from platform-browser's
  // styles/themes/) + inline author themes. Explicit opt-in; AC-9.
  const platformThemesDir = join(root, 'packages', 'platform-browser', 'styles', 'themes');
  const wiredThemes = resolveWiredThemes(platformThemesDir, readThemes(storyDir));
  // index.html stays a repo template (title set at runtime by BrowserClient from story
  // config); the build wires the theme <link>s + menu items into it (ADR-188 Phase 4).
  const tplHtml = join(tpl, 'index.html');
  if (existsSync(tplHtml)) {
    writeFileSync(join(outDir, 'index.html'), injectThemes(readFileSync(tplHtml, 'utf8'), wiredThemes));
  }
  // Engine CSS (base/engine/decorations) is owned by @sharpee/platform-browser (ADR-188),
  // copied from the in-repo package. The theme packages' CSS is wired below.
  const engineStyles = join(root, 'packages', 'platform-browser', 'styles');
  cpSync(join(engineStyles, 'base.css'), join(outDir, 'base.css'));
  cpSync(join(engineStyles, 'engine.css'), join(outDir, 'engine.css'));
  cpSync(join(engineStyles, 'decorations.css'), join(outDir, 'decorations.css'));
  // Remove the obsolete monolithic theme kit left by a pre-ADR-188 build. The themes/ dir
  // is rebuilt by copyWiredThemes (which clears it first), so a rebuild over an existing
  // output never serves stale theme CSS/fonts (AC-4).
  rmSync(join(outDir, 'styles.css'), { force: true });
  copyWiredThemes(wiredThemes, outDir);

  // Story assets (audio, images): copy the contents of <story>/assets/ into the output.
  // Skip dotfiles to match build.sh's `cp "$ASSETS_DIR"/*` (bash glob excludes dotfiles,
  // so .DS_Store and friends never reach the deliverable).
  const assetsDir = join(storyDir, 'assets');
  if (existsSync(assetsDir)) {
    for (const entryName of readdirSync(assetsDir)) {
      if (entryName.startsWith('.')) continue;
      cpSync(join(assetsDir, entryName), join(outDir, entryName), { recursive: true });
    }
  }

  // Website mirror.
  if (existsSync(join(root, 'website', 'public'))) {
    const webDir = join(root, 'website', 'public', 'web', story);
    mkdirSync(webDir, { recursive: true });
    cpSync(join(outDir, 'game.js'), join(webDir, 'game.js'));
    if (existsSync(join(outDir, 'index.html'))) cpSync(join(outDir, 'index.html'), join(webDir, 'index.html'));
    for (const css of ['base.css', 'engine.css', 'decorations.css']) {
      if (existsSync(join(outDir, css))) cpSync(join(outDir, css), join(webDir, css));
    }
    // Mirror the wired theme CSS/assets; clear first so a de-listed theme never lingers.
    rmSync(join(webDir, 'styles.css'), { force: true });
    rmSync(join(webDir, 'themes'), { recursive: true, force: true });
    if (existsSync(join(outDir, 'themes'))) cpSync(join(outDir, 'themes'), join(webDir, 'themes'), { recursive: true });
  }

  // Invariant: assert the deliverable exists (no silent success on an empty build).
  const gameJs = join(outDir, 'game.js');
  if (!existsSync(gameJs) || statSync(gameJs).size === 0) {
    throw new Error(`browser build failed: ${join(outRel, 'game.js')} is missing or empty`);
  }
  log(`Output: ${outRel}/ (${statSync(gameJs).size} bytes)`);
}

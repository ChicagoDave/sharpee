/**
 * CLI: sharpee build-browser
 *
 * Bundles a Sharpee story for the browser into dist/web/. The bundle (game.js)
 * is esbuilt from src/browser-entry.ts; the HTML page is a devkit template, and
 * the engine CSS (base/engine/decorations) is owned by @sharpee/platform-browser
 * (ADR-188) and copied fresh from the resolved package every build. Built-in themes
 * the story lists in `sharpee.themes` are copied from platform-browser's
 * styles/themes/ into dist/web/themes/ and wired into the menu; an author's own
 * theme is a [data-theme] block in browser/<package-name>.css (loaded last, wins the
 * cascade), listed inline as { id, name }.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { stampVersion } from './version-stamp';
import { findStoryFile } from './author-game';

// In source: standalone/ → ../../templates. In npm publish: standalone/ → ../templates.
const TEMPLATES_DIR = fs.existsSync(path.join(__dirname, '..', 'templates', 'browser'))
  ? path.join(__dirname, '..', 'templates', 'browser')
  : path.join(__dirname, '..', '..', 'templates', 'browser');

interface ProjectInfo {
  storyId: string;
  storyTitle: string;
  /** Raw `sharpee.themes` entries: built-in id strings and/or `{ id, name }`. */
  themes: unknown[];
}

/** Read story id/title from package.json, falling back to src/index.ts. */
function getProjectInfo(projectDir: string): ProjectInfo | null {
  const packagePath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      const themes = pkg.sharpee?.themes;
      return {
        storyId: pkg.name || 'my-story',
        storyTitle: pkg.description || pkg.name || 'My Story',
        themes: Array.isArray(themes) ? themes : [],
      };
    } catch {
      // Fall through to index.ts.
    }
  }

  const indexPath = path.join(projectDir, 'src', 'index.ts');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
    const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
    if (idMatch || titleMatch) {
      return {
        storyId: idMatch?.[1] || 'my-story',
        storyTitle: titleMatch?.[1] || 'My Story',
        themes: [],
      };
    }
  }

  return null;
}

/** Substitute the story tokens index.html carries (the override stylesheet link). */
function processTemplate(content: string, info: ProjectInfo): string {
  return content
    .replace(/\{\{STORY_ID\}\}/g, info.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, info.storyTitle);
}

/**
 * Resolve @sharpee/platform-browser's `styles/` dir from the project's deps.
 * The engine CSS (base/engine/decorations) + built-in themes are owned by
 * platform-browser (ADR-188) and ship as plain asset files under styles/.
 *
 * We locate them via the package's `.` entry — the single export tsf preserves
 * when it publishes (it flattens to a `.`-only `exports` map and ships assets as
 * files, so `@sharpee/platform-browser/package.json` and `/styles/*` subpaths are
 * NOT resolvable from a published install). From the resolved entry we walk up to
 * the dir that holds `styles/engine.css`, which works for both the published flat
 * layout (`index.js` + `styles/` at the package root) and the in-repo layout
 * (`dist/index.js`, with `styles/` at the parent).
 * @throws if platform-browser (or its styles/) is not resolvable from the project.
 */
export function resolveEngineStylesDir(projectDir: string): string {
  const entry = require.resolve('@sharpee/platform-browser', { paths: [projectDir] });
  let dir = path.dirname(entry);
  for (let i = 0; i < 8; i++) {
    const styles = path.join(dir, 'styles');
    if (fs.existsSync(path.join(styles, 'engine.css'))) return styles;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    'Could not locate @sharpee/platform-browser styles/ (engine CSS) from ' +
      `${projectDir}. Is @sharpee/platform-browser installed?`,
  );
}

/** A theme wired into the build (ADR-188). */
interface WiredTheme {
  id: string;
  name: string;
  /** Absolute path to a BUILT-IN theme's CSS (copied into dist/web/themes/), or
   *  null for an AUTHOR theme whose `[data-theme]` block lives in the author
   *  override stylesheet (browser/<package-name>.css) — nothing to copy or link. */
  cssPath: string | null;
  /** Dir holding the built-in CSS + its assets (platform-browser's styles/themes),
   *  or null for an author theme. */
  srcDir: string | null;
  /** Sibling dirs (e.g. `system-6`) to copy alongside a built-in's CSS. */
  assets: string[];
}

/** A built-in theme's entry in platform-browser's styles/themes/manifest.json. */
interface BuiltinThemeEntry {
  name: string;
  css: string;
  assets?: string[];
}

/**
 * Resolve the themes a story lists in `sharpee.themes`. Each entry is either:
 *  - a string id of a BUILT-IN theme (shipped by @sharpee/platform-browser under
 *    styles/themes/, looked up in that dir's manifest.json), or
 *  - an inline `{ id, name }` for the author's OWN theme — its `[data-theme]`
 *    token block lives in the author override stylesheet (browser/<package-name>.css),
 *    so the build only adds a menu entry.
 * Explicit opt-in; no scanning (AC-9). `classic` is the engine default and is
 * always present, so it need not be listed.
 * @throws on an unknown built-in id or a malformed entry.
 */
function resolveWiredThemes(projectDir: string, entries: unknown[]): WiredTheme[] {
  const themesDir = path.join(resolveEngineStylesDir(projectDir), 'themes');
  const manifestPath = path.join(themesDir, 'manifest.json');
  const builtins: Record<string, BuiltinThemeEntry> = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8')).themes || {}
    : {};

  return entries.map((entry) => {
    if (typeof entry === 'string') {
      const b = builtins[entry];
      if (!b) {
        throw new Error(
          `Unknown built-in theme "${entry}". Available: ${Object.keys(builtins).join(', ') || '(none)'}. ` +
            `For your own theme, list { "id": "…", "name": "…" } and define its [data-theme] block in browser/<package-name>.css.`,
        );
      }
      return {
        id: entry,
        name: b.name || entry,
        cssPath: path.join(themesDir, b.css),
        srcDir: themesDir,
        assets: Array.isArray(b.assets) ? b.assets : [],
      };
    }
    if (entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string') {
      const e = entry as { id: string; name?: string };
      return { id: e.id, name: e.name || e.id, cssPath: null, srcDir: null, assets: [] };
    }
    throw new Error(
      `Invalid "sharpee.themes" entry: ${JSON.stringify(entry)}. ` +
        `Use a built-in id (string) or an author theme { "id", "name" }.`,
    );
  });
}

/**
 * Copy each BUILT-IN theme's CSS to `dist/web/themes/<id>.css` and its declared
 * sibling assets into `dist/web/themes/` so relative `@font-face` URLs resolve.
 * Author themes copy nothing (their CSS is in the override stylesheet). The
 * `themes/` dir is rebuilt from scratch so a de-listed theme never lingers.
 */
function copyWiredThemes(themes: WiredTheme[], outDir: string): void {
  const themesDir = path.join(outDir, 'themes');
  fs.rmSync(themesDir, { recursive: true, force: true });
  const builtins = themes.filter((t) => t.cssPath);
  if (builtins.length === 0) return;
  fs.mkdirSync(themesDir, { recursive: true });
  for (const t of builtins) {
    fs.copyFileSync(t.cssPath!, path.join(themesDir, `${t.id}.css`));
    for (const asset of t.assets) {
      fs.cpSync(path.join(t.srcDir!, asset), path.join(themesDir, asset), { recursive: true });
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wire the resolved themes into index.html: a `<link>` for each BUILT-IN theme at
 * the THEME_LINKS marker (after the engine CSS; author themes need no link, their
 * CSS is in the override stylesheet), and a regenerated `#theme-menu` — the
 * `classic` default + one item per listed theme (ADR-188).
 */
function injectThemes(html: string, themes: WiredTheme[]): string {
  const links = themes
    .filter((t) => t.cssPath)
    .map((t) => `  <link rel="stylesheet" href="themes/${t.id}.css">`)
    .join('\n');
  html = html.replace(
    /[ \t]*<!--\s*THEME_LINKS:[\s\S]*?-->/,
    links || '  <!-- no built-in themes wired -->',
  );
  const items = [
    '              <li role="menuitemradio" class="sharpee-menu-option" data-theme="classic">Classic</li>',
    ...themes.map(
      (t) =>
        `              <li role="menuitemradio" class="sharpee-menu-option" data-theme="${t.id}">${escapeHtml(t.name)}</li>`,
    ),
  ].join('\n');
  return html.replace(
    /(<ul role="menu" id="theme-menu"[^>]*>)[\s\S]*?(<\/ul>)/,
    `$1\n${items}\n            $2`,
  );
}

/** Run the build-browser command. */
export async function runBuildBrowserCommand(args: string[], projectDirArg?: string): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const projectDir = projectDirArg || process.cwd();
  const minify = !args.includes('--no-minify');
  const sourcemap = !args.includes('--no-sourcemap');

  console.log('\n🔨 Building browser bundle\n');

  const info = getProjectInfo(projectDir);
  if (!info) {
    console.error('Error: This does not appear to be a Sharpee project.');
    console.error('Make sure you have a package.json or src/index.ts with story config.');
    process.exit(1);
  }
  console.log(`  Story: ${info.storyTitle} (${info.storyId})`);

  const browserEntryPath = path.join(projectDir, 'src', 'browser-entry.ts');
  if (!fs.existsSync(browserEntryPath)) {
    console.error('\nError: src/browser-entry.ts not found.');
    console.error('Run "sharpee init-browser" first to add browser support.');
    process.exit(1);
  }

  const outDir = path.join(projectDir, 'dist', 'web');
  fs.mkdirSync(outDir, { recursive: true });

  // Chord project: the shipped bundle carries the `.story` SOURCE and the
  // compiler, compiling at boot (David's ruling, 2026-07-18). Run the
  // compiler HERE as the fail-fast gate — diagnostics belong on the
  // author's machine, never first as a broken page — then ship the source
  // as dist/web/story.story (the entry fetches that fixed name).
  let chordStoryFile: string | null;
  try {
    chordStoryFile = findStoryFile(projectDir);
  } catch (error) {
    console.error(`\nError: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
    return;
  }
  if (chordStoryFile) {
    const chord = require('@sharpee/chord') as typeof import('@sharpee/chord');
    const rel = path.relative(projectDir, chordStoryFile) || chordStoryFile;
    const result = chord.compile(fs.readFileSync(chordStoryFile, 'utf-8'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    for (const d of errors) {
      console.error(`  ${rel}:${d.span.line}:${d.span.column} error [${d.code}] ${d.message}`);
    }
    if (!result.ok) {
      console.error(`\nError: ${rel} failed the load-time gates (${errors.length} error(s)).`);
      process.exit(1);
    }
    if (result.ir.hasHatches) {
      // The browser cannot load author hatch modules (no module resolution
      // in the page); refuse legibly rather than shipping a bundle that
      // dies at boot. Pure-IR stories (the scaffold's shape) build fine.
      console.error(
        '\nError: this story declares TypeScript hatches (`define text/action … from "…"`) — ' +
          'the browser build does not support hatch modules yet. Remove the hatches, or use the TypeScript project form.',
      );
      process.exit(1);
    }
    fs.copyFileSync(chordStoryFile, path.join(outDir, 'story.story'));
    console.log(`  ✓ Validated ${rel} (gate-clean) and shipped it as story.story`);

    // Story IR artifact for the IDE/tooling surface (David, 2026-07-18:
    // "the IDE will want the IR"). dist/, not dist/web/ — a tooling file,
    // not a page asset; the page compiles the shipped SOURCE at boot.
    const irOut = path.join(projectDir, 'dist', `${path.basename(chordStoryFile, '.story')}.ir.json`);
    fs.writeFileSync(irOut, JSON.stringify(result.ir, null, 2) + '\n');
    console.log(`  ✓ Story IR → ${path.relative(projectDir, irOut)}`);
  }

  // browser-entry.ts imports ./version — stamp it fresh before bundling.
  stampVersion(projectDir, info.storyId);

  // Bundle browser-entry.ts → dist/web/game.js. The <script src="game.js"> in
  // index.html depends on this exact name. esbuild runs with cwd=projectDir so it
  // resolves @sharpee/* from the project's node_modules; --conditions=require picks
  // the CJS branch of the platform packages' exports maps (matches the monorepo build).
  console.log('  Bundling game.js...');
  const esbuildArgs = [
    'esbuild',
    browserEntryPath,
    '--bundle',
    '--platform=browser',
    '--target=es2020',
    '--format=iife',
    '--global-name=SharpeeGame',
    `--outfile=${path.join(outDir, 'game.js')}`,
    '--conditions=require',
    '--define:process.env.NODE_ENV="production"',
    '--define:process.env.PARSER_DEBUG=undefined',
    '--define:process.env.DEBUG_PRONOUNS=undefined',
  ];
  if (minify) esbuildArgs.push('--minify');
  if (sourcemap) esbuildArgs.push('--sourcemap');

  try {
    execFileSync('npx', esbuildArgs, { cwd: projectDir, stdio: 'pipe' });
    console.log('  ✓ Built game.js');
  } catch (error: any) {
    console.error('  ✗ Build failed');
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }

  // Resolve the listed themes (built-in ids + author themes; explicit opt-in, AC-9).
  const wiredThemes = resolveWiredThemes(projectDir, info.themes);

  // index.html (the page) stays a devkit template — substitute story tokens, then
  // wire the theme <link>s + menu items (ADR-188 Phase 4).
  let html = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf-8');
  html = injectThemes(processTemplate(html, info), wiredThemes);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('  ✓ Copied index.html');

  // Engine CSS (base + engine + decorations) is owned by @sharpee/platform-browser
  // (ADR-188) and copied fresh from the resolved package every build. Built-in
  // themes the story listed are copied from platform-browser's styles/themes/ below.
  const engineStylesDir = resolveEngineStylesDir(projectDir);
  for (const css of ['base.css', 'engine.css', 'decorations.css']) {
    fs.copyFileSync(path.join(engineStylesDir, css), path.join(outDir, css));
  }
  // Remove the obsolete monolithic theme kit left by a pre-ADR-188 build. The
  // themes/ dir is rebuilt by copyWiredThemes below (which clears it first), so a
  // rebuild over an existing output never serves stale theme CSS/fonts (AC-4).
  fs.rmSync(path.join(outDir, 'styles.css'), { force: true });
  console.log('  ✓ Copied platform engine CSS (base, engine, decorations)');

  // Wire theme packages: copy each theme.css (+ declared assets) into dist/web/themes/.
  copyWiredThemes(wiredThemes, outDir);
  if (wiredThemes.length > 0) {
    console.log(
      `  ✓ Wired ${wiredThemes.length} theme(s): ${wiredThemes.map((t) => t.id).join(', ')}`,
    );
  }

  // Author override stylesheet → dist/web/<package-name>.css. index.html links it last,
  // so write an empty stub when the author hasn't added one (avoids a 404).
  const overrideCss = path.join(projectDir, 'browser', `${info.storyId}.css`);
  const overrideOut = path.join(outDir, `${info.storyId}.css`);
  if (fs.existsSync(overrideCss)) {
    fs.copyFileSync(overrideCss, overrideOut);
    console.log(`  ✓ Copied ${info.storyId}.css`);
  } else {
    fs.writeFileSync(overrideOut, `/* ${info.storyTitle} — author overrides (none yet) */\n`);
  }

  // Author assets (audio, images): copy the contents of <project>/assets/ into the
  // output so author-referenced paths (audio/x.mp3, images/y.png) resolve in the
  // served bundle. Skip dotfiles (.DS_Store etc.), matching the in-repo build.
  const assetsDir = path.join(projectDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    let count = 0;
    for (const entryName of fs.readdirSync(assetsDir)) {
      if (entryName.startsWith('.')) continue;
      fs.cpSync(path.join(assetsDir, entryName), path.join(outDir, entryName), { recursive: true });
      count++;
    }
    if (count > 0) {
      console.log(`  ✓ Copied assets/ (${count} ${count === 1 ? 'entry' : 'entries'})`);
    }
  }

  const bundlePath = path.join(outDir, 'game.js');
  if (!fs.existsSync(bundlePath) || fs.statSync(bundlePath).size === 0) {
    console.error('\nError: dist/web/game.js is missing or empty after build.');
    process.exit(1);
  }
  const sizeKb = (fs.statSync(bundlePath).size / 1024).toFixed(1);

  console.log(`\n✅ Build complete! (game.js ${sizeKb} KB)\n`);
  console.log(`Output: ${path.relative(projectDir, outDir)}/`);
  console.log('');
  console.log('To test locally:');
  console.log(`  npx serve ${path.relative(projectDir, outDir)}`);
  console.log('');
}

function showHelp(): void {
  console.log(`
sharpee build-browser - Build a web browser bundle

Usage: sharpee build-browser [options]

Options:
  --no-minify      Skip minification
  --no-sourcemap   Skip source map generation

Output (dist/web/):
  game.js          Story + engine + browser client (one bundle)
  index.html       The page (platform-owned)
  base.css, engine.css, decorations.css   Engine CSS (from @sharpee/platform-browser)
  themes/<id>.css      One per built-in theme id listed in package.json "sharpee.themes"
  <package-name>.css   Your overrides (from browser/<package-name>.css)
  <assets>             Contents of your assets/ dir (audio, images, …), copied as-is
`);
}

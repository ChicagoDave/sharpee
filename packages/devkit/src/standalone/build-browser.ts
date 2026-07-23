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
import { stampVersion } from './version-stamp.js';
import { platformRanges } from './init.js';
import { findStoryFile } from './author-game.js';
import {
  type WiredTheme,
  type BrowserBuildEnv,
  buildBrowser,
  resolveWiredThemes as resolveWiredThemesCore,
  copyWiredThemes,
  injectThemes,
} from './browser-core.js';

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

/**
 * Run the browser build.
 *
 * Dispatch on project kind (ADR-252 D1): a `.story` present → the Chord path
 * (the shared build core; IR-derived metadata, no package.json), a bare `.story`
 * FILE path being a first-class target; a TypeScript project (src/index.ts, no
 * `.story`) → the existing TS path below, unchanged. A directory holding BOTH is
 * a build-time error, never a merged story.
 *
 * @param args     build flags (--no-minify / --no-sourcemap / --help)
 * @param targetArg a `.story` file path, or a project directory (default cwd)
 */
export async function runBuildBrowserCommand(args: string[], targetArg?: string): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const minify = !args.includes('--no-minify');
  const sourcemap = !args.includes('--no-sourcemap');

  // Resolve the target: a bare `.story` file, or a project directory.
  let projectDir: string;
  let storyFile: string | null;
  if (targetArg && targetArg.endsWith('.story')) {
    storyFile = path.resolve(targetArg);
    if (!fs.existsSync(storyFile)) {
      console.error(`\nError: no such story file: ${targetArg}`);
      process.exit(1);
    }
    projectDir = path.dirname(storyFile);
  } else {
    projectDir = targetArg ? path.resolve(targetArg) : process.cwd();
    try {
      storyFile = findStoryFile(projectDir); // throws on multiple .story files
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
      return;
    }
  }

  console.log('\n🔨 Building browser bundle\n');

  // D1: a Chord `.story` and a TypeScript project are mutually exclusive kinds.
  const hasIndexTs = fs.existsSync(path.join(projectDir, 'src', 'index.ts'));
  if (storyFile && hasIndexTs) {
    console.error(
      '\nError: this directory holds both a .story file and src/index.ts — a Sharpee project is ' +
        'either a Chord (.story) project OR a TypeScript project, never both. Remove one.',
    );
    process.exit(1);
  }

  // --- Chord path (ADR-252): the shared build core, IR-derived metadata. ---
  if (storyFile) {
    const authorEnv: BrowserBuildEnv = {
      stylesDir: resolveEngineStylesDir(projectDir),
      templatesDir: TEMPLATES_DIR,
      esbuildCwd: projectDir,
      engineVersion: platformRanges().sharpeeRange.replace(/^[\^~]/, ''),
    };
    try {
      const outDir = buildBrowser(storyFile, authorEnv, { minify, sourcemap });
      console.log('');
      console.log('To test locally:');
      console.log(`  npx serve ${path.relative(projectDir, outDir)}`);
      console.log('');
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    return;
  }

  // --- TypeScript path (unchanged): metadata from package.json / src/index.ts. ---
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
  // Author mode resolves platform-browser's styles/themes/ from the project's deps.
  const wiredThemes: WiredTheme[] = resolveWiredThemesCore(
    path.join(resolveEngineStylesDir(projectDir), 'themes'),
    info.themes,
  );

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

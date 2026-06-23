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
  copyFileSync,
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
import { resolveStoryDir } from '../repo';

export interface BrowserBuildOptions {
  quiet?: boolean;
}

/** Copy a template file if present (build.sh's per-file `if [ -f ]` copies). */
function copyIfExists(src: string, dest: string): boolean {
  if (!existsSync(src)) return false;
  cpSync(src, dest);
  return true;
}

/** A theme wired into the build: built-in (CSS from platform-browser) or author
 *  (CSS in the override stylesheet). Duplicated from the devkit author build per
 *  ADR-187 R1 (separate codebases). */
interface WiredTheme {
  id: string;
  name: string;
  /** Built-in theme's CSS path, or null for an author theme (CSS in override). */
  cssPath: string | null;
  /** Dir holding the built-in CSS + assets, or null for an author theme. */
  srcDir: string | null;
  assets: string[];
}

/** A built-in theme's entry in platform-browser's styles/themes/manifest.json. */
interface BuiltinThemeEntry {
  name: string;
  css: string;
  assets?: string[];
}

/** Read `sharpee.themes` entries (built-in ids and/or { id, name }) from a story. */
function readThemes(storyDir: string): unknown[] {
  const pkgPath = join(storyDir, 'package.json');
  if (!existsSync(pkgPath)) return [];
  const themes = JSON.parse(readFileSync(pkgPath, 'utf8')).sharpee?.themes;
  return Array.isArray(themes) ? themes : [];
}

/**
 * Resolve listed themes: a string id → a BUILT-IN theme from platform-browser's
 * styles/themes/ (`themesDir`/manifest.json); an inline `{ id, name }` → an AUTHOR
 * theme whose `[data-theme]` block lives in the override stylesheet. Explicit
 * opt-in; no scanning (AC-9). Duplicated from the devkit author build per ADR-187 R1.
 * @throws on an unknown built-in id or a malformed entry.
 */
function resolveWiredThemes(themesDir: string, entries: unknown[]): WiredTheme[] {
  const manifestPath = join(themesDir, 'manifest.json');
  const builtins: Record<string, BuiltinThemeEntry> = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8')).themes || {}
    : {};
  return entries.map((entry) => {
    if (typeof entry === 'string') {
      const b = builtins[entry];
      if (!b) {
        throw new Error(
          `unknown built-in theme "${entry}" (available: ${Object.keys(builtins).join(', ') || 'none'})`,
        );
      }
      return {
        id: entry,
        name: b.name || entry,
        cssPath: join(themesDir, b.css),
        srcDir: themesDir,
        assets: Array.isArray(b.assets) ? b.assets : [],
      };
    }
    if (entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string') {
      const e = entry as { id: string; name?: string };
      return { id: e.id, name: e.name || e.id, cssPath: null, srcDir: null, assets: [] };
    }
    throw new Error(`invalid "sharpee.themes" entry: ${JSON.stringify(entry)}`);
  });
}

/**
 * Copy each BUILT-IN theme's CSS to `<out>/themes/<id>.css` and its declared sibling
 * assets into `<out>/themes/` so relative `@font-face` URLs resolve. Author themes
 * copy nothing (CSS is in the override stylesheet). The `themes/` dir is rebuilt
 * from scratch so a de-listed theme never lingers.
 */
function copyWiredThemes(themes: WiredTheme[], outDir: string): void {
  const themesDir = join(outDir, 'themes');
  rmSync(themesDir, { recursive: true, force: true });
  const builtins = themes.filter((t) => t.cssPath);
  if (builtins.length === 0) return;
  mkdirSync(themesDir, { recursive: true });
  for (const t of builtins) {
    copyFileSync(t.cssPath!, join(themesDir, `${t.id}.css`));
    for (const asset of t.assets) {
      cpSync(join(t.srcDir!, asset), join(themesDir, asset), { recursive: true });
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
 * the THEME_LINKS marker (author themes need no link — CSS is in the override
 * stylesheet), and a regenerated `#theme-menu` — the `classic` default + one item
 * per listed theme (ADR-188).
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

/**
 * Build the browser client for `story` into dist/web/<story>/. Assumes platform +
 * story (incl. ESM where applicable) are already built.
 * @throws if the story or its browser-entry.ts is missing, or game.js is empty after esbuild.
 */
export function buildBrowserClient(root: string, story: string, opts: BrowserBuildOptions = {}): void {
  const log = (m: string) => !opts.quiet && console.log(m);
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

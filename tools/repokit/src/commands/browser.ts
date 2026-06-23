/**
 * browser.ts — `devkit build <story> --browser`: the self-contained single-player
 * web app at dist/web/<story>/ (build.sh build_browser_client, 877-952).
 *
 * Owner context: @sharpee/devkit (ADR-180 Phase 3b). The author's player-facing
 * deliverable (AC-9): an IIFE game.js + css + html that boots in one load, portable
 * to any static host. Was byte-for-byte parity with build.sh; ADR-188 deliberately
 * diverges on CSS — the engine CSS (base/engine/decorations) now comes from
 * @sharpee/platform-browser and no theme CSS/fonts are shipped (themes are packages).
 *
 * Public interface: buildBrowserClient(root, story, opts) -> void.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
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
  // index.html stays a repo template (title set at runtime by BrowserClient from story config).
  copyIfExists(join(tpl, 'index.html'), join(outDir, 'index.html'));
  // Engine CSS (base/engine/decorations) is owned by @sharpee/platform-browser (ADR-188),
  // copied from the in-repo package. No theme CSS or theme fonts are shipped (AC-4) — themes
  // arrive as @sharpee/theme-* packages (Phase 4).
  const engineStyles = join(root, 'packages', 'platform-browser', 'styles');
  cpSync(join(engineStyles, 'base.css'), join(outDir, 'base.css'));
  cpSync(join(engineStyles, 'engine.css'), join(outDir, 'engine.css'));
  cpSync(join(engineStyles, 'decorations.css'), join(outDir, 'decorations.css'));
  // Remove obsolete theme artifacts left by a pre-ADR-188 build, so a rebuild over an
  // existing output never serves stale theme CSS/fonts (AC-4).
  for (const stale of ['styles.css', 'themes']) {
    rmSync(join(outDir, stale), { recursive: true, force: true });
  }

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
    for (const stale of ['styles.css', 'themes']) {
      rmSync(join(webDir, stale), { recursive: true, force: true });
    }
  }

  // Invariant: assert the deliverable exists (no silent success on an empty build).
  const gameJs = join(outDir, 'game.js');
  if (!existsSync(gameJs) || statSync(gameJs).size === 0) {
    throw new Error(`browser build failed: ${join(outRel, 'game.js')} is missing or empty`);
  }
  log(`Output: ${outRel}/ (${statSync(gameJs).size} bytes)`);
}

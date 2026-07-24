/**
 * browser-core.ts — the ONE browser-build core (ADR-252 D5).
 *
 * Both callers — devkit's author build (`sharpee build <file>.story`) and
 * repokit's in-repo build (`./repokit build --browser <story>`) — run this
 * core. They differ ONLY in resolution mode (where platform-browser's styles,
 * the templates, and the esbuild alias resolve from), which is injected as a
 * `BrowserBuildEnv`. The core owns all build *logic*; the caller owns *where
 * things resolve*. This is the rule-8b collapse of the two copy-drifted builds
 * (`devkit/standalone/build-browser.ts` + `tools/repokit/src/commands/browser.ts`).
 *
 * Owner context: @sharpee/devkit (author tool, ADR-187). repokit depends on the
 * workspace and delegates here rather than reimplementing.
 *
 * Public interface: BrowserMeta, BrowserClientConfig, BrowserBuildEnv,
 * buildBrowser(); plus the theme-wiring helpers (WiredTheme, resolveWiredThemes,
 * copyWiredThemes, injectThemes) and escapeHtml, shared by both callers.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { IRMeta, StoryIR } from '@sharpee/chord';
import { makeFsImportResolver } from './author-game.js';
import { requireHatchModule } from './hatch-transpile.js';

// --------------------------------------------------------------------------
// Metadata + client config from the compiled Story IR (ADR-252 D2/D3)
// --------------------------------------------------------------------------

/** Browser-app identity — sourced from `IRMeta`, never from package.json (D2). */
export interface BrowserMeta {
  /** `meta.fields.id` — the output slug (dist/web/<id>) + storage-prefix default. */
  storyId: string;
  /** `meta.title`. */
  storyTitle: string;
  /** `meta.author`. */
  author: string;
  /** `meta.fields.version`. */
  version: string;
  /** `meta.fields.blurb`. */
  blurb: string;
}

/** Browser-client config — from `story`-header `key:` lines in `meta.fields` (D3). */
export interface BrowserClientConfig {
  /** `client:` — the client target (D1 defaults it to `browser`). */
  client: string;
  /** `theme:` — the theme PACKAGE the story uses (ADR-188), or null. */
  theme: string | null;
  /** `template:` — the template/layout PACKAGE (ADR-253), or null. */
  template: string | null;
  /** `themes:` — comma-split in-client theme-menu ids. */
  themes: string[];
  /** `default-theme:` — boot theme; declared `theme:` else `classic`. */
  defaultTheme: string;
  /** `storage-prefix:` — save-storage key prefix; defaults to the story id. */
  storagePrefix: string;
}

/**
 * Header `key:` lines the build understands (D3). Any `meta.fields` key outside
 * this set is an author typo or a stray field — the build keeps it (the parser
 * captures every `key:` line) but warns, so `tempate:` is visible, not dropped.
 * `states`/`score` header lines are special-cased by the parser and never land
 * in `meta.fields`, so they never appear here.
 */
export const KNOWN_HEADER_KEYS: ReadonlySet<string> = new Set([
  'id',
  'version',
  'blurb',
  'client',
  'theme',
  'template',
  'themes',
  'default-theme',
  'storage-prefix',
]);

/**
 * Derive the browser-app metadata from the compiled Story IR (D2). All identity
 * comes from the `.story` header — never package.json / src/index.ts.
 * @throws if the story declares no `id:` (the output slug + storage prefix key).
 */
export function readBrowserMeta(meta: IRMeta): BrowserMeta {
  const id = (meta.fields.id ?? '').trim();
  if (!id) {
    throw new Error(
      'the story header declares no `id:` — a browser build needs one (it is the output slug and storage-prefix default).',
    );
  }
  return {
    storyId: id,
    storyTitle: meta.title,
    author: meta.author,
    version: (meta.fields.version ?? '').trim(),
    blurb: (meta.fields.blurb ?? '').trim(),
  };
}

/**
 * Derive the browser-client config from `meta.fields` (D3), applying every
 * documented default. Returns the config plus a warning per unrecognized header
 * key (D3 rejection case) — the caller surfaces them, so a typo is not silent.
 */
export function readClientConfig(meta: IRMeta): {
  config: BrowserClientConfig;
  warnings: string[];
} {
  const f = meta.fields;
  const warnings: string[] = [];
  for (const key of Object.keys(f)) {
    if (!KNOWN_HEADER_KEYS.has(key)) {
      warnings.push(`unrecognized header field '${key}' — ignored`);
    }
  }

  const themes = (f.themes ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const theme = f.theme?.trim() || null;
  const template = f.template?.trim() || null;
  // default-theme → declared theme → classic (D3 amendment).
  const defaultTheme = f['default-theme']?.trim() || theme || 'classic';

  return {
    config: {
      client: f.client?.trim() || 'browser',
      theme,
      template,
      themes,
      defaultTheme,
      storagePrefix: f['storage-prefix']?.trim() || (f.id ?? '').trim(),
    },
    warnings,
  };
}

// --------------------------------------------------------------------------
// Theme wiring (shared helpers — one copy, ADR-252 D5)
// --------------------------------------------------------------------------

/** A theme wired into the build (ADR-188). */
export interface WiredTheme {
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
export interface BuiltinThemeEntry {
  name: string;
  css: string;
  assets?: string[];
}

/**
 * Resolve the themes a story lists. Each entry is either:
 *  - a string id of a BUILT-IN theme (shipped by @sharpee/platform-browser under
 *    styles/themes/, looked up in `themesDir`'s manifest.json), or
 *  - an inline `{ id, name }` for the author's OWN theme — its `[data-theme]`
 *    token block lives in the author override stylesheet (browser/<package-name>.css),
 *    so the build only adds a menu entry.
 * Explicit opt-in; no scanning (AC-9). `classic` is the engine default and is
 * always present, so it need not be listed.
 *
 * @param themesDir platform-browser's styles/themes/ directory
 * @param entries   the story's declared theme entries (built-in ids / { id, name })
 * @throws on an unknown built-in id or a malformed entry.
 */
export function resolveWiredThemes(themesDir: string, entries: unknown[]): WiredTheme[] {
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
      `Invalid theme entry: ${JSON.stringify(entry)}. ` +
        `Use a built-in id (string) or an author theme { "id", "name" }.`,
    );
  });
}

/**
 * Copy each BUILT-IN theme's CSS to `<outDir>/themes/<id>.css` and its declared
 * sibling assets into `<outDir>/themes/` so relative `@font-face` URLs resolve.
 * Author themes copy nothing (their CSS is in the override stylesheet). The
 * `themes/` dir is rebuilt from scratch so a de-listed theme never lingers.
 */
export function copyWiredThemes(themes: WiredTheme[], outDir: string): void {
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

/** Escape the four HTML-significant characters for text injected into index.html. */
export function escapeHtml(s: string): string {
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
export function injectThemes(html: string, themes: WiredTheme[]): string {
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

/** Substitute the story tokens index.html carries (the override stylesheet link). */
function processTemplate(html: string, meta: BrowserMeta): string {
  return html
    .replace(/\{\{STORY_ID\}\}/g, meta.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, meta.storyTitle);
}

/**
 * Validate a story's custom `browser/index.html` (ADR-253 D3). The author owns
 * the whole page, but the `sharpee-*` theme named-style contract is required
 * (else the engine CSS + themes cannot apply) — a warning, since the page is
 * still served. A data channel with no element named for it (`#<channel>` /
 * `[data-channel]`) falls to the generic panel at runtime (D2) — also warned,
 * so an unplaced channel is visible, not a silent surprise. The menu / dialogs
 * are optional (a standalone themed view may omit them) and are NOT required.
 *
 * @param html      the processed custom page
 * @param channels  the story's IR channels (data channels are placement targets)
 * @param warn      sink for non-fatal warnings
 */
function validateCustomPage(
  html: string,
  channels: { name: string; family: string }[],
  warn: (m: string) => void,
): void {
  if (!/engine\.css/.test(html)) {
    warn(
      '  ⚠ browser/index.html does not link engine.css — the sharpee-* named styles and themes ' +
        'will not apply. Base your page on the default index.html (copy-and-edit).',
    );
  }
  for (const ch of channels) {
    if (ch.family !== 'data') continue;
    const placed =
      new RegExp(`id=["']${ch.name}["']`).test(html) ||
      new RegExp(`data-channel=["']${ch.name}["']`).test(html);
    if (!placed) {
      warn(
        `  ⚠ channel '${ch.name}' has no #${ch.name} element in browser/index.html — ` +
          'it will render in the generic sidebar panel (ADR-253 D2 fallback).',
      );
    }
  }
}

// --------------------------------------------------------------------------
// The build core (ADR-252 D5) — one Chord `.story` → browser-app build,
// both callers (devkit author, repokit in-repo) invoke it.
// --------------------------------------------------------------------------

/**
 * Resolution-mode injection (ADR-252 D5). The two callers differ ONLY in where
 * platform-browser's styles, the templates, and the esbuild alias resolve from,
 * and where the output tree lands. Everything else is core logic.
 */
export interface BrowserBuildEnv {
  /** platform-browser's styles/ dir (engine CSS + built-in themes/). */
  stylesDir: string;
  /** The devkit templates/browser dir (index.html + entry template) — the ONE
   *  canonical template both callers share, so their output matches (D5). */
  templatesDir: string;
  /** cwd for esbuild + the root under which `dist/web/<id>` is written
   *  (author: the project dir; in-repo: the repo root). Both resolve @sharpee/*
   *  from node_modules via `--conditions=require`, so the bundle is identical —
   *  no in-repo alias fork (byte-identical parity, verified). */
  esbuildCwd: string;
  /** The platform (engine) version stamped into the story's version.ts. */
  engineVersion: string;
  /** Post-build mirror (in-repo: website/public/web/<id>); undefined in author mode. */
  mirror?: (outDir: string, storyId: string) => void;
}

/** Per-invocation build knobs. */
export interface BrowserBuildOpts {
  minify?: boolean;
  sourcemap?: boolean;
  quiet?: boolean;
  /** Fixed build stamp (BUILD_DATE); defaults to now. Injected by the AC test so
   *  the two callers' output is byte-identical, not merely identical-modulo-stamp. */
  buildDate?: string;
}

/** Write the story's `src/version.ts` beside its entry, from the IR version (D2). */
function stampBrowserVersion(
  entryDir: string,
  meta: BrowserMeta,
  engineVersion: string,
  buildDate: string,
): void {
  fs.mkdirSync(entryDir, { recursive: true });
  fs.writeFileSync(
    path.join(entryDir, 'version.ts'),
    `/**
 * Version information for ${meta.storyId}
 * Auto-generated by sharpee - DO NOT EDIT
 */
export const STORY_VERSION = '${meta.version || '0.0.0'}';
export const BUILD_DATE = '${buildDate}';
export const ENGINE_VERSION = '${engineVersion}';
export const VERSION_INFO = { version: STORY_VERSION, buildDate: BUILD_DATE, engineVersion: ENGINE_VERSION } as const;
`,
  );
}

/**
 * Instantiate the generated browser entry (D4) from the devkit template,
 * parameterized by the IR metadata + client config. Written to a build-scratch
 * dir (beside a stamped version.ts) so esbuild bundles it with @sharpee/*
 * resolving from the env's node_modules. Returns the entry file path.
 */
/**
 * One hatch module the generated entry must bundle (ADR-259 D2).
 *
 * **The two strings are deliberately different, and conflating them is the
 * single way to get this wrong.**
 *
 * - `mapKey` is the author's `modulePath` VERBATIM (`'./chord-extras.ts'`),
 *   because the loader looks up exactly what the author wrote.
 * - `specifier` is that module resolved against the `.story`'s directory and
 *   re-expressed relative to the GENERATED ENTRY's location — which is a
 *   scratch directory under `dist/.browser-entry/<storyId>/`, not the story
 *   folder. A naive `'./chord-extras.ts'` in the entry would resolve against
 *   the scratch dir and fail.
 */
interface HatchBinding {
  mapKey: string;
  specifier: string;
  binding: string;
}

/**
 * Resolve every distinct hatch module to its (mapKey, specifier) pair.
 *
 * @param hatches the IR's hatch declarations
 * @param storyDir directory of the `.story` file — what author paths are relative to
 * @param entryDir directory the generated entry will be written to
 */
function resolveHatchBindings(
  hatches: readonly { modulePath: string }[],
  storyDir: string,
  entryDir: string,
): HatchBinding[] {
  const seen = new Map<string, HatchBinding>();
  for (const hatch of hatches) {
    if (seen.has(hatch.modulePath)) continue;
    const absolute = path.resolve(storyDir, hatch.modulePath);
    let specifier = path.relative(entryDir, absolute).split(path.sep).join('/');
    if (!specifier.startsWith('.')) specifier = `./${specifier}`;
    seen.set(hatch.modulePath, {
      mapKey: hatch.modulePath,
      specifier,
      binding: `__hatch${seen.size}`,
    });
  }
  return [...seen.values()];
}

/**
 * Write `hatch-modules.ts` beside the entry — generated at build time exactly
 * as `version.ts` is, and imported by the entry the same way.
 *
 * Emitting a sibling module rather than substituting the entry's text is what
 * lets the D4 escape hatch keep hatch support: a hand-written
 * `src/browser-entry.ts` imports `./hatch-modules.js` like any other module,
 * and the build regenerates it in place. A placeholder in the template would
 * have been left literal in a scaffolded entry, which is exactly the bug this
 * shape avoids.
 */
function stampHatchModules(entryDir: string, hatches: HatchBinding[]): void {
  const imports = hatches
    .map((h) => `import * as ${h.binding} from ${JSON.stringify(h.specifier)};`)
    .join('\n');
  const entries = hatches
    .map((h) => `  ${JSON.stringify(h.mapKey)}: ${h.binding} as unknown as Record<string, unknown>,`)
    .join('\n');

  const source = `/**
 * hatch-modules.ts — GENERATED at build time (ADR-259 D1/D2). Do not edit.
 *
 * The keys are the author's \`from "…"\` paths VERBATIM — that is what the
 * loader looks up. The import specifiers are the same modules resolved
 * relative to THIS file, which lives wherever the entry does rather than
 * beside the \`.story\`; the two strings differ on purpose.
 *
 * A non-empty map means the bundle carries author-written executable code,
 * not merely story data (D3).
 */
${imports}

export const hatchModules: Record<string, Record<string, unknown>> = {
${entries}
};
`;
  fs.mkdirSync(entryDir, { recursive: true });
  fs.writeFileSync(path.join(entryDir, 'hatch-modules.ts'), source);
}

/**
 * Bind every hatch in Node and build the world, so "builds" means "binds"
 * (ADR-259 D5).
 *
 * A hatch that names a missing module, a missing export, or an export of the
 * wrong kind is a defect the author should learn about at build time — not
 * one the player discovers in a browser console. The loader already rejects
 * all three atomically, with the `.story` span; this runs that rejection
 * early and surfaces it as a build failure.
 *
 * **The hatch that binds is the hatch that ships**: `requireHatchModule`
 * transpiles the same authored source the browser bundle imports (Phase A's
 * mechanism, second caller). Unminified and Node-loadable by construction —
 * unminified matters beyond readability, because the loader's `chord.*`
 * namespace lint inspects function source and is documented unreliable
 * against minified code.
 *
 * **No `tsc`, no `tsconfig`, no `typescript` anywhere in this path.**
 * Typechecking is the wrong instrument: types erase, so type errors usually
 * still transpile, and the errors that actually break a hatched story are
 * contract errors.
 */
function checkHatchBindings(ir: StoryIR, storyDir: string, rel: string): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createStory } = require('@sharpee/story-loader') as typeof import('@sharpee/story-loader');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WorldModel } = require('@sharpee/world-model') as typeof import('@sharpee/world-model');

  const hatchModules: Record<string, Record<string, unknown>> = {};
  try {
    for (const hatch of ir.hatches) {
      if (!(hatch.modulePath in hatchModules)) {
        hatchModules[hatch.modulePath] = requireHatchModule(storyDir, hatch.modulePath);
      }
    }
    const story = createStory(ir, { hatchModules });
    const world = new WorldModel();
    story.initializeWorld(world);
    story.createPlayer(world);
  } catch (error: unknown) {
    // Surface the loader's own message and its `.story` span — it says more
    // about a broken hatch than any wrapper could.
    const span = (error as { span?: { line: number; column: number } }).span;
    const where = span ? `${rel}:${span.line}:${span.column}` : rel;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${where} hatch binding failed: ${message}`);
  }
}

function generateEntry(
  templatesDir: string,
  scratchDir: string,
  meta: BrowserMeta,
  config: BrowserClientConfig,
): string {
  const tpl = fs.readFileSync(path.join(templatesDir, 'chord-browser-entry.ts.template'), 'utf-8');
  // Menu ids from the D3 `themes:` field → BrowserClient theme entries.
  const themesLiteral = JSON.stringify(config.themes.map((id) => ({ id, name: id })));
  const entry = tpl
    .replace(/\{\{STORY_ID\}\}/g, meta.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, meta.storyTitle)
    .replace(/\{\{DEFAULT_THEME\}\}/g, config.defaultTheme)
    .replace(/\{\{THEMES_JSON\}\}/g, themesLiteral)
    .replace(/\{\{STORAGE_PREFIX\}\}/g, config.storagePrefix);
  fs.mkdirSync(scratchDir, { recursive: true });
  const entryFile = path.join(scratchDir, 'browser-entry.ts');
  fs.writeFileSync(entryFile, entry);
  return entryFile;
}

/**
 * Build a Chord `.story` into a self-contained browser app (ADR-252). Compiles
 * the story as the fail-fast gate, derives ALL metadata + client config from the
 * IR (never package.json — D2/D3), ships the source for compile-at-boot (ADR-210),
 * bundles the entry (hand-written escape hatch, else generated — D4), wires the
 * page + engine CSS + themes, and asserts the deliverable. The two callers differ
 * only in `env`.
 *
 * Synchronous: esbuild runs via execFileSync, so there is no async work — callers
 * invoke it directly (no await needed).
 *
 * @param storyFile absolute path to the `.story` file
 * @param env       resolution-mode injection (D5)
 * @param opts      per-invocation knobs
 * @returns the output directory (`<cwd>/dist/web/<id>`)
 * @throws on gate errors, declared hatches, an unknown `client:`, or an empty bundle
 */
export function buildBrowser(
  storyFile: string,
  env: BrowserBuildEnv,
  opts: BrowserBuildOpts = {},
): string {
  const log = (m: string) => !opts.quiet && console.log(m);
  const warn = (m: string) => console.warn(m);
  const storyDir = path.dirname(path.resolve(storyFile));
  const rel = path.relative(env.esbuildCwd, storyFile) || storyFile;

  // --- Compile: the build-time fail-fast gate (diagnostics belong here, never
  //     first as a broken page). The recording resolver captures every imported
  //     fragment so the SAME content ships for compile-at-boot (ADR-251). ---
  const chord = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const importBundle: Record<string, string> = {};
  const fsResolver = makeFsImportResolver(storyDir);
  const result = chord.compile(fs.readFileSync(storyFile, 'utf-8'), {
    importResolver: (name: string) => {
      const text = fsResolver(name);
      if (text !== null) importBundle[name] = text;
      return text;
    },
  }) as { ok: boolean; ir: StoryIR; diagnostics: readonly { severity: string; span: { line: number; column: number }; code: string; message: string }[] };

  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  for (const d of errors) {
    console.error(`  ${rel}:${d.span.line}:${d.span.column} error [${d.code}] ${d.message}`);
  }
  if (!result.ok) {
    throw new Error(`${rel} failed the load-time gates (${errors.length} error(s)).`);
  }
  // ADR-259 D1: `hasHatches` SELECTS A ROUTE; it does not fail the build.
  // A hatched story bundles its author-written modules alongside the compiled
  // IR — see the hatch imports the generated entry receives below.

  // --- Metadata + client config, all from the IR (D2/D3). ---
  const meta = readBrowserMeta(result.ir.meta);
  const { config, warnings } = readClientConfig(result.ir.meta);
  for (const w of warnings) warn(`  ⚠ ${w}`);
  if (config.client !== 'browser') {
    throw new Error(
      `unknown client '${config.client}' (story header \`client:\`) — the build can only produce 'browser'.`,
    );
  }
  // Template validation (D3-amendment) is forward-looking: template packages
  // (ADR-253) do not exist yet, so a declared `template:` cannot be resolved and
  // channel-cross-check is a no-op until they do. Guarded so it never blocks.
  if (config.template) {
    warn(`  ⚠ template package '${config.template}' declared but template packages are not yet supported (ADR-253) — ignored.`);
  }

  log(`  Story: ${meta.storyTitle} (${meta.storyId})`);

  const outDir = path.join(env.esbuildCwd, 'dist', 'web', meta.storyId);
  fs.mkdirSync(outDir, { recursive: true });

  // --- Ship the source (+ imports) for compile-at-boot (ADR-210/251). ---
  fs.copyFileSync(storyFile, path.join(outDir, 'story.story'));
  log(`  ✓ Validated ${rel} (gate-clean) and shipped it as story.story`);
  const importNames = Object.keys(importBundle);
  if (importNames.length > 0) {
    fs.writeFileSync(path.join(outDir, 'imports.json'), JSON.stringify(importBundle));
    log(`  ✓ Bundled ${importNames.length} import fragment(s) → imports.json`);
  }
  // Story IR artifact for the IDE/tooling surface (dist/, not dist/web/).
  const irOut = path.join(env.esbuildCwd, 'dist', `${meta.storyId}.ir.json`);
  fs.mkdirSync(path.dirname(irOut), { recursive: true });
  fs.writeFileSync(irOut, JSON.stringify(result.ir, null, 2) + '\n');
  log(`  ✓ Story IR → ${path.relative(env.esbuildCwd, irOut)}`);

  // --- Entry: hand-written escape hatch (D4) wins; else generate from template. ---
  const handWritten = path.join(storyDir, 'src', 'browser-entry.ts');
  let entryFile: string;
  let entryDir: string;
  if (fs.existsSync(handWritten)) {
    entryFile = handWritten;
    entryDir = path.join(storyDir, 'src');
    log('  Using hand-written src/browser-entry.ts (escape hatch)');
  } else {
    entryDir = path.join(env.esbuildCwd, 'dist', '.browser-entry', meta.storyId);
    entryFile = generateEntry(env.templatesDir, entryDir, meta, config);
    log('  Generated browser entry from template');
  }

  // version.ts (imported by the entry as ./version) — stamped from the IR (D2).
  const buildDate = opts.buildDate ?? new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  stampBrowserVersion(entryDir, meta, env.engineVersion, buildDate);

  // hatch-modules.ts (imported by the entry as ./hatch-modules) — ADR-259 D2.
  // Regenerated for BOTH entry paths, so the D4 escape hatch keeps hatch
  // support. Specifiers resolve from wherever the entry lives; map keys stay
  // verbatim — see HatchBinding.
  const hatchBindings = resolveHatchBindings(result.ir.hatches, storyDir, entryDir);
  stampHatchModules(entryDir, hatchBindings);
  if (hatchBindings.length > 0) {
    log(`  ✓ Wired ${hatchBindings.length} hatch module(s) into the bundle`);
  }

  // --- The bind check (D5): a hatch that does not bind fails the BUILD,
  //     not the player's browser. ---
  if (result.ir.hasHatches) {
    log('  Checking hatch bindings...');
    checkHatchBindings(result.ir, storyDir, rel);
    log(`  ✓ ${result.ir.hatches.length} hatch binding(s) resolve`);
  }

  // --- Bundle the entry → dist/web/<id>/game.js (single IIFE payload). ---
  log('  Bundling game.js...');
  const esbuildArgs = [
    'esbuild',
    entryFile,
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
  if (opts.minify !== false) esbuildArgs.push('--minify');
  if (opts.sourcemap !== false) esbuildArgs.push('--sourcemap');
  try {
    execFileSync('npx', esbuildArgs, { cwd: env.esbuildCwd, stdio: opts.quiet ? 'pipe' : 'inherit' });
  } catch (error: unknown) {
    const stderr = (error as { stderr?: Buffer }).stderr;
    if (stderr) console.error(stderr.toString());
    throw new Error('esbuild bundling failed.');
  }
  log('  ✓ Built game.js');

  // --- The page: the default template, OR the story's own custom page (ADR-253
  //     D3 layout escape hatch). `browser/index.html` present → the author owns
  //     the whole page; the build swaps it in, still filling story tokens + theme
  //     wiring, and validates the sharpee-* named-style contract. ---
  const wiredThemes = resolveWiredThemes(path.join(env.stylesDir, 'themes'), config.themes);
  const customPage = path.join(storyDir, 'browser', 'index.html');
  const usingCustomPage = fs.existsSync(customPage);
  let html = fs.readFileSync(usingCustomPage ? customPage : path.join(env.templatesDir, 'index.html'), 'utf-8');
  html = injectThemes(processTemplate(html, meta), wiredThemes);
  if (usingCustomPage) validateCustomPage(html, result.ir.channels, warn);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  log(usingCustomPage ? '  ✓ Used browser/index.html (custom layout, ADR-253 D3)' : '  ✓ Copied index.html');

  // Engine CSS (base/engine/decorations) — platform-browser-owned (ADR-188).
  for (const css of ['base.css', 'engine.css', 'decorations.css']) {
    fs.copyFileSync(path.join(env.stylesDir, css), path.join(outDir, css));
  }
  fs.rmSync(path.join(outDir, 'styles.css'), { force: true });
  log('  ✓ Copied platform engine CSS (base, engine, decorations)');

  // Wired theme packages → dist/web/<id>/themes/.
  copyWiredThemes(wiredThemes, outDir);
  if (wiredThemes.length > 0) {
    log(`  ✓ Wired ${wiredThemes.length} theme(s): ${wiredThemes.map((t) => t.id).join(', ')}`);
  }

  // Author override stylesheet → dist/web/<id>/<id>.css (index.html links it last).
  const overrideCss = path.join(storyDir, 'browser', `${meta.storyId}.css`);
  const overrideOut = path.join(outDir, `${meta.storyId}.css`);
  if (fs.existsSync(overrideCss)) {
    fs.copyFileSync(overrideCss, overrideOut);
    log(`  ✓ Copied ${meta.storyId}.css`);
  } else {
    fs.writeFileSync(overrideOut, `/* ${meta.storyTitle} — author overrides (none yet) */\n`);
  }

  // Author assets (audio, images): copy <storyDir>/assets/ contents, skip dotfiles.
  const assetsDir = path.join(storyDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    let count = 0;
    for (const name of fs.readdirSync(assetsDir)) {
      if (name.startsWith('.')) continue;
      fs.cpSync(path.join(assetsDir, name), path.join(outDir, name), { recursive: true });
      count++;
    }
    if (count > 0) log(`  ✓ Copied assets/ (${count} ${count === 1 ? 'entry' : 'entries'})`);
  }

  // --- Invariant: the deliverable exists (no silent success on an empty build). ---
  const gameJs = path.join(outDir, 'game.js');
  if (!fs.existsSync(gameJs) || fs.statSync(gameJs).size === 0) {
    throw new Error(`browser build failed: ${path.join(outDir, 'game.js')} is missing or empty.`);
  }

  // In-repo mirror (website/public/web/<id>); no-op in author mode.
  env.mirror?.(outDir, meta.storyId);

  const sizeKb = (fs.statSync(gameJs).size / 1024).toFixed(1);
  log(`\n✅ Build complete! (game.js ${sizeKb} KB)`);
  log(`Output: ${path.relative(env.esbuildCwd, outDir)}/`);

  return outDir;
}

// --------------------------------------------------------------------------
// The playground bundle (ADR-191 Phase 1) — a story-AGNOSTIC sibling build.
//
// buildBrowser() gates the build on one `.story` compiling and derives all
// metadata from its IR. A playground has NO story at build time: it ships the
// compiler + loader + engine + platform-browser with a generic entry that
// takes `.story` source at RUNTIME (from the site's editor, over postMessage).
// So this is a sibling function, not a parameterization of buildBrowser — it
// reuses the CSS/theme/HTML helpers but skips the compile gate and IR metadata.
// --------------------------------------------------------------------------

/** Resolution-mode injection for the playground build (cf. BrowserBuildEnv). */
export interface PlaygroundBuildEnv {
  /** platform-browser's styles/ dir (engine CSS). */
  stylesDir: string;
  /** The devkit templates/browser dir (index.html + playground entry template). */
  templatesDir: string;
  /** cwd for esbuild + the root under which `dist/playground` is written. */
  esbuildCwd: string;
  /** The platform (engine) version — the pinned playground version (AC-8). */
  engineVersion: string;
  /** Version-pinned sync of the built bundle (in-repo: website/public/playground/v<X.Y.Z>/). */
  sync?: (outDir: string, version: string) => void;
}

/** Generic identity for the story-less playground bundle. */
const PLAYGROUND_META: BrowserMeta = {
  storyId: 'playground',
  storyTitle: 'Sharpee Playground',
  author: 'The Sharpee Project',
  version: '', // filled from the platform version at build time
  blurb: 'Paste a Chord story and play it in the browser.',
};
const PLAYGROUND_STORAGE_PREFIX = 'sharpee-playground';
const PLAYGROUND_DEFAULT_THEME = 'classic';

/** Instantiate the playground entry from the template (no story tokens — story-agnostic). */
function generatePlaygroundEntry(templatesDir: string, scratchDir: string): string {
  const tpl = fs.readFileSync(path.join(templatesDir, 'playground-entry.ts.template'), 'utf-8');
  const entry = tpl
    .replace(/\{\{DEFAULT_THEME\}\}/g, PLAYGROUND_DEFAULT_THEME)
    .replace(/\{\{THEMES_JSON\}\}/g, '[]')
    .replace(/\{\{STORAGE_PREFIX\}\}/g, PLAYGROUND_STORAGE_PREFIX);
  fs.mkdirSync(scratchDir, { recursive: true });
  const entryFile = path.join(scratchDir, 'playground-entry.ts');
  fs.writeFileSync(entryFile, entry);
  return entryFile;
}

/**
 * Build the story-agnostic playground bundle (ADR-191 Phase 1) into
 * `<esbuildCwd>/dist/playground/`: a generated entry that compiles `.story`
 * source supplied at runtime (compile → IR → story-loader → engine), the
 * default player-pane page, engine CSS, and a stamped version.ts (version =
 * platform `X.Y.Z`). No story is baked in; no wasm. On success, calls
 * `env.sync?.(outDir, version)` to version-pin it into the website.
 *
 * @param env  resolution-mode injection
 * @param opts per-invocation knobs (minify/sourcemap/quiet/buildDate)
 * @returns the output directory (`<cwd>/dist/playground`)
 * @throws if game.js is missing or empty after esbuild (no silent empty build)
 */
export function buildPlaygroundBundle(
  env: PlaygroundBuildEnv,
  opts: BrowserBuildOpts = {},
): string {
  const log = (m: string) => !opts.quiet && console.log(m);
  const version = env.engineVersion;
  const meta: BrowserMeta = { ...PLAYGROUND_META, version };

  const outDir = path.join(env.esbuildCwd, 'dist', 'playground');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  log(`  Playground bundle v${version} (story-agnostic)`);

  // --- Entry (generated) + version.ts, in a build-scratch dir. ---
  const entryDir = path.join(env.esbuildCwd, 'dist', '.playground-entry');
  const entryFile = generatePlaygroundEntry(env.templatesDir, entryDir);
  const buildDate = opts.buildDate ?? new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  stampBrowserVersion(entryDir, meta, env.engineVersion, buildDate);

  // --- Bundle the entry → dist/playground/game.js (single IIFE payload). ---
  log('  Bundling game.js...');
  const esbuildArgs = [
    'esbuild',
    entryFile,
    '--bundle',
    '--platform=browser',
    '--target=es2020',
    '--format=iife',
    '--global-name=SharpeePlayground',
    `--outfile=${path.join(outDir, 'game.js')}`,
    '--conditions=require',
    '--define:process.env.NODE_ENV="production"',
    '--define:process.env.PARSER_DEBUG=undefined',
    '--define:process.env.DEBUG_PRONOUNS=undefined',
  ];
  if (opts.minify !== false) esbuildArgs.push('--minify');
  if (opts.sourcemap !== false) esbuildArgs.push('--sourcemap');
  try {
    execFileSync('npx', esbuildArgs, { cwd: env.esbuildCwd, stdio: opts.quiet ? 'pipe' : 'inherit' });
  } catch (error: unknown) {
    const stderr = (error as { stderr?: Buffer }).stderr;
    if (stderr) console.error(stderr.toString());
    throw new Error('esbuild bundling failed.');
  }
  log('  ✓ Built game.js');

  // --- The page: the default player-pane template, no themes wired. ---
  let html = processTemplate(fs.readFileSync(path.join(env.templatesDir, 'index.html'), 'utf-8'), meta);
  html = injectThemes(html, []);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  log('  ✓ Copied index.html');

  // Engine CSS (base/engine/decorations) — platform-browser-owned (ADR-188).
  for (const css of ['base.css', 'engine.css', 'decorations.css']) {
    fs.copyFileSync(path.join(env.stylesDir, css), path.join(outDir, css));
  }
  // The default page links `<id>.css` (the author-override slot); ship an empty one.
  fs.writeFileSync(path.join(outDir, `${meta.storyId}.css`), '/* Sharpee Playground — no overrides */\n');
  log('  ✓ Copied platform engine CSS (base, engine, decorations)');

  // --- Invariant: the deliverable exists (no silent success on an empty build). ---
  const gameJs = path.join(outDir, 'game.js');
  if (!fs.existsSync(gameJs) || fs.statSync(gameJs).size === 0) {
    throw new Error(`playground build failed: ${gameJs} is missing or empty.`);
  }

  // Version-pinned website sync (in-repo); no-op in a bare build.
  env.sync?.(outDir, version);

  const sizeKb = (fs.statSync(gameJs).size / 1024).toFixed(1);
  log(`\n✅ Playground bundle complete! (game.js ${sizeKb} KB)`);
  log(`Output: ${path.relative(env.esbuildCwd, outDir)}/ (pinned v${version})`);

  return outDir;
}

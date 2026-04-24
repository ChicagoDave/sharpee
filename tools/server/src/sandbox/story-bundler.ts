/**
 * Install-time story bundler — produces Deno-runnable ESM from .sharpee input.
 *
 * Public interface: {@link compileStoryBundle}, {@link CompiledStory},
 *   {@link CompileStoryOptions}.
 * Bounded context: sandbox install-time compilation (ADR-153 Phase 4
 *   remediation plan, sub-phase 4-REMEDIATION-2).
 *
 * Given a `.sharpee` file (zip of `meta.json` + `story.js`), this module
 * produces a single self-contained ESM at `<outDir>/<slug>.host.js`. The
 * output inlines:
 *   - the host logic from `src/sandbox/deno-entry.ts` (source of truth),
 *   - the story's `story.js` (140+ bare `@sharpee/*` imports),
 *   - the full `@sharpee/*` graph resolved through the server's workspace.
 *
 * No `@sharpee/*` bare specifier survives in the output. The Deno runtime
 * spawns the bundle with `--allow-read=<bundle>,<story_source>` and zero
 * other permissions (ADR-153 Decision 1).
 *
 * Operator model: drop `.sharpee` into `/data/stories/`, server detects and
 * compiles on first room spawn (see story-cache.ts). This bundler is the
 * compilation primitive; caching/mtime logic lives next to it.
 */

import { existsSync, promises as fs } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuildBuild } from 'esbuild';
import { unzipSync } from 'fflate';

/**
 * Shape of `meta.json` inside a `.sharpee` archive. Only `format` and
 * `formatVersion` are validated here; everything else is passed through to
 * the host as a frozen constant.
 */
export interface StoryMeta {
  format: 'sharpee-story';
  formatVersion: 1;
  title: string;
  author?: string;
  version?: string;
  description?: string;
  ifid?: string;
  [key: string]: unknown;
}

export interface CompileStoryOptions {
  /** Directory where the compiled `<slug>.host.js` is written. Created if missing. */
  outDir: string;
}

export interface CompiledStory {
  /** Absolute path to the self-contained ESM output. */
  bundlePath: string;
  /** Parsed meta.json for caller convenience. */
  meta: StoryMeta;
  /** Slug derived from the source filename (used as the bundle base name). */
  slug: string;
}

const SUPPORTED_FORMAT = 'sharpee-story';
const SUPPORTED_FORMAT_VERSION = 1;

/**
 * Locate the production `deno-entry.ts` and the server's `node_modules`.
 *
 * Probes several candidate paths relative to this module's on-disk location
 * so the bundler works identically in:
 *   - Docker runtime: `/app/dist/sandbox/story-bundler.js` finds
 *     `/app/dist/sandbox/deno-entry.ts` (Dockerfile copies the .ts source
 *     next to the compiled bundler) and `/app/node_modules/`.
 *   - Local dev after tsc: `tools/server/dist/sandbox/story-bundler.js` —
 *     deno-entry.ts is NOT in dist (excluded from tsc emit), so fall back
 *     to `tools/server/src/sandbox/deno-entry.ts`; node_modules sits at
 *     `tools/server/node_modules`.
 */
function resolveServerPaths(): { denoEntry: string; nodeModules: string } {
  const here = dirname(fileURLToPath(import.meta.url));

  const denoEntryCandidates = [
    resolvePath(here, 'deno-entry.ts'), // Docker / sibling-to-bundler layout
    resolvePath(here, '../../src/sandbox/deno-entry.ts'), // dev: dist/sandbox/ → src/sandbox/
  ];
  const denoEntry = denoEntryCandidates.find(existsSync);
  if (!denoEntry) {
    throw new Error(
      `story-bundler: deno-entry.ts not found. Tried:\n  ${denoEntryCandidates.join('\n  ')}`,
    );
  }

  const nodeModulesCandidates = [
    resolvePath(here, '../../node_modules'), // dev: dist/sandbox → tools/server/node_modules
    resolvePath(here, '../node_modules'), // Docker: /app/dist/sandbox → /app/node_modules
    resolvePath(here, '../../../node_modules'), // ts-run dev (src/sandbox direct)
  ];
  const nodeModules = nodeModulesCandidates.find(existsSync);
  if (!nodeModules) {
    throw new Error(
      `story-bundler: node_modules not found. Tried:\n  ${nodeModulesCandidates.join('\n  ')}`,
    );
  }

  return { denoEntry, nodeModules };
}

/**
 * Derive a filesystem-safe slug from a source path.
 *
 * @example slugFromSource('/data/stories/dungeo.sharpee') → 'dungeo'
 */
function slugFromSource(sourcePath: string): string {
  const base = sourcePath.replace(/\\/g, '/').split('/').pop() ?? 'story';
  return base.replace(/\.sharpee$/i, '').replace(/[^a-zA-Z0-9._-]/g, '-');
}

/**
 * Compile a `.sharpee` file into a self-contained Deno-runnable ESM.
 *
 * @param sourcePath Absolute (or cwd-relative) path to the `.sharpee` file.
 * @param opts Bundle output options.
 * @returns Compiled bundle path + the parsed meta + the derived slug.
 * @throws If the archive is missing `meta.json` / `story.js`, or declares an
 *   unknown `format` / unsupported `formatVersion`.
 */
export async function compileStoryBundle(
  sourcePath: string,
  opts: CompileStoryOptions,
): Promise<CompiledStory> {
  const { denoEntry, nodeModules } = resolveServerPaths();
  const absSource = resolvePath(sourcePath);
  const slug = slugFromSource(absSource);

  // --- 1. Read + validate the archive ---
  const zipBytes = await fs.readFile(absSource);
  const files = unzipSync(new Uint8Array(zipBytes));
  if (!files['meta.json']) {
    throw new Error(`compileStoryBundle: ${absSource} missing meta.json`);
  }
  if (!files['story.js']) {
    throw new Error(`compileStoryBundle: ${absSource} missing story.js`);
  }
  const meta = JSON.parse(new TextDecoder().decode(files['meta.json'])) as StoryMeta;
  if (meta.format !== SUPPORTED_FORMAT) {
    throw new Error(
      `compileStoryBundle: ${absSource} unknown format "${String(meta.format)}" (expected "${SUPPORTED_FORMAT}")`,
    );
  }
  if (meta.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    throw new Error(
      `compileStoryBundle: ${absSource} formatVersion ${String(meta.formatVersion)} not supported (expected ${SUPPORTED_FORMAT_VERSION})`,
    );
  }

  // --- 2. Stage story.js so esbuild can resolve a plain "./story.js" import ---
  // Scratch lives under outDir/.scratch so it shares a filesystem with the
  // final output. It is deleted after the build completes.
  const scratchDir = join(opts.outDir, '.scratch', slug);
  await fs.mkdir(scratchDir, { recursive: true });
  await fs.writeFile(join(scratchDir, 'story.js'), files['story.js']);

  // --- 3. Generate the host shim ---
  // The shim is fed to esbuild as stdin (no disk write). It imports:
  //   - `main` from the real `deno-entry.ts` (absolute path — the source of
  //     truth; never copied or duplicated),
  //   - the staged `story.js` (namespace import so the host can read every
  //     export the story's registration code attached),
  // and inlines `meta` as a constant so the Deno runtime needs no filesystem
  // access to produce the READY frame.
  const storyJsPath = join(scratchDir, 'story.js');
  const shim = [
    `import { main } from ${JSON.stringify(denoEntry)};`,
    `import * as story from ${JSON.stringify(storyJsPath)};`,
    `const meta = ${JSON.stringify(meta)};`,
    `main({ story, meta });`,
    '',
  ].join('\n');

  // --- 4. Bundle ---
  await fs.mkdir(opts.outDir, { recursive: true });
  const bundlePath = join(opts.outDir, `${slug}.host.js`);

  try {
    await esbuildBuild({
      stdin: {
        contents: shim,
        resolveDir: scratchDir,
        loader: 'ts',
        sourcefile: `${slug}.host-shim.ts`,
      },
      bundle: true,
      platform: 'neutral',
      format: 'esm',
      target: 'es2022',
      conditions: ['import', 'module', 'default'],
      outfile: bundlePath,
      // nodePaths tells esbuild to walk these roots when a bare specifier
      // can't be resolved via normal relative / node_modules traversal. Since
      // the stdin's resolveDir is the scratch dir (outside the server tree),
      // we explicitly point esbuild at the server's node_modules.
      nodePaths: [nodeModules],
      // No `external` — the @sharpee/* graph inlines completely. That is the
      // entire point of the install-time bundler (see plan §Option D1).
      logLevel: 'silent',
      // Minimise runtime footprint; set `legalComments: 'none'` to avoid
      // copying hundreds of MIT notices into a single file.
      legalComments: 'none',
      // Hardcode debug flags to empty strings at bundle time so the Deno
      // runtime never attempts to read process.env — we spawn with no
      // `--allow-env` permission (see sandbox-process.ts for the spawn line,
      // ADR-153 Decision 1 for the no-env posture). The engine's parser reads
      // `PARSER_DEBUG`; stdlib pronoun resolution reads `DEBUG_PRONOUNS`. Both
      // are opt-in developer toggles — safe to stamp off in production.
      define: {
        'process.env.PARSER_DEBUG': '""',
        'process.env.DEBUG_PRONOUNS': '""',
      },
    });
  } finally {
    // --- 5. Always clean up scratch, even on build failure ---
    await fs.rm(scratchDir, { recursive: true, force: true });
  }

  return { bundlePath, meta, slug };
}

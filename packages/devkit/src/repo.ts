/**
 * repo.ts — monorepo layout constants and root resolution for devkit build/bundle.
 *
 * Owner context: @sharpee/devkit (ADR-180 Phase 3). These values mirror build.sh
 * exactly so `devkit build`/`bundle` reach byte-for-byte output parity before
 * build.sh is retired. Any drift here is a parity-gate failure.
 *
 * Public interface: findRepoRoot(), PLATFORM_PACKAGES, BUNDLE_ALIASES, BUNDLE_DTS,
 * storyVersionFile(), resolveStoryDir().
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

/**
 * Ordered platform build list (build.sh PACKAGES, 479-507): `[pkgName, dirUnderPackages]`.
 * Order is dependency order — do not re-sort.
 */
export const PLATFORM_PACKAGES: ReadonlyArray<readonly [string, string]> = [
  ['@sharpee/core', 'core'],
  ['@sharpee/text-blocks', 'text-blocks'],
  ['@sharpee/if-domain', 'if-domain'],
  ['@sharpee/media', 'media'],
  ['@sharpee/world-model', 'world-model'],
  ['@sharpee/helpers', 'helpers'],
  ['@sharpee/queries', 'queries'],
  ['@sharpee/event-processor', 'event-processor'],
  ['@sharpee/lang-en-us', 'lang-en-us'],
  ['@sharpee/parser-en-us', 'parser-en-us'],
  ['@sharpee/if-services', 'if-services'],
  ['@sharpee/channel-service', 'channel-service'],
  ['@sharpee/stdlib', 'stdlib'],
  ['@sharpee/character', 'character'],
  ['@sharpee/ext-basic-combat', 'extensions/basic-combat'],
  ['@sharpee/plugins', 'plugins'],
  ['@sharpee/plugin-npc', 'plugin-npc'],
  ['@sharpee/plugin-scheduler', 'plugin-scheduler'],
  ['@sharpee/plugin-state-machine', 'plugin-state-machine'],
  ['@sharpee/story-runtime-baseline', 'story-runtime-baseline'],
  ['@sharpee/ext-testing', 'extensions/testing'],
  ['@sharpee/engine', 'engine'],
  ['@sharpee/bootstrap', 'bootstrap'],
  ['@sharpee/platform-browser', 'platform-browser'],
  ['@sharpee/sharpee', 'sharpee'],
  ['@sharpee/transcript-tester', 'transcript-tester'],
  ['@sharpee/devkit', 'devkit'],
];

/**
 * esbuild `--alias:` entries for the CLI bundle (build.sh build_bundle, 587-604).
 * Order matches build.sh so the esbuild command is byte-identical.
 */
export const BUNDLE_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ['@sharpee/core', './packages/core/dist/index.js'],
  ['@sharpee/if-domain', './packages/if-domain/dist/index.js'],
  ['@sharpee/world-model', './packages/world-model/dist/index.js'],
  ['@sharpee/stdlib', './packages/stdlib/dist/index.js'],
  ['@sharpee/engine', './packages/engine/dist/index.js'],
  ['@sharpee/parser-en-us', './packages/parser-en-us/dist/index.js'],
  ['@sharpee/lang-en-us', './packages/lang-en-us/dist/index.js'],
  ['@sharpee/event-processor', './packages/event-processor/dist/index.js'],
  ['@sharpee/text-blocks', './packages/text-blocks/dist/index.js'],
  ['@sharpee/channel-service', './packages/channel-service/dist/index.js'],
  ['@sharpee/if-services', './packages/if-services/dist/index.js'],
  ['@sharpee/ext-basic-combat', './packages/extensions/basic-combat/dist/index.js'],
  ['@sharpee/plugins', './packages/plugins/dist/index.js'],
  ['@sharpee/plugin-npc', './packages/plugin-npc/dist/index.js'],
  ['@sharpee/plugin-scheduler', './packages/plugin-scheduler/dist/index.js'],
  ['@sharpee/plugin-state-machine', './packages/plugin-state-machine/dist/index.js'],
  ['@sharpee/bootstrap', './packages/bootstrap/dist/index.js'],
  ['@sharpee/transcript-tester', './packages/transcript-tester/dist/index.js'],
];

/** Hand-written CLI bundle declarations (build.sh build_bundle, 607-619) — verbatim. */
export const BUNDLE_DTS = `// Auto-generated Sharpee type declarations
export * from '../packages/core/dist/index';
export * from '../packages/if-domain/dist/index';
export * from '../packages/world-model/dist/index';
export * from '../packages/stdlib/dist/index';
export * from '../packages/engine/dist/index';
export * from '../packages/parser-en-us/dist/index';
export * from '../packages/lang-en-us/dist/index';
export * from '../packages/event-processor/dist/index';
export * from '../packages/text-blocks/dist/index';
export * from '../packages/channel-service/dist/index';
`;

/**
 * Walk up from `start` to the Sharpee monorepo root (the dir holding
 * pnpm-workspace.yaml AND packages/core — the monorepo signature, so an author's
 * coincidental pnpm workspace is not mistaken for it). Returns null if not found.
 */
export function findMonorepoRoot(start: string = process.cwd()): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(join(dir, 'packages', 'core'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The monorepo root, or throw. Use when an operation is monorepo-only.
 * @throws if not inside the Sharpee monorepo.
 */
export function findRepoRoot(start: string = process.cwd()): string {
  const root = findMonorepoRoot(start);
  if (!root) throw new Error(`not inside the Sharpee monorepo (no pnpm-workspace.yaml + packages/core above ${start})`);
  return root;
}

/**
 * 'monorepo' when run inside the Sharpee monorepo (build platform + bundle + in-repo
 * stories); 'standalone' when run in an author's own project (build their story via its
 * own toolchain). The location-aware split behind `sharpee build` (ADR-180 unify).
 */
export function detectMode(start: string = process.cwd()): 'monorepo' | 'standalone' {
  return findMonorepoRoot(start) ? 'monorepo' : 'standalone';
}

/**
 * Resolve the `tsf` executable. Prefers the workspace-local `node_modules/.bin/tsf`
 * (a bare `tsf` fails when tsf is only a shell alias / not on a non-interactive PATH);
 * falls back to `tsf` on PATH. Produces identical compiler output either way.
 */
export function tsfBin(root: string): string {
  const local = join(root, 'node_modules', '.bin', 'tsf');
  return existsSync(local) ? local : 'tsf';
}

/**
 * Resolve a story name to its directory (build.sh resolve_story_dir, 39-48):
 * `stories/<name>` then `tutorials/<name>`. Returns absolute path or null.
 */
export function resolveStoryDir(root: string, name: string): string | null {
  for (const base of ['stories', 'tutorials']) {
    const dir = join(root, base, name);
    if (existsSync(dir)) return dir;
  }
  return null;
}

/** The story version.ts path build.sh stamps (stories/<name> only — tutorials are NOT stamped). */
export function storyVersionFile(root: string, name: string): string {
  return join(root, 'stories', name, 'src', 'version.ts');
}

export interface ResolvedStory {
  /** Story slug (directory basename). */
  name: string;
  /** Absolute story directory. */
  dir: string;
  /** Workspace package name if the story is an in-repo workspace story; else null. */
  pkg: string | null;
  /** True iff dir is a direct child of <root>/stories or <root>/tutorials. */
  inRepo: boolean;
  /** True iff dir is under <root>/stories (build.sh stamps version.ts only for these). */
  underStories: boolean;
}

function classifyStory(root: string, dir: string): ResolvedStory {
  const name = basename(dir);
  const parent = dirname(dir);
  const underStories = parent === join(root, 'stories');
  const underTutorials = parent === join(root, 'tutorials');
  const inRepo = underStories || underTutorials;
  const pkg = underStories
    ? `@sharpee/story-${name}`
    : underTutorials
      ? `@sharpee/tutorial-${name}`
      : null;
  return { name, dir, pkg, inRepo, underStories };
}

/**
 * Resolve a story given either a **path** (a directory with a package.json, tried
 * relative to cwd then to root) or a bare **name** (stories/<name> then tutorials/<name>).
 * Returns null if neither resolves. This is the single resolver `build` + `stampVersions`
 * share, so path and name forms behave identically (ADR-180 Decision 4: a story is a location).
 */
export function resolveStory(root: string, nameOrPath: string): ResolvedStory | null {
  for (const dir of [resolve(nameOrPath), resolve(root, nameOrPath)]) {
    if (existsSync(dir) && existsSync(join(dir, 'package.json'))) return classifyStory(root, dir);
  }
  const byName = resolveStoryDir(root, nameOrPath);
  return byName ? classifyStory(root, byName) : null;
}

/** Read a package.json's `version` field. */
export function readVersion(pkgJsonPath: string): string {
  return JSON.parse(readFileSync(pkgJsonPath, 'utf8')).version;
}

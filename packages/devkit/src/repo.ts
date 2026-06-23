/**
 * repo.ts — monorepo detection + story resolution for the devkit author CLI.
 *
 * Owner context: @sharpee/devkit (ADR-180; ADR-187). Trimmed to resolution
 * helpers only — the platform-build config (PLATFORM_PACKAGES, BUNDLE_ALIASES,
 * BUNDLE_DTS, tsfBin) moved to repokit (tools/repokit), the in-repo platform
 * tool. devkit keeps just enough to redirect a workspace story to repokit and to
 * resolve a decoupled in-repo author project.
 *
 * Public interface: findMonorepoRoot(), findRepoRoot(), detectMode(),
 * resolveStoryDir(), resolveStory(), storyVersionFile(), readVersion().
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

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
  /** The story's real `package.json` name (the pnpm `--filter` target); null if absent. */
  pkg: string | null;
  /** True iff dir is a direct child of <root>/stories or <root>/tutorials. */
  inRepo: boolean;
  /** True iff dir is under <root>/stories (build.sh stamps version.ts only for these). */
  underStories: boolean;
  /**
   * True iff the story is a monorepo workspace member — detected by a `workspace:*`
   * dependency. A story with published (non-workspace) deps is a *decoupled*
   * standalone project that builds via its own toolchain even inside the repo
   * (e.g. the Family Zoo tutorial), so it is NOT built via `pnpm --filter`.
   */
  workspace: boolean;
}

function classifyStory(root: string, dir: string): ResolvedStory {
  const name = basename(dir);
  const parent = dirname(dir);
  const underStories = parent === join(root, 'stories');
  const underTutorials = parent === join(root, 'tutorials');
  const inRepo = underStories || underTutorials;

  // Read the story's real package.json: its `name` is the pnpm `--filter` target,
  // and any `workspace:*` dependency marks it as a workspace member. We no longer
  // derive a `@sharpee/{story,tutorial}-<name>` name from the path — a decoupled
  // tutorial names itself (e.g. `familyzoo`) and depends on published packages.
  let pkg: string | null = null;
  let workspace = false;
  try {
    const json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    pkg = typeof json.name === 'string' ? json.name : null;
    const deps = { ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}) };
    workspace =
      inRepo &&
      Object.values(deps).some((v) => typeof v === 'string' && v.startsWith('workspace:'));
  } catch {
    // No or invalid package.json — leave pkg null / workspace false.
  }

  return { name, dir, pkg, inRepo, underStories, workspace };
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

/**
 * registry.ts — the user-level story location registry at `~/.sharpee/devkit`
 * (ADR-180 Decision 4, amended: the verb is `register`, not `init`).
 *
 * A story is always referable by raw location; this registry is pure convenience —
 * it maps a name → an absolute path so a story (anywhere, incl. other repos) can be
 * referenced by name. Machine-level, git-ignored, rebuildable by re-running `register`.
 *
 * Format: { "stories": { "<name>": { "path": "<absolute path>" } } }
 *
 * Public interface: registryPath, readRegistry, registerStory, listStories, lookupStory.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';

export interface Registry {
  stories: Record<string, { path: string }>;
}

export interface RegistryEntry {
  name: string;
  path: string;
  /** true if the registered path no longer exists. */
  stale: boolean;
}

/** The registry file path (`~/.sharpee/devkit`; overridable via SHARPEE_DEVKIT_REGISTRY). */
export function registryPath(): string {
  return process.env.SHARPEE_DEVKIT_REGISTRY || resolve(homedir(), '.sharpee', 'devkit');
}

/** Read the registry, or an empty one if absent/unparseable. */
export function readRegistry(): Registry {
  const p = registryPath();
  if (!existsSync(p)) return { stories: {} };
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    return parsed && typeof parsed === 'object' && parsed.stories ? parsed : { stories: {} };
  } catch {
    return { stories: {} };
  }
}

function writeRegistry(reg: Registry): void {
  const p = registryPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(reg, null, 2) + '\n');
}

/**
 * Upsert a name→path mapping. Resolves `location` to an absolute path; the default
 * name is its basename. Returns the stored entry.
 * @throws if the location does not exist.
 */
export function registerStory(location: string, name?: string): { name: string; path: string } {
  const abs = resolve(location);
  if (!existsSync(abs)) throw new Error(`cannot register: path does not exist: ${abs}`);
  const storyName = name || basename(abs);
  const reg = readRegistry();
  reg.stories[storyName] = { path: abs };
  writeRegistry(reg);
  return { name: storyName, path: abs };
}

/** All registered stories, each flagged stale if its path no longer exists. */
export function listStories(): RegistryEntry[] {
  const reg = readRegistry();
  return Object.entries(reg.stories)
    .map(([name, { path }]) => ({ name, path, stale: !existsSync(path) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve a registered name to its absolute path.
 * @throws if the name is registered but its path no longer exists (stale, never silently skipped).
 * @returns the path, or null if the name is not registered.
 */
export function lookupStory(name: string): string | null {
  const entry = readRegistry().stories[name];
  if (!entry) return null;
  if (!existsSync(entry.path)) {
    throw new Error(`registered story '${name}' points at a missing path: ${entry.path} (re-run \`sharpee register\`)`);
  }
  return entry.path;
}

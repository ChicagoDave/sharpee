/**
 * Story module-cache purge (batch-run isolation) — pure, dependency-free.
 *
 * Kept separate from index.ts (which imports the whole platform) so it is
 * unit-testable in isolation, like resolve.ts. Only depends on node
 * path/fs/module.
 *
 * Owner context: build/test devkit layer (ADR-180).
 * Public interface: `purgeStoryModuleCache`.
 */
import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';

// All CJS requires share one module cache (Module._cache), so a createRequire
// anchor works identically to the ambient CJS `require` — the shim only exists
// because the ESM build (dist-esm) and vitest's ESM transform have no ambient
// `require`.
const nodeRequire: NodeRequire =
  typeof require === 'function' ? require : createRequire(path.join(process.cwd(), 'noop.js'));

/**
 * Evict every require-cached module under `storyRoot` so the next require
 * re-executes the story's modules from scratch.
 *
 * Invariant this protects: "load a fresh story" means fresh — story-module
 * state (module-level `let`s in daemons, mutable fields on a story class
 * instance) must not leak between loads. Without this, batch transcript runs
 * (many loadStory calls in one process) handed every engine the same cached
 * story instance and daemon state, while solo runs (fresh process) and chain
 * mode (deliberately shared game) behaved correctly.
 *
 * Platform packages resolve outside the story root, stay cached, and keep
 * class identity stable across loads.
 *
 * Never throws: a nonexistent root purges nothing (the caller's resolve step
 * raises the real error).
 *
 * @param storyRoot story directory (absolute, or resolved against cwd)
 */
export function purgeStoryModuleCache(storyRoot: string): void {
  const base = path.isAbsolute(storyRoot) ? storyRoot : path.resolve(process.cwd(), storyRoot);
  // require.cache keys are realpaths (Node resolves symlinks); match both the
  // raw and real root so pnpm-style symlinked layouts are covered.
  const roots = new Set<string>([base]);
  try {
    roots.add(fs.realpathSync(base));
  } catch {
    // Root may not exist (yet); nothing to purge under it.
  }
  const cache = nodeRequire.cache;
  for (const root of roots) {
    const prefix = root.endsWith(path.sep) ? root : root + path.sep;
    for (const key of Object.keys(cache)) {
      if (key.startsWith(prefix)) {
        delete cache[key];
      }
    }
  }
}

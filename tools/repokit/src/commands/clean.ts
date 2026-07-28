/**
 * clean.ts — `repokit clean`: build-artifact hygiene (ADR-187, ported from devkit).
 *
 * Removes the artifact classes that caused silent no-op builds (stale
 * .tsbuildinfo) and stale dist trees: each package's own `clean` script plus the
 * top-level bundle dir.
 *
 * Public interface: CleanCommand.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { findRepoRoot } from '../repo';
import { Command } from './command';

/** Trees that hold buildable projects. Nothing outside these is ever touched. */
const SWEPT_ROOTS = ['packages', 'tools', 'stories', 'tutorials'];

/** Never descended into: not ours, or nothing of interest inside. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-esm', '.git']);

/**
 * Delete every `*.tsbuildinfo` under the buildable trees and report the count.
 *
 * Scoped deliberately: only `*.tsbuildinfo`, only under SWEPT_ROOTS, never
 * inside node_modules, and never under `tools/repokit` — repokit must survive
 * its own clean, and re-emitting its incremental state would be a step toward
 * rebuilding the tool mid-run.
 *
 * @param root absolute repo root
 * @returns how many files were removed
 */
export function sweepBuildInfo(root: string): number {
  const repokitDir = join(root, 'tools', 'repokit');
  let removed = 0;

  const walk = (dir: string): void => {
    if (dir === repokitDir) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.tsbuildinfo')) {
        rmSync(join(dir, entry.name), { force: true });
        removed += 1;
      }
    }
  };

  for (const base of SWEPT_ROOTS) {
    const dir = join(root, base);
    if (existsSync(dir)) walk(dir);
  }
  return removed;
}

export class CleanCommand implements Command {
  readonly name = 'clean';
  readonly summary = 'Remove platform build artifacts (per-package + top-level dist/)';

  run(args: string[]): number {
    const quiet = args.includes('--quiet');
    const root = findRepoRoot();
    const log = (m: string) => !quiet && console.log(m);
    log('=== repokit clean ===');
    // Each package's clean removes dist/, dist-esm/, tsconfig.tsbuildinfo.
    //
    // repokit excludes ITSELF: a bare `pnpm -r run clean` deletes
    // tools/repokit/dist while this very process is running from it, so the
    // next `./repokit build` fails with "engine not built" and the tool can
    // only be recovered by hand. A build tool must survive its own clean.
    // Use `pnpm --filter @sharpee/repokit run clean` to clear repokit itself.
    execFileSync('pnpm', ['-r', '--if-present', '--filter', '!@sharpee/repokit', 'run', 'clean'], {
      cwd: root,
      stdio: quiet ? 'ignore' : 'inherit',
    });
    // Sweep EVERY *.tsbuildinfo, not just the one each package's clean names.
    //
    // The per-package scripts remove `tsconfig.tsbuildinfo` but leave
    // `tsconfig.esm.tsbuildinfo` behind. The ESM pass (`tsc -p
    // tsconfig.esm.json`) then reads that stale file, concludes it is up to
    // date, and emits NOTHING — dist-esm never comes back, silently, with a
    // zero exit code. Browser bundling resolves `@sharpee/*` through the
    // `import` condition, so the next `--browser` build dies with "Could not
    // resolve @sharpee/platform-browser". This is exactly the silent-no-op
    // class buildPlatform's dist/index.js invariant guards against, one
    // directory over.
    const sweptInfo = sweepBuildInfo(root);
    // Top-level bundle/client outputs are not owned by any package's clean.
    rmSync(join(root, 'dist'), { recursive: true, force: true });
    log(`clean: per-package artifacts + ${sweptInfo} tsbuildinfo + top-level dist/ removed`);
    return 0;
  }
}

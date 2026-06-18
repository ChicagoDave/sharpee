/**
 * clean.ts — `devkit clean`: build-artifact hygiene.
 *
 * Owner context: @sharpee/devkit (ADR-180 Phase 3d). Removes the artifact classes
 * that caused silent no-op builds (stale .tsbuildinfo) and stale dist trees, by
 * running each package's own `clean` script plus wiping the top-level bundle dir.
 *
 * Public interface: runClean(opts) -> void.
 */
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { findRepoRoot } from '../repo';

export interface CleanOptions {
  root?: string;
  quiet?: boolean;
}

/** Run every package's `clean` script, then remove the top-level `dist/`. */
export function runClean(opts: CleanOptions = {}): void {
  const root = opts.root ?? findRepoRoot();
  const log = (m: string) => !opts.quiet && console.log(m);
  log('=== devkit clean ===');
  // Each package's clean removes dist/, dist-esm/, tsconfig.tsbuildinfo (2026-06-17 fix).
  execFileSync('pnpm', ['-r', '--if-present', 'run', 'clean'], {
    cwd: root,
    stdio: opts.quiet ? 'ignore' : 'inherit',
  });
  // Top-level bundle/client outputs are not owned by any package's clean.
  rmSync(join(root, 'dist'), { recursive: true, force: true });
  log('clean: per-package artifacts + top-level dist/ removed');
}

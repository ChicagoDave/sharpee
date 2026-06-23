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
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { findRepoRoot } from '../repo';
import { Command } from './command';

export class CleanCommand implements Command {
  readonly name = 'clean';
  readonly summary = 'Remove platform build artifacts (per-package + top-level dist/)';

  run(args: string[]): number {
    const quiet = args.includes('--quiet');
    const root = findRepoRoot();
    const log = (m: string) => !quiet && console.log(m);
    log('=== repokit clean ===');
    // Each package's clean removes dist/, dist-esm/, tsconfig.tsbuildinfo.
    execFileSync('pnpm', ['-r', '--if-present', 'run', 'clean'], {
      cwd: root,
      stdio: quiet ? 'ignore' : 'inherit',
    });
    // Top-level bundle/client outputs are not owned by any package's clean.
    rmSync(join(root, 'dist'), { recursive: true, force: true });
    log('clean: per-package artifacts + top-level dist/ removed');
    return 0;
  }
}

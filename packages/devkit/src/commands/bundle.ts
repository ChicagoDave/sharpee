/**
 * bundle.ts — `devkit bundle`: assemble the CLI platform bundle `dist/cli/sharpee.js`
 * by running the exact esbuild command build.sh uses (build_bundle, 580-630).
 *
 * Owner context: @sharpee/devkit (ADR-180 Phase 3). Byte-for-byte parity with
 * build.sh is the contract — the esbuild flag list and alias order are verbatim.
 *
 * Public interface: runBundle(opts) -> void. Throws if the bundle is absent/empty
 * after esbuild (the no-silent-✓ invariant).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUNDLE_ALIASES, BUNDLE_DTS, findRepoRoot } from '../repo';

export interface BundleOptions {
  /** Monorepo root; defaults to the workspace above cwd. */
  root?: string;
  /** Suppress per-step logging. */
  quiet?: boolean;
}

/** Assemble dist/cli/sharpee.js + sharpee.d.ts. Assumes platform packages are built. */
export function runBundle(opts: BundleOptions = {}): void {
  const root = opts.root ?? findRepoRoot();
  const log = (m: string) => !opts.quiet && console.log(m);
  log('=== Bundling -> dist/cli/sharpee.js ===');

  mkdirSync(join(root, 'dist', 'cli'), { recursive: true });

  const args = [
    'esbuild',
    'scripts/bundle-entry.js',
    '--bundle',
    '--platform=node',
    '--target=node18',
    '--outfile=dist/cli/sharpee.js',
    '--external:readline',
    '--format=cjs',
    '--sourcemap',
    ...BUNDLE_ALIASES.map(([name, path]) => `--alias:${name}=${path}`),
  ];
  execFileSync('npx', args, { cwd: root, stdio: opts.quiet ? 'ignore' : 'inherit' });

  // Hand-written declarations (verbatim build.sh heredoc).
  writeFileSync(join(root, 'dist', 'cli', 'sharpee.d.ts'), BUNDLE_DTS);

  // Invariant: assert the artifact exists and is non-empty (no silent success on a no-op build).
  const out = join(root, 'dist', 'cli', 'sharpee.js');
  if (!existsSync(out) || statSync(out).size === 0) {
    throw new Error('bundle failed: dist/cli/sharpee.js is missing or empty after esbuild');
  }
  log(`bundle: dist/cli/sharpee.js (${statSync(out).size} bytes)`);
}

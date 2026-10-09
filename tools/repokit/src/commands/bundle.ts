/**
 * bundle.ts — `repokit bundle`: assemble the CLI platform bundle `dist/cli/sharpee.js`.
 *
 * Owner context: @sharpee/repokit (ADR-187 owns the CLI bundle; flag list inherited
 * from the retired build.sh build_bundle).
 *
 * Package resolution: esbuild resolves `@sharpee/*` the way Node does — through the
 * workspace links in the root node_modules and each package's `exports` map. Every
 * import in the CLI graph is a `require()`, so each package resolves to its CJS
 * `dist/` build. There is no hand-kept alias list; one went stale twice (GH #542).
 *
 * Public interface: runBundle(opts) -> void. Throws if the bundle is absent/empty
 * after esbuild (the no-silent-✓ invariant), or if a workspace package entered the
 * bundle from anywhere but its CJS dist/ (see findResolutionViolations).
 * findResolutionViolations(bundleText) -> string[].
 */
import { runTool } from '../proc';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUNDLE_DTS, findRepoRoot } from '../repo';

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
  ];
  runTool('npx', args, { cwd: root, stdio: opts.quiet ? 'ignore' : 'inherit' });

  // Hand-written declarations (verbatim build.sh heredoc).
  writeFileSync(join(root, 'dist', 'cli', 'sharpee.d.ts'), BUNDLE_DTS);

  // Invariant: assert the artifact exists and is non-empty (no silent success on a no-op build).
  const out = join(root, 'dist', 'cli', 'sharpee.js');
  if (!existsSync(out) || statSync(out).size === 0) {
    throw new Error('bundle failed: dist/cli/sharpee.js is missing or empty after esbuild');
  }
  const violations = findResolutionViolations(readFileSync(out, 'utf-8'));
  if (violations.length > 0) {
    throw new Error(
      'bundle invariant violated: workspace packages must enter the bundle only from their ' +
        'CJS dist/ build, once each. Offending modules:\n  ' +
        violations.join('\n  '),
    );
  }
  log(`bundle: dist/cli/sharpee.js (${statSync(out).size} bytes)`);
}

/**
 * List the bundled modules that break the one-CJS-copy rule for workspace packages.
 * esbuild heads each module with a `// <path>` comment; a workspace module must sit
 * under `packages/<...>/dist/`. A `dist-esm/` or `src/` path means a second copy of a
 * package (the dual-package hazard: two registries, two instanceof identities), and
 * an `@sharpee` path under node_modules means a published copy displaced the
 * workspace one.
 *
 * @param bundleText the emitted dist/cli/sharpee.js
 * @returns the offending module paths, empty when the bundle is sound
 */
export function findResolutionViolations(bundleText: string): string[] {
  const violations: string[] = [];
  for (const match of bundleText.matchAll(/^\/\/ ((?:packages|node_modules)\/\S+)$/gm)) {
    const path = match[1];
    const strayWorkspaceModule = path.startsWith('packages/') && !/\/dist\//.test(path);
    const publishedCopy = path.startsWith('node_modules/') && path.includes('@sharpee');
    if (strayWorkspaceModule || publishedCopy) violations.push(path);
  }
  return violations;
}

// --- repokit Command wrapper (ADR-187) ---
import { Command } from './command';

export class BundleCommand implements Command {
  readonly name = 'bundle';
  readonly summary = 'Build the CLI bundle (dist/cli/sharpee.js)';
  run(args: string[]): number {
    runBundle({ quiet: args.includes('--quiet') });
    return 0;
  }
}

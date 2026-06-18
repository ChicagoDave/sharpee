/**
 * consumer-gen.ts — generate a consumer `package.json` that installs a story's
 * `@sharpee/*` closure either from the local `tsf build --npm` staging (tarballs)
 * or from the registry (version refs).
 *
 * Owner context: @sharpee/devkit `test:npm` command (ADR-180 Phase 2). This is the
 * single, drift-free replacement for the hand-listed dep arrays in npm-test/ and
 * npm-test-dungeo/ and the standalone gen-consumer.mjs in npm-test-familyzoo/.
 *
 * Public interface:
 *   scanStaging(stagingDir)                  -> name->dir map of @sharpee packages
 *   readSharpeeSeed(storyPkgPath)            -> story's direct @sharpee deps
 *   computeClosure(seed, depsOf)             -> full transitive @sharpee set (pure)
 *   generateConsumer(opts)                   -> writes package.json (+ tarballs for local)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SHARPEE = '@sharpee/';
/** transcript-tester supplies the `transcript-test` bin (dev-only). */
const TT = '@sharpee/transcript-tester';

export type StagingMap = Record<string, string>;

/**
 * Map `@sharpee/<x>` package name -> its staging subdirectory. The directory name
 * is not assumed to equal the short package name, so each package.json is read.
 * @throws if stagingDir does not exist.
 */
export function scanStaging(stagingDir: string): StagingMap {
  if (!existsSync(stagingDir)) {
    throw new Error(`local npm staging not found at ${stagingDir} — run \`tsf build --npm\` first`);
  }
  const map: StagingMap = {};
  for (const d of readdirSync(stagingDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const pj = join(stagingDir, d.name, 'package.json');
    if (!existsSync(pj)) continue;
    const p = JSON.parse(readFileSync(pj, 'utf8'));
    if (typeof p.name === 'string' && p.name.startsWith(SHARPEE)) map[p.name] = d.name;
  }
  return map;
}

/** The story's directly-declared `@sharpee/*` dependencies (the closure seed). */
export function readSharpeeSeed(storyPkgPath: string): string[] {
  const pkg = JSON.parse(readFileSync(storyPkgPath, 'utf8'));
  return Object.keys(pkg.dependencies || {}).filter((n) => n.startsWith(SHARPEE));
}

/**
 * Transitive closure over `@sharpee/*` deps. Pure: `depsOf(name)` returns the
 * `@sharpee/*` deps of `name`. Returns every reachable package including the seed.
 */
export function computeClosure(seed: string[], depsOf: (name: string) => string[]): Set<string> {
  const closure = new Set<string>();
  const stack = [...seed];
  while (stack.length) {
    const n = stack.pop()!;
    if (closure.has(n)) continue;
    closure.add(n);
    for (const d of depsOf(n)) if (!closure.has(d)) stack.push(d);
  }
  return closure;
}

/** `depsOf` backed by the staging map — only deps present in staging are followed. */
export function stagingDepsOf(stagingDir: string, staging: StagingMap, name: string): string[] {
  const dir = staging[name];
  if (!dir) return [];
  const p = JSON.parse(readFileSync(join(stagingDir, dir, 'package.json'), 'utf8'));
  return Object.keys(p.dependencies || {}).filter((n) => n.startsWith(SHARPEE) && staging[n]);
}

export interface GenerateConsumerOptions {
  /** 'local' packs the full closure as tarballs from staging; 'registry' declares seed deps. */
  mode: 'local' | 'registry';
  /** Path to the story's package.json (source of the seed deps). */
  storyPkgPath: string;
  /** `~/.tsf-publish/sharpee` — the `tsf build --npm` output (local mode only). */
  stagingDir: string;
  /** Directory to write tarballs into (local mode only). */
  vendorDir: string;
  /** Where the generated consumer package.json is written. */
  outPkgPath: string;
  /** Registry version/range for `@sharpee/*` deps in registry mode (default 'latest'). */
  registryVersion?: string;
}

export interface GenerateConsumerResult {
  /** Packages written as runtime deps (full closure in local mode; seed in registry mode). */
  closure: string[];
  /** true if transcript-tester is available as a dev dep (always true in registry mode). */
  haveTranscriptTester: boolean;
}

/**
 * Generate the consumer package.json.
 *
 * Local mode packs the story's **full transitive `@sharpee` closure** into tarballs
 * and `file:`-refs them — required because `file:` deps do not resolve their own
 * `@sharpee` deps from anywhere. Registry mode declares only the story's **seed**
 * `@sharpee` deps and lets npm resolve transitive deps from the registry, exactly
 * as a real consumer install would (avoids staging-vs-registry graph divergence).
 *
 * @throws (local mode) if any seed dep is absent from the local staging.
 */
export function generateConsumer(opts: GenerateConsumerOptions): GenerateConsumerResult {
  const { mode, storyPkgPath, vendorDir, outPkgPath } = opts;
  const seed = readSharpeeSeed(storyPkgPath);

  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = { typescript: '^5.0.0' };
  let written: string[];
  let haveTT: boolean;

  if (mode === 'local') {
    const staging = scanStaging(opts.stagingDir);
    const missing = seed.filter((n) => !staging[n]);
    if (missing.length) {
      throw new Error(
        `story deps absent from local staging: ${missing.join(', ')} — run \`tsf build --npm\` first`,
      );
    }
    const pack = (name: string): string => {
      const dir = join(opts.stagingDir, staging[name]);
      const out = execFileSync(
        'npm',
        ['pack', dir, '--pack-destination', vendorDir, '--ignore-scripts', '--json'],
        { encoding: 'utf8' },
      );
      return JSON.parse(out)[0].filename;
    };
    written = [...computeClosure(seed, (n) => stagingDepsOf(opts.stagingDir, staging, n))].sort();
    for (const n of written) dependencies[n] = `file:vendor/${pack(n)}`;
    haveTT = Boolean(staging[TT]);
    if (haveTT) devDependencies[TT] = `file:vendor/${pack(TT)}`;
  } else {
    const version = opts.registryVersion || 'latest';
    written = [...seed].sort();
    for (const n of written) dependencies[n] = version;
    haveTT = true; // transcript-tester is published; npm resolves it from the registry
    devDependencies[TT] = version;
  }

  writeFileSync(
    outPkgPath,
    JSON.stringify(
      {
        name: 'sharpee-devkit-consumer',
        version: '1.0.0',
        private: true,
        description: `devkit test:npm consumer (${mode})`,
        main: 'dist/index.js',
        dependencies,
        devDependencies,
      },
      null,
      2,
    ) + '\n',
  );

  return { closure: written, haveTranscriptTester: haveTT };
}

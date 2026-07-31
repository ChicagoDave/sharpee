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
 *   declaredSharpeeDeps(dir, staging, name)  -> a staged package's declared @sharpee deps
 *   stagingDepsOf(dir, staging, name)        -> the subset of those that are staged
 *   assertVendoredClosureComplete(v, depsOf) -> throws on an unvendored @sharpee dep (pure)
 *   packFilenameFrom(stdout, packageName)    -> tarball filename from `npm pack --json` (pure)
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

/**
 * Every `@sharpee/*` dependency a staged package declares — including ones that are
 * **not** themselves staged. Used to detect vendoring gaps; the closure walk uses
 * `stagingDepsOf` instead.
 */
export function declaredSharpeeDeps(
  stagingDir: string,
  staging: StagingMap,
  name: string,
): string[] {
  const dir = staging[name];
  if (!dir) return [];
  const p = JSON.parse(readFileSync(join(stagingDir, dir, 'package.json'), 'utf8'));
  return Object.keys(p.dependencies || {}).filter((n) => n.startsWith(SHARPEE));
}

/** `depsOf` backed by the staging map — only deps present in staging are followed. */
export function stagingDepsOf(stagingDir: string, staging: StagingMap, name: string): string[] {
  return declaredSharpeeDeps(stagingDir, staging, name).filter((n) => staging[n]);
}

/**
 * Assert that every `@sharpee/*` dep declared by a vendored package is itself vendored.
 *
 * A `file:` tarball resolves none of its own `@sharpee` deps, so any gap silently falls
 * through to the public registry — a different, older build — and surfaces far downstream
 * as an `npm install` `ETARGET` rather than as a generation error (#201). Pure; call it
 * before packing so a gap costs nothing.
 *
 * @param vendored Every package that will be `file:`-referenced, runtime and dev alike.
 * @param declaredOf Declared `@sharpee` deps of a package, staged or not.
 * @throws naming each missing package and the vendored package that requires it.
 */
export function assertVendoredClosureComplete(
  vendored: string[],
  declaredOf: (name: string) => string[],
): void {
  const have = new Set(vendored);
  const gaps = vendored.flatMap((n) =>
    declaredOf(n)
      .filter((d) => !have.has(d))
      .map((d) => `${d} (required by ${n})`),
  );
  if (gaps.length) {
    throw new Error(
      `@sharpee deps absent from local staging, so npm would resolve them from the registry ` +
        `instead of the tarballs: ${gaps.join(', ')} — run \`tsf build --npm\` first`,
    );
  }
}

/**
 * Extract the produced tarball filename from `npm pack --json` stdout.
 *
 * The output shape is npm-major-dependent and both are accepted here:
 *   - npm <= 11 emits an **array** of pack results — `[{ filename, ... }]`
 *   - npm 12 emits an **object keyed by package name** — `{ "@sharpee/core": { filename, ... } }`
 *
 * Only the first entry is read: each call packs exactly one directory.
 *
 * @param stdout Raw stdout from `npm pack --json`.
 * @param packageName Package being packed — named in the error so a shape change is diagnosable.
 * @returns The tarball filename written into the pack destination.
 * @throws if stdout is not valid JSON, or if neither shape yields a `filename`.
 */
export function packFilenameFrom(stdout: string, packageName: string): string {
  const fail = (why: string): never => {
    throw new Error(`npm pack --json: ${why} for ${packageName}`);
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return fail(`output was not valid JSON (got ${JSON.stringify(stdout.slice(0, 120))})`);
  }

  const entry = Array.isArray(parsed)
    ? parsed[0]
    : parsed && typeof parsed === 'object'
      ? Object.values(parsed as Record<string, unknown>)[0]
      : undefined;

  const filename = (entry as { filename?: unknown } | undefined)?.filename;
  if (typeof filename !== 'string' || !filename) {
    return fail('unexpected output shape — no entry with a filename');
  }
  return filename;
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
  /**
   * Packages vendored solely to satisfy transcript-tester's own `@sharpee` deps — those
   * its closure reaches that the runtime closure does not. Local mode only; empty in
   * registry mode, where npm resolves transitive deps itself.
   */
  devClosure: string[];
  /** true if transcript-tester is available as a dev dep (always true in registry mode). */
  haveTranscriptTester: boolean;
}

/**
 * Generate the consumer package.json.
 *
 * Local mode packs the story's **full transitive `@sharpee` closure** into tarballs
 * and `file:`-refs them — required because `file:` deps do not resolve their own
 * `@sharpee` deps from anywhere. That same reasoning applies to the dev dep, so
 * transcript-tester's closure is vendored too; whatever it reaches beyond the runtime
 * closure lands in `devDependencies` rather than overstating the story's runtime
 * surface (#201). Registry mode declares only the story's **seed** `@sharpee` deps and
 * lets npm resolve transitive deps from the registry, exactly as a real consumer
 * install would (avoids staging-vs-registry graph divergence).
 *
 * @throws (local mode) if any seed dep is absent from the local staging, or if any
 *   vendored package declares an `@sharpee` dep that is not itself vendored.
 */
export function generateConsumer(opts: GenerateConsumerOptions): GenerateConsumerResult {
  const { mode, storyPkgPath, vendorDir, outPkgPath } = opts;
  const seed = readSharpeeSeed(storyPkgPath);

  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = { typescript: '^5.0.0' };
  let written: string[];
  let devOnly: string[] = [];
  let haveTT: boolean;

  if (mode === 'local') {
    const staging = scanStaging(opts.stagingDir);
    const missing = seed.filter((n) => !staging[n]);
    if (missing.length) {
      throw new Error(
        `story deps absent from local staging: ${missing.join(', ')} — run \`tsf build --npm\` first`,
      );
    }
    // Memoized: a package reachable from both the runtime and the dev closure is
    // packed once, not twice.
    const packed = new Map<string, string>();
    const pack = (name: string): string => {
      const cached = packed.get(name);
      if (cached !== undefined) return cached;
      const dir = join(opts.stagingDir, staging[name]);
      const out = execFileSync(
        'npm',
        ['pack', dir, '--pack-destination', vendorDir, '--ignore-scripts', '--json'],
        { encoding: 'utf8' },
      );
      const filename = packFilenameFrom(out, name);
      packed.set(name, filename);
      return filename;
    };

    const depsOf = (n: string) => stagingDepsOf(opts.stagingDir, staging, n);
    written = [...computeClosure(seed, depsOf)].sort();
    haveTT = Boolean(staging[TT]);

    // transcript-tester gets the same closure treatment as the runtime seed: its own
    // `@sharpee` deps resolve from nowhere once it is a `file:` tarball, so anything
    // the runtime closure misses (bootstrap, for every story) must be vendored here.
    const runtime = new Set(written);
    devOnly = haveTT
      ? [...computeClosure([TT], depsOf)].filter((n) => n !== TT && !runtime.has(n)).sort()
      : [];

    // Before packing: a gap here is an `npm install` ETARGET much later (#201).
    assertVendoredClosureComplete(
      [...written, ...devOnly, ...(haveTT ? [TT] : [])],
      (n) => declaredSharpeeDeps(opts.stagingDir, staging, n),
    );

    for (const n of written) dependencies[n] = `file:vendor/${pack(n)}`;
    for (const n of devOnly) devDependencies[n] = `file:vendor/${pack(n)}`;
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

  return { closure: written, devClosure: devOnly, haveTranscriptTester: haveTT };
}

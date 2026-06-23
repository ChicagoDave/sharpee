/**
 * test-npm.ts — `devkit test:npm <location>`: stand up an isolated consumer
 * project for a story, install its `@sharpee/*` closure (local staging tarballs
 * or registry), compile it, and run its transcripts.
 *
 * Owner context: @sharpee/devkit (ADR-180 Phase 2). One parameterized command that
 * replaces npm-test/, npm-test-dungeo/, and npm-test-familyzoo/ (AC-4).
 *
 * Public interface: runTestNpm(opts) -> TestNpmResult. The CLI maps the result to
 * an exit code; tests assert on the returned counts.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { basename, join } from 'node:path';
import { generateConsumer } from '../consumer-gen';

/** Default staging dir written by `tsf build --npm`. */
export const DEFAULT_STAGING = join(homedir(), '.tsf-publish', 'sharpee');

/** Story source files that are platform/UI entry points, never part of an npm consumer build. */
const EXCLUDED_SRC = ['browser-entry.ts', 'react-entry.tsx'];

/** The generated consumer tsconfig (inlined — it is a generated artifact, never edited). */
const CONSUMER_TSCONFIG = {
  compilerOptions: {
    target: 'ES2022',
    module: 'CommonJS',
    moduleResolution: 'node',
    lib: ['ES2022', 'DOM'],
    outDir: 'dist',
    rootDir: 'src',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    declaration: false,
    sourceMap: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist', 'src/browser-entry.ts', 'src/react-entry.tsx', 'src/**/*.test.ts'],
};

export interface TestNpmOptions {
  /** Story location (a directory containing package.json + src/). */
  location: string;
  /** 'local' (default) packs ~/.tsf-publish tarballs; 'registry' installs published versions. */
  mode?: 'local' | 'registry';
  /** Override the staging dir (local mode). Defaults to ~/.tsf-publish/sharpee. */
  stagingDir?: string;
  /** Glob of transcripts relative to location (default `tests/transcripts/*.transcript`). */
  transcripts?: string;
  /** Run transcripts as one stateful chain (dungeo walkthroughs) instead of per-file. */
  chain?: boolean;
  /** Compile only; skip transcript execution. */
  quick?: boolean;
  /** Registry version/range for @sharpee deps (registry mode; default 'latest'). */
  registryVersion?: string;
  /** Keep the temp dir for debugging (default false). */
  keep?: boolean;
}

export interface TestNpmResult {
  passed: number;
  failed: number;
  failures: string[];
  /** false when --quick (compilation only). */
  ran: boolean;
}

/**
 * Expand a `dir/<glob>` pattern (single `*` wildcard in the filename) against
 * `location`. Returns absolute paths sorted by name.
 */
function expandGlob(location: string, pattern: string): string[] {
  const slash = pattern.lastIndexOf('/');
  const dir = slash >= 0 ? pattern.slice(0, slash) : '.';
  const filePat = slash >= 0 ? pattern.slice(slash + 1) : pattern;
  const abs = join(location, dir);
  if (!existsSync(abs)) return [];
  const re = new RegExp('^' + filePat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  return readdirSync(abs)
    .filter((f) => re.test(f))
    .sort()
    .map((f) => join(abs, f));
}

/**
 * Stand up the consumer, install, compile, and run the story's transcripts.
 * @throws if the location is not a story (no package.json or no src/), or if
 *         install/compile fails.
 */
export function runTestNpm(opts: TestNpmOptions): TestNpmResult {
  const { location } = opts;
  const mode = opts.mode ?? 'local';
  const stagingDir = opts.stagingDir ?? DEFAULT_STAGING;
  const transcriptGlob = opts.transcripts ?? 'tests/transcripts/*.transcript';

  const storyPkgPath = join(location, 'package.json');
  if (!existsSync(storyPkgPath)) throw new Error(`no package.json at story location: ${location}`);
  if (!existsSync(join(location, 'src'))) throw new Error(`no src/ at story location: ${location}`);

  const tmp = mkdtempSync(join(tmpdir(), 'devkit-npm-'));
  const log = (m: string) => console.log(m);
  try {
    log(`=== devkit test:npm — ${basename(location)} (${mode}) ===`);
    log(`temp: ${tmp}`);

    // 1. Generate the consumer package.json (+ vendor tarballs for local mode).
    const vendor = join(tmp, 'vendor');
    mkdirSync(vendor, { recursive: true });
    const { closure, haveTranscriptTester } = generateConsumer({
      mode,
      storyPkgPath,
      stagingDir,
      vendorDir: vendor,
      outPkgPath: join(tmp, 'package.json'),
      registryVersion: opts.registryVersion,
    });
    log(`closure (${closure.length}): ${closure.map((n) => n.replace('@sharpee/', '')).join(', ')}`);
    if (!haveTranscriptTester) {
      throw new Error('@sharpee/transcript-tester missing from staging — cannot run transcripts');
    }

    // 2. Copy story src (minus platform entry points) + tsconfig.
    cpSync(join(location, 'src'), join(tmp, 'src'), { recursive: true });
    for (const f of EXCLUDED_SRC) rmSync(join(tmp, 'src', f), { force: true });
    writeFileSync(join(tmp, 'tsconfig.json'), JSON.stringify(CONSUMER_TSCONFIG, null, 2) + '\n');

    // 3. Copy transcripts.
    const transcripts = expandGlob(location, transcriptGlob);
    if (!opts.quick && transcripts.length === 0) {
      throw new Error(`no transcripts matched '${transcriptGlob}' under ${location}`);
    }
    const tDir = join(tmp, 'transcripts');
    mkdirSync(tDir, { recursive: true });
    for (const t of transcripts) cpSync(t, join(tDir, basename(t)));

    // 4. Install + compile.
    const run = (cmd: string, args: string[]) =>
      execFileSync(cmd, args, { cwd: tmp, stdio: 'inherit' });
    log('--- npm install ---');
    run('npm', ['install', '--no-fund', '--no-audit']);
    log('--- tsc ---');
    run('npx', ['tsc']);

    if (opts.quick) {
      log('compile-only (--quick) — OK');
      return { passed: 0, failed: 0, failures: [], ran: false };
    }

    // 5. Run transcripts (chain = one stateful invocation; else per-file count).
    log('--- transcripts ---');
    const rel = transcripts.map((t) => join('transcripts', basename(t)));
    if (opts.chain) {
      try {
        run('npx', ['transcript-test', '.', '--chain', ...rel]);
        return { passed: transcripts.length, failed: 0, failures: [], ran: true };
      } catch {
        return { passed: 0, failed: transcripts.length, failures: ['chain'], ran: true };
      }
    }
    let passed = 0;
    const failures: string[] = [];
    for (const r of rel) {
      try {
        run('npx', ['transcript-test', '.', r]);
        passed++;
      } catch {
        failures.push(basename(r, '.transcript'));
      }
    }
    return { passed, failed: failures.length, failures, ran: true };
  } finally {
    if (opts.keep) {
      console.log(`(kept temp dir: ${tmp})`);
    } else {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
}

// --- repokit Command wrapper (ADR-187) ---
import { Command } from './command';
import { lookupStory } from '../registry';

/** Parse the `test:npm` flags after the positional <location>. */
function parseTestNpmArgs(args: string[]): TestNpmOptions {
  const opts: TestNpmOptions = { location: '' };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--local') opts.mode = 'local';
    else if (a === '--registry') opts.mode = 'registry';
    else if (a === '--chain') opts.chain = true;
    else if (a === '--quick') opts.quick = true;
    else if (a === '--keep') opts.keep = true;
    else if (a === '--version') opts.registryVersion = args[++i];
    else if (a === '--staging') opts.stagingDir = args[++i];
    else if (a === '--transcripts') opts.transcripts = args[++i];
    else if (a.startsWith('-')) throw new Error(`unknown option: ${a}`);
    else if (!opts.location) opts.location = a;
    else throw new Error(`unexpected argument: ${a}`);
    i++;
  }
  if (!opts.location) throw new Error('test:npm requires a story <location>');
  return opts;
}

export class TestNpmCommand implements Command {
  readonly name = 'test:npm';
  readonly summary = 'npm consumer test over a location';
  run(args: string[]): number {
    const opts = parseTestNpmArgs(args);
    // Resolve a registered story name → its path (so `test:npm <name>` works).
    if (!existsSync(opts.location)) opts.location = lookupStory(opts.location) ?? opts.location;
    const r = runTestNpm(opts);
    if (!r.ran) return 0;
    console.log('===========================================');
    console.log(`  RESULTS: ${r.passed} passing, ${r.failed} failures`);
    console.log('===========================================');
    if (r.failed > 0) {
      console.log('Failures: ' + r.failures.join(', '));
      return 1;
    }
    return 0;
  }
}

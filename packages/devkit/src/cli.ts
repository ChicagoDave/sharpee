#!/usr/bin/env node
/**
 * cli.ts — the `sharpee` command (ADR-180; engine package @sharpee/devkit).
 *
 * Owner context: the single Sharpee build/test/scaffold CLI. `build` is
 * **location-aware** — inside the monorepo it builds platform + bundle + in-repo
 * stories; in a standalone author project it builds that project's story via its
 * own toolchain (+ .sharpee + browser).
 *
 * Public interface: process argv -> subcommand dispatch -> process exit code.
 */
import { runTestNpm, TestNpmOptions } from './commands/test-npm';
import { runBuild, BuildOptions } from './commands/build';
import { runBundle } from './commands/bundle';
import { runClean } from './commands/clean';
import { runVerify } from './commands/verify';
import { detectMode } from './repo';
// Standalone (author-project) commands, absorbed from the former @sharpee/sharpee CLI.
import { runBuildCommand } from './standalone/build';
import { runBuildBrowserCommand } from './standalone/build-browser';
import { runInitCommand } from './standalone/init';
import { runInitBrowserCommand } from './standalone/init-browser';
import { runIfidCommand } from './standalone/ifid';
import { runRegister, runList } from './commands/register';
import { lookupStory } from './registry';
import { existsSync } from 'node:fs';

const USAGE = `sharpee — Interactive Fiction build/test/scaffold CLI (ADR-180)

Usage:
  sharpee build [story|path] [options]   Build a story (location-aware: monorepo vs standalone)
  sharpee build-browser [options]        Build the browser client only
  sharpee init <name>                    Scaffold a new story project
  sharpee init-browser                   Add a browser client to the current project
  sharpee ifid                           IFID utilities (generate, validate)
  sharpee bundle                         (monorepo) Assemble dist/cli/sharpee.js
  sharpee clean                          Remove build artifacts (dist, dist-esm, tsbuildinfo)
  sharpee verify                         tsf build --npm + publish dry-run
  sharpee test:npm <loc|name> [options]  Stand up an npm consumer for a story and run its transcripts
  sharpee register <location> [--name]   Register a name→path mapping in ~/.sharpee/devkit
  sharpee list                           List registered stories

build (monorepo) options:
  [story|path]            In-repo story name or path (stories/<n>, tutorials/<n>, or a directory)
  --browser               Also build the self-contained browser client (dist/web/<story>/)
  --zifmia                Also build the zifmia multi-user server (tools/zifmia/dist/)
  --skip <pkg>            Resume the platform build from this package short-name
  --version <v> | --build-date <iso> | --no-version | --no-genai | --no-bundle | --esm

build (standalone, in an author project): compiles src/ + emits the .sharpee bundle and
  browser client. --test also runs the project's transcripts.

test:npm options:
  --local [default] | --registry | --version <range> | --staging <dir>
  --transcripts <glob> | --chain | --quick | --keep

Reserved (later): test, play, bundle:story`;

/** Parse the monorepo `build` flags (positional [story] + options). */
function parseBuild(args: string[]): BuildOptions {
  const opts: BuildOptions = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--skip') opts.skipTo = args[++i];
    else if (a === '--version') opts.version = args[++i];
    else if (a === '--build-date') opts.buildDate = args[++i];
    else if (a === '--no-version') opts.noVersion = true;
    else if (a === '--no-genai') opts.noGenai = true;
    else if (a === '--no-bundle') opts.bundle = false;
    else if (a === '--esm') opts.esm = true;
    else if (a === '--browser') opts.browser = true;
    else if (a === '--zifmia') opts.zifmia = true;
    else if (a.startsWith('-')) throw new Error(`unknown option: ${a}`);
    else if (!opts.story) opts.story = a;
    else throw new Error(`unexpected argument: ${a}`);
    i++;
  }
  return opts;
}

/** Parse the `test:npm` flags after the positional <location>. */
function parseTestNpm(args: string[]): TestNpmOptions {
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

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(USAGE);
    return command && command !== 'help' ? 1 : 0;
  }

  switch (command) {
    case 'build': {
      if (detectMode() === 'monorepo') {
        runBuild(parseBuild(rest));
        return 0;
      }
      // Standalone: build the cwd project, or a registered story by name.
      const positional = rest.find((a) => !a.startsWith('-'));
      const flags = rest.filter((a) => a !== positional);
      let dir: string | undefined;
      if (positional) {
        dir = lookupStory(positional) ?? undefined; // throws if registered-but-stale
        if (!dir) {
          throw new Error(
            `'${positional}' is not a registered story — run \`sharpee register <location>\`, or run \`sharpee build\` from the project directory`,
          );
        }
      }
      if (flags.includes('--browser')) await runBuildBrowserCommand(flags.filter((a) => a !== '--browser'), dir);
      else await runBuildCommand(flags, dir);
      return 0;
    }
    case 'build-browser': {
      if (detectMode() === 'monorepo') runBuild({ ...parseBuild(rest), browser: true });
      else await runBuildBrowserCommand(rest);
      return 0;
    }
    case 'init':
      await runInitCommand(rest);
      return 0;
    case 'init-browser':
      await runInitBrowserCommand(rest);
      return 0;
    case 'ifid':
      runIfidCommand(rest);
      return 0;
    case 'bundle':
      runBundle({});
      return 0;
    case 'clean':
      runClean({});
      return 0;
    case 'verify':
      runVerify({});
      return 0;
    case 'test:npm': {
      const opts = parseTestNpm(rest);
      // Resolve a registered story name → its path (so `test:npm <name>` works; ADR AC-3).
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
    case 'register':
      runRegister(rest);
      return 0;
    case 'list':
      runList();
      return 0;
    case 'test':
    case 'play':
      console.error(`sharpee ${command}: not yet implemented`);
      return 2;
    default:
      console.error(`unknown command: ${command}\n`);
      console.log(USAGE);
      return 2;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('sharpee: ' + (err instanceof Error ? err.message : String(err)));
    process.exit(2);
  });

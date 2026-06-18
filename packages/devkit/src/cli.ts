#!/usr/bin/env node
/**
 * cli.ts — `devkit` command-line entry (ADR-180).
 *
 * Owner context: @sharpee/devkit. Phase 2 implements `test:npm`; build/bundle/test/
 * verify/clean/init/list are reserved (Phase 3) and report "not yet implemented".
 *
 * Public interface: process argv -> subcommand dispatch -> process exit code.
 */
import { runTestNpm, TestNpmOptions } from './commands/test-npm';

const USAGE = `devkit — Sharpee build/test/verify orchestration (ADR-180)

Usage:
  devkit test:npm <location> [options]   Stand up an npm consumer for a story and run its transcripts

test:npm options:
  --local                 Install the @sharpee closure from local staging (~/.tsf-publish) [default]
  --registry              Install published @sharpee packages from the npm registry
  --version <range>       Registry version/range for @sharpee deps (default: latest)
  --staging <dir>         Override the local staging dir
  --transcripts <glob>    Transcripts relative to <location> (default: tests/transcripts/*.transcript)
  --chain                 Run transcripts as one stateful chain (e.g. dungeo walkthroughs)
  --quick                 Compile only; skip transcript execution
  --keep                  Keep the temp consumer dir for debugging

Reserved (Phase 3): build, bundle, test, play, verify, clean, init, list`;

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

function main(argv: string[]): number {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    return command ? 0 : 1;
  }

  switch (command) {
    case 'test:npm': {
      const opts = parseTestNpm(rest);
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
    case 'build':
    case 'bundle':
    case 'test':
    case 'play':
    case 'verify':
    case 'clean':
    case 'init':
    case 'list':
      console.error(`devkit ${command}: not yet implemented (ADR-180 Phase 3)`);
      return 2;
    default:
      console.error(`unknown command: ${command}\n`);
      console.log(USAGE);
      return 2;
  }
}

try {
  process.exit(main(process.argv.slice(2)));
} catch (err) {
  console.error('devkit: ' + (err instanceof Error ? err.message : String(err)));
  process.exit(2);
}

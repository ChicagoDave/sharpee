/**
 * test.ts — `sharpee test`: run an author project's transcript tests.
 *
 * Author-side counterpart of the platform bundle's `--test` (ADR-187 R1:
 * both tools carry a test command, each its own implementation). Resolves
 * the project (cwd, a registered name, a directory, or a `.story` file —
 * ADR-277 D1: the file's containing folder is the project), finds its
 * transcripts (`tests/` subtree; under `--chain` with no explicit files,
 * the `walkthroughs/` chain in filename order — ADR-277 D3), loads the
 * story through the shared author-game loader (Chord `.story` or module
 * story), and drives @sharpee/transcript-tester's real runner/reporter.
 * With `--json`, emits the ADR-277 D1 NDJSON record stream on stdout
 * instead of the human reporter; a validation- or load-failed transcript
 * is a `status: 'error'` record in both modes, never a silent skip.
 *
 * Public interface: runTestCommand(rest) → process exit code.
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import type {
  TestableGame,
  Transcript,
  TranscriptResult,
} from '@sharpee/transcript-tester';
import { loadAuthorGame } from '../standalone/author-game.js';
import { lookupStory } from '../registry.js';
// Cheap to import: test-tree.ts pulls @sharpee/branch-tester lazily, so the
// harness still loads only when --tree is actually used.
import { runTreeTestCommand } from './test-tree.js';

const USAGE =
  'usage: sharpee test [name|dir|file.story] [transcripts…] [--tree|--chain] [--stop-on-failure|-s] [--verbose|-v] [--json] [--coverage] [--capture-output]';

/**
 * Run `sharpee test`.
 *
 * @param rest CLI args after the subcommand: optional project (registered
 *   name, directory, or `.story` file), optional explicit `.transcript`
 *   files, and flags `--chain` (one game instance across all transcripts;
 *   with no explicit files it runs the `walkthroughs/` chain),
 *   `--stop-on-failure`, `--verbose`, `--json` (NDJSON record stream on
 *   stdout — ADR-277 D1), `--capture-output` (ADR-299 replay capture: with
 *   `--json`, every executed command-result carries `actualOutput`, not
 *   only failures; without `--json` it is inert).
 * @returns process exit code — 0 all passed, 1 failures or transcript
 *   errors, 2 usage error, 3 story load error (transcript-tester's
 *   convention). Never calls `process.exit()` — a piped `--json` stream
 *   must flush completely (the 64KB-pipe gotcha, see cli.ts).
 */
export async function runTestCommand(rest: string[]): Promise<number> {
  // Lazy require (compose.ts pattern): pull the harness only when testing.
  const {
    aggregateTestRun,
    coverageRecord,
    CoverageTracker,
    findTranscripts,
    formatCoverageBreakdown,
    formatCoverageSummary,
    getExitCode,
    ndjsonLine,
    parseTranscriptFile,
    reportTestRun,
    reportTranscript,
    runEndRecord,
    runStartRecord,
    runTranscript,
    transcriptRecords,
    validateTranscript,
  } = require('@sharpee/transcript-tester') as typeof import('@sharpee/transcript-tester');

  let chain = false;
  let tree = false;
  let stopOnFailure = false;
  let verbose = false;
  let json = false;
  let coverage = false;
  let captureOutput = false;
  let projectDir: string | undefined;
  const transcriptPaths: string[] = [];

  for (const arg of rest) {
    if (arg === '--tree') tree = true;
    else if (arg === '--chain' || arg === '-c') chain = true;
    else if (arg === '--stop-on-failure' || arg === '-s') stopOnFailure = true;
    else if (arg === '--verbose' || arg === '-v') verbose = true;
    else if (arg === '--json') json = true;
    else if (arg === '--coverage') coverage = true;
    else if (arg === '--capture-output') captureOutput = true;
    else if (arg.startsWith('-')) {
      console.error(`test: unknown flag '${arg}'\n${USAGE}`);
      return 2;
    } else if (arg.endsWith('.transcript')) {
      transcriptPaths.push(arg);
    } else if (arg.endsWith('.story')) {
      // ADR-277 D1: one mental model across build/compose/test — the
      // `.story` file's containing folder is the project.
      if (projectDir) {
        console.error(`test: unexpected argument '${arg}'\n${USAGE}`);
        return 2;
      }
      if (!existsSync(arg) || !statSync(arg).isFile()) {
        console.error(`test: story file '${arg}' not found`);
        return 2;
      }
      projectDir = path.dirname(path.resolve(arg));
    } else if (!projectDir) {
      if (existsSync(arg) && statSync(arg).isDirectory()) projectDir = arg;
      else {
        const registered = lookupStory(arg);
        if (!registered) {
          console.error(
            `test: '${arg}' is neither a directory nor a registered story — run \`sharpee register <location>\`, or run \`sharpee test\` from the project directory`,
          );
          return 2;
        }
        projectDir = registered;
      }
    } else {
      console.error(`test: unexpected argument '${arg}'\n${USAGE}`);
      return 2;
    }
  }

  // ADR-302 D10 retires `--chain`: in a tree, a shared prefix already runs once
  // and each tail resumes from it, so "chain" names nothing a tree run can mean.
  // Silently ignoring one of the two would hide which model actually ran.
  if (tree && chain) {
    console.error(`test: --tree and --chain are mutually exclusive (ADR-302 D10 retires --chain for trees)\n${USAGE}`);
    return 2;
  }

  const dir = path.resolve(projectDir ?? process.cwd());
  let transcripts = transcriptPaths.map((p) => path.resolve(p));
  if (transcripts.length === 0) {
    if (chain) {
      // ADR-277 D3: `--chain` with no explicit files runs the walkthroughs/
      // chain in filename order. The bare run below never scans it.
      const walkthroughsDir = path.join(dir, 'walkthroughs');
      if (existsSync(walkthroughsDir)) transcripts = findTranscripts(walkthroughsDir).sort();
      if (transcripts.length === 0) {
        console.error(
          `test: no walkthrough transcripts found (--chain with no files scans ${walkthroughsDir})`,
        );
        return 2;
      }
    } else {
      const testsDir = path.join(dir, 'tests');
      if (existsSync(testsDir)) transcripts = findTranscripts(testsDir);
      if (transcripts.length === 0) {
        console.error(`test: no transcript files found (looked in ${testsDir})`);
        return 2;
      }
    }
  }
  transcripts = [...new Set(transcripts)];

  // A tree is a different run model, not a flag on this one: it assembles all
  // transcripts before executing any, and its reporting distinguishes unreached
  // from failed (D13). Hand off whole rather than branching through the loop.
  if (tree) {
    if (json) {
      // The ADR-277 D1 record stream carries no parentage, no `unreached` and
      // no replay markers yet, so a tree emitted through it would be reported
      // as a flat run. Refusing beats emitting a shape that reads as truth.
      console.error('test: --json does not yet carry tree records (parentage, unreached, replay) — run --tree without --json');
      return 2;
    }
    return runTreeTestCommand({ dir, transcripts, verbose, stopOnFailure });
  }

  // In --json mode, stdout is exclusively the NDJSON stream: informational
  // lines are dropped (diagnostics stay on stderr) and the chalk reporter
  // never runs. `process.stdout.write`, never `process.exit()` (header doc).
  const info = (msg: string): void => {
    if (!json) console.log(msg);
  };
  const emitTranscript = (result: TranscriptResult, index: number): void => {
    if (!json) return;
    for (const record of transcriptRecords(result, index, { captureOutput })) {
      process.stdout.write(ndjsonLine(record));
    }
  };

  /** An error-status result for a transcript that never ran (ADR-277 D1). */
  const errorResult = (transcriptPath: string, errorMessage: string, transcript?: Transcript): TranscriptResult => ({
    transcript: transcript ?? { filePath: transcriptPath, header: {}, commands: [], comments: [] },
    commands: [],
    status: 'error',
    passed: 0,
    failed: 0,
    expectedFailures: 0,
    skipped: 0,
    duration: 0,
    errorMessage,
  });

  if (json) process.stdout.write(ndjsonLine(runStartRecord(chain ? 'chain' : 'tests', transcripts.length)));

  info(`Loading story from: ${dir}`);
  // Chain mode shares one game across transcripts; per-transcript mode loads
  // fresh below (honoring each transcript's optional `entry:` header).
  let game: TestableGame | undefined;
  if (chain) {
    // ADR-293 D14: a chain is one session governed by the FIRST member's
    // pinned seed. Pre-read it here — the game must be seeded at assembly
    // (the runner verifies the session seed, it never sets it). A parse
    // error is swallowed: the main loop below reports it properly.
    let chainSeed: number | undefined;
    try {
      chainSeed = parseTranscriptFile(transcripts[0]).config?.seeds?.[0];
    } catch {
      chainSeed = undefined;
    }
    try {
      game = await loadAuthorGame(dir, { seed: chainSeed });
    } catch (error) {
      const message = `Error loading story: ${error instanceof Error ? error.message : error}`;
      console.error(message);
      // Nothing can run — every transcript is an error record, never absent.
      const results = transcripts.map((t, i) => {
        const r = errorResult(t, message);
        emitTranscript(r, i);
        return r;
      });
      if (json) process.stdout.write(ndjsonLine(runEndRecord(aggregateTestRun(results), 3)));
      return 3;
    }
  }

  info(`Found ${transcripts.length} transcript(s) to run`);
  if (chain) info('Chain mode: Game state will persist between transcripts');

  const results: TranscriptResult[] = [];
  // ADR-293 D15: one tracker per run — a chain is one session, one report.
  const coverageTracker = new CoverageTracker();
  let loadError = false;
  for (let index = 0; index < transcripts.length; index++) {
    const transcriptPath = transcripts[index];

    let transcript: Transcript;
    try {
      transcript = parseTranscriptFile(transcriptPath);
    } catch (error) {
      const message = `Error parsing transcript: ${error instanceof Error ? error.message : error}`;
      console.error(`\n${transcriptPath}: ${message}`);
      const result = errorResult(transcriptPath, message);
      results.push(result);
      emitTranscript(result, index);
      if (!json) reportTranscript(result, { verbose });
      continue;
    }

    const errors = validateTranscript(transcript);
    if (errors.length > 0) {
      console.error(`\nErrors in ${transcriptPath}:`);
      for (const err of errors) console.error(`  - ${err}`);
      const result = errorResult(transcriptPath, `Transcript validation failed: ${errors.join('; ')}`, transcript);
      results.push(result);
      emitTranscript(result, index);
      if (!json) reportTranscript(result, { verbose });
      continue;
    }

    if (!chain) {
      try {
        // ADR-294 D3: a pinned transcript runs at its declared seed — the
        // runner verifies the session seed against the pin, so the game
        // must be seeded here at assembly.
        game = await loadAuthorGame(dir, {
          entry: transcript.header.entry,
          seed: transcript.config?.seeds?.[0],
        });
      } catch (error) {
        const message = `Error loading story: ${error instanceof Error ? error.message : error}`;
        console.error(message);
        // The story is broken for this and every remaining transcript: each
        // gets an error record (never a silent gap), and the run exits 3.
        for (let j = index; j < transcripts.length; j++) {
          const r = errorResult(transcripts[j], message);
          results.push(r);
          emitTranscript(r, j);
        }
        loadError = true;
        break;
      }
    }

    const result = await runTranscript(transcript, game!, {
      verbose,
      stopOnFailure,
      coverage: coverageTracker,
    });
    results.push(result);
    emitTranscript(result, index);
    if (!json) reportTranscript(result, { verbose });
    if (stopOnFailure && result.failed > 0) break;
  }

  const runResult = aggregateTestRun(results);
  if (!json && results.length > 1) reportTestRun(runResult, { verbose });

  // ADR-293 D15: the one-line summary always prints (human mode); --coverage
  // adds the full breakdown, or — in --json mode — the coverage record on
  // the wire, before run-end.
  const report = coverageTracker.buildReport();
  if (json) {
    if (coverage) process.stdout.write(ndjsonLine(coverageRecord(report)));
  } else {
    info('');
    info(formatCoverageSummary(report));
    if (coverage) {
      info('');
      info(formatCoverageBreakdown(report));
    }
  }

  const code = loadError ? 3 : getExitCode(runResult);
  if (json) process.stdout.write(ndjsonLine(runEndRecord(runResult, code)));
  return code;
}

/**
 * test.ts — `sharpee test`: run an author project's transcript tests.
 *
 * Author-side counterpart of the platform bundle's `--test` (ADR-187 R1:
 * both tools carry a test command, each its own implementation). Resolves
 * the project (cwd, a registered name, or a path), finds its transcripts
 * (`tests/` subtree, or explicit `.transcript` arguments), loads the story
 * through the shared author-game loader (Chord `.story` or module story),
 * and drives @sharpee/transcript-tester's real runner/reporter.
 *
 * Public interface: runTestCommand(rest) → process exit code.
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import type { TestableGame, TranscriptResult, TestRunResult } from '@sharpee/transcript-tester';
import { loadAuthorGame } from '../standalone/author-game';
import { lookupStory } from '../registry';

const USAGE =
  'usage: sharpee test [name|path] [transcripts…] [--chain] [--stop-on-failure|-s] [--verbose|-v]';

/**
 * Run `sharpee test`.
 *
 * @param rest CLI args after the subcommand: optional project (registered
 *   name or directory), optional explicit `.transcript` files, and flags
 *   `--chain` (one game instance across all transcripts), `--stop-on-failure`,
 *   `--verbose`.
 * @returns process exit code — 0 all passed, 1 failures, 2 usage error,
 *   3 story load error (transcript-tester's convention).
 */
export async function runTestCommand(rest: string[]): Promise<number> {
  // Lazy require (compose.ts pattern): pull the harness only when testing.
  const {
    findTranscripts,
    getExitCode,
    parseTranscriptFile,
    reportTestRun,
    reportTranscript,
    runTranscript,
    validateTranscript,
  } = require('@sharpee/transcript-tester') as typeof import('@sharpee/transcript-tester');

  let chain = false;
  let stopOnFailure = false;
  let verbose = false;
  let projectDir: string | undefined;
  const transcriptPaths: string[] = [];

  for (const arg of rest) {
    if (arg === '--chain' || arg === '-c') chain = true;
    else if (arg === '--stop-on-failure' || arg === '-s') stopOnFailure = true;
    else if (arg === '--verbose' || arg === '-v') verbose = true;
    else if (arg.startsWith('-')) {
      console.error(`test: unknown flag '${arg}'\n${USAGE}`);
      return 2;
    } else if (arg.endsWith('.transcript')) {
      transcriptPaths.push(arg);
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

  const dir = path.resolve(projectDir ?? process.cwd());
  let transcripts = transcriptPaths.map((p) => path.resolve(p));
  if (transcripts.length === 0) {
    const testsDir = path.join(dir, 'tests');
    if (existsSync(testsDir)) transcripts = findTranscripts(testsDir);
  }
  transcripts = [...new Set(transcripts)];
  if (transcripts.length === 0) {
    console.error(`test: no transcript files found (looked in ${path.join(dir, 'tests')})`);
    return 2;
  }

  console.log(`Loading story from: ${dir}`);
  // Chain mode shares one game across transcripts; per-transcript mode loads
  // fresh below (honoring each transcript's optional `entry:` header).
  let game: TestableGame | undefined;
  if (chain) {
    try {
      game = await loadAuthorGame(dir);
    } catch (error) {
      console.error(`Error loading story: ${error instanceof Error ? error.message : error}`);
      return 3;
    }
  }

  console.log(`Found ${transcripts.length} transcript(s) to run`);
  if (chain) console.log('Chain mode: Game state will persist between transcripts');

  const results: TranscriptResult[] = [];
  for (const transcriptPath of transcripts) {
    const transcript = parseTranscriptFile(transcriptPath);
    const errors = validateTranscript(transcript);
    if (errors.length > 0) {
      console.error(`\nErrors in ${transcriptPath}:`);
      for (const err of errors) console.error(`  - ${err}`);
      continue;
    }

    if (!chain) {
      try {
        game = await loadAuthorGame(dir, { entry: transcript.header.entry });
      } catch (error) {
        console.error(`Error loading story: ${error instanceof Error ? error.message : error}`);
        return 3;
      }
    }

    const result = await runTranscript(transcript, game!, { verbose, stopOnFailure });
    results.push(result);
    reportTranscript(result, { verbose });
    if (stopOnFailure && result.failed > 0) break;
  }

  const runResult: TestRunResult = {
    transcripts: results,
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    totalExpectedFailures: results.reduce((sum, r) => sum + r.expectedFailures, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
  };
  if (results.length > 1) reportTestRun(runResult, { verbose });
  return getExitCode(runResult);
}

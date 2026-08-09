#!/usr/bin/env node

/**
 * Branch Tester CLI (ADR-302) — dev-only entry point, NO LONGER A PUBLISHED BIN.
 *
 * The `branch-test` bin was retired in favour of `sharpee test --tree` (devkit),
 * which drives this package as a LIBRARY and can load a Chord `.story` — which
 * this file never could, since Chord compilation lives in the bundle.
 *
 * Usage (run the file directly; there is no installed command):
 *   node packages/branch-tester/dist/cli.js <story-path> [transcript-files...]
 *   node packages/branch-tester/dist/cli.js <story-path> --all
 */

import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { parseTranscriptFile, validateTranscript } from './parser.js';
import { runTranscript } from './runner.js';
import { assembleTree } from './tree.js';
import { runTree } from './tree-runner.js';
import { createRootGameFactory } from './game-factory.js';
import { formatTreeRun } from './tree-report.js';
import {
  reportTranscript,
  reportTestRun,
  getExitCode,
  generateTimestamp,
  writeResultsToJson,
  writeReportToFile
} from './reporter.js';
import { loadStory, findTranscripts, TestableGame } from './story-loader.js';
import { Transcript, TranscriptResult, TestRunResult } from './types.js';
import { aggregateTestRun } from './aggregate.js';
import { CoverageTracker, formatCoverageSummary, formatCoverageBreakdown } from './coverage.js';

interface CliOptions {
  storyPath: string;
  transcriptPaths: string[];
  verbose: boolean;
  emitTraits: boolean;
  stopOnFailure: boolean;
  all: boolean;
  outputDir: string | null;
  play: boolean;
  coverage: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    storyPath: '',
    transcriptPaths: [],
    verbose: false,
    emitTraits: false,
    stopOnFailure: false,
    all: false,
    outputDir: null,
    play: false,
    coverage: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--emit-traits') {
      options.emitTraits = true;
      options.verbose = true;
    } else if (arg === '--stop-on-failure' || arg === '-s') {
      options.stopOnFailure = true;
    } else if (arg === '--all' || arg === '-a') {
      options.all = true;
    } else if (arg === '--chain' || arg === '-c') {
      // ADR-302 D10: retired, not renamed. The tree states every relationship
      // the flag used to imply, so running the harness already runs every
      // path — a flag could only ask for LESS than that.
      console.error(
        '--chain was removed (ADR-302 D10) — a transcript declares its parent with ' +
          '`continues: <stem>`, and running the harness runs every root-to-leaf path. ' +
          'Delete the flag.'
      );
      process.exit(2);
    } else if (arg === '--coverage') {
      options.coverage = true;
    } else if (arg === '--play' || arg === '-p') {
      options.play = true;
    } else if (arg === '--output-dir' || arg === '-o') {
      i++;
      if (i < args.length) {
        options.outputDir = args[i];
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      if (!options.storyPath) {
        options.storyPath = arg;
      } else {
        options.transcriptPaths.push(arg);
      }
    }

    i++;
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Branch Tester - Test Sharpee stories as a tree of transcripts

This is a dev-only entry point. There is no installed \`branch-test\` command:
authors run \`sharpee test --tree\`, and the in-repo path is
\`dist/cli/sharpee.js --test\` over transcripts under branch-stories/.
This entry point cannot load a Chord \`.story\` — that lives in the bundle.

Usage:
  node packages/branch-tester/dist/cli.js <story-path> [transcript-files...] [options]
  node packages/branch-tester/dist/cli.js <story-path> --play

Arguments:
  story-path         Path to the story directory (e.g., branch-stories/fernhill)
  transcript-files   One or more .transcript files to run

Options:
  -p, --play             Interactive play mode (REPL)
  -a, --all              Run all transcripts in the story's tests/ directory
  --coverage             Print the full per-point outcome-class coverage
                         breakdown (ADR-293 D15); the one-line summary always
                         prints, and --output-dir also writes the report JSON
  -v, --verbose          Show detailed output for each command
  --emit-traits          Show entity traits for objects referenced in events (implies --verbose)
  -s, --stop-on-failure  Stop on first failure
  -o, --output-dir <dir> Write timestamped results to directory (JSON + text report)
  -h, --help             Show this help message

Examples (CLI="node packages/branch-tester/dist/cli.js"):
  $CLI branch-stories/fernhill --all
  $CLI branch-stories/fernhill tests/transcripts/arrival.transcript
  $CLI branch-stories/fernhill --all --verbose
  $CLI branch-stories/fernhill --all -o test-results
`);
}

/**
 * Run interactive play mode (REPL)
 */
async function runInteractiveMode(game: TestableGame): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let debugMode = false;
  let traceMode = false;

  console.log('\n--- Interactive Mode ---');
  console.log('Type commands to play. Special commands:');
  console.log('  /quit, /q    - Exit the game');
  console.log('  /debug       - Toggle debug mode (show events after each command)');
  console.log('  /trace       - Toggle parser trace mode (show grammar matching)');
  console.log('  /events      - Show events from last command');
  console.log('  /look, /l    - Shortcut for "look"');
  console.log('  /inv, /i     - Shortcut for "inventory"');
  console.log('');

  // Show the opening, then the initial room description. The prologue precedes
  // the banner, which precedes the first response — the order a reader expects.
  const initialOutput = await game.executeCommand('look');
  printOpening(game);
  console.log(initialOutput);

  const prompt = (): void => {
    rl.question('\n> ', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // Handle special commands
      if (trimmed === '/quit' || trimmed === '/q') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
        return;
      }

      if (trimmed === '/restart') {
        console.log('(Restart not yet implemented - please exit and rerun)');
        prompt();
        return;
      }

      if (trimmed === '/debug') {
        debugMode = !debugMode;
        console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
        prompt();
        return;
      }

      if (trimmed === '/trace') {
        traceMode = !traceMode;
        process.env.PARSER_DEBUG = traceMode ? 'true' : '';
        console.log(`Parser trace: ${traceMode ? 'ON' : 'OFF'}`);
        prompt();
        return;
      }

      if (trimmed === '/events') {
        if (game.lastEvents && game.lastEvents.length > 0) {
          console.log('\nEvents from last command:');
          for (const event of game.lastEvents) {
            console.log(`  ${event.type}`);
            if (event.data && Object.keys(event.data).length > 0) {
              console.log(`    ${JSON.stringify(event.data)}`);
            }
          }
        } else {
          console.log('(No events from last command)');
        }
        prompt();
        return;
      }

      // Shortcuts
      let command = trimmed;
      if (trimmed === '/look' || trimmed === '/l') {
        command = 'look';
      } else if (trimmed === '/inv' || trimmed === '/i') {
        command = 'inventory';
      }

      // Execute the command
      try {
        const output = await game.executeCommand(command);
        console.log(output);

        // Show events in debug mode
        if (debugMode && game.lastEvents && game.lastEvents.length > 0) {
          console.log('\n[Events]');
          for (const event of game.lastEvents) {
            const data = event.data && Object.keys(event.data).length > 0
              ? ` ${JSON.stringify(event.data)}`
              : '';
            console.log(`  ${event.type}${data}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
      }

      prompt();
    });
  };

  prompt();
}

/**
 * Main entry point
 */
/**
 * Channels carrying the game's opening, declared whenever a person (rather than
 * a transcript) is going to read the output. The turn's prose composes from
 * `preferred-layout` and needs no declaration (ADR-300 D8/D9); these two are
 * said before anything is typed, so a surface that does not ask for them shows
 * the player no opening at all (D15).
 */
const OPENING_CHANNELS = ['prologue', 'banner'];

/**
 * Print the prologue and banner captured on the way to the first command.
 *
 * They arrive on their own channels, so anything showing the game to a person
 * has to render them; nothing else prints them.
 */
function printOpening(game: TestableGame): void {
  for (const id of ['prologue', 'banner']) {
    const lines = game.lastChannels?.[id];
    if (lines && lines.length > 0) {
      console.log(lines.join('\n'));
      console.log('');
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(1);
  }

  const options = parseArgs(args);

  if (!options.storyPath) {
    console.error('Error: Story path is required');
    printHelp();
    process.exit(1);
  }

  // Interactive play mode
  if (options.play) {
    console.log(`Loading story from: ${options.storyPath}`);
    let game: TestableGame;
    try {
      // Play needs the channels that carry the opening. The banner and the
      // prologue are said before anything is typed and no longer ride `main`,
      // so a player would never see them unless they are captured here.
      game = await loadStory(options.storyPath, undefined, undefined, OPENING_CHANNELS);
    } catch (error) {
      console.error(`Error loading story: ${error}`);
      process.exit(3);
    }
    await runInteractiveMode(game);
    return;
  }

  // Find transcript files
  let transcriptPaths = options.transcriptPaths;

  if (options.all || transcriptPaths.length === 0) {
    const testsDir = path.join(options.storyPath, 'tests');
    if (fs.existsSync(testsDir)) {
      transcriptPaths = findTranscripts(testsDir);
    } else {
      // Check for transcripts directory
      const transcriptsDir = path.join(options.storyPath, 'tests', 'transcripts');
      if (fs.existsSync(transcriptsDir)) {
        transcriptPaths = findTranscripts(transcriptsDir);
      }
    }
  }

  // Deduplicate paths
  transcriptPaths = [...new Set(transcriptPaths)];

  if (transcriptPaths.length === 0) {
    console.error('Error: No transcript files found');
    console.error(`Looked in: ${path.join(options.storyPath, 'tests')}`);
    process.exit(2);
  }

  console.log(`Loading story from: ${options.storyPath}`);

  // No game is loaded here. A root's game is built when the walk reaches it,
  // from that root's own `entry:` and pinned seed — an eager load would be
  // discarded for a story with several roots (ADR-207 AC-7: no side-effecting
  // pre-load).

  console.log(`Found ${transcriptPaths.length} transcript(s) to run`);

  // ADR-293 D15: one tracker per run — a tree is one report.
  const coverageTracker = new CoverageTracker();

  // ── The tree is the input (ADR-302 D11) ────────────────────────────
  // Parse every transcript, assemble the tree, and validate it WHOLE before a
  // single command runs. A parse error is a defect like any other: it stops
  // the run rather than producing a green tree with a hole in it.
  const parsed: Transcript[] = [];
  const parseFailures: TranscriptResult[] = [];
  for (const transcriptPath of transcriptPaths) {
    const transcript = parseTranscriptFile(transcriptPath);
    const errors = validateTranscript(transcript);
    // A transcript that is merely EMPTY is not a defect: it is the editor's
    // designed starting state, and it runs as a skip (phase-6 F1, David's
    // ruling 2026-08-08). Zero commands + exactly one problem means that
    // problem is the no-commands one; anything else keeps the D11 gate.
    if (transcript.commands.length === 0 && errors.length === 1) {
      parsed.push(transcript);
      continue;
    }
    if (errors.length > 0) {
      parseFailures.push({
        transcript,
        commands: [],
        status: 'error',
        passed: 0,
        failed: 0,
        expectedFailures: 0,
        skipped: 0,
        duration: 0,
        errorMessage: errors.join('; ')
      });
      continue;
    }
    parsed.push(transcript);
  }

  const storyName = path.basename(path.resolve(options.storyPath));

  if (parseFailures.length > 0) {
    for (const failure of parseFailures) reportTranscript(failure, { verbose: options.verbose });
    console.error(`\n${parseFailures.length} transcript(s) failed to parse — nothing ran.`);
    process.exit(2);
  }

  const tree = assembleTree(parsed, storyName);
  if (tree.defects.length > 0) {
    // D11: every defect together, and no execution. A tree with a cycle has no
    // correct partial run to offer.
    for (const line of formatTreeRun({
      outcomes: [],
      defects: tree.defects,
      executedCommands: 0,
      authoredCommands: 0,
    })) {
      console.error(line);
    }
    process.exit(2);
  }

  // A root is a fresh game (D1), and so is every fork (D17) — the walk asks for
  // one per root and one per divergent sibling, naming the root of the ancestry
  // it is about to replay. `entry:` and the pinned seed come from that root's
  // own header; a child inherits them through the effective header rather than
  // by reloading.
  //
  // The same root is booted again at every fork below it, and all of those
  // boots must land on the same seed: a root that declared none would draw a
  // fresh clock seed per boot, and its replayed prefix would then diverge from
  // the one its first child saw. Whatever the first boot resolved is remembered
  // and re-pinned.
  const freshGameForRoot = createRootGameFactory<TestableGame>({
    load: (spec) => loadStory(options.storyPath, spec.entry, spec.seed, spec.channels),
    masterSeedOf: (game) =>
      (game as { engine?: { getMasterSeed?(): number } }).engine?.getMasterSeed?.(),
  });

  let run;
  try {
    run = await runTree(tree, freshGameForRoot as never, {
      verbose: options.verbose,
      emitTraits: options.emitTraits,
      stopOnFailure: options.stopOnFailure,
      coverage: coverageTracker
    });
  } catch (error) {
    console.error(`Error running the tree: ${error}`);
    process.exit(3);
  }

  const results: TranscriptResult[] = run.outcomes
    .filter((outcome) => outcome.result !== undefined)
    .map((outcome) => outcome.result!);

  for (const outcome of run.outcomes) {
    if (outcome.result) {
      reportTranscript(outcome.result, { verbose: options.verbose, emitTraits: options.emitTraits });
    }
  }

  // D13: unreached is not failed. Printed after the runs so the tally that
  // follows reads as blast radius rather than as more failures.
  console.log();
  for (const line of formatTreeRun(run)) console.log(line);

  // Aggregate results (the one shared reduce — ADR-277 D1)
  const runResult: TestRunResult = aggregateTestRun(results);

  // Final report if multiple transcripts
  if (results.length > 1) {
    reportTestRun(runResult, { verbose: options.verbose });
  }

  // ADR-293 D15: the one-line summary always prints; --coverage adds the
  // full per-point breakdown.
  const coverageReport = coverageTracker.buildReport();
  console.log();
  console.log(formatCoverageSummary(coverageReport));
  if (options.coverage) {
    console.log();
    console.log(formatCoverageBreakdown(coverageReport));
  }

  // Write results to files if output directory specified
  if (options.outputDir) {
    const timestamp = generateTimestamp();
    const jsonPath = writeResultsToJson(runResult, options.outputDir, timestamp);
    const reportPath = writeReportToFile(runResult, options.outputDir, timestamp);
    // ADR-293 D15: the full per-point breakdown rides --output-dir alongside
    // the timestamped results.
    const coveragePath = path.join(options.outputDir, `coverage-${timestamp}.json`);
    fs.writeFileSync(coveragePath, JSON.stringify(coverageReport, null, 2), 'utf-8');
    console.log();
    console.log(`Results written to:`);
    console.log(`  JSON:     ${jsonPath}`);
    console.log(`  Report:   ${reportPath}`);
    console.log(`  Coverage: ${coveragePath}`);
  }

  // Exit with appropriate code
  process.exit(getExitCode(runResult));
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

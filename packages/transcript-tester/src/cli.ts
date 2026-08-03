#!/usr/bin/env node

/**
 * Transcript Tester CLI
 *
 * Usage:
 *   transcript-test <story-path> [transcript-files...]
 *   transcript-test <story-path> --all
 *   transcript-test <story-path> --verbose
 */

import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { parseTranscriptFile, validateTranscript } from './parser.js';
import { runTranscript } from './runner.js';
import {
  reportTranscript,
  reportTestRun,
  getExitCode,
  generateTimestamp,
  writeResultsToJson,
  writeReportToFile
} from './reporter.js';
import { loadStory, findTranscripts, TestableGame } from './story-loader.js';
import { TranscriptResult, TestRunResult } from './types.js';
import { aggregateTestRun } from './aggregate.js';
import { CoverageTracker, formatCoverageSummary, formatCoverageBreakdown } from './coverage.js';

interface CliOptions {
  storyPath: string;
  transcriptPaths: string[];
  verbose: boolean;
  emitTraits: boolean;
  stopOnFailure: boolean;
  all: boolean;
  chain: boolean;
  outputDir: string | null;
  play: boolean;
  bless: boolean;
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
    chain: false,
    outputDir: null,
    play: false,
    bless: false,
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
      options.chain = true;
    } else if (arg === '--bless') {
      options.bless = true;
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
Transcript Tester - Test Sharpee stories with transcript files

Usage:
  transcript-test <story-path> [transcript-files...] [options]
  transcript-test <story-path> --play

Arguments:
  story-path         Path to the story directory (e.g., stories/dungeo)
  transcript-files   One or more .transcript files to run

Options:
  -p, --play             Interactive play mode (REPL)
  -a, --all              Run all transcripts in the story's tests/ directory
  -c, --chain            Chain transcripts (don't reset game state between them)
  --bless                Create/overwrite golden recordings (ADR-294 D1)
  --coverage             Print the full per-point outcome-class coverage
                         breakdown (ADR-293 D15); the one-line summary always
                         prints, and --output-dir also writes the report JSON
  -v, --verbose          Show detailed output for each command
  --emit-traits          Show entity traits for objects referenced in events (implies --verbose)
  -s, --stop-on-failure  Stop on first failure
  -o, --output-dir <dir> Write timestamped results to directory (JSON + text report)
  -h, --help             Show this help message

Examples:
  transcript-test stories/dungeo --play
  transcript-test stories/dungeo tests/navigation.transcript
  transcript-test stories/dungeo --all
  transcript-test stories/dungeo tests/*.transcript --verbose
  transcript-test stories/dungeo --all -o test-results
  transcript-test stories/dungeo --chain tests/setup.transcript tests/puzzle.transcript
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

  // Show initial room description
  const initialOutput = await game.executeCommand('look');
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
      game = await loadStory(options.storyPath);
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

  // Chain mode shares one game instance across all transcripts, so load it up
  // front. In per-transcript mode the loop loads a fresh game for each
  // transcript (honoring its `entry:` header) — an eager load here would be
  // discarded unused (ADR-207 AC-7: no side-effecting pre-load).
  let game: TestableGame | undefined;
  // ADR-294 D15: the channels a session's game was assembled with — threaded
  // to the runner so a mismatched member fails by name, never silently.
  let assembledChannels: string[] = ['main'];
  if (options.chain) {
    // ADR-293 D14: a chain is one session governed by the FIRST member's
    // pinned seed — pre-read it, since the engine is seeded at assembly.
    // Same for its channels: declaration (ADR-294 D15): one session, one
    // capability profile and capture set.
    // A parse error is swallowed here: the main loop reports it properly.
    let chainSeed: number | undefined;
    try {
      const firstConfig = parseTranscriptFile(options.transcriptPaths[0]).config;
      chainSeed = firstConfig?.seeds?.[0];
      assembledChannels = firstConfig?.channels ?? ['main'];
    } catch {
      chainSeed = undefined;
    }
    try {
      game = await loadStory(options.storyPath, undefined, chainSeed, assembledChannels);
    } catch (error) {
      console.error(`Error loading story: ${error}`);
      process.exit(3);
    }
  }

  console.log(`Found ${transcriptPaths.length} transcript(s) to run`);
  if (options.chain) {
    console.log(`Chain mode: Game state will persist between transcripts`);
  }

  // Run all transcripts
  const results: TranscriptResult[] = [];

  // ADR-293 D15: one tracker per run — a chain is one session, one report.
  const coverageTracker = new CoverageTracker();

  for (const transcriptPath of transcriptPaths) {
    // Parse the transcript
    const transcript = parseTranscriptFile(transcriptPath);

    // Validate. Errors are recorded as an error-status result, never dropped
    // (ADR-294 AC-4: nothing executes, and the run fails).
    const errors = validateTranscript(transcript);
    if (errors.length > 0) {
      const result: TranscriptResult = {
        transcript,
        commands: [],
        status: 'error',
        passed: 0,
        failed: 0,
        expectedFailures: 0,
        skipped: 0,
        duration: 0,
        errorMessage: errors.join('; ')
      };
      results.push(result);
      reportTranscript(result, { verbose: options.verbose });
      if (options.chain) break;  // one session — later members need this state
      continue;
    }

    // Load a fresh story for each transcript to reset state (unless chaining).
    // Honor the transcript's optional `entry:` header (ADR-180) and its
    // pinned `seed:` (ADR-294 D3 — the engine is seeded at assembly).
    if (!options.chain) {
      try {
        assembledChannels = transcript.config?.channels ?? ['main'];
        game = await loadStory(options.storyPath, transcript.header.entry,
          transcript.config?.seeds?.[0], assembledChannels);
      } catch (error) {
        console.error(`Error loading story: ${error}`);
        process.exit(3);
      }
    }

    // Run the transcript
    const result = await runTranscript(transcript, game!, {
      verbose: options.verbose,
      emitTraits: options.emitTraits,
      stopOnFailure: options.stopOnFailure,
      bless: options.bless,
      chain: options.chain,
      assembledChannels,
      storyName: path.basename(path.resolve(options.storyPath)),
      // `assembleGame` builds the ext-testing extension and hangs it off LoadedGame,
      // but this bin used to drop it — so every `$teleport`/`$restore`/`$take` run
      // through the published `transcript-test` was silently skipped while the
      // transcript still reported green. The in-repo bundle has always threaded it
      // (scripts/bundle-entry.js), which is why the divergence only surfaced once
      // `test:npm --local` could reach the install step.
      testingExtension: game!.testingExtension ?? undefined,
      coverage: coverageTracker
    });

    results.push(result);

    // Report individual transcript results
    reportTranscript(result, { verbose: options.verbose, emitTraits: options.emitTraits });

    // A chain is one session: any non-passing member leaves the world in the
    // wrong state for every member after it, so the chain always stops there
    // (recording past it would enshrine a broken session). Independent runs
    // stop only under --stop-on-failure (ADR-294 D5 — run-level control).
    if (result.status !== 'passed' && (options.chain || options.stopOnFailure)) {
      break;
    }
  }

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

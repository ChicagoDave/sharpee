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
import { parseTranscriptFile, validateTranscript } from './parser';
import { runTranscript } from './runner';
import {
  reportTranscript,
  reportTestRun,
  getExitCode,
  generateTimestamp,
  writeResultsToJson,
  writeReportToFile
} from './reporter';
import { loadStory, findTranscripts, TestableGame } from './story-loader';
import { TranscriptResult, TestRunResult } from './types';

interface CliOptions {
  storyPath: string;
  transcriptPaths: string[];
  verbose: boolean;
  stopOnFailure: boolean;
  all: boolean;
  chain: boolean;
  outputDir: string | null;
  play: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    storyPath: '',
    transcriptPaths: [],
    verbose: false,
    stopOnFailure: false,
    all: false,
    chain: false,
    outputDir: null,
    play: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--stop-on-failure' || arg === '-s') {
      options.stopOnFailure = true;
    } else if (arg === '--all' || arg === '-a') {
      options.all = true;
    } else if (arg === '--chain' || arg === '-c') {
      options.chain = true;
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
  -v, --verbose          Show detailed output for each command
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

  // Load the story
  let game: TestableGame;
  try {
    game = await loadStory(options.storyPath);
  } catch (error) {
    console.error(`Error loading story: ${error}`);
    process.exit(3);
  }

  console.log(`Found ${transcriptPaths.length} transcript(s) to run`);
  if (options.chain) {
    console.log(`Chain mode: Game state will persist between transcripts`);
  }

  // Run all transcripts
  const results: TranscriptResult[] = [];

  for (const transcriptPath of transcriptPaths) {
    // Parse the transcript
    const transcript = parseTranscriptFile(transcriptPath);

    // Validate
    const errors = validateTranscript(transcript);
    if (errors.length > 0) {
      console.error(`\nErrors in ${transcriptPath}:`);
      for (const err of errors) {
        console.error(`  - ${err}`);
      }
      continue;
    }

    // Reload story for each transcript to reset state (unless chaining)
    if (!options.chain) {
      game = await loadStory(options.storyPath);
    }

    // Run the transcript
    const result = await runTranscript(transcript, game, {
      verbose: options.verbose,
      stopOnFailure: options.stopOnFailure
    });

    results.push(result);

    // Report individual transcript results
    reportTranscript(result, { verbose: options.verbose });

    // Stop if requested and there was a failure
    if (options.stopOnFailure && result.failed > 0) {
      break;
    }
  }

  // Aggregate results
  const runResult: TestRunResult = {
    transcripts: results,
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    totalExpectedFailures: results.reduce((sum, r) => sum + r.expectedFailures, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };

  // Final report if multiple transcripts
  if (results.length > 1) {
    reportTestRun(runResult, { verbose: options.verbose });
  }

  // Write results to files if output directory specified
  if (options.outputDir) {
    const timestamp = generateTimestamp();
    const jsonPath = writeResultsToJson(runResult, options.outputDir, timestamp);
    const reportPath = writeReportToFile(runResult, options.outputDir, timestamp);
    console.log();
    console.log(`Results written to:`);
    console.log(`  JSON:   ${jsonPath}`);
    console.log(`  Report: ${reportPath}`);
  }

  // Exit with appropriate code
  process.exit(getExitCode(runResult));
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

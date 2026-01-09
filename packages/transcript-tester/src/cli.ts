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
    outputDir: null
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

Arguments:
  story-path         Path to the story directory (e.g., stories/dungeo)
  transcript-files   One or more .transcript files to run

Options:
  -a, --all              Run all transcripts in the story's tests/ directory
  -c, --chain            Chain transcripts (don't reset game state between them)
  -v, --verbose          Show detailed output for each command
  -s, --stop-on-failure  Stop on first failure
  -o, --output-dir <dir> Write timestamped results to directory (JSON + text report)
  -h, --help             Show this help message

Examples:
  transcript-test stories/dungeo tests/navigation.transcript
  transcript-test stories/dungeo --all
  transcript-test stories/dungeo tests/*.transcript --verbose
  transcript-test stories/dungeo --all -o test-results
  transcript-test stories/dungeo --chain tests/setup.transcript tests/puzzle.transcript
`);
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

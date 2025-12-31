/**
 * Transcript Test Reporter
 *
 * Formats and displays test results with colors and diffs.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  TranscriptResult,
  TestRunResult,
  CommandResult,
  AssertionResult
} from './types';

// Use chalk for colors (chalk@4 for CommonJS compatibility)
import chalk from 'chalk';

/**
 * Report options
 */
export interface ReporterOptions {
  verbose?: boolean;
  showDiff?: boolean;
  color?: boolean;
}

/**
 * Report results of running a single transcript
 */
export function reportTranscript(
  result: TranscriptResult,
  options: ReporterOptions = {}
): void {
  const { verbose = false } = options;

  console.log();
  console.log(chalk.bold(`Running: ${result.transcript.filePath}`));

  if (result.transcript.header.title) {
    console.log(chalk.gray(`  "${result.transcript.header.title}"`));
  }

  console.log();

  for (const cmd of result.commands) {
    reportCommand(cmd, verbose);
  }

  // Summary line
  console.log();
  reportTranscriptSummary(result);
}

/**
 * Report a single command result
 */
function reportCommand(result: CommandResult, verbose: boolean): void {
  const { command, passed, expectedFailure, skipped, actualOutput, error } = result;

  // Command input
  const inputDisplay = chalk.cyan(`> ${command.input}`);

  // Status indicator
  let status: string;
  if (skipped) {
    status = chalk.yellow('SKIP');
  } else if (expectedFailure) {
    status = chalk.magenta('EXPECTED FAIL');
  } else if (passed) {
    status = chalk.green('PASS');
  } else {
    status = chalk.red('FAIL');
  }

  // Compact format
  console.log(`  ${inputDisplay.padEnd(50)} ${status}`);

  // Verbose output
  if (verbose || (!passed && !skipped && !expectedFailure)) {
    if (error) {
      console.log(chalk.red(`    Error: ${error}`));
    }

    // Show assertion details
    for (const ar of result.assertionResults) {
      if (!ar.passed || verbose) {
        const icon = ar.passed ? chalk.green('✓') : chalk.red('✗');
        const msg = formatAssertion(ar);
        console.log(`    ${icon} ${msg}`);
      }
    }

    // Always show actual output in verbose mode, or for failures
    if (verbose || (!passed && !skipped)) {
      console.log(chalk.gray('    ─── Output ───'));
      for (const line of actualOutput.split('\n')) {
        if (line.trim()) {
          console.log(chalk.white(`    ${line}`));
        }
      }
      console.log(chalk.gray('    ─────────────'));

      // Show events in verbose mode
      if (verbose && result.actualEvents && result.actualEvents.length > 0) {
        console.log(chalk.gray(`    ─── Events (${result.actualEvents.length}) ───`));
        for (const event of result.actualEvents) {
          const dataStr = Object.keys(event.data).length > 0
            ? ` ${chalk.gray(JSON.stringify(event.data))}`
            : '';
          console.log(chalk.blue(`    • ${event.type}`) + dataStr);
        }
        console.log(chalk.gray('    ─────────────'));
      }
    }

    // Show diff for failures with expected output
    if (!passed && !skipped && command.expectedOutput.length > 0) {
      console.log();
      console.log(chalk.gray('    Expected:'));
      for (const line of command.expectedOutput) {
        console.log(chalk.green(`    + ${line}`));
      }
    }
  }

  // Show reason for skips and expected failures
  if (skipped || expectedFailure) {
    const reason = result.assertionResults[0]?.assertion.reason;
    if (reason) {
      console.log(chalk.gray(`      (${reason})`));
    }
  }
}

/**
 * Format an assertion result for display
 */
function formatAssertion(result: AssertionResult): string {
  const { assertion, message } = result;

  switch (assertion.type) {
    case 'ok':
      return message || 'Exact match';
    case 'ok-contains':
      return message || `Contains "${assertion.value}"`;
    case 'ok-not-contains':
      return message || `Does not contain "${assertion.value}"`;
    case 'ok-matches':
      return message || `Matches ${assertion.pattern}`;
    case 'fail':
      return `Expected failure: ${assertion.reason}`;
    case 'skip':
      return `Skipped: ${assertion.reason || 'no reason given'}`;
    case 'todo':
      return `TODO: ${assertion.reason || 'not implemented'}`;
    case 'event-count':
      return message || `Event count: ${assertion.eventCount}`;
    case 'event-assert': {
      const prefix = assertion.assertTrue ? 'assertTrue' : 'assertFalse';
      const posStr = assertion.eventPosition ? ` Event ${assertion.eventPosition}:` : '';
      const dataStr = assertion.eventData ? ` ${JSON.stringify(assertion.eventData)}` : '';
      return message || `${prefix}:${posStr} ${assertion.eventType}${dataStr}`;
    }
    case 'state-assert': {
      const prefix = assertion.assertTrue ? 'assertTrue' : 'assertFalse';
      return message || `${prefix}: ${assertion.stateExpression}`;
    }
    default:
      return message || 'Unknown assertion';
  }
}

/**
 * Report transcript summary
 */
function reportTranscriptSummary(result: TranscriptResult): void {
  const { passed, failed, expectedFailures, skipped, duration } = result;

  const parts: string[] = [];

  if (passed > 0) {
    parts.push(chalk.green(`${passed} passed`));
  }
  if (failed > 0) {
    parts.push(chalk.red(`${failed} failed`));
  }
  if (expectedFailures > 0) {
    parts.push(chalk.magenta(`${expectedFailures} expected failures`));
  }
  if (skipped > 0) {
    parts.push(chalk.yellow(`${skipped} skipped`));
  }

  console.log(`  ${parts.join(', ')} (${duration}ms)`);
}

/**
 * Report results of running multiple transcripts
 * Note: Individual transcripts should already be reported as they run.
 * This function only shows the aggregate summary.
 */
export function reportTestRun(result: TestRunResult, options: ReporterOptions = {}): void {
  console.log();
  console.log(chalk.bold('━'.repeat(60)));
  console.log();

  // Overall summary
  const { totalPassed, totalFailed, totalExpectedFailures, totalSkipped, totalDuration } = result;
  const total = totalPassed + totalFailed + totalExpectedFailures + totalSkipped;

  console.log(chalk.bold(`Total: ${total} tests in ${result.transcripts.length} transcripts`));

  const parts: string[] = [];
  if (totalPassed > 0) {
    parts.push(chalk.green(`${totalPassed} passed`));
  }
  if (totalFailed > 0) {
    parts.push(chalk.red(`${totalFailed} failed`));
  }
  if (totalExpectedFailures > 0) {
    parts.push(chalk.magenta(`${totalExpectedFailures} expected failures`));
  }
  if (totalSkipped > 0) {
    parts.push(chalk.yellow(`${totalSkipped} skipped`));
  }

  console.log(parts.join(', '));
  console.log(chalk.gray(`Duration: ${totalDuration}ms`));
  console.log();

  // Final status
  if (totalFailed === 0) {
    console.log(chalk.green.bold('✓ All tests passed!'));
  } else {
    console.log(chalk.red.bold(`✗ ${totalFailed} test(s) failed`));
  }
}

/**
 * Get exit code based on results
 */
export function getExitCode(result: TestRunResult): number {
  if (result.totalFailed > 0) {
    return 1;
  }
  return 0;
}

/**
 * Generate a timestamp string for filenames
 */
export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Write test results to a JSON file
 */
export function writeResultsToJson(
  result: TestRunResult,
  outputDir: string,
  timestamp: string
): string {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `results_${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  // Write JSON with serializable data (strip non-serializable like RegExp)
  const serializableResult = JSON.parse(JSON.stringify(result, (key, value) => {
    if (value instanceof RegExp) {
      return value.toString();
    }
    return value;
  }));

  fs.writeFileSync(filepath, JSON.stringify(serializableResult, null, 2));
  return filepath;
}

/**
 * Write a human-readable report to a text file
 */
export function writeReportToFile(
  result: TestRunResult,
  outputDir: string,
  timestamp: string
): string {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `report_${timestamp}.txt`;
  const filepath = path.join(outputDir, filename);

  const lines: string[] = [];

  lines.push('=' .repeat(60));
  lines.push('TRANSCRIPT TEST REPORT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('='.repeat(60));
  lines.push('');

  // Overall summary
  const { totalPassed, totalFailed, totalExpectedFailures, totalSkipped, totalDuration } = result;
  const total = totalPassed + totalFailed + totalExpectedFailures + totalSkipped;

  lines.push(`Total: ${total} tests in ${result.transcripts.length} transcript(s)`);
  lines.push(`  Passed: ${totalPassed}`);
  lines.push(`  Failed: ${totalFailed}`);
  lines.push(`  Expected Failures: ${totalExpectedFailures}`);
  lines.push(`  Skipped: ${totalSkipped}`);
  lines.push(`  Duration: ${totalDuration}ms`);
  lines.push('');

  // Per-transcript details
  for (const transcript of result.transcripts) {
    lines.push('-'.repeat(60));
    lines.push(`Transcript: ${transcript.transcript.filePath}`);
    if (transcript.transcript.header.title) {
      lines.push(`  Title: ${transcript.transcript.header.title}`);
    }
    lines.push(`  Results: ${transcript.passed} passed, ${transcript.failed} failed, ${transcript.expectedFailures} expected failures, ${transcript.skipped} skipped`);
    lines.push('');

    // Command details (only show failures in summary)
    const failedCommands = transcript.commands.filter(c => !c.passed && !c.skipped && !c.expectedFailure);
    if (failedCommands.length > 0) {
      lines.push('  FAILURES:');
      for (const cmd of failedCommands) {
        lines.push(`    Line ${cmd.command.lineNumber}: > ${cmd.command.input}`);
        if (cmd.error) {
          lines.push(`      Error: ${cmd.error}`);
        }
        for (const ar of cmd.assertionResults) {
          if (!ar.passed) {
            lines.push(`      - ${ar.message || formatAssertionPlain(ar.assertion)}`);
          }
        }
        lines.push('      Actual output:');
        for (const line of cmd.actualOutput.split('\n')) {
          if (line.trim()) {
            lines.push(`        ${line}`);
          }
        }
        lines.push('');
      }
    }
  }

  lines.push('='.repeat(60));
  if (totalFailed === 0) {
    lines.push('ALL TESTS PASSED');
  } else {
    lines.push(`${totalFailed} TEST(S) FAILED`);
  }
  lines.push('='.repeat(60));

  fs.writeFileSync(filepath, lines.join('\n'));
  return filepath;
}

/**
 * Format an assertion without chalk colors (for file output)
 */
function formatAssertionPlain(assertion: any): string {
  switch (assertion.type) {
    case 'ok':
      return 'Exact match';
    case 'ok-contains':
      return `Contains "${assertion.value}"`;
    case 'ok-not-contains':
      return `Does not contain "${assertion.value}"`;
    case 'ok-matches':
      return `Matches ${assertion.pattern}`;
    case 'fail':
      return `Expected failure: ${assertion.reason}`;
    case 'skip':
      return `Skipped: ${assertion.reason || 'no reason given'}`;
    case 'todo':
      return `TODO: ${assertion.reason || 'not implemented'}`;
    case 'event-count':
      return `Event count: ${assertion.eventCount}`;
    case 'event-assert': {
      const prefix = assertion.assertTrue ? 'assertTrue' : 'assertFalse';
      const posStr = assertion.eventPosition ? ` Event ${assertion.eventPosition}:` : '';
      const dataStr = assertion.eventData ? ` ${JSON.stringify(assertion.eventData)}` : '';
      return `${prefix}:${posStr} ${assertion.eventType}${dataStr}`;
    }
    case 'state-assert': {
      const prefix = assertion.assertTrue ? 'assertTrue' : 'assertFalse';
      return `${prefix}: ${assertion.stateExpression}`;
    }
    default:
      return 'Unknown assertion';
  }
}

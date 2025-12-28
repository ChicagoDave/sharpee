/**
 * Transcript Test Reporter
 *
 * Formats and displays test results with colors and diffs.
 */

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

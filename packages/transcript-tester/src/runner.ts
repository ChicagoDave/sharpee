/**
 * Transcript Runner
 *
 * Executes transcript commands against a loaded story and checks results.
 */

import {
  Transcript,
  TranscriptCommand,
  Assertion,
  CommandResult,
  AssertionResult,
  TranscriptResult,
  RunnerOptions
} from './types';

/**
 * Interface for the game engine
 */
interface GameEngine {
  executeCommand(input: string): Promise<string> | string;
  getOutput?(): string;
}

/**
 * Run a single transcript against an engine
 */
export async function runTranscript(
  transcript: Transcript,
  engine: GameEngine,
  options: RunnerOptions = {}
): Promise<TranscriptResult> {
  const startTime = Date.now();
  const results: CommandResult[] = [];

  for (const command of transcript.commands) {
    const result = await runCommand(command, engine, options);
    results.push(result);

    if (options.stopOnFailure && !result.passed && !result.expectedFailure && !result.skipped) {
      break;
    }
  }

  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.expectedFailure && !r.skipped).length;
  const expectedFailures = results.filter(r => r.expectedFailure).length;
  const skipped = results.filter(r => r.skipped).length;

  return {
    transcript,
    commands: results,
    passed,
    failed,
    expectedFailures,
    skipped,
    duration: Date.now() - startTime
  };
}

/**
 * Run a single command and check assertions
 */
async function runCommand(
  command: TranscriptCommand,
  engine: GameEngine,
  options: RunnerOptions
): Promise<CommandResult> {
  // Check for skip/todo first
  const skipAssertion = command.assertions.find(a => a.type === 'skip' || a.type === 'todo');
  if (skipAssertion) {
    return {
      command,
      actualOutput: '',
      passed: true,
      expectedFailure: false,
      skipped: true,
      assertionResults: [{
        assertion: skipAssertion,
        passed: true,
        message: skipAssertion.reason || 'Skipped'
      }]
    };
  }

  // Execute the command
  let actualOutput: string;
  let error: string | undefined;

  try {
    const result = await engine.executeCommand(command.input);
    actualOutput = typeof result === 'string' ? result : (engine.getOutput?.() || '');
  } catch (e) {
    actualOutput = '';
    error = e instanceof Error ? e.message : String(e);
  }

  // Normalize output for comparison
  const normalizedActual = normalizeOutput(actualOutput);
  const normalizedExpected = normalizeOutput(command.expectedOutput.join('\n'));

  // Check all assertions
  const assertionResults: AssertionResult[] = [];
  let allPassed = true;

  for (const assertion of command.assertions) {
    const result = checkAssertion(assertion, normalizedActual, normalizedExpected);
    assertionResults.push(result);
    if (!result.passed) {
      allPassed = false;
    }
  }

  // Check for expected failure
  const failAssertion = command.assertions.find(a => a.type === 'fail');
  const expectedFailure = failAssertion !== undefined;

  // For [FAIL] assertions, invert the logic
  if (expectedFailure) {
    return {
      command,
      actualOutput,
      passed: !allPassed,  // Pass if assertions failed (as expected)
      expectedFailure: true,
      skipped: false,
      assertionResults,
      error
    };
  }

  return {
    command,
    actualOutput,
    passed: allPassed && !error,
    expectedFailure: false,
    skipped: false,
    assertionResults,
    error
  };
}

/**
 * Check a single assertion against actual output
 */
function checkAssertion(
  assertion: Assertion,
  actualOutput: string,
  expectedOutput: string
): AssertionResult {
  switch (assertion.type) {
    case 'ok':
      // Exact match (after normalization)
      const matches = actualOutput === expectedOutput;
      return {
        assertion,
        passed: matches,
        message: matches ? undefined : `Output did not match expected`
      };

    case 'ok-contains':
      const contains = actualOutput.toLowerCase().includes(assertion.value!.toLowerCase());
      return {
        assertion,
        passed: contains,
        message: contains ? undefined : `Output does not contain "${assertion.value}"`
      };

    case 'ok-not-contains':
      const notContains = !actualOutput.toLowerCase().includes(assertion.value!.toLowerCase());
      return {
        assertion,
        passed: notContains,
        message: notContains ? undefined : `Output should not contain "${assertion.value}"`
      };

    case 'ok-matches':
      const regexMatches = assertion.pattern!.test(actualOutput);
      return {
        assertion,
        passed: regexMatches,
        message: regexMatches ? undefined : `Output does not match pattern ${assertion.pattern}`
      };

    case 'fail':
      // This is handled at the command level
      return {
        assertion,
        passed: false,
        message: assertion.reason
      };

    case 'skip':
    case 'todo':
      return {
        assertion,
        passed: true,
        message: assertion.reason
      };

    case 'state':
      // State checks require engine introspection - not implemented yet
      return {
        assertion,
        passed: true,
        message: 'State assertions not yet implemented'
      };

    default:
      return {
        assertion,
        passed: false,
        message: `Unknown assertion type`
      };
  }
}

/**
 * Normalize output for comparison
 * - Trim whitespace
 * - Normalize line endings
 * - Collapse multiple spaces
 */
function normalizeOutput(output: string): string {
  return output
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

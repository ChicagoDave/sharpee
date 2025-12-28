/**
 * Transcript Testing Types
 *
 * Defines the structure of parsed transcripts and test results.
 */

/**
 * Header metadata from a transcript file
 */
export interface TranscriptHeader {
  title?: string;
  story?: string;
  author?: string;
  description?: string;
  [key: string]: string | undefined;
}

/**
 * A single assertion about command output
 */
export interface Assertion {
  type: 'ok' | 'ok-contains' | 'ok-matches' | 'ok-not-contains' | 'fail' | 'skip' | 'todo' | 'state';
  value?: string;      // For contains/matches/state
  pattern?: RegExp;    // For regex matches
  reason?: string;     // For fail/todo
}

/**
 * A single command with its expected output and assertions
 */
export interface TranscriptCommand {
  lineNumber: number;
  input: string;
  expectedOutput: string[];
  assertions: Assertion[];
}

/**
 * A fully parsed transcript file
 */
export interface Transcript {
  filePath: string;
  header: TranscriptHeader;
  commands: TranscriptCommand[];
  comments: string[];
}

/**
 * Result of running a single command
 */
export interface CommandResult {
  command: TranscriptCommand;
  actualOutput: string;
  passed: boolean;
  expectedFailure: boolean;  // Was marked [FAIL]
  skipped: boolean;          // Was marked [SKIP] or [TODO]
  assertionResults: AssertionResult[];
  error?: string;
}

/**
 * Result of a single assertion check
 */
export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  message?: string;
}

/**
 * Result of running an entire transcript
 */
export interface TranscriptResult {
  transcript: Transcript;
  commands: CommandResult[];
  passed: number;
  failed: number;
  expectedFailures: number;
  skipped: number;
  duration: number;  // milliseconds
}

/**
 * Result of running multiple transcripts
 */
export interface TestRunResult {
  transcripts: TranscriptResult[];
  totalPassed: number;
  totalFailed: number;
  totalExpectedFailures: number;
  totalSkipped: number;
  totalDuration: number;
}

/**
 * Options for the test runner
 */
export interface RunnerOptions {
  verbose?: boolean;
  stopOnFailure?: boolean;
  updateExpected?: boolean;
  filter?: string;  // Only run commands matching this pattern
}

/**
 * Story loader function type
 */
export type StoryLoader = (storyPath: string) => Promise<{
  engine: any;  // GameEngine
  story: any;   // Story instance
}>;

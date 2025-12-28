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
 * A single assertion about command output, events, or state
 */
export interface Assertion {
  type: 'ok' | 'ok-contains' | 'ok-matches' | 'ok-not-contains' | 'fail' | 'skip' | 'todo'
      | 'event-count' | 'event-assert' | 'state-assert';
  value?: string;      // For contains/matches
  pattern?: RegExp;    // For regex matches
  reason?: string;     // For fail/todo

  // Event assertions
  eventCount?: number;          // For event-count assertion
  assertTrue?: boolean;         // For event-assert and state-assert: true = must exist, false = must not exist
  eventPosition?: number;       // For event-assert: optional 1-based position (omit for "any position")
  eventType?: string;           // For event-assert: the event type to match
  eventData?: Record<string, any>; // For event-assert: data properties to match

  // State assertions
  stateExpression?: string;     // For state-assert: the expression to evaluate (e.g., "egg.location = thief")
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
 * Simplified event info for test results
 */
export interface TestEventInfo {
  type: string;
  data: Record<string, any>;
}

/**
 * Result of running a single command
 */
export interface CommandResult {
  command: TranscriptCommand;
  actualOutput: string;
  actualEvents: TestEventInfo[];
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

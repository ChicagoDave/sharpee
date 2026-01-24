/**
 * Transcript Testing Types
 *
 * Defines the structure of parsed transcripts and test results.
 */

// ============================================================================
// Directive Types (ADR-092: Smart Transcript Directives)
// ============================================================================

/**
 * Types of control flow directives
 */
export type DirectiveType =
  | 'goal'        // [GOAL: name]
  | 'end_goal'    // [END GOAL]
  | 'requires'    // [REQUIRES: condition]
  | 'ensures'     // [ENSURES: condition]
  | 'if'          // [IF: condition]
  | 'end_if'      // [END IF]
  | 'while'       // [WHILE: condition]
  | 'end_while'   // [END WHILE]
  | 'navigate'    // [NAVIGATE TO: "Room Name"]
  | 'save'        // $save <name>
  | 'restore'     // $restore <name>
  | 'test-command'; // $teleport, $take, $kill, etc. (ext-testing)

/**
 * A control flow directive in the transcript
 */
export interface Directive {
  type: DirectiveType;
  lineNumber: number;
  condition?: string;   // For IF/WHILE/REQUIRES/ENSURES: the condition expression
  target?: string;      // For NAVIGATE: the target room name
  goalName?: string;    // For GOAL: the goal name
  saveName?: string;    // For SAVE/RESTORE: the checkpoint name
  testCommand?: string; // For test-command: the full $command input (e.g., "$teleport kitchen")
}

/**
 * A goal segment with its preconditions, postconditions, and content
 */
export interface GoalDefinition {
  name: string;
  lineNumber: number;
  requires: string[];   // Precondition expressions
  ensures: string[];    // Postcondition expressions
  startIndex: number;   // Index in items array where goal content starts
  endIndex: number;     // Index in items array where goal ends
}

/**
 * Result of executing a goal
 */
export interface GoalResult {
  name: string;
  success: boolean;
  requiresResults: ConditionResult[];
  ensuresResults: ConditionResult[];
  commandsExecuted: number;
  error?: string;
}

/**
 * Result of evaluating a condition
 */
export interface ConditionResult {
  met: boolean;
  reason: string;  // Human-readable explanation
}

/**
 * Result of executing a NAVIGATE directive
 */
export interface NavigateResult {
  success: boolean;
  path: string[];       // Room names traversed
  commands: string[];   // GO commands executed
  error?: string;
}

/**
 * A comment annotation from the transcript (# lines)
 */
export interface TranscriptComment {
  lineNumber: number;
  text: string;
}

/**
 * A transcript item - either a command, directive, or comment
 */
export interface TranscriptItem {
  type: 'command' | 'directive' | 'comment';
  command?: TranscriptCommand;
  directive?: Directive;
  comment?: TranscriptComment;
}

// ============================================================================
// Original Types
// ============================================================================

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
  commands: TranscriptCommand[];         // Legacy: just commands (for backwards compat)
  items?: TranscriptItem[];              // New: commands + directives in order
  goals?: GoalDefinition[];              // Parsed goal segments
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
/**
 * Interface for ext-testing extension (optional)
 */
export interface TestingExtensionInterface {
  executeTestCommand(input: string, world: any): { success: boolean; output: string[]; error?: string };
  /** Set context for annotation commands (called after each command execution) */
  setCommandContext?(command: string, response: string): void;
  /** Add an annotation directly (for # comments) */
  addAnnotation?(type: string, text: string, world: any): any;
}

export interface RunnerOptions {
  verbose?: boolean;
  stopOnFailure?: boolean;
  updateExpected?: boolean;
  filter?: string;  // Only run commands matching this pattern
  savesDirectory?: string;  // Directory for $save/$restore checkpoints
  testingExtension?: TestingExtensionInterface;  // Optional ext-testing integration
}

/**
 * Story loader function type
 */
export type StoryLoader = (storyPath: string) => Promise<{
  engine: any;  // GameEngine
  story: any;   // Story instance
}>;

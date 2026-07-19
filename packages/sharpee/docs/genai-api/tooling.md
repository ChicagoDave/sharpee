# Tooling

Build/CLI orchestration (devkit) and the transcript test engine.

---

## @sharpee/devkit

### commands/register

```typescript
/** `sharpee register <location> [--name <n>]` — upsert a name→path mapping. */
export declare function runRegister(args: string[]): void;
/** `sharpee list` — show registered stories, flagging stale entries. */
export declare function runList(): void;
```

### registry

```typescript
export interface Registry {
    stories: Record<string, {
        path: string;
    }>;
}
export interface RegistryEntry {
    name: string;
    path: string;
    /** true if the registered path no longer exists. */
    stale: boolean;
}
/** The registry file path (`~/.sharpee/devkit`; overridable via SHARPEE_DEVKIT_REGISTRY). */
export declare function registryPath(): string;
/** Read the registry, or an empty one if absent/unparseable. */
export declare function readRegistry(): Registry;
/**
 * Upsert a name→path mapping. Resolves `location` to an absolute path; the default
 * name is its basename. Returns the stored entry.
 * @throws if the location does not exist.
 */
export declare function registerStory(location: string, name?: string): {
    name: string;
    path: string;
};
/** All registered stories, each flagged stale if its path no longer exists. */
export declare function listStories(): RegistryEntry[];
/**
 * Resolve a registered name to its absolute path.
 * @throws if the name is registered but its path no longer exists (stale, never silently skipped).
 * @returns the path, or null if the name is not registered.
 */
export declare function lookupStory(name: string): string | null;
```

### repo

```typescript
/**
 * Walk up from `start` to the Sharpee monorepo root (the dir holding
 * pnpm-workspace.yaml AND packages/core — the monorepo signature, so an author's
 * coincidental pnpm workspace is not mistaken for it). Returns null if not found.
 */
export declare function findMonorepoRoot(start?: string): string | null;
/**
 * The monorepo root, or throw. Use when an operation is monorepo-only.
 * @throws if not inside the Sharpee monorepo.
 */
export declare function findRepoRoot(start?: string): string;
/**
 * 'monorepo' when run inside the Sharpee monorepo (build platform + bundle + in-repo
 * stories); 'standalone' when run in an author's own project (build their story via its
 * own toolchain). The location-aware split behind `sharpee build` (ADR-180 unify).
 */
export declare function detectMode(start?: string): 'monorepo' | 'standalone';
/**
 * Resolve a story name to its directory (build.sh resolve_story_dir, 39-48):
 * `stories/<name>` then `tutorials/<name>`. Returns absolute path or null.
 */
export declare function resolveStoryDir(root: string, name: string): string | null;
/** The story version.ts path build.sh stamps (stories/<name> only — tutorials are NOT stamped). */
export declare function storyVersionFile(root: string, name: string): string;
export interface ResolvedStory {
    /** Story slug (directory basename). */
    name: string;
    /** Absolute story directory. */
    dir: string;
    /** The story's real `package.json` name (the pnpm `--filter` target); null if absent. */
    pkg: string | null;
    /** True iff dir is a direct child of <root>/stories or <root>/tutorials. */
    inRepo: boolean;
    /** True iff dir is under <root>/stories (build.sh stamps version.ts only for these). */
    underStories: boolean;
    /**
     * True iff the story is a monorepo workspace member — detected by a `workspace:*`
     * dependency. A story with published (non-workspace) deps is a *decoupled*
     * standalone project that builds via its own toolchain even inside the repo
     * (e.g. the Family Zoo tutorial), so it is NOT built via `pnpm --filter`.
     */
    workspace: boolean;
}
/**
 * Resolve a story given either a **path** (a directory with a package.json, tried
 * relative to cwd then to root) or a bare **name** (stories/<name> then tutorials/<name>).
 * Returns null if neither resolves. This is the single resolver `build` + `stampVersions`
 * share, so path and name forms behave identically (ADR-180 Decision 4: a story is a location).
 */
export declare function resolveStory(root: string, nameOrPath: string): ResolvedStory | null;
/** Read a package.json's `version` field. */
export declare function readVersion(pkgJsonPath: string): string;
```

## @sharpee/transcript-tester

### types

```typescript
/**
 * Transcript Testing Types
 *
 * Defines the structure of parsed transcripts and test results.
 */
/**
 * Types of control flow directives
 */
export type DirectiveType = 'goal' | 'end_goal' | 'requires' | 'ensures' | 'if' | 'end_if' | 'while' | 'end_while' | 'retry' | 'end_retry' | 'do' | 'until' | 'navigate' | 'save' | 'restore' | 'test-command';
/**
 * A control flow directive in the transcript
 */
export interface Directive {
    type: DirectiveType;
    lineNumber: number;
    condition?: string;
    target?: string;
    goalName?: string;
    saveName?: string;
    testCommand?: string;
    maxRetries?: number;
    untilTexts?: string[];
}
/**
 * A goal segment with its preconditions, postconditions, and content
 */
export interface GoalDefinition {
    name: string;
    lineNumber: number;
    requires: string[];
    ensures: string[];
    startIndex: number;
    endIndex: number;
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
    reason: string;
}
/**
 * Result of executing a NAVIGATE directive
 */
export interface NavigateResult {
    success: boolean;
    path: string[];
    commands: string[];
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
/**
 * Header metadata from a transcript file
 */
export interface TranscriptHeader {
    title?: string;
    story?: string;
    /** Optional story sub-entry to load (e.g. `v16` → dist/v16.js). ADR-180. */
    entry?: string;
    author?: string;
    description?: string;
    [key: string]: string | undefined;
}
/**
 * A single assertion about command output, events, or state
 */
export interface Assertion {
    type: 'ok' | 'ok-contains' | 'ok-contains-any' | 'ok-matches' | 'ok-not-contains' | 'fail' | 'skip' | 'todo' | 'event-count' | 'event-assert' | 'state-assert';
    value?: string;
    values?: string[];
    pattern?: RegExp;
    reason?: string;
    eventCount?: number;
    assertTrue?: boolean;
    eventPosition?: number;
    eventType?: string;
    eventData?: Record<string, any>;
    stateExpression?: string;
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
    items?: TranscriptItem[];
    goals?: GoalDefinition[];
    comments: string[];
}
/**
 * Snapshot of an entity's traits at the time of event capture.
 * Used by --emit-traits to show trait state for entities referenced in events.
 */
export interface EntityTraitSnapshot {
    entityId: string;
    traits: Record<string, Record<string, any>>;
}
/**
 * Simplified event info for test results
 */
export interface TestEventInfo {
    type: string;
    data: Record<string, any>;
    /** Trait snapshots for entities referenced in event data. Only populated with --emit-traits. */
    entityTraits?: EntityTraitSnapshot[];
}
/**
 * Result of running a single command
 */
export interface CommandResult {
    command: TranscriptCommand;
    actualOutput: string;
    actualEvents: TestEventInfo[];
    passed: boolean;
    expectedFailure: boolean;
    skipped: boolean;
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
    duration: number;
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
    executeTestCommand(input: string, world: any): {
        success: boolean;
        output: string[];
        error?: string;
    };
    /** Set context for annotation commands (called after each command execution) */
    setCommandContext?(command: string, response: string): void;
    /** Add an annotation directly (for # comments) */
    addAnnotation?(type: string, text: string, world: any): any;
}
export interface RunnerOptions {
    verbose?: boolean;
    emitTraits?: boolean;
    stopOnFailure?: boolean;
    updateExpected?: boolean;
    filter?: string;
    savesDirectory?: string;
    testingExtension?: TestingExtensionInterface;
}
/**
 * Story loader function type
 */
export type StoryLoader = (storyPath: string) => Promise<{
    engine: any;
    story: any;
}>;
```

### parser

```typescript
/**
 * Transcript Parser
 *
 * Parses .transcript files into a structured format for testing.
 */
import { Transcript } from './types.js';
/**
 * Parse a transcript file from disk
 */
export declare function parseTranscriptFile(filePath: string): Transcript;
/**
 * Parse transcript content string
 */
export declare function parseTranscript(content: string, filePath?: string): Transcript;
/**
 * Validate a transcript for common issues
 */
export declare function validateTranscript(transcript: Transcript): string[];
```

### runner

```typescript
/**
 * Transcript Runner
 *
 * Executes transcript commands against a loaded story and checks results.
 */
import { Transcript, TranscriptResult, RunnerOptions } from './types.js';
/**
 * Interface for the game engine
 */
interface GameEngine {
    executeCommand(input: string): Promise<string> | string;
    getOutput?(): string;
    lastEvents?: Array<{
        type: string;
        data?: any;
    }>;
    world?: WorldModel;
    /** Plugin registry for save/restore of plugin state (state machines, scheduler) */
    getPluginRegistry?(): {
        getStates(): Record<string, unknown>;
        setStates(states: Record<string, unknown>): void;
    };
}
/**
 * Minimal interface for world model state queries
 */
interface WorldModel {
    getEntityById?(id: string): any;
    getEntity?(id: string): any;
    findEntityByName?(name: string): any;
    getAllEntities?(): any[];
    getLocation?(entityId: string): string | undefined;
    getContents?(containerId: string, options?: {
        includeWorn?: boolean;
    }): any[];
    findWhere?(predicate: (entity: any) => boolean): any[];
    findByTrait?(traitType: string): any[];
    findPath?(fromRoomId: string, toRoomId: string): string[] | null;
    getPlayer?(): any;
    toJSON?(): string;
    loadJSON?(json: string): void;
}
/**
 * Minimal subset of WorldModel needed by the condition evaluator and navigator.
 */
export interface WorldModelLike {
    getLocation(entityId: string): string | null | undefined;
    getContents(containerId: string, options?: {
        includeWorn?: boolean;
    }): any[];
    getEntity(entityId: string): any | null | undefined;
    findWhere(predicate: (entity: any) => boolean): any[];
    getAllEntities(): any[];
    findByTrait(traitType: string): any[];
    findPath(fromRoomId: string, toRoomId: string): string[] | null;
}
/**
 * Run a single transcript against an engine
 *
 * If transcript has items (with directives), use the smart runner.
 * Otherwise, fall back to legacy command-only execution.
 */
export declare function runTranscript(transcript: Transcript, engine: GameEngine, options?: RunnerOptions): Promise<TranscriptResult>;
export {};
```

### reporter

```typescript
/**
 * Transcript Test Reporter
 *
 * Formats and displays test results with colors and diffs.
 */
import { TranscriptResult, TestRunResult } from './types.js';
/**
 * Report options
 */
export interface ReporterOptions {
    verbose?: boolean;
    emitTraits?: boolean;
    showDiff?: boolean;
    color?: boolean;
}
/**
 * Report results of running a single transcript
 */
export declare function reportTranscript(result: TranscriptResult, options?: ReporterOptions): void;
/**
 * Report results of running multiple transcripts
 * Note: Individual transcripts should already be reported as they run.
 * This function only shows the aggregate summary.
 */
export declare function reportTestRun(result: TestRunResult, options?: ReporterOptions): void;
/**
 * Get exit code based on results
 */
export declare function getExitCode(result: TestRunResult): number;
/**
 * Generate a timestamp string for filenames
 */
export declare function generateTimestamp(): string;
/**
 * Write test results to a JSON file
 */
export declare function writeResultsToJson(result: TestRunResult, outputDir: string, timestamp: string): string;
/**
 * Write a human-readable report to a text file
 */
export declare function writeReportToFile(result: TestRunResult, outputDir: string, timestamp: string): string;
```

### trait-formatter

```typescript
/**
 * Trait-to-prose formatter.
 *
 * Converts raw trait snapshots into human-readable summaries.
 * Each trait type has a dedicated template; unknown traits fall back to compact JSON.
 *
 * Public interface: formatEntityTraits(), formatTraitProse()
 * Owner context: transcript-tester display layer
 */
import { EntityTraitSnapshot } from './types.js';
/**
 * Format all entity trait snapshots as prose lines for CLI display.
 * Returns an array of formatted lines (no leading whitespace — caller indents).
 */
export declare function formatEntityTraitLines(snapshots: EntityTraitSnapshot[]): string[];
/**
 * Format a single trait's properties as a prose string.
 */
export declare function formatTraitProse(traitType: string, props: Record<string, any>): string;
```

### story-loader

```typescript
/**
 * Story Loader — thin facade over @sharpee/bootstrap (ADR-180).
 *
 * Story loading/assembly now lives in @sharpee/bootstrap — the single loader
 * shared by transcript-tester, the CLI bundle, and devkit. This module keeps
 * the historical export surface (loadStory / createTestableGame / TestableGame /
 * findTranscripts) and threads the optional `entry:` sub-entry through.
 *
 * Owner context: transcript-tester (test harness).
 */
import { type LoadedGame } from '@sharpee/bootstrap';
/** A loaded, runnable game — now provided by @sharpee/bootstrap. */
export type TestableGame = LoadedGame;
/**
 * Load a story from a path (entry-aware) and create a testable game instance.
 *
 * @param storyPath story directory (resolved against cwd if relative)
 * @param entry     optional story sub-entry from the transcript `entry:` header
 */
export declare function loadStory(storyPath: string, entry?: string): Promise<TestableGame>;
/**
 * Assemble a testable game from an already-loaded story instance.
 */
export declare function createTestableGame(story: any): TestableGame;
/**
 * Find all transcript files in a directory.
 */
export declare function findTranscripts(dir: string, pattern?: string): string[];
```

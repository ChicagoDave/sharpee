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

### standalone/browser-core

```typescript
/**
 * browser-core.ts — the ONE browser-build core (ADR-252 D5).
 *
 * Both callers — devkit's author build (`sharpee build <file>.story`) and
 * repokit's in-repo build (`./repokit build --browser <story>`) — run this
 * core. They differ ONLY in resolution mode (where platform-browser's styles,
 * the templates, and the esbuild alias resolve from), which is injected as a
 * `BrowserBuildEnv`. The core owns all build *logic*; the caller owns *where
 * things resolve*. This is the rule-8b collapse of the two copy-drifted builds
 * (`devkit/standalone/build-browser.ts` + `tools/repokit/src/commands/browser.ts`).
 *
 * Owner context: @sharpee/devkit (author tool, ADR-187). repokit depends on the
 * workspace and delegates here rather than reimplementing.
 *
 * Public interface: BrowserMeta, BrowserClientConfig, BrowserBuildEnv,
 * buildBrowser(); plus the theme-wiring helpers (WiredTheme, resolveWiredThemes,
 * copyWiredThemes, injectThemes) and escapeHtml, shared by both callers.
 */
import type { IRMeta } from '@sharpee/chord';
/** Browser-app identity — sourced from `IRMeta`, never from package.json (D2). */
export interface BrowserMeta {
    /** `meta.fields.id` — the output slug (dist/web/<id>) + storage-prefix default. */
    storyId: string;
    /** `meta.title`. */
    storyTitle: string;
    /** `meta.author`. */
    author: string;
    /** `meta.fields.version`. */
    version: string;
    /** `meta.fields.blurb`. */
    blurb: string;
}
/** Browser-client config — from `story`-header `key:` lines in `meta.fields` (D3). */
export interface BrowserClientConfig {
    /** `client:` — the client target (D1 defaults it to `browser`). */
    client: string;
    /** `theme:` — the theme PACKAGE the story uses (ADR-188), or null. */
    theme: string | null;
    /** `template:` — the template/layout PACKAGE (ADR-253), or null. */
    template: string | null;
    /** `themes:` — comma-split in-client theme-menu ids. */
    themes: string[];
    /** `default-theme:` — boot theme; declared `theme:` else `classic`. */
    defaultTheme: string;
    /** `storage-prefix:` — save-storage key prefix; defaults to the story id. */
    storagePrefix: string;
}
/**
 * Header `key:` lines the build understands (D3). Any `meta.fields` key outside
 * this set is an author typo or a stray field — the build keeps it (the parser
 * captures every `key:` line) but warns, so `tempate:` is visible, not dropped.
 * `states`/`score` header lines are special-cased by the parser and never land
 * in `meta.fields`, so they never appear here.
 */
export declare const KNOWN_HEADER_KEYS: ReadonlySet<string>;
/**
 * Derive the browser-app metadata from the compiled Story IR (D2). All identity
 * comes from the `.story` header — never package.json / src/index.ts.
 * @throws if the story declares no `id:` (the output slug + storage prefix key).
 */
export declare function readBrowserMeta(meta: IRMeta): BrowserMeta;
/**
 * Derive the browser-client config from `meta.fields` (D3), applying every
 * documented default. Returns the config plus a warning per unrecognized header
 * key (D3 rejection case) — the caller surfaces them, so a typo is not silent.
 */
export declare function readClientConfig(meta: IRMeta): {
    config: BrowserClientConfig;
    warnings: string[];
};
/** A theme wired into the build (ADR-188). */
export interface WiredTheme {
    id: string;
    name: string;
    /** Absolute path to a BUILT-IN theme's CSS (copied into dist/web/themes/), or
     *  null for an AUTHOR theme whose `[data-theme]` block lives in the author
     *  override stylesheet (browser/<package-name>.css) — nothing to copy or link. */
    cssPath: string | null;
    /** Dir holding the built-in CSS + its assets (platform-browser's styles/themes),
     *  or null for an author theme. */
    srcDir: string | null;
    /** Sibling dirs (e.g. `system-6`) to copy alongside a built-in's CSS. */
    assets: string[];
}
/** A built-in theme's entry in platform-browser's styles/themes/manifest.json. */
export interface BuiltinThemeEntry {
    name: string;
    css: string;
    assets?: string[];
}
/**
 * Resolve the themes a story lists. Each entry is either:
 *  - a string id of a BUILT-IN theme (shipped by @sharpee/platform-browser under
 *    styles/themes/, looked up in `themesDir`'s manifest.json), or
 *  - an inline `{ id, name }` for the author's OWN theme — its `[data-theme]`
 *    token block lives in the author override stylesheet (browser/<package-name>.css),
 *    so the build only adds a menu entry.
 * Explicit opt-in; no scanning (AC-9). `classic` is the engine default and is
 * always present, so it need not be listed.
 *
 * @param themesDir platform-browser's styles/themes/ directory
 * @param entries   the story's declared theme entries (built-in ids / { id, name })
 * @throws on an unknown built-in id or a malformed entry.
 */
export declare function resolveWiredThemes(themesDir: string, entries: unknown[]): WiredTheme[];
/**
 * Copy each BUILT-IN theme's CSS to `<outDir>/themes/<id>.css` and its declared
 * sibling assets into `<outDir>/themes/` so relative `@font-face` URLs resolve.
 * Author themes copy nothing (their CSS is in the override stylesheet). The
 * `themes/` dir is rebuilt from scratch so a de-listed theme never lingers.
 */
export declare function copyWiredThemes(themes: WiredTheme[], outDir: string): void;
/** Escape the four HTML-significant characters for text injected into index.html. */
export declare function escapeHtml(s: string): string;
/**
 * Wire the resolved themes into index.html: a `<link>` for each BUILT-IN theme at
 * the THEME_LINKS marker (after the engine CSS; author themes need no link, their
 * CSS is in the override stylesheet), and a regenerated `#theme-menu` — the
 * `classic` default + one item per listed theme (ADR-188).
 */
export declare function injectThemes(html: string, themes: WiredTheme[]): string;
/**
 * Resolution-mode injection (ADR-252 D5). The two callers differ ONLY in where
 * platform-browser's styles, the templates, and the esbuild alias resolve from,
 * and where the output tree lands. Everything else is core logic.
 */
export interface BrowserBuildEnv {
    /** platform-browser's styles/ dir (engine CSS + built-in themes/). */
    stylesDir: string;
    /** The devkit templates/browser dir (index.html + entry template) — the ONE
     *  canonical template both callers share, so their output matches (D5). */
    templatesDir: string;
    /** cwd for esbuild + the root under which `dist/web/<id>` is written
     *  (author: the project dir; in-repo: the repo root). Both resolve @sharpee/*
     *  from node_modules via `--conditions=require`, so the bundle is identical —
     *  no in-repo alias fork (byte-identical parity, verified). */
    esbuildCwd: string;
    /** The platform (engine) version stamped into the story's version.ts. */
    engineVersion: string;
    /** Post-build mirror (in-repo: website/public/web/<id>); undefined in author mode. */
    mirror?: (outDir: string, storyId: string) => void;
}
/** Per-invocation build knobs. */
export interface BrowserBuildOpts {
    minify?: boolean;
    sourcemap?: boolean;
    quiet?: boolean;
    /** Fixed build stamp (BUILD_DATE); defaults to now. Injected by the AC test so
     *  the two callers' output is byte-identical, not merely identical-modulo-stamp. */
    buildDate?: string;
}
/**
 * Build a Chord `.story` into a self-contained browser app (ADR-252). Compiles
 * the story as the fail-fast gate, derives ALL metadata + client config from the
 * IR (never package.json — D2/D3), ships the source for compile-at-boot (ADR-210),
 * bundles the entry (hand-written escape hatch, else generated — D4), wires the
 * page + engine CSS + themes, and asserts the deliverable. The two callers differ
 * only in `env`.
 *
 * Synchronous: esbuild runs via execFileSync, so there is no async work — callers
 * invoke it directly (no await needed).
 *
 * @param storyFile absolute path to the `.story` file
 * @param env       resolution-mode injection (D5)
 * @param opts      per-invocation knobs
 * @returns the output directory (`<cwd>/dist/web/<id>`)
 * @throws on gate errors, declared hatches, an unknown `client:`, or an empty bundle
 */
export declare function buildBrowser(storyFile: string, env: BrowserBuildEnv, opts?: BrowserBuildOpts): string;
/** Resolution-mode injection for the playground build (cf. BrowserBuildEnv). */
export interface PlaygroundBuildEnv {
    /** platform-browser's styles/ dir (engine CSS). */
    stylesDir: string;
    /** The devkit templates/browser dir (index.html + playground entry template). */
    templatesDir: string;
    /** cwd for esbuild + the root under which `dist/playground` is written. */
    esbuildCwd: string;
    /** The platform (engine) version — the pinned playground version (AC-8). */
    engineVersion: string;
    /** Version-pinned sync of the built bundle (in-repo: website/public/playground/v<X.Y.Z>/). */
    sync?: (outDir: string, version: string) => void;
}
/**
 * Build the story-agnostic playground bundle (ADR-191 Phase 1) into
 * `<esbuildCwd>/dist/playground/`: a generated entry that compiles `.story`
 * source supplied at runtime (compile → IR → story-loader → engine), the
 * default player-pane page, engine CSS, and a stamped version.ts (version =
 * platform `X.Y.Z`). No story is baked in; no wasm. On success, calls
 * `env.sync?.(outDir, version)` to version-pin it into the website.
 *
 * @param env  resolution-mode injection
 * @param opts per-invocation knobs (minify/sourcemap/quiet/buildDate)
 * @returns the output directory (`<cwd>/dist/playground`)
 * @throws if game.js is missing or empty after esbuild (no silent empty build)
 */
export declare function buildPlaygroundBundle(env: PlaygroundBuildEnv, opts?: BrowserBuildOpts): string;
```

### standalone/author-game

```typescript
import type { LoadedGame } from '@sharpee/bootstrap';
export { requireHatchModule } from './hatch-transpile.js';
/**
 * Build an fs-backed `importResolver` for `compile()` (ADR-251 Phase 2).
 * The compiler appends `.chord` and hands us the full fragment name (e.g.
 * `"regions/harbor.chord"`); we read it relative to the `.story` file's
 * directory. A missing file resolves to `null` (the compiler's
 * unresolved-import contract → `analysis.import-unresolved`); any other fs
 * error propagates. Keeps @sharpee/chord filesystem-free — the host owns
 * the base directory, exactly as `requireHatchModule` does for hatches.
 *
 * @param storyDir directory of the importing `.story` file
 * @returns a resolver mapping `<name>.chord` → source text or null
 */
export declare function makeFsImportResolver(storyDir: string): (fragmentName: string) => string | null;
/**
 * Find the project's Chord source: exactly one root-level `.story` file.
 *
 * @param dir project directory
 * @returns the `.story` file's absolute path, or null when the project has
 *   none (a module project)
 * @throws when more than one `.story` file exists — ambiguity is an error
 *   with the candidates named, never a guess (house never-guess rule)
 */
export declare function findStoryFile(dir: string): string | null;
/**
 * Compile a Chord `.story` file and construct its story via
 * @sharpee/story-loader (hatches bound). Load-time-gate diagnostics abort
 * with `.story` line numbers (ADR-210 AC-3).
 *
 * @param storyFile absolute or cwd-relative path to the `.story` file
 * @returns the constructed story instance (not yet assembled into a game)
 * @throws on gate errors, with every diagnostic in the message
 */
export declare function loadChordStory(storyFile: string): unknown;
/**
 * Load an author project (or an explicit `.story` file) into a runnable game.
 *
 * @param target a project directory, or a path ending in `.story`
 * @param opts.entry optional story sub-entry (module projects only; ignored
 *   for `.story` sources, matching the platform bundle's contract)
 * @returns the assembled game (engine + channel packet plumbing)
 * @throws on gate errors, ambiguous `.story` sets, or unresolvable modules
 */
export declare function loadAuthorGame(target: string, opts?: {
    entry?: string;
}): Promise<LoadedGame>;
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
    /** Resume a game-over-stopped engine after a world snapshot restore (RETRY death recovery). */
    reviveEngine?(): void;
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
    getContents?(containerId: string): any[];
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
    getContents(containerId: string): any[];
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

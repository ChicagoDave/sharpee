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
    /** `meta.fields.authors`, joined ", " — display string (ADR-298). */
    author: string;
    /** `meta.fields.storyVersion` (ADR-298 rename of `version:`). */
    version: string;
    /** `meta.fields.description` (ADR-298 rename of `blurb:`). */
    description: string;
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
 * Derive the browser-app metadata from the compiled Story IR (D2). All identity
 * comes from the `.story` header — never package.json / src/index.ts.
 * @throws if the story declares no `id:` (the output slug + storage prefix key).
 */
export declare function readBrowserMeta(meta: IRMeta): BrowserMeta;
/**
 * Derive the browser-client config from the typed header fields (ADR-252 D3
 * via the ADR-298 amendment, GH #221), applying every documented default.
 * `warnings` is retained for the caller contract but is always empty now —
 * the closed header schema (ADR-298 D4) makes an unknown key a compile-time
 * parse error, so a typo like `tempate:` never reaches this function.
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
 * @param seed master seed for the chord evaluator's stream (ADR-293 D1);
 *   omitted, the stream is time-seeded (interactive play with no pin)
 * @returns the constructed story instance (not yet assembled into a game)
 * @throws on gate errors, with every diagnostic in the message
 */
export declare function loadChordStory(storyFile: string, seed?: number): unknown;
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
    seed?: number;
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
import type { RandomForceSpec } from '@sharpee/core';
import type { CoverageTracker } from './coverage.js';
/**
 * Directive kinds surviving ADR-294 D4. The control-flow/condition layer
 * (IF, WHILE, RETRY, DO/UNTIL, REQUIRES, ENSURES, NAVIGATE) is removed
 * grammar — the parser rejects those forms as named errors. GOAL survives
 * as pure structural annotation (a section label; nothing is evaluated).
 */
export type DirectiveType = 'goal' | 'end_goal' | 'save' | 'restore' | 'test-command';
/**
 * A directive in the transcript
 */
export interface Directive {
    type: DirectiveType;
    lineNumber: number;
    goalName?: string;
    saveName?: string;
    testCommand?: string;
}
/**
 * A goal segment — a named section of the transcript (structural only;
 * ADR-294 D4 removed the REQUIRES/ENSURES condition layer).
 */
export interface GoalDefinition {
    name: string;
    lineNumber: number;
    startIndex: number;
    endIndex: number;
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
 * Parsed, validated run configuration from the transcript header (ADR-294 D3).
 *
 * The parser always attaches one to the transcript with defaults applied, so
 * consumers never re-derive defaults from the raw header map.
 */
export interface TranscriptRunConfig {
    /**
     * Pinned seeds: one entry from `seed: N`, several from `seeds: A, B` (D8 —
     * each seed gets its own recording). Empty when the transcript pins nothing
     * (legal in the assertion tier; a golden transcript must pin at least one).
     */
    seeds: number[];
    /** Channels the recording scopes to (D15). Default: `[]` (ADR-300 D8). */
    channels: string[];
    /** Record the event stream alongside prose (D6). Default: `false`. */
    events: boolean;
    /** Locale the recording is bound to (D19). Absent = the story's primary. */
    locale?: string;
    /**
     * Declared outcome forces (ADR-293 D8/D9, surfaced per ADR-294 D13), as
     * canonical `point[#occurrence]=CLASS` strings — the provenance form.
     * Parsed and validated by the parser; the structured specs live in
     * `forceSpecs`.
     */
    forces: string[];
    /**
     * Structured force specs the runner loads into the engine (ADR-293 D8/D9).
     * Transcript forces are always mode `once` (D9's transcript default).
     * Present only when the transcript declares forces, so a force-less
     * transcript's config stays byte-identical to its pre-Phase-C parse.
     */
    forceSpecs?: RandomForceSpec[];
    /** Line the `forces:` header field appeared on, for load-error reporting. */
    forcesLineNumber?: number;
    /**
     * Per-point starting-seed overrides (ADR-293 D11), from the `point-seed:`
     * header field. Present only when the transcript declares overrides.
     */
    pointSeeds?: Array<{
        point: string;
        seed: number;
    }>;
    /** Line the `point-seed:` header field appeared on, for error reporting. */
    pointSeedsLineNumber?: number;
}
/**
 * Provenance header of a `.golden` recording (ADR-294 D3/D7).
 *
 * A replay whose runtime disagrees with any of these fails with the named
 * "stale recording — re-bless" error, never a raw content diff.
 */
export interface GoldenProvenance {
    /** Source transcript filename the recording was made from. */
    transcript: string;
    /** Story name the recording was made against. */
    story: string;
    /** The seed the session was pinned to. One recording per seed (D8). */
    seed: number;
    /** `SEED_DERIVATION_VERSION` at record time (ADR-293). */
    derivation: number;
    /** Save-format version at record time (e.g. `3.0.0`). */
    saveFormat: string;
    /** Channels captured by this recording (D15). */
    channels: string[];
    /** Whether the recording includes event lines (D6). */
    events: boolean;
    /** Locale the recorded prose is bound to (D19). */
    locale: string;
    /** Forces the recording was made under (D13). Serialized as `(none)` when empty. */
    forces: string[];
    /**
     * Point-seed overrides the recording was made under (ADR-293 D11), as
     * `point=seed` strings. OPTIONAL in the format: the `point-seeds:` line is
     * written only when non-empty, so pre-Phase-C recordings stay valid, and
     * absence parses as empty.
     */
    pointSeeds?: string[];
}
/**
 * One recorded event line (`• type {json}`) inside a golden turn.
 *
 * The JSON payload is kept as its raw string so a parse → serialize round
 * trip is byte-faithful (re-stringifying could reorder keys or reformat
 * numbers, which would show up as phantom recording diffs).
 */
export interface GoldenEvent {
    type: string;
    json: string;
}
/** One recorded turn: the command and its output, verbatim (ADR-294 D7). */
export interface GoldenTurn {
    /** The command as typed, without the `> ` prefix. */
    command: string;
    /** Recorded output lines, verbatim — blank lines and indentation preserved. */
    output: string[];
    /** Present only when the recording's provenance says `events: true`. */
    events?: GoldenEvent[];
    /**
     * Declared non-`main` channel captures (ADR-294 D15): flattened lines per
     * channel id, in emission order. Present only when the provenance declares
     * channels beyond `main` AND the channel emitted this turn — a declared
     * channel that emitted nothing has no key (sparse; absence is diffed).
     */
    channels?: Record<string, string[]>;
}
/** A parsed `.golden` recording: provenance plus the recorded turns. */
export interface GoldenRecording {
    provenance: GoldenProvenance;
    turns: GoldenTurn[];
}
/**
 * A single assertion about command output, events, or state.
 *
 * The retained assertion-tier DSL (ADR-294 D2): exact match, contains,
 * not-contains, expected failure, skip/todo, and the event/state pins.
 * The fuzzy forms (`ok-any`, `contains_any`, `matches`) are removed
 * grammar — at a pinned seed there is exactly one output.
 */
export interface Assertion {
    type: 'ok' | 'ok-contains' | 'ok-not-contains' | 'fail' | 'skip' | 'todo' | 'event-assert' | 'state-assert' | 'channel-contains' | 'channel-not-contains';
    value?: string;
    reason?: string;
    /**
     * Channel this assertion reads, for the `channel-*` forms.
     *
     * `[OK: contains "…"]` reads the main prose, which is where a command's
     * response goes. Everything else the story says — the banner, the prologue,
     * the status line — travels on its own channel, and naming one here is how a
     * transcript asserts on it. Must be declared in the transcript's `channels:`
     * header, or there is nothing captured to read.
     */
    channelId?: string;
    assertTrue?: boolean;
    eventPosition?: number;
    eventType?: string;
    eventData?: Record<string, any>;
    stateExpression?: string;
    /**
     * Literal `text` block content (ADR-287 D1), one entry per line,
     * uninterpreted — brackets, `>`, `#`, quotes, blank lines and leading
     * whitespace all survive verbatim. Storage is byte-faithful even though
     * MATCHING normalizes; that distinction is why the block delimiter is a
     * keyword and not indentation.
     *
     * Set only on `ok` (exact match against the block) and payload-less
     * `ok-contains` (the block is the fragment). Stored separately from
     * `TranscriptCommand.expectedOutput` so D1's "a block or a classic block,
     * never both" stays checkable rather than conflated.
     */
    block?: string[];
    /**
     * Line of the assertion tag this block hangs off, for failure display.
     *
     * Deliberately set ONLY on block assertions: stamping every assertion would
     * change the parse of all 182 existing transcripts and break ADR-287 D2's
     * byte-identical guarantee (tests/parse-baseline.test.ts).
     */
    lineNumber?: number;
}
/**
 * A structural problem found while parsing, carrying the line it occurred on.
 *
 * These cannot be recovered from a finished AST — an unclosed block leaves no
 * trace once parsing has swallowed the rest of the file — so the parser records
 * them as it goes and `validateTranscript` merges them into its report.
 */
export interface ParseError {
    lineNumber: number;
    message: string;
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
    /**
     * Assertions about the game's opening, written above the first command.
     *
     * The banner and the prologue happen before anything is typed, so an
     * assertion about them has no command to hang off. These run once, against
     * what the story emitted on the way up. Absent when the transcript makes no
     * claim about the opening, which is nearly all of them.
     */
    opening?: Assertion[];
    goals?: GoalDefinition[];
    comments: string[];
    /**
     * Structural parse failures (ADR-287 AC4), surfaced via `validateTranscript`.
     *
     * Absent — not an empty array — when the file parsed cleanly, so a clean
     * transcript's AST is byte-identical to its pre-block parse (ADR-287 D2).
     */
    parseErrors?: ParseError[];
    /**
     * Master seed pinned by the `seed:` header field (ADR-293 D14 as amended by
     * ADR-294 D3 — the body-positional `[SEED:]` directive is a parse error).
     * Set only by the singular `seed:` form; a `seeds:` matrix (D8) lives in
     * `config.seeds` and is threaded per-recording by the runner. In a chain,
     * only the first transcript's seed is honored — the CLI rejects a pin on a
     * later chain member as a loud error.
     */
    seed?: number;
    /** Line the `seed:` header field appeared on, for chain-rule error reporting. */
    seedLineNumber?: number;
    /**
     * Validated run configuration from the header (ADR-294 D3), defaults
     * applied. Always set by the parser; optional only so hand-built
     * transcript literals in older tests keep compiling.
     */
    config?: TranscriptRunConfig;
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
    /**
     * Golden replay divergence (ADR-294 D1): the recorded output and the
     * actual output for this turn, verbatim. Present exactly when a golden
     * diff failed this command; the reporter renders the line diff.
     */
    diff?: {
        recorded: string[];
        actual: string[];
    };
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
    /**
     * Per-transcript outcome (ADR-277 D1). `error` = the transcript never ran
     * (validation or story-load failure) — it still gets a result record
     * instead of vanishing from the run.
     */
    status: 'passed' | 'failed' | 'error';
    passed: number;
    failed: number;
    expectedFailures: number;
    skipped: number;
    duration: number;
    /** Present exactly when `status` is `'error'`: why the transcript never ran. */
    errorMessage?: string;
    /**
     * Which tier ran (ADR-294 D2): `golden` when a recording exists (or was
     * being created), `assertion` otherwise. Absent on `error` results that
     * never reached tier selection.
     */
    tier?: 'golden' | 'assertion';
    /** Path of the `.golden` recording this run diffed against or created. */
    goldenPath?: string;
    /** True when this run created or overwrote the recording (`--bless`). */
    blessed?: boolean;
    /**
     * Path of the divergence save written on a failed golden replay (ADR-294
     * D18): a real save (world, turn counter, RNG stream states) captured at
     * the last matching turn. Working artifact, never committed.
     */
    divergenceSavePath?: string;
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
    /** Count of transcripts with `status: 'error'` (ADR-277 D1). */
    totalErrors: number;
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
    /** Continue the RUN after a failed transcript. Never suppresses a failure (ADR-294 D5). */
    stopOnFailure?: boolean;
    savesDirectory?: string;
    testingExtension?: TestingExtensionInterface;
    /** Create/overwrite the recording instead of diffing against it (ADR-294 D1). */
    bless?: boolean;
    /** Recording path override; defaults to the transcript's `.golden` sibling (D7). */
    goldenPath?: string;
    /**
     * This transcript runs as a chain member (one session across transcripts).
     * Later members legally pin no seed; their recordings carry the session
     * seed, and replaying one standalone is refused (D7).
     */
    chain?: boolean;
    /**
     * The channels the session's game was assembled with (ADR-294 D15) — the
     * capability profile and capture set are fixed at assembly, so a
     * transcript declaring a different channels: set is a named failure.
     * Absent (unit stubs, legacy callers) → the check is skipped.
     */
    assembledChannels?: string[];
    /** Story name for recording provenance; falls back to the `story:` header. */
    storyName?: string;
    /** Locale for recording provenance when the transcript declares none (D19). */
    locale?: string;
    /**
     * Run-scoped coverage accumulator (ADR-293 D15). One tracker per run —
     * the CLI owns it so a chain's members fold into one report; the runner
     * feeds it each command's `system.draw` trace events.
     */
    coverage?: CoverageTracker;
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

### serializer

```typescript
/**
 * serializer.ts — write a parsed transcript back out as a `.transcript` file.
 *
 * The matched pair to `parseTranscript`: whatever the parser can read, this
 * writes, and reading it back gives the same transcript. Editing tools work on
 * the parsed transcript and re-emit the whole file on save, so an author never
 * has to format one by hand — and never has to wonder whether saving cost them
 * something they had typed.
 *
 * Formatting follows what transcripts in this repository already do most often,
 * so adopting it is a small diff and none of it is a matter of taste.
 *
 * Public interface: `serializeTranscript(transcript) => string`.
 * Owner context: @sharpee/transcript-tester (test authoring infrastructure).
 */
import { Transcript } from './types.js';
/**
 * Write a parsed transcript back out as `.transcript` source.
 *
 * Writing an already-written file changes nothing, so saving a transcript you
 * edited one line of produces a one-line diff.
 *
 * @param transcript a transcript as produced by `parseTranscript`
 * @returns the file's full text, ending in a newline
 */
export declare function serializeTranscript(transcript: Transcript): string;
```

### golden

```typescript
/**
 * `.golden` recording format — reader/writer (ADR-294 D3/D7).
 *
 * A golden recording is the committed regression baseline for one transcript
 * at one seed: a provenance header (`key: value` lines), a `---` separator,
 * then the recorded turns verbatim. This module owns (de)serialization only —
 * recording, diffing, and blessing live in the runner.
 *
 * Sibling naming (D7/D8): a single-seed transcript records to
 * `<name>.golden`; a `seeds:` matrix records one file per seed as
 * `<name>.<seed>.golden` (e.g. `combat.42.golden`, `combat.777.golden`) —
 * each replay diffs only against its own seed's recording.
 *
 * Public interface: `serializeGolden`, `parseGolden`, `parseGoldenFile`,
 * `GoldenFormatError`. Owner context: transcript-tester (testing tooling).
 */
import { GoldenRecording } from './types.js';
/**
 * A malformed `.golden` file. Recordings are machine-written, so any shape
 * error means corruption or a hand edit — a single hard error (with the line
 * it occurred on) rather than the transcript parser's collected-errors style.
 */
export declare class GoldenFormatError extends Error {
    readonly filePath: string;
    readonly lineNumber?: number | undefined;
    constructor(message: string, filePath: string, lineNumber?: number | undefined);
}
/**
 * Serialize a recording to `.golden` text.
 *
 * Turns are separated by exactly one blank line; `parseGolden` strips exactly
 * one trailing blank line per non-final turn, so output that itself ends in
 * blank lines round-trips losslessly.
 */
export declare function serializeGolden(recording: GoldenRecording): string;
/**
 * Parse `.golden` content.
 *
 * @param content the file's text
 * @param filePath used in error messages only
 * @returns the parsed recording
 * @throws GoldenFormatError on any structural problem — a recording either
 *   parses completely or is rejected; there is no partial result
 */
export declare function parseGolden(content: string, filePath?: string): GoldenRecording;
/** Read and parse a `.golden` file from disk. */
export declare function parseGoldenFile(filePath: string): GoldenRecording;
```

### runner

```typescript
/**
 * Transcript Runner — golden replay/record and assertion-tier execution
 * (ADR-294).
 *
 * Two tiers, one source grammar (D2): a transcript with a `.golden` sibling
 * replays against the recording (the recording IS the assertion); `--bless`
 * creates or overwrites the recording; a transcript with no recording runs
 * the retained per-command assertion DSL. Any failed directive fails the
 * transcript unconditionally (D5) — `--stop-on-failure` only ever controls
 * whether the RUN continues to other transcripts.
 *
 * Public interface: `runTranscript`, `goldenPathFor`. Owner context:
 * transcript-tester (testing tooling).
 */
import { RandomForceSpec, RandomForceStatus } from '@sharpee/core';
import { Transcript, TranscriptResult, RunnerOptions } from './types.js';
/**
 * Interface for the game engine wrapper the CLIs hand the runner.
 */
interface GameEngine {
    executeCommand(input: string): Promise<string> | string;
    getOutput?(): string;
    lastEvents?: Array<{
        type: string;
        data?: any;
    }>;
    /**
     * Declared channel captures for the last command (ADR-294 D15): flattened
     * lines per channel id. Populated by bootstrap's assembleGame when the
     * session declared any channels. The turn's composed prose is not among
     * them — it rides the command's return value (ADR-300 D8/D9).
     */
    lastChannels?: Record<string, string[]>;
    world?: WorldModel;
    /**
     * The underlying platform engine. $save/$restore go through its real
     * save format (version, turn counter, RNG stream states — ADR-293 D7)
     * rather than a hand-rolled world snapshot; the tester owns only WHERE
     * the file lives, never WHAT is in it. Golden provenance reads the
     * session's master seed from here (ADR-294 D3).
     */
    engine?: {
        registerSaveRestoreHooks(hooks: {
            onSaveRequested(data: unknown): Promise<void>;
            onRestoreRequested(): Promise<unknown | null>;
        }): void;
        save(): Promise<boolean>;
        restore(): Promise<boolean>;
        getMasterSeed?(): number;
        /** ADR-293 Phase C: the per-point stream owner (forces, point-seed overrides). */
        getRandomService?(): PlatformRandomService;
        /** ADR-293 D16: per-draw trace onto the system-event channel; the runner opts in. */
        setRandomTraceEnabled?(enabled: boolean): void;
    };
}
/**
 * The slice of `EngineRandomService` the runner drives (ADR-293 D8/D9/D11).
 * Structural so the tester never imports the engine class itself.
 */
interface PlatformRandomService {
    loadForces(specs: readonly RandomForceSpec[]): void;
    clearForces(): void;
    getForceReport(): RandomForceStatus[];
    setPointSeedOverrides(overrides: Readonly<Record<string, number>>): void;
}
/**
 * Minimal interface for world model state queries ([STATE:] assertions).
 */
interface WorldModel {
    getEntityById?(id: string): any;
    getEntity?(id: string): any;
    findEntityByName?(name: string): any;
    getAllEntities?(): any[];
    getLocation?(entityId: string): string | undefined;
    getContents?(containerId: string): any[];
    getPlayer?(): any;
}
/**
 * Recording path for a transcript (D7/D8). A single-seed transcript records
 * to its `.golden` sibling; a `seeds:` matrix records one file per seed as
 * `<name>.<seed>.golden` — each replay diffs only against its own seed's
 * recording.
 */
export declare function goldenPathFor(transcriptPath: string, matrixSeed?: number): string;
/** Divergence-save path for a transcript (D18). Working artifact, never committed. */
export declare function divergencePathFor(transcriptPath: string): string;
/**
 * Run a single transcript against an engine.
 *
 * Tier selection (D2): `--bless` records; an existing recording replays;
 * otherwise the assertion tier runs. Parse errors never execute (AC-4).
 */
export declare function runTranscript(transcript: Transcript, engine: GameEngine, options?: RunnerOptions): Promise<TranscriptResult>;
export {};
```

### watch

```typescript
/**
 * Watch mode (ADR-294 D14) — targeted reruns with an inline bless affordance.
 *
 * A change to a watched transcript (or one of its recordings) reruns that one
 * test; a change to the story's files reruns every watched transcript. Golden
 * failures offer `bless? [y/n/all]` when a prompt is available; an unattended
 * watch (no prompt wired) never blesses anything — it only reports.
 *
 * Public interface: `classifyChange`, `BlessPolicy`, `runCycle`, `startWatch`.
 * The host CLI supplies the run/prompt/log callbacks; this module owns only
 * the watch/decision logic, so both are testable without a real terminal.
 * Owner context: transcript-tester (testing tooling).
 */
import { TranscriptResult } from './types.js';
/** Where a filesystem change points: one transcript, the whole story, or noise. */
export type ChangeTarget = {
    kind: 'transcript';
    transcriptPath: string;
} | {
    kind: 'story';
} | {
    kind: 'ignored';
};
/**
 * Classify one changed path against the watch set.
 *
 * Order matters: a watched transcript's own artifacts map to that transcript;
 * OTHER transcript artifacts are noise even inside a story dir (an unwatched
 * suite's files must not retrigger this one); save churn from our own runs is
 * noise; anything else under a story dir is a story change (rerun all).
 */
export declare function classifyChange(changedPath: string, watchedTranscripts: string[], storyDirs: string[]): ChangeTarget;
/**
 * The bless decision state machine (D14). With no prompt wired (headless,
 * no TTY), `decide` is always false — an unattended watch never blesses.
 * An explicit `all` answer is sticky for the rest of the watch session.
 */
export declare class BlessPolicy {
    private readonly promptBless?;
    private blessAll;
    constructor(promptBless?: ((transcriptPath: string) => Promise<"y" | "n" | "all">) | undefined);
    decide(transcriptPath: string): Promise<boolean>;
}
/** Host-supplied callbacks: run one transcript (all its matrix seeds), log. */
export interface WatchRunIO {
    /** Run one transcript file fresh; returns one result per matrix seed. */
    run(transcriptPath: string, bless: boolean): Promise<TranscriptResult[]>;
    log(message: string): void;
}
/**
 * Run one watch cycle over the affected transcripts. A golden-tier non-pass
 * offers bless via the policy; assertion-tier failures only report (bless is
 * a golden affordance). Returns the golden paths this cycle wrote, so the
 * watcher can suppress its own write events.
 */
export declare function runCycle(transcriptPaths: string[], io: WatchRunIO, policy: BlessPolicy, onBlessed?: (goldenPath: string) => void): Promise<{
    blessedGoldens: string[];
}>;
export interface WatchConfig {
    /** The transcript files this watch session runs. */
    transcripts: string[];
    /** Directories whose non-artifact changes rerun every transcript. */
    storyDirs: string[];
    /** Debounce window for coalescing change events (ms). */
    debounceMs?: number;
}
/**
 * Start watching. Never resolves on its own — the returned handle's `close`
 * stops the watchers (tests and Ctrl+C both go through it).
 */
export declare function startWatch(config: WatchConfig, io: WatchRunIO, policy: BlessPolicy): {
    close(): void;
};
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
 * Get exit code based on results.
 *
 * 1 when any command failed OR any transcript errored (validation/load —
 * ADR-277 D1: an errored transcript must fail the run, not slip through).
 * The `totalErrors` check tolerates legacy callers whose aggregate predates
 * the field (undefined compares false).
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

### aggregate

```typescript
/**
 * aggregate.ts — run-level aggregation and the `test --json` NDJSON record
 * builders (ADR-277 D1).
 *
 * Purpose: the ONE shared aggregation over TranscriptResults (replacing the
 *   per-caller inline reduces) and the pure builders that turn results into
 *   `@sharpee/ide-protocol` test-result records. Builders, not a buffered
 *   serializer: the emitting CLI writes `run-start` before the loop, each
 *   transcript's records as it completes, and `run-end` last — so the stream
 *   is live (D1's streaming ruling) while the record shapes live once in the
 *   contract.
 * Public interface: aggregateTestRun, runStartRecord, transcriptRecords,
 *   runEndRecord, ndjsonLine.
 * Owner context: @sharpee/transcript-tester. The ide-protocol import is
 *   TYPE-ONLY (ADR-277 D1, review finding 2) — ide-protocol re-exports the
 *   Chord Story IR wholesale, and this package must not gain a runtime edge
 *   to it; builders construct plain literals shaped by the imported types.
 */
import type { CoverageRecord, RunEndRecord, RunStartRecord, TestResultRecord } from '@sharpee/ide-protocol';
import type { TestRunResult, TranscriptResult } from './types.js';
import type { CoverageReport } from './coverage.js';
/**
 * Aggregate per-transcript results into a run result — the one shared
 * reduce (ADR-277 D1 Consequences).
 *
 * @param transcripts Results in run order, including error-status entries.
 * @returns Totals over every entry; `totalErrors` counts `status: 'error'`.
 */
export declare function aggregateTestRun(transcripts: TranscriptResult[]): TestRunResult;
/**
 * Build the stream's opening record.
 *
 * @param mode `'chain'` when state persists across transcripts (D3).
 * @param transcriptCount Number of transcripts about to run.
 */
export declare function runStartRecord(mode: 'tests' | 'chain', transcriptCount: number): RunStartRecord;
/**
 * Build one finished transcript's records: `transcript-start`, one
 * `command-result` per executed command (with its 1-based `.transcript`
 * source line for click-through), and the closing `transcript-end` whose
 * `status: 'error'` carries `errorMessage` (never a silent skip). A FAILED
 * command result also carries `actualOutput` — what the story really printed
 * (ADR-282 D2), which the IDE's failure view shows against the blessed text.
 *
 * With `captureOutput` (ADR-299's replay capture — `--capture-output`),
 * `actualOutput` rides EVERY executed command result instead: the transcript
 * interpreter exposing what each command printed, pass/fail irrelevant. The
 * default stays failures-only so a green chain run's stream stays small.
 *
 * @param result The transcript's result — including error-status results
 *   that never ran (zero commands).
 * @param index 0-based position in the run order.
 * @param options `captureOutput` — carry `actualOutput` on every command.
 */
export declare function transcriptRecords(result: TranscriptResult, index: number, options?: {
    captureOutput?: boolean;
}): TestResultRecord[];
/**
 * Build the run's coverage record (ADR-293 D15 / ADR-294 D13). Emitted once
 * per run, before `run-end`, only when the caller opted in (`--coverage`) —
 * coverage aggregates across a chain, never per transcript.
 *
 * @param report The tracker's report (`CoverageTracker.buildReport`).
 */
export declare function coverageRecord(report: CoverageReport): CoverageRecord;
/**
 * Build the stream's closing record.
 *
 * @param run The aggregated run result.
 * @param exitCode The exit code the CLI is about to return.
 */
export declare function runEndRecord(run: TestRunResult, exitCode: number): RunEndRecord;
/** Serialize one record as an NDJSON line (single line, trailing newline). */
export declare function ndjsonLine(record: TestResultRecord): string;
```

### coverage

```typescript
/**
 * coverage.ts — outcome-class coverage over the trace stream (ADR-293 D15).
 *
 * Purpose: accumulate per-point firings from the engine's `system.draw` trace
 *   events across one run (a `--chain` run is ONE session and produces ONE
 *   report — D15's aggregation ruling), then cross the process-global catalog
 *   (`getRegisteredPoints()`) against what fired: `catalog − fired` needs no
 *   static scan because declaration is the capability to draw (D2).
 * Public interface: `CoverageTracker`, `CoverageReport` (re-exported
 *   ide-protocol shapes), `formatCoverageSummary`, `formatCoverageBreakdown`.
 * Owner context: @sharpee/transcript-tester. The ide-protocol import is
 *   TYPE-ONLY (ADR-277 D1's standing rule for this package).
 */
import type { CoveragePoint } from '@sharpee/ide-protocol';
/** The report payload — the {@link CoverageRecord} minus its wire framing. */
export interface CoverageReport {
    /** Every declared point in scope, sorted by name. */
    points: CoveragePoint[];
    /** Count of points with `fired > 0`. */
    pointsFired: number;
    /** Count of points never fired (`catalog − fired`, D2). */
    pointsNeverFired: number;
    /** Total declared classes never observed, across all points. */
    classesUnobserved: number;
}
/** The slice of a trace record coverage consumes (core's `IRandomTraceData`). */
interface TraceLike {
    point: string;
    cls?: string;
}
/**
 * Accumulates firings across a run. One tracker per run — the CLI creates it
 * before the transcript loop and reads the report after, so a chain's members
 * all land in one report (D15).
 */
export declare class CoverageTracker {
    private firings;
    /** Record one firing (drawn or forced — D8 reports class coverage). */
    record(trace: TraceLike): void;
    /**
     * Collect every `system.draw` trace event from a command's event batch —
     * the shape the engine re-emits trace records in (`type: 'system.draw'`,
     * `data: IRandomTraceData`). Non-trace events are ignored.
     */
    collectFrom(events?: Array<{
        type: string;
        data?: unknown;
    }>): void;
    /**
     * Cross the catalog against the accumulated firings (D15): every declared
     * point in scope, its firing count, and — for choice points — observed and
     * unobserved classes.
     *
     * @param prefixes - keep only points whose first dotted segment is listed
     *   (the D2/A1 multi-story filter; also what isolates a report from other
     *   test files' catalog entries, since the catalog is process-global).
     *   Omit to report the whole catalog — correct in a single-story CLI run.
     */
    buildReport(prefixes?: readonly string[]): CoverageReport;
}
/**
 * The one-line end-of-run summary D15 rules always prints — the never-fired
 * count is worthless if it has to be asked for.
 */
export declare function formatCoverageSummary(report: CoverageReport): string;
/**
 * The full per-point breakdown (D15's `--output-dir` / `--coverage` surface):
 * one line per point — firing count, then unobserved classes for choice
 * points or a plain-draw marker.
 */
export declare function formatCoverageBreakdown(report: CoverageReport): string;
export {};
```

### search

```typescript
/**
 * search.ts — first-firing outcome search with a measured budget (ADR-293 D12).
 *
 * Purpose: find a point-seed override (D11) under which a target point's first
 *   *drawn* firing produces a desired class, by forking the engine's real save
 *   state per candidate — never a subprocess (ruled Decision 5(a)), never a
 *   model of the engine (D12: "search executes the real engine").
 * Mechanics: the tool varies the TARGET POINT'S OWN STREAM, not the master
 *   seed — master-seed variation changes every stream and with it the firing
 *   schedule, which is exactly the degradation D12 warns about. A base pass
 *   replays the driver transcript's commands to locate the first drawn firing
 *   and capture the engine save just before its turn; each try restores that
 *   save, applies the candidate override, re-executes the one firing turn,
 *   and reads the trace. Force-prefix composition (D12) falls out of
 *   zero-draw forcing: a forced prefix never materializes the target stream,
 *   so the candidate override governs the first drawn firing. Limitation: a
 *   force prefix must complete in turns BEFORE the searched firing's turn —
 *   occurrence counters are session state and are not rolled back by restore.
 * Budget: 10 × declared class count by default (uniform prior — D12's ~10×
 *   inverse probability with p ≈ 1/classCount), caller-overridable per use;
 *   measured per use, never declared on the point.
 * Public interface: `searchOutcome`, `SearchTarget`, `SearchResult`.
 * Owner context: @sharpee/transcript-tester (testing tooling).
 */
import { RandomForceSpec } from '@sharpee/core';
import type { Transcript } from './types.js';
/** The searched-for outcome: a declared point and one of its declared classes. */
export interface SearchTarget {
    point: string;
    cls: string;
}
/** Outcome of one search run (D12: tries-spent on success, named exhaustion on failure). */
export interface SearchResult {
    found: boolean;
    /** Attempts consumed, including the base pass as try 1. */
    tries: number;
    /** The budget the search ran under. */
    budget: number;
    /** The session's master seed — half of the reproducible artifact. */
    masterSeed: number;
    /**
     * On success: the `point-seed:` override that reproduces the outcome —
     * absent when the base pass already drew the target class naturally (the
     * natural derivation needs no override).
     */
    pointSeed?: number;
    /** 0-based index of the driver command whose turn fires the point. */
    firingCommandIndex?: number;
    /** On failure: why — 'budget-exhausted', 'never-fires', or a validation message. */
    reason?: string;
}
/** The engine-wrapper slice the search drives (same shape the runner uses). */
interface SearchEngine {
    executeCommand(input: string): Promise<string> | string;
    lastEvents?: Array<{
        type: string;
        data?: unknown;
    }>;
    engine?: {
        registerSaveRestoreHooks(hooks: {
            onSaveRequested(data: unknown): Promise<void>;
            onRestoreRequested(): Promise<unknown | null>;
        }): void;
        save(): Promise<boolean>;
        restore(): Promise<boolean>;
        getMasterSeed?(): number;
        getRandomService?(): {
            loadForces(specs: readonly RandomForceSpec[]): void;
            clearForces(): void;
            setPointSeedOverrides(overrides: Readonly<Record<string, number>>): void;
        };
        setRandomTraceEnabled?(enabled: boolean): void;
    };
}
/**
 * Search the target point's stream for a candidate start under which its
 * first drawn firing produces `target.cls`, driving the world with the
 * transcript's commands.
 *
 * The driver transcript's own `forces:`/`point-seed:` instruments are
 * honored (D12's force-prefix-then-search-last composition); the candidate
 * override wins over a transcript `point-seed:` on the target itself.
 *
 * @param transcript - the parsed driver transcript (its commands walk the
 *   world to the firing; assertions and goldens are ignored)
 * @param engine - the loaded game (the REAL engine — D12)
 * @param target - point name and desired declared class
 * @param options - `budget` overrides the 10 × class-count default
 * @returns the search result; validation problems return `found: false` with
 *   a named `reason`, never a throw
 */
export declare function searchOutcome(transcript: Transcript, engine: SearchEngine, target: SearchTarget, options?: {
    budget?: number;
}): Promise<SearchResult>;
export {};
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
 * @param seed      optional master seed from the transcript `seed:` header
 *   (ADR-293 D1) — the runner verifies the session seed against the pin, it
 *   never sets it, so the host must seed the engine at assembly
 */
export declare function loadStory(storyPath: string, entry?: string, seed?: number, channels?: string[]): Promise<TestableGame>;
/**
 * Assemble a testable game from an already-loaded story instance.
 */
export declare function createTestableGame(story: any): TestableGame;
/**
 * Find all transcript files in a directory.
 */
export declare function findTranscripts(dir: string, pattern?: string): string[];
```

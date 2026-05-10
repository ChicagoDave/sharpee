# ADR-174: Decoration Architecture and Engine-Internal Prose Pipeline

## Status: ACCEPTED

## Date: 2026-05-09 (proposed) / 2026-05-10 (Phase 1 + Phase 2 + Phase 3 ACCEPTED)

## Phase 1 — Engine-internal prose pipeline (complete)

Phase 1 landed on branch `adr-174-phase1-prose-pipeline`, eight
sub-phases (1.1 through 1.8) plus an interlude commit deleting the
deprecated `ReadOnlyActionContext` that surfaced as a build blocker.

Acceptance criteria satisfied:
- AC-1: `[em:Zork]` → `IDecoration { className: 'sharpee-em', content: ['Zork'] }`. Verified `parser.test.ts` test P1.
- AC-2: `[thief-taunt:'…']` → bare `className: 'thief-taunt'`. Verified `parser.test.ts` test P2.
- AC-3: Nested `[em:[strong:bold italic]]` → nested `IDecoration` nodes. Verified `parser.test.ts` test P3 plus the AC-7 visual smoke test.
- AC-4: Escaped `\[ literal \]` produces a plain `[`. Verified `parser.test.ts` test P4.
- AC-5: Plain templates (no markers) produce single-string content. Verified `parser.test.ts` test P5 plus walkthrough chain regression.
- AC-6: `@sharpee/engine` has no import of `@sharpee/text-service`; full Dungeo walkthrough chain passes. Verified post-1.6 (`grep` clean, walkthrough chain 857/0; post-1.7 walkthrough chain 961/0 first run).
- AC-7: Platform CSS ships with the platform-vocabulary classes; browser smoke test renders italic/bold/colors. Verified visually by user against `docs/work/adr-174-prose-pipeline/ac7-smoke-test.html`.
- AC-10/11/12: Forgiving parser rules (unclosed bracket, no-colon, empty-class) emit literal text or no-op wrap. Verified `parser.test.ts` tests P6/P7/P8.

Acceptance criteria deferred:
- AC-8: Phase 2 (`renderToString` removal across downstream consumers).
- AC-9: Phase 3 (`@sharpee/text-service` package deletion).

Phase 2 and Phase 3 each get their own implementation plan in
`docs/work/adr-174-prose-pipeline/` before work starts.

## Phase 2 — Wire-production consumer migration (complete)

Phase 2 landed on the same branch (`adr-174-phase1-prose-pipeline`),
four sub-phases (2.1 through 2.4) plus an AC-16 grep-gate interlude
fixed in 2.1.

Plan: `docs/work/adr-174-prose-pipeline/plan-20260510-phase2.md`.

OQ-1 resolution (recorded in §Open Questions OQ-1): the
`renderToString` replacement helper ships from
**`@sharpee/channel-service`** as `src/render-to-string.ts`. Channel-
service is downstream of engine, upstream of clients — the right
dependency position for a block-flattening helper consumed by
transcript tooling and dev scripts.

AC-8 satisfied with two intentional carve-outs:
- **`packages/interpreter/`** — hard-deferred. Platform-browser is the
  primary release mechanism; zifmia is parked. If revived, it gets
  a redesign rather than a port.
- **`stories/cloak-of-darkness/`** — deferred during 2.2 entry after
  discovering cloak is not in `pnpm-workspace.yaml`, has manually-
  maintained `@sharpee/*` symlinks, and was already in pre-existing
  build-broken state with errors unrelated to this ADR (DOM lib
  missing in tsconfig; EngineConfig API drift).

Both carve-outs fall out of build at Phase 3 — accepted collateral.

Sub-phase summary:
- **2.1**: ported `cli-renderer.ts` → `channel-service/src/render-to-string.ts` (filename corrected — not CLI-specific). 20 tests parity-ported (29 leaves after `it.each` expansion). Interlude: AC-16 grep gate had two false-positive doc-comment matches in audibility handlers (`packages/text-service/src/handlers/audibility.ts`, `packages/engine/src/prose-pipeline/handlers/audibility.ts`) — added per-file allow-list to the gate; comments left intact (they document the channel vocabulary correctly).
- **2.2**: migrated `packages/transcript-tester/src/story-loader.ts` to channel-service. Cloak deferred during entry (see above).
- **2.3**: re-routed bridge / runtime / sharpee re-exports to channel-service; dropped dead `ITextService` / `createTextService` / `TextService` re-exports. Cleaned `scripts/bundle-entry.js` and `scripts/test-bundle-template.js` so the platform bundle no longer spreads text-service into `dist/cli/sharpee.js`. Discovered and rebuilt three Phase-1-stale `dist-esm/` directories (sharpee, transcript-tester) — the platform-browser one is older still (Feb 19) and doesn't affect the CLI bundle, deferred to Phase 3.
- **2.4**: final regression — engine 398/0/7-skipped, channel-service 94/0, text-service 147/0, platform-browser 68/0, Dungeo walkthrough chain 930/0 (after one RNG re-run per `feedback_flakey_walkthroughs.md`), CLI + browser bundles green, AC-8 grep zero matches outside the carve-outs.

Acceptance criteria satisfied:
- **AC-8**: After Phase 2, no `*.ts` / `*.tsx` / `*.js` source file
  outside `packages/text-service/`, `packages/interpreter/`, and
  `stories/cloak-of-darkness/` imports anything from
  `@sharpee/text-service`. Verified by grep over `packages/`,
  `stories/`, and `scripts/`. The grep also catches relative-path
  requires (`../packages/text-service/dist/index.js`) — the original
  Phase 2 plan grep pattern only matched `@sharpee/`-form imports
  and would have missed bundle-entry.js; the broader pattern is
  correct.

Acceptance criteria deferred:
- AC-9: Phase 3 (`@sharpee/text-service` package deletion).

## Phase 3 — `@sharpee/text-service` package deletion (complete)

Phase 3 landed on the same branch (`adr-174-phase1-prose-pipeline`),
four sub-phases (3.1 through 3.4).

Plan: `docs/work/adr-174-prose-pipeline/plan-20260510-phase3.md`.

OQ-4 resolved during planning to **option B** (remove `packages/interpreter`
from the workspace via `pnpm-workspace.yaml`'s `!packages/interpreter`
exclude). This is the consistent signal that zifmia is parked and
matches the Phase 2 disposition.

Sub-phase summary:
- **3.1**: pre-flight grep matched the planned inventory. The plan's
  scope (source imports + a hand-listed config-file set) was incomplete
  — it missed `packages/transcript-tester/tsconfig.json`,
  `stories/dungeo/tsconfig*.json`, `stories/dungeo/package.json`, and
  `tutorials/familyzoo/package.json`. These surfaced during 3.3 and
  were patched mid-flight. Recurrence-prevention note in §Open
  Questions OQ-5.
- **3.2**: stripped text-service from `package.json` (workspaces +
  build:all + publish:beta), `build.sh` (8 alias/export lines), four
  tsconfig project-reference lists (`bridge`, `runtime`, `engine`,
  `sharpee`), `scripts/npm-latest.sh`, and `scripts/generate-genai-api.js`.
  Removed `packages/interpreter` from `pnpm-workspace.yaml` per OQ-4 option B
  (the package.json `workspaces[]` field is overridden by
  `pnpm-workspace.yaml` for pnpm — discovered mid-3.2). Deleted stale
  `packages/platform-browser/dist-esm/` (Feb-19 artifact). The plan
  called for rebuilding via `tsc -p tsconfig.esm.json`, but
  platform-browser has no `tsconfig.esm.json` and no current build
  pipeline produces dist-esm; deletion was the plan-listed alternative.
- **3.3**: deleted `packages/text-service/`. First `pnpm install`
  errored on `stories/dungeo/package.json` declaring
  `@sharpee/text-service` as a workspace dep. Found four additional
  `package.json` files with the same dead dep declaration (zifmia,
  concealment-test, cloak-of-darkness — all already outside the
  workspace; only dungeo and familyzoo were in-workspace and required
  fixing). Patched the two in-workspace files. Also fixed the
  `text-service` typo (plural form `text-services`) in
  `stories/dungeo/tsconfig.json` and `stories/dungeo/tsconfig.esm.json`
  paths mappings — never-resolved dead config but caught by the
  AC-9b standard.
- **3.4**: final regression — engine 398/0/7-skipped, channel-service
  94/0, platform-browser 68/0. CLI bundle 2.3M (+ 33ms load test);
  browser bundle 1.2M; both clean. Dungeo walkthrough chain 872/0
  (after one RNG cascade where stale baseline-built saves caused 554
  cascade failures; deleting `stories/dungeo/saves/` and re-running
  with Phase-3-built saves resolved it. Pre-existing thief-RNG noise
  per `feedback_flakey_walkthroughs.md`). AC-9 grep zero source-import
  matches outside accepted-collateral surfaces; zero config-file
  matches.

Acceptance criteria satisfied:
- **AC-9**: `packages/text-service/` does not exist on disk; `pnpm
  install` succeeds (30 workspace projects, down from 32 — text-service
  removed by deletion, zifmia removed by `!packages/interpreter` exclude);
  full repo regression passes.
- **AC-9a**: Repo-wide grep for `@sharpee/text-service` source imports
  returns 5 matches, all in accepted-collateral surfaces (zifmia ×2,
  cloak-of-darkness ×3). Zero outside collateral.
- **AC-9b**: All config-file references removed across `package.json`,
  `pnpm-workspace.yaml`, `build.sh` (8 aliases + 1 .d.ts heredoc), 5
  tsconfigs (bridge, runtime, engine, sharpee, transcript-tester), 2
  scripts (npm-latest.sh, generate-genai-api.js), 2 story
  package.jsons (dungeo, familyzoo), 2 dungeo tsconfig path-mapping
  typos.
- **AC-9c**: `packages/platform-browser/dist-esm/` deleted (the plan's
  alternative path, since no build pipeline produces it). Existing
  consumers resolve through `dist/` per `build.sh` line 824.
- **AC-9d**: Dungeo walkthrough chain 872/0 — Phase 2 baseline (930/0)
  is RNG-noisy on test count, but failure count of 0 is the
  load-bearing signal.

## Builds on

- **ADR-091** (Text Decorations) — supersedes the BBCode-style
  decoration syntax and the `IDecoration { type, content }` shape. The
  decoration *concept* survives; the markup mechanism, the structured
  representation, and the rendering responsibility are redesigned.
- **ADR-096** (Text Service Architecture) — supersedes the
  `@sharpee/text-service` package as the home for event-to-block
  translation. The pipeline moves into `@sharpee/engine` as an
  internal subdirectory; `@sharpee/text-service` is deprecated and,
  after downstream migrations, removed.
- **ADR-097** (Domain Events with messageId) — preserved. The
  `event.data.messageId` resolution path remains the dominant route
  from event to prose.
- **ADR-094** (Event Chaining) — preserved. Sort metadata semantics
  carry over; the sorting code moves with the pipeline.
- **ADR-133** (Structured Text Blocks) — preserved at the level of
  "blocks have keys and structured content." The shape of `content`
  and `IDecoration` changes per this ADR.
- **ADR-163** (Channel-Service Platform) — preserved. The prose
  pipeline produces `ITextBlock[]` that channel-service receives in
  `build({ events, blocks, world, turn })`. The `mainChannel` closure
  in stdlib continues to read `ctx.blocks`. No channel boundary moves.
- **ADR-165** (Renderer Architecture) — preserved. Renderers consume
  channel packets and apply per-surface styling.
- **ADR-170** (Component-Based Theming) — composes. Platform decoration
  classes are styled by a platform CSS file shipped under the same
  theming infrastructure ADR-170 established for component themes;
  story CSS overrides per the same layering rules.
- The 2026-05-03 R8 disposition doc
  (`docs/work/channel-io-unification/text-service-disposition-20260503.md`)
  recommended retaining text-service block-production indefinitely.
  This ADR reverses that recommendation. The disposition doc now
  describes a transitional state, not the destination.

## Context

Two separate but entangled concerns surfaced during ADR-172 Phase 7
prose-handler work:

1. **Text-service is awkwardly placed.** After the channel-io migration
   (R5–R8, completed 2026-05-04), `@sharpee/text-service` survives only
   to translate events into `ITextBlock[]` that the `mainChannel`
   closure (stdlib) and the legacy `text:output` event consume. The
   wire-production half (`renderToString`, `renderStatusLine`) is
   already deprecated for first-party platforms. Block-production is
   load-bearing for one consumer — `@sharpee/engine` — and that
   coupling is internal-runtime in nature. Keeping it in a separate
   package adds dependency-graph complexity and a misleading "text
   service" name without buying separation that any consumer uses.

2. **Decorations are designed but unused.** ADR-091 specified a
   BBCode-style markup (`[item:brass lantern]`, `*emphasis*`) that
   parses into `IDecoration { type, content }` trees. A grep of all
   templates and source code surfaces zero markers in any template,
   no `IDecoration` constructed manually anywhere, and decoration
   parsing running as no-op overhead per block. The mechanism was
   never exercised — but authors *do* need rich text affordances
   (emphasis, bold, strikethrough, color, story-defined styles), so
   the question is not "remove decorations" but "redesign them so
   they're the obvious tool."

The Phase 7 audibility prose handler raised both problems
simultaneously: where should the new handler live, and how should the
prose it emits express style?

Three rejected paths:

- **Inline `style="..."`-style markup.** Embedding presentational
  attributes in templates couples prose to one renderer (HTML) and
  defeats theming. Rejected per author intent.
- **Semantic HTML elements (`<em>`, `<strong>`) on the wire.**
  Conflicts with ADR-163's "wire is data-only, never assume
  locked-in client choices." HTML is a renderer concern, not a wire
  concern.
- **Per-handler ad-hoc decoration.** Today's handlers don't add
  decorations at all; if each handler grew its own decoration
  decisions, drift across handlers is guaranteed and authors get no
  consistent vocabulary.

## Decision

### Single decoration mechanism: span + class

All decorations are spans with one or more CSS class names. There is
no semantic-element path (`<em>` etc.), no inline `style="..."` path,
no separate vocabulary for "typographic" vs "semantic" vs
"parameterized" decorations. Everything is a class.

This mirrors how HTML+CSS works in practice: `<span class="X">...</span>`
is the universal markup primitive; CSS rules in an external stylesheet
provide the styling.

### Markup syntax: brackets

Templates use `[name:content]` to apply a decoration. The bracketed
name becomes the class name applied to the wrapping span.

```
"This is Flood Control Dam #3 in the center of [em:Zork]."
"You see [item:the brass lantern]."
"The orb pulses [story-glow:softly]."
"He says [thief-taunt:'You'll regret this.']"
```

Nesting is permitted: `[em:[strong:bold italic]]` resolves to a span
with `sharpee-em` containing a span with `sharpee-strong`. Escaping
literal `[` in prose uses `\[`.

The bracket syntax extends the existing `{the:item}` formatter-chain
syntax without colliding with it: formatter chains use `{...}`,
decorations use `[...]`. Authors learn one rule for grammar, one rule
for styling.

### Platform vs author classes: prefix convention

The platform reserves the `sharpee-` namespace. Class names emitted
by the resolver are determined by lookup against a closed enumeration:

- **If the bracketed name is in the platform vocabulary**: the
  resolver emits a span whose class is `sharpee-{name}`.
- **If the bracketed name is not in the platform vocabulary**: the
  resolver emits a span whose class is `{name}` verbatim.

Authors writing `[thief-taunt:...]` get `<span class="thief-taunt">`
and own the styling in their story's CSS. Authors writing `[em:...]`
get `<span class="sharpee-em">` and inherit the platform CSS rule for
`.sharpee-em`. The platform-vs-author distinction is invisible at the
markup level — authors write the same syntax for both, and the
resolver bridges to the right namespace.

The reserved `sharpee-` prefix means authors must not name their CSS
classes with a `sharpee-` prefix in their own stylesheet. Documented;
not enforced at runtime.

### Closed platform vocabulary

The platform ships the following bracketed names. Each maps to a
single CSS class (`.sharpee-{name}`) in the platform's prose CSS file.

**Switches** — apply on/off, no parameter:

| Name      | CSS class            | Default style (in platform CSS)    |
|-----------|----------------------|------------------------------------|
| `em`      | `.sharpee-em`        | italic                             |
| `strong`  | `.sharpee-strong`    | bold                               |
| `u`       | `.sharpee-u`         | underlined                         |
| `st`      | `.sharpee-st`        | line-through                       |
| `code`    | `.sharpee-code`      | monospace                          |
| `super`   | `.sharpee-super`     | superscript (`vertical-align: super; font-size: smaller`) |
| `sub`     | `.sharpee-sub`       | subscript                          |

**Class vocabulary** — parameterized concerns expressed as discrete
classes. The platform ships a starter palette; stories add more by
defining additional `.sharpee-{name}` rules in their CSS (this is
the *one* exception to the "authors don't use sharpee- prefix" rule;
it applies when authors are explicitly extending a platform vocabulary
they want to use via bare bracket names).

| Family    | Starter set                                    |
|-----------|------------------------------------------------|
| `color-*` | `color-red`, `color-blue`, `color-green`, `color-yellow`, `color-magenta`, `color-cyan`, `color-white`, `color-grey`, `color-black` |
| `bgcolor-*` | matching set with `bgcolor-` prefix          |
| `size-*`  | `size-small`, `size-large`                     |
| `font-*`  | `font-mono` (others rare; authors add per-story) |

**IF-semantic** — entity classifiers from ADR-091, retained:

| Name        | CSS class             |
|-------------|-----------------------|
| `item`      | `.sharpee-item`       |
| `npc`       | `.sharpee-npc`        |
| `room`      | `.sharpee-room`       |
| `direction` | `.sharpee-direction`  |
| `command`   | `.sharpee-command`    |
| `quote`     | `.sharpee-quote`      |

The closed enumeration lives in `@sharpee/engine/src/prose-pipeline/`
as a single TypeScript constant. Adding a new platform decoration
type is a code change to that constant plus a CSS rule in the
platform stylesheet — both shipped together.

### Wire shape: structured, not pre-rendered

The pipeline emits structured `ITextBlock`s. The resolver does *not*
emit HTML strings on the wire. Renderers translate the structured
form to their target output (HTML for browser, ANSI for terminal,
strip-styling for audio).

Block shape (revised from ADR-091):

```ts
interface ITextBlock {
  readonly key: string;
  readonly content: ReadonlyArray<TextContent>;
}

type TextContent = string | IDecoration;

interface IDecoration {
  /** Final, fully-resolved CSS class name. Includes `sharpee-` prefix
   *  for platform-vocabulary names; bare name for author classes. */
  readonly className: string;
  readonly content: ReadonlyArray<TextContent>;
}
```

The `type` field from ADR-091's `IDecoration` is replaced by
`className`. The platform-vs-author distinction is collapsed at the
resolver — by the time the block is on the wire, the class name is
the renderer-ready string. Renderers do not consult any
platform-vocabulary table.

Multi-class spans (e.g. `[em strong:emphatic bold]` for both at once)
are *not* supported in this ADR — each decoration carries one class.
Nesting handles multi-style cases (`[em:[strong:both]]`). A future
ADR may add a multi-class shorthand if authoring data shows demand.

### Internal interfaces

The pipeline exposes three internal functions/classes. Each has a
formal signature here so implementation does not drift on the
contract.

```ts
// Bracket parser — markup string → structured TextContent tree.
// Pure function; same input always yields same output.
function parseDecorations(template: string): TextContent[];

// Platform-vocabulary class-name resolver — bare bracket name →
// final CSS class name.
//   - If the name is in the platform vocabulary → returns 'sharpee-{name}'
//   - Otherwise → returns '{name}' verbatim (author class)
// The vocabulary is a frozen Set in `decorations/platform-vocabulary.ts`.
function resolveClassName(rawName: string): string;

// Pipeline class — same per-turn contract as the retired TextService.
// Engine constructs once during `setStory()` with the language provider;
// engine calls `processTurn(events)` once per turn (and once per meta /
// restart code path — same 3 call sites as today).
class ProsePipeline implements ITextService {
  constructor(languageProvider: LanguageProvider);
  processTurn(events: readonly ISemanticEvent[]): ITextBlock[];
}
```

`ProsePipeline implements ITextService` is a transitional measure for
Phase 1 only — it lets `@sharpee/engine` swap implementations without
touching its three call sites. After the `ITextService` interface
moves into engine alongside the implementation in Phase 1 (see
Implementation Modules below), the `implements` clause becomes
redundant and the interface name may be renamed to `IProsePipeline`
in a follow-up cleanup.

### Engine-internal prose pipeline

A new subdirectory `packages/engine/src/prose-pipeline/` replaces
`@sharpee/text-service` as the event-to-block translator. The pipeline
is engine-internal; it has no external public API.

Layout (proposed; final names settled during implementation):

```
packages/engine/src/prose-pipeline/
├── index.ts                    — internal barrel
├── pipeline.ts                 — `class ProsePipeline` (replaces TextService)
├── stages/
│   ├── filter.ts               — drop system.*, platform.*
│   └── sort.ts                 — chain-metadata ordering (ADR-094)
├── handlers/
│   ├── types.ts                — handler contract
│   ├── domain-message.ts       — `event.data.messageId` path (ADR-097)
│   ├── room.ts                 — room descriptions
│   ├── revealed.ts             — container reveals
│   ├── audibility.ts           — ADR-172 audibility events (moved from text-service)
│   └── ...                     — one file per handler family
├── decorations/
│   ├── parser.ts               — bracket → IDecoration tree
│   ├── platform-vocabulary.ts  — closed enumeration of platform names
│   └── resolver.ts             — markup-string → TextContent[] with className resolution
└── assemble.ts                 — wrap resolved content in ITextBlock with key
```

The pipeline keeps the same per-turn contract: `processTurn(events) →
ITextBlock[]`. Engine continues to call it from `executeTurn()`,
`restartGame()`, and the meta-command path — same three call sites as
today.

### Channel-service integration: unchanged

`ChannelService.build({ world, events, blocks, turn })` continues to
receive both `events` and `blocks`. `mainChannel` in stdlib continues
to read `ctx.blocks` and project blocks whose key is in `MAIN_KEYS`
into the append-mode prose stream. This ADR does not move any channel
boundary.

The `TextContent[]` payload that `mainChannel.produce` returns now
contains decorations whose `className` is final-form (resolved against
the platform vocabulary at parse time). Renderers downstream of the
channel translate per their target.

### Migration phasing

Three phases, each shippable independently:

**Phase 1 — Build the new pipeline in engine; cut engine over.**
Implement `prose-pipeline/` inside engine. Port every existing
text-service handler (`handleRoomDescription`, `handleRevealed`,
`handleGameMessage`, `handleGenericEvent`, `handleHelpDisplayed`,
`handleAboutDisplayed`, `handleGameStarted`, `handleAudibilityHeard`,
plus the inline `tryProcessDomainEventMessage`/`handleImplicitTake`/
`handleCommandFailed`/`handleClientQuery` paths) to the new location.
Implement the bracket parser + platform-vocabulary resolver.
Engine stops importing `@sharpee/text-service`. The text-service
package is marked `@deprecated` in its README but stays compilable
for downstream wire-production consumers.

After Phase 1: engine is text-service-free; mainChannel still receives
the same shape of blocks; existing tests pass.

**Phase 2 — Migrate wire-production consumers off `renderToString`.**
Per OQ-1 resolution, the helpers move to `@sharpee/channel-service`.
- transcript-tester (`story-loader.ts`) — import path swap.
- Story scaffolding (`stories/cloak-of-darkness/run-platform.js`,
  `test-runner.ts`, `test-parser-events.js`) — same.
- bridge / runtime / sharpee re-exports of `renderToString` /
  `renderStatusLine` re-routed to channel-service; dead
  `ITextService` / `createTextService` re-exports dropped (engine has
  its own engine-private `ITextService`).
- **Zifmia (`ChatOverlay.tsx`, `GameContext.tsx`) — HARD-DEFERRED.**
  `@sharpee/platform-browser` is the primary release mechanism.
  Zifmia is parked; if it ever revives, it will be redesigned from
  scratch rather than ported. Zifmia retains its
  `@sharpee/text-service` import and workspace dep through Phase 2,
  and is allowed to fall out of build at Phase 3.
- **Cloak-of-darkness (`test-runner.ts`, `run-platform.js`,
  `test-parser-events.js`) — DEFERRED.** Discovered during Phase 2
  sub-phase 2.2 to be outside `pnpm-workspace.yaml`, with
  manually-maintained `@sharpee/*` symlinks and pre-existing build
  errors (DOM lib + EngineConfig drift) unrelated to this ADR.
  Joins zifmia in deferred status; allowed to fall out at Phase 3.

After Phase 2: no active-release consumer imports
`@sharpee/text-service`. The package stays alive and compilable
through Phase 2 only because zifmia and cloak still import it;
Phase 3 cuts that cord.

**Phase 3 — Delete `@sharpee/text-service`.** Remove the package
directory and the workspace entry. Zifmia falls out of build at this
point — accepted collateral per the hard-defer policy. The platform
is not held hostage to a parked product; any future zifmia revival
starts from a clean modern foundation.

Each phase has its own implementation plan in
`docs/work/text-service-removal/`.

## Implementation Modules

The following packages and files own each piece of the decision. The
`Status` column distinguishes new files, modifications to existing
files, files ported from `@sharpee/text-service`, and the eventual
deletion targets.

| Piece | Package | File | Status |
|-------|---------|------|--------|
| Pipeline class | `@sharpee/engine` | `src/prose-pipeline/pipeline.ts` | new |
| Internal barrel | `@sharpee/engine` | `src/prose-pipeline/index.ts` | new |
| Filter stage | `@sharpee/engine` | `src/prose-pipeline/stages/filter.ts` | port from text-service |
| Sort stage (ADR-094 chain metadata) | `@sharpee/engine` | `src/prose-pipeline/stages/sort.ts` | port from text-service |
| Block assembler | `@sharpee/engine` | `src/prose-pipeline/assemble.ts` | port from text-service |
| Handler families | `@sharpee/engine` | `src/prose-pipeline/handlers/*.ts` | port from text-service (one file per handler family — room, revealed, generic, game, help, about, audibility, plus the inline domain-message / implicit-take / command-failed / client-query paths refactored into their own files) |
| Bracket parser | `@sharpee/engine` | `src/prose-pipeline/decorations/parser.ts` | new |
| Platform vocabulary constant | `@sharpee/engine` | `src/prose-pipeline/decorations/platform-vocabulary.ts` | new |
| Class-name resolver | `@sharpee/engine` | `src/prose-pipeline/decorations/resolver.ts` | new |
| Engine wiring | `@sharpee/engine` | `src/game-engine.ts` | modified — replace `createTextService` import + 3 `processTurn` call sites with `ProsePipeline` |
| `ITextService` interface (transitional) | `@sharpee/engine` | `src/prose-pipeline/types.ts` | new (port from text-service; renamed in follow-up cleanup) |
| Mock pipeline (test helper) | `@sharpee/engine` | `src/test-helpers/mock-prose-pipeline.ts` | new (replaces `mock-text-service.ts`, deleted) |
| Revised `IDecoration` shape (`type` → `className`) | `@sharpee/text-blocks` | `src/types.ts` | modified — `IDecoration { className, content }`; `CORE_DECORATION_TYPES` constants removed (vocabulary lives in engine) |
| Browser renderer translation of `IDecoration` | `@sharpee/platform-browser` | (browser renderer files — exact path settled during implementation) | modified — emit `<span class="...">` from `IDecoration` nodes |
| Terminal renderer translation of `IDecoration` | `@sharpee/channel-service` | `src/render-to-string.ts` (mode: 'plain' \| 'ansi') | new — see Open Questions OQ-1 (RESOLVED) |
| Platform `.sharpee-*` prose CSS file | `templates/browser/decorations.css` | shipped via `build.sh` browser path | RESOLVED in Phase 1 sub-phase 1.7 (see OQ-2) |
| `renderToString` replacement helper | `@sharpee/channel-service` | `src/render-to-string.ts` | new — see Open Questions OQ-1 (RESOLVED) |
| Wire-production exports removal | `@sharpee/text-service` | `src/index.ts` and call sites in `bridge`/`runtime`/`sharpee` re-exports | deleted in Phase 2 |
| Whole package deletion | `@sharpee/text-service` | (entire package directory + workspace entry) | deleted in Phase 3 |

### What this ADR does NOT specify

- **Multi-class spans** (one decoration carrying two or more classes).
  Not supported in this ADR; authors nest. A future ADR may add
  shorthand.
- **CSS asset distribution mechanism.** The platform ships a CSS
  file containing `.sharpee-*` rules; how it lands on disk for each
  client (browser, terminal-with-styling, transcript output) is left
  to the implementation plan and informed by ADR-170 component
  theming infrastructure.
- **Per-channel renderer specifics.** The browser renderer emits
  `<span class="...">`; the terminal renderer translates classes to
  ANSI codes (or strips them); the audio renderer ignores
  decorations. Each renderer's translation table is local to its
  package.
- **Decoration support inside formatter-chain expansion.** Whether
  `{the:item}` can produce decorated output is a follow-up question.
  The current ADR assumes formatter chains produce plain text and
  decoration brackets wrap the result if needed.

## Acceptance Criteria

- **AC-1**: `[em:Zork]` in a template resolves to a `TextContent`
  array containing one `IDecoration` whose `className` is
  `'sharpee-em'`. Verified by unit tests on the parser/resolver.
- **AC-2**: `[thief-taunt:'…']` (a name not in the platform
  vocabulary) resolves to an `IDecoration` whose `className` is
  `'thief-taunt'` (no prefix). Verified by unit tests.
- **AC-3**: Nested decorations resolve to nested `IDecoration` nodes.
  `[em:[strong:bold italic]]` produces an outer `sharpee-em`
  containing an inner `sharpee-strong`. Verified by unit tests.
- **AC-4**: Templates containing literal `\[` produce a plain `[`
  character in the resolved output, not a decoration. Verified by
  unit tests.
- **AC-5**: Existing template prose without any decoration markers
  produces blocks with single-string `content` arrays — same shape
  as today's no-op-decoration output. No regressions for the
  Dungeo / cloak-of-darkness / concealment-test transcript suites.
- **AC-6**: After Phase 1, `@sharpee/engine` has no import of
  `@sharpee/text-service`. The full Dungeo walkthrough chain
  (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`)
  passes with zero regressions.
- **AC-7**: The platform CSS file ships `.sharpee-em`,
  `.sharpee-strong`, `.sharpee-u`, `.sharpee-st`, `.sharpee-code`,
  `.sharpee-super`, `.sharpee-sub`, and the IF-semantic and
  color/size starter classes. The browser smoke test renders an
  `[em:emphasized]` template with visible italic in a default theme.
- **AC-8**: After Phase 2, no `*.ts` / `*.tsx` / `*.js` source file
  outside `packages/text-service/`, `packages/interpreter/`, and
  `stories/cloak-of-darkness/` imports anything from
  `@sharpee/text-service`. The zifmia and cloak carve-outs are
  intentional — both are deferred and will be allowed to fall out
  of build at Phase 3. Verified by grep.
- **AC-9**: After Phase 3, `@sharpee/text-service` does not exist on
  disk. `pnpm install` succeeds; full repo test pass; full Dungeo
  walkthrough chain passes.
- **AC-10**: An unclosed bracket in a template (`"hello [em:world"`,
  no closing `]`) is emitted as literal text — the parser yields
  `[ "hello [em:world" ]` as the `TextContent` array, no
  `IDecoration` node created. Forgiving by design; matches Markdown
  convention ("if it's not closed, it's not markup"). Verified by
  parser unit test.
- **AC-11**: A bracketed expression with no colon (`"hello [em world]"`)
  is emitted as literal text — the parser yields
  `[ "hello [em world]" ]`, no `IDecoration` node. Same forgiving
  rule. Verified by parser unit test.
- **AC-12**: A bracket with empty class name (`"hello [:world]"`)
  yields the inner content as plain text — the parser yields
  `[ "hello ", "world" ]` (no decoration wrapping); the empty class
  name is treated as a no-op wrapper rather than emitting an empty
  `className`. Verified by parser unit test.

Each AC has a real-path test per the integration-reality discipline
in CLAUDE.md. Acceptance for the platform CSS shipping (AC-7) requires
a browser smoke test, not just a unit test, because the styling layer
is renderer-specific.

## Consequences

### What this enables

- **Authors get a real decoration vocabulary.** Bold, italic,
  strikethrough, color, story-defined styles — all expressible via a
  single bracket syntax, all themed by CSS.
- **Theming reaches prose.** ADR-170 component theming covers UI
  chrome; this ADR extends the same CSS-driven model to in-prose
  decorations. A theme can restyle `.sharpee-item` without any code
  change in stories or platform.
- **Engine owns the runtime per-turn pipeline end-to-end.** Sound
  dispatch, prose translation, channel-packet build — all inside one
  package, symmetric and discoverable.
- **Dependency graph simplifies.** First-party packages stop
  depending on `@sharpee/text-service` after Phase 1. Downstream
  packages stop after Phase 2. Package deletion completes Phase 3.
- **The `audibility` channel's prose half (ADR-172 AC-6) lands**
  via the audibility handler that moves with the rest of the
  pipeline. The handler I drafted in this session ports cleanly to
  the new location with no shape change.

### What this constrains

- **All decoration goes through the bracket syntax.** Authors who
  want decoration write `[name:content]`. There is no second
  mechanism (no asterisks, no inline HTML, no inline styles).
- **All decoration emits via CSS class.** Renderers translate
  classes to their target (HTML class, ANSI code, etc.). No
  decoration affects the wire shape — only the `className` string.
- **Platform vocabulary changes are platform-scope changes.** Adding
  `[blink:...]` to the canonical set requires a code change to
  `prose-pipeline/decorations/platform-vocabulary.ts` plus a CSS
  rule. Authors cannot add to the platform vocabulary in their own
  story; they add author classes to their own CSS file.
- **The `sharpee-` CSS namespace is reserved.** Stories that
  override platform decoration styling override the existing
  `.sharpee-*` rules in their own CSS — they do not declare new
  `sharpee-*` rules. (The "extend the platform vocabulary" exception
  noted under Class vocabulary is the one documented case.)
- **Chain-metadata sorting (ADR-094) lives inside engine now.**
  Code that previously imported sort utilities from
  `@sharpee/text-service` must use the engine-internal copy or have
  the utility lifted to a shared location (decided during Phase 1).

### What this forecloses

- **Semantic HTML elements in prose output.** `[em:...]` does not
  emit `<em>` — it emits `<span class="sharpee-em">`. Accessibility
  consequence: screen readers see all spans uniformly. Mitigation
  available but out of scope: the renderer could add ARIA hints
  (`role="emphasis"`) per platform-vocabulary class. Future ADR if
  demand surfaces.
- **Inline `style="..."` markup in templates.** The mechanism does
  not exist; authors who want one-off styling write a CSS class.
- **Multiple `text-service` consumers.** No package outside
  `@sharpee/engine` translates events to blocks anymore.

### What this doesn't touch

- **Channel-service architecture (ADR-163).** Unchanged. Same
  `build({ events, blocks, world, turn })` API.
- **Channel definitions in stdlib.** `mainChannel`, `audibilityChannel`,
  `mediaChannel`, etc. — unchanged. They continue to read
  `ctx.blocks` and `ctx.events` as today.
- **Engine's external API surface.** `setStory`, `executeTurn`,
  `start`, `stop`, etc. — unchanged.
- **`languageProvider` interface.** `getMessage(id, params): string`
  unchanged; the prose pipeline injects it the same way text-service
  did.
- **Action authoring.** Actions emit semantic events with
  `messageId` exactly as before; templates resolved by the language
  provider continue to be plain strings (now optionally containing
  bracket markup).
- **Chain-metadata semantics (ADR-094).** Unchanged; only the code
  location moves.

### Risks and trade-offs

- **Phase 1 is a large single refactor.** Porting every text-service
  handler plus the parser/resolver implementation in one phase is
  the cost of going inside engine cleanly. Mitigation: each handler
  is small (~50 lines) and existing tests cover behavior — port
  with tests, run the full suite per handler.
- **Closed platform vocabulary requires a release for new
  decoration types.** Authors who want a new typographic primitive
  cannot add it themselves; they must request platform support or
  use an author class with their own CSS. Acceptable trade for
  predictable theming.
- **Browser smoke test is human-verified.** AC-7's "italic visible
  in default theme" requires a person to look at the screen.
  Existing pattern (ADR-169) — accepted.
- **The `sharpee-` namespace conflicts** if a story author has
  already named a CSS class `sharpee-something`. This ADR locks the
  prefix as reserved going forward; pre-existing collisions are
  unknown but presumed not to exist (no story currently consumes
  decoration CSS).

### Backwards compatibility

None. Per project policy, no shims. Phase 1 is a hard cutover for
engine-internal block production. Phases 2 and 3 are coordinated
removals across consumers; downstream packages cut over per their
own update windows. Story content does not change shape — templates
that use no decorations continue to work.

## Open Questions

Each item names the phase it blocks; resolution lands in the
implementation plan for that phase before work starts.

### OQ-1 — Where does the `renderToString` replacement helper live?

**Status**: RESOLVED 2026-05-10.

**Resolution**: ship the helper in **`@sharpee/channel-service`** as
`src/render-to-string.ts`, exporting `renderToString` and
`renderStatusLine` with the same signatures `@sharpee/text-service`
exposes today. The mode parameter (`ansi: boolean`, plus the existing
`CLIRenderOptions` shape) carries terminal-vs-plain selection.

**Why channel-service**:

- **Right dependency position.** Channel-service sits downstream of
  the engine and upstream of clients. Renderers, chat overlays, and
  transcript tooling already import it; the engine never does. Adding
  the flattening helper here doesn't push imports in a wrong direction.
- **Owns the data being flattened.** Channel-service defines the
  `channel:packet` shape that wraps the `ITextBlock[]` consumers want
  to flatten. The helper that consumes that shape lives with the shape.
- **No new package warranted.** Two functions don't justify a new
  workspace, build target, or version line. Phase 1 already added one
  new module (engine prose-pipeline); a second new package would be
  premature. If the helper outgrows two functions later, splitting
  into a new package is reversible.
- **Phase 3 deletion stays mechanical.** Once consumers are migrated,
  deleting `@sharpee/text-service` is a directory removal plus a
  workspace edit. No re-routing of imports through new packages.

**Rejected candidates**:

- `@sharpee/engine` (or its prose-pipeline subdirectory) — violates
  dependency direction. Zifmia, transcript-tester, and chat overlays
  must not need the engine just to flatten blocks for display.
- New `@sharpee/wire-utils` package — over-engineering for two
  functions; revisit if the helper set grows.
- Per-consumer reimplementation — three near-identical copies invite
  drift, which is exactly what this ADR set out to fix.

**Phase 2 plan implication**: Phase 2 begins by copying
`renderToString`, `renderStatusLine`, and `CLIRenderOptions` from
`packages/text-service/src/cli-renderer.ts` into
`packages/channel-service/src/render-to-string.ts`, re-exporting from
`@sharpee/channel-service/src/index.ts`, and migrating the four call
sites plus bridge/runtime/sharpee re-exports. The original stays in
`@sharpee/text-service` until Phase 3 deletes the package.

### OQ-2 — Where is the platform `.sharpee-*` prose CSS file shipped from?

**Blocks**: Phase 1 AC-7 (browser smoke test renders `[em:emphasized]`
with visible italic in default theme).

The platform must ship a CSS file containing `.sharpee-em`,
`.sharpee-strong`, `.sharpee-u`, `.sharpee-st`, `.sharpee-code`,
`.sharpee-super`, `.sharpee-sub`, plus the IF-semantic and color/size
starter classes. Open: which package owns the file, and how it
reaches a deployed story bundle.

Candidates:

- **`@sharpee/platform-browser/assets/`** — sibling to the existing
  ADR-170 component theme CSS files; bundled with the browser client
  by `build.sh`. Most likely answer if the CSS only needs to reach
  browser builds.
- **`@sharpee/sharpee` distribution** — re-exported alongside the
  platform `.d.ts` GenAI API; reaches story author tooling. Use if
  non-browser consumers (transcript previews, etc.) need the same
  styling reference.
- **New `@sharpee/prose-css` asset package** — clean separation; only
  warranted if the file outgrows a single source-of-truth and needs
  versioning independent of platform-browser.

ADR-170 component theming established a CSS-shipping path for the
component vocabulary (`.sharpee-app`, `.sharpee-titlebar`, etc.).
The prose CSS likely follows the same pattern — verify the existing
ADR-170 mechanism's exact location and shipping rule during Phase 1
implementation, and place the prose CSS alongside it.

### OQ-5 — Pre-flight grep scope for package deletions (resolved during Phase 3)

**Status**: Resolved 2026-05-10 — recorded for future package-deletion phases.

The Phase 3 plan's pre-flight grep scope was incomplete. It searched
source imports across the repo but only checked a hand-listed set of
config files. Five additional files were missed and surfaced as
breakage during 3.3:

- `packages/transcript-tester/tsconfig.json` — `../text-service`
  project reference (broke `tsc` build of transcript-tester)
- `stories/dungeo/tsconfig.json` and `tsconfig.esm.json` — `text-services`
  paths mapping (typo, never resolved, but matched grep)
- `stories/dungeo/package.json` and `tutorials/familyzoo/package.json`
  — `@sharpee/text-service: workspace:*` dep declarations (broke
  `pnpm install` after directory deletion)
- Also: `pnpm-workspace.yaml` overrides `package.json workspaces[]` —
  the package.json edit alone does not affect pnpm's resolution graph.
  Use `!packages/<name>` excludes in `pnpm-workspace.yaml` to remove
  packages from the workspace.

**For future package-deletion phases**, the pre-flight grep scope
must be:

```bash
# Config files that can break a build
grep -rln "<package-name>" \
  --include='package.json' \
  --include='tsconfig*.json' \
  --include='*.sh' \
  --include='*.js' \
  --include='*.yaml' \
  --include='*.yml' \
  packages/ stories/ scripts/ tutorials/ \
  | grep -v node_modules
```

Source-import grep is necessary but not sufficient. Config-file
references are load-bearing for build and install steps, and missing
them produces failures during deletion that are recoverable but waste
budget.

## Session

This ADR was produced in `session-20260509-recap-main-text-service`
(this session — Sharpee main, branch `main`, 2026-05-09 evening).
The trail of decisions:

1. ADR-172 Phase 7 prose-handler work surfaced that audibility
   prose was unwired despite Phase 5 templates and Phase 6 events
   being in place.
2. Initial Phase 7a implementation added a handler in
   `@sharpee/text-service`, following the existing handler pattern.
3. David flagged that text-service had been replaced by
   channel-service. Audit followed
   (`docs/work/text-service-removal/audit-20260509-removal-options.md`)
   and surfaced that the 2026-05-03 R8 disposition doc had retained
   text-service block-production indefinitely — a decision David
   does not endorse.
4. Audit enumerated three removal options (A: inline into
   `mainChannel`; B: new prose-pipeline package; C: wire-production
   only this round). David chose option B's structure but inside
   engine rather than as a new top-level package.
5. The decoration-mechanism question was opened in parallel.
   David's intent: mirror HTML+CSS — span+class only, no inline
   styles, CSS-driven theming. The existing ADR-091 BBCode-style
   markup is unused in any template; the mechanism can be redesigned
   without breaking content.
6. Locked: bracket markup `[name:content]`, single closed platform
   vocabulary with `sharpee-` prefix, author classes pass through
   bare, structured wire shape (`IDecoration { className, content }`).
   `b` resolved to `strong`; `em`/`it` resolved to `em`.

The Phase 7a audibility handler in
`packages/text-service/src/handlers/audibility.ts` (added earlier in
this session, 7 unit tests passing) is correct under the current
architecture and ports to the new location during Phase 1 of this
ADR. No revert needed; it travels with the rest of the handlers.

## References

- ADR-091 — Text Decorations (superseded for markup syntax and
  `IDecoration` shape)
- ADR-094 — Event Chaining (preserved; sort code moves)
- ADR-096 — Text Service Architecture (superseded for package home)
- ADR-097 — Domain Events with messageId (preserved)
- ADR-133 — Structured Text Blocks (preserved at concept level)
- ADR-163 — Channel-Service Platform (preserved; integration
  unchanged)
- ADR-165 — Renderer Architecture (preserved)
- ADR-170 — Component-Based Theming (composes; same CSS layering)
- ADR-172 — Spatial Sound Propagation (Phase 7a audibility prose
  handler is the immediate consumer of the new pipeline)
- `docs/work/text-service-removal/audit-20260509-removal-options.md`
  — consumer matrix and removal-option audit
- `docs/work/channel-io-unification/text-service-disposition-20260503.md`
  — the R8 disposition this ADR reverses

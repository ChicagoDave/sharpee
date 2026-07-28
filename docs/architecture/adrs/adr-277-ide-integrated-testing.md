# ADR-277: IDE integrated testing (transcript runner, walkthrough chains, transcript authoring)

## Status: ACCEPTED (2026-07-27, session 8a8c83) — test results become an NDJSON wire contract in `ide-protocol` emitted by `sharpee test --json` (D1); the IDE gains a right-panel Test tab, ⌘U (D2); walkthrough chains live in top-level `walkthroughs/`, filename order, bare runs stay `tests/`-only (D3); `.transcript` is an editable document type with line-classifier highlighting (D4); recording is a follow-on phase over a new turn-events bridge, `[OK]`+comment capture (D5). Open Questions resolved by `adr-interview`; `adr-review` 14/15 → **15/15** after two folds (bare-run semantics; type-only ide-protocol import).

## Status: IMPLEMENTED (2026-07-27, session 8a8c83 — same-day, all four phases of `docs/work/adr-277-ide-testing/plan.md`)

**Implementation addendum**: Phase 1 (platform: ide-protocol NDJSON contract,
transcript-tester status/`totalErrors`/aggregation + record builders, devkit
`--json`/`.story`-arg/`walkthroughs/` scan, validation-vanish bug fixed);
Phase 2 (Swift: `TestResultRecord` mirror with loud schema gate, streaming
`TestRunner`, right-panel Test tab + `TestPanelModel`/`View`,
`TestController`, Test menu ⌘U family, rule-13a real-path tests against the
real devkit CLI); Phase 3 (`TranscriptHighlighter` line classifier +
per-extension dispatch); Phase 4 (D5: `emitTurnEvent` DOM-level capture in
`BrowserClient.executeCommand`, `turnEvents` WK channel, Play-header
Record/Stop, `RecordingSession` + save flow; **`[OK: any]` grammar addition
per the amended Q4b** — real-path proof that a recorded transcript re-runs
green through the real CLI). Final suites: IDE 236/236, platform-browser
96/96, transcript-tester 13/13, devkit 107/107, ide-protocol 23/23;
`./repokit build` clean. As-built deviations recorded per phase in the plan.

## Date: 2026-07-27

## Parent: ADR-185 (the IDE is a standalone authoring tool), ADR-258 (the IDE is a Chord authoring environment). Downstream of ADR-073/ADR-134 (transcript testing), ADR-187 (two test CLIs, split by audience), ADR-109 (playtester annotations). The original IDE phase plan (`docs/work/sharpee-ide/plan-20260509-phases.md`) deferred "transcript file preview" and "walkthrough player UI" to v2 — this ADR is that v2 item, scoped by David's ruling of 2026-07-27: **transcript test runner + walkthrough chains + transcript authoring/recording. The IDE's own integration-test coverage is explicitly NOT this ADR.**

## Context — verified, not assumed

- **The IDE has no test surface.** No file under `tools/ide/` mentions
  `transcript`, `walkthrough`, or `wt-` (grep, zero hits). There is no Test
  menu (`MenuBuilder.swift:16` — Build only).
- **The author-side test CLI exists but is human-only.** `sharpee test`
  (`packages/devkit/src/commands/test.ts:33`) resolves a project directory
  (cwd, registered name, or path — a **directory**, not a `.story` file;
  `test.ts:61`), finds transcripts under `<dir>/tests/` only (`test.ts:81-82`),
  supports `--chain` / `--stop-on-failure` / `--verbose`, and reports via
  transcript-tester's chalk reporter. Exit codes 0/1/2/3. **No JSON mode.**
- **No machine-readable results contract exists anywhere the IDE can reach.**
  The only JSON output today is `results_<ts>.json` from the standalone
  `transcript-test` bin (`transcript-tester/src/reporter.ts:277-300`) — an
  unversioned `JSON.stringify` of internal types (`TestRunResult`,
  `types.ts:226-233`), no `schemaVersion`, no guards, not in `ide-protocol`,
  and unreachable from `sharpee test` or the bundle `--test`.
- **Result granularity gaps in the current types.** `TranscriptResult` carries
  per-command counts only — there is no per-transcript pass/fail/error status,
  and no "error" state distinct from "failed". Worse, a transcript that fails
  validation is **skipped and uncounted** (`devkit test.ts:110-114`,
  `bundle-entry.js:707-714`): it vanishes from the results entirely.
  Aggregation is a plain `reduce` duplicated in all three CLI callers.
- **The IDE already has the exact subprocess template this needs.**
  `ComposeRunner` (`tools/ide/SharpeeIDE/Compose/ComposeRunner.swift:45-91`)
  runs `sharpee compose <file> --json`, buffers stdout, decodes a versioned
  `ComposeJsonPayload` with a typed `Failure` enum, and resolves the binary via
  the workspace shim / login-shell PATH (`resolveSharpee`, `:67-77`).
  `BuildRunner` (`Build/BuildRunner.swift`) is the streaming-output template
  (Pipe readabilityHandler → MainActor, SIGTERM/SIGKILL cancel).
- **Panel and navigation infra is in place.** `TabStripView` with dynamic tabs
  and red count badges; right panel tabs Build/Play/Index/Diagnosis
  (`RightPanelViewController.swift:27-31`); bottom dock tabs Problems/Game
  Errors; `ProblemsView` is the precedent for a clickable file:line results
  list wired to `openDocument(at:line:column:)` (`MainWindow.swift:537-542`).
- **`ide-protocol` is the contract home.** `packages/ide-protocol` already
  carries two independently-versioned wire contracts (project manifest;
  `compose --json` diagnostics, ADR-258 D5) under types-only / no-runtime-types
  rules, with TS guards + Swift `Codable` mirrors that reject unknown
  `schemaVersion` loudly. Nothing test-related is exported today.
- **The transcript grammar is line-oriented and small.** Header `key: value`
  lines to `---`; `> command` lines; `[...]` assertions (`[OK…]`, `[FAIL…]`,
  `[EVENT…]`, `[STATE…]`) and directives (`[GOAL]`, `[IF]`, `[WHILE]`,
  `[RETRY]`, `[DO]/[UNTIL]`, `[REQUIRES]`, `[ENSURES]`, `[NAVIGATE TO]`);
  `$` test-commands; `#` comments. Single-pass parser at
  `transcript-tester/src/parser.ts:30`.
- **No recording seam exists.** The Play pane's only JS→Swift channel is
  `playConsole`, carrying error strings (`PlayViewController.swift:14,
  197-205`). The browser client's `InputManager.commandHistory` is in-memory
  and uncalled. ext-testing's annotation capture (ADR-109) is wired into the
  test runner, not into play. CLI `--play` logs nothing.
- **Walkthrough layout convention diverges.** In-repo stories keep chains in
  `stories/<name>/walkthroughs/wt-*.transcript` — outside the `tests/` subtree
  `sharpee test` scans. Author projects have no walkthrough convention at all
  yet.

## Decision

### D1 — Test results become a versioned wire contract in `@sharpee/ide-protocol`, emitted by `sharpee test --json`

The contract lives once in `ide-protocol` (types-only, no runtime types —
DEVARCH 8b; Swift mirrors it as `Codable` structs that reject an unknown
`schemaVersion` loudly, pinned by tests on both sides), following the
`compose --json` precedent (ADR-258 D5) for versioning and layering.
`sharpee test` gains a `--json` flag that emits this contract; the human
reporter remains the default. `sharpee test` also learns to accept a
`.story` FILE argument, resolving the project as the file's containing folder
(Q5 resolved 2026-07-27) — one mental model across `build`/`compose`/`test`,
and the IDE passes exactly what it has open. The bundle `--test` (platform
CLI) is NOT in scope — the IDE is an author tool and invokes `sharpee test`
(ADR-187 R1).

**Delivery is an NDJSON event stream, not a buffered payload** (Q1 resolved
2026-07-27): one JSON object per stdout line — `run-start`,
`transcript-start`, `command-result`, `transcript-end`, `run-end` — each
carrying the schema version discriminator per the contract's definition. A
test run lasts minutes (walkthrough chains), so the Tests panel fills live,
and a cancelled run keeps every result up to the cancel point — unlike
compose, where a subsecond compile makes buffering right. The Swift side
decodes line-buffered NDJSON rather than one `JSONDecoder` pass.

The contract fixes the granularity gaps rather than serializing today's
internal types:

- **Per-transcript status**: `passed | failed | error` — `error` covers
  validation failures and load/runtime errors, so a broken transcript is a
  loud red row, never a silent skip.
- **Per-command records** carry the command's line number in the `.transcript`
  file (the parser already tracks lines), so every result row can click
  through to its source line.
- **Run-level aggregation lives in the contract's emitter** (one function in
  transcript-tester), not a fourth hand-rolled `reduce`.

### D2 — The IDE gains a Tests surface

A Tests panel that: discovers the open story's transcripts, runs one / all /
a chain via `sharpee test --json` (resolved exactly as `ComposeRunner`
resolves `sharpee` today), and renders results as a clickable list — transcript
rows with status, expandable to per-command rows, click-through to
`.transcript` file:line via the existing `openDocument` plumbing
(ProblemsView precedent). A Test menu drives it (run-all ⌘U,
run-current-file, cancel). Runs are cancellable (BuildRunner's
SIGTERM/SIGKILL pattern).

**The surface is a right-panel Test tab** (Q3 resolved 2026-07-27) — a
full-height sibling of Build/Play/Index/Diagnosis holding the transcript tree
and the live results list in one pane, following the Build-pane precedent.
Nothing is added to the bottom dock.

### D3 — Walkthrough chains are first-class runs

A chain run maps to `sharpee test --chain --stop-on-failure <ordered files>`.
The runner semantics (one game instance, state persists, `$save`/`$restore`)
are the platform's existing `--chain` semantics, unchanged.

**Chains live in a top-level `walkthroughs/` directory beside `tests/`**
(Q2 resolved 2026-07-27), matching the in-repo story convention
(`stories/<name>/walkthroughs/`). The directory is one chain; order is
filename sort (the existing `wt-01`, `wt-02`, … practice). No manifest.
`sharpee test` learns to scan `walkthroughs/` and runs its contents with
chain semantics; the plain `tests/` scan is unchanged.

**Bare-run semantics** (review finding 1, ruled 2026-07-27): a bare
`sharpee test` runs the `tests/` subtree only — the fast unit loop stays
fast. The `walkthroughs/` chain runs when explicitly requested: `--chain`
with no explicit files runs the chain, and the IDE's chain-run action does
the same.

### D4 — `.transcript` is an editable document type in the IDE

`.transcript` files open in the editor pane with syntax highlighting. Because
the grammar is line-oriented and small, highlighting is a Swift
line-classifier (header / command / assertion / directive / comment /
expected-output), NOT a lexer port with a TS-side golden fixture — that
machinery (ADR-258 D7) exists because Chord's TS lexer is authoritative for
spans; here a mis-classified line is cosmetic and the runner stays
authoritative. No conformance pin.

### D5 — Recording a transcript from Play requires a turn-events bridge

> **Extended by ADR-282 (2026-07-27)**: the recorded turn record gains
> per-turn verdict (bless), response-selection, and checkpoint marks;
> saves with zero blessed turns are refused (supersedes Acceptance 7's
> unconditional save).

Capturing play into a draft `.transcript` needs the browser client to post
command/response turn events over a new WKWebView message channel (sibling of
`playConsole`) — a `platform-browser` change, since no turn-level JS→Swift
channel exists.

**Recording is a follow-on phase of this ADR** (Q4a resolved 2026-07-27):
the runner/editor arc (D1–D4) ships first; the turn-events bridge and capture
UI sequence behind it in the same plan.

**Capture format** (Q4b resolved 2026-07-27; **amended same day during
implementation**): each turn is written as `> command` + `[OK: any]`
(presence-only — passes when the command produced any output), with the
actual response captured as `#` comment lines for the author's reference.
Story text is deliberately RNG-varied (randomness is never seeded or
disabled — standing policy), so a verbatim expected-output capture would be
brittle on replay; the presence-only default re-runs green immediately, and
the author tightens assertions by hand. The assertion also satisfies the
validator's every-command-needs-an-assertion rule.

*Amendment rationale*: the original ruling assumed bare `[OK]` was
presence-only; Phase 1 implementation found it is an EXACT match against the
expected-output block (`runner.ts:1174`) — with none recorded it always
fails. David's ruling (2026-07-27): add the explicit `[OK: any]` assertion
form to the transcript grammar (transcript-tester parser + runner — a small
authorized addition under this D5); bare `[OK]`'s semantics are untouched
(no in-repo transcript uses a bare `[OK]` line).

### D6 — Scope guard

This ADR authorizes the platform-side changes it names (ide-protocol test
contract; `sharpee test --json`; the D5 turn-events channel when its question
resolves) and nothing else in `packages/`. The IDE's own integration-test
coverage (XCUITest or similar) is out of scope per David's ruling. Swift-side
tests for the runner follow rule 13a: they drive the real `sharpee` CLI
against a real fixture story, not a stand-in.

## Acceptance

1. `ide-protocol` exports the test-results contract with its own schema
   version, TS guards, and tests; Swift decodes it and loudly rejects an
   unknown version (test pinned).
2. `sharpee test --json` emits the contract; a validation-broken transcript
   appears as a transcript-level `error` record (test proves it no longer
   vanishes).
3. In the IDE: run-all on a story with a failing transcript shows the failure
   row; clicking a failed command opens the `.transcript` at that line.
4. A walkthrough chain run in the IDE preserves state across files (a chain
   that only passes with `--chain` passes in the IDE).
5. `.transcript` files open with highlighting; editing and re-running works
   without leaving the IDE.
6. A Swift real-path test drives the real `sharpee test --json` against a real
   fixture story (rule 13a) and decodes the live payload.
7. Recording (follow-on phase): a play session in the Play pane can be
   captured and saved as a `.transcript` (per-turn `[OK: any]` + `#`-comment
   responses) that immediately re-runs green against the same build.
   *Superseded by ADR-282 Acceptance 3 (2026-07-27): zero-bless saves are
   refused once play-to-test lands; the shipped real-path test for this
   criterion is updated accordingly.*

## Consequences

- `ide-protocol` gains a third independently-versioned contract; devkit and
  transcript-tester gain a dependency direction toward it (transcript-tester
  does not import ide-protocol today — the emitter's home must respect
  layering: contract types in ide-protocol, emission where the results are).
  Because ide-protocol re-exports the Chord Story IR wholesale, the emitter's
  import is **type-only** (`import type`) — transcript-tester gains no
  runtime dependency on chord; the edge is types-at-build only (review
  finding 2).
- The per-transcript status and line-number data D1 requires must come out of
  transcript-tester's runner/parser as data, not be re-derived by scraping —
  small additive changes to its types are in scope.
- The three duplicated aggregation `reduce`s become one shared function as a
  side effect of D1.
- The IDE gains its first long-running cancellable subprocess with structured
  streaming output — the NDJSON runner (Q1) becomes the template for future
  long-run tooling.
- Authors get a testing story inside the IDE without ever seeing the CLI;
  the CLI remains the source of truth for CI and blind-user workflows
  (client-positioning ruling).

## Session

Drafted 2026-07-27, session 8a8c83 (`docs/context/session-20260727-1640-main.md`),
from a code survey of transcript-tester, devkit `test.ts`, `ide-protocol`, and
`tools/ide` — file:line references above are from that survey.

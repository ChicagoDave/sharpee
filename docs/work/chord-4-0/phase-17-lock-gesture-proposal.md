# Phase 17 proposal — The lock gesture, the broken-claim report, and UPPS claims

**Date**: 2026-10-20 · **Session**: e28264 · **Plan**: `plan-20261013-chord-4-0.md` Phase 17 (Large, 400) · **Status**: PROPOSED — the `packages/` and `tools/ide` items below wait on David's go

ADR-367 D6 (the broken claim is a failed card, the report names it), D7 (two surfaces, one path: the Testing tab's lock gesture), AC-4, AC-5's canonical gate, AC-6; GH #584 and #585 (the story's output on a failed claim, CLI and opening); the claims rows on the run-event wire that GH #555 held back; and UPPS's claims at its room commits.

## What exists today (measured 2026-10-20)

- **The pin is evaluated but cannot fail a card.** `createClaimFloor` records each lock's outcome at its card and the claims report prints `lock "<name>" … — NOT held there`; the card's result is untouched, so a broken lock leaves the run green (Phase 16, by design, deferred here).
- **A card's failure can be injected from the walker.** The runner's `record()` (`branch-tester/src/runner.ts:211`) pushes the result and calls the observer on the same object; the line's status is tallied from `results[].passed` afterwards (`runner.ts:316`). The walker already mutates the result there (`attachCause`, `tree-walker.ts:472`). So a lock verdict can be merged into the card's own `assertionResults` and `passed` with no new assertion type in the assertion core.
- **The story's output already rides the wire on a failed card** (`run-event-stream.ts:256`, `actualOutput` unless passed) and the tab renders it (`cards.ts:960`). The CLI report prints the first failure's message only (`formatTreeDocumentRun`, `tree-walker.ts:588`), and a failed opening carries `actualOutput: ''` (`runner.ts:177`) though it computed `openingOutput` two lines above.
- **The claims tier is text only.** `runClaimsTests` prints to stdout, or to stderr under `--json`; nothing about claims rides the wire. The derived tier is the pattern: `DerivedBranchEvent` / `DerivedRunSummaryEvent` in `ide-protocol/src/run-events.ts:425`, `RunEventStream.derivedBranch` / `derivedSummary` in transcript-tester, `derived.ts` folding and `cards.ts:917` rendering in the tab. Run events are not part of `repokit protocol`'s generated Swift and C# (the hosts relay NDJSON strings; only the page decodes).
- **The tab's host posts are four keyed objects** on `testingSurface` (`{run}`, `{tree}`, `{state}`, `{openSource}`), read by `TestingSurfaceViewController.swift:541` and `TestingSurfacePosts.cs`; the host calls the page back through `window.__sharpeeTestingSurface.{runLine,runExit,runStart,buildChanged}`. Both heads spawn the CLI for Run with the same arguments (`TestRunner.treeRunArguments`, `ShellWindow.axaml.cs:1258`).
- **The page owns the tree while it is open**: every model change posts the files it changed (`main.ts:update`); the host writes them. A CLI that wrote a segment file behind the page would be overwritten on the page's next post. So the tab's lock must pin through the page's model, not through the CLI's tree write.
- **A card's actions are buttons on its action row** (`cards.ts:470`), pickers anchor to their button (`picker.ts`), and `main.ts` owns the options. A card shows one mark today, END STATE (`cards.ts:766`).
- **The Swift real-path suite** (`TestingSurfaceRealPathTests.swift`, 23 cases) boots the real page in a WKWebView over a fixture client and drives Run on real fernhill through the real CLI; it runs from the command line (`xcodebuild test`). PaneHost.Tests unit-tests the post readers.
- **UPPS has one claim**, locked at the Kraken Landing. Its tree reaches 11 rooms.
- Baselines: fernhill 86 / 106, UPPS 244 / 358, Dungeo chain 952, branch-tester 361, devkit 194.

## The shape

### 1. A broken lock is a failed card (D6, AC-4) — `packages/branch-tester`

`TreeLineObserver.onCard` may return the card's lock verdicts; the floor returns them. The walker merges each into the card's result inside the same wrapper that attaches a cause: an `assertionResults` entry `{ assertion: { type: 'lock-assert', value: <name> }, passed, message }`, and when one is not held, `passed = false` and `failure = lock "<name>" not held here: <message>` (the predicate's own words: `the deed box is closed`, `the player is in the Folly Hill`). The line then fails as any failed card fails it (ADR-356 D4), the run exits 1, and the result reaches the wire as a failed `command-result` with the card id and the story's output. `lock-assert` joins `Assertion.type` in transcript-tester's types (a type-level addition; the core never evaluates it) and the stream's describer renders it as `lock "<name>"`.

The claims tier then reports the pinned claim's standing with D6's vocabulary: *held, by line* when another line still reaches it (`HELD … — by line X at turn n; its lock at line Y turn m is NOT held there`), else *not reached by any line* followed by the walk's verdict as today.

### 2. The story's output on a failed card (GH #584, #585) — `packages/branch-tester`

`formatTreeDocumentRun` prints, under a failed line's cite and cause, the first failed card's output indented four spaces, when the result carries it. `openingResult` carries `openingOutput` as its `actualOutput`, so a failed opening claim shows the banner and prologue it was checked against, in the tab and the CLI alike. Both issues close with this phase.

### 3. Claims on the wire — `packages/ide-protocol`, `packages/transcript-tester`, `packages/devkit`, the tab

Two events, after the derived tier and before `run-end`, in the derived tier's shape:

- `claim-result`: `name`, `never`, `kind`, `verdict`, `settledBy` (`line | witness | exhaustion | budget`), `line?` (id, label, turn), `witness?`, `depth?`, `set`, `thingsInSet`, `inertInSet`, and `locks?` (each pin: line id, label, turn, card id, outcome).
- `claims-summary`: `source`, `declared`, `held`, `violated`, `unproven`, `walks`, `totalWalkMs`, `seed?`, `floored`.

`RunEventStream.claimResult` / `claimsSummary`; `runClaimsTests` writes them when it has the stream. The per-claim sentence (`by line … at turn …`, `not reached by any line; …`) moves into a browser-safe `claim-report.ts` in branch-tester that both `formatClaimsRun` and the tab call, so the two surfaces cannot drift (the derived tier's golden-test discipline). The tab's `run.ts` folds the events into `claims` rows and a `claimsSummary`; `cards.ts` renders a third section, `claims · 9 of 10 held`, one row per claim with its verdict badge and sentence; a row with a lock visits its card through the existing `RunVisitTarget` (line id + card id). Nothing here changes the exit code (ADR-365 D9).

### 4. The lock gesture (D7, AC-6) — the tab, `packages/devkit`, both heads

One code path: the tab calls `sharpee claim` through its host, exactly as Run calls `sharpee test`. The CLI gains:

- `--json`: one JSON object on stdout — `{ kind: 'offer', line, turn, cardId, offer }`, `{ kind: 'proposal', …, rooms, things, trimmed, verbs, block }`, `{ kind: 'written', claimsFile, created, name, cardId }`, or `{ kind: 'error', message }` with the exit codes unchanged.
- `--rooms`, `--things`, `--verbs` (comma-separated names): the author's edited lists, written instead of the proposal's; compiled and checked like any fact.
- `--fragment-only`: write the fragment (and report the manifest key it needs) but touch no tree file. The page is the tree's writer while it is open: it pins the card through `pinLockOnCard` (the same function) and sets the manifest's `claims`, then posts the files it changed as it does for every edit.

The page: a **Lock…** button on a turn card's action row. Click → `{ lock: { line, turn } }` → the host runs `sharpee claim <line> --at <turn> --json` and hands the object back through a new page entry, `lockResult(json)` → a list picker of the offered facts, anchored to the button. Pick → `{ lock: { line, turn, fact } }` → `--propose --json` → a lock sheet: the name (editable, the fact by default), three chip rows for rooms, things and verbs, each chip toggleable, the cone's trimmed names present but struck through and off, **Keep** and **Cancel**. Keep → `{ lock: { line, turn, fact, name, needs } }` → `--fragment-only --json` → the page pins and posts. The card then carries a `· LOCK · <name>` mark under its END STATE mark, one per lock, read off the card's `locks` on every render (a loaded document shows its locks before any replay). The turn number comes from a browser-safe `turnOfCard(document, lineId, cardId)` in `tree-document.ts` (typed turns from the root through the card, the walker's rule), which `claim-lock.ts` also uses.

The hosts: a `lock` post spawns the CLI with the page's arguments and relays the one-object stdout to `lockResult`; stderr rides the exit note as Run's does. Swift (`TestingSurfaceViewController`, ~40 lines, through `TestRunner.start`) and C# (`TestingSurfacePosts.ReadLock`, `ShellWindow`, through `HostServices.RunAsync`).

Verification without clicks: the testing-surface vitest real-path test spawns the real CLI on a scratch fernhill copy for all three steps, folds each result through the page's own decoder, pins through the model, and asserts the written segment and manifest are byte-identical to what the CLI writes without `--fragment-only` on a second scratch copy (AC-6); `TestingSurfaceRealPathTests.swift` gains one case that presses Lock on the fixture page wired to a scratch fernhill, answers the picker and the sheet through the DOM, and reads the fragment and the tree off disk; `PaneHost.Tests` gains the post reader's cases. The lock design is built straight from the ADR's D7 sentence rather than a mock first, since every element reuses the tab's existing idioms (action button, anchored picker, chips with ✕, the END STATE mark).

### 5. The fragment's canonical gate (AC-5) — `packages/branch-tester`, `packages/devkit`

Not a reformatter: the gate checks that each `claim` block the lock wrote still reads back as the lock would write it (one predicate line, `needs` lines in rooms/things/verbs order, two-space indent, one blank line between claims). `checkCanonicalFragment(text)` in branch-tester; `sharpee test` reports a non-canonical fragment by name and exits 2 before anything runs, as it does for a tree. A hand-written fragment that already follows the shape (fernhill's does) passes; a comment line between blocks is fine.

### 6. UPPS claims at its room commits

One lock per room the tree reaches beyond the boot room, each from the line and turn that first reaches it, through the CLI: `the player is in the Loading Dock`, `… the Cable Trench`, the Hold, the Cockpit, the Airlock, the Landing Pad, the Collar Vestibule, the Shuttle Gate (the Kraken Landing is locked). Ten claims, every one held by its line on the rerun. Their sets are wide (GH #609); they are the exerciser's and will tighten when the cone learns the vehicle conditions.

### 7. The breaking edit, demonstrated (AC-4) — a devkit real-path test on scratch copies

A scratch UPPS where the drop lever no longer sends the shuttle: `sharpee test` fails the pinned card naming `lock "the player is in the Kraken Landing" not held here`, with the story's output under it, exits 1, and the claims tier says `not reached by any line` and walks. A scratch fernhill where the auction notice cannot be read: every card green, `the auction notice has been read` UNPROVEN by walk, exit 0 — the claim's own verdict moved nothing (ADR-365 D9).

## Changes

**`packages/branch-tester`**: `tree-walker.ts` (`onCard` return, the merge), `claims/claim-floor.ts` (returns verdicts), `claims/claim-report.ts` (new, browser-safe sentences), `claims/claims-runner.ts` (uses it; the *held, by line … lock NOT held* line), `tree-document.ts` (`turnOfCard`), `claims/claim-lock.ts` (uses it; the override lists), `claims/claim-fragment-gate.ts` (new), `runner.ts` (`openingResult` output), `tree-walker.ts` (`formatTreeDocumentRun` output lines); tests for each.
**`packages/transcript-tester`**: `types.ts` (`lock-assert`), `run-event-stream.ts` (`claimResult`, `claimsSummary`, the describer).
**`packages/ide-protocol`**: `run-events.ts` (two events, guards, the union).
**`packages/devkit`**: `commands/claim.ts` (`--json`, the three list flags, `--fragment-only`), `commands/test-claims.ts` (the stream), `commands/test-tree-document.ts` (the fragment gate); tests: the breaking-edit real path, the JSON forms.
**`tools/ide/web/testing-surface`**: `run.ts`, `cards.ts`, `main.ts`, `picker.ts` or a new `lock-sheet.ts`, `surface.css`; tests: the fold, the sheet, the real-path lock.
**`tools/ide/SharpeeIDE`**: `TestingSurface/TestingSurfaceViewController.swift`; `SharpeeIDETests/TestingSurfaceRealPathTests.swift`; the committed surface bundle rebuilt.
**`tools/ide/PaneHost`**: `Shell/TestingSurfacePosts.cs`, `Shell/ShellWindow.axaml.cs`; `PaneHost.Tests`.
**Stories**: `branch-stories/upps/upps.claims.chord` and its tree (nine more pins).
**Not changed**: `packages/chord` (GH #608 stays David's call; the gate accepts a fragment with or without comments between blocks).

## Order of work

1. §1 and §2 (branch-tester, transcript-tester types), with the scratch-UPPS breaking edit proving the failed card and exit 1.
2. §3 the wire and the tab's claims section.
3. §4 the CLI's `--json` forms and `--fragment-only`, then the page's gesture, then the two hosts and their tests.
4. §5 the fragment gate. §6 the UPPS locks. §7 pinned as devkit tests.
5. ADR-367 AC-4, AC-5, AC-6 annotated; GH #555, #584, #585 closed; surface bundle rebuilt and committed.

## Points for David

1. **The sheet, not a mock.** The lock sheet reuses the tab's idioms; I will build it from D7's sentence and show it in the Swift real-path test's run rather than draw it first. Say so if you want an artifact mock before the page is touched.
2. **Both heads.** The Swift head and the Avalonia head each gain the `lock` post; the Avalonia head's real-path coverage stays at its post reader, as Run's does today.

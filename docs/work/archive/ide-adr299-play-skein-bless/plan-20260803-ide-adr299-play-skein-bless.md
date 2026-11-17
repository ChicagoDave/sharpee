# Session Plan: Implement ADR-299 (play–skein–bless)

**Created**: 2026-08-03
**Overall scope**: Replace the IDE's ADR-282 per-turn record/bless interaction with the Inform 7-style skein: a committed, self-contained `.skein` per-story tree (playing always grows it), click-to-replay by re-execution at a pinned seed, scoped declared-then-verified blessings, forced choice-points as first-class branches, an I7 Skein/Transcript view split, all I7 refinements (trim/lock/annotate/badges), and explicit "Save thread as test" export to ADR-294 golden transcripts. The `@sharpee/skein` explorer (D10) is deferred and out of scope for this plan.
**Bounded contexts touched**: N/A — this is a `tools/ide/` (SharpeeIDE, Swift/AppKit) feature build, not `packages/` domain modeling. It does introduce and use the project's IDE-testing ubiquitous language established by ADR-299 itself.
**Key domain language**: Skein, Thread/Node, Bless / Blessing (scope: per-thread vs. all-paths), Tag (D2), Choice Point / Forcing (D5, from ADR-293), Golden Transcript (ADR-294 export target).

## References consulted
- `docs/architecture/adrs/adr-299-play-skein-bless.md` — the authoritative scope (D1–D10); Implementation section names the five build units (model+store, Skein view, Transcript view, replay driver, exporter) and eight Acceptance Criteria (AC-1..AC-8, AC-8 deferred with the explorer) this plan must satisfy.
- `docs/architecture/adrs/adr-282-play-to-test-tagging.md` — SUPERSEDED (interaction model only) by ADR-299; its serialization/grammar (literal text blocks, transcript emission) and the `actualOutput` field on `CommandResultRecord` carry forward unchanged and are reused by the Exporter and Replay Driver phases.
- `docs/architecture/adrs/adr-293-choice-points-per-point-streams.md` — `forces:`/`point-seed:` header fields and per-point RNG streams are the substrate D5's forced branches consume; not re-implemented, only driven.
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — the `.golden` format, `seed:`/`forces:`/`events:` header fields, and the `sharpee test --json` NDJSON contract the Exporter and Replay Driver build on; explorer (`@sharpee/skein`) is planned-not-shipped there, confirming D10 is correctly out of scope here.
- `docs/context/project-profile.md` — confirms `tools/ide` test discipline (Swift/XCTest, real-path via `xcodebuild test`, no CI), RNG/determinism discipline (ADR-291–293: pinned seed, byte-identical assertions), and that `packages/devkit`/`packages/ide-protocol` are the platform surfaces any replay-capture change would touch.
- `docs/context/session-20260803-1506-main.md` — most recent session: ADR-299 was accepted same-session with implementation explicitly NOT started; confirms Play surface (`playSurfaceScript`, storage-clear-on-boot, menu-bar hiding) was just stabilized (`PlaySurfaceScriptTests`, 3 real-WKWebView tests) — Phase 2 below must not regress that fix while retiring `RecordingSession`'s live bless flow.
- `tools/ide/README.md` — conformance obligations (lexer golden, `ComposeJsonPayload`/`ide-protocol` wire-schema mirroring, no CI — local `xcodebuild test` is the only gate) apply to every phase below.

## Phases

### Phase 1: Skein model, file store, and Play Testing project-tree group
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Skein data model (Thread/Node/Tag/Blessing-with-scope/Annotation/Lock), the versioned `.skein` file format (D7), and the project tree's group classifier (D7's "Play Testing" group).
- **Entry state**: ADR-299 ACCEPTED; no skein code exists anywhere in `tools/ide/`. `tools/ide/SharpeeIDE/Project/ProjectArtifacts.swift` already implements the ADR-280 classifier pattern this phase extends (`ArtifactGroup.Kind` enum + `classify(_:storyId:)`), and `tools/ide/SharpeeIDE/Test/RecordingSession.swift` is the ADR-282 model this work supersedes (not yet touched — Phase 2 retires it).
- **Deliverable**: A new `SharpeeIDE/Skein/` (or similarly-scoped) group with: `SkeinNode`/`SkeinThread`/`SkeinDocument` value types (command, captured output, per-node tags, per-node blessing with scope: `.thisThread` | `.allPaths`, freeform annotation, lock flag, origin marker reserved for D10); a `SkeinStore` reader/writer for `stories/<name>/play-testing/<name>.skein` carrying a `schemaVersion` field that the reader rejects loudly on mismatch (AC-7, mirroring `ComposeJsonPayload`'s pattern per the README's conformance section); a new `ArtifactGroup.Kind.playTesting` case in `ProjectArtifacts.swift` classifying `play-testing/` (member files: `*.skein`) into a "Play Testing" sidebar group ordered beside Walkthroughs and Transcript Tests per D7.
- **Exit state**: Unit tests green: round-trip encode/decode of a multi-thread, multi-tag, multi-blessing-scope document; unknown-`schemaVersion` rejection test (AC-7); `ProjectArtifacts` test fixture with a `play-testing/*.skein` file produces a "Play Testing" group. No UI wiring yet — the tree/transcript views do not exist until Phases 6–7.
- **Status**: COMPLETE (2026-08-03, session 53797f — full suite 444 executed, sole failure `TestRunnerTests.testCancelTerminatesAndKeepsDecodedRecords` diagnosed as Tart-VM cold-run scheduling: green in 0.159s on David-authorized targeted rerun, 18:40)

### Phase 2: Play integration — playing always grows the skein
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The Play surface's interaction contract changes from ADR-282's per-turn record/bless to D1's "there is no record toggle; every typed command becomes a node."
- **Entry state**: Phase 1's `SkeinStore` exists. `PlayViewController.swift` and `PlayHeaderView.swift` still run the ADR-282 flow (Record toggle, live per-turn bless via `RecordingSession`); `RecordingSession.swift`'s `record(command:response:)`/`bless`/`checkpoint` API is the thing being absorbed. The Play surface fix from session 1506 (storage-clear-on-boot, menu-bar hiding, `PlaySurfaceScriptTests`) must keep passing untouched.
- **Deliverable**: Every command typed in Play appends a node to the current thread in `SkeinStore` (walking an existing path when the command matches, branching when it diverges — D1); `PlayHeaderView`'s Record toggle is removed, Restart is relabeled "new thread from root" per D8; `RecordingSession`'s turn-capture responsibility is absorbed into `SkeinStore` (the type itself may be deleted or reduced to a thin capture helper — confirm scope against Phase 9's retirement sweep, do not delete checkpoint/bless fields other phases still need until they're superseded).
- **Exit state**: AC-1 holds end-to-end: playing turns produces/extends `play-testing/<name>.skein` on disk; restarting and diverging at a shared prefix yields two threads in the saved file. Real-path test extending the `PlaySurfaceScriptTests` pattern (real WKWebView, real Play pane, page-observed state) confirms growth and branching; full IDE suite still green (was 435 passing, 0 failures as of session 1506).
- **Status**: COMPLETE (2026-08-03, session 53797f — full suite 453 tests, 0 failures, 19:03. Scope amendment, David-approved: D5 seed injection pulled forward from Phase 3/4 — browser entry templates honor `window.__SHARPEE_PLAY_SEED__` → `EngineConfig.seed` (packages/devkit, chord-build + browser-build vitest green, dist rebuilt); the IDE injects the skein's pinned seed per load. Real-path suite SkeinPlayGrowthTests (4 tests): growth, restart+divergence→two threads, page-observed pinned seed across restart, AC-7 loud block on unreadable skein.)

### Phase 3: Replay data-capture design decision (discuss with David first)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: D6 says replay-to-node "re-runs root→node… over the existing bundle-runner machinery (Test/TestRunner lineage)." Two real candidate mechanisms exist in the codebase today and neither is a drop-in fit, so the choice needs a platform-touching decision before Phase 4/5 write any code.
- **Entry state**: Phases 1–2 done. Investigation already surfaced the two candidates: (a) `--exec` (used today only by `SharpeeIDETests/TestToolchain.swift`'s test-only `captureResponses`, which supports `--seed` but has no forcing-annotation input and is not shipped production code), or (b) `sharpee test --json`'s `CommandResultRecord` stream (`packages/ide-protocol/src/test-results.ts`), which already carries `actualOutput` — but **only on failed commands** (by design, to keep a green chain run's payload small) and has no notion of "replay everything, pass/fail is irrelevant." Neither gives "every command's actual output at a pinned seed with forced choice-points," which is what D5/D6 need.
- **Deliverable**: **This phase produces no code.** It produces a decision, recorded either as an ADR-299 amendment or a short design note under `docs/work/ide-adr299-play-skein-bless/`, on: which mechanism the Replay Driver uses (extend `--exec` into shipped production code with a forcing-annotation argument, vs. add an opt-in "always emit `actualOutput`" mode to `sharpee test --json`, vs. a new dedicated CLI mode); which package(s) it touches (`packages/devkit`, `packages/ide-protocol`, possibly `packages/transcript-tester`/`packages/bootstrap`); and confirmation this satisfies rule 13a (a real-path test against the production CLI, not a stand-in for it, must gate the Replay Driver phase).
- **Exit state**: David has chosen a mechanism; the choice is written down; Phase 4 has a concrete platform-change scope to implement. Per CLAUDE.md, do not start Phase 4/5 code before this discussion happens. (Note: the seed-injection half of "IDE controls the run" landed in Phase 2 by David's approval — this phase now covers only the replay-capture mechanism.)
- **Status**: COMPLETE (2026-08-03, session 53797f — David chose (b): opt-in `--capture-output` on `sharpee test --json`; recorded in `design-20260803-replay-capture-mechanism.md` with the elegance rationale, Phase 4 scope, and the two AC-2 sub-claims Phase 5 must pin)

### Phase 4: Platform surface for replay capture (packages/ — needs approval from Phase 3)
- **Tier**: Small
- **Budget**: 150
- **Domain focus**: Whatever CLI/wire surface Phase 3 selected, implemented in the owning TS package(s) under `packages/`.
- **Entry state**: Phase 3's decision is recorded and approved. This phase is a `packages/` change and per CLAUDE.md's MAJOR DIRECTIONS ("Platform changes require discussion first") must not proceed on inference alone — Phase 3 IS that discussion, but if implementation reveals the design doesn't hold up, stop and re-discuss rather than improvising.
- **Deliverable**: The chosen surface — e.g., an `--exec`-style production entry point that accepts a pinned seed plus per-command forcing annotations and emits structured per-command output regardless of pass/fail, or a new opt-in NDJSON field/mode on `sharpee test --json`. If the wire shape changes, bump the owning `schemaVersion` (`TEST_RESULTS_SCHEMA_VERSION` or a new one) per the house wire-contract pattern (ADR-258 D5) the README's conformance section already holds the IDE to.
- **Exit state**: The owning package's own test suite (vitest) is green with new regression coverage for the added surface; `npx tsf build --packageList <touched packages>` succeeds; a manual `--exec`/`sharpee test --json` smoke run against a real fixture story confirms the new surface produces the expected shape. This is the platform half of rule 13a's real-path requirement for Phase 5.
- **Status**: COMPLETE (2026-08-03, session 53797f — `--capture-output` on `sharpee test --json`: transcript-tester `transcriptRecords` option + devkit flag; wire unchanged (additive presence, `TEST_RESULTS_SCHEMA_VERSION` stays 1, ide-protocol doc-only). Gates: transcript-tester 221 passing; devkit 117 passing, 1 skipped (after fixing VM-stale `dist-esm` — compose-json 7/7 failures were `COMPOSE_JSON_SCHEMA_VERSION=1` in dist-esm, rebuilt with `tsf build --target esm`); local+esm targets rebuilt; smoke: real CLI vs fernhill, `[SKIP]` transcript at seed 42 → every command-result carries `actualOutput`, exit 0, 20:01)

### Phase 5: Replay Driver (D6, D5 forced branches)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Root→node re-execution at the skein's pinned seed (D6); a forced choice-point growing a first-class sibling branch (D5).
- **Entry state**: Phase 4's platform surface exists and is green. Phase 1's `SkeinDocument`/`SkeinNode` model exists with a `forcing` field per node (D5).
- **Deliverable**: A production Swift `ReplayDriver` (parallel in spirit to `SharpeeIDETests/TestToolchain.swift`'s `captureResponses`, but shipped, not test-only) that: builds the root→node command list plus forcing annotations from a `SkeinDocument`, invokes Phase 4's platform surface at the document's pinned seed, and returns per-node actual output; growing a forced sibling branch from a choice-point node (D5) creates a new thread whose forcing annotation is passed through on every subsequent replay.
- **Exit state**: **Real-path test required (rule 13a)** — this phase is named after an integration (replay/re-execution against the real engine). A test drives the real devkit CLI (`packages/devkit/dist/cli.js` via `node`, `TestToolchain`-style resolution, not a stub) against a real fixture `.story`, replays a multi-node thread, and asserts byte-identical output against what was captured during play (AC-2). A second real-path test forces a choice-point outcome and confirms the resulting sibling branch's replayed output matches the forced outcome (AC-4, execution half — export is Phase 9).
- **Status**: COMPLETE (2026-08-03, session a17580 — `ReplayDriver` + `SkeinDocument.forcedSibling` + `RecordingSession.serialize(headerFields:)`; unit `ReplayDriverTests` 12 tests; real-path `ReplayRealPathTests` 3 tests: AC-2 byte-identity of a real WKWebView fernhill session (bundle built in-test by the real devkit CLI, real typed turns, replay via `sharpee test --json --capture-output` at the pinned seed) incl. an RNG-drawing turn; AC-4 forced-sibling replays reproduce forced `stdlib.throwing.*` outcomes on a dedicated fixture story; unfired forcing fails loudly with outputs withheld. **The AC-2 test caught two live platform bugs the Phase 2 gates missed** — both fixed in `packages/devkit` templates: (1) browser entries passed `seed` at the top level of GameEngine options where it is silently ignored; it must ride `config.seed` (engine masterSeed was clock-seeded in Play); (2) the chord entry omitted `seed` from `createStory`, leaving chord `randomly`/`one chance in` draws clock-seeded (the author-game.ts precedent). chord-build regression strengthened to pin the compiled `config:{seed:` shape. Mutation-verification follow-up closed three test gaps, each falsified against the real regression before acceptance: replay scratch-directory cleanup (success AND failure paths), the TS/non-chord `browser-build` seed guard (it had none), and a distinct `createStory`-sink assertion for the chord evaluator stream. `TestRunnerTests` cancel timeout 5s→30s per David's standing recurrence ruling (failed 2 of 3 host full-suite runs, passes targeted in 0.109s; the SIGKILL escalation is a main-runloop Timer that Phase 5's four new subprocess tests delay past the 2s backstop). Gates: IDE suite 469 tests 0 failures (21:42); devkit 117 passing 1 skipped)

### Phase 6: Skein View — tree surface (D8)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The tree half of D8's Skein/Transcript split: click-to-replay, branch, force, tag affordances.
- **Entry state**: Phase 2 (skein grows from Play) and Phase 5 (replay driver) are done. `ProjectTreeViewController.swift` is the existing precedent for an `NSOutlineView`-backed tree surface in this codebase — follow its structure rather than inventing a new pattern.
- **Deliverable**: A Skein view rendering the current story's thread tree; clicking any node invokes Phase 5's `ReplayDriver` and leaves the Play surface live at that point (D1); a tag affordance lets the author name a thread (D2, free text, not an enum); a force affordance on a choice-point node grows the D5 sibling branch. `RightPanelViewController.swift` (existing right-panel host) gains the Skein view as a new tab/pane alongside Play.
- **Exit state**: Manual + automated UI-level verification that a multi-branch skein renders correctly, clicking a node replays it and the Play surface reflects the replayed state, and tagging/forcing round-trip through `SkeinStore` (Phase 1) to disk. AC-1 (UI-visible half) and AC-4 (UI half) hold.
- **Status**: COMPLETE (2026-08-03, session a17580) — including AC-4's live half, unblocked the same session by the
  David-approved forcing hook (below).
  Shipped: `SkeinView` (NSOutlineView tree following the TestPanelView precedent — rows carry command, blessing scope, forcings, tags, lock, annotation, and a ▶ marker for where play sits; the document root is the trunk, not a row), the **Skein** tab in `RightPanelViewController` (which also hosts the tag/force sheets and the replay action), `SkeinDocument.updateNode(withId:_:)` as the one per-node mutation door, `SkeinSession.setTags/growForcedSibling/moveTo` (each persisting), and `PlayViewController.replay(toNodeId:)`.
  **Deviation from this phase's literal wording, deliberate**: click-to-replay drives the LIVE client rather than invoking `ReplayDriver`. D1/D6 require the story to be live at the node, and a headless CLI run cannot make the WKWebView live — a fresh boot at the pinned seed plus the thread's commands is the only mechanism that can, and Phase 5's AC-2 pins that reproduction as byte-identical, which is what makes the substitution sound. `ReplayDriver` remains the headless instrument Phase 7 needs (reading a thread's output WITHOUT disturbing play is exactly what cross-thread invariance checking requires).
  **Production bug caught by the real-path test**: `replay()` reloaded the page and then probed readiness, but `reloadFromOrigin()` is asynchronous and the outgoing page satisfies every readiness probe until it is replaced — so the replay typed its commands into the OLD world (the fixture page showed "You already have the glass bottle", state carried over). Fixed by stamping the outgoing document (`__sharpeeStalePage`) and waiting for the stamp's absence; the same guard was applied to the test's restart helper.
  **Platform gap found and closed (David approved mid-phase)**: replaying a forced branch LIVE was impossible — `loadForces` is reachable only from the transcript runner, so the browser client had no forcing input at all. Added the parallel wire to the seed hook: `window.__SHARPEE_PLAY_FORCES__` → `engine.getRandomService().clearForces()/loadForces(...)` in both `packages/devkit` browser entry templates, applied before any turn including the boot `look`. The wire carries already-structured `RandomForceSpec` objects, never the `point[#occurrence]=CLASS` header text — parsing that grammar belongs to transcript-tester, and a second copy inside every built page would drift. IDE side: `Forcing.swift` is the one Swift home for the grammar (the Force sheet's validator delegates to it), and `PlayViewController.pendingForcings` rides the injected script, set per replayed branch and cleared by "new thread from root". Falsified: disabling the template call fails the live forced-replay test; devkit regressions assert the global AND the `loadForces(` call on both templates.
  Tests: `SkeinViewTests` (18 unit — updateNode, tag/force disk round-trips incl. refusals writing nothing, moveTo, the tree the view builds, row badges, forcing parse/playSpec incl. sticky mode, grammar validation), `SkeinReplayRealPathTests` (3 real-path: replay leaves the story live and the NEXT typed command branches from the replayed node — the actual proof of "live"; a forced branch reproduces its forced outcome live and a fresh thread afterwards runs unforced; a refused replay leaves play alone). Gate: **full IDE suite 490 tests, 0 skipped, 0 failures** (23:10); devkit 117 passing, 1 skipped; `npx tsc --noEmit` exit 0

### Phase 7: Transcript View + blessing with scope verification (D8, D3, D4)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The transcript half of D8 ("blessing is a reading activity"); D3/D4's scoped, declared-then-verified blessings; D9's changed-output badge data (display lands in Phase 8).
- **Entry state**: Phase 6's Skein view exists (a node must be selectable to linearize its thread). Phase 1's model already has a `blessing` field with `.thisThread`/`.allPaths` scope.
- **Deliverable**: A Transcript view linearizing the currently-selected thread as prose, actual vs. blessed per node; bless/unbless affordance with an explicit scope choice at bless time (D4 — "plain bless" vs. "bless-for-all-paths"); an invariance verifier that, on any thread's replay, checks every node against every all-paths blessing declared at that story position across all threads and surfaces a first-class finding (not a silent diff) when they disagree.
- **Exit state**: **Real-path test required (rule 13a)** for the invariance-checking half — this is a genuine integration behavior (cross-thread state-leak detection), not decoration. AC-3 pinned end-to-end: an all-paths blessing at a position, plus a second thread whose replayed output at that position differs (a seeded state leak reproduced against the real engine), produces a first-class finding on that thread's replay — not noise on the blessing thread, not a silent diff.
- **Status**: COMPLETE (2026-08-04, session 0b1b98)
  Shipped: `Invariance.swift` (`SkeinFinding`, `SkeinVerifier` — pure, UI-free), `TranscriptView.swift` (the
  **Transcript** tab: the selected thread as prose, one block per node, bless/bless-for-all-paths/unbless),
  `SkeinSession` gaining the observed-output channel (`observedOutputs`, `actualOutput(forNodeId:)`) plus
  `bless(nodeId:scope:)` / `unbless(nodeId:)` / `findings(forThreadTo:)`, `SkeinDocument.allNodes`,
  `SkeinView.onSelectNode`, and the right panel's wiring (transcript follows the tree's selection, else where
  play sits; a replay that produces findings lands the author on Transcript instead of Play).
  **The one modeling decision the ADR left open — what "the same story position" IS.** ADR-299 deliberately
  does not model convergence ("the figure eight was a metaphor… not a modeling requirement"), so the tree
  carries no notion of sameness beyond commands and outputs, and the only mechanically derivable position key
  is **the command** (trimmed and case-folded, as a parser reads it). An all-paths blessing therefore asserts:
  *every node in this skein carrying this command prints this output*. The bless flow states the claim back in
  exactly those words, so an author who blesses `look` for all paths learns it from a finding they can
  downgrade rather than from a check that silently never fires. A plain blessing constrains only its own node;
  two disagreeing all-paths blessings are reported from both sides rather than picking a winner.
  Also produced here: **changed-output finding data** (a node that no longer prints what its own blessing
  vouched for), which is what Phase 8's D9 badges display.
  Tests: `InvarianceTests` (11 unit — position normalization, grouping, violation, self-exclusion, agreement,
  plain-scope containment, contradiction symmetry, observed-over-stored, whole-skein sweep),
  `SkeinBlessTests` (10 unit — bless persists scope + the text the story PRINTED, re-bless replaces, refusals
  write nothing, observations cleared per boot, walking never overwrites the stored capture),
  `TranscriptViewTests` (14 unit — header counts, block composition, the view over a live session),
  `SkeinInvarianceRealPathTests` (2 real-path, rule 13a): AC-2's fixture pattern with a real devkit-built
  bundle in a real WKWebView — `look` clean vs `look` carrying the bottle is a real engine-produced state
  leak; blessing the first for-all-paths and replaying the second yields exactly one
  `invarianceViolated` finding carrying the REPLAY's text, surfaced by a real `TranscriptView`; replaying the
  blessing's own thread is silent and reproduces the blessed text byte-for-byte.
  **Falsified before acceptance**: disabling the invariance loop in `SkeinVerifier` fails the AC-3 real-path
  test (`[]` vs the expected finding). Two `TranscriptViewTests` were caught vacuous during the run — the view
  holds its session weakly (the Play pane owns it), so a locally-created session deallocated before `show`
  and every row count read 0; they now hold the session and assert the precondition.
  Gate: **full IDE suite 527 tests, 0 failures** (23:57).

### Phase 8: Skein View refinements (D9)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: "All I7 refinements ship in v1" — explicit trimming, node locking, freeform node annotations, changed-output/origin badges.
- **Entry state**: Phases 6–7 done (tree + transcript views exist; blessing/verification produces the diff data badges display).
- **Deliverable**: Explicit trim (removes an unlocked subtree from file and view, always an author act, never automatic); lock (guards a subtree from trim, refuses the trim action with a message when locked); freeform per-node annotations distinct from D2's thread tags; changed-output badges wired to Phase 7's diff/finding data; an origin badge slot reserved but inert (D10's machine-grown threads don't exist until the explorer ships — do not build adoption UI).
- **Exit state**: AC-6 pinned: trimming an unlocked subtree removes it from file and view; trimming a locked subtree is refused with a message; annotations and tags round-trip through save/load (extends Phase 1's round-trip tests).
- **Status**: COMPLETE (2026-08-04, session 0b1b98)
  Shipped: `SkeinNode.subtree` (the unit trimming removes and locking guards; `SkeinDocument.allNodes` now
  derives from it), `SkeinDocument.TrimOutcome` + `trimRefusal(for:)` + `trim(nodeId:)`,
  `SkeinSession.setAnnotation(_:forNodeId:)` / `setLocked(_:forNodeId:)` / `trim(nodeId:)` / `findings()`,
  a second button row in `SkeinView` (Note… / Lock / Trim — six across would truncate the titles in a narrow
  panel), changed-output badges on rows fed by a whole-skein sweep, and the right panel's sheets.
  **Design points worth keeping**:
  - **A lock anywhere INSIDE a subtree refuses the whole trim.** Locking a node guards it; destroying it
    because an ancestor happened to be selected would make the guard worthless. Falsified: narrowing the
    check to the target node's own lock fails 5 tests.
  - **The refusal is knowable without mutating** (`trimRefusal(for:)`), so a locked branch is refused BEFORE
    the confirmation sheet. Asking someone to confirm destroying something and then telling them it was never
    going to happen teaches them to click through the sheet. One rule, two callers — `trim` is implemented in
    terms of it.
  - **Trim is confirmed, never silent, never automatic**, and names the node count and what goes with it
    (blessings, tags). A refusal names the lock that stopped it by command, not "something in there".
  - **Play's position falls back to the story start when the node it sat on was trimmed**, and the removed
    nodes' observations go with them — a `currentNodeId` pointing into deleted tree would grow the next turn
    nowhere.
  - **Origin badge slot reserved and genuinely inert**: `⟐ explorer` renders only for `origin == .explorer`,
    which nothing sets until `@sharpee/skein` ships. No adoption UI, no findings list (D10 stays deferred).
  Tests: `SkeinRefinementTests` (22 unit — trim/lock semantics incl. the deep-lock guard, refusals writing
  nothing, play-position fallback, annotation+tag+lock round-trip through a reopened session, the trimmed
  branch leaving the VIEW as well as the file, changed-output vs violated-all-paths badges, and the reserved
  origin slot). Falsified before acceptance: removing the subtree lock scan fails the deep-lock tests;
  removing the post-trim store write fails the file-removal test.
  Gate: **full IDE suite 549 tests, 0 failures** (00:25).

### Phase 9: Exporter + retirement sweep
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: D7's explicit test-minting act ("the skein never silently mints tests") and closing out the ADR-282 retirements the Implementation section names.
- **Entry state**: Phases 1–8 done — a blessed thread exists with scope, tags, and (optionally) forced branches.
- **Deliverable**: "Save thread as test" writes an ADR-294 golden transcript (`seed:`/`forces:` headers) into the project's existing `tests/transcripts/` or `walkthroughs/` groups, reusing ADR-282's retained literal-block serialization verbatim — no new serialization code. A retirement sweep confirms: `PlayHeaderView`'s Record toggle and per-turn bless flow are fully gone (Phase 2 should have removed the toggle; verify no dead code remains), `RecordingSession` is either deleted or reduced to exactly what Phase 2 left it as (no orphaned bless/checkpoint API nothing calls), and the project tree's Walkthroughs/Transcript Tests groups correctly receive exported files alongside the new Play Testing group (Phase 1).
- **Exit state**: **Real-path test required (rule 13a)** — export a blessed thread (including one with a `forces:` branch from Phase 5) to a real `.transcript` file and run it through the real `dist/cli/sharpee.js --test`; it passes (AC-5, and AC-4's export half). AC-7 re-verified end-to-end (an exported skein round-trips through a fresh IDE launch). Full IDE suite green; explicit confirmation no ADR-282 dead code remains.
- **Status**: COMPLETE (2026-08-04, session 0b1b98) — exporter shipped and the retirement sweep done, deletions
  approved by David.
  Shipped: `SkeinExporter.swift` (the one door out of the skein: a blessed node becomes a verbatim `[OK]` +
  literal text block of the text the AUTHOR approved, an unblessed one keeps the `[SKIP]` draft, and the
  document's pinned seed plus the thread's joined forcings ride the ADR-294 header block — emitted through
  `RecordingSession.serialize`, never a second grammar, and joined through `ReplayDriver.forcings(along:)`),
  the "Save Thread as Test…" affordance on the Transcript view (disabled, with the reason, when the thread
  carries no blessing), and the right panel's save-panel flow defaulting into `tests/transcripts/` and
  announcing through the Tests panel's existing channel (`PlayViewController.announceTranscript`).
  **Bug found while building the export test, fixed here**: replaying a forced sibling recorded its output
  against the node it SHADOWS. `SkeinSession.recordTurn` identified the walked-onto node by matching the typed
  command against the current node's children — exact until two children share a command, which is precisely
  what a forced sibling is (D5). The forced branch therefore never captured anything, so it could not be read,
  blessed, or exported, and the unforced node's observation was the forced text. Fixed with
  `beginReplay(along:)`/`endReplay()`: a replay hands the session the exact node ids the coming turns belong
  to; a turn that diverges abandons the path and falls back to the ordinary walk. Paired with `observe`,
  which establishes a FIRST capture for a node that has none (the model always said "empty until a replay
  fills it in") while still never overwriting an existing one. Falsified: removing the node targeting makes
  the exported forced transcript FAIL under the real runner.
  Tests: `SkeinExporterTests` (17 unit — header/seed, opening `look`, blessed→`[OK]`+block asserting the
  BLESSED text not the drifted capture, unblessed→`[SKIP]`, forces join in node order, duplicate-forcing
  refusal, no-blessings refusal writing no file, `canExport`, offered filename from the tag else the command),
  `SkeinSessionTests` +4 (replay node targeting, first-capture establishment, no overwrite of an existing
  capture, divergence fallback), `SkeinExportRealPathTests` (2 real-path): a real WKWebView session of a real
  devkit-built bundle, a forced branch replayed live and blessed, both threads exported and PASSING under the
  real `sharpee test`; and the refusal + AC-7 round trip (a relaunched `SkeinSession` reads the same skein and
  exports byte-identically). Falsified twice: emitting blessed turns as untagged fails the run's
  assertion count; removing the forced-branch node targeting fails the run outright.
  **Deviation, deliberate**: the real-path run drives `sharpee test <story> <transcripts> --json` (the devkit
  CLI — what the IDE's own TestRunner spawns, ADR-187) rather than `dist/cli/sharpee.js --test`, whose story
  inference needs a `stories/<name>/` path prefix a temp fixture cannot have. Files are named explicitly
  rather than handing over the project directory: the fixture carries a `node_modules` symlink into the
  monorepo and a directory scan walks into it and never returns (this cost one 300s timeout).
  **Retirement sweep (David approved the deletions, 2026-08-04)**: the whole ADR-282 live flow was already
  unreachable — `RecordingSession.start()` had no caller, so the header's Bless/Checkpoint and the Test menu's
  two items were permanently disabled, and `saveRecording()` had no caller at all.
  - `PlayViewController` lost `recording`, the bless/checkpoint gestures, `updateTurnAffordances`, all four
    save flows (`saveRecording`/`saveSingleTranscript`/`saveChain`/`presentSaveFailure`), `writeRecording`,
    `writeChain`, `defaultChainName`, and `walkthroughsSaveDirectory` — 236 lines.
  - `PlayHeaderView` is now status dot + New Thread + "Play after build", exactly what D8 says it should be.
  - `MenuBuilder`/`AppDelegate`/`MainWindow` lost "Bless Last Turn" (⇧⌘B) and "Checkpoint Here" (⇧⌘K) and
    their forwarding. **No replacement menu item**: D8 puts the gesture where the node context is, and a menu
    command acting on "the thread shown in a tab you may not be looking at" would be worse than the button.
  - `RecordingSession` is now a `@MainActor enum` — a pure emitter (`serialize`, `assertionLines`, the block
    writer) plus `RecordedTurn`. Its `Verdict` collapsed to `untagged`/`blessed`: the `[OK: contains …]`
    selection form went with the gesture that produced it (a skein blessing always approves the whole
    output), taking `inlinePayload` and `fragment(selected:)` with it. **`Rebless` still REFUSES a
    `[OK: contains]` bless** — authors write that form by hand — and its tests now build that fixture by hand,
    labelled as such, since nothing emits it any more.
  - Deleted: `Test/WalkthroughChain.swift` (+`ChainSaveMode`), `WalkthroughChainTests`, `RecordingSessionTests`,
    `RecordingSessionBlessTests`, `RecordingChainTests`, `RecordingChainSaveTests`, `RecordingSaveAsTestTests`,
    `PlayBlessAffordanceTests`, `PlaySelectionCaptureTests`. The `walkthroughs/` directory concept survives
    independently in `TestPanelModel`/`TestRunner` — only the chain-WRITING helper went.
  - `RecordingSerializationTests` rewritten against the static emitter (14→12: the two selection-encoding
    tests went with the encoding; two header-block tests added). `ReblessTests`/`ReblessRealPathTests`
    fixtures ported off the retired capture API.
  Gate: **full IDE suite 486 tests, 0 failures** (01:07 and 01:09, two captured runs). The count reconciles
  exactly: 572 − 70 (deleted Recording/Play tests) − 14 (WalkthroughChainTests) − 2 (retired selection
  encoding) = 486; no test was silently lost.
  **Open item**: the first full-suite run after the sweep reported 3 failures and the three runs after it were
  clean. That run's output was not captured, so the failures were never identified — flagged rather than
  dismissed. Most likely the known main-actor contention class (the same one that took `TestRunnerTests`'
  cancel timeout 5s→30s last session); the suite now runs ~47s with several WKWebView real-path tests.

## Deferred (not planned)
- **D10 (explorer-proposes/author-adopts)**: binds to `@sharpee/skein`, which does not exist yet (ADR-294: planned, not shipped). AC-8 is explicitly deferred in the ADR itself. No phase above builds the findings list, budget-report display, or adoption flow — this plan stops at v1's boundary per the ADR's own scoping.

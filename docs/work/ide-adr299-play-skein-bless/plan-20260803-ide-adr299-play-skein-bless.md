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
- **Status**: CURRENT

### Phase 2: Play integration — playing always grows the skein
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The Play surface's interaction contract changes from ADR-282's per-turn record/bless to D1's "there is no record toggle; every typed command becomes a node."
- **Entry state**: Phase 1's `SkeinStore` exists. `PlayViewController.swift` and `PlayHeaderView.swift` still run the ADR-282 flow (Record toggle, live per-turn bless via `RecordingSession`); `RecordingSession.swift`'s `record(command:response:)`/`bless`/`checkpoint` API is the thing being absorbed. The Play surface fix from session 1506 (storage-clear-on-boot, menu-bar hiding, `PlaySurfaceScriptTests`) must keep passing untouched.
- **Deliverable**: Every command typed in Play appends a node to the current thread in `SkeinStore` (walking an existing path when the command matches, branching when it diverges — D1); `PlayHeaderView`'s Record toggle is removed, Restart is relabeled "new thread from root" per D8; `RecordingSession`'s turn-capture responsibility is absorbed into `SkeinStore` (the type itself may be deleted or reduced to a thin capture helper — confirm scope against Phase 9's retirement sweep, do not delete checkpoint/bless fields other phases still need until they're superseded).
- **Exit state**: AC-1 holds end-to-end: playing turns produces/extends `play-testing/<name>.skein` on disk; restarting and diverging at a shared prefix yields two threads in the saved file. Real-path test extending the `PlaySurfaceScriptTests` pattern (real WKWebView, real Play pane, page-observed state) confirms growth and branching; full IDE suite still green (was 435 passing, 0 failures as of session 1506).
- **Status**: PENDING

### Phase 3: Replay data-capture design decision (discuss with David first)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: D6 says replay-to-node "re-runs root→node… over the existing bundle-runner machinery (Test/TestRunner lineage)." Two real candidate mechanisms exist in the codebase today and neither is a drop-in fit, so the choice needs a platform-touching decision before Phase 4/5 write any code.
- **Entry state**: Phases 1–2 done. Investigation already surfaced the two candidates: (a) `--exec` (used today only by `SharpeeIDETests/TestToolchain.swift`'s test-only `captureResponses`, which supports `--seed` but has no forcing-annotation input and is not shipped production code), or (b) `sharpee test --json`'s `CommandResultRecord` stream (`packages/ide-protocol/src/test-results.ts`), which already carries `actualOutput` — but **only on failed commands** (by design, to keep a green chain run's payload small) and has no notion of "replay everything, pass/fail is irrelevant." Neither gives "every command's actual output at a pinned seed with forced choice-points," which is what D5/D6 need.
- **Deliverable**: **This phase produces no code.** It produces a decision, recorded either as an ADR-299 amendment or a short design note under `docs/work/ide-adr299-play-skein-bless/`, on: which mechanism the Replay Driver uses (extend `--exec` into shipped production code with a forcing-annotation argument, vs. add an opt-in "always emit `actualOutput`" mode to `sharpee test --json`, vs. a new dedicated CLI mode); which package(s) it touches (`packages/devkit`, `packages/ide-protocol`, possibly `packages/transcript-tester`/`packages/bootstrap`); and confirmation this satisfies rule 13a (a real-path test against the production CLI, not a stand-in for it, must gate the Replay Driver phase).
- **Exit state**: David has chosen a mechanism; the choice is written down; Phase 4 has a concrete platform-change scope to implement. Per CLAUDE.md, do not start Phase 4/5 code before this discussion happens.
- **Status**: PENDING

### Phase 4: Platform surface for replay capture (packages/ — needs approval from Phase 3)
- **Tier**: Small
- **Budget**: 150
- **Domain focus**: Whatever CLI/wire surface Phase 3 selected, implemented in the owning TS package(s) under `packages/`.
- **Entry state**: Phase 3's decision is recorded and approved. This phase is a `packages/` change and per CLAUDE.md's MAJOR DIRECTIONS ("Platform changes require discussion first") must not proceed on inference alone — Phase 3 IS that discussion, but if implementation reveals the design doesn't hold up, stop and re-discuss rather than improvising.
- **Deliverable**: The chosen surface — e.g., an `--exec`-style production entry point that accepts a pinned seed plus per-command forcing annotations and emits structured per-command output regardless of pass/fail, or a new opt-in NDJSON field/mode on `sharpee test --json`. If the wire shape changes, bump the owning `schemaVersion` (`TEST_RESULTS_SCHEMA_VERSION` or a new one) per the house wire-contract pattern (ADR-258 D5) the README's conformance section already holds the IDE to.
- **Exit state**: The owning package's own test suite (vitest) is green with new regression coverage for the added surface; `npx tsf build --packageList <touched packages>` succeeds; a manual `--exec`/`sharpee test --json` smoke run against a real fixture story confirms the new surface produces the expected shape. This is the platform half of rule 13a's real-path requirement for Phase 5.
- **Status**: PENDING

### Phase 5: Replay Driver (D6, D5 forced branches)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Root→node re-execution at the skein's pinned seed (D6); a forced choice-point growing a first-class sibling branch (D5).
- **Entry state**: Phase 4's platform surface exists and is green. Phase 1's `SkeinDocument`/`SkeinNode` model exists with a `forcing` field per node (D5).
- **Deliverable**: A production Swift `ReplayDriver` (parallel in spirit to `SharpeeIDETests/TestToolchain.swift`'s `captureResponses`, but shipped, not test-only) that: builds the root→node command list plus forcing annotations from a `SkeinDocument`, invokes Phase 4's platform surface at the document's pinned seed, and returns per-node actual output; growing a forced sibling branch from a choice-point node (D5) creates a new thread whose forcing annotation is passed through on every subsequent replay.
- **Exit state**: **Real-path test required (rule 13a)** — this phase is named after an integration (replay/re-execution against the real engine). A test drives the real devkit CLI (`packages/devkit/dist/cli.js` via `node`, `TestToolchain`-style resolution, not a stub) against a real fixture `.story`, replays a multi-node thread, and asserts byte-identical output against what was captured during play (AC-2). A second real-path test forces a choice-point outcome and confirms the resulting sibling branch's replayed output matches the forced outcome (AC-4, execution half — export is Phase 9).
- **Status**: PENDING

### Phase 6: Skein View — tree surface (D8)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The tree half of D8's Skein/Transcript split: click-to-replay, branch, force, tag affordances.
- **Entry state**: Phase 2 (skein grows from Play) and Phase 5 (replay driver) are done. `ProjectTreeViewController.swift` is the existing precedent for an `NSOutlineView`-backed tree surface in this codebase — follow its structure rather than inventing a new pattern.
- **Deliverable**: A Skein view rendering the current story's thread tree; clicking any node invokes Phase 5's `ReplayDriver` and leaves the Play surface live at that point (D1); a tag affordance lets the author name a thread (D2, free text, not an enum); a force affordance on a choice-point node grows the D5 sibling branch. `RightPanelViewController.swift` (existing right-panel host) gains the Skein view as a new tab/pane alongside Play.
- **Exit state**: Manual + automated UI-level verification that a multi-branch skein renders correctly, clicking a node replays it and the Play surface reflects the replayed state, and tagging/forcing round-trip through `SkeinStore` (Phase 1) to disk. AC-1 (UI-visible half) and AC-4 (UI half) hold.
- **Status**: PENDING

### Phase 7: Transcript View + blessing with scope verification (D8, D3, D4)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The transcript half of D8 ("blessing is a reading activity"); D3/D4's scoped, declared-then-verified blessings; D9's changed-output badge data (display lands in Phase 8).
- **Entry state**: Phase 6's Skein view exists (a node must be selectable to linearize its thread). Phase 1's model already has a `blessing` field with `.thisThread`/`.allPaths` scope.
- **Deliverable**: A Transcript view linearizing the currently-selected thread as prose, actual vs. blessed per node; bless/unbless affordance with an explicit scope choice at bless time (D4 — "plain bless" vs. "bless-for-all-paths"); an invariance verifier that, on any thread's replay, checks every node against every all-paths blessing declared at that story position across all threads and surfaces a first-class finding (not a silent diff) when they disagree.
- **Exit state**: **Real-path test required (rule 13a)** for the invariance-checking half — this is a genuine integration behavior (cross-thread state-leak detection), not decoration. AC-3 pinned end-to-end: an all-paths blessing at a position, plus a second thread whose replayed output at that position differs (a seeded state leak reproduced against the real engine), produces a first-class finding on that thread's replay — not noise on the blessing thread, not a silent diff.
- **Status**: PENDING

### Phase 8: Skein View refinements (D9)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: "All I7 refinements ship in v1" — explicit trimming, node locking, freeform node annotations, changed-output/origin badges.
- **Entry state**: Phases 6–7 done (tree + transcript views exist; blessing/verification produces the diff data badges display).
- **Deliverable**: Explicit trim (removes an unlocked subtree from file and view, always an author act, never automatic); lock (guards a subtree from trim, refuses the trim action with a message when locked); freeform per-node annotations distinct from D2's thread tags; changed-output badges wired to Phase 7's diff/finding data; an origin badge slot reserved but inert (D10's machine-grown threads don't exist until the explorer ships — do not build adoption UI).
- **Exit state**: AC-6 pinned: trimming an unlocked subtree removes it from file and view; trimming a locked subtree is refused with a message; annotations and tags round-trip through save/load (extends Phase 1's round-trip tests).
- **Status**: PENDING

### Phase 9: Exporter + retirement sweep
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: D7's explicit test-minting act ("the skein never silently mints tests") and closing out the ADR-282 retirements the Implementation section names.
- **Entry state**: Phases 1–8 done — a blessed thread exists with scope, tags, and (optionally) forced branches.
- **Deliverable**: "Save thread as test" writes an ADR-294 golden transcript (`seed:`/`forces:` headers) into the project's existing `tests/transcripts/` or `walkthroughs/` groups, reusing ADR-282's retained literal-block serialization verbatim — no new serialization code. A retirement sweep confirms: `PlayHeaderView`'s Record toggle and per-turn bless flow are fully gone (Phase 2 should have removed the toggle; verify no dead code remains), `RecordingSession` is either deleted or reduced to exactly what Phase 2 left it as (no orphaned bless/checkpoint API nothing calls), and the project tree's Walkthroughs/Transcript Tests groups correctly receive exported files alongside the new Play Testing group (Phase 1).
- **Exit state**: **Real-path test required (rule 13a)** — export a blessed thread (including one with a `forces:` branch from Phase 5) to a real `.transcript` file and run it through the real `dist/cli/sharpee.js --test`; it passes (AC-5, and AC-4's export half). AC-7 re-verified end-to-end (an exported skein round-trips through a fresh IDE launch). Full IDE suite green; explicit confirmation no ADR-282 dead code remains.
- **Status**: PENDING

## Deferred (not planned)
- **D10 (explorer-proposes/author-adopts)**: binds to `@sharpee/skein`, which does not exist yet (ADR-294: planned, not shipped). AC-8 is explicitly deferred in the ADR itself. No phase above builds the findings list, budget-report display, or adoption flow — this plan stops at v1's boundary per the ADR's own scoping.

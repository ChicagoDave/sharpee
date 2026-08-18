# Session Summary: 2026-08-17 - feat/adr-320-implementation (session ade288)

## Status: COMPLETE — three streams, all closed.
1. **ADR-320 Phase 11 (acceptance closure) DONE** — all 14 ACs discharged with
   re-run evidence; the plan (phases 1–11 incl. 10.1–10.7) is DONE and archived
   to `docs/work/archive/adr-320-conversation/`. ADR-320 is finished.
2. **Housekeeping DONE** — Chord/Sharpee versions aligned, Sharpee minor bumped;
   `./sharpee --version` reports **Sharpee 5.1.0 · Chord 3.3.0**.
3. **IDE Chord 3.3.0 alignment DONE** (4 phases, plan archived) — the D9
   "IDE is behind the installed Chord" warning is retired, and a systemic
   story-header bug found along the way is fixed. Full `SharpeeIDETests`
   **493/493**.

## Goals
- ADR-320 Phase 11: acceptance closure — full AC 1–14 audit with dated inline
  evidence, whole-platform regression, cost-leg byte-identical compile check,
  channel isolation re-confirm, ADR-142 supersession confirm. David confirmed
  phase start ("phase 11").

## Completed
- Fixed Phase 10's stale `**Status**` line in plan.md (was CURRENT, narrative
  said complete) → DONE (session b71e04); Phase 11 → CURRENT then DONE.
- **Acceptance audit written**: `docs/work/archive/adr-320-conversation/`
  `acceptance-audit.md` — all 14 ACs DISCHARGED, every row's evidence re-run
  2026-08-18 against a fresh `./repokit build dungeo` bundle.
- **New transcript** `stories/ides-of-march/tests/transcripts/thread-wire.transcript`
  (8 steps, first-run green): the one leg not previously asserted in a built
  story — thread-opened/beat/parked/resumed on the scene channel and
  `thread-affordances` continuability advertised → cleared on park → restored on
  resume. Ides unit suite is now 212 passing in 18 transcripts.
- **Cost leg measured** against a cold-start worktree build of the branch point
  (`3d68bb96`): `cloak.story` (zero ADR-320 constructs) and `fernhill.story`
  (65 entities, zero constructs) composed by main's chord 3.0.0 vs branch's
  3.3.0 — each IR diff is exactly the one `languageVersion` line. Worktree
  removed after.
- **Regression (all run 2026-08-18)**: ides 212 unit + wt-01 34; thealderman 75;
  Dungeo chain 952 in 17; character-acceptance b1 15 / b3 63 / p8-p9 19 /
  p10 21; Fernhill 9 cards / 18 assertions (`./sharpee test`); unit suites chord
  909, world-model 1492, character 563, story-loader 561, stdlib 1633, engine
  633, parser-en-us 324, bootstrap 43, testing-surface 89, test:scripts 11;
  turbo test:ci 65/65; repo-wide `npx tsc --noEmit` clean.
- **ADR-142 supersession confirmed**; replacement range widened D4–D13 → D4–D14
  (its NPC-continuation sketch is implemented by D14's threads). No construction
  divergence from D4/D14 found.
- Plan Status → DONE; archived via `plan-archive.sh` (pointer released).
  Repointed the one live-source path reference
  (`stdlib/src/actions/helpers/dialogue-selector.ts` header comment) to the
  archive path.

## Housekeeping (post-Phase 11, David's request)
- **Version alignment + Sharpee minor bump**: `website/src/lib/nav.ts` Chord
  section 3.0.0 → 3.3.0, Sharpee section 5.0.1 → 5.1.0 (Chord Writer stays
  1.2.0 on its own line, ADR-279 D1). IDE docs-tab bundle regenerated from that
  source (`tools/ide/build-docs-tab.sh`) — `docs-index.json` now stamps
  `chordLanguageVersion: 3.3.0`, absorbing the parallel IDE session's
  uncommitted 3.2.0 regeneration, and refreshing one docs page
  (`chord__stdlib__reference.html`). `npx tsf version 5.1.0` moved all 34
  workspace packages in lockstep; `./repokit build --no-genai` stamped
  `engine-version.ts` to 5.1.0 and rebuilt tree + bundle. `./sharpee --version`
  reports **Sharpee 5.1.0 · Chord 3.3.0**; Dungeo wt-01 passes against the
  rebuilt bundle (golden matched).

## IDE Chord 3.3.0 alignment (plan: docs/work/archive/ide-chord-330-alignment/)
Triggered by the D9 warning David hit: the IDE's `supportedLanguageVersion` was
pinned at 3.0.0, and the docs-tab regeneration above made
`DocsTabRealPathTests` red until it moved. Plan written by session-planner,
reviewed by `/devarch:plan-review` twice (two CONTRADICTIONs fixed — the corpus
fixture's ADR header idiom and the unextended fixture-set drift guard; one STALE
ADR recorded as a follow-up; one TENSION fixed by scoping Phase 2's diff check
to the one file that matters).
- **Phase 1 DONE**: new corpus fixture
  `packages/chord/tests/fixtures/lexer-golden/conversation-surface.story` (228
  lines, named to parallel `grammar-surface.story`) exercising all three
  conversation minors; drift guard gained 25 construct entries beside the
  existing 13; golden regenerated with **9,584 insertions and 0 deletions**
  (existing streams byte-untouched ⇒ `lexer.ts` behavior unchanged); chord
  suite 909 passing. A `sharpee compose --check` run beyond the phase's bar
  found a real missing `end topics` plus semantic errors — all fixed, fixture
  now **gate-clean at Chord 3.3.0**.
- **Phase 2 DONE**: `ChordLexerGoldenTests` TEST SUCCEEDED with
  `ChordLexer.swift` diff empty (token layer absorbed the whole conversation
  grammar, as at 2.2.0); `SyntaxHighlighter.keywords` gained 5 block nouns +
  `beat`/`conclusion` with the prose-collision tradeoff noted inline; pin
  `"3.0.0"` → `"3.3.0"` with a dated history entry in the file's idiom.
- **Phase 3 BLOCKED**: goal met, exit state not. Full suite = 491 tests, **482
  passing**; all three target suites green, so the pin/bundle/compiler agree at
  3.3.0 and **the D9 warning is retired**. But 9 tests fail (24 assertions),
  all pre-existing and unrelated: IDE Swift test fixtures hardcode the inline
  header `authors: T`, rejected by the parser as `parse.header-inline-list`.
  The gate landed in `ea65f2a3` and is present at this branch's branch point
  (`3d68bb96`) — drift predates the branch. Unseen because the IDE suite has
  never been under CI (ADR-258 D7's own recorded limitation). Not fixed, per
  CLAUDE.md's no-auto-retry rule; held for David.
- **Phase 3 unblocked by Phase 4; plan DONE.** Full suite now **493/493**.
- **Phase 4 DONE** (David: "fix the fixtures and check the scaffold"):
  - **Scaffold is FINE** — the shipped template
    `packages/devkit/templates/story-chord/story.story.template` already uses
    the indented list form. The alarm came from `StoryScaffoldTests`, which
    writes its own fake template in `setUp`; that fake had drifted. Corrected
    to mirror what ships.
  - **Fixture sweep**: inline `authors: X` → indented list in
    `TestToolchain.cleanStory`/`.hatchStory`, `TestRunnerTests`,
    `TestingSurfaceRealPathTests`.
  - **A real product bug, found via the themes test**: every IDE story-header
    reader/writer was blind to list-valued fields. `StoryHeaderLines.field(in:)`
    reads a list item (no colon) as a non-field, and all 8 scans across 4
    modules (`StoryHeaderThemes`, `StoryHeaderIFID`, `StoryHeaderPublishSource`,
    `StoryHeaderAutoAssertion` — one insert scan + one `locate` each) stopped
    there. On any real story (fernhill, every scaffolded story — all use
    `authors:` lists) readers returned nil for fields after the list and
    writers inserted INSIDE it. **Toggling a theme in Chord Writer corrupted
    the author's story header** (`parse.header-list-empty`), and
    `StoryHeaderIFID.read` returned nil on real stories. Fixed at all 8 sites
    via one documented helper `StoryHeaderLines.isListItem(_:under:)`.
    Behavior Statement produced (rule 12); 2 regression tests derived from it.
  - One expectation moved as a stated consequence, not a quiet retune:
    `testAnalyzerErrorArrivesWithFullSpan` span.line 14 → 15 (the indented
    `authors:` adds a line above the error site).
- **Follow-up for David**: the duplication is why one defect lived in four
  modules — the durable fix is extracting the header walk into
  `StoryHeaderLines` as one shared list-aware iterator. Deliberately not done
  (a refactor of working product code, wider than the failure being cleared).

## Key Decisions
- ADR-142's stamp amendment was made (docs-only) because the D4–D13 range
  predated D14 and no longer read correctly against the shipped implementation —
  within Phase 11's deliverable, not an unasked status flip.
- The thread-wire built-story leg was added as a NEW transcript rather than
  editing the passing `wire.transcript` (working transcripts stay untouched).
- Turbo's 65/65 counted 39 cache replays, so the nine load-bearing suites were
  re-run cache-free for the audit's evidence bar.
- **Two scope judgment calls in Phase 4, both flagged to David rather than made
  silently**: (1) David asked to "fix the fixtures", but the themes failure was
  an IDE product bug, and once the writer fix exposed the same defect in three
  more modules, fixing only the blocking two would have knowingly left six
  broken sites — so all 8 were fixed. (2) `testAnalyzerErrorArrivesWithFullSpan`
  span.line 14 → 15 is a consequence of my own fixture edit, called out
  explicitly so it does not read as a quiet retune of a failing assertion.
- The systemic header fix used a shared predicate (`isListItem`) rather than
  extracting the whole header walk. Extraction is the durable fix and is
  recorded as a follow-up; it refactors working product code, wider than the
  failure being cleared.

## Open Items
- Known limits riding as filed issues, not acceptance gaps: #273 (initiative-row
  `then asks` on the seize path), #274 (ending double-render), #275
  (subject-change initiative occasions; condition form works).
- Design observations from session b71e04 still awaiting David's review:
  blocking-thread refusal + same-turn tick advance (refuse-then-press-on
  bunching); day-one defection activation bypassing the too-raw window on
  resume.
- Pre-session audit 2nd-time flags, held for David: 23 stranded
  `.devarch-events-*.jsonl` logs + 5 stale `.session-state-*.json` in
  docs/context/ (SessionEnd archival path broken); two stale plans needing
  disposition (adr-280-chord-writer-project-model Phase 3, live-derived-state
  Phase 1).
- **Superseded**: the earlier note to leave
  `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` uncommitted no
  longer applies — the housekeeping step regenerated it at Chord 3.3.0, so it
  is part of this commit and absorbs the parallel session's 3.2.0 stamp.
- Deferred by choice: extracting the IDE story-header walk into one shared
  list-aware iterator (see Key Decisions).

## Files Modified

ADR-320 Phase 11 (acceptance closure):
- docs/work/archive/adr-320-conversation/ (whole dir archived from
  docs/work/; plan.md → Phase 10/11 DONE, Plan Status DONE)
- docs/work/archive/adr-320-conversation/acceptance-audit.md (new)
- stories/ides-of-march/tests/transcripts/thread-wire.transcript (new)
- docs/architecture/adrs/adr-142-conversation-system.md (supersession range
  D4–D13 → D4–D14)
- packages/stdlib/src/actions/helpers/dialogue-selector.ts (header-comment path
  repoint only)
- docs/context/.current-plan (released by plan-archive.sh)

Housekeeping — version alignment + Sharpee 5.1.0:
- website/src/lib/nav.ts (Chord 3.0.0 → 3.3.0, Sharpee 5.0.1 → 5.1.0)
- 34 workspace package.json files + stories/dungeo/package.json,
  stories/dungeo/src/version.ts (tsf version 5.1.0 lockstep)
- packages/stdlib/src/actions/standard/version/engine-version.ts (→ 5.1.0)
- tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json,
  pages/chord__stdlib__reference.html (regenerated at Chord 3.3.0)

IDE Chord 3.3.0 alignment (Phases 1–4):
- packages/chord/tests/fixtures/lexer-golden/conversation-surface.story (new)
- packages/chord/tests/fixtures/lexer-golden/lexer-golden.json (regenerated;
  additive only)
- packages/chord/tests/lexer-golden.test.ts (25 drift-guard constructs; header
  comment refreshed)
- tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift (pin → 3.3.0 + history)
- tools/ide/SharpeeIDE/Editor/SyntaxHighlighter.swift (7 keywords)
- tools/ide/SharpeeIDE/Workspace/StoryHeaderLines.swift (isListItem helper)
- tools/ide/SharpeeIDE/Workspace/StoryHeaderThemes.swift,
  StoryHeaderIFID.swift, StoryHeaderPublishSource.swift,
  StoryHeaderAutoAssertion.swift (8 scans made list-aware)
- tools/ide/SharpeeIDETests/: StoryHeaderThemesTests.swift (+2 regression
  tests), TestToolchain.swift, TestRunnerTests.swift,
  TestingSurfaceRealPathTests.swift, StoryScaffoldTests.swift,
  ComposeRunnerTests.swift (fixtures + one stated expectation move)
- tools/ide/SharpeeIDE/Resources/testing-surface/surface.js (Xcode pre-build
  regeneration, not a hand edit)
- docs/work/archive/ide-chord-330-alignment/ (plan, archived; all 4 phases DONE)

## Notes
- Session started: 2026-08-17 23:58 (session ade288); work ran 2026-08-18.

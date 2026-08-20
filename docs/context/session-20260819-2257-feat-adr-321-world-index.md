# Session Summary: 2026-08-19 - feat/adr-321-world-index (2026-08-19 22:57 CDT)

## Goals
- Not the planned goal. Session was driven entirely by David's hands-on review of the World tab in Chord Writer, fixing render defects and rebuilding the Incomplete-view UX (what the code calls ADR-321 Amendment 2 and Amendment 3).
- Planned Phase 8 item D13 (unnamed-tool finding) was NOT attempted.

## Phase Context
- **Plan**: `docs/work/world-index/plan.md` — "Build the World Index feature end to end" (ADR-321).
- **Phase executed**: None of Phase 8's remaining deliverable (D13). All work this session is off-plan: ADR-321 Amendment 2/3 material referenced in code comments but not yet written into the ADR document itself (only Amendment 1 exists as a written section in `docs/architecture/adrs/adr-321-world-index.md`).
- **Tool calls used**: 335 (main session, per `.session-state-b983d6.json`) — no phase budget applies since this was off-plan.
- **Phase outcome**: N/A — Phase 8 remains `CURRENT (since 2026-08-19)` with D13 still outstanding; not advanced or altered by this session.

## Completed

### Render defects (from David's screenshots)
- Row overlap: `WorldFindingTable` pinned `rowSizeStyle = .small` (17pt) against the author's actual panel font (Georgia XL, 20pt line height). Fixed via new `FontPreference.panelRowHeight`, applied in `WorldFindingTable`, `Play/IndexView`, `Project/ProjectTreeViewController`.
- Text smear: cells used `attributedStringValue`, whose default paragraph style wraps and overrides the field's `.byTruncatingTail` — a long finding drew 78pt of text into a 25pt row. Fixed with a truncating paragraph style + `maximumNumberOfLines = 1`.
- World tab badge (232) disagreed with the class-strip sum (647) because it read analyzer counts while the list showed the D11 merged reading. Removed entirely per David: candidate lists are not defect counts.

### Analyzer correctness (`packages/world-index/src/incomplete.ts`)
- Hyphen now joins instead of breaking phrase runs ("tiring-house door" reads as one name); possessives end a run ("house's first play" no longer accuses "play-book").
- Corpus pins moved as a result: Fernhill 20/9/58 → 27/10/51; seven no-object fragments became true missing-word findings (cast-iron estate boiler, long-handled primer plunger, wooden-handled tin opener, forge-made crowbar, quarter-turn stopcock, four-spoked brass handle, leather-topped desk).

### Wire schema `world-index/2` → `world-index/3`
- `prose[].span` replaces `line` (whole passage region, not one line).
- Findings carry `matched` (the word that reached the target).
- New `declarations` table (name, span, room per entity).
- Confirmed in `packages/world-index/src/document.ts` (`WORLD_INDEX_SCHEMA = 'world-index/3'`) and `tools/ide/SharpeeIDE/World/WorldIndexDocument.swift` (`worldIndexSchema = "world-index/3"`).

### Navigation and explanation
- New `WorldPhraseLocator` resolves a phrase to its exact range inside the passage span. Real-source test (`WorldPhraseLocatorTests.testLocatesTheRealIdesOfMarchPhrase`) asserts against `ides-of-march.story` and passed in this session's own IDE run (see Test Coverage Delta) even after the story file's later hand-edits.
- Second jump goes to the target's declaration. Rows explain themselves in player-consequence language.

### The "not a thing" rule (the 611-noise problem)
- David supplied a 16,958-lemma TSV derived from Open English WordNet 2024 (CC BY 4.0), every lemma lacking a `physical entity` sense, now at `packages/world-index/data/non-physical-nouns.tsv` (17,009 lines including header, file-verified). `scripts/build-lexicon.mjs` generates `src/non-physical-nouns.generated.ts` — file's own comment records 12,444 lemmas after dropping the group/measure/communication branches (crowd/audience, coin, and written-prop nouns like deed/ticket/receipt/playbill/warrant/passport).
- Rule order: `THINGS_ANYWAY` override → five-word hand list (flourish, jig, clank, whump, wheeze) → lexicon → morphology. `-ship` and `-hood` dropped from morphology entirely (David's ruling: a knighthood is a thing a story can confer).
- Per-story verdicts (`filters.notThingHeads`, ~75-85 words, under 1.5KB) cross the wire; the lexicon itself stays analyzer-side.

### UX rebuild (David-directed)
- Role bands (Story/Tools/Atmosphere) became a third tab strip instead of inline headings.
- No-object findings now rank by recurrence.
- Per-phrase story-wide ignore persisted to `<story>.world-ignore.json` beside the `.story` file (new `WorldIgnoreStore.swift`; `branch-stories/ides-of-march/ides-of-march.world-ignore.json` now holds 23 phrases from David's own use).
- All/Remaining/Ignored filter added.

### Cards (Amendment 3)
- Each candidate is a `WorldCandidateCard` (new file) with a button per unknown adjective (+ stout, + oak), "Define as scenery", "In prose", "Show `<target>`", "Ignore".
- Edits go through the editor's undoable `replaceText`. New `WorldSourceEdit.swift` computes them.
- Three placement bugs found by David using it, each fixed and pinned by a new test in `WorldSourceEditTests.swift`: aka-line now follows the kind line (house style, was written above it); "Define scenery" now lands beside its host room (was appended at file end); edits are now computed against the live buffer via new `EditorViewController.currentText(of:)` and anchored by searching for the `create` line rather than trusting analyzer line numbers (previously computed against disk and applied to the buffer, so a second accepted offer landed mid-phrase-block).

### Completion tracking
- Accepting the last adjective marks a card done — fixed, not ignored; session state, cleared by the next analysis.
- "Define as scenery" transforms the card into a "declared, and says nothing" card whose button opens the description line.

### Fourth Incomplete class: Undescribed
- New `packages/world-index/src/undescribed.ts` derives entities with no `descriptionKey`/`initialDescriptionKey`, excluding regions and the player. Both corpus stories report zero.
- David's ruling on whether this should be a build error: no — it compiles and plays fine, and a warning on every deliberately-plain object is one authors learn to ignore.

## Key Decisions

### 1. ADR-321 amendments are in code but not yet written into the ADR
Code comments across `packages/world-index/src/*` and `tools/ide/SharpeeIDE/World/*` cite "Amendment 2" and "Amendment 3" throughout, and the wire schema has already bumped to `world-index/3`, but `docs/architecture/adrs/adr-321-world-index.md` still documents only Amendment 1. This is a gap between what shipped and what the ADR records — worth an ADR-worthy write-up (rule 11) before the next phase, not a discrepancy to reconcile silently.

### 2. Buffer-anchored edits, not disk-anchored
`WorldSourceEdit` computes offsets against the editor's live buffer (`currentText(of:)`), not the file on disk, and locates the target line by searching for the `create` statement rather than trusting analyzer-reported line numbers. This was forced by a real bug David hit (a second accepted card offer landing inside a phrase block) — analyzer line numbers drift the moment one edit lands, so anchoring by content rather than position is the only correct approach for repeated accept-cycles.

### 3. Undescribed is a candidate, not a build error
David explicitly declined to make missing descriptions a compile/build failure — the World tab's advisory framing (candidate lists, not defects) extends to this new class too, consistent with the badge-removal decision earlier in the session.

## Next Phase
- Plan's own next item is Phase 8's D13 (unnamed-tool finding), still not started — unchanged by this session.
- Before D13, this session leaves two prerequisites open: (a) write ADR-321 Amendments 2 and 3 into the ADR document so the code and the record agree, and (b) re-pin the `world-index` corpus tests against `ides-of-march.story`'s current, David-edited state (see Blocker below) — D13's own recall work will be measured against those same pins.
- **Entry state for D13**: Amendment 2/3 code stable and IDE-verified (559/559 passing); world-index TS suite currently RED on 4 stale pins, needs re-pinning first.

## Open Items

### Short Term
- **World-index (TS) test suite is currently RED** — 4 failures, all stale corpus-count/snapshot pins against `branch-stories/ides-of-march/ides-of-march.story`, which David hand-edited via the new cards feature after this session's last clean run (see Blocker below). Not a logic regression — the failure diffs are entity/word/finding-count drift consistent with real story-text edits, not a code defect.
- `tools/ide/SharpeeIDE/World/WorldFindingExplanation.swift` is now dead code (cards absorbed it) — awaiting David's confirmation to delete (never delete without confirmation, per CLAUDE.md).
- `tools/ide/non-physical-nouns.tsv` is an untracked, byte-identical duplicate of `packages/world-index/data/non-physical-nouns.tsv` sitting at the `tools/ide` root — looks like a stray copy from the lexicon-build work; worth confirming with David before deleting or committing it.
- `branch-stories/ides-of-march/ides-of-march.story` carries David's own accepted card edits (aka door, oak, stout / aka ale, pot, leather, small) and the new untracked `ides-of-march.world-ignore.json` (23 phrases) — commit scope is David's call.

### Long Term
- ADR-303 D5 (combinatorial sweeps for unwinnable states) is DRAFT and entirely unimplemented; the shared semantic world-state signature it and D4 both need does not exist. Raised by David at session end, not acted on.
- Phase 8's D13 (unnamed-tool finding) still not started.

## Files Modified

**world-index package** (9 files, TypeScript):
- `packages/world-index/src/document.ts` - wire schema bump to `world-index/3` (span, matched, declarations)
- `packages/world-index/src/incomplete.ts` - hyphen-join/possessive rules, "not a thing" lexicon integration
- `packages/world-index/src/index.ts`, `src/prose.ts` - prose span model support
- `packages/world-index/src/undescribed.ts` (new) - 4th Incomplete class
- `packages/world-index/data/non-physical-nouns.tsv` (new), `scripts/build-lexicon.mjs` (new), `src/non-physical-nouns.generated.ts` (new, untracked dir) - WordNet-derived lexicon
- `packages/world-index/tests/cli.test.ts`, `tests/incomplete.test.ts`, `tests/roles.test.ts` - updated/re-pinned (partially — see Open Items)
- `packages/devkit/src/commands/world-index.test.ts` - updated for schema bump

**IDE World tab** (16 files, Swift):
- `tools/ide/SharpeeIDE/World/WorldFindingTable.swift`, `WorldIncompleteView.swift`, `WorldIndexDocument.swift`, `WorldProseChunker.swift`, `WorldReachView.swift`, `WorldView.swift` - modified for cards, role bands, wire v3
- `tools/ide/SharpeeIDE/World/WorldCandidateCard.swift` (new), `WorldIgnoreStore.swift` (new), `WorldPhraseLocator.swift` (new), `WorldSourceEdit.swift` (new)
- `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` - new `currentText(of:)` for buffer-anchored edits
- `tools/ide/SharpeeIDE/MainWindow.swift`, `Play/IndexView.swift`, `Play/RightPanelViewController.swift`, `Project/ProjectTreeViewController.swift`, `UI/FontPreference.swift` - panel row height, navigation wiring
- `tools/ide/SharpeeIDETests/WorldIndexTests.swift` (modified), `PanelRowHeightTests.swift`, `WorldPhraseLocatorTests.swift`, `WorldSourceEditTests.swift` (new)

**Story fixture** (2 files):
- `branch-stories/ides-of-march/ides-of-march.story` - David's own accepted card edits
- `branch-stories/ides-of-march/ides-of-march.world-ignore.json` (new, untracked)

## Notes

**Session duration**: not recorded precisely; session started 2026-08-19 22:57 CDT.

**Approach**: entirely reactive — David used the shipped Phase 6/8 World tab as a real author would, and each defect or UX friction point he hit became the next fix, in the order listed under Completed. Two bugs were self-inflicted mid-session (see Recurrence Check) and fixed before landing.

**Evidence-accounting note**: the session's own claimed "159 passing, 1 skipped" for `@sharpee/world-index` did not hold at summary-write time — a fresh `pnpm --filter '@sharpee/world-index' test:ci` run now shows 155 passed / 4 failed / 1 skipped (160 total), because `ides-of-march.story` was edited (by David, via the cards feature) after the session's last clean run. This is flagged as the session's real Blocker below rather than silently reconciled.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Test Infrastructure — `@sharpee/world-index`'s pinned corpus-count/snapshot tests (`tests/corpus-shape.test.ts` ×2, `tests/incomplete.test.ts` D6b pin, `tests/roles.test.ts` D12 split) are stale against `ides-of-march.story`'s current, hand-edited state; 4 failures confirmed by a fresh run at summary-write time (2026-08-20 02:13 local).
- **Blocker Category**: Test Infrastructure
- **Estimated Remaining**: ~1-2 hours to re-pin the corpus tests, confirm the diffs are edit-driven (not logic bugs — already spot-checked in this summary), then resume D13; plus a short ADR-321 Amendment 2/3 write-up session.
- **Rollback Safety**: safe to revert — nothing committed this session; all changes are uncommitted working-tree modifications on `feat/adr-321-world-index`.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 6 (IDE World tab, code+tests complete) and most of Phase 8 Amendment 1 (D10, D11, D12, D14 all DONE) were already in place, providing the prose/roles/wire infrastructure this session's Amendment 2/3 work extended.
- **Prerequisites discovered**: the corpus-pin tests need a designed re-pin workflow (or a policy David sets) for whenever the fixture `.story` files are edited live through the IDE — today a David edit and an analyzer-code edit both invalidate the same pins with no way to tell which caused a given diff without reading it by hand, as this summary had to do.

## Architectural Decisions

- ADR-321 Amendment 2 (wire schema `world-index/3`: prose spans, `matched`, `declarations`; the "not a thing" lexicon rule) — referenced throughout the code by comment, not yet written into `docs/architecture/adrs/adr-321-world-index.md`.
- ADR-321 Amendment 3 (cards, `WorldSourceEdit`, the Undescribed class, completion tracking) — same gap: implemented, not yet documented in the ADR.
- Pattern applied: role-band tab strip extends the existing `tabStrip.addTab` pattern from Phase 6/8 rather than inventing new chrome (DEVARCH rule 6/7 cohesion).
- No new ADR was written this session; the two amendments above are flagged for a rule-11 write-up next session rather than drafted here, since this session's time went to implementation, not documentation.

## Mutation Audit

- Files with state-changing logic modified: `WorldSourceEdit.swift` (computes buffer edits), `EditorViewController.swift` (`currentText(of:)`, `replaceText`), `WorldIgnoreStore.swift` (persists `.world-ignore.json`), `incomplete.ts`/`non-physical-nouns.generated.ts` (classification rule), `undescribed.ts` (new derivation).
- Tests verify actual state mutations: YES (evidence: `xcodebuild test -only-testing:SharpeeIDETests -derivedDataPath ./DerivedData`, run fresh at 2026-08-20 02:13-02:14 local by this write-up — **559 passing, 0 failures**, including all 16 `WorldSourceEditTests` cases, e.g. `testASecondOfferLandsCorrectlyInAnUnsavedBuffer` which directly asserts the buffer-vs-disk fix). This run postdates every file edit in the working tree.
- The specific reversion claims in the session's own narrative ("restoring `rowSizeStyle = .small` fails two row-height tests; removing the wrap guards fails the one-line test at 78pt vs 25pt") were NOT independently re-verified in this write-up (would require reverting code) — [reported by session, unverified].
- world-index (TS) side: mutation logic itself is not in question — the 4 failing tests are pinned-count staleness (see Blocker), confirmed by reading each failure's expected-vs-received diff, not a mutation-assertion gap.

## Recurrence Check

- Similar to past issue? YES — two distinct recurrences, both against `docs/context/session-20260819-2123-feat-adr-321-world-index.md`.
  1. **Stale test evidence, again.** That session's own summary recorded an "evidence-accounting gap": a logged passing test run predated the session's final code edits and was flagged stale. This session repeats the same shape — the session's claimed final "159 passing, 1 skipped" for world-index did not hold when re-run at summary-write time, because a downstream file (`ides-of-march.story`) was edited after the last clean run. Two sessions in a row on this branch have shipped a "final passing count" that a re-run contradicts. Worth a one-time process fix: this session's Blocker recommends deciding a re-pin policy for IDE-editable fixture stories rather than trusting a narrative "final run."
  2. **Self-inflicted callback loop, third-plus occurrence of the family.** The prior session's summary already names this as a third occurrence: `WorldIndexRunner`'s pipe-buffer deadlock (reading stdout inside `terminationHandler` instead of draining while the child runs) repeated a bug class already fixed in `IntrospectionRunner` and `ComposeRunner`. This session's `TabStripView.setTabs` infinite recursion (the band-selector handler re-rendering the tab strip inside its own `onSelect` callback) is a related but distinct shape — a callback re-entering its own container synchronously — caught and fixed before landing, but it is the second self-inflicted reentrant-callback bug on this branch in two sessions. Worth flagging alongside the prior session's "one-time audit of subprocess runners" recommendation as a broader "audit callback/handler re-entrancy in `tools/ide/SharpeeIDE`" item, though not urgent enough to block on today.

## Test Coverage Delta

- Tests added: 16 (`WorldSourceEditTests.swift`, new) + 6 (`WorldPhraseLocatorTests.swift`, new) + some number in `PanelRowHeightTests.swift` (new, count not separately isolated in this run) + `undescribed.ts` coverage folded into `incomplete.test.ts`/`roles.test.ts` — session's own reported "159 passing" figure for world-index could not be reconciled to a specific added-test count without re-pinning first.
- Tests passing before: not independently known (prior session ended at world-index 144/1 skipped, IDE 525/0 per its own summary). After, verified fresh at summary-write time (2026-08-20 02:13-02:14 local):
  - `pnpm --filter '@sharpee/world-index' test:ci`: **155 passed, 4 failed, 1 skipped (160 total)** — RED, see Blocker.
  - `pnpm --filter '@sharpee/devkit' test:ci`: **171 passed, 1 skipped (172 total)** — matches session's claim exactly.
  - `xcodebuild test -only-testing:SharpeeIDETests`: **559 passed, 0 failures** — matches session's claim exactly.
- Known untested areas: the reversion/mutation-check claims for the row-height and wrap-guard fixes (see Mutation Audit) were not re-verified in this write-up.

---

**Progressive update**: Session completed 2026-08-20 02:15 (local, evidence gathered at summary-write time)

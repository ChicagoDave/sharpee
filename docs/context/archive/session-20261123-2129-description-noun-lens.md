# Session Summary: 2026-11-23 - description-noun-lens (CST)

## Goals
- Build the lens-findings-select-phrase plan (GH #835): Phase 1, the lens tier places each phrase at its own span (D-2(a) length, D-3(a) one vocabulary); Phase 2, the Testing tab's lens section and a card that asks for the phrase's range; Phase 3, SharpeeIDE selects the phrase.

## Phase Context
- **Plan**: `docs/work/lens-findings-select-phrase/plan-20261123-lens-findings-select-phrase.md` — the Testing tab shows lens findings and a card selects the phrase (5 phases).
- **Phase executed**: Phases 1 to 3, all DONE — Phase 1 "The lens tier places each phrase at its own span" (Medium, David's go for `packages/` given this session), Phase 2 "The Testing tab's lens section, and a card that asks for the phrase's range" (Medium), Phase 3 "SharpeeIDE selects the phrase" (Medium).
- **Tool calls used**: 148 cumulative (session state file at this write); Phase 4's Small budget is 100, which `checkpoint-due` reported passed, so the session ended before Phase 4.
- **Phase outcome**: Completed under budget (three Medium phases of 250 each in 127 calls).
- **Out-of-scope changes**: Phase 1's flip: `out of scope: packages/devkit/src/commands/lens.test.ts`, `out of scope: packages/devkit/tests/lens-phrase-place.test.ts`, `out of scope: stories/dungeo/src/version.ts`. Phase 2's and Phase 3's flips each: `out of scope: tools/ide/SharpeeIDE/Resources/testing-surface/surface.css` (the rebuilt bundle's stylesheet; the plan's Files list names only `surface.js`).

## Completed

### Phase 1 — wire field, locator, one vocabulary (committed in e2153da68)
- `packages/ide-protocol/src/run-events.ts`: `LensFindingSource` gains optional `at?: Span` and `length?: number`, both or neither; guard `isPhrasePlace`; schema stays 2.
- `packages/devkit/src/commands/lens-sources.ts`: `lensSourceReader`, `locateSourcePhrase` (world-index `locatePhrase` inside the keyed passage; keyless sources never searched), `utf16Length`; `test-lens.ts` sets `at`/`length`.
- `packages/branch-tester/src/lens/lens-words.ts` (new, type-only imports): class titles, source words, soundness footer, read by `examinable-report.ts` and exported from `index.ts`.
- ADR-408 Amendment 2 (D9 as written plus the length rule; one vocabulary).

### Phase 2 — the Testing tab's lens section (`tools/ide/web/testing-surface/`)
- `@sharpee/branch-tester/lens-words` alias in `tsconfig.json`, `vitest.config.ts`, `build.mjs`.
- `src/lens.ts` view functions: `lensStripsOf`, `lensSourceRequest`, `lensCardRequest`, `lensDescriptionRequest`, `lensSoundnessLines`, `lensHeaderText`, `lensCardLines`, `lensSourceLabel`, `openSourcePost`.
- `src/cards.ts` renders the lens section after claims (`renderLensSection`, `lensCard`, `requestLink`); the delegate's `onOpenSource` takes an optional range; `src/main.ts` posts `{openSource:{file,line,column,length}}` (D-2(a)); lens styles in `src/surface.css`.
- Tests: `tests/lens.test.ts` +7 cases; `tests/lens-real-path.test.ts` asserts the whetstone card request `{file:null,line:19,range:{column:3,length:9}}` and the description offer at line 35.
- Bundle rebuilt with `tools/ide/build-testing-surface.sh` (exit 0 [reported by session, unverified]); `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js` and `surface.css` changed.

### Phase 3 — SharpeeIDE selects the phrase (`tools/ide/SharpeeIDE/`)
- `TestingSurface/TestingSurfaceViewController.swift`: `openSource` hook is `((URL, Int, SourcePhrase?) -> Void)?`; new `struct SourcePhrase` with `read(from:)` (malformed reads as nil).
- `MainWindow.swift`: `MainSplitViewController` routes a phrase to `openDocument(at:selectingPhraseAt:column:length:)`.
- `Editor/EditorViewController.swift`: that method (navigation mark, not the error dot; a stale range falls back to the line) and static `phraseRange(line:column:length:in:)`.
- `SharpeeIDETests/TestingSurfaceRealPathTests.swift`: `testRealSculleryRunsWhetstoneCardSelectsThePhraseInTheEditor` (real CLI, real bundle, editor selects "whetstone", offer at line 35 with no range) and `testALineOnlyRequestSelectsTheLineAndNothingWider` (AC-6); two existing closures took the hook's third parameter, assertions unchanged.
- Chord pin 4.1.0 on both sides, no bump.

### Records
- Plan: Phases 2 and 3 `**Demonstrated**` lines written by the session; this write marked Phase 2 `[verified: ...]` (event-log row) and Phase 3 `[reported by session, unverified]` (no xcodebuild row in the event log).

## Key Decisions

### 1. Changed an existing assertion under ruling D-3(a) — must be shown to David
`packages/devkit/src/commands/lens.test.ts:53` now expects `by class          Not answered 40, Described 6, Number form 6` (was the kind ids `not-in-scope 40, resolved-described 6, number-form 6`).

### 2. Keyless sources carry no place
No test story has a keyless source, so that rule is pinned only by the unit case in `packages/devkit/tests/lens-phrase-place.test.ts`.

### 3. World-index stays out of the bundle by type-only imports, not by `bundle-inputs.mjs`
The plan's deliverable said the source-only check would refuse world-index; it refuses only `dist/` and `node_modules/` inputs, so the guard is `lens-words.ts`'s type-only imports, pinned by `packages/branch-tester/tests/lens-words.test.ts` (recorded in the plan's Phase 2 Demonstrated line).

## Next Phase
- **Phase 4**: "PaneHost selects the phrase" — `OpenSourceRequest` in `tools/ide/PaneHost/Shell/TestingSurfacePosts.cs` gains the optional range, a pure text-to-offset function, `Editor.Select` in `ShellWindow.axaml.cs`, tests in `tools/ide/PaneHost.Tests/TestingSurfacePostsTests.cs`.
- **Tier**: Small (100 tool-call budget)
- **Entry state**: Phase 2's exit holds; re-check the Chord pin first (item 13); CURRENT since 2026-11-24, not started — next session. Phase 5 (gates, records, closes 835 and 837) follows it; the plan stays ACTIVE and is not archived.

## Open Items

### Short Term
- 835: IDE testing: report nouns in room and object descriptions that the player cannot use (the examinable lens is broken and only tries examine)
- 837: Chord Writer: decode the World Index failure cause no-noun-extractor

### Long Term
- N/A

## Files Modified

**Phase 1, platform source and tests** (14 files, committed in e2153da68):
- `packages/ide-protocol/src/run-events.ts`, `packages/devkit/src/commands/lens-sources.ts`, `packages/devkit/src/commands/test-lens.ts`, `packages/branch-tester/src/lens/lens-words.ts`, `packages/branch-tester/src/lens/examinable-report.ts`, `packages/branch-tester/src/index.ts`
- `packages/devkit/tests/lens-phrase-place.test.ts`, `packages/devkit/tests/test-lens.test.ts`, `packages/devkit/src/commands/lens.test.ts`, `packages/branch-tester/tests/lens-words.test.ts`, `packages/ide-protocol/tests/run-events-lens.test.ts`
- `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md`, `stories/dungeo/src/version.ts`, this summary

**Phase 2, Testing-tab page** (12 files):
- `tools/ide/web/testing-surface/src/lens.ts` - lens view functions
- `tools/ide/web/testing-surface/src/cards.ts` - lens section and cards
- `tools/ide/web/testing-surface/src/main.ts` - range post
- `tools/ide/web/testing-surface/src/surface.css` - lens styles
- `tools/ide/web/testing-surface/tsconfig.json`, `vitest.config.ts`, `build.mjs` - lens-words alias
- `tools/ide/web/testing-surface/tests/lens.test.ts`, `tests/lens-real-path.test.ts` - +7 cases, range assertion
- `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js`, `surface.css` - rebuilt bundle

**Phase 3, SharpeeIDE** (4 files):
- `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift` - `SourcePhrase`, hook signature
- `tools/ide/SharpeeIDE/MainWindow.swift` - routes the phrase
- `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` - phrase selection, `phraseRange`
- `tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift` - 2 new real-path tests

**Plan** (1 file):
- `docs/work/lens-findings-select-phrase/plan-20261123-lens-findings-select-phrase.md` - Phases 2 and 3 Demonstrated and DONE, Phase 4 CURRENT

## Notes

**Session duration**: ~3 hours wall clock (21:29 to 00:30 CST).

**Approach**: Phase 1 baselines first, then wire field, locator, vocabulary, census, ADR amendment; Phase 2 view functions then rendering then the real-path case; Phase 3 Chord pin check, then hook, routing, editor selection, real-path XCTest.

Rule 15 mutation-verification was not run: no changed function carries a side-effect name.

Census (keyed sources located of keyed, seed 42): bazaar 15/15, ferry 15/15, lodge 24/24, orchard 48/48, quay 12/12, scullery 21/21 [reported by session, unverified].

`docs/context/session-20261123-2004-description-noun-lens.md` carries a 29-line Activity Log appended by session a9e731's SessionEnd hook; it is not this session's work.

---

## Session Metadata

- **Session**: 806326
- **Status**: COMPLETE (unverified: Phase 3 XCTest run "Executed 29 tests, with 0 failures", Mutation Audit YES, census figures, bundle build exit 0)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: e2153da68 (Phase 1) — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261123-2129-description-noun-lens.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Plan rulings D-1(a), D-2(a), D-3(a) (session a9e731); David's go for `packages/` this session; world-index `locatePhrase` (8312510d9); timer-step prose span fix (068a06ab4, #840); Chord pin 4.1.0 on both sides.
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-408 Amendment 2: the source request is `{file, line, column, length}` per D9 as written, `length` in UTF-16 code units with line breaks counted; one vocabulary in `lens-words.ts` for console and tab.
- Pattern applied: devkit reuses world-index's locator; the editor marks the line with the navigation accent, not the error dot (ADR-324 D1); a stale or absent range falls back to today's line path (AC-6).

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` (`openDocument(at:selectingPhraseAt:column:length:)` changes the editor's selection); the rest build payloads and text.
- Tests verify actual state mutations (not just events): YES [reported by session, unverified] — `testRealSculleryRunsWhetstoneCardSelectsThePhraseInTheEditor` asserts the real editor's selected text reads "whetstone"; no xcodebuild row in the event log.

## Test Coverage Delta

- Tests added: 23 (Phase 1: ide-protocol +2, branch-tester +7, devkit +5; Phase 2: testing-surface `lens.test.ts` +7; Phase 3: 2 XCTests).
- Tests passing before → after:
  - Phase 1: devkit 256 + 1 skipped, branch-tester 525, ide-protocol 67 (plan baselines) → devkit 261 + 1 skipped, branch-tester 532, ide-protocol 69 (evidence: writer runs 2026-11-24 00:11 CST, after the last source edit at 00:09).
  - Phase 2: testing-surface `npx vitest run` → 28 files, 280 tests passed (evidence: event-log test row 2026-11-24T06:26:11Z "28 passed 280 passed", after the last Phase 2 edit at 06:26:02Z); no pre-phase count was taken.
  - Phase 3: `TestingSurfaceRealPathTests` → "Executed 29 tests, with 0 failures", TEST SUCCEEDED [reported by session, unverified].
- Known untested areas: keyless-source rule has no story-level case; the editor's navigation mark (the ruler is private).

---

**Progressive update**: checkpoint 2026-11-24 00:12 — first write: Phase 1 DONE (place + length on lens sources, lens-words vocabulary, ADR-408 Amendment 2), suites re-run green, Phase 2 CURRENT.
**Progressive update**: checkpoint 2026-11-24 00:30 — Phases 2 and 3 DONE (Testing-tab lens section with range requests; SharpeeIDE selects the phrase), Phase 2 Demonstrated verified from the event log, Phase 3 marked reported; stopping before Phase 4 (PaneHost) on the tool-call budget.
**Progressive update**: session completed 2026-11-24 00:36 — terminal write: goals (Phases 1–3) met, Status promoted to COMPLETE (unverified) on the reported Phase 3 xcodebuild run; Phase 4 next session.

## Activity Log (auto-captured)
```
[06:04:25] BUILD: Build passed — npx tsc --noEmit 2>&1 | tail -20 | grep -c "error TS"; grep -n -i "outcome\|Stat
[06:05:50] EDIT: File edited — packages/ide-protocol/src/run-events.ts
[06:05:50] EDIT: File edited — packages/ide-protocol/src/run-events.ts
[06:05:58] EDIT: File edited — packages/ide-protocol/tests/run-events-lens.test.ts
[06:05:59] EDIT: File changed via Bash — packages/ide-protocol/src/run-events.ts
[06:05:59] EDIT: File changed via Bash — packages/ide-protocol/tests/run-events-lens.test.ts
[06:06:02] EDIT: File edited — packages/ide-protocol/tests/run-events-lens.test.ts
[06:06:25] EDIT: File changed via Bash — packages/devkit/src/commands/lens-sources.ts
[06:06:36] EDIT: File changed via Bash — packages/devkit/src/commands/test-lens.ts
[06:06:48] EDIT: File written — packages/branch-tester/src/lens/lens-words.ts
[06:06:59] EDIT: File changed via Bash — packages/branch-tester/src/index.ts
[06:06:59] EDIT: File changed via Bash — packages/branch-tester/src/lens/examinable-report.ts
[06:06:59] EDIT: File changed via Bash — packages/branch-tester/src/lens/lens-words.ts
[06:07:21] EDIT: File changed via Bash — packages/devkit/src/commands/lens.test.ts
[06:07:21] EDIT: File changed via Bash — packages/devkit/tests/test-lens.test.ts
[06:07:50] EDIT: File written — packages/devkit/tests/lens-phrase-place.test.ts
[06:08:01] EDIT: File changed via Bash — packages/devkit/tests/lens-phrase-place.test.ts
[06:08:17] EDIT: File written — packages/branch-tester/tests/lens-words.test.ts
[06:08:27] EDIT: File changed via Bash — packages/branch-tester/tests/lens-words.test.ts
[06:09:23] EDIT: File changed via Bash — stories/dungeo/src/version.ts
[06:09:36] EDIT: File edited — packages/devkit/tests/lens-phrase-place.test.ts
[06:10:34] EDIT: File edited — docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md
[06:10:37] EDIT: File changed via Bash — docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md
[06:10:49] EDIT: File edited — docs/work/lens-findings-select-phrase/plan-20261123-lens-findings-select-phrase.md
[06:10:50] EDIT: File changed via Bash — docs/work/lens-findings-select-phrase/plan-20261123-lens-findings-select-phrase.md
[06:12:31] EDIT: File edited — docs/work/lens-findings-select-phrase/plan-20261123-lens-findings-select-phrase.md
[06:13:04] EDIT: File written — docs/context/session-20261123-2129-description-noun-lens.md
[06:13:10] EDIT: File changed via Bash — docs/context/session-20261123-2129-description-noun-lens.md
[06:23:07] TEST: Tests passed — 14 passed 143 passed
[06:23:12] EDIT: File written — .commit-files
[06:23:12] EDIT: File written — .commit-msg
[06:23:14] GIT: Git operation — bash /Users/david/.claude/scripts/git-commit.sh
[06:24:00] EDIT: File changed via Bash — tools/ide/web/testing-surface/build.mjs
[06:24:00] EDIT: File changed via Bash — tools/ide/web/testing-surface/tsconfig.json
[06:24:00] EDIT: File changed via Bash — tools/ide/web/testing-surface/vitest.config.ts
[06:24:28] EDIT: File changed via Bash — tools/ide/web/testing-surface/src/lens.ts
[06:25:04] EDIT: File changed via Bash — tools/ide/web/testing-surface/src/cards.ts
[06:25:04] EDIT: File changed via Bash — tools/ide/web/testing-surface/src/main.ts
[06:25:16] EDIT: File changed via Bash — tools/ide/web/testing-surface/src/surface.css
[06:25:25] BUILD: Build passed — npx tsc --noEmit -p . 2>&1 | head -20; echo tsc-exit=$?
[06:26:02] TEST: Tests passed — 2 passed 15 passed
[06:26:02] EDIT: File changed via Bash — tools/ide/web/testing-surface/tests/lens-real-path.test.ts
[06:26:02] EDIT: File changed via Bash — tools/ide/web/testing-surface/tests/lens.test.ts
[06:26:11] TEST: Tests passed — 28 passed 280 passed
[06:26:11] EDIT: File changed via Bash — tools/ide/SharpeeIDE/Resources/testing-surface/surface.css
[06:26:11] EDIT: File changed via Bash — tools/ide/SharpeeIDE/Resources/testing-surface/surface.js
[06:26:56] EDIT: File changed via Bash — docs/work/lens-findings-select-phrase/plan-20261123-lens-findings-select-phrase.md
[06:28:14] EDIT: File changed via Bash — tools/ide/SharpeeIDE/Editor/EditorViewController.swift
[06:28:14] EDIT: File changed via Bash — tools/ide/SharpeeIDE/MainWindow.swift
[06:28:14] EDIT: File changed via Bash — tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift
[06:28:49] EDIT: File changed via Bash — tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift
[06:31:10] EDIT: File edited — docs/work/lens-findings-select-phrase/plan-20261123-lens-findings-select-phrase.md
[06:31:11] EDIT: File edited — docs/work/lens-findings-select-phrase/plan-20261123-lens-findings-select-phrase.md
[06:31:59] EDIT: File written — docs/context/session-20261123-2129-description-noun-lens.md
[06:32:04] EDIT: File edited — docs/context/session-20261123-2129-description-noun-lens.md
[06:32:05] EDIT: File changed via Bash — docs/context/session-20261123-2129-description-noun-lens.md
[06:36:59] TEST: Tests passed — 69 passed 532 passed 261 passed 28 passed 280 passed
[06:38:05] TEST: Tests passed — 14 passed 143 passed
[06:38:10] EDIT: File written — .commit-files
[06:38:11] EDIT: File written — .commit-msg
[06:38:15] GIT: Git operation — bash /Users/david/.claude/scripts/git-commit.sh --push
```

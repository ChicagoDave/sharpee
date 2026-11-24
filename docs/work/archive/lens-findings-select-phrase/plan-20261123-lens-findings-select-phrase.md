# Session Plan: The Testing tab shows the examinable lens's findings, and a card selects the phrase in the author's source (GH #835, its last bullet)

**Created**: 2026-11-23 (session a9e731)
**Plan Status**: DONE
**Overall scope**: The lens tier of `sharpee test --json` places each finding's phrase at its own span, using world-index's existing locator. The Testing tab, which both Chord Writer heads host, renders the lens section it already folds. Activating a card selects the phrase in the editor, in whichever head(s) David rules. GH #837's code already landed, so this plan closes it. Persistent in-editor marks (ADR-408 D2's separable later step), verbs beyond examine, and GH #836 are out of scope.
**Bounded contexts touched**: N/A (testing infrastructure: the author CLI's lens tier, the shared Testing-tab page, and the two IDE heads; no story-domain behavior changes)
**Key domain language**: N/A. Working vocabulary: lens, finding, passage (a keyed prose site), `span` (the passage's region), `at` (the phrase's own span), source request, No-text finding (`resolved-default`).

Goal (David, 2026-11-23): "start on 835". **Phase 1 changes `packages/` (ide-protocol, devkit, branch-tester) and needs David's explicit go before it starts.** Approving this plan does not give that go. Phases 2 to 4 are IDE work, and D-1 decides whether and where they run.

## What the code says

Read 2026-11-23 while planning. Each item shapes a phase below.

1. **The lens tier ships the passage's region, not the phrase's span.** `lensFindingEventOf` (`packages/devkit/src/commands/test-lens.ts#lensFindingEventOf`) maps each source through `resolveSourceSpan` (`packages/devkit/src/commands/lens-sources.ts#resolveSourceSpan`). That function returns the IR phrase's span, which covers the whole passage, or the owner's declaration for a source with no key. `LensFindingSource` (`packages/ide-protocol/src/run-events.ts:581`) carries only `span`. So today the whetstone's row says lines 18 to 19 (`packages/devkit/tests/test-lens.test.ts:60`). This is the whole gap between world-index's `at` and the tab.
2. **The locator exists, and devkit can call it.** `locatePhrase` (`packages/world-index/src/locate.ts#locatePhrase`) is exported (`packages/world-index/src/index.ts:72`), and devkit already depends on world-index. It is pure. Its reader, `sourceReaderFor`, is private to `packages/world-index/src/analyze.ts`. devkit resolves span files relative to the story's directory, the rule the tab already uses for `file` (`tools/ide/web/testing-surface/src/main.ts:498`), so devkit can build the reader itself and `packages/world-index` stays untouched.
3. **In a number-form finding, the prose wrote only one of the two forms.** `classifyCandidates` (`packages/branch-tester/src/lens/examinable-classify.ts#classifyCandidates`) emits some rows whose `phrase` is the other number and whose `resolvedForm` is the form the prose wrote. The locator therefore tries `phrase` first, then `resolvedForm`.
4. **A source with no key spans its owner's whole declaration.** That declaration can hold the same words in its name or `aka` line, and a wrong span is worse than none (`locate.ts`'s own rule). So such a source gets no `at`, and its link opens the declaration's line, as today.
5. **The page folds the lens but renders nothing.** `run.ts` keeps `lensFindings` and `lensSummary` (`tools/ide/web/testing-surface/src/run.ts:206`). Nothing outside `tools/ide/web/testing-surface/src/lens.ts` calls `lensStatusOf`. The claims tier renders in `cards.ts` (`renderClaimsRows`, `tools/ide/web/testing-surface/src/cards.ts:1444`), and the lens section goes beside it.
6. **The tab cannot import the lens's words as they stand.** ADR-408's Consequences say the tab's vocabulary comes from branch-tester, as the claims tier's does. The page aliases `claim-report.ts` from source (`tools/ide/web/testing-surface/tsconfig.json:32`, `tools/ide/web/testing-surface/build.mjs:32`). The lens's words live in `packages/branch-tester/src/lens/examinable-report.ts`, which imports `examinable-classify.ts`. That module imports `@sharpee/world-index` at runtime (`readsAsThing`), and world-index reads files, so the browser bundle cannot take it. A browser-safe words module is needed, as `claim-report.ts` is for claims.
7. **Both heads read only a line today.**
   - SharpeeIDE: `TestingSurfaceViewController.swift:651` calls `openDocument(at:line:column: 1)`. That selects the whole line and sets the red error dot (`tools/ide/SharpeeIDE/Editor/EditorViewController.swift:198`). The editor can already select a span (`openDocument(at:span:)`, `:401`, through `tools/ide/SharpeeIDE/Compose/SpanText.swift`), but it also sets `errorLines`. The non-error mark is `navigationLines` (`:427`). A lens finding is not an error (ADR-324 D1), so the lens selection takes the navigation mark.
   - PaneHost: `ReadOpenSource` (`tools/ide/PaneHost/Shell/TestingSurfacePosts.cs:51`) feeds `RevealAsync(new IndexSpan(file, line, 1))` (`tools/ide/PaneHost/Shell/ShellWindow.axaml.cs:1134`), which places a caret and selects nothing.
8. **A wrapped phrase breaks D9's `length`.** ADR-408 D9 has the request carry `column` and `length` "of the phrase as the author wrote it". A Span whose phrase crosses a line break cannot be turned into a length without the source text, and the page does not have the source text (D-2).
9. **Both heads load one bundle.** That bundle is `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js`; PaneHost reads the same directory (`tools/ide/PaneHost/Hosting/RepoPaths.cs:135`). A rebuilt bundle reaches both heads.
10. **PaneHost.Tests has no headless Avalonia.** It uses xunit only (`tools/ide/PaneHost.Tests/PaneHost.Tests.csproj`). The PaneHost selection is therefore pinned on a pure function. The two-line `Editor.Select` call that applies it is not under test, and Phase 4 says so.
11. **GH #837 is done in code but still open.** It landed in lens-findings-in-ide Phase 4: `tools/ide/SharpeeIDE/World/WorldIndexDocument.swift:767`, `tools/ide/SharpeeIDE/World/WorldView.swift:213`, `tools/ide/SharpeeIDETests/WorldIndexTests.swift:210`. The issue stayed open because that plan's closing phase was abandoned.
12. **Run events are not generated into Swift or C#.** The generator's roots (`tools/repokit/src/commands/protocol-spec.ts:76`) name no run-event type. An `at` field therefore changes no generated file, and `RUN_EVENT_SCHEMA_VERSION` stays 2 (additive, as ADR-408 D8 reasoned).
13. **The Chord pin is current.** `ChordVersionCheck.supportedLanguageVersion` (`tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift:99`) and `CHORD_LANGUAGE_VERSION` (`packages/chord/src/version.ts:406`) are both 4.1.0. Phases 3 and 5 check again before any xcodebuild run.
14. **The SharpeeIDE test pattern exists.** `testDerivedRowsRenderAndASpanClickReachesTheOpenSourceHook` (`tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift:1111`) drives the real page over the real CLI's run and asserts the hook. The lens test follows it.

Inputs, not plans to resume: `docs/work/archive/lens-findings-in-ide/plan-20261122-lens-findings-in-ide.md` (Phase 5's text and "What the code says") and `docs/work/archive/world-index-noun-spans/plan-20261123-world-index-noun-spans.md`.

## Decisions for David

- **D-1. Is IDE work back on, and in which head(s)?** In session 788f1b David said "no IDE work for now". The work left under #835 is IDE work by nature. No lean: this is David's call.
  - (a) Both heads: Phases 1 to 5 as written. This meets ADR-408 D1, AC-3 and AC-6 in full.
  - (b) SharpeeIDE only: Phase 4 drops. In Phase 5, ADR-408 stays OPEN with a dated note naming PaneHost's half of AC-3 and AC-6, and #835 stays open naming it.
  - (c) PaneHost only: Phase 3 drops, and Phase 5 changes the same way, naming SharpeeIDE.
  - (d) Not yet: the plan waits, as written, until IDE work is back on. Phase 1 alone would put a field on the wire that nothing reads, which is a stepping stone, not an end state. #837 can still be closed on its own evidence (one WorldIndexTests run, no IDE change) if David says so.
- **D-2. How the source request carries the phrase's extent.**
  - (a) ADR-408 D9 as written: `{file, line, column, length}`. devkit computes the length in UTF-16 code units from the start to the end of the phrase as written, line break included, and ships it beside `at`.
  - (b) Amend D9: `{file, line, column, endLine, endColumn}`, the shape of a Span. Each head maps both ends into its own buffer, and SharpeeIDE reuses `SpanText`.
  - **Lean (b).** A Span is the repository's one shape for a place in source (Chord's `Span`, world-index's `at`, compose diagnostics). The row then carries one fact, not a span plus a length derived from it. Either way, a request with only `line` behaves as today (AC-6).
- **D-3. The class words.**
  - (a) One vocabulary: the console's class column and the tab both print the titles from branch-tester's new words module. The working titles are No text, Not answered, Number form, Ambiguous and Unclassified. This changes the console text of `sharpee lens examinable` and the test tier, which no test pins today.
  - (b) The tab prints the titles and the console keeps the kind ids. Both read from the same module.
  - **Lean (a).** That is what ADR-408's Consequence "the CLI and the tab cannot drift" asks for. The titles can be renamed at review.

Phase 1 records D-2 and D-3 as ruled in ADR-408 Amendment 2.

## Rulings (David, 2026-11-23, session a9e731: "D-1 a, D-2 a, D-3 a")

- **D-1 (a): both heads.** All five phases run. Phase 5 sets ADR-408 to IMPLEMENTED and closes #835.
- **D-2 (a): ADR-408 D9 as written.** The request is `{file, line, column, length}`. devkit computes `length` in UTF-16 code units, from the start of the phrase to its end as written, with any line break counted, and ships it on the source beside `at`. D9 is not amended. Amendment 2 records only the length rule.
- **D-3 (a): one vocabulary.** The console and the tab both print the titles from `lens-words.ts`. The console text of `sharpee lens examinable` and the test tier changes.
- The go for Phase 1's `packages/` changes (ide-protocol, devkit, branch-tester) is asked for separately.

## References consulted
- `docs/architecture/adrs/INDEX.md`: the ADR index, rebuilt for this plan by `adr-index.sh`. 412 records: 30 OPEN, 150 IMPLEMENTED, 52 ABANDONED, 7 IGNORE, 173 unclassified. One record has a Kind (ADR-408, technical), and none is `product`. 6 opened: 1 OPEN (ADR-408), 1 IMPLEMENTED (ADR-407) and 4 unclassified (ADR-321, ADR-324, ADR-333, ADR-395), each read at the sections cited below. **Declared deviation**, as in the two input plans: the rule says to open every OPEN and unclassified record, and that was not done in full. The other 29 OPEN records were judged by their Summary (save, time, clients, dialogue, liquids, doors, perception, room groups, timers, and ADR-154's superseded IDE vision), and none bears on the lens tier, the Testing tab or a source request. The other unclassified records were ruled out by title as Chord-language, engine, parser and story decisions. ABANDONED and IGNORE records were not opened.
- `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md` (OPEN, ACCEPTED):
  - D1: findings go in the Testing tab, in both heads.
  - D2: a card selects the phrase, and persistent marks are a separable later step.
  - D4 and D8: devkit's test command resolves spans as the consumer, and the rows carry them.
  - D7: the lens never gates.
  - D9: the request carries a range, and a line-only request is unchanged (D-2 amends it).
  - D10: "Write the description" opens the declaration line.
  - AC-3 and AC-6: automated tests in SharpeeIDETests and PaneHost.Tests.
  - Consequences: the tab's vocabulary comes from branch-tester (D-3, item 6).
  - Its Scope does not name `packages/world-index`, which this plan leaves untouched (item 2).
- `docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md` (IMPLEMENTED): D1, a lens runs in the CLI, and a host may present findings, but no finding depends on a host refinement. Locating the phrase is therefore devkit's job, not the IDE's.
- `docs/architecture/adrs/adr-321-world-index.md`: the 2026-11-23 notes (:804, :943). `at` is optional, absent rather than null, and found by the words rule clipped to the passage, with no fallback. The IDE's own locator stays for IR input. Phase 1's `at` follows the same convention and the same function.
- `docs/architecture/adrs/adr-324-ide-error-surfaces.md` (PROPOSED): D1, the IDE has two error kinds, and a lens finding is neither, so its selection takes the navigation mark, not the error dot. D3 and D7 bind persistent marks, which are out of scope here.
- `docs/architecture/adrs/adr-333-prose-provenance-and-play-to-write.md`: D2, spans belong to the consumer. devkit resolves them, and the lens package stays span-free.
- `docs/architecture/adrs/adr-395-exploring-tests-run-on-test-stories.md`: D7, real stories other than Dungeo do not gate. Every Demonstration cites `test-stories/scullery` or `test-stories/orchard`.
- `docs/context/project-profile.md` (2026-11-17, fresh): two IDE heads, Vitest per package, XCTest for SharpeeIDETests, and test stories under `test-stories/`.
- `docs/context/session-20261123-2008-description-noun-lens.md` (newest): the lens-findings-in-ide plan is archived and abandoned, and this goal is #835. `docs/context/session-20261123-1940-description-noun-lens.md` lists the open items: #835 and #837 (both in this plan), #836 and #669 (out of scope; #669 is why this plan is archived by hand).
- `docs/proposals/`: scanned. No templated proposal has an ACCEPTED, unplanned item that bears on this goal.
- Added after plan-review (2026-11-23, session a9e731), which found these unclassified records unopened:
  - `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md`: D23 (:243), the explorer is a family of scoped lenses. Phase 5 writes its note under it.
  - `docs/architecture/adrs/adr-277-ide-integrated-testing.md`: D2 (:173), the Tests surface renders results as a clickable list with click-through to file:line. The lens section extends that list, and Phase 5 adds a dated note.
  - `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md`: D7 (:96), the soundness contract holds at any speed. That is the source of Phase 2's soundness line.
  - `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md`: D7 (:174), lenses never gate and never count toward D5. Phase 2 keeps the tally untouched.
  - `docs/architecture/adrs/adr-355-the-test-tree-is-segmented.md`: :37 and :129, testing-surface imports branch-tester source through three aliases that must agree (tsconfig, build.mjs, vitest), and an imported module stays free of `fs`, Node types and DOM. `lens-words.ts` follows the same rule (Phase 2).
- Product ADRs not consulted (no Scope intersection): none (the index records no product ADRs).

## Phases

### Phase 1: The lens tier places each phrase at its own span
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The `lens-finding` row's sources (devkit as the consumer), the wire field, and the lens's shared words. **This phase changes `packages/ide-protocol`, `packages/devkit` and `packages/branch-tester` and needs David's explicit go first.**
- **Entry state**: The plan is approved. D-1 is ruled as (a), (b) or (c), and D-2 and D-3 are ruled. David has given the go for the three packages. Each suite runs once before the first edit, and its count is recorded here as the baseline: `pnpm --filter '@sharpee/devkit' test`, `pnpm --filter '@sharpee/branch-tester' test` and `pnpm --filter '@sharpee/ide-protocol' test:ci`. The last recorded counts were 256 passed and 1 skipped, 525 passed, and 67 passed.
- **Deliverable**:
  - `packages/ide-protocol/src/run-events.ts`: `LensFindingSource` gains `at?: Span`, the phrase's own span inside `span`, absent when it was not located. The guard accepts `at` absent and refuses a malformed one. Under D-2(a), the source also gains `length`. The change is additive, so `RUN_EVENT_SCHEMA_VERSION` stays 2 (item 12).
  - `packages/devkit/src/commands/lens-sources.ts`:
    - A source reader. A span with no `file` reads the story file, and any other span reads its file relative to the story's directory (item 2).
    - A phrase locator for a source. A keyed source is searched with world-index's `locatePhrase`, inside its passage span, for the finding's `phrase` words and then its `resolvedForm` words (item 3). A source with no key gets nothing (item 4).
    - `lensFindingEventOf` (`packages/devkit/src/commands/test-lens.ts`) takes the reader and sets `at`.
  - `packages/branch-tester/src/lens/lens-words.ts` (new): browser-safe, with type-only imports. It holds each class's title (D-3), the source words (owner and kind, moved out of `examinable-report.ts`) and the soundness footer. `packages/branch-tester/src/lens/examinable-report.ts` reads them, so the console and the tab share one vocabulary (item 6).
  - ADR-408 Amendment 2, dated, recording D-2 and D-3 as ruled. Then the index is rebuilt with `bash ~/.claude/scripts/adr-index.sh`.
  - Tests, derived from Behavior Statements:
    - devkit, the real path (rule 13a), on scullery. The whetstone's source carries `at` = line 19, column 3, endLine 19, endColumn 12, and that equals the `at` of `sharpee world-index`'s whetstone edge for the same `.story`. The existing assertion at `packages/devkit/tests/test-lens.test.ts:59` gains `at`, which is shown to David as a changed assertion.
    - devkit, on orchard: each number-form finding's keyed source has an `at` whose source text reads its phrase or its resolved form, and a source with no key carries no `at`.
    - ide-protocol: the guard with `at`, without it, and with a malformed one.
    - branch-tester: the console form prints the class words and the footer from `lens-words.ts`.
  - A census: over the six test stories, the keyed sources located out of all keyed sources, per story. Any miss is listed and shown to David before the figure is pinned.
- **Files**: `packages/ide-protocol/src/run-events.ts`, `packages/ide-protocol/tests/run-events-lens.test.ts`, `packages/devkit/src/commands/lens-sources.ts`, `packages/devkit/src/commands/test-lens.ts`, `packages/devkit/tests/test-lens.test.ts`, `packages/branch-tester/src/lens/lens-words.ts` (new), `packages/branch-tester/src/lens/examinable-report.ts`, `packages/branch-tester/src/index.ts`, `packages/branch-tester/tests/`, `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md`, `docs/architecture/adrs/INDEX.md`
- **Exit state**: On scullery, `sharpee test --json` emits the whetstone's `lens-finding`, and its source carries `at` at line 19, columns 3 to 12. The three suites pass. The census is recorded, and David has seen any miss.
- **Demonstration**: After `./repokit build dungeo`, `node packages/devkit/dist/cli.js test test-stories/scullery/scullery.story --tree --json` prints a lens-finding line for whetstone whose source carries at line 19, column 3, endLine 19, endColumn 12, and length 9 (D-2(a)). The devkit lens tests (pnpm --filter '@sharpee/devkit' test lens), the branch-tester suite (pnpm --filter '@sharpee/branch-tester' test) and the ide-protocol suite (pnpm --filter '@sharpee/ide-protocol' test:ci) each report no failures.
- **Demonstrated**: 2026-11-24, session 806326. After `./repokit build dungeo` (exit 0), `node packages/devkit/dist/cli.js test test-stories/scullery/scullery.story --tree --json` printed the whetstone's lens-finding with source `"span":{"line":18,"column":3,"endLine":19,"endColumn":36},"at":{"line":19,"column":3,"endLine":19,"endColumn":12},"length":9`. `pnpm --filter '@sharpee/devkit' test lens`: 15 passed. Full suites: devkit 261 passed, 1 skipped (baseline 256 + 1); branch-tester 532 passed (baseline 525); ide-protocol 69 passed (baseline 67). Census, keyed sources located of keyed, at seed 42: bazaar 15/15, ferry 15/15, lodge 24/24, orchard 48/48, quay 12/12, scullery 21/21, no misses; no test story has a keyless source, so the keyless rule is pinned by the unit case in `packages/devkit/tests/lens-phrase-place.test.ts`. One existing assertion changed under D-3(a): `packages/devkit/src/commands/lens.test.ts:53` now reads `by class          Not answered 40, Described 6, Number form 6` (was `not-in-scope 40, resolved-described 6, number-form 6`). [verified: no hook test row in the session event log; work-summary-writer re-ran 2026-11-24 00:11 CST, after the last source edit at 00:09 — `pnpm --filter '@sharpee/ide-protocol' test:ci` 69 passed, `pnpm --filter '@sharpee/branch-tester' test` 532 passed, `pnpm --filter '@sharpee/devkit' test` 261 passed 1 skipped, and the scullery `--tree --json` command printed the whetstone source `"at":{"line":19,"column":3,"endLine":19,"endColumn":12},"length":9`; the census figures were not re-run and stay as reported]
- **Status**: DONE

### Phase 2: The Testing tab's lens section, and a card that asks for the phrase's range
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The shared page (`tools/ide/web/testing-surface/`), which both heads host (item 9). IDE work, under D-1.
- **Entry state**: Phase 1's exit holds, and D-1 is ruled (a), (b) or (c).
- **Deliverable**:
  - A lens section in the run column, rendered in `tools/ide/web/testing-surface/src/cards.ts` beside the claims rows from `lensStatusOf` (item 5). It never touches the tally (D7).
    - It opens with the soundness line: seed, budget, stop reason, rooms reached of declared, each unreached room with its reason, and the footer from `lens-words`.
    - The refusal and absence sentences `lens.ts` already has.
    - Class strips with No text first. Not-a-thing findings are counted, not listed, as the console does without `--all`.
  - A card shows the phrase, the class title, the target and the rooms.
    - Activating it posts the first located source's range. Each source is its own link, and a source with no `at` links to its passage's first line, as a line-only request.
    - A No-text card's "Write the description" posts a line-only request at the target's declaration line (D10).
  - `tools/ide/web/testing-surface/src/main.ts`: `onOpenSource` takes an optional range and posts `{openSource:{file,line,column,endLine,endColumn}}` under D-2(b), or `{file,line,column,length}` under (a). A request with no range posts as today.
  - The `@sharpee/branch-tester/lens-words` alias in `tools/ide/web/testing-surface/tsconfig.json`, `tools/ide/web/testing-surface/vitest.config.ts` and `tools/ide/web/testing-surface/build.mjs`, as `claim-report` has. The build's source-only check (`tools/ide/web/testing-surface/bundle-inputs.mjs`) then refuses the bundle if the words module arrives from `dist/` or pulls world-index in.
  - The bundle rebuilt with `tools/ide/build-testing-surface.sh`, and `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js` committed.
  - Tests:
    - `tools/ide/web/testing-surface/tests/lens.test.ts`: the strips and their order, the not-a-thing count, the range request built from `at`, and the line-only request for a source with no `at`.
    - `tools/ide/web/testing-surface/tests/lens-real-path.test.ts`, from the real CLI run on scullery: the whetstone card's request is file null, line 19, column 3, endLine 19, endColumn 12 (or column 3 and length 9 under D-2(a)), and its description offer is line 35.
- **Files**: `tools/ide/web/testing-surface/src/lens.ts`, `tools/ide/web/testing-surface/src/cards.ts`, `tools/ide/web/testing-surface/src/main.ts`, `tools/ide/web/testing-surface/src/surface.css`, `tools/ide/web/testing-surface/tsconfig.json`, `tools/ide/web/testing-surface/vitest.config.ts`, `tools/ide/web/testing-surface/build.mjs`, `tools/ide/web/testing-surface/tests/lens.test.ts`, `tools/ide/web/testing-surface/tests/lens-real-path.test.ts`, `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js`
- **Exit state**: The page renders the lens section. From a real scullery run, the whetstone card's request carries the phrase's range. The bundle is rebuilt from source and committed.
- **Demonstration**: `tools/ide/build-testing-surface.sh` exits 0. From `tools/ide/web/testing-surface`, `npx vitest run` reports no failures, and among the passes is the scullery real-path case, which asserts the whetstone card's range request and the line-35 description offer.
- **Demonstrated**: 2026-11-24, session 806326. `tools/ide/build-testing-surface.sh` exited 0 ("testing-surface bundled → tools/ide/SharpeeIDE/Resources/testing-surface"); the bundle's module banners name `packages/branch-tester/src/lens/lens-words.ts` (from source) and no world-index file. From `tools/ide/web/testing-surface`, `npx vitest run`: 28 files, 280 tests passed (no pre-phase count was taken). Among them, `tests/lens-real-path.test.ts` (ran, not skipped, over the real `packages/devkit/dist/cli.js` on scullery) asserts the whetstone card's request `{ file: null, line: 19, range: { column: 3, length: 9 } }`, its post `{ file: null, line: 19, column: 3, length: 9 }`, and the description offer `{ file: null, line: 35 }`; `tests/lens.test.ts` gained 7 cases (strips and order, not-a-thing count, range and line-only requests, the first located source, the D10 offer, card text, soundness lines). D-2(a) shape: the page posts `{openSource:{file,line,column,length}}`. Note on the plan's deliverable: `bundle-inputs.mjs` refuses `dist/` and `node_modules/` inputs, as written; it does not by itself refuse a world-index source file. What keeps world-index out is `lens-words.ts`'s type-only imports, pinned by `packages/branch-tester/tests/lens-words.test.ts` (Phase 1). [verified: session event log test row 2026-11-24T06:26:11Z "Tests passed", detail "28 passed 280 passed", after the last Phase 2 source and test edits (tests 06:26:02Z, `src/surface.css` 06:25:16Z); the build script's exit 0 has no event row and stays as reported]
- **Status**: DONE

### Phase 3: SharpeeIDE selects the phrase
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The macOS head's source request and editor selection (ADR-408 D9, AC-3, AC-6). Runs under D-1(a) or (b).
- **Entry state**: Phase 2's exit holds. The Chord pin has been compared with the toolchain's (item 13); if it is behind, it is bumped with its lexer corpus first (standing permission).
- **Deliverable**:
  - `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift` reads the optional range, and the `openSource` hook carries it.
  - `tools/ide/SharpeeIDE/MainWindow.swift` passes the range to the editor.
  - `tools/ide/SharpeeIDE/Editor/EditorViewController.swift`: a method that selects a span and marks its line with the navigation accent, not the error dot (item 7, ADR-324 D1). A span that no longer fits the buffer falls back to the line. A request with no range takes today's path unchanged (AC-6).
  - Tests in `tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift`, after the pattern in item 14, with no click-through:
    - The real WKWebView, the real bundle and a real `sharpee test --json` run on scullery. The whetstone card is activated by script in the page, and the hook receives `test-stories/scullery/scullery.story` with the range. Applying that range in a real `EditorViewController` selects text that reads "whetstone" on line 19 (AC-3).
    - A request with only a line selects that line and nothing wider (AC-6).
- **Files**: `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift`, `tools/ide/SharpeeIDE/MainWindow.swift`, `tools/ide/SharpeeIDE/Editor/EditorViewController.swift`, `tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift`
- **Exit state**: In SharpeeIDE, activating scullery's whetstone card selects "whetstone" on line 19, and a line-only request behaves as before.
- **Demonstration**: The pinned xcodebuild invocation (project memory ide-xcodebuild-practice), limited to `-only-testing:SharpeeIDETests/TestingSurfaceRealPathTests`, reports "with 0 failures". Among the passes is the lens test that asserts the selected text reads "whetstone".
- **Demonstrated**: 2026-11-24, session 806326. Chord pin checked first: `ChordVersionCheck.supportedLanguageVersion` and `CHORD_LANGUAGE_VERSION` both 4.1.0, no bump. The pinned xcodebuild invocation from `tools/ide/` with `-only-testing:SharpeeIDETests/TestingSurfaceRealPathTests` printed "Executed 29 tests, with 0 failures (0 unexpected)" and "** TEST SUCCEEDED **". Among the passes: `testRealSculleryRunsWhetstoneCardSelectsThePhraseInTheEditor` (0.515 s, not skipped): the real devkit CLI on a scratch copy of `test-stories/scullery`, the committed bundle, the whetstone card activated in the page, and the hook received the story, line 19, `SourcePhrase(column: 3, length: 9)`; a real `EditorViewController` applying it selected text reading "whetstone" (AC-3); the "Write the description" offer opened line 35 with no range (D10). And `testALineOnlyRequestSelectsTheLineAndNothingWider` (AC-6): a line-only or malformed body reads as no range, a line-only open selects `  whetstone lies on the drainboard.` and nothing wider, a stale range falls back to the line, and `phraseRange` counts a wrapped phrase's break. The two existing `openSource` closures in that file took the hook's new third parameter (`{ url, line, _ in … }`); their assertions are unchanged. The navigation mark (`navigationLines`, not `errorLines`) is set in code (`EditorViewController.openDocument(at:selectingPhraseAt:column:length:)`); the ruler is private, so no test reads it. [reported by session, unverified: the session event log holds no xcodebuild row; the hooks did not record the run]
- **Status**: DONE

### Phase 4: PaneHost selects the phrase
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: The Avalonia head's source request and editor selection (ADR-408 D9, AC-3, AC-6). Runs under D-1(a) or (c).
- **Entry state**: Phase 2's exit holds. The Chord pin has been checked again (item 13).
- **Deliverable**:
  - `tools/ide/PaneHost/Shell/TestingSurfacePosts.cs`: `OpenSourceRequest` gains the optional range, and `ReadOpenSource` reads it. A malformed range is read as line-only.
  - A pure function in the same file, from a document's text and a request to an offset and a length.
  - `tools/ide/PaneHost/Shell/ShellWindow.axaml.cs`: after opening the file, a request with a range selects it with `Editor.Select`. A request with no range reveals the line as today.
  - Tests in `tools/ide/PaneHost.Tests/TestingSurfacePostsTests.cs`:
    - The page's exact post, as Phase 2's real-path case builds it, reads to the range.
    - On the real `test-stories/scullery/scullery.story` text, the pure function selects "whetstone".
    - A line-only post and a malformed range each read as they do today (AC-6).
    - The `Editor.Select` call is not under test, because PaneHost.Tests has no headless Avalonia (item 10). This is stated in the test file's header.
- **Files**: `tools/ide/PaneHost/Shell/TestingSurfacePosts.cs`, `tools/ide/PaneHost/Shell/ShellWindow.axaml.cs`, `tools/ide/PaneHost.Tests/TestingSurfacePostsTests.cs`
- **Exit state**: PaneHost reads the range request and selects the phrase. Its tests pin the reading and the selection on scullery's real source.
- **Demonstration**: `dotnet test tools/ide/PaneHost.Tests` reports no failures, and among the passes is the case whose selection on `test-stories/scullery/scullery.story` reads "whetstone".
- **Demonstrated**: 2026-11-24, session 31d9a6. Chord pin checked first: `ChordVersionCheck.supportedLanguageVersion` and `CHORD_LANGUAGE_VERSION` both 4.1.0, no bump. Baseline before the first edit: `dotnet test tools/ide/PaneHost.Tests` with the README's real-path variables set (`SHARPEE_IDE_TOOLCHAIN=~/Library/Caches/net.sharpee.panehost/stage/toolchain`, `SHARPEE_IDE_CAPABILITY_FIXTURE=~/Documents/Sharpee Capability Fixture` (the folder), `SHARPEE_IDE_CAPABILITY_STORY=~/Documents/Sharpee Capability Fixture/capability-fixture.story` (the file)) printed "Passed! - Failed: 0, Passed: 145"; without them 8 capability tests fail on the unset variable by design. After the change, the same command printed "Passed! - Failed: 0, Passed: 158, Skipped: 0, Total: 158". The 13 new cases in `tools/ide/PaneHost.Tests/TestingSurfacePostsTests.cs`: `TheWhetstoneCardsPostReadsToItsRange` (the page's exact post `{"openSource":{"file":null,"line":19,"column":3,"length":9}}` reads to `SourcePhrase(3, 9)`), `OnScullerysRealSourceTheRangeSelectsWhetstone` (`PhraseSelection` on the real `test-stories/scullery/scullery.story` text selects "whetstone"), `ALineOnlyOrMalformedRangeReadsAsTheLineAlone` (7 bodies, AC-6), `ARangeThatNoLongerFitsPlacesNothing` (3 cases), `AWrappedPhraseCountsItsLineBreak`. Lines are counted at `\n` as SharpeeIDE's `phraseRange` counts them. The `Editor.Select` call in `ShellWindow.RevealAsync` is not under test (no headless Avalonia, item 10), as the test file's header states. [verified: the hooks logged no dotnet pass row (both dotnet rows, 06:44Z, read "status unverified" and precede the edits); work-summary-writer re-ran 2026-11-24 00:53 CST, after the last source edit at 00:47 — `dotnet test tools/ide/PaneHost.Tests --no-build` with `SHARPEE_IDE_TOOLCHAIN` set, `SHARPEE_IDE_CAPABILITY_FIXTURE` set to the fixture folder and `SHARPEE_IDE_CAPABILITY_STORY` to its `.story` file (the README's names), printed "Passed! - Failed: 0, Passed: 158, Skipped: 0, Total: 158"]
- **Status**: DONE

### Phase 5: The gates pass, the records point at what landed, and #835 and #837 close
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: The closing gates, the decision records and the issues.
- **Entry state**: Every phase D-1 kept is DONE. The Chord pin has been checked again.
- **Deliverable**:
  - The gates, each run once:
    - `pnpm --filter '@sharpee/devkit' test`
    - `pnpm --filter '@sharpee/branch-tester' test`
    - `pnpm --filter '@sharpee/ide-protocol' test:ci`
    - `npx vitest run` in `tools/ide/web/testing-surface`
    - the full SharpeeIDE scheme (pinned xcodebuild), if Phase 3 ran
    - `dotnet test tools/ide/PaneHost.Tests`, if Phase 4 ran
  - The records:
    - Under D-1(a): ADR-408's `**Planning**` becomes IMPLEMENTED, with the evidence inline. Under (b) or (c): ADR-408 stays OPEN, with a dated note naming the head left.
    - A dated note under ADR-294 D23 saying the first lens earned a package (branch-tester), and naming the walk it borrows.
    - A dated note on ADR-277 D2 naming the Testing tab's lens section and its range click-through.
    - The index rebuilt.
  - The issues:
    - GH #837 closed with its WorldIndexTests evidence inline (item 11).
    - GH #835 closed with evidence inline under D-1(a), or left open naming the remaining head.
  - The plan archived by hand, with `git mv` to `docs/work/archive/lens-findings-select-phrase/` and `docs/context/.current-plan` removed (GH #669).
- **Files**: `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md`, `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md`, `docs/architecture/adrs/adr-277-ide-integrated-testing.md`, `docs/architecture/adrs/INDEX.md`, `docs/work/lens-findings-select-phrase/`
- **Exit state**: Every gate is green or at its recorded baseline. The ADR notes and the issue comments name the commits that landed.
- **Demonstration**: Each gate above reports no failures (the scheme prints "with 0 failures"). `gh issue view 837 --json state` prints CLOSED, and under D-1(a) `gh issue view 835 --json state` prints CLOSED.
- **Demonstrated**: 2026-11-24, session 31d9a6. Chord pin checked again: 4.1.0 on both sides. Gates, each run once after the last source edit:
  - `pnpm --filter '@sharpee/devkit' test`: "Tests 261 passed | 1 skipped (262)"
  - `pnpm --filter '@sharpee/branch-tester' test`: "Tests 532 passed (532)"
  - `pnpm --filter '@sharpee/ide-protocol' test:ci`: "Tests 69 passed (69)"
  - `npx vitest run` in `tools/ide/web/testing-surface`: "Test Files 28 passed (28)", "Tests 280 passed (280)"
  - `dotnet test tools/ide/PaneHost.Tests` (real-path variables set): "Passed! - Failed: 0, Passed: 158"
  - the full SharpeeIDE scheme (pinned xcodebuild from `tools/ide/`): "Executed 629 tests, with 0 failures (0 unexpected)", "** TEST SUCCEEDED **". `WorldIndexTests.testLanguageWithNoNounExtractorRendersItsOwnState` and both Phase 3 cases passed.

  Records:
  - ADR-408 `**Planning**` set to IMPLEMENTED, with an evidence paragraph naming e2153da68, 9f455499a and 5ba1f111d.
  - Dated notes under ADR-294 D23 and ADR-277 D2.
  - Index rebuilt with `adr-index.sh`; ADR-408's row reads IMPLEMENTED.

  Issues: #837 and #835 were commented on with the evidence inline and closed. `gh issue view 837 --json state` printed `{"state":"CLOSED"}`, and `gh issue view 835 --json state` printed `{"state":"CLOSED"}`. [verified: event-log test row 2026-11-24T06:48:40Z "Tests passed", "28 passed 280 passed" (vitest), after the last source edit at 06:47:35Z; work-summary-writer re-ran devkit ("Tests 261 passed | 1 skipped (262)"), branch-tester ("Tests 532 passed (532)"), ide-protocol ("Tests 69 passed (69)") and `dotnet test tools/ide/PaneHost.Tests --no-build` ("Passed! - Failed: 0, Passed: 158") at 2026-11-24 00:53 CST and read the xcodebuild log written 00:49 CST ("Executed 629 tests, with 0 failures (0 unexpected)"), no source edit after 00:47; work-summary-writer ran `gh issue view` at 2026-11-24 00:58 CST: 837 `{"closedAt":"2026-11-24T06:57:05Z","state":"CLOSED"}`, 835 `{"closedAt":"2026-11-24T06:57:08Z","state":"CLOSED"}`]
- **Status**: DONE

# Session Summary: 2026-11-24 - description-noun-lens (CST)

## Goals
- Execute Phase 2 of thing-answers-both-numbers: Chord 4.2.0 declares `singular` or `plural`, works out the plain forms at compile time (ADR-409 D1 to D3), and every in-repo story migrates.
- Move Chord Writer (both heads) to 4.2.0 (ADR-409 D7.1).

## Phase Context
- **Plan**: `docs/work/thing-answers-both-numbers/plan-20261124-thing-answers-both-numbers.md` (resolves #836: a thing answers to both its singular and its plural).
- **Phase executed**: Phase 2 — "Chord 4.2.0 declares singular or plural, works out the plain forms, and the in-repo stories migrate" (Large); flipped DONE this session; Phase 3 now CURRENT (since 2026-11-24).
- **Tool calls used**: 341 / 400 (state file at this write).
- **Phase outcome**: Completed on budget.
- **Demonstrated line**: marked `[reported by session, unverified]` in the plan — the event log holds no row for its `adr-409-singular-plural-forms.test.ts` run ("Tests 30 passed (30)", rerun 2026-11-24 21:30 CST); the log's last test row is 2026-11-25T01:49:39Z (testing-surface), and nothing after 03:28Z is a test row. The compose, `--check`, PaneHost.Tests and XCTest demonstrations are not of a class the hooks log.
- **Out-of-scope changes**: the flip printed about 200 `out of scope: <path>` lines; the main session handed them over as a summary, not verbatim. They are the files the hand migration reached beyond Phase 2's Files list: story-loader (131 test files plus `src/build/trait-routes.ts`), branch-tester fixtures and tests, world-index tests (including `tests/synthetic-corpus.ts`), devkit tests, template and fixtures, character, platform-browser and bootstrap tests, lang-en-us `src/index.ts` and `src/language-provider.ts`, `packages/sharpee/docs/genai-api/{index,lang}.md` (regenerated), 14 `stories/*` stories, `stories/dungeo/src/version.ts` (BUILD_DATE stamp only), tools fixtures (`tools/explorer-probe`, `tools/ide/test-fixtures`) and testing-surface tests, `scripts/__tests__/cli-chord-seed.test.ts`, `docs/architecture/adrs/adr-409-singular-and-plural-forms.md`, and `website/src/app/chord/guide/world/creating-things/content.mdx`.

## Completed

### The rules as data (lang-en-us, repokit)
- `FormRules`/`FormRewrite`/`englishFormRules` in `packages/lang-en-us/src/data/words.ts`, read through `EnglishLanguageProvider.getFormRules()`, with one-home entries for the unsafe endings (`tests/one-home.test.ts`).
- `./repokit manifest` carries `formRules` into `StdlibLocaleFacts` (`tools/repokit/src/commands/manifest.ts` → `packages/chord/src/stdlib-manifest.ts`).

### Chord 4.2.0
- `singular` in `catalog.ts`; `plural of`/`singular of` in the parser (`parse.singular-plural-of`); `src/forms.ts` holds the rules as data.
- New entity builder `src/analyzer/entity/singular-plural.ts`: the AC-1 refusals (`analysis.singular-plural-*`) and `IREntity.forms: { singular, plural, origin, aka }` (`ir.ts`).
- `CHORD_LANGUAGE_VERSION` 4.2.0 (`version.ts`), with the `chord.ebnf` production and its re-pinned hash.
- Fixes the migration surfaced: `expanse` joins room and region as a place; `validate-ir`'s `entityReferences` skips an entity's own `forms`, which had silenced `analysis.flag-entity`.
- story-loader gains a `singular` route (`trait-routes.ts`) so a migrated story still loads; the runtime does not read the forms yet.

### The hand migration (David: "No Regex - you have to do the migration the hard way")
- Every edit hand-written as an exact, single-match string, applied by an all-or-nothing checker; sites found by read-only listers (compiler diagnostics for `.story`, kind-line scans for test sources).
- chord fixtures and inline sources, the lexer golden (new `tests/fixtures/lexer-golden/chord-4-2-0-surface.story` for AC-9), 8 IR/AST snapshots re-recorded (diffs only `forms`, `singular`, `of` settings, `languageVersion`).
- story-loader (499 sites), branch-tester, world-index (synthetic generator writes `singular of <plural>`), devkit, character, bootstrap, platform-browser, testing-surface, scripts.
- Every `.story`/`.chord` under `stories/`, `test-stories/`, `branch-stories/` and the package and tool fixtures except Secret Letter: 185 + 125 + 395 + 1,714 (UPPS) + 63 rows.
- The New Story template, re-vendored into SharpeeIDE; a dated "Language migrations" line in each test set.
- Not touched: `website/public` (published copies, the pinned 4.1.0 manual) and the `chord-v4.1.0` tutorial editions.

### Chord Writer at 4.2.0
- SharpeeIDE: `ChordVersionCheck.swift` pins 4.2.0, `WorldSourceEdit.swift`'s scenery generator emits `a thing, singular, scenery`, Swift fixtures migrated.
- Both heads color `singular` and `plural` (`SyntaxHighlighter.swift`, `ChordColorizer.cs`), with a test in each; `of` is not colored (844).

### ADR-409 amendments
- Amendment 2 (D8): `IdentityTrait` gets `.singular` and `.plural`, filled regardless, with a computed `.isPlural = (.name == .plural)`; no `grammaticalNumber`. The trait change lands in Phase 4.
- Amendment 3 (D9): a person need not be declared.

## Key Decisions

### 1. Vocabulary is singular-plural, never "number"
David: "stop using \"number\" - this is plural and singular" — every code and identifier renamed singular-plural.

### 2. Forms live on IdentityTrait as properties (ADR-409 Amendment 2, D8)
David: "IdentityTrait should have .plural and .singular properties, not gramaticalNumber" and ".name is its name and .plural and .singular are filled regardless...if we need a signal we can have a calculated property .isPlural = (.name == .plural)".

### 3. A person need not be declared (ADR-409 Amendment 3, D9)
David: "I guess an object with a room or a person don't need to follow the plural rule".

### 4. The migration is done by hand
David: "No Regex - you have to do the migration the hard way"; no scripted transform touched source.

### 5. Secret Letter left out of Phase 2
David: "a" — migrated when it comes off hold (847); until then it does not compile under 4.2.0.

### 6. The manual is updated through naive testing
David: "I'm aware we'll need to update the manual (naive testing)" — the pinned 4.1.0 manual was not touched.

## Next Phase
- **Phase 3**: "The refusal carries a fix, and Chord Writer applies it" — `Diagnostic.fix?: { label, edits }` in chord with a placeholder form, devkit's compose fills it from lang-en-us through the story's language, the fix rides the compose payload in `@sharpee/ide-protocol`, and each head offers the fix and a fix-all (ADR-409 D7.2, AC-10).
- **Tier**: Large (~350 tool-call budget).
- **Entry state**: Phase 2 DONE (it is), Phase 3 CURRENT, started in a new session with David's go recorded.

## Open Items

### Short Term
- 843: Ruling: names that look plural but were never marked plural stayed singular in the 4.2.0 migration
- 844: Chord Writer colors singular and plural but not of, which diverges from ADR-409 D7.1's wording
- 845: SharpeeIDE scenery generator emits a bare singular, so a phrase with an unsafe ending is refused
- 581: IDE: TestRunnerTests.testCancelTerminatesAndKeepsDeliveredLines timed out at 30s in a full-suite run under load (recurrence after the 30s bump) — recurred this session; commented

### Long Term
- 846: PaneHost.Tests capability fixture outside the repo is still Chord 4.1.0 and needs singular/plural declarations at the next toolchain re-stage
- 847: Secret Letter does not compile under Chord 4.2.0: migrate its singular/plural declarations when it comes off hold
- 836: A thing answers only to the grammatical number its name and aka words are written in (candles but not candle) — the plan's driving issue, open until Phase 5

## Files Modified

561 tracked files changed (9,204 insertions, 3,839 deletions) plus 4 new, per `git diff --stat`; the state file's hook-tracked `files` array lists 568 (the plan and this summary among them).

**Language and compiler** (~20 source files):
- `packages/lang-en-us/src/data/words.ts`, `src/index.ts`, `src/language-provider.ts` - form rules as locale data
- `packages/chord/src/{analyzer.ts,analyzer/entity/{assemble,context,index}.ts,catalog.ts,index.ts,ir.ts,parser.ts,stdlib-manifest.ts,validate-ir.ts,version.ts}` - 4.2.0 surface, gate, IR forms
- `packages/chord/src/forms.ts`, `src/analyzer/entity/singular-plural.ts` (new) - rules and the entity builder
- `tools/repokit/src/commands/manifest.ts`, `packages/story-loader/src/build/trait-routes.ts`

**Tests** (new and migrated):
- `packages/chord/tests/adr-409-singular-plural-forms.test.ts` (new), `tests/fixtures/lexer-golden/chord-4-2-0-surface.story` (new), ~140 other chord test files and snapshots
- `packages/lang-en-us/tests/one-home.test.ts`; story-loader, branch-tester, world-index, devkit, character, bootstrap, platform-browser, testing-surface and `scripts/__tests__` fixtures

**Chord Writer** (16 files):
- `tools/ide/SharpeeIDE/{Compose/ChordVersionCheck,Editor/SyntaxHighlighter,World/WorldSourceEdit}.swift`, the vendored template and docs-tab page; `tools/ide/PaneHost/Editor/ChordColorizer.cs`; SharpeeIDETests and PaneHost.Tests cases

**Stories** (~180 files): `test-stories/`, `branch-stories/` (UPPS 142), 14 `stories/*` stories

**Docs**: `docs/architecture/adrs/adr-409-singular-and-plural-forms.md` (Amendments 2 and 3), the plan, `packages/sharpee/docs/genai-api/{index,lang}.md`, `website/src/app/chord/guide/world/creating-things/content.mdx`

## Notes

**Session duration**: ~3 hours of work (18:28 to 21:30 CST); finalized 2026-11-25 00:21 CST.

**Approach**: rules and builder first, then the hand migration package by package, each edit exact-string and single-match, then the gates and a census.

**Gates, 2026-11-24 20:00 CST** [reported by session, unverified] — no event-log rows; quoted from the plan's Progress block: lang-en-us 533, chord 1997, story-loader 1733 (+1 skipped), world-index 260, branch-tester 532, devkit 261, character 641, bootstrap 70, platform-browser 228, ide-protocol 69, world-model 1687, engine 928, stdlib 1970, parser-en-us 553, if-domain 122, all passing; testing-surface 280 passed (event log 2026-11-25T01:49:39Z "Tests passed — 28 passed 280 passed" is consistent, but predates the later Bash-applied migration edits, so it is stale for the final tree); `./repokit {grammar,manifest,aliases,protocol,ebnf} --check` clean; Dungeo chain "949 passed"; units at `--seed 42` "1715 passed, 10 failed, 10 expected failures, 2 skipped, 2 transcript error(s)", the baseline's numbers; test-story trees ferry 10, lodge 10, orchard 21, quay 1, scullery 2 passing, as at baseline; PaneHost.Tests "Passed: 160, Failed: 0"; SharpeeIDE full scheme "Executed 629 tests, with 3 failures", all in the cancel test (581), which passes alone (7 of 7, 3.1 s).

**Phase 2 census** [reported by session, unverified] (`scratchpad/mig/census2.mjs`, never committed; Secret Letter and `website/` excluded): 191 stories compile; 46 do not, every one an UPPS seeded defect copy, by design, none on a singular-plural code; 3,141 entities, 2,103 with forms (71 written, 2,032 worked out) plus 4,925 worked-out aka forms; 150 worked-out words equal another entity's written word in the same story (Phase 1 counted 1,060 under full derivation, 673 of them Secret Letter's), and D4's ranking keeps a written match ahead of all 150.

**For David**: 843 (pygmy goats, pots and pans, crumbs, shears, apples, group of mercenaries kept their prior number); 844 (`of` not highlighted, diverges from D7.1); 845 (the scenery generator's bare `singular` until Phase 3's fix); 846 (the capability fixture outside the repo is still 4.1.0); 581 (cancel test under full-suite load).

**ADR-409 test count, reconciled**: the plan's Progress line now reads 28 cases at the red run (25 of them failing with the builder unregistered) and 30 after Amendment 3's two person cases, rerun at 21:30 CST "Tests 30 passed (30)" [reported by session, unverified]; it agrees with the Demonstrated line.

---

## Session Metadata

- **Session**: ce3248
- **Status**: COMPLETE (unverified: the ADR-409 test file's 30-case run, the 20:00 CST gate counts, the Phase 2 census, Mutation Audit YES — none has an event-log row fresh against the final tree)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261124-1828-description-noun-lens.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 DONE, ADR-409 ACCEPTED, the Phase 1 census baseline, David's go for Phase 2.
- **Prerequisites discovered**: the required declaration reached far past the phase's Files list (story-loader, branch-tester, world-index, devkit and others), so the migration had to cover every package's inline fixtures; David's capability fixture outside the repo (846).

## Architectural Decisions

- ADR-409 Amendment 2 (D8): `IdentityTrait.singular`/`.plural` filled regardless, `.isPlural` computed; no `grammaticalNumber` — the IR carries `forms`, the trait change is Phase 4's.
- ADR-409 Amendment 3 (D9): a person need not be declared.
- Pattern applied: forms worked out once at compile time from locale data (`StdlibLocaleFacts.formRules`), never at runtime and never with English in chord.

## Mutation Audit

- Files with state-changing logic modified: `packages/chord/src/analyzer/entity/singular-plural.ts` (writes `IREntity.forms`), `packages/chord/src/validate-ir.ts`, `packages/story-loader/src/build/trait-routes.ts`.
- Tests verify actual state mutations (not just events): YES [reported by session, unverified] — `adr-409-singular-plural-forms.test.ts` asserts the IR's `forms` and each refusal's diagnostic; at the red run, with the builder unregistered, 25 of its then 28 cases failed.
- If NO: N/A.

## Test Coverage Delta

- Tests added: the ADR-409 test file (30 cases: 28 at the red run plus Amendment 3's two person cases), a colorizer test in each head, the 4.2.0 lexer corpus file.
- Tests passing before: chord "555 failed | 1389 passed" after Amendment 3 and before the migration (event log 2026-11-25T00:46:42Z "Tests failed — 84 failed 43 passed 555 failed 1389 passed") → after: chord 1997 passing [reported by session, unverified].
- Known untested areas: the runtime does not read the forms yet (Phase 4); Secret Letter does not compile (847).

---

**Progressive update**: checkpoint 2026-11-24 21:25 — first write: Phase 2 DONE (rules, 4.2.0 gate, hand migration, both heads at 4.2.0), Phase 3 CURRENT, items 843–847 filed, 581 commented.
**Progressive update**: session completed 2026-11-25 00:21 — promoted to COMPLETE (unverified); the plan's 28-vs-30 test-count line is reconciled; Phase 3 starts in a new session.

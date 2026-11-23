# Session Summary: 2026-11-22 - description-noun-lens (CST)

## Goals
- Phase 3 of the description-noun-lens plan (GH #835, ADR-407): world-index takes its noun extractor from its caller, and `sharpee world-index` refuses a language with none. David's go: "phase 3".
- Census the world-index pins the new extractor moves, and re-record them only after David's review.

## Phase Context
- **Plan**: The examinable lens reports the description nouns a player cannot use, read through the story's language (`docs/work/description-noun-lens/plan-20261122-description-noun-lens.md`)
- **Phase executed**: Phase 3 — "World-index takes its extractor from its caller, and sharpee world-index refuses a language with none" (Large)
- **Tool calls used**: 206 / 400
- **Phase outcome**: Completed under budget; flipped DONE and Phase 4 advanced to CURRENT by the session. Its Demonstrated line is marked `[verified: …]` by this write.
- **Out-of-scope changes**:
  - out of scope: docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md
  - out of scope: packages/devkit/package.json
  - out of scope: packages/devkit/templates/story-chord/story.story.template
  - out of scope: packages/devkit/tests/story-template.test.ts
  - out of scope: packages/if-domain/src/index.ts
  - out of scope: packages/if-domain/src/nouns.ts
  - out of scope: packages/if-domain/tests/noun-extractor.test.ts
  - out of scope: packages/lang-en-us/src/nouns/heuristic.ts
  - out of scope: packages/lang-en-us/src/nouns/index.ts
  - out of scope: packages/lang-en-us/tests/nouns.test.ts
  - out of scope: packages/sharpee/docs/genai-api/if-domain.md
  - out of scope: packages/sharpee/docs/genai-api/index.md
  - out of scope: packages/world-index/tsconfig.json
  - out of scope: tools/explorer-probe/lens-examinable.js
  - out of scope: tools/ide/SharpeeIDE/Resources/story-templates/story.story.template

## Completed

### The extractor carries its filters (David ruled "a"; ADR-407 Amendment 3)
- `NounExtractor` gains `filters: NounFilters { headStopwords, minHeadLength, maxPhraseWords }` in `packages/if-domain/src/nouns.ts`; `resolveNounExtractor` refuses a module whose filters are missing or misshapen.
- lang-en-us exports `ENGLISH_NOUN_FILTERS` from `src/nouns/heuristic.ts` and sets `nounExtractor.filters`, so world-index's `classify` and `publishFilters` read the language's lists without importing a language package.
- Amendment 3 also records that world-index's D6 refusal is a failure document with the new `FailureCause` `'no-noun-extractor'` (message = the refusal line, exit 1), keeping stdout one JSON document (ADR-321 AC-9).

### world-index reads prose through the extractor it is given
- `extractNounPhrases`, `tokenizeProse` and the article, boundary and stopword lists removed from `packages/world-index/src/incomplete.ts`.
- New signatures: `deriveIncomplete(ir, extractor, reach?)`, `publishFilters(extractor, prose)`, `deriveUnnamedTools(ir, roles, prose, extractor)`, `buildDocument(ir, version, extractor)`, `analyzeStoryIR(path, version, lookup)` (reads the IR's `phrases.defaultLocale`).
- `src/cli.ts` loads the lookup via `createRequire` anchored on `argv[1]`; its header records that it is a repo-only entry resting on the test-only devDependency (GH #622).
- `@sharpee/if-domain` added as a dependency, `@sharpee/lang-en-us` as a devDependency, tsconfig reference added.
- Tests: new `tests/language-boundary.test.ts` (no `lang-*` import and no extractor, tokenizer or stopword list under `src/`); AC-4 superset test and extractor-input tests in `incomplete.test.ts`; AC-2 refusal case in `cli.test.ts` (real `dist/cli.js`, temporary Fernhill IR at locale `xx-YY`).

### devkit passes the lookup
- `packages/devkit/src/commands/world-index.ts` exports `nounExtractorLookup` (require-based) and passes it; if-domain added to deps; AC-2 refusal test and lookup test in `world-index.test.ts`; `tests/story-template.test.ts` call site fixed.

### The lens keeps its pins through a bridge
- `tools/explorer-probe/lens-examinable.js` is marked BRIDGE: it reads `extractHeuristicPhrases` from `packages/lang-en-us/dist/nouns/heuristic.js` until Phase 4, so lens pins do not move in this phase.

### Census and re-record (David ruled "b")
- `docs/work/description-noun-lens/census-world-index.md` written; every move accepted, with three assertion rewrites: The Alderman's suspects are now reached, so the proof is the 4 unreached entities; the edge text check is case-insensitive; the crowbar edge assertion dropped while the unnamed-tools assertion stays.
- The New Story landing sentence changed to "A quiet place to begin. You might go anywhere from here — for now, this landing is the whole world." in `packages/devkit/templates/story-chord/story.story.template`, IDE mirror refreshed with `tools/ide/vendor-story-templates.sh`.
- Two role-split lines found after the review and re-recorded, listed in the census: The Alderman 7/0/18 → 54/0/25 and Ides of March 43/0/26 → 129/0/42. David has not explicitly seen these two.

### Issues
- GH #837 filed by the session: Chord Writer's `WorldFailureCause` does not decode `no-noun-extractor`.
- 838 filed by this write: the website's getting-started pages quote a landing sentence the template no longer has.

## Key Decisions

### 1. Filters are data on the extractor (ADR-407 Amendment 3)
world-index may not import a language package, but its D11 wire (`headStopwords`, `minHeadLength`, `maxPhraseWords`) has readers in the IDE (`WorldProseChunker.swift`, `WorldIndexDocument.swift`, `WorldIndexTests.swift`), so the language supplies the values through the contract rather than the wire changing.

### 2. The static reader's refusal is a failure document
`sharpee world-index` writes one JSON document to stdout, so D6's refusal is a failure with cause `no-noun-extractor` and exit 1, not a bare line on stderr.

### 3. Accept every census move (David, "b")
The extractor now reaches more phrases (Fernhill 238 → 514), and the moved pins follow it; the template sentence was rewritten so the new extractor reads it as intended.

## Next Phase
- **Phase 4**: "The lens reads through the story's language, tries both number forms, and refuses a language with no extractor" — resolve the extractor from the IR's locale, refuse no-extractor then mismatch, drop the bridge, execute both number forms (report format 2), write `test-stories/scullery/` with OB-35's two moved parts, AC-6 unit test, orchard census, AC-1 run quoted on GH #835.
- **Tier**: Large (400 tool-call budget)
- **Entry state**: Phase 3 DONE, Phases 2 and 3 in the tree (they land in one commit, ADR-407 D8). Met.

## Open Items

### Short Term
- 837: Chord Writer: decode the World Index failure cause no-noun-extractor
- 838: Website getting-started pages quote a New Story landing sentence the template no longer has

### Long Term
- 836: A thing answers only to the grammatical number its name and aka words are written in (candles but not candle)
- 514: world-index: add possessive determiners as noun-phrase extraction anchors (closed or answered in Phase 5)

## Files Modified

**Platform — if-domain / lang-en-us** (8 files):
- `packages/if-domain/src/nouns.ts`, `src/index.ts`, `tests/noun-extractor.test.ts` - `NounFilters` on the contract and its shape check
- `packages/lang-en-us/src/nouns/heuristic.ts`, `src/nouns/index.ts`, `tests/nouns.test.ts` - `ENGLISH_NOUN_FILTERS`
- `packages/sharpee/docs/genai-api/if-domain.md`, `index.md` - regenerated API reference

**Platform — world-index** (17 files):
- `src/analyze.ts`, `cli.ts`, `document.ts`, `incomplete.ts`, `index.ts`, `unnamed.ts` - extractor and lookup taken from the caller
- `package.json`, `tsconfig.json` - if-domain dependency, lang-en-us devDependency
- `tests/language-boundary.test.ts` (new), `cli.test.ts`, `incomplete.test.ts`, `roles.test.ts`, `unnamed.test.ts`, `vocabulary.test.ts`, `scale-timing.ts` - new boundary/AC tests and census-reviewed pins

**Platform — devkit** (5 files):
- `src/commands/world-index.ts`, `world-index.test.ts`, `package.json`, `tests/story-template.test.ts`, `templates/story-chord/story.story.template`

**Tools / docs** (6 files):
- `tools/explorer-probe/lens-examinable.js` - Phase 4 bridge
- `tools/ide/SharpeeIDE/Resources/story-templates/story.story.template` - mirror
- `docs/architecture/adrs/adr-407-…md` - Amendment 3
- `docs/work/description-noun-lens/census-world-index.md` (new), `plan-20261122-description-noun-lens.md`
- `pnpm-lock.yaml`

## Notes

**Session duration**: ~1.6 hours (20:21 to 21:58 CST)

**Approach**: Baseline before any edit (Fernhill world-index saved 21:24 CST), implement, build, census, David's ruling, re-record, scratch AC-4 comparison.

- The website's older landing wording was out of sync before this session and was not changed; 838 tracks it.
- The bridge in `lens-examinable.js` reads a built file under `packages/lang-en-us/dist`, so it depends on `./repokit build` being current until Phase 4 removes it.
- The New Story template was edited (21:54:56 CST) after the last `./repokit build` (bundle 21:36:51 CST); the devkit suite that reads it passed after the edit.

---

## Session Metadata

- **Session**: df5bd8
- **Status**: IN-FLIGHT
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261122-2021-description-noun-lens.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2's extractor in the tree; David's go for world-index and devkit; the AC-4 baseline taken before any world-index edit.
- **Prerequisites discovered**: world-index's `classify` and `publishFilters` needed the language's filter lists (resolved by Amendment 3); Chord Writer's decoder needs the new failure cause (837).

## Architectural Decisions

- ADR-407 Amendment 3: `NounExtractor.filters` carries the head stopwords and phrase limits as data; world-index's refusal is a failure document with cause `no-noun-extractor`.
- Pattern applied: ADR-407 D8 (world-index takes its extractor from its caller) and D6 (refusal for static readers); ADR-321 D16's one tokenizer kept by reading words through `NounExtractor.tokenize`.

## Mutation Audit

- Files with state-changing logic modified: none; world-index's changes are pure derivations from IR to document, and the CLI writes one document to stdout.
- Tests verify actual state mutations (not just events): N/A — the tests assert on the produced documents (phrases, classes, failure cause, exit code).

## Test Coverage Delta

- Tests added: world-index `tests/language-boundary.test.ts`, the AC-4 superset test, extractor-input tests and the AC-2 CLI refusal; devkit's AC-2 refusal and lookup tests; if-domain filters shape checks; lang-en-us filters cases.
- Tests passing after (evidence: work-summary-writer's own runs after the last source edit at 21:54:56 CST and last test edit at 21:56:28 CST): `pnpm --filter '@sharpee/world-index' test:ci` → 240 passed, 1 skipped; `pnpm --filter '@sharpee/devkit' test:ci` → 242 passed, 1 skipped (2026-11-23T03:59:12Z); `node --test tools/explorer-probe/tests/lens-examinable.test.js` → 26 pass, 0 fail; `pnpm --filter '@sharpee/if-domain' test:ci` → 121 passed (120 at Phase 2); `pnpm --filter '@sharpee/lang-en-us' test:ci` → 517 passed (514 at Phase 2) (03:59:32Z). AC-4 rerun → 238 → 514, lost 0, gained 276, reclassified 0, filters identical, `unnamedTools` `["doormat"]` (03:59:42Z). world-index and devkit counts before the phase were not recorded. `./repokit build` green and typecheck clean [reported by session, unverified].
- Known untested areas: the mismatch refusal has no real path until a second language exists (D-4, a Phase 4 unit test); Chord Writer's handling of `no-noun-extractor` (837).

---

**Progressive update**: checkpoint 2026-11-22 21:58 — Phase 3 recorded DONE with its Demonstrated line verified by reruns; 838 filed for the website landing wording.

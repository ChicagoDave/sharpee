# Session Summary: 2026-11-22 - description-noun-lens (CST)

## Goals
- Phase 4 of the description-noun-lens plan (GH #835, ADR-407): the examinable lens reads prose through the story's language, tries both number forms of every candidate, and refuses a language with no extractor. David's go: "phase 4".

## Phase Context
- **Plan**: `docs/work/description-noun-lens/plan-20261122-description-noun-lens.md` — repair the examinable lens and have it read description nouns through the story language (ADR-407).
- **Phase executed**: Phase 4 — "The lens reads through the story's language, tries both number forms, and refuses a language with no extractor" (Large).
- **Tool calls used**: 136 / 400 (state file reports the Phase 5 budget, 100, now that Phase 5 is CURRENT).
- **Phase outcome**: Completed under budget; flipped DONE and Phase 5 advanced CURRENT (since 2026-11-22) by the session.
- **Out-of-scope changes**: the flip printed these, verbatim paths:
  - out of scope: docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md
  - out of scope: packages/if-domain/src/index.ts
  - out of scope: packages/if-domain/src/nouns.ts
  - out of scope: packages/if-domain/tests/noun-extractor.test.ts
  - out of scope: packages/lang-en-us/src/nouns/index.ts
  - out of scope: packages/lang-en-us/src/singularize.ts
  - out of scope: packages/lang-en-us/tests/singularize.test.ts
  - out of scope: packages/sharpee/docs/genai-api/if-domain.md
  - out of scope: packages/sharpee/docs/genai-api/index.md
  - out of scope: packages/world-index/tests/incomplete.test.ts

  All ten are Amendment 4's platform half and its ripples, ruled by David ("A′"); the plan's Demonstrated line lists them under "Out of the Files list".

## Completed

### Number forms come from the language, not the stemmer (ADR-407 Amendment 4)
- At entry `EnglishLanguageProvider.lemmatize` turned out to be a stemmer with no runtime caller (`candles` → `candl`, `tables` → `tabl`, `shed` → `sh`, `string` → `str`), so D5 could not use it; after a deep dive David ruled "A′".
- `packages/if-domain/src/nouns.ts`: `NounExtractor` gains `numberForms(noun): NounNumberForms` (`{ singular, plural }`); `resolveNounExtractor` refuses an extractor without it; the type is re-exported from the root (`src/index.ts`).
- `packages/lang-en-us/src/singularize.ts` (new, beside `pluralize.ts`): reads `irregularPlurals` from `data/words.ts`, a same-in-both list (including `bellows`, `tongs`) and lone-`s` singulars; imported only by the `nouns` subpath, which wires `numberForms` in `src/nouns/index.ts`. Tests in `tests/singularize.test.ts`.
- GH #839 filed for `lemmatize`.

### The lens reads through the story's language
- `tools/explorer-probe/lens-examinable.js`: Phase 3's bridge removed; the extractor comes from the IR's `phrases.defaultLocale` through devkit's `nounExtractorLookup`.
- `guardLanguage` checks no-extractor first, then an engine mismatch through if-domain's `languageMismatchRefusal`; the no-extractor refusal fires before the engine loads, the mismatch in the first hook, and the CLI prints one stderr line and exits 1.
- `classifyCandidates` types both number forms; new class `number-form` carries `resolvedForm`; report format moves to 2.
- David asked "isn't the engine a boundary here?" about trimming `iron prickets` to its head and ruled B: the lens never trims the prose's words, recorded as a note under ADR-407 AC-1.

### Scullery test story, census and re-recorded pins
- `test-stories/scullery/scullery.story` and `scullery.test-set.md` (OB-54 to OB-60): the article-less "Jars and crocks" (`jar`/`crock` fail while the plurals resolve), `whetstones` and `cheeses`, the undescribed whetstone (resolved-default), the carried chore list; README row added.
- Census `docs/work/description-noun-lens/census-lens.md`; David ruled "a" (accept all): the fixture re-recorded 4 → 12 forms, orchard 31 → 92 forms (all 26 earlier findings kept, 12 new not-in-scope, 6 number-form, 2 described); scullery pins, the AC-6 test, guard tests and the AC-2 CLI test added.

### AC-1 on The Relighting (shown, not gating)
- Quoted on GH #835 (comment 2026-11-23T04:51:38Z): `candle` failing while `candles` resolves, from the Refectory, `Validation failed: ENTITY_NOT_FOUND`; `pricket` answered on the extractor's phrase `iron prickets` per the AC-1 note. [reported by session, unverified — the run was not repeated by this writer]

## Key Decisions

### 1. Singularization lives in lang-en-us beside pluralize, exposed through the noun extractor (David, "A′")
ADR-407 Amendment 4: `NounExtractor.numberForms` in `@sharpee/if-domain/nouns`; the story runtime is unchanged; when #836 lands the runtime imports the same `singularize.ts`.

### 2. The lens never trims prose words (David, "B")
The engine is the boundary: a phrase the extractor yields is typed as written, so `pricket` is answered by `iron prickets`, not by its head alone; recorded under ADR-407 AC-1.

### 3. Census accepted wholesale (David, "a")
Every changed line in the fixture and orchard pins was accepted before re-recording (AC-5).

## Next Phase
- **Phase 5**: "The story runtime has not grown, the gates pass, and the records point at what landed" — AC-3 rebuild and byte compare of The Relighting's `game.js`; `pnpm exec turbo run test:ci`, the explorer-probe suites and `pnpm test:scripts` once each; dated notes on ADR-294 D23 and ADR-407 (Planning → IMPLEMENTED, index rebuilt), each listed to David first; GH #835 results; #805/#583 close if their suites pass; #514 closes with a measurement or the reason.
- **Tier**: Small (100 tool-call budget).
- **Entry state**: Phase 4 DONE — holds.

## Open Items

### Short Term
- 835: IDE testing: report nouns in room and object descriptions that the player cannot use (the examinable lens is broken and only tries examine)
- 805: explorer-probe tests fail 9 of 43: the walk executes no phrase and the dimension count is 91, not 41
- 583: explorer-probe lens tests: 8 of 43 fail on stale corpus pins
- 514: world-index: add possessive determiners as noun-phrase extraction anchors

### Long Term
- 839: lang-en-us: lemmatize is a stemmer with no caller (candles → candl, shed → sh)
- 836: A thing answers only to the grammatical number its name and aka words are written in (candles but not candle)
- 837: Chord Writer: decode the World Index failure cause no-noun-extractor
- 838: Website getting-started pages quote a New Story landing sentence the template no longer has

## Files Modified

**Platform — Amendment 4** (7 files):
- `packages/if-domain/src/nouns.ts` - `NounNumberForms`, `numberForms` on the contract, refusal of an extractor without it
- `packages/if-domain/src/index.ts` - root type re-export
- `packages/if-domain/tests/noun-extractor.test.ts` - numberForms refusal cases
- `packages/lang-en-us/src/singularize.ts` - new English singularizer
- `packages/lang-en-us/src/nouns/index.ts` - wires `numberForms`
- `packages/lang-en-us/tests/singularize.test.ts` - new
- `packages/world-index/tests/incomplete.test.ts` - fake extractor gains `numberForms`

**Lens** (2 files):
- `tools/explorer-probe/lens-examinable.js` - language-resolved extractor, guard, number forms, format 2
- `tools/explorer-probe/tests/lens-examinable.test.js` - scullery, AC-6, guard, AC-2 CLI, re-recorded fixture and orchard pins

**Test story** (3 files):
- `test-stories/scullery/scullery.story`, `test-stories/scullery/scullery.test-set.md` - new
- `test-stories/README.md` - scullery row

**Docs** (5 files):
- `docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md` - Amendment 4, AC-1 note
- `docs/work/description-noun-lens/census-lens.md` - new census
- `docs/work/description-noun-lens/plan-20261122-description-noun-lens.md` - Phase 4 Demonstrated, flip, advance
- `packages/sharpee/docs/genai-api/if-domain.md`, `index.md` - regenerated

## Notes

**Session duration**: ~30 minutes of wall clock since 22:24 CST start (136 tool calls).

**Approach**: Stopped at entry on the stemmer finding and took David's ruling before touching `packages/`; census before any pin moved.

The previous session's file `session-20261122-2021-description-noun-lens.md` shows modified from that session's own terminal write and is left as is. This file is named `2225` while the state file's `summaryPrefix` is `20261122-2224`; it is the stub the session created and is revised in place rather than duplicated.

---

## Session Metadata

- **Session**: 21bbd6
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261122-2225-description-noun-lens.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 3 committed (`bad17c948`); devkit's `nounExtractorLookup` and if-domain's `languageMismatchRefusal` available.
- **Prerequisites discovered**: a real singularizer — `lemmatize` could not serve D5 (resolved by Amendment 4).

## Architectural Decisions

- ADR-407 Amendment 4: `NounExtractor.numberForms` in if-domain, English singularizer in lang-en-us beside `pluralize.ts`, story runtime unchanged.
- ADR-407 AC-1 note: the lens types prose phrases as written and never trims words; the engine decides.
- Pattern applied: language behaviour behind the if-domain contract, reached through the subpath lookup (ADR-407 D2), not imported by tools or world-index.

## Mutation Audit

- Files with state-changing logic modified: none — `singularize`, `numberForms` and `classifyCandidates` are pure; the lens drives the real engine read-only.
- Tests verify actual state mutations (not just events): N/A

## Test Coverage Delta

- Tests added: lens suite 26 → 39 (+13); if-domain 121 → 122; lang-en-us 517 → 531 (session reported 530); explorer-probe all 44 → 57.
- Tests passing after (evidence, this writer's runs after the last edits at 22:50:59 CST): `node --test tools/explorer-probe/tests/lens-examinable.test.js` → 39 pass, 0 fail at 2026-11-23T04:52:59Z; `node --test tools/explorer-probe/tests/*.test.js` → 57 tests, 56 pass, 1 fail (secret-letter corpus pin, "41 dimensions and no findings", GH #805, baseline) at 04:53:16Z; `pnpm --filter '@sharpee/if-domain' test:ci` → 122 passed; `pnpm --filter '@sharpee/lang-en-us' test:ci` → 36 files, 531 passed; `pnpm --filter '@sharpee/world-index' test:ci` → 240 passed, 1 skipped, at 04:53:09Z; three typechecks clean at 04:53:26Z; `game.js` 1,971,319 bytes and `dist/cli/sharpee.js` 5,401,919 bytes by `ls -l`. Hooks logged no test row. `./repokit build` green is [reported by session, unverified].
- Known untested areas: the engine-mismatch refusal is unit-tested on the guard only (D-4), not through a CLI run.

---

**Progressive update**: checkpoint 2026-11-22 22:52 — Phase 4 recorded (Amendment 4, lens on the story language, scullery, census, AC-1 on #835); test claims rerun and the plan's Demonstrated line marked verified.

# ADR-407: A lens reads prose through the story's language

**Planning**: OPEN

**Summary**: Lenses run in the CLI with no native OS library. Each language supplies the extractor that finds nouns in prose, from a subpath kept out of the story runtime. English uses `compromise` together with ADR-321's heuristic, which moves into `lang-en-us`. `world-index` receives its extractor from its caller, and a lens refuses a language that has none. Nothing is built yet.

**Status**: **ACCEPTED** (David, 2026-11-22, session 1efc0f: "yes", to "Mark ADR-407 ACCEPTED?", after the open-questions interview and a clean second `adr-review`, 17 of 17). The ADR-321 amendment note D8 requires was added in the same edit. Acceptance does not authorize implementation; issue 835's plan is a separate step. Written 2026-11-22, session 1efc0f, at David's direction: "yes, write the ADR". D1, D2 and D8 are David's rulings in that session (D8 from the open-questions interview, answer "b"). The `adr-review` fixes (callers, the D3 contract and lookup, the language source for static readers, the acceptance criteria) were folded in at his direction: "yes, fold them in". The rest is proposed. No `packages/` change may start from this record until he accepts it.

**Amended**: Amendment 1 (2026-11-22, session 1efc0f, at David's direction "amend", after `plan-review` of the issue-835 plan found the code needed more than the text said). The changes:
- D3's `NounExtractor` gains `tokenize`, and `tokenizeProse` moves with the heuristic, so ADR-321 D13's unnamed-tool check reads words through the same extractor.
- D8: `analyzeStoryIR` takes a lookup from language code to extractor rather than an extractor, because it reads the IR itself. The D6b count pins stay in `world-index`, because they test `deriveIncomplete`; only the extractor-level cases move.
- AC-2's mismatch case is unit-tested on the guard until a second language exists.
- AC-5's pin is recorded on `test-stories/orchard`, per ADR-395 D7 and David's ruling of 2026-11-11.

## Date: 2026-11-22

**Kind**: technical

**Scope**: `packages/if-domain` (`src/language-provider.ts`), `packages/lang-en-us` (a new subpath, `package.json` exports, its first third-party dependency), `packages/world-index` (`src/incomplete.ts`, which loses `extractNounPhrases` and `tokenizeProse` and takes an extractor as input; `src/unnamed.ts`, which tokenizes through it; `src/document.ts`, `src/analyze.ts`, `src/cli.ts`, which pass it through), `test-stories/orchard` (the lens's pin, AC-5), `packages/devkit` (`src/commands/world-index.ts`), `tools/explorer-probe` (`lens-examinable.js` and every later lens)

## Context

A lens (issue 508; ADR-294 D22; ADR-322) asks one narrow question of a story through the real engine. The first, `tools/explorer-probe/lens-examinable.js`, pulls the noun phrases out of the prose a player sees in each reachable room and runs `examine <phrase>` against each. It found issues 509–513 in Secret Letter. Playing the published Relighting on 2026-11-22, David hit the case it exists for, and one it cannot see:

- **The Refectory reads "Three long tables, each with its row of candles…".** `examine candles` resolves; `examine candle`, `take candle` and `take pricket` answer "You can't see any such thing." (probe 2026-11-22, `node packages/devkit/dist/cli.js play .` in `tutorials/relighting/chord-v4.1.0/chapter-40`). The thing is `create the candles` / `aka prickets` / `plural` (`relighting.story:767`). Names and aliases match only as written (issue 836; issue 512, the other direction).
- **The lens cannot see it, for two reasons.** It is broken: on 2026-11-22 it reached 10 of 13 rooms and examined 0 phrases, and its suite gave 17 passing, 8 failures, all in the real-engine half (issue 835). Even working, its extractor, ADR-321 D6b's `extractNounPhrases`, starts a phrase only at an article, so it returns `hearth you | horse | benches | wall | holidays | cloister` for the Refectory and misses `tables` and `candles` entirely.

Ways of finding nouns already in the repository:

- **ADR-321 D6b**, `@sharpee/world-index`'s `extractNounPhrases`: an article-anchored heuristic in TypeScript, pinned by a corpus test. Measured recall on Secret Letter, 2026-09-23: 66% of head-noun mentions, with most misses having no article before them (`lens-examinable.js` header). Nothing in its package marks it as English, but its anchors are English words.
- **ADR-321 D11**, macOS `NLTagger` in `tools/ide/SharpeeIDE/World/WorldProseChunker.swift`: re-heads candidates for the IDE's Incomplete view, merged with the analyzer's list and never replacing it, because the tagger calls `shroud` and `well` adverbs. On Fernhill it found 433 candidates against 173. The lens's plan ruled it out because a Node tool cannot call it (`docs/work/archive/testing-explorer/plan-20260922-examinable-lens.md`).

David's rulings, 2026-11-22: lenses "need to work in the CLI too, so we can't rely on a native OS library"; and "we have to gate this on language too, so compromise + en_us".

Measured 2026-11-22 on the 57 `.description` and `.detail` phrases of the chapter-40 Relighting IR, counting distinct (owner, noun) pairs. Scratch scripts, not committed; the numbers are also on issue 835.

| Extractor | Nouns | Found only by it |
|---|---|---|
| ADR-321 heuristic (head of each phrase) | 158 | 11, nearly all words that aren't things (`gone`, `you`, `like`); one real noun, `drum` |
| `compromise@14.20.0`, terms tagged `Noun` and not `Pronoun` | 386 | 60, mostly words that aren't things (`its` ×9, `someone`, `there`, `back`) |
| `wink-nlp@2.4.0` + `wink-eng-lite-web-model@1.8.1`, `NOUN`/`PROPN` | 343 | 26, more of them real (`porter`, `doorway`, `grille`, `crate`), plus adjectives |

Both taggers return `tables`, `candles` and `prickets`. `compromise` is MIT licensed and pure JavaScript; it was last published 2026-11-08 and depends on `efrt` and `suffix-thumb`, by the same author. Its `toSingular()` turns `three long tables` into `Three long table`. Its built file (`builds/compromise.js`) is 341,500 bytes; The Relighting's published `game.js` is 1,971,319 bytes.

Read in the source, 2026-11-22:

- `packages/if-domain/src/language-provider.ts:47`: `LanguageProvider` carries `readonly languageCode`; the en-US provider sets `'en-US'` (`packages/lang-en-us/src/language-provider.ts:42`).
- The en-US provider already owns number: `lemmatize(word)` (`language-provider.ts:662`, irregulars first, then rules) and `pluralize(noun)` (`:725`, which delegates to `src/pluralize.ts`). `ParserLanguageProvider` declares `lemmatize` (`packages/if-domain/src/parser-language-provider.ts:117`).
- `packages/lang-en-us/package.json` exports only `.` and depends only on `@sharpee/core` and `@sharpee/if-domain`.
- The only consumers of `extractNounPhrases` are `packages/world-index/src` and `tools/explorer-probe/lens-examinable.js`.
- One chain reaches prose. The IDE spawns `sharpee world-index` (`tools/ide/SharpeeIDE/World/WorldIndexRunner.swift:107`). That runs `packages/devkit/src/commands/world-index.ts:20` `analyzeStoryIR` (`packages/world-index/src/analyze.ts:36`), which builds the document whose `incomplete` section is `deriveIncomplete(ir, reach)` (`src/document.ts:285`), which calls `extractNounPhrases` per prose site (`src/incomplete.ts:467`). `world-index`'s own `src/cli.ts` also calls `analyzeStoryIR`. The other importers never reach prose: `branch-tester` (`collectClauseBranches`, the `DeclaredEnding` type) and devkit's test commands (`deriveReach`, `explainRefusal`, `endingsOf`, `roomsOf`). `world-index` depends on `@sharpee/chord` and `@sharpee/world-model`, with no language package.
- A compiled story names its language: The Relighting's IR has `phrases.defaultLocale` `'en-US'`, the same string as the en-US provider's `languageCode`.
- `world-index` holds English beyond the extractor: `readsAsThing` consults `non-physical-nouns.generated.ts`, a list of nouns with no physical sense, derived from Open English WordNet 2024.

## Decision

**D1 — A lens runs in the CLI.** Every lens is a Node tool that runs wherever the CLI runs. Nothing a lens depends on may be a native OS library, an OS service, or a sidecar in another language. A host such as the IDE may present a lens's findings, and may refine its own views with whatever it has. A lens's findings never depend on such a refinement. ADR-321 D11 stands as written, as a refinement of the IDE's Incomplete view; it is not an input to any lens.

**D2 — Noun extraction belongs to the story's language.** Finding the nouns in prose is a language task, like parsing and message text. Each language package supplies its own extractor, and every reader of prose uses the extractor for the story's language. A reader that holds only the compiled IR, such as `sharpee world-index`, takes the language from the IR's `phrases.defaultLocale`. A reader that holds a running engine, such as a lens, takes it from `LanguageProvider.languageCode`, and refuses by D6 if that differs from the IR's `phrases.defaultLocale`. No reader ever runs one language's extractor on another language's prose.

**D3 — The contract is a type in `if-domain`; the implementation is a subpath of the language package, outside the story runtime.** `if-domain` declares:

```ts
/** One candidate noun phrase found in a passage of prose. */
export interface NounCandidate {
  /** The phrase as it reads in the passage, after cleaning (D4). */
  readonly text: string;
  /** Its words, lowercased, in order. */
  readonly words: readonly string[];
  /** The word a player would type alone to mean it: the last noun of the phrase. */
  readonly head: string;
  /** Character offset of the phrase's first word in the passage. */
  readonly offset: number;
}

/** A language's noun extractor. */
export interface NounExtractor {
  /** The language this extractor reads, in `LanguageProvider.languageCode` form (e.g. 'en-US'). */
  readonly languageCode: string;
  /** Candidate noun phrases in reading order; an empty passage returns []. Never throws on prose. */
  extract(text: string): NounCandidate[];
  /**
   * The passage's words, lowercased, in reading order, split by this language's rules
   * (for English, ADR-321 D16: a hyphen joins, a possessive ends a run).
   * `extract` splits words the same way. An empty passage returns []. Never throws on prose.
   */
  tokenize(text: string): string[];
}
```

`tokenize` is in the contract because ADR-321 D13's unnamed-tool check reads the same words the extractor does. One tokenizer for both is what D16 established; a second copy would let a thing be named for one question and unnamed for the other (Amendment 1).

Each language package exports one `NounExtractor`, named `nounExtractor`, from a `nouns` subpath that the package's main entry does not import. For English that is `@sharpee/lang-en-us/nouns`. A reader finds the extractor by convention: for language code `<code>`, it loads `@sharpee/lang-<code lowercased>/nouns`, so `'en-US'` loads `@sharpee/lang-en-us/nouns`. It refuses by D6 if that module cannot be loaded, exports no `nounExtractor`, or exports one whose `languageCode` differs from the code asked for. There is no registry to keep in step.

Assumption, checked by AC-3: a published story bundles `lang-en-us`'s main entry, so it never carries a tagger only a lens uses. Imported from the main entry, `compromise` would add about 17% to The Relighting's `game.js` (341,500 bytes against 1,971,319, both measured 2026-11-22). The subpath needs `exports` entries for both `dist/` and `dist-esm/`. It is the language package's own decision whether to declare `compromise` as a dependency or an optional peer; the bundle rule stands either way.

**D4 — The English extractor is `compromise` together with ADR-321's heuristic, behind one function.**
- `compromise` is pinned to an exact version.
- Its output is cleaned before it is used: leading conjunctions, determiners and numbers are stripped (`and a hearth`, `three long tables`); `X of Y` chunks are split so each head is tried (`row of candles` → `candles`); and terms tagged as pronouns or possessive determiners are dropped (`its`, `someone`).
- The result is the union of the cleaned `compromise` phrases and ADR-321's heuristic phrases, deduplicated. It is never one replacing the other: on The Relighting, each found nouns the other missed. This is D11's lesson applied to a portable tagger.
- The tagger is reached only through the extractor function, so `wink-nlp` or a successor can replace it without touching a lens.

**D5 — The other number comes from the language, not the tagger.** For each head noun, a lens asks the story's language for the other number: in English, `lemmatize` for the singular and `pluralize` for the plural, the provider's existing methods. A lens tries both forms through the engine and reports a form that fails while the other resolves. Whether the parser itself should accept both forms is issue 836's question and is not decided here.

**D6 — A language with no extractor is refused by name.** A reader of prose, whether a lens or `sharpee world-index`, given a story whose language supplies no extractor (D3's lookup fails), stops before reading any prose; a lens stops before walking. It reports the language code and that no noun extractor exists for it, and exits non-zero. It does not fall back to English rules and report nothing, which would read as a clean story.

**D7 — The extractor proposes; the engine decides.** No extractor decides whether a phrase is a finding. Each candidate is typed into the real engine, and the engine's events decide its class, as `lens-examinable.js` already does (`if.event.examined`'s `messageId`, `command.failed`'s reason). Extractor noise (`stable a horse`, `library door west`) therefore costs a few commands and never produces a false finding. ADR-322 D7's soundness contract holds unchanged: findings are real, and absence is not proof.

**D8 — ADR-321's heuristic moves into the English language package, and `world-index` takes its extractor from its caller.** `extractNounPhrases`, `tokenizeProse`, and their stop and boundary lists move from `packages/world-index/src/incomplete.ts` to `@sharpee/lang-en-us/nouns`. The heuristic becomes one half of D4's English extractor, and the tokenizer becomes its `tokenize`. The D6b test cases that exercise the extractor itself move with it. The D6b count pins (missing-word, ambiguous and no-object counts over compiled stories) stay in `world-index`, because they test `deriveIncomplete`, and they reach the English extractor through a test-only dependency. `world-index` no longer contains an extractor or a tokenizer. `deriveIncomplete`, the document builder that calls it, and the unnamed-tool check (ADR-321 D13, `src/unnamed.ts`) each take a `NounExtractor` (D3) as an input. `analyzeStoryIR` reads the IR itself, so it takes a lookup instead: a function from a language code to an extractor or a refusal. It applies the lookup to the IR's `phrases.defaultLocale` (D2) once the IR is read, and refuses by D6 when there is no extractor. The lookup and its refusal line are one pure helper in `if-domain` beside the contract, so every reader prints the same line. The two callers that reach prose supply the lookup: devkit's `world-index` command, which the IDE spawns, and `world-index`'s own `cli.ts`. So the IDE's Incomplete view and every lens read through the same English extractor, and nothing below the caller names a language. ADR-321 D5 is unchanged: Incomplete still resolves each phrase against the validator's vocabulary; only where the phrases come from moves. ADR-322 D8 (consume ADR-321's derivations, do not rebuild them) holds, because the heuristic still has one home.

Rejected, with the reasons:
- Keeping the heuristic in `world-index` with `lang-en-us/nouns` importing it would make a language package depend on an analysis package that pulls in `chord` and `world-model`.
- Moving it and having `world-index` import `lang-en-us/nouns` directly would fix `world-index` to English, so D2 would hold for lenses but not for the IDE.

**Follow-on, not decided here:** `readsAsThing` and its WordNet list are English too, so they raise the same question. Until a later record settles it, they stay in `world-index`, and the extractor never depends on them.

## Acceptance Criteria

- **AC-1: the Refectory, end to end.** The repaired examinable lens, run on `tutorials/relighting/chord-v4.1.0/chapter-40/relighting.story`, reports `candle` and `pricket` as failing while `candles` and `prickets` resolve. Each finding names the Refectory or the candles' description as its source, and gives the engine's reason (`Validation failed: ENTITY_NOT_FOUND`).
- **AC-2: a language with no extractor is refused.** A lens and `sharpee world-index`, each given an IR whose `phrases.defaultLocale` has no `@sharpee/lang-<code>/nouns`, print one line naming the code and saying there is no noun extractor for it. They exit non-zero, and the lens walks no rooms. Both readers are run end to end through the real command. When a lens's engine `languageCode` differs from the IR's locale, it refuses the same way, naming both codes. Until a second language exists that case cannot be reached through a real engine, because Chord always writes `en-US`. The guard is unit-tested on all three outcomes (no extractor, mismatch, match), and that is recorded as the rule-13a stub justification (Amendment 1).
- **AC-3: the story runtime does not grow.** The Relighting's published `game.js` is built before and after the change, and the two are the same size to the byte. This also checks D3's bundling assumption.
- **AC-4: the union never loses a candidate.** `sharpee world-index` on Fernhill, before and after, produces Incomplete candidates where every phrase from before appears after. A unit test on `nounExtractor` asserts that, on the D6b corpus, its output contains every phrase the heuristic alone produces.
- **AC-5: the lens's suite passes.** `node --test tools/explorer-probe/tests/lens-examinable.test.js` has no failures. The lens's corpus pin is recorded on `test-stories/orchard` (its test set's OB-35), not on Fernhill: ADR-395 D7 keeps exploring tests off real stories, and David ruled on 2026-11-11 that the pin moves to orchard once the lens is repaired. It is re-recorded for the new extractor only after the new census is reviewed (Amendment 1).
- **AC-6: the extractor never decides a verdict.** A unit test drives the lens's classification with the same engine events and two different candidate lists, and asserts each phrase's class depends only on its events.

## Consequences

- `lang-en-us` takes its first third-party runtime dependency. Every later language package that wants lenses ships its own extractor or is refused by D6.
- Lenses get a portable extractor without anyone adding to ADR-321 D6b's heuristic. The anchor gaps that header recorded (possessive determiners, phrases with no article) are covered by the tagger rather than by more anchor lists.
- The published story runtime does not change size (AC-3).
- `lens-examinable.js` must be repaired before it can use any of this. Its suite (17 passing, 8 failures on 2026-11-22; filed earlier as #805 and #583) is the floor, and the corpus pin moves to orchard (AC-5).
- Issue 835 plans on this record: repair the lens, then the extractor, the number forms, and verbs beyond `examine`.
- D8 moves ADR-321 D6b's extractor to a new home and changes what the Incomplete view reads. Whoever accepts this record adds an amendment note to ADR-321 pointing D6b here, in the same edit as the acceptance. D11's `NLTagger` refinement is unchanged, and it now re-heads the combined English extractor's candidates.
- `deriveIncomplete`, the document builder, the unnamed-tool check and `analyzeStoryIR` change signature. devkit's `world-index` command and `world-index`'s `cli.ts` change with them in the same commit; no other importer is affected. The extractor-level D6b cases move with the heuristic. The count pins stay in `world-index` and are re-recorded when the combined extractor lands, after the census is reviewed.

## Session

Session 1efc0f (2026-11-22), from David's play-through of the published Relighting and issues 835 and 836.

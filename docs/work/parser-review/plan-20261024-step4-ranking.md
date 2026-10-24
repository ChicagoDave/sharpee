# Session Plan: Parser review step 4 — rules rank without confidence

**Created**: 2026-10-24
**Plan Status**: ACTIVE
**Overall scope**: Step 4 of `docs/work/parser-review/review-20261022.md`, root cause 4, implementing ADR-384. Confidence is removed; one if-domain comparator orders matches by literal specificity, then tier, then definition order; the `maxMatches` early stop and the tier-first iteration are deleted; failures break ties by the same comparator; the bare-verb prefix rules are retired in Chord and the loader. Fixes D1, D2, D3, A8, C8. Steps 5-7 (search, one noun matcher, language and state) are NOT in this plan.
**Bounded contexts touched**: grammar contract (`packages/if-domain/src/grammar`, `parser-contracts`); English parser (`packages/parser-en-us`); Chord pattern lowering (`packages/chord`); story-loader rule registration (`packages/story-loader`); engine and stdlib (the constant `confidence: 1.0` writers); published references (ADR-268 amendment note, the parser-en-us CLAUDE.md, genai API reference)
**Key domain language**: confidence, literal specificity, tier (story over standard), definition order, comparator, replacement (`remove from action`), bare-verb prefix rule, failure tiebreak, seat question

## References consulted
- `docs/architecture/adrs/adr-384-grammar-rules-rank-without-confidence.md` — the decision this plan implements: D1-D6, acceptance criteria 1-8; no implementation is authorized until David says go on a phase. Dungeo `wave hands` moving is predicted and needs his own ruling.
- `docs/architecture/adrs/adr-268-chord-grammar-rule-ordering.md` — D2 is superseded in its confidence term and tier placement (amendment note written in the close-out phase; Status line left alone); D1, D3, D4 stand (no numeric priority, `go out` by definition order, no construct).
- `docs/architecture/adrs/adr-383-a-rule-declares-each-slots-seat.md` — D8: a failure that matched its verb and misses a seat asks by the verb the rule matched; D5's bare-verb retirement relies on this classifier.
- `docs/architecture/adrs/adr-231-player-surface-contract-rulings.md` — D2b `literalSpecificity` stays the specificity term.
- `docs/context/project-profile.md` — stack and conventions.
- `docs/work/parser-review/review-20261022.md` — findings D1-D3, A8, C8 and step order.
- `docs/work/parser-review/plan-20261023-step3-declared-seats.md` — DONE; its Close-out "Step 4's entry state" records ranking at `english-grammar-engine.ts:141-154`, the `give coin` classifier answer, and `PatternMatch.literals`.
- `packages/parser-en-us/CLAUDE.md`, `packages/stdlib/CLAUDE.md`, `docs/core-concepts/README.md` — platform conventions for the touched layers.
- Product ADRs not consulted (no Scope intersection): none classified as product.

## Out of scope
- Slot extent and matching (step 5), noun resolution (step 6), language and state (step 7); the rule gate (ADR-370 D7, ADR-378 D5).
- Any Chord surface change: no construct, diagnostic, EBNF change or `chord-grammar-changes.md` row (ADR-384 D6).
- Any change to `stories/dungeo`: the `wave hands` ruling is David's, and acting on it (accept the stock line, or `grammar.removeRules`) is its own go.
- Better `give coin` answers that depend on nouns (step 5's scoring).
- The step 1-3 plans and the review are not archived; steps 5-7 use the directory.

## Standing constraints (every phase)
- **No implementation is authorized yet.** Phases 2-5 touch `packages/` and need David's explicit go at phase entry; stop and ask. Phase 1 edits nothing but scratchpad files and this plan.
- A failed build or test is reported, never auto-retried.
- No backward compatibility, one-shot cutover (ADR-384 D1: a TS fixture that sets a removed field fails to compile). Behavior Statements first; real-path tests through the real loader and engine, following `packages/story-loader/tests/action-about-rows.test.ts`; mutation verification at each phase end.
- Regression floor each phase end, one run each (deterministic at the pinned seed, never re-run for flakiness): `./repokit build dungeo`; `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` (952 passed, 17 transcripts); every Chord tree via `./sharpee test` against the baseline captured in Phase 1 (step 3's close: expanses 19/23, sailing 21/22, vehicles 19/21, fernhill 86/107, ides-of-march 39/51, upps 244/368, thealderman 3/8 + 1 failing, wumpus 35/68 + 1 failing, secret-letter 1459/2640 + 10 failing); package suites for touched packages; `pnpm exec turbo run test:ci`; `./repokit grammar --check`, `manifest --check`, `aliases --check`. Build story-loader before `./repokit manifest` (open item 624).
- "Trees identical" means card text and results, not only counts: Phase 1 captures per-card output so a moved card is listed with its old and new text. A tree or chain result that moves stops for David's ruling; no transcript or tree card is re-recorded quietly.
- Probe story: `/private/tmp/claude-501/-Users-david-repos-sharpee/c5b810e6-de64-402b-8039-33b7da9cc6cd/scratchpad/ranking/ranking.story` (`push [hard] the target`; `take the target apart`; a scenery button and a clock).
- Chord and IDE alignment is two-sided; here the Chord surface is unchanged, and Phase 4 checks that claim.

## Phases

### Phase 1: Baseline and corpus census — measured before any code
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: grammar ranking (no code changes)
- **Entry state**: ADR-384 ACCEPTED; branch `chord-4-0`; step 3 plan DONE. David's go to run probes and builds (no source edits).
- **Deliverable**: Seven recorded measurements, each written into this phase's Demonstrated line with command and result. (1) AC8's tree baseline at HEAD: `./repokit build dungeo`, the chain, every tree's counts and a per-card output dump, and package suite counts (if-domain, parser-en-us, chord, story-loader, repokit, engine, stdlib). (2) AC5's `give coin` answer from the failure classifier against the standard grammar, on the bundle and in a parser-en-us probe, recorded at HEAD. (3) AC8's Dungeo `wave hands` bundle probe at HEAD (predicted: "You can't see any such thing."), plus `wave stick`. (4) ADR-384's context probes reproduced on the ranking probe story: `push button`, `push hard button`, bare take, take clock apart. (5) A registration snapshot (extend step 3's rules-snapshot.cjs, scratchpad) dumping each rule's tier, literal count, definition index and bare-verb flag; second run byte-identical. (6) The corpus census, a scratchpad script that, for every rule pair that can match one input (standard grammar, every .story file under stories/ and branch-stories/, and Dungeo's TS grammar), computes the winner under three orders: today's; Phase 2's interim (confidence removed, then tier, specificity, definition order); and D2's (specificity, tier, definition order). It lists every pair whose winner changes at Phase 2 and every pair whose winner changes at Phase 3; plus, separately, the optionals that carry the skipped-optional penalty today and the standard-tier input sets with more than ten matches (A8). (7) The D5 census: every `lowerActionRules` bare-verb form in every story, which of them shadow a standard verb, and every tree card or transcript line that types a bare story verb alone (old text recorded). Anything the census finds that contradicts the ADR's Consequences stops here for David's ruling and later phases are revised.
- **Exit state**: Baseline and census recorded; D2/D5 winner changes enumerated for David (each with its story, line, input and old and new winner); no source, test or generated file changed.
- **Demonstration**: the commands and outputs for each measurement, quoted in the Demonstrated line; the snapshot and tree-dump paths with their two-run equality.
- **Demonstrated**: 2026-10-24, session b09060, at b0fcbaa2a, no source edited (`git status`: plan, ADR-384, session files, the build-stamped `stories/dungeo/src/version.ts`). Scratchpad root `R` = `/private/tmp/claude-501/-Users-david-repos-sharpee/c5b810e6-de64-402b-8039-33b7da9cc6cd/scratchpad/ranking`. [reported by session, unverified]
  - **(1) Baseline.**
    - `./repokit build dungeo`: exit 0.
    - Chain (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`): 952 passed. Dungeo unit transcripts on the bundle: 1722 passed, 11 failed, 10 expected failures, 2 skipped.
    - Trees (`./sharpee test <story> --json --capture-output` → `R/trees-baseline/*.json`): expanses 19/23, sailing 21/22, vehicles 19/21, thealderman 3/8 + 1 failing, fernhill 86/107, ides-of-march 39/51, secret-letter 1459/2640 + 10 failing (12 assertions) + 1 skipped, upps 244/368 + 2 skipped, wumpus 35/68 + 1 failing. Identical to step 3's close.
    - Per-card dump: `R/trees-baseline/cards.tsv` (1940 cards with input, pass and output text; `R/cards.py`). One run, per the pinned-seed rule.
    - Suites (`npx vitest run`): if-domain 101, parser-en-us 447, chord 1720, story-loader 1415 + 1 skipped, engine 858 + 7 skipped, repokit 139 + 1 skipped. stdlib through `pnpm --filter '@sharpee/stdlib' test`: 1889 passed (146 files). Its `npx vitest` path is broken in this checkout (`node_modules/node_modules/.pnpm/...`, MODULE_NOT_FOUND), an environment fault, not a test result.
    - `./repokit grammar --check`, `manifest --check`, `aliases --check` and `protocol --check`: all fresh.
  - **(2) `give coin`.** Bundle: "What do you want to give?" (`--debug`: `MISSING_OBJECT`). Failures after a real Dungeo parse (`R/census/give-failures.cjs`): `give :recipient :item` progress 1, missing `direct` (rule #203); `give :item to :recipient` progress 0.75, missing `indirect` (#202). Progress decides, so D4's tiebreak is never reached and the answer is predicted unchanged.
  - **(3) Dungeo `wave`.** `wave hands`: "You can't see any such thing.", parsed to `dungeo.action.wave` (`--debug`). `wave stick` at the start: the same text and action, with no stick in scope. Standard `wave hands` and `wave hand` are rules #497 and #498 (2 literal words each), against story `wave :target` (#757, 1 literal word).
  - **(4) Probe story.** `push button` → "The button is fixed in place."; `push hard button` → "You shove the button."; `take` → "You can't do that."; `take clock apart` → "You take the clock apart."
  - **(5) Snapshot.** `R/snapshot/rules-snapshot.cjs` (step 3's script plus `#index`, `lit=required+optional` and a `bare` flag) → `baseline.txt`, 6212 lines; the second run, `baseline-2.txt`, is byte-identical (`cmp`).
  - **(6) Winner census, two methods.**
    - *Dynamic.* `R/census/preload.cjs` wraps `findMatches` at load time, without editing source, and records every match and the winner under three orders: today's, Phase 2's and D2's. It was run over the chain (952 passed, 208 multi-match parses), the Dungeo units (counts unchanged, 530) and all nine trees (counts unchanged, 4262). Result: no winner changes under Phase 2 or D2, no input with more than 10 matches, and 6 parses with a penalised match, none decided by the penalty.
    - *Static.* `R/census/static-inputs.tsv`, from `static-pairs.cjs`, synthesizes every rule's inputs (slots filled with `x`, optionals both ways) and ranks every rule that matches each one. Thirteen inputs change winner.
      - At Phase 2, in Wumpus: `shoot arrow at x` (and with the slot left empty) goes today to `shoot :target`, which binds "arrow at x", because `shoot [the] arrow at :target` pays 0.9 for the skipped `[the]`. With the penalty gone, the specific line wins. This is a live D1 instance; no tree card types it.
      - At Phase 3, in Dungeo, nine inputs move from a Dungeo action to the standard one: `hit x with x` (DUNGEO_BREAK → attacking), `dig x with x` (dungeo.action.dig → digging), `burn x with x` (DUNGEO_BURN → burning), `say goodbye`, `say farewell`, `say goodbye to x`, `say farewell to x` (dungeo.say → saying_goodbye), `wave hands`, `wave hand` (dungeo.action.wave → waving).
      - At Phase 3, in Secret Letter: `pick up x` (chord.action.buying `pick :target`, from `extend action buying` at `preparations.chord:613-616` → taking) and `jump up` (chord.action.jumping `jump :gap` → jumping).
      - No chain or tree line types any of the thirteen. `tie`, `untie` and `light … with` do not move, because Dungeo's own `tie :object to :target` and similar lines tie on specificity.
  - **(7) D5 census.** 57 bare-verb forms: secret-letter 48, fernhill 5, wumpus 3, thealderman 1 (`R/snapshot/bare-forms.txt`). Five shadow a standard verb, all in Secret Letter: `buy`, `hang`, `put`, `lift`, `raise` (`R/snapshot/bare-shadow.txt`). `jump`, `reach` and `follow` are also author-written lines, so they stay. No tree card or transcript types a bare form alone in the story that registers it. The six hits by text are Secret Letter and UPPS `jump`, author-written or in a story with no bare forms, and Dungeo `knock`.
  - **Against ADR-384's Consequences.** The ADR names only `wave hands` as a predicted Dungeo text change. The census adds `wave hand`, `hit … with …`, `dig … with …`, `burn … with …` and the four `say goodbye`/`say farewell` forms, plus Secret Letter's `pick up` and `jump up`. Per this phase's stop rule, these go to David before Phase 3's entry.
- **Status**: DONE

### Phase 2: Confidence removed (D1)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: grammar match contract (`PatternMatch`, `RichCandidate`, parsed-command `confidence`), slot consumers, constant writers in engine and stdlib
- **Entry state**: Phase 1 DONE and its census reviewed; David's go on `packages/if-domain`, `packages/parser-en-us`, `packages/engine` and `packages/stdlib`.
- **Deliverable**: Implements ADR-384 D1, AC1's real-path half and AC2. The skipped-optional penalty, `experimentalConfidence`, `minConfidence`, slot consumers' confidence return with its `|| 0.9`, `confidence` on `PatternMatch` and the parser's `RichCandidate`, and the optional `confidence` on the parsed command contract are deleted, with the constant `1.0` writers in engine and stdlib. A TS fixture setting one fails to compile. The sort sites still order by tier then specificity (the comparator arrives in Phase 3), so this phase's behavior change is exactly the removed penalty: `push button` now reaches `shoving`. Tests: through the real loader and engine, the probe story's `push button` runs `shoving`; a parser-en-us test pins that a story rule with a skipped optional outranks a standard rule of equal specificity.
- **Files**: `packages/if-domain/src/grammar/grammar-builder.ts`, `packages/if-domain/src/grammar/grammar-engine.ts`, `packages/if-domain/src/parser-contracts/parser-internals.ts`, `packages/parser-en-us/src/english-grammar-engine.ts`, `packages/parser-en-us/src/english-parser.ts`, `packages/parser-en-us/src/slot-consumers/`, `packages/parser-en-us/src/parser-types.ts`, `packages/engine/src/command/command-executor.ts`, `packages/engine/src/`, `packages/stdlib/src/actions/`, `packages/parser-en-us/tests/`, `packages/story-loader/tests/`
- **Exit state**: grep for "confidence" over parser-en-us src, if-domain grammar and parser-contracts finds no grammar-match or parsed-command confidence; tsc clean across the tree; chain and trees identical to Phase 1's baseline or each moved line listed and ruled (the expected movers are rules whose winner flips with the penalty gone, per Phase 1's census).
- **Demonstration**: the new tests, shown failing against the pre-phase source; bundle run of push button and push hard button on the probe story (before: standard pushing; after: "You shove the button."); the grep; counts against baseline.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 3: One comparator; every match ranked; failures tiebreak (D2, D3, D4)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: if-domain comparator beside `GrammarRule.tier`; `findMatches`; the parser's candidate sort; `parse-failure.ts` ranking; Dungeo `wave hands`
- **Entry state**: Phase 2 DONE; David's go on `packages/if-domain` and `packages/parser-en-us`; David's ruling on every winner change Phase 1's census listed under D2, and on `wave hands` (accept the stock line, or Dungeo removes the standard line through `grammar.removeRules`; the second is a separate go on `stories/dungeo`).
- **Deliverable**: Implements ADR-384 D2, D3, D4 and AC3, AC4, AC5, AC7. One exported comparator in if-domain orders by `literalSpecificity` descending, then tier (story over standard), then definition order; `findMatches` and the parser's candidate sort call it and the parser's sort keeps `findMatches`'s order; `maxMatches` and the tier-first iteration are deleted (rules tried in registration order, gated-off rules still skipped first); failures sort by verb flag, then progress, then the comparator. The comments that claim the old ordering (the ordering comments in grammar-engine.ts, grammar-builder.ts, english-parser.ts and loader.ts, and the ordering line of parser-en-us CLAUDE.md's ordering line) are rewritten. Tests: the comparator's three keys in order with a pair of rules for each; twelve standard rules matching one input with the most specific registered last wins; failure tiebreak by definition order on two failures of equal verb flag and progress; `give coin`'s answer pinned after the change with any difference from Phase 1 reported; real path with a story `take the thing` — `take off hat` (hat worn) reaches taking off and `take lamp` the story action, and with `remove from action taking_off` plus `take off the item`, `take off hat` reaches the story action.
- **Files**: `packages/if-domain/src/grammar/grammar-builder.ts`, `packages/if-domain/src/grammar/grammar-engine.ts`, `packages/if-domain/src/grammar/rule-order.ts` (new), `packages/if-domain/src/grammar/index.ts`, `packages/parser-en-us/src/english-grammar-engine.ts`, `packages/parser-en-us/src/english-parser.ts`, `packages/parser-en-us/src/parse-failure.ts`, `packages/parser-en-us/CLAUDE.md`, `packages/story-loader/src/loader.ts`, `packages/parser-en-us/tests/`, `packages/story-loader/tests/`
- **Exit state**: exactly one comparator, called from the engine and the parser (grep); no `maxMatches`; suites green; chain and trees identical to baseline or each moved line listed with old and new text and ruled; Dungeo `wave hands` probe taken to David and his ruling applied or recorded.
- **Demonstration**: the new tests shown failing against pre-phase source; bundle probes of take off hat and take lamp on the probe story and of Dungeo wave hands and wave stick before and after; the give coin before and after; grep for the comparator's call sites; counts against baseline.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 4: Bare-verb prefix rules retired (D5)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Chord `lowerActionRules`, story-loader rule registration, the seat question for a story verb typed alone
- **Entry state**: Phase 3 DONE; David's go on `packages/chord` and `packages/story-loader`; Phase 1's D5 census reviewed (every tree card or transcript line that types a bare story verb, with its old text).
- **Deliverable**: Implements ADR-384 D5 and AC6. `bareVerbForms` and LoweredRule.bare are deleted and the loader registers exactly the lines an action writes (as `extend action` already does). Tests: a chord test pins that `lowerActionRules` returns exactly the written lines; through the real loader and engine, the probe story's bare take prints "What do you want to take?", take clock apart still runs `dismantling`, and a story-only verb typed alone (probe `frob`) asks for its missing seat; an author-written bare line (`drop`, as Secret Letter's `releasing`) still answers the bare verb. Each tree card or transcript line that moves is listed with old and new text and David's ruling; none is re-recorded quietly. The Chord surface is checked unchanged (no EBNF change, no new diagnostic, `protocol --check` fresh).
- **Files**: `packages/chord/src/patterns.ts`, `packages/story-loader/src/loader.ts`, `packages/chord/tests/patterns.test.ts`, `packages/story-loader/tests/`
- **Exit state**: no bare-verb form in `packages/chord/src/patterns.ts` or the loader (grep for `bareVerbForms`, LoweredRule.bare); suites green; chain and trees identical to baseline or each moved card listed and ruled; `grammar --check` and `manifest --check` fresh.
- **Demonstration**: the new tests shown failing against pre-phase source; bundle probes of bare take, take clock apart, bare frob; the greps; counts against baseline.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: Close-out — amendment note, references, step 5 hand-off
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: closing the step: published references and step 5's entry note
- **Entry state**: Phase 4 DONE.
- **Deliverable**: the one-line amendment note under ADR-268 D2 pointing to ADR-384 (ADR-268's Status line left alone); a one-line amendment note under ADR-231 D2b, whose title calls specificity "a general confidence" term: specificity stands, confidence is removed (ADR-384 D1); the parser-en-us CLAUDE.md ordering text checked against the code; genai API reference regenerated; ADR-384's AC1-AC8 each checked against evidence in the earlier Demonstrated lines; findings D1, D2, D3, A8, C8 marked fixed in this plan's close-out; a Close-out section recording step 5's entry state (the comparator's home and call sites, what the parser still reads, what step 5's search inherits: ranking without confidence and the failure tiebreak). A mutation or comment audit finds no leftover claim of confidence-first or tier-first ordering.
- **Files**: `docs/architecture/adrs/adr-268-chord-grammar-rule-ordering.md`, `docs/architecture/adrs/adr-231-player-surface-contract-rulings.md`, `packages/parser-en-us/CLAUDE.md`, `docs/work/parser-review/plan-20261024-step4-ranking.md`
- **Exit state**: all earlier phases DONE; plan status DONE; close-out present. The plan is not archived (the review serves steps 5-7).
- **Demonstration**: grep for the amendment note and for removed names (maxMatches, experimentalConfidence, minConfidence, bareVerbForms); final chain, tree, suite and turbo test:ci counts; the repokit grammar, manifest, aliases and protocol checks fresh.
- **Demonstrated**: 
- **Status**: PENDING

## Sequencing note
Phases 2 and 3 are sequential by real dependency: the comparator replaces the sort sites that confidence leaves behind, and splitting them attributes the `push button` change to the removed penalty alone and the specificity-before-tier change to the comparator alone. Phase 4 (D5) is independent of 2 and 3 in code, since the loader's registration and Chord's lowering touch no ranking site, but its census-reviewed card moves are easier to attribute after ranking has settled, and bare take answering with the seat question depends on ADR-383's classifier only. It could swap with Phase 3 if David wants C8 closed earlier. Phase 1 is first because the ADR's three predictions (`wave hands`, the winner changes under D2, the bare-verb card moves) are inferred from code and unprobed, and each ends in a ruling David owns.

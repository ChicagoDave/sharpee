# ADR-384: Grammar rules rank by tier, specificity and definition order; confidence is removed

**Status**: **ACCEPTED** (David, 2026-10-24, session b09060: "yes", after the open-questions interview and `adr-review` 19/22 with five findings folded). Q-1 resolved by David, 2026-10-24, session b09060 ("b": specificity first, the story tier as the tiebreak). Written 2026-10-24, session b09060, on `chord-4-0`, from step 4 of the parser review's recommendation (`docs/work/parser-review/review-20261022.md`, root cause 4). It supersedes ADR-268 D2: the confidence term is removed, and tier moves below specificity. It fixes D1, D2, D3, A8 and C8. No implementation is authorized.

## Date: 2026-10-24

**Kind**: technical

**Scope**: `packages/parser-en-us` (`src/english-grammar-engine.ts`, `english-parser.ts`, `parse-failure.ts`, `src/slot-consumers/*`, `parser-types.ts` deleted), `packages/world-model` (`src/commands/parsed-command.ts`), `packages/if-domain` (`src/grammar/grammar-builder.ts`, `grammar-engine.ts`, `src/parser-contracts/parser-internals.ts`), `packages/chord` (`src/patterns.ts`), `packages/story-loader` (`src/loader.ts`), `packages/engine` and `packages/stdlib` (the `confidence: 1.0` writers), `packages/parser-en-us/CLAUDE.md`, `docs/architecture/adrs/adr-268-chord-grammar-rule-ordering.md` (amendment note), `packages/sharpee/docs/genai-api` (regenerated).

## Parent

- **The parser review**, root cause 4 and findings D1, D2, D3, A8, C8. Step 4 of its recommendation: "drop confidence; rank tier, then literal specificity, then definition order; supersede ADR-268 D2's confidence term; consider an analyzer warning for D3."
- **ADR-268 D2**: "confidence → tier → specificity → definition order", with tier described as "absolute and unconditional". Both cannot hold, and the code honours the first. This record removes the confidence term and moves tier below specificity, reversing ADR-268's Q-2 ruling (tier-first). D1 (no numeric priority), D3 (`go out` by definition order) and D4 (no construct) stand.
- **ADR-231 D2b**: `literalSpecificity`, the words consumed by literal and alternate tokens. It stays the specificity term.
- **ADR-370 D7 and ADR-378 D5**: the rule gate (`define action … while`). A gated-off rule is not a candidate, and this record does not change that.
- **ADR-383**: the seat on every entity slot, and the failure classifier asking by the missing seat. Step 3's close-out (`plan-20261023-step3-declared-seats.md`, "Step 4's entry state") records what this record inherits.

## Context — measured, not assumed

**Confidence is a count of skipped optional words.** `EnglishGrammarEngine.tryMatchRuleWithFailure` starts at 1.0 (`english-grammar-engine.ts:201`). Every slot consumer returns 1.0 or no match, so `confidence *= slotResult.confidence || 0.9` (`:357`) multiplies by 1.0 and the `|| 0.9` is dead. The only real term is `confidence *= Math.pow(0.9, skippedOptionals)` (`:379`). `rule.experimentalConfidence` (`:382-384`) is declared at `if-domain/src/grammar/grammar-builder.ts:362` and set by nothing. `minConfidence` defaults to 0.1 (`english-grammar-engine.ts:102`, `english-parser.ts:63`), which only 22 skipped optionals would reach.

**Confidence is compared before tier, at two sites.** `findMatches` sorts on confidence, then tier, then `literalSpecificity` (`english-grammar-engine.ts:145-154`). The parser's candidate sort repeats it (`english-parser.ts:408-416`). Outside the parser, `confidence` is only ever written, as the constant 1.0 (`engine/src/command/command-executor.ts:135`, `action-context-factory.ts:279`, `stdlib/src/actions/enhanced-context.ts:194, 492`, `stdlib/src/actions/helpers/exit-legality.ts:81`). Nothing outside the parser reads it.

**So a story rule with a skipped optional loses to a standard rule (D1).** On the bundle at a8082a2bc (2026-10-24, this session; probe story `…/scratchpad/ranking/ranking.story`, a scenery button and a clock in one room, a story action `shoving` with grammar `push [hard] the target`):

```
> push button
The button is fixed in place.

> push hard button
You shove the button.
```

`push button` reaches the standard pushing action because the story rule skipped `[hard]`, which costs it 0.9. When the optional is used, the story rule wins.

**The match limit stops before ranking (A8).** `findMatches` breaks after 10 successful matches (`english-grammar-engine.ts:127-129`). Story rules are iterated first (`:107-110`), so a story rule is never cut off. Within the standard tier, though, an eleventh match is never compared, however specific.

**A bare-verb prefix takes over a standard verb (C8).** For each slotted pattern of a `define action`, `lowerActionRules` adds the literal prefix before the first slot as its own rule (`chord/src/patterns.ts:343-353`), and the loader registers it at story tier (`story-loader/src/loader.ts:1588-1590`). On the same probe story, with `dismantling` declaring `take the target apart`:

```
> take
You can't do that.

> take clock apart
You take the clock apart.
```

Bare `take` fully matches the story's `take` prefix rule and runs `dismantling` with no target, which refuses. The standard grammar's answer, "What do you want to take?", comes from a failure, and a full match always beats a failure. No ordering of matches can fix this.

**The bare-verb forms predate the seat.** The records show that they exist, not why. ADR-266 lists them at priority 140 (`adr-266-grammar-definition-parity.md:63`), ADR-269 counts them among the conveniences of the story-loader dispatch path (`adr-269-standard-grammar-as-chord-source.md:357`), and ADR-270 Phase 3 limited them to dispatch actions (`adr-270-author-alteration-model.md:342`). Their purpose is inferred, not recorded: a story verb typed alone reaches its own action instead of "I don't understand that." Since ADR-383 D8, a failure that matched its verb and is missing a seat asks for that seat by the verb the rule matched. Step 3's probe (`plan-20261023-step3-declared-seats.md`, Phase 6 Demonstrated) showed `pick up` → "What do you want to pick up?" and bare `give` → "What do you want to give?". A story verb's slotted pattern is a rule like any other, so bare `frob` now meets the same classifier.

**Tier-first hides specific standard phrasings (the review's D3).** At equal confidence, tier is compared before specificity (`english-grammar-engine.ts:149-151`). So a story `take the thing` outranks the standard `take off :item` on `take off hat`. The review probed this. Once confidence is gone, every story rule is above every standard rule in all cases, not only at equal confidence. ADR-268 chose tier-first as "the I7 precedent (story rules over Standard Rules)". In Inform 7, though, a new `Understand "take [something]" as …` line joins the verb's existing grammar and competes by specificity. Replacing the verb outright is a separate statement (`Understand the command "take" as something new`). That account of Inform is an outside reference, from Inform's documentation (*Writing with Inform*, chapter 17), and was not checked this session. ADR-268 also recorded that "the corpus cannot distinguish the placements today".

**Failure ranking has its own order.** `parse-failure.ts:118-120` sorts failures by whether the rule matched its verb, then by progress. On `give coin` it picks `give :recipient :item`'s missing item ("What do you want to give?") over `give :item to :recipient`'s missing `to`. The standard grammar defines `give the item to the recipient` first (`grammar/standard-en-us.story:270-271`), so the classifier is not following definition order.

## Decision

### D1 — Confidence is removed

A grammar match has no confidence. The skipped-optional penalty, `experimentalConfidence`, `minConfidence`, the slot consumers' confidence return and its `|| 0.9` are deleted. So are `confidence` on `PatternMatch` and on the parser's `RichCandidate`, and the parsed command's `confidence`, together with its constant writers in engine and stdlib. The live contract is world-model's `IParsedCommand.confidence: number`, which is required (`world-model/src/commands/parsed-command.ts:179`); if-domain's optional copy (`parser-internals.ts:67`) goes with it. *(Citation corrected 2026-10-24, session b09060, at Phase 2 entry: the draft named only the if-domain copy. David widened Phase 2 to world-model the same day, "a".)* The parser-en-us file `src/parser-types.ts`, imported by nothing and carrying its own `confidence` and `minConfidence`, is deleted (David, 2026-10-24). Nothing is accepted and ignored: a TypeScript story or fixture that sets one of these fields fails to compile.

World-model's `ITokenCandidate.confidence` (`parsed-command.ts:65`) is not match confidence. It is the vocabulary entry's priority under another name (filled from `vc.priority` at `english-parser.ts:700` and turned back into `priority` at `:748`), and matching never reads it. It is out of scope here; renaming it `priority` belongs to step 7 (language and state).

A rule that used its optional already outranks one that skipped it, through `literalSpecificity` (`push hard button` consumes two literal words, `push button` one). The penalty did nothing else, except make a rule's rank depend on where in the input its optional fell.

### D2 — One ordering, in one place: specificity, then tier, then definition order

Matches are ordered by `literalSpecificity` (descending), then tier (story over standard), then definition order. The more specific line wins whatever its tier. At equal specificity the story line wins, which is enough to fix D1: `push [hard] the target` and `push :target` both consume one literal word on `push button`, so the story's `shoving` wins. The parser's candidate sort stops repeating the engine's sort and keeps the order `findMatches` returns. One comparator lives in if-domain beside `GrammarRule.tier`, and both `findMatches` and any later reader (step 5's search) call it.

**Replacement is explicit (D3 of the review).** A broad story line no longer captures a standard verb's more specific phrasings: with a story `take the thing`, `take lamp` reaches the story action and `take off hat` reaches taking off. An author who wants the specific phrasing too removes the standard line, which is Inform's `Understand the command "take" as something new`. `remove from action` already exists for this (ADR-270) and is checked at compile time against the manifest. Nothing is added to Chord.

```
define action grabbing
  grammar
    take the thing          ## `take lamp` → grabbing; `take off hat` → taking off
  phrase grabbed

## to capture `take off` as well, the author says so:
remove from action taking_off
  grammar
    take off the item
```

*Rejected: tier first with an analyzer warning* (`analysis.hides-standard-line`, fired when a story line matches every input a more specific standard line of another action matches). It would fire on every broad story verb that shares a word with the standard grammar, and the fix it asks for is the same `remove from action` this decision relies on. ADR-268 cited "the I7 precedent (story rules over Standard Rules)" for tier-first, but Inform ranks a story's new grammar lines with the verb's existing ones by specificity and replaces a verb only when told to.

> **Amendment note (2026-10-25, ADR-386):** D2 is amended, not superseded. The noun rank
> sits above these keys: `compareGrammarRank` compares a reading's `unnamed` count (items
> whose words name nothing; fewer first) before literal specificity, then tier, then
> definition order as this record says, then `named` and `exact` (more first) break the
> ties that remain within a rule (ADR-386 D4, D5). The comparator is still the one place,
> in `rule-order.ts`, and failures still rank by verb and progress before it (D4 here).
> Landed with parser-review step 5 (`docs/work/parser-review/plan-20261025-step5-search.md`).

### D3 — Every match is ranked

The `maxMatches` early stop is deleted: every rule that matches is ranked. The tier-first iteration in `findMatches` (`:107-110`) existed only to protect story rules from that stop. It goes too, and rules are tried in registration order. Gated-off rules are still skipped before matching (ADR-378 D5).

### D4 — Failures rank by the same keys after their own

Failures sort by whether the rule matched its verb, then progress, then the D2 comparator. The tiebreak decides only failures whose verb flag and progress are equal. Whether `give coin`'s two failures are equal has not been measured, so this record does not predict that the answer changes. A better answer depends on the nouns (the coin is not a person) and belongs to step 5's scoring, not to ordering. The implementation records the classifier's `give coin` answer at baseline and pins the answer after the change, so any difference is visible.

### D5 — Bare-verb prefix rules are retired

`lowerActionRules` stops adding bare-verb forms. `bareVerbForms` and `LoweredRule.bare` are deleted, and the loader registers exactly the lines an action writes. That is already true of `extend action` (ADR-270 D2), so the two now behave alike. A story verb typed alone fails its slotted rule with the verb matched, and the classifier asks for the missing seat by that verb (ADR-383 D8), so bare `frob` should ask "What do you want to frob?". That is inferred from step 3's probes of standard verbs, not yet probed on a story verb, and AC6 checks it. A standard verb typed alone is untouched by a story's slotted line: bare `take` reaches "What do you want to take?" again. An author who wants the action to answer the bare verb writes the bare line (`take`) in its grammar, as Secret Letter's `releasing` does with `drop`, and scopes it with `while` (ADR-370 D7).

### D6 — What this record does not change

There is still no numeric priority and no ordering construct (ADR-268 D1, D4). `go out` and the other load-bearing orderings stay ordered by definition (ADR-268 D3). The rule gate, slot extent and matching (step 5), and noun resolution (step 6) are not touched. The Chord surface does not change: no construct, no diagnostic, no EBNF change, no `chord-grammar-changes.md` row.

## Consequences

- One comparator decides every match order, and nothing in the parser carries a number that looks like a probability. Step 5's search ranks complete parses with the same comparator plus its own noun score, so there is no inherited confidence to reconcile.
- ADR-268 D2 is superseded in its confidence term and its tier placement. "Story overrides platform" now means the story wins ties, plus explicit removal. It is no longer absolute. **Flip ownership:** the close-out phase of the plan that implements this record writes the one-line amendment note under ADR-268 D2, pointing here, and the trigger is that plan's implementation landing. ADR-268's Status line is left alone: D1, D3 and D4 still stand, and this repository does not flip Status lines unasked.
- **Dungeo's rendered text is predicted to move on `wave hands`. This needs its own ruling from David.** Dungeo's story-tier `wave :target` (`stories/dungeo/src/grammar/ritual-grammar.ts:106`) outranks the standard literal `wave hands` today. ADR-370 D8 records that `wave hands` prints "You can't see any such thing." for that reason. Under D2, the standard line consumes two literal words to the story rule's one, so the standard waving line wins. No Dungeo transcript types `wave hands` (`grep -rn "^> wave"` over `stories/dungeo` finds only `wave stick`, which still ties and goes to the story rule), so the chain cannot see the change. The choice is David's: accept the stock line, or have Dungeo remove the standard line through `grammar.removeRules` in its grammar setup. This record changes nothing in `stories/dungeo`. The prediction comes from the code and has not been probed; AC8 probes it.
- **Measured and ruled (2026-10-24, session b09060, GH #629).** Step 4's Phase 1 static census found every input whose winner D2 moves, and David ruled "a" (accept the standard reading) on each one. Nothing in `stories/` changes.
  - Dungeo, story action → standard action:
    - `wave hands`, `wave hand` (dungeo.action.wave → waving: "You wave. Nobody waves back.");
    - `hit X with Y` (DUNGEO_BREAK → attacking);
    - `dig X with Y` (dungeo.action.dig → digging);
    - `burn X with Y` (DUNGEO_BURN → burning);
    - `say goodbye`, `say farewell` and each with `to X` (dungeo.say → saying_goodbye: "You aren't talking to anyone.").
  - Secret Letter: `pick up X` (buying's `pick the target`, from `extend action buying` → taking) and `jump up` (the story's jumping → standard jumping).
  - No chain line, unit transcript or tree card types any of them.
  - Wumpus `shoot arrow at X` moved at D1 instead: the specific line now binds the target.
- A story line that relied on tier-first to capture a more specific standard phrasing stops capturing it. The implementation measures this on the chain and every tree, and each line that moves is reported with David's ruling: either the story adds `remove from action`, or it accepts the standard reading. The comments that claim the ordering (`grammar-engine.ts:55`, `grammar-builder.ts:533`, `english-parser.ts:403-407`, the story-tier comment in `loader.ts`, and `parser-en-us/CLAUDE.md`'s "confidence → tier → literal specificity → definition order") are rewritten.
- Retiring bare-verb forms changes what a story verb typed alone prints: the action's refusal becomes the seat question. A tree card that pins a bare story verb moves, and each one that moves is reported with its old and new text, not re-recorded quietly.
- Ranking every match costs trying every rule on every successful parse. Failed parses already do that, so the worst case is unchanged.

## Acceptance criteria

1. **D1, real path**: through the real loader and engine, the probe story's `push button` runs `shoving` ("You shove the button."). A parser-en-us test pins that a story rule with a skipped optional outranks a standard rule of equal specificity.
2. **D1**: `grep -rn "confidence"` over `packages/parser-en-us/src`, `packages/if-domain/src/grammar` and `parser-contracts` finds no grammar-match or parsed-command confidence; the engine and stdlib writers are gone; tsc is clean across the tree.
3. **D2**: one comparator is exported from if-domain, the engine and the parser call it, and a test pins its three keys in order with a pair of rules for each key.
4. **D3**: a test registers twelve standard rules matching one input, makes the most specific one the last registered, and asserts that it wins.
5. **D4**: the classifier's answer to `give coin` against the standard grammar is recorded at HEAD before any change, then pinned after it, with any difference reported. A test pins the failure tiebreak by definition order on two failures of equal verb flag and progress.
6. **D5, real path**: through the real loader and engine, the probe story's bare `take` prints "What do you want to take?", `take clock apart` still runs `dismantling`, and a story-only verb typed alone asks for its missing seat. A chord test pins that `lowerActionRules` returns exactly the written lines.
7. **D2 replacement, real path**: through the real loader and engine, with a story `take the thing`, `take off hat` (hat worn) reaches taking off and `take lamp` reaches the story action. Adding `remove from action taking_off` with `take off the item` sends `take off hat` to the story action.
8. **Floor**: tree baseline captured at HEAD before any change; `./repokit build dungeo` exit 0; the walkthrough chain at 952; a Dungeo bundle probe of `wave hands` before and after, with its result taken to David for the ruling in Consequences; every tree identical to the baseline, or each moved card listed with its old and new text and David's ruling; `pnpm exec turbo run test:ci` all green; `./repokit grammar --check` and `manifest --check` fresh.

## Session

Drafted in session b09060 (2026-10-24), `docs/context/session-20261024-1606-chord-4-0.md`. Probe story: `/private/tmp/claude-501/-Users-david-repos-sharpee/c5b810e6-de64-402b-8039-33b7da9cc6cd/scratchpad/ranking/ranking.story`.

# ADR-386: The parser searches slot extents and ranks readings by their nouns

**Status**: **ACCEPTED** (David, 2026-10-25, session 286b20: "Yes", after the open-questions interview resolved Q-1 "a" (the whole world), Q-2 "a" (a failure wins by its nouns alone) and Q-3 "a" (the words are read plainly), and `adr-review` 19/21 with two findings folded the same pass: the passage-command citation corrected to ADR-382 D8's `expandCommands`, and the entity count and matcher-call estimate replaced by the census's measurement and a marked assumption). Written 2026-10-25, session 286b20, on `chord-4-0`, from step 5 of the parser review's recommendation (`docs/work/parser-review/review-20261022.md`, root cause 1). The review orders the steps 2 → 3 → 4 → 6 → 5 → 7, and step 6 (ADR-385, DONE 2026-10-25) put the one noun matcher in place that this step's ranking reads. It fixes A1, A2, A3, A4, A5, A6, A7, A9, A10 and A11 (A8 was fixed by ADR-384 D3). No implementation is authorized.

## Date: 2026-10-25

**Kind**: technical

**Scope**: `packages/parser-en-us` (`src/english-grammar-engine.ts`, `src/english-pattern-compiler.ts`, `src/parse-failure.ts`, `src/english-parser.ts`, `src/slot-consumers/slot-consumer.ts`, `entity-slot-consumer.ts`, `text-slot-consumer.ts`, `typed-slot-consumer.ts`, `vocabulary-slot-consumer.ts`, `index.ts`), `packages/if-domain` (`src/grammar/rule-order.ts`), `packages/lang-en-us` (the cardinal number words, `src/data/`), `packages/parser-en-us/CLAUDE.md`, `docs/architecture/adrs/adr-384-grammar-rules-rank-without-confidence.md` (amendment note under D2), `packages/sharpee/docs/genai-api` (regenerated). Nothing in `packages/world-model`, `packages/stdlib`, `packages/chord`, `packages/story-loader` or `stories/` changes: the matcher is read, not changed; the validator resolves as it does today; no Chord construct, diagnostic or EBNF line moves.

## Parent

- **The parser review**, root cause 1 ("no search over slot boundaries") and findings A1–A11. Step 5 of its recommendation: "slot consumers return candidate end points; the engine searches them (bounded) and scores each complete parse by how well its nouns resolve, through the one noun matcher of step 6. This is the TADS 3 shape at Sharpee's scale."
- **ADR-385**: the one noun matcher, `matchNoun` over a `NamingSurface` (D1); a constrained slot's gate asks it and records the admitted ids on the slot match (D3, D4); a gate failure names the phrase and the reason (D8). This record reads the matcher to rank readings and changes nothing the gate or the validator decides. Step 6's close-out (`plan-20261024-step6-noun-matcher.md`, "Step 5's entry state") names `NounMatch { tier, wordsMatched }` as the available scoring input and `GrammarRank` as its one home.
- **ADR-384**: the one ordering of grammar rules, `compareGrammarRank` (specificity, tier, definition order), with the note that step 5 "ranks complete parses with the same comparator plus its own noun score" (Consequences). This record adds the noun rank above those keys; the keys and their order stand.
- **ADR-383**: a rule declares each slot's seat and the failure classifier asks by the missing seat (D8). A failure that outranks a reading under this record is classified exactly as today.
- **ADR-380 D2**: "articles have to be optional and allowed"; a pattern's article after the verb is free to omit. This record completes the other direction: a typed article the pattern does not spell is free too.
- **ADR-382 D4, D8**: the compiled pattern is the one source of a rule's elements; a passage's commands are expanded by `expandCommands` and each expanded form reaches the builder as word parts (`registerPassageGrammar`, `story-loader/src/loader.ts:1721-1746`, `commandParts(form)` per form), so a passage line's alternation and optionals never reach the engine as one rule.
- **ADR-088**: slot consumers behind a registry. The review found this "the right extension point; the search in root cause 1 belongs inside it".

## Context — measured, not assumed

**A slot's extent is decided once, from the next pattern element, and nothing is retried.** `EntitySlotConsumer.itemSpan` (`packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts:368-376`) takes every token up to the list conjunction or the first token equal to the next pattern literal. When the next element is another slot, `consumeItem` with `shortest` (`:311-328`) takes the first content word alone, or with a gate the shortest content span the gate admits, and `consumeEntityWithListDetection` passes `shortest` only for the first item (`:209`). The topic consumer stops at the next literal the same way (`text-slot-consumer.ts:160-166`). The grammar engine's single left-to-right pass (`english-grammar-engine.ts:197-338`) takes an optional element when it matches and skips it when it does not (`:211-214`, `:243-245`, `:271-273`, `:303-306`), once, and a slot's result is final (`:333-335`). The quick reject (`:154-174`) counts every non-optional pattern token, articles included (`english-pattern-compiler.ts:142`), and recognises the verb only when the first pattern token is a literal (`:156`). A number slot takes one token (`typed-slot-consumer.ts:43-74`). The tokenizer splits on whitespace only (`english-parser.ts:644`), so `sword,` is one word, and `parseChain` splits a comma into two commands only when a verb follows it (`:508-570`).

**What a player sees, measured.** On the bundle at cb5a51217 (2026-10-25, this session). The probe story is `/private/tmp/claude-501/-Users-david-repos-sharpee/351d820c-9571-41c4-83d7-f8a886d7f514/scratchpad/search/search.story`: a workshop with an old man, a sword, a brass lantern, a gold coin (`aka coin`), a pair of dice, an open box and an open chest (containers), a "jack in the box" (`aka jack`), a "salt and pepper shaker" (`aka shaker`), a scenery rope and knob, an iron key and a door; a passage `climb rope` / `follow or trace the cables` up to a loft; and four story actions: `offer the recipient the item` with `the item must be held`, `stow the item [carefully] in the container`, `scan [up] the word` with `the word is a topic`, and `push or press the knob`. The script `probe-a.sh` beside it runs each group on a fresh game at seed 7 (`baseline-a.txt`).

```
> give old man coin                       (coin held; standard `give the recipient the item`)
You can't see any such thing.             ← recipient "old", item "man coin" (A1)
> give the old man the sword
You can't see any such thing.             (A1)

> offer the old man dice                  (dice held; `offer the recipient the item`, item must be held)
You can't see any man dice here.          ← recipient "the old" (the gate admits "old"), item "man dice" (A2)

> stow lantern in box                     (`stow the item [carefully] in the container`)
Stow it where?                            ← the item swallowed "lantern in box" (A3)
> stow lantern carefully in box
You stow the brass lantern in the box.

> scan up                                 (`scan [up] the word`, a topic)
Scan up it where?                         ← `up` taken as the optional, the topic missing (A4)

> put jack in the box in chest            (jack held; `put the item in or into or inside the container`)
You can't see any such thing.             ← item "jack", container "the box in chest" (A5)

> unlock door with                        (key held)
You can't see any such thing.             ← `unlock the target` with "door with" beats `unlock … with the key`'s missing key (A6)

> take salt and pepper shaker
Taken.                                    ← two items, "salt" and "pepper shaker", both naming the shaker at the words tier (A7)
> take sword, lantern
You can't see any such thing.             ← one phrase, "sword, lantern" (A7)
> take coin and
I don't understand that.                  (A7)

> climb rope
Loft                                      (the passage)
> climb the rope
You can't climb the rope.                 ← the article bypasses the passage; standard climbing (A10)

> press knob                              (`push or press the knob`)
You press the knob.                       ← no quick reject: a Chord slot carries no article literal, so the pattern has two required tokens
```

`take salt and pepper shaker` takes the shaker only because both halves name it (ADR-385 D5 takes each entity once). With a separate "salt" in the room the same input would take the salt and the shaker. The A9 case needs an alternation on the verb *and* a written article or a short input: Chord emits one rule for an action line's `push or press` (`packages/chord/src/parser.ts:6050-6069`, "one alternation element, emitted as ONE rule") but spells no article literal in an action line; a passage line's `follow or trace the cables` is expanded into one rule per form before it reaches the engine (ADR-382 D8), which is why `trace cables` and `trace the cables` both take the passage on the probe; and the standard grammar (`packages/parser-en-us/grammar/standard-en-us.story`) has no alternation at the verb. So A9 reaches a player only through a TypeScript `.define('push|press …')` or a bare alternate verb (`press` alone against `push|press :target`: 1 token against 2, verb unrecognised, so "I don't understand that." instead of the seat question). A11 has no Chord instance either: the standard `set the target to the value` declares the value a topic (`standard-en-us.story:690`), so only a TypeScript number slot is affected.

**Dungeo's exposure is real but unmeasured.** Dungeo's grammar has no gated slot and no number slot, but it uses the standard two-slot and prepositional lines (`give`, `put … in`, `take … from`, `unlock … with`), optionals, and typed lists of one item. Every chain, unit and tree input that admits more than one reading under this record is found by the plan's Phase 1 census. This record takes the platform past anything Dungeo required of it, so Dungeo's lines follow it (David, 2026-10-25, root `CLAUDE.md`): a Dungeo line the search moves is re-recorded once the census is reviewed, and only a move that looks like a defect, or a move on an input the search does not touch, comes to David for a ruling.

## Decision

### D1 — A slot consumer returns every extent it admits

`SlotConsumer.consume` returns the readings of the slot from its start: every token span the consumer admits, each a `SlotMatch` as today, in the consumer's preference order (`SlotConsumeResult` becomes `{ readings: SlotMatch[] } | SlotRefusal | null`). An entity consumer admits every span that ends before the input ends, with the list readings D6 describes; a gated item admits a span only when the gate admits something for it (ADR-385 D3, with the admitted ids on the match, D4), and when no span is admitted the consumer returns the refusal for the longest span (D8 of ADR-385, unchanged). A topic or greedy text consumer admits every span to the end of the input; a single-token text consumer one; a quoted-text consumer the quoted span; a typed or vocabulary consumer the spans its vocabulary reads (one token today; D8 below widens numbers). The engine, not the consumer, decides which reading survives. Nothing a consumer returns depends on the next pattern element: the delimiter rule and the `shortest` rule are deleted.

### D2 — The grammar engine searches, bounded

A rule's readings are every way its elements consume the whole input: each optional element taken or skipped, each pattern article after the verb taken or skipped (ADR-380 D2, as today), each slot at each extent its consumer admits. The engine walks the pattern with backtracking and collects every complete reading; a reading that leaves tokens is not one. Search order is the order today's rule would choose, so a tie under D5 reproduces today's reading: an optional or article is taken before it is skipped; a slot followed by any further element tries shorter extents first (today's rule stops at the first occurrence of the next literal, and at one word before another slot); a slot that ends the pattern tries longer extents first (today it takes the rest of the input). *(Corrected 2026-10-25, session 286b20, from the step 5 planner's reading of `entity-slot-consumer.ts:368-376`: the draft said every slot not before another slot tried longer extents first, which would have moved `put jack in the box in chest` before the noun rank existed and did not reproduce today's reading.)* The readings of one rule are capped at a named constant in the engine (`MAX_READINGS_PER_RULE`, 256): past it the readings found so far stand and a debug event names the rule, never silently. Failures are recorded as today, from the furthest point the search reached, with the consumed slots' matches attached for D5.

### D3 — Articles are optional in both directions

A typed article directly before a pattern literal the pattern does not spell is skipped, as a pattern's article the player left out already is (`english-grammar-engine.ts:207`, `:239-242`). A passage written `climb rope` matches `climb the rope`; an action line `take the item off` still matches `take lamp off`. Inside a slot the consumer splits articles already (ADR-385 D2); nothing new happens there. A pattern's first word is never an article (ADR-380), and an input's first word is matched as the verb.

### D4 — Every reading is ranked by its nouns, through the one matcher

Each entity item of a reading (a single noun, each list item, each exclusion, an all phrase, a pronoun) has a set of *names*: the entities it names. A gated item's names are the ids its gate admitted (ADR-385 D4). An ungated item's names are the entities among everything in the world, the observer included, that `matchNoun(namingSurfaceOf(world, entity, actorId), item)` names at the best tier any of them reaches (exact if any is exact, else words), the rule world-index's `resolvePhrase` already follows (ADR-385 D10). *(Q-1 resolved by David, 2026-10-25, session 286b20: "a". The whole world, not the actor's sight: the parser's choice of words never depends on the room, an old man in another room still reads as `old man` + `coin`, and the validator refuses him by scope as it does any single out-of-scope noun. A base of what the player has encountered was raised and not taken: the whole world gives the same reading for everything encountered, and the world was not checked for a record of what the player has seen.)* A pronoun's names are its referents, exact. An all phrase is one name, exact. A typed, vocabulary or direction slot is one name when its consumer read it. Text, topic and quoted slots have no items.

A reading's **noun rank** is `{ unnamed, named, exact }`: the number of items naming nothing, the number of distinct entities its items name, and the number of items named at the exact tier. `unnamed` is compared first (fewer first), across every rule; `named` (more first) and `exact` (more first) break ties only after ADR-384's keys, which in practice means between readings of one rule (D5). *(Corrected 2026-10-25, session 286b20, from the Phase 1 census model: the draft compared `named` first, which put any slot reading that names something above a rule with no slots at all. A passage is such a rule, so `climb rope` and `climb the rope` would have gone to standard climbing whenever the rope is also a scenery entity, against AC9 and ADR-378 D2. A rule without entity items has nothing unresolved; what the rank must punish is a reading that fills a slot with words naming nothing.)* So `give old man coin` reads as `old man` + `coin` (two named) over `old` + `man coin` (one named, one unnamed); `put jack in the box in chest` reads as `jack in the box` + `chest`; `take salt and pepper shaker` reads as one item (one named, exact) over two items naming the same shaker at the words tier (one named, none exact), and in a room that also holds a salt it reads as two items, the salt and the shaker, because two names beat one *(Q-3 resolved by David, 2026-10-25, session 286b20: "a". "We parse straight up and let the author play stupid parser games": the parser reads the words plainly and does not privilege a single item over a list of the same words; an author who names a thing with a list separator inside it beside a thing named by its first word owns that)*; `stow lantern in box` reads with the optional skipped because the reading that takes it does not complete.

The parser ranks; the validator resolves. A reading's names decide which words fill each slot and nothing else: the validator still resolves each phrase in the action's scope, with its own tiers, dominance, `my` narrowing, exact-out-of-scope rule and prompts (ADR-385 D5, the `README` in `packages/stdlib/src/validation`), and an ungated item's names are never passed to it. A phrase that names something elsewhere in the world is read correctly and refused by the validator by scope, which is today's answer for a single noun.

### D5 — One comparator: the noun rank, then specificity, tier and definition order

`GrammarRank` (`packages/if-domain/src/grammar/rule-order.ts`) gains the noun rank, and `compareGrammarRank` compares `unnamed` before `literalSpecificity`, `tier` and `definitionIndex` (ADR-384 D2's keys, in ADR-384 D2's order), and `named` then `exact` after them. The engine ranks every complete reading of every rule with it; the first is the parse. Within one rule's readings ADR-384's keys tie, so `named`, `exact` and then D2's search order decide. *(Order corrected 2026-10-25, session 286b20, with D4's correction: `unnamed` is the only noun key above specificity, so a passage's literal line still beats a standard slot reading of the same words.)*

**A failure can outrank a reading, by its nouns alone.** The best verb-matched failure (ranked as today: verb matched, progress, then the comparator, ADR-384 D4, its consumed items' noun rank included) wins over the best complete reading only when it names strictly more distinct entities than that reading does. `unlock door with` then asks for the key (`unlock the target with or using the key` consumed `door`, one name; `unlock the target` read `door with`, no name), while `take widget` and `look at sky` still reach the validator's "You can't see any … here." (no failure names more than nothing) and `take coin and` reports the leftover word rather than an item named `coin and`. This is the only place a failure is compared with a match, and it is the parser's (`english-parser.ts`, where it takes `candidates[0]` today), not the engine's. *(Q-2 resolved by David, 2026-10-25, session 286b20: "a". The condition is the nouns alone; the failure need not have consumed the whole input, and a complete reading does not always win.)*

### D6 — `and` and a comma separate list items as readings, never as hard splits

The tokenizer gives a comma its own token. Inside an entity slot, `and`, `,` and `, and` are list separators: the consumer admits the single-item reading across them and the list reading split at them, and D4's rank decides (`knife and lamp` names two things as a list and nothing as one item; `salt and pepper shaker` names one thing either way and the exact single item wins). A separator with no item after it closes no item and belongs to no extent. `take knife, lamp` becomes a list of two; `parseChain`'s rule that a comma followed by a verb separates commands stands.

### D7 — The quick reject counts what the match requires

A pattern's `minTokens` discounts the articles after its first element, since the matcher never requires them, and the short-input verb test recognises an alternation as well as a literal. A bare alternate verb (`press` against `push|press :target`) reaches the matcher and asks for its missing seat (ADR-383 D8), as a bare literal verb does.

### D8 — A number slot reads a compound number

The language owns how number words compose: `lang-en-us` gains `parseCardinal(words: readonly string[]): number | null` beside `cardinalNumbers`, reading digits, a single number word, a hyphenated or two-word tens-and-units compound (`twenty five`, `twenty-five`) and nothing else. The number consumer admits every span `parseCardinal` reads as one number, longest first, and `extractNumberValue` calls it. Ordinals, times and directions stay one token.

### D9 — What this record does not change

The validator's resolution, the gate (ADR-385 D3, D4), its refusals (D8) and `SlotMatch.scope` keep their meaning. ADR-384's keys and their order stand below the noun rank; nothing else in the ordering moves. No Chord construct, diagnostic, EBNF line or `chord-grammar-changes.md` row changes; the IDE and the wire are untouched. The English word lists this record touches (the list conjunction, number words) stay where they are until step 7.

## Consequences

- One search decides extents and one comparator decides the parse; no slot ever ends at "the next literal" and no optional is "tried once". A1–A7, A9, A10 and A11 are fixed by construction, and each has a probe line.
- **The parse of an input can change wherever today's first-fit reading differs from the best-ranked one.** That is the point, and it moves rendered text: a two-slot line that split wrongly now resolves; a line that reached a junk phrase now reaches the right one; `take knife, lamp` becomes a list; an input of the A6 class prints a seat question instead of the validator's refusal. The implementation measures this on the chain, every tree and Dungeo's unit transcripts (Phase 1 census: every input with more than one reading, old and new). **Dungeo is a regression floor only up to its own requirements** (David, 2026-10-25): a Dungeo line the search moves is re-recorded after the census is reviewed, and a move that looks like a defect comes to David; a move on an input the search does not touch is a regression and stops. A Chord tree card that moves still goes to David with its old and new text.
- The parser reads every entity in the world for each ungated item of each reading. For an input of n tokens and a rule with k slots and m optionals the readings are at most n^k · 2^m, capped by D2. Dungeo's world holds 155 things plus its rooms and NPCs (step 6's Phase 1 census, `--world-json`, `plan-20261024-step6-noun-matcher.md`), and its inputs run two to six words, so a two-slot rule is assumed to cost on the order of a thousand `matchNoun` calls per rule that matches its verb; that is an estimate, not a measurement. The implementation measures the chain's wall time before and after (AC12); a prefilter by first content word (world-index's `byWord`) is the known remedy if it is needed, and is not part of this record.
- ADR-384 D2 is amended: the noun rank sits above its keys. **Flip ownership:** the close-out phase of the plan that implements this record writes the amendment note under ADR-384 D2, and the trigger is that plan's implementation landing. ADR-384's Status line is left alone.
- `SlotConsumeResult` changes shape, so every consumer and the engine's one call site change together; a test fixture that builds a consumer result by hand fails to compile until updated. No backward compatibility.
- Parser tests that pin today's extents (the `shortest` rule, the delimiter rule, an optional taken once) are rewritten to pin the ranked reading.
- A failure outranking a match is a new kind of answer for the player, and D5 bounds it to one condition. Q-2 asks whether that bound is right.

## Acceptance criteria

1. **D1, D2**: a parser-en-us test registers one two-slot rule and asserts that the engine collects every reading of a four-word input and returns them ranked; a test pins the cap and its debug event. `grep` finds no `isPatternDelimiter` and no `shortest` in the slot consumers.
2. **A1, real path**: through the real loader and engine, the probe story's `give old man coin` and `give the old man the sword` give the coin and the sword to the old man; `hand the old man dice` gives the dice.
3. **A2, real path**: `offer the old man dice` (dice held) prints "You offer the pair of dice to the old man."
4. **A3, A4, real path**: `stow lantern in box` prints "You stow the brass lantern in the box."; `scan up` runs `scanning` with the topic `up`. A parser test pins that an optional element is retried skipped after it was taken.
5. **A5, real path**: `put jack in the box in chest` (jack held) puts the jack in the chest, asserted on the world.
6. **A6, D5, real path**: `unlock door with` (key held) asks for the key through the seat question; `take widget` prints "You can't see any widget here."; `look at sky` prints the validator's refusal, not a seat question. A parser test pins that a failure outranks a reading only when it names more.
7. **A7, D6, real path**: `take sword, lantern` takes both; `take salt and pepper shaker` takes the shaker, once; with a separate salt added to the fixture, the same input takes the salt and the shaker; `take coin and` yields no item whose text is `coin and`.
8. **A9, D7**: a parser-en-us test registers `push|press :target` and asserts `press button` matches and bare `press` asks what to press; a test pins `minTokens` discounting a pattern article.
9. **A10, D3, real path**: `climb the rope` takes the passage to the Loft.
10. **A11, D8**: a lang-en-us test pins `parseCardinal` on `25`, `twenty`, `twenty five`, `twenty-five` and a non-number; a parser test registers `set :target to :n` with a number slot and asserts `set dial to twenty five` yields 25.
11. **D4**: a parser test pins the noun rank on fixtures: two named over one; fewer unnamed; exact over words; a pronoun and an all phrase as names; a topic slot contributing nothing. A test pins that `compareGrammarRank` compares the noun rank before specificity.
12. **Floor**: tree baseline captured at HEAD before any change; `./repokit build dungeo` exit 0; every tree identical to the baseline, or each moved card listed with its old and new text and David's ruling; the walkthrough chain and Dungeo's unit transcripts compared with the baseline, every moved line listed with its old and new text, the census's reading of each (the search's work, or a defect), and the chain re-recorded after review, with defects and moves on untouched inputs taken to David; the chain's wall time recorded before and after; `pnpm exec turbo run test:ci` all green; `./repokit grammar --check`, `manifest --check`, `aliases --check` and `protocol --check` fresh.

## Session

Drafted in session 286b20 (2026-10-25), `docs/context/session-20261025-1316-chord-4-0.md`. Probe story, script and baseline: `/private/tmp/claude-501/-Users-david-repos-sharpee/351d820c-9571-41c4-83d7-f8a886d7f514/scratchpad/search/` (`search.story`, `probe-a.sh`, `baseline-a.txt`).

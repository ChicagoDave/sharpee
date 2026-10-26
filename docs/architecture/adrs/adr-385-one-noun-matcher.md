# ADR-385: One noun matcher, called by every reader that asks which entity a phrase names

**Status**: **ACCEPTED** (David, 2026-10-24, session de76ce: "yes", after the open-questions interview and `adr-review` 9/14 with three findings folded the same day: the Scope widened to every `INounPhrase.candidates` writer and `SlotMatch`, the `NounQuery`, `SlotMatch.scope`, `details.tokens` and `requiredScope` contracts named, and the hold stated unsaved). Q-1 resolved by David, 2026-10-24, session de76ce: "a" (a tied list item prompts like a single noun), then "a1" (this record also makes the prompt answerable, D11, once it was found that no answer path exists for any prompt). Written 2026-10-24, session de76ce, on `chord-4-0`, from step 6 of the parser review's recommendation (`docs/work/parser-review/review-20261022.md`, root cause 5). The review orders the steps 2 → 3 → 4 → 6 → 5 → 7, so this step comes before step 5's search. That search scores each complete parse with this matcher. It fixes E1, E2, E3, E5, E6, E7, E8, E9 and part of E4. No implementation is authorized.

## Date: 2026-10-24

**Kind**: technical

**Scope**: `packages/world-model` (`src/traits/identity/` — the matcher beside `name-vocabulary.ts`; `src/commands/parsed-command.ts`, `validated-command.ts`), `packages/engine` (`src/command/command-executor.ts`, `src/turn/held-command.ts`, `src/game-engine.ts`'s held command), `packages/parser-en-us` (`src/grammar-scope-resolver.ts`, `src/slot-consumers/entity-slot-consumer.ts`, `src/english-parser.ts`, `src/english-grammar-engine.ts`, `src/parse-failure.ts`, `src/pronoun-context.ts`), `packages/stdlib` (`src/validation/command-validator.ts`, `src/helpers/multi-object-handler.ts`), `packages/if-domain` (`src/grammar/scope-builder.ts`, `grammar-builder.ts` including `SlotMatch`), `packages/lang-en-us` (`src/data/messages.ts`), `packages/world-index` (`src/vocabulary.ts`), `packages/sharpee/docs/genai-api` (regenerated). Every writer of `INounPhrase.candidates`, which D2 deletes: in src `packages/parser-en-us/src/english-parser.ts`, `packages/stdlib/src/actions/enhanced-context.ts`, `packages/stdlib/src/validation/command-validator.ts` and `packages/engine/src/command/action-context-factory.ts`; test fixtures in world-model, stdlib, `packages/character`, `packages/extensions/basic-combat` and `stories/dungeo` (`combat/melee-villain-blow`, `traits/troll-axe-behaviors`, `actions/stealing/stealing-action`, test files only). `packages/stdlib/src/actions/standard/removing/removing.ts` (D5) and `packages/engine/src/ports/parser-interface.ts` (D7). *(Corrected 2026-10-24 from the plan's Phase 1 census: the draft named `world-model/src/traits/vehicle/aboardTrait.ts` and `stories/dungeo/src/handlers/carousel-exit-resolver.ts`, which carry a computed exit's `candidates`, not a noun phrase's.)*

## Parent

- **The parser review**, root cause 5 ("three noun matchers that disagree") and findings E1–E9. Step 6 of its recommendation: "the validator's word-tier matcher, extracted to one home, called by the parse-time gate (filtered by scope base), by list and `all but` expansion, and by the search's scoring; pronouns pass the same gate; determiners and articles split once by the English parser and nowhere else."
- **ADR-231 D3 and PIN 2**: the tiered model — EXACT (the whole phrase equals a name, an alias or the type) above WORDS (every content word of the phrase is in the entity's vocabulary), more matched words winning within a tier, and a phrase word that matches nothing disqualifying the entity. This record moves that model and does not change it.
- **ADR-273**: the scope bases call the world's real visibility, reachability and carried surfaces, and fail closed. They stay as they are.
- **ADR-080 and ADR-089**: multi-object commands and pronouns. ADR-080 left list resolution to the action (`expandMultiObject`); this record moves it into the validator.
- **ADR-321 D5**: world-index's Incomplete view resolves a phrase "the way the parser resolves a player's command" by mirroring the validator. After this record it calls the matcher instead.
- **ADR-225 as amended (GH #318)**: the held command. A missing-object question holds the incomplete input, and the next input that is not a command of its own is spliced onto it. D11 holds a tied phrase the same way.
- **ADR-384**: step 4's comparator. A complete parse's rank does not read nouns yet. Step 5 decides whether this matcher's answer becomes a ranking key.

## Context — measured, not assumed

**Three matchers answer the same question, and they disagree.**

- The **parse-time gate** (`GrammarScopeResolver.findEntitiesByName`, `parser-en-us/src/grammar-scope-resolver.ts:299-338`) takes the entities in the slot's scope base and accepts any whose name or alias equals the phrase, then any whose name or alias *contains* it as a substring (`:319-323`). Adjectives are ignored. The articles `the`/`a`/`an` are stripped by its own regex (`:332`). Every Chord `must be held`/`reachable`/`visible` lowers to this gate and nothing else (`story-loader/src/loader.ts:3052-3067`).
- The **validator** (`CommandValidator.matchEntityName`, `stdlib/src/validation/command-validator.ts:735-803`) applies ADR-231's tiers over the name, the aliases, the type, the authored adjectives (`getEntityAdjectives`, `:1297`, per side for walls) and the self words (`SELF_WORDS`, `:68`). It strips articles with its own table (`QUERY_ARTICLES`, `:72`) and infers modifiers with a third list repeated three times (`nonModifiers`, `:563`, `:912`, `:1050`). It does not see lists: a direct object marked `isAll` or `isList` is skipped (`:187-190`).
- The **list and `all but` expander** (`stdlib/src/helpers/multi-object-handler.ts`) matches a list item by exact equality of its head word with the whole name or an alias (`:184-192`), and an exclusion the same way (`getExcludedNames`, `:56-62`; `:140-148`). An item that matches nothing is skipped without a word (`:200`).

A fourth copy, world-index's `resolvePhrase` (`world-index/src/vocabulary.ts:112-128`), re-implements the two tiers over the Story IR for the IDE's Incomplete view. Its header says it "mirrors the validator, it does not govern it".

**What a player sees, measured.** On the bundle at 6f3528f84 (2026-10-24, this session). The probe story is `…/scratchpad/nouns/nouns.story`: a workshop with a brass lantern, a sword, a pepper shaker, a brass clock, a pair of dice and a scenery wall clock, plus a story action `winding` with grammar `wind the target` and `the target must be held`. The player first takes the brass clock and the dice.

```
> take brass lantern and sword
Taken.
> inventory
You are carrying:
a brass clock, pair of dice, sword                ← the lantern was dropped without a word (E1)

> take all but the brass lantern
a brass lantern: Taken.                           ← the exclusion matched nothing (E1)
a sword: Taken.
a pepper shaker: Taken.

> take everything
You can't see any such thing.                     ← "everything" is a noun (E6)

> wind clock
Which do you mean: the brass clock or the wall clock?
                                                  ← the gate admitted only the held clock; the validator
                                                    searched again, without the gate's scope (new; see below)
> wind ice
You can't see any such thing.                     ← the gate passed it ("dice" contains "ice"); the validator refused (E2)
> wind my clock
You can't see any such thing.                     ← `my` reaches both matchers as a name word (E7)
> take my lantern
You can't see any such thing.                     (E7)

> take sword and lantern
Taken.                                            ← only the sword: "lantern" is not the whole name "brass lantern" (E1)
> drop them
You can't see any such thing.                     ← a list never sets `them` (E4)
```

**The gate's answer is thrown away.** `wind clock` is a defect the review did not list. The gate found exactly one held clock, and the validator then resolved "clock" across everything visible, because Chord's `must be held` reaches only the gate, while the validator reads the action's own `directObjectScope`. The gate records what it found in `context.slots` (`entity-slot-consumer.ts:466-467`), and nothing reads that. So the gate is a yes/no filter, and two matchers resolve the same phrase with two different scopes.

**A tied list item resolves silently.** Measured at the plan's Phase 1, with a brass key and a silver key in reach: `take sword and key` prints "a sword: Taken. a brass key: Taken." No prompt is given, because the list expander takes the first entity whose name or alias equals the head word.

**Articles and determiners are split everywhere except where they should be.** The English parser splits leading articles into `INounPhrase.articles` (`english-parser.ts:1006`, ADR-231 D3) and leaves `determiners: []` and `modifiers: []` on every phrase it builds (`:857-860`, `:876-879`, `:892-895`). The language already declares its determiners (`lang-en-us/src/data/words.ts:66-72`, served by `getDeterminers()`) and its words for "all" and "except" (`language-provider.ts:546-547`: `all`, `everything`, `every`; `except`, `but`). The slot consumer ignores those and hard-codes `all` (`entity-slot-consumer.ts:53`) and `but`/`except` (`:143`).

**Pronouns skip the gate.** A pronoun is resolved from the pronoun context before the slot consumer looks at constraints, and the resolved entity id goes straight into the slot (`entity-slot-consumer.ts:38-49`, `:94-108`). So a carried-only rule accepts `wind it` when `it` is an unplaced spool (E3, probed by the review). A pronoun is tried only when it is the slot's first word, and it claims the whole slot, so `take her key` and `take it and the box` fail as syntax (E5).

**Pronoun context is set by slot order.** `updateFromCommand` processes the direct object, then the indirect object, then the instrument (`pronoun-context.ts:217-229`), and each one overwrites `it` (`:274`). So after `unlock door with key`, `it` is the key. A plural thing sets `them` to one entity (`:272`), and a list or `all` never sets it. `turnNumber` is stored on every reference and read by nothing (E4).

**A disambiguation prompt cannot be answered.** When the validator returns `AMBIGUOUS_ENTITY`, the executor emits a `client.query` event carrying the candidates and returns (`engine/src/command/command-executor.ts:331-358`). Nothing in engine, bootstrap or the clients reads an answer. The only held input is GH #318's missing-object hold (`engine/src/turn/held-command.ts`), which splices the next input onto the end of the held one. Measured on the same bundle and probe story, with the brass clock held:

```
> x clock
Which do you mean: the brass clock or the wall clock?
> brass
I don't understand that.
> x clock
Which do you mean: the brass clock or the wall clock?
> the wall clock
I don't understand that.
```

**The gate's failure names the wrong word and the wrong reason (E8).** A failed slot reports `reason: 'NO_MATCH'` and `unknownWord: remainingTokens[0]` (`english-grammar-engine.ts:321-326`), so `wind the clock` names "the". `SlotFailure.reason` also declares `SCOPE_VIOLATION` and `AMBIGUOUS` (`parse-failure.ts:32`), and the classifier maps both (`:152-175`), but nothing produces either. A visible clock that is not held reads "You can't see any "clock" here."

**Scope builder no-ops (E9).** `orRule()` pushes onto `includeRules` (`if-domain/src/grammar/scope-builder.ts:61-63`) and nothing reads it. `kind(k)` adds a property filter `{ kind }` (`:50-53`) that compares a field no entity carries, so it yields nothing. Neither has a caller outside tests.

## Decision

### D1 — One matcher, in world-model, over a naming surface

One pure function decides whether a noun phrase names an entity, and how well: `matchNoun(surface, query)` returns `{ tier, wordsMatched }` or `null`. The tiers and their order are ADR-231 D3's, unchanged: the self words name the observer at EXACT; EXACT is the whole phrase equal to the name, an alias or the type, tried first with the leading articles restored (so "The Grail" survives) and then without them; WORDS is every content word of the phrase found in the vocabulary; any phrase word found nowhere returns `null`.

The contract:

```typescript
interface NamingSurface {
  name: string;
  aliases: readonly string[];
  adjectives: readonly string[];
  type?: string;
  isObserver: boolean;          // the self words name this entity
}
interface NounQuery {
  text: string;                 // the phrase without articles or determiners (D2)
  articles: readonly string[];  // the leading articles the parser split off, for the article-first EXACT try
}
interface NounMatch { tier: 'exact' | 'words'; wordsMatched: number; }

function matchNoun(surface: NamingSurface, query: NounQuery): NounMatch | null;
function namingSurfaceOf(world: WorldModel, entity: IFEntity, observerId: EntityId): NamingSurface;
```

An `INounPhrase` is a `NounQuery` as it stands, so readers that hold a phrase pass it directly.

The function reads a **naming surface**, not an entity. A second function, `namingSurfaceOf(world, entity, observerId)`, builds it from the world. That function is the only code that knows walls have per-side adjectives (ADR-173) or who the observer is. The vocabulary is a derivation, never stored, as `deriveNameVocabulary` already guarantees.

Both functions live in `packages/world-model/src/traits/identity/`, beside `name-vocabulary.ts`. Every reader can import from there: parser-en-us, stdlib and world-index all depend on world-model, and world-model depends on neither of them. The validator's `matchEntityName`, `getEntityVocabulary`, `getEntityAdjectives`, `getEntitySynonyms` and `SELF_WORDS` move there and are deleted from stdlib.

The self words and `NAME_VOCABULARY_STOPWORDS` are English. They live in that one module now, and step 7 (language and state) moves them to the language. This record does not make them language-owned.

### D2 — The English parser splits articles and determiners, once

The English parser fills `INounPhrase.articles` and `INounPhrase.determiners` from the language's own lists (`getSpecialVocabulary().articles`, `getDeterminers()`). It sets `text` and `head` to what remains and `modifiers` to the remaining words before the head. Nothing downstream strips an article or a determiner again:

- the gate's regex (`grammar-scope-resolver.ts:332`) is deleted;
- the validator's `QUERY_ARTICLES` and `stripLeadingArticles` are deleted, and so are its three `nonModifiers` lists, which read `modifiers` instead;
- the dead `INounPhrase.candidates` (always `[text]`) is deleted.

A determiner does not name anything. The one determiner that narrows is `my`: it restricts the phrase to what the actor carries or wears (`take my lantern`, `wind my clock`). The other determiners (`this`, `that`, `some`, `his`, …) are split and ignored here. Narrowing them is not this step's work.

The words for "all" and "except" come from the language (`getSpecialVocabulary().allWords`, `exceptWords`). The slot consumer stops hard-coding them, so `take everything` is `take all`. `all` followed by noun words means every candidate the matcher names among the expansion (`take all coins` takes the coins). It does not recognise plurals: "coins" matches an entity only when its vocabulary holds "coins".

### D3 — The parse-time gate asks the matcher

`GrammarScopeResolver.findEntitiesByName` becomes: the entities in the constraint's scope base, after its filters, that `matchNoun` names at any tier. Substring matching is deleted, so `wind ice` no longer passes the gate through "dice". An adjective now counts at the gate as it does in the validator, so a TypeScript story's `brass` adjective admits `wind brass clock`. The unread `context.slots` write (`entity-slot-consumer.ts:466-467`) is deleted.

The gate stays a filter over candidate *extents*. Which split of `give old man coin` wins is step 5's search, and it is not settled here (A1, A2).

### D4 — The gate's answer travels to the validator

When a constrained slot admits entities, the entity slot consumer records their ids on its match, as `SlotMatch.scope?: string[]` (if-domain, `grammar-builder.ts`). For a list, each item's `SlotMatch` carries its own. The English parser copies them onto the noun phrase it builds, as `INounPhrase.scope?: EntityId[]` (world-model, `parsed-command.ts`), beside the existing `entityId` it copies the same way. The validator resolves such a phrase only among its own candidates that are also among those ids: same tiers, same dominance rule, same disambiguation. The set narrows the validator's candidates and never adds to them, so a room the gate admits stays out wherever the validator leaves rooms out (wumpus `shoot wumpus` admits the region "Wumpus Caves" at the gate, measured at Phase 1). A phrase with no `scope` (an unconstrained slot) is resolved as it is today. So `wind clock` resolves the held brass clock, and the wall clock is never asked about.

This is the only new field. The two layers then agree by construction: the validator never finds an entity the gate rejected, and never misses one the gate admitted.

### D5 — Lists and exclusions resolve in the validator, through the matcher

The validator stops skipping lists. Each list item is resolved by the same path as a single noun (`resolveEntity`: scope, tiers, dominance), and the validated command carries the results in order, as `IValidatedCommand.directObjects: IValidatedObjectReference[]`. An item that names nothing fails the command with `ENTITY_NOT_FOUND` naming that item, so none is dropped silently. `take brass lantern and sword` takes both; `take sword and lantern` takes both.

`expandMultiObject` reads `directObjects` for a list instead of matching text again. For `all but`, it removes every candidate that the matcher names for any exclusion phrase. An exclusion that names nothing removes nothing. `getExcludedNames` and both head-word comparisons are deleted. The removing action's own `all but` filter (`stdlib/src/actions/standard/removing/removing.ts:232-237`, whole-name equality, no aliases) takes the same rule, so `all but` means one thing in every action. *(David, 2026-10-24, "R1 a", from the Phase 1 census.)*

An item that ties between two entities prompts exactly as a single noun does: the validator returns `AMBIGUOUS_ENTITY` with that item's candidates and its token span, and the prompt is answered through D11. `take sword and key`, with a brass key and a silver key in reach, asks "Which do you mean: the brass key or the silver key?". *(Q-1, resolved by David, 2026-10-24, "a". Rejected: failing the command without a prompt, which makes a list behave differently from its nouns, and taking the top-scored entity silently, which is the silent wrong answer this record removes.)*

`and` inside a name (`take salt and pepper shaker`, A7) is slot extent, and stays with step 5.

### D6 — A pronoun is a whole noun phrase, and it passes the gate

A recognised pronoun is a pronoun only when it is the whole item. Followed by more noun words it is a determiner (`her key` is the determiner `her` and the noun `key`, D2). Each item of a list may be a pronoun (`take it and the box`). A pronoun's entity in a constrained slot must be one of the entities the slot's scope base admits; otherwise the slot fails exactly as a name would, and `wind it` with an unplaced spool does not match the held-only rule (E3).

### D7 — Pronoun context follows the command's roles

After a command, `it` (or the animate pronoun) is set from the **direct object**. Only when there is none is it set from the indirect object, and then the instrument. So after `unlock door with key`, `it` is the door. A list sets `them` to every entity in `directObjects`, so `take sword and lantern. drop them` drops both. `EntityReference.turnNumber`, which nothing reads, is deleted, and so is the `turnNumber` parameter that feeds it: `updatePronounContext` and `registerPronounEntity` on engine's parser port (`engine/src/ports/parser-interface.ts:51-76`, documented "for context decay", which was never built) and on `EnglishParser`, with their callers. *(David, 2026-10-24, "R2 a", from the Phase 1 census.)*

`take all. drop them` still does not work. The expansion of `all` happens inside the action, after validation, and the pronoun context never sees it. Moving `all` expansion into the validator is a larger change than this step makes; the pronoun file's header is corrected to stop promising it.

### D8 — A gate failure names the phrase and the reason

When a constrained slot admits nothing, the gate asks the matcher once more over everything the actor can see. If that names an entity, the failure is `SCOPE_VIOLATION`, carrying the scope base the slot required as `SlotFailure.requiredScope: 'carried' | 'touchable' | 'visible'` (`parse-failure.ts`), and the classifier passes it to the message context. A `SCOPE_VIOLATION` also carries the id of the entity the matcher found (`SlotFailure.entityId`), and the classifier passes that entity's info (`entityInfoFrom`, ADR-158) to the message, which names it through the formatter chain: `wind lantern` names "the brass lantern". If the matcher names nothing, the failure is `NO_MATCH`, and it names the phrase's content words (D2), never its first token, because there is no entity to name. *(Amended 2026-10-24, session de76ce, from `plan-review`: the draft named the typed words in both cases, which could not produce AC7's "the brass lantern" and would have passed a bare string where lang-en-us requires entity info.)* The language words the scope violation by base:

- `carried`: "You aren't holding {the clock}."
- `touchable`: "You can't reach {the clock}."
- `visible`: "You can't see {the clock} from here."

The new lines go in `lang-en-us/src/data/messages.ts` beside `parser.error.scopeViolation`. `AMBIGUOUS` is deleted from `SlotFailure.reason`, together with its classifier branch. Ambiguity belongs to the validator, which alone can prompt with entity ids.

### D9 — The scope builder's no-ops are deleted

`orRule()`, `includeRules` and `kind()` are deleted from `ScopeBuilder` and `ScopeConstraint`. A trait filter is `hasTrait()`, and a property or function filter is `matching()`. Neither change adds anything.

### D10 — world-index calls the matcher

`resolvePhrase` keeps its index as a prefilter (the first content word through `byWord`) and decides each candidate with `matchNoun` over a surface built from the IR entity. The Incomplete view then answers the validator's question with the validator's code. The published `VocabularySurface` wire shape does not change. The IDE's own resolver over that surface is Swift, and it is outside this record.

### D11 — A disambiguation prompt is answered by splicing the answer into the tied phrase

When the validator returns `AMBIGUOUS_ENTITY`, its `details` carry the tied phrase's token indices as `details.tokens: number[]` (the single noun's, or the one list item's that tied, taken from `INounPhrase.tokens`), along with the parsed command it already carries. The executor holds the command as GH #318 does, together with that span. The engine's held command becomes `{ input, tokens, insertAt? }`: `tokens` is the parsed command's token words, and `insertAt` is the index of the tied phrase's first content word, after its articles and determiners (D2). The missing-object hold leaves `insertAt` unset and keeps splicing at the end.

On the next input, the held-command stage works as it does now. An input that parses as a command of its own runs as written and drops the hold. Otherwise the answer's words, without their articles and without any word the tied phrase already holds, are inserted at `insertAt`, and the rebuilt command runs if it parses:

- `x clock`, answered `brass`, runs `x brass clock`;
- `x clock`, answered `the wall clock`, runs `x wall clock`;
- `take sword and key`, answered `silver`, runs `take sword and silver key`.

The rebuilt command goes through the parser, the gate and the validator like any typed command. If it still ties, it prompts again. If it names nothing, it fails as a typed command would. The hold is spent on exactly one input, and a new hold replaces an open one. The hold is not saved. Like GH #318's (a private field, `game-engine.ts:354`), it is turn state: a save or restore between the prompt and the answer drops it, and the answer then runs as typed.

Nothing on the wire carries an entity id back: the answer is words, resolved by the same matcher as every other phrase. The answer is not limited to the prompt's candidates. An answer that names something else in scope resolves to it, exactly as if the player had typed the rebuilt command. *(Resolved by David, 2026-10-24, "a1": this record takes the answer path on, rather than leaving prompts unanswerable until a separate record.)*

### D12 — What this record does not change

- Slot extent and the search: step 5 (A1–A7, A9–A11).
- Per-parser pronoun and vocabulary state (F2) and language ownership of the word lists (F1, F3): step 7.
- Ranking of complete parses (ADR-384).
- The Chord surface: no construct, no diagnostic, no EBNF change.
- The validator's `exactOutOfScope` rule (GH #206, GH #245), its scope-preference and disambiguation heuristics, and the topic resolution of ADR-231 D4. All of them move onto `matchNoun` and keep their behavior.

## Consequences

- One function answers "which entities does this phrase name, and how well" for the gate, the validator, the list expander, `all but`, pronoun checks and the IDE's Incomplete view. Step 5's search scores each complete parse by calling it. No second copy is left to drift.
- The gate gets **stricter**. A phrase it used to pass by substring (`ice` in `dice`, `lant` in `lantern`) now fails at parse time. The validator never accepted those phrases, so a command that used to reach the validator and fail there now fails at the gate. But a gate failure can let a different, unconstrained rule match, and that changes the message. The implementation measures this on the chain, every tree and Dungeo's unit transcripts. Each line that moves is reported with its old and new text.
- The gate also gets **more permissive** for adjectives. A TypeScript story's adjective now admits a phrase at the gate.
- **The gate never runs for Dungeo.** Dungeo declares no `.where()` constraint, and neither does the generated standard grammar, so D3, D4, D6's gate check and D8 cannot move a Dungeo line. Only Chord stories with `must be …` reach the gate: thealderman, fernhill, wumpus and friendly-zoo. Dungeo's exposure is D2, D5, D7 and D11. *(Corrected 2026-10-24 from the plan's Phase 1 census: the draft said Dungeo uses `.where()` constraints.)*
- Constrained slots resolve more narrowly (D4). Where a held and an unheld entity share a word, Dungeo's disambiguation prompt can disappear. That is the intended fix, but it is a change to rendered text.
- **D8's new scope-violation lines change rendered text.** A Dungeo line that prints "You can't see any … here." for a visible, out-of-scope thing prints the new line instead. Per this repository's rule, that is a content change, and each Dungeo line it moves goes to David for a ruling. It is not accepted as part of a list.
- `IValidatedCommand` gains `directObjects`, and `INounPhrase` gains `scope` and loses `candidates`. A TypeScript story or fixture that builds either by hand fails to compile until it is updated. That is the intended effect.
- A disambiguation prompt becomes answerable (D11). This changes rendered text wherever a transcript or tree card answers a prompt today: the answer used to print "I don't understand that." and now runs the rebuilt command. Each one the census finds is reported with its old and new text.
- The engine's held command gains a span. GH #318's missing-object hold is unchanged in behavior, and its tests are the floor for that.
- The world-model module's English words are an interim home. Step 7 moves them, and nothing else in this record depends on where they live.

> **Amendment note (2026-10-26, ADR-387):** fulfilled, not superseded. The interim home is gone: world-model declares the language-agnostic roles (`LanguageWords { selfWords, nameStopwords }`, if-domain), the English provider fills them from its one word table, and the engine assigns them to the world at install (ADR-387 D2, step 7 Phase 3). `SELF_WORDS`, `NAME_VOCABULARY_STOPWORDS` and `PLAYER_ROLE_ALIASES` no longer exist. This record's Status line is left alone.

## Acceptance criteria

1. **D1**: `matchNoun` and `namingSurfaceOf` are exported from world-model. A test pins each tier, the dominance of more matched words, disqualification by an unmatched word, the article-first EXACT try, the self words, and wall side adjectives. `grep` finds no `matchEntityName`, `getEntityVocabulary` or `SELF_WORDS` in stdlib.
2. **D2**: `grep` finds no article list or `nonModifiers` in stdlib's validator and no article regex in the gate. A parser test pins `articles`, `determiners`, `modifiers`, `text` and `head` for `the old brass key`, `my lantern` and `her key`. Through the real loader and engine, the probe story's `take my lantern` takes it, `take everything` takes every portable thing, and `take all coins` takes the coins and nothing else.
3. **D3**: through the real loader and engine, `wind ice` (dice held) fails at the gate. A parser test pins that an adjective admits a constrained slot.
4. **D4, real path**: the probe story's `wind clock`, with the brass clock held and the wall clock in view, prints "You wind the brass clock."
5. **D5, real path**: `take brass lantern and sword` and `take sword and lantern` each leave both in the inventory. `take all but the brass lantern` leaves the lantern behind. `take lantern and widget` fails, naming "widget", and takes nothing. With a brass key and a silver key in reach, `take sword and key` asks "Which do you mean: the brass key or the silver key?".
6. **D6, D7, real path**: `take sword and lantern`, then `drop them`, drops both. `unlock door with key`, then `open it`, opens the door. `wind it`, with `it` an unplaced spool, does not run `winding`. `take it and the box` takes both.
7. **D8, real path**: `wind lantern`, with the lantern in view and not held, prints "You aren't holding the brass lantern." `wind the widget` names "widget". `grep` finds no `AMBIGUOUS` slot-failure reason.
8. **D9, D10**: `grep` finds no `orRule`, `includeRules` or `kind(` in if-domain's grammar. A world-index test pins that `resolvePhrase` and `matchNoun` agree on every phrase in its existing fixtures.
9. **D11, real path**: with the brass clock held and the wall clock in view, `x clock` then `brass` examines the brass clock, and `x clock` then `the wall clock` examines the wall clock. `take sword and key` then `silver` takes the sword and the silver key. `x clock` then `inventory` runs the inventory and drops the hold. An engine test pins that the missing-object hold (`drop` then `pear`) still splices at the end.
10. **Floor**: tree baseline captured at HEAD before any change; `./repokit build dungeo` exit 0; the walkthrough chain at 952; every tree identical to the baseline, or each moved card listed with its old and new text and David's ruling; Dungeo's unit transcripts compared with the baseline the same way; `pnpm exec turbo run test:ci` all green; `./repokit grammar --check` and `manifest --check` fresh.

## Session

Drafted in session de76ce (2026-10-24), `docs/context/session-20261024-2051-chord-4-0.md`. Probe story and its output: `/private/tmp/claude-501/-Users-david-repos-sharpee/ba26a8e1-8508-468c-9800-d1600c2ae2f4/scratchpad/nouns/` (`nouns.story`, `probe-head.txt`).

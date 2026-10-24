# ADR-383: A grammar rule declares each slot's seat; the parser never guesses it

**Status**: **ACCEPTED** (David, 2026-10-23, session 84f183: "yes", after the open-questions interview and `adr-review` 20/20 with nine findings folded). Q-1 resolved by David, 2026-10-23 ("a"); Q-2 resolved by David the same day ("looks good", `about` rows, after declining the first recommendation of a compile error: "We need a better solution"). Written 2026-10-23, session 84f183, on `chord-4-0`, from step 3 of the parser review's recommendation (`docs/work/parser-review/review-20261022.md`, root cause 3), standing on ADR-382 D9. It fixes C2, C4, C5, C6 and C7, removes the five seat tests, `primarySlotOf` and the slot-name guess, and settles the question ADR-382 D9 handed on (an optional slot takes a positional seat: yes). No implementation is authorized.

## Date: 2026-10-23

**Kind**: technical

**Scope**: `packages/if-domain` (`src/grammar/grammar-builder.ts`, `grammar-engine.ts`), `packages/parser-en-us` (`src/english-parser.ts`, `english-grammar-engine.ts`, `parse-failure.ts`, `src/grammar.ts` regenerated), `packages/chord` (`src/patterns.ts`, `ir.ts`, `analyzer.ts`, `stdlib-manifest.ts` regenerated), `packages/chord` also `src/parser.ts`, `ast.ts` and `chord.ebnf` (D9), `website/public/chord.ebnf`, `packages/story-loader` (`src/loader.ts`, `src/runtime/dispatch-verbs.ts`, `src/runtime/timers.ts`, `src/runtime/dialogue.ts` read), `tools/ide` protocol types (regenerated), `tools/repokit` (`src/commands/grammar.ts`, `manifest.ts`), `scripts/__tests__/grammar-seam-guard.test.ts`, `docs/architecture/chord-grammar-changes.md`, `packages/sharpee/docs/genai-api` (regenerated).

## Parent

- **The parser review**, root cause 3 and findings C2, C4, C5, C6, C7. Step 3 of its recommendation: "each rule carries which slot is the direct object, which the indirect … the parser seats by it, failure messages read it, dispatch binds by slot name; the verb and preposition come from the literals the rule matched."
- **ADR-382 D9**: `CompiledSlot` and `GrammarRuleSpec.slots` were shaped to take a seat; the positional default was kept exactly, and whether an optional slot counts was left to this record.
- **ADR-080**: the instrument, text and greedy-text slot types. **ADR-231 D4**: the topic slot. **ADR-082**: vocabulary and manner slots. **ADR-084**: direction slots. Each already seats its slot by type.
- **Step 1** (`plan-20261022-step1-ship-breaking-fixes.md`, C1): `INounPhrase.slot` names the slot each phrase filled, and dispatch binds the direct and indirect objects by it. Its test `story-loader/tests/dispatch-slot-names.test.ts` pins today's two-pattern rendering for this record to change.

## Context — measured, not assumed

**The parser decides seats by a positional default with five text exceptions.** `english-parser.ts:818-821` numbers the compiled slots in order, skipping INSTRUMENT slots, with optional slots counted since ADR-382. Slot types other than entity and instrument leave before seating (`:841-882`: text, topic, vocabulary, manner, direction). For the rest, `:961-995` tests `rule.pattern.includes(…)` for `give :recipient :item`, `give :item to :recipient`, `show :recipient :item`, `show :item to :recipient` and `:item from :container`, seating `item` direct and the other indirect. Every other rule takes `:996-1009`: position 0 direct, position 1 indirect, anything else an extra.

**The exceptions name the verb as well as the slots, so a synonym line misses them.** The standard grammar's giving has `hand the recipient the item` (`parser-en-us/grammar/standard-en-us.story:274`), and the rendered `hand :recipient :item` matches none of the five tests. On the bundle (2026-10-23, this session; probe story `…/scratchpad/probe/roles.story`, a coin and Bob in one room):

```
> hand bob the coin
[phrase] blocked event "if.event.give_blocked" rendered blank: no template registered for "if.action.giving.cannot_take" …
> give bob the coin
You give the coin to the Bob.
```

`hand bob the coin` seats Bob as the item. The same holds for any story line or `extend action giving` line written recipient-first with another verb (C4).

**A slot name already means one seat within an action, everywhere but those lines.** A census of the 22 standard actions with a two-slot line (manifest `grammarShapes` against stdlib's lifecycle registry, this session, `…/scratchpad/roles-census.cjs`) finds every slot name in the same position in every line it appears in, except the recipient-first lines of giving and showing. Within an action several names can share a seat across lines: putting's indirect object is spelled `supporter`, `hook`, `destination` and `container` on different lines.

**Stdlib's lifecycle descriptors name slots too, but not the grammar's names.** Each descriptor slot has an `id` and a `resolve` that reads the direct or indirect object (`stdlib/src/actions/standard/giving/giving.ts:58-81`). In 14 of the 22 actions the grammar uses a name no descriptor slot has (putting's lines against its `item`/`container`; cutting's `object`; opening's `door`). The descriptors are not a source for the grammar's seats, and this record does not make them one.

**Chord picks one noun per action, the parser one per rule.** `primarySlotOf` (`chord/src/ir.ts:1449-1456`) returns the first entity slot across all of an action's patterns. Dispatch binds by name since step 1 (`story-loader/src/runtime/dispatch-verbs.ts:363-370`), but validation consults `context.command.directObject` (`:401`), which the parser seats per rule. `offer the gift to the friend` with `present the friend with the gift` consults the gift on one line and the friend on the other (C2; the pinned case in `dispatch-slot-names.test.ts`). The analyzer's unused-slot warning also reads `primarySlotOf` (`analyzer.ts:3830`).

**The acting statement seats by position a third time.** `story-loader/src/runtime/timers.ts:117-121` puts the first non-instrument entity binding of `make <actor> <action> …` in the direct object and the second in the indirect, in the order the statement names them.

**The verb and the preposition are read from vocabulary tags, not the rule.** The verb phrase is every leading VERB-tagged input token (`english-parser.ts:778-794`), so `examine light` has the verb "examine light" when `light` is also a verb, and a story verb absent from the vocabulary has the verb "" (C6). The preposition is the first PREPOSITION-tagged token between the two objects (`:1012-1025`). The engine already tracks what a rule's literals matched (`PatternMatch.matchedTokens`, `if-domain/src/grammar/grammar-builder.ts:551-555`, written at `english-grammar-engine.ts:234, 267, 334-336`), but only the first word. Nothing seats from it.

**Failure messages guess the seat from the slot's name.** `parse-failure.ts:156-160` reports MISSING_OBJECT when the slot the input ran out at is named `target`, `item` or `object`, and MISSING_INDIRECT otherwise, and the review records `give` saying "Give it where?" and `pick up` asking "What do you want to pick?" (C7, [probe] there, not re-run here). Any action whose direct slot is `door`, `container` or `recipient` gets the indirect message (C7).

**A story action's topic and text slots compile and never reach the action** (C5, [probe] in the review). Dispatch binds entity slots by name and the declared semantic keys (`dispatch-verbs.ts:318-330, 355-394`), nothing else. The language already answers a topic elsewhere: `define topics` rows, `about the boiler:` and `about "the folly", "the fire":` (`branch-stories/fernhill/fernhill.story:722-737`), lowered to `IRTopicRow` (`chord/src/ir.ts:975-981`) and matched at runtime by `matchTopicFilters` (`story-loader/src/runtime/dialogue.ts:67-85`), entity tier first, then normalized text. No corpus story writes a topic or text slot in a `define action` (grep, this session).

**The repository has no rule with three non-instrument entity slots.** Grep over the standard grammar's shapes, every TS `define(…)` under `stories/` and `packages/`, and `platform-grammar.ts`, this session. `removing`'s `item, container, tool` types `tool` an instrument. No TS `define` line is written indirect-first.

## Decision

### D1 — An entity slot carries a seat, and the compiled slot record holds it

`CompiledSlot` gains `seat`:

```typescript
/** Where an entity slot's noun goes in the parsed command. */
export type Seat = 'direct' | 'indirect';

export interface CompiledSlot {
  name: string;
  tokenIndex: number;
  optional: boolean;
  greedy: boolean;
  slotType: SlotType;
  /** Set on every ENTITY slot at build; absent on every other slot type. */
  seat?: Seat;
}
```

`GrammarRuleSpec.slots[name]` takes `seat?: Seat`. Every other slot type keeps the seat its type gives it: an instrument slot is the command's instrument, a topic slot its topic, a text slot its text, and vocabulary, manner and direction slots their own fields, exactly as today. A seat given for a slot that is not an entity slot is a build error. A rule whose entity slots repeat a seat, or that has a third entity slot, is a build error; none exists today.

### D2 — The positional default is stated once, in if-domain, at build

Seats are assigned at build in two passes. First, every declared seat is taken. Then each entity slot with no declared seat, in pattern order, takes the first seat of `direct`, `indirect` that is still free. With nothing declared, the first entity slot is `direct` and the second `indirect`, exactly today's positional rule. Optional slots count (this answers ADR-382 D9's question, and keeps what step 2 shipped). The rule lives in the compile step that builds `CompiledSlot`, not in the parser, so every consumer reads a seat, never a position. `define(text)` relies on it, and gains `.seat(name, seat)` beside `.instrument(name)` for a TS author who writes an indirect-first line.

### D3 — Chord seats by name, per action, in its pattern module

Chord's pattern module (ADR-382 D5) computes one **seat table** per action: each entity slot name keeps one seat across every pattern of the action. A name takes the seat it holds by D2's default in the first line, in definition order, where it appears. A later line inherits every name already in the table, and a new name takes the seat its line leaves open. `lowerActionRules` emits the seat on every entity slot of every rule.

So giving's table, read from `give the item to the recipient`, is `item: direct, recipient: indirect`, and `hand the recipient the item` seats the coin as the item. `present the friend with the gift` after `offer the gift to the friend` seats the gift direct on both lines, and the action consults the gift on both (C2).

A line that would put two names in one seat (both inherited as `direct`, say) is a compile error, `analysis.seat-conflict`, naming the two slots and the lines that seated them. Whether any corpus line hits it is measured before implementation; the census above finds none in the standard grammar.

The IR does not change. The table is computed from `IRActionDef.patterns` and `slotTypes` wherever lowering runs: the loader at load, repokit at generation, the analyzer for its diagnostic.

### D4 — The standard grammar's seat tables cross in the manifest, and `extend action` inherits them

`./repokit manifest` writes each standard action's seat table beside its shapes, from the same lowering (`StdlibLocaleFacts.grammarSeats: Readonly<Record<string, Readonly<Record<string, Seat>>>>`). `lowerActionRules` for an `extend action <standard action>` starts from that table, so `extend action giving` with `hand the recipient the item` seats as the standard line does.

**An extension line with two entity slots carries at least one inherited name** (Q-1, David, 2026-10-23: "a"). A line extending a standard action whose two entity slots are both names the action's table lacks is `analysis.unknown-slot`, listing the action's names, because its seats would be a guess: `extend action giving` with `hand the friend the gift` would seat the friend as the thing given. A one-noun line names no seat that could be wrong (`snag the thing` under taking), and a line with one inherited name seats its new name in the seat left open (`hang the item on the peg` under putting seats the peg indirect), so both stay legal. *Rejected:* refusing every new name in an extension, which refuses unambiguous lines like the peg; seating new names by position without a word, which is C4.

### D5 — The parser seats by the record

`convertGrammarMatch` seats each entity phrase by its compiled slot's `seat`. The positional map (`english-parser.ts:809-821`) and the five `rule.pattern.includes(…)` tests (`:961-995`) are deleted, and with them the guard's five allowances in `grammar-seam-guard.test.ts`, which then admits no string operation on a rule's pattern anywhere in its scope. An entity slot without a seat cannot reach the parser (D2 sets one on every entity slot), so there is no fallback branch.

### D6 — Dispatch and the acting statement read the seat table

`primarySlotOf` is deleted. A Chord action consults the command's direct object, as it already does (`dispatch-verbs.ts:401`). D3 makes that the same noun on every line. Where a slot name is needed without a parsed command (binding an acting statement's direct object when it carries no slot names, and the unused-slot warning's "consulted slot"), it is every name the action's table seats `direct`. The acting statement (`timers.ts:117-121`) seats each named binding by the table, not by the order the statement names them, so `make Bob give the coin to Alice` and a statement naming the recipient first build the same command. The table is the story action's own, or the manifest's `grammarSeats` for a standard action. The statement's slot names come from the shape the ADR-329 matcher matched, so each is a name the table holds. That is an assumption the implementation checks first, with a grep of the matcher's binding step; if a name can arrive that the table lacks, it is a load error naming the slot, never a positional fallback.

### D7 — The verb and the preposition come from the rule's literals

The grammar engine records, for each matched rule, the input tokens each literal element consumed:

```typescript
/** One pattern element as it matched the input. */
export interface MatchedElement {
  /** Index of the element in `rule.compiledPattern.tokens`. */
  tokenIndex: number;
  /** Input token indices it consumed; empty for a skipped optional. */
  inputTokens: readonly number[];
}

export interface PatternMatch {
  // … existing fields, `matchedTokens` removed …
  /** Every literal (word or alternation) element, in pattern order. */
  literals: readonly MatchedElement[];
}
```

The verb phrase is the input tokens of the literal elements before the first slot. The preposition is the input tokens of the literal elements between the direct and the indirect slot, in pattern order, and is absent when none consumed any. `matchedTokens` is deleted. Its one reader, `buildSemantics` (`english-grammar-engine.ts:389-440`), keys `rule.semantics.verbs` and `.prepositions` on the matched verb and preposition words and `.directions` on a direction slot's text; it takes the verb and preposition from `literals` (the same words D7 names) and the direction from the direction slot's match, which is where `matchedTokens.direction` came from (`:334`). Whether any rule still carries those semantics maps after ADR-382 retired `forAction` is counted by the plan's first phase; maps no rule carries are deleted with their reader rather than ported. The vocabulary tags are no longer read to find either. `examine light` has the verb `examine`; a story verb has its own word (C6). A rule with no literal before its first slot has an empty verb phrase; none exists today (no standard shape and no TS `define` under `stories/*/src` or `packages/*/src` opens with a slot, checked this session).

### D8 — Failure messages read the seat

When input runs out at a slot, the failure classifier reports MISSING_OBJECT if the slot's seat is `direct` and MISSING_INDIRECT if `indirect`, and the verb it names is D7's verb phrase (`pick up` asks about `pick up`). The `target`/`item`/`object` test (`parse-failure.ts:156-160`) is deleted (C7).

### D9 — A story action answers its topic slot with `about` rows, and a text slot binds its words

A `define action` whose slot `is a topic` answers it with **`about` rows**, the row form `define topics` already uses (Q-2, David, 2026-10-23: "looks good"):

```
define action praying
  grammar
    pray about the subject
    pray for the subject
  the subject is a topic
  about the altar:
    phrase prayed-altar
  about "the harvest", "rain", "the crops":
    award faith, once
    phrase prayed-harvest
  otherwise refuse unheard

  phrases en-us
    prayed-altar: You kneel before the altar.
    prayed-harvest: You pray for {the subject}, and the wind turns.
    unheard: Nothing answers a prayer about {the subject}.
```

- **Matching** is the topic tables' own: an entity row first, then a text row by its primary or an alias, normalized by `normalizeTopic`. The entity comes from the validator, which already resolves any command's topic quietly against visible scope, for every action, and leaves it as text on a miss (`stdlib/src/validation/command-validator.ts:228-232`, ADR-231 D4); dispatch reads it as `context.command.topic.entity`, as stdlib's asking does (`asking.ts:74`). The loader passes that entity and the typed text to the one matcher, `matchTopicFilters` (`story-loader/src/runtime/dialogue.ts:67`); no second matcher is written.
- **Row bodies** are statement bodies, lowered as topic-row bodies are. The analyzer applies the topic table's checks: a duplicate row (`analysis.duplicate-topic`, aliases included) and a text row colliding with an entity's name (`analysis.topic-entity-collision`).
- **No row matching** falls to the action's `otherwise refuse`, as an action with no answering clause does today. `about` rows on an action with no topic slot, or a topic slot with no rows and no body that reads it, is a compile error naming the slot.
- **The IR**: `IRActionDef` gains `topics?: IRTopicRow[]`, the type the topic tables use (`chord/src/ir.ts:975`), present only when written. The IDE protocol types are regenerated (`./repokit protocol`).
- **`{the subject}`** renders the words the player typed, in every phrase the action speaks, matched row or not. A topic or text binding is a text value, and a phrase marker's article (`the`, `a`) adds nothing to it: `pray for the rain` renders "the rain" and `pray for rain` renders "rain". When the topic resolved to an entity, the binding is still the typed words, so the phrase says what the player said.

A slot that **`takes the rest of the line`** (ADR-267 D10) binds its words under its slot name for rendering: `{the message}` prints them as typed. It takes no rows. Today it compiles and its words are dropped (`dispatch-verbs.ts` binds entity slots and declared semantic keys only).

This is a language change: the `define action` production gains `about` rows in `packages/chord/chord.ebnf` (mirrored to `website/public/chord.ebnf`), and `chord-grammar-changes.md` gains the row.

*Rejected:* a compile error until a later record (the first recommendation), which leaves a legitimate construct unbuildable when the language already has the form that answers it. *Rejected:* a condition form (`if the subject is about "rain"`), which makes every topic-driven action an if-chain beside a row form authors already know.

### D10 — What this record does not change

- **The ranking** (step 4) and **the bare-verb prefix's tier** (C8). A prefix rule's slots have no entity slots and no seats.
- **Stdlib's descriptors.** Actions keep reading `directObject` and `indirectObject`; what changes is that the parser now fills them consistently.
- **The positional default's result for every line not written indirect-first.** The census finds those are the recipient-first lines of giving and showing, which the five tests already seated by name for `give` and `show`.

## Consequences

**Gained.** One rule for where a noun goes, stated in if-domain and applied at build, and one per-action seat table in Chord. `hand bob the coin` gives the coin. A Chord action consults the same noun whichever line matched. The parser holds no slot names, no verb names and no pattern text. Failure messages ask the right question for any slot name.

**Constrains.**
- No code seats a noun by its slot's position or name after build. The guard's allowance list is empty and stays empty.
- Within one Chord action, a slot name has one seat.
- A Chord construct that adds an entity slot gets its seat from the pattern module's table, nowhere else.
- A TS author writing an indirect-first line declares it with `.seat`.

**Cost.**
- `CompiledSlot`, `GrammarRuleSpec.slots` and `PatternMatch` change shape; `matchedTokens` is replaced.
- `primarySlotOf` is deleted; its two readers change.
- The manifest gains `grammarSeats`; `grammar.ts` is regenerated with a seat on every entity slot.
- `hand the recipient the item` changes what it does, and so may any story's indirect-first line: a content change, measured over the chain and every tree, and brought to David if a recording moves.
- `chord-grammar-changes.md` gains rows for `analysis.seat-conflict`, D4's extension rule and D9's `about` rows; the EBNF gains the rows.
- `IRActionDef` gains `topics`; the IDE protocol types regenerate.

**Amendment notes.** ADR-382 D9 gets a one-line note pointing here (its open question, whether an optional slot takes a positional seat, is answered yes by D2), written by the plan phase that adds `seat`. ADR-267 D11 (typed slots) gets a note that a story action's topic slot is answered by D9's rows, written by the phase that ships them. The plan's close-out checks both exist. Nothing is superseded.

**Unchanged.** ADR-268's resolution order. Stdlib's actions and descriptors. The topic tables' matcher, which D9 calls rather than copies. Whether `CHORD_LANGUAGE_VERSION` moves follows the versions-at-publish ruling, not this record.

## Acceptance criteria

1. `hand bob the coin` gives the coin to Bob, on the bundle; `give bob the coin`, `give coin to bob`, `show bob the coin` and `show coin to bob` are unchanged. *(D3, D4, D5)*
2. A Chord action with `offer the gift to the friend` and `present the friend with the gift` consults the gift's clauses for both `offer coin to Bob` and `present Bob with coin`; the pinned case in `dispatch-slot-names.test.ts` is updated to say so. *(D3, D6, C2)*
3. `extend action giving` with `hand the recipient the item` seats as the standard line does. *(D4, C4)*
4. A Chord line that seats two names `direct` fails with `analysis.seat-conflict`. A TS rule declaring a seat on a topic slot, or two slots in one seat, throws at build. *(D1, D3)*
5. `grep 'rule.pattern'` over `parser-en-us/src` finds no seat test, `primarySlotOf` does not exist, and the guard's allowance list is empty and the guard passes. *(D5, D6)*
6. `examine light` with `light` also a verb has the verb phrase `examine`; a story verb not in the vocabulary has its own word as the verb. *(D7, C6)*
7. `pick up` alone asks what to pick up; an action whose first slot is named `door` reports a missing direct object. *(D8, C7)*
8. An acting statement naming the indirect object's slot first builds the same command as one naming it second. *(D6)*
9. `extend action giving` with `hand the friend the gift` fails with `analysis.unknown-slot` listing `item` and `recipient`; `extend action putting` with `hang the item on the peg` compiles and seats the peg indirect. *(D4)*
10. The `praying` action above, on the bundle: `pray for rain` speaks the harvest row with "rain" rendered; `pray about the altar` with the altar in scope speaks the altar row; `pray about taxes` refuses `unheard` with "taxes" rendered. `about` rows on an action with no topic slot fail to compile, and a duplicate alias reports `analysis.duplicate-topic`. A `takes the rest of the line` slot renders its typed words in the action's phrase. *(D9, C5)*
11. The Dungeo chain and every Chord tree pass at each implementation phase, with recordings unchanged unless David rules a classified difference. *(D10)*

## Session

Session 84f183, 2026-10-23, `chord-4-0`. Plan: none yet; the plan for step 3 follows this record.

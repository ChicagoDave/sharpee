# ADR-372: Two-noun and conversation-shaped clauses — a head names its counterpart, `asking_for` is a request, a readable thing answers `consult`, and a price names a counter

**Status**: **ACCEPTED** (David, 2026-10-14, session a0b591: "accepted", on the three calls as recommended — the tail read from the end of the head, `asking_for`, plain topic rows on a readable thing — after the open-questions interview resolved the money model as a counter on the buyer and `adr-review` 18/18 with two N/A, three findings folded in: buying split across world-model, stdlib and the loader; the manifest's `counterpartActions`; the tail's edge-case diagnostics). Drafted 2026-10-14 on `chord-4-0`, Phase 7 of `docs/work/archive/chord-4-0/plan-20261013-chord-4-0.md`. The four rows are David's 2026-10-12 dispositions in `docs/work/archive/chord-4-0/standard-if-checklist.md` (rows 43/86 throwing at, 85 asking for, 84 consulting, 96 buying); the shapes below are Claude's drafting, with reasons. Three calls are marked **[call]**, each with a recommended answer: the counterpart tail's split rule (D1), the `asking_for` gerund over `requesting` (D3), and topics on a readable thing being plain rows only (D4).

**Scope**: `packages/stdlib` (lifecycle slots gain a counterpart resolver; new `asking_for` action and id; `consulting` implemented; new `buying` action and id, implementation-dispatching), `packages/world-model` (`PurchasableTrait`, both barrels), `packages/parser-en-us` (`grammar/standard-en-us.story`, `grammar.ts` regenerated), `packages/lang-en-us` (stock lines), `packages/chord` (parser and `chord.ebnf`: the counterpart tail; analyzer: the tail gate, `define topics` on a readable owner, `costs`; catalog, manifest and alias catalog regenerated; the EBNF pin re-recorded without a bump), `packages/story-loader` (the counterpart guard, the consulting table, the price), `docs/architecture/chord-grammar-changes.md` (one row per decision), the Chord guide and the stdlib reference, the IDE Docs tab, `branch-stories/upps` (the exercisers), and the checklist's four evidence pointers.

## Date: 2026-10-14

**Kind**: technical

## Parent

- **ADR-228** (the lifecycle engine): each two-noun action already consults both nouns as slots; D1 adds the counterpart to a slot.
- **ADR-327** (heads name who acts; explicit references, no `it`) and **ADR-368** (a head lists its gerunds): the head D1 extends.
- **ADR-371 D4** (the `to <value>` tail on a `setting` head): the precedent for a head tail that narrows when a clause fires.
- **ADR-320** (conversation; `define topics`) and **ADR-231 D4 / ADR-239** (the first-class topic reaching hooks through sharedData): the table D4 reuses.
- **ADR-264** (counters, per-entity `counter` and story-global `define counter`): the store D5 recommends a price spends from.
- **ADR-370** (stock verbs without an object side): the stock-line pattern and the underscore gerund register (`looking_under`, `saying_yes`) D3 continues.
- **ADR-350 D2** (no Chord word ships before its platform reader): every word here lands with its reader.
- **ADR-257** (language versioning, as amended): additive; the pin is re-recorded under the unpublished 4.0 surface.

## Context — measured, not assumed

**Throwing at a target already works in the platform; Chord cannot say which target.** `throw the item at the target` is a grammar line (`packages/parser-en-us/grammar/standard-en-us.story:285-293`), the action resolves the target (`throwing.ts:210-290`, `throwType: 'at_target'`), and its lifecycle consults both nouns: slot `item` (the direct object) and slot `target` (the indirect), each seeded with both ids (`throwing.ts:61-89`). So `on the player throwing` in the gong's block fires today when anything is thrown at the gong, and in the ball's block when the ball is thrown at anything. What an author cannot write is "the ball thrown *at the gong*": the clause has no way to name the other noun. The same is true of giving and showing (`giving.ts:58-80`, `showing.ts:47-58`, both two-slot): fernhill's Mrs Kettle gets around it by testing state in the body (`change Mrs Kettle to softened when Mrs Kettle has the sherry bottle`, `fernhill.story:693`), which works only because a gift changes who holds the thing. A thrown ball changes nothing a condition can test.

**A stock-action clause body has no context value for the second noun.** The analyzer resolves `actor` and grammar slots as context values (`analyzer.ts:6889-6916`), but grammar slots exist only for story-defined actions (`story-loader/src/runtime/dispatch-verbs.ts:345`); an interceptor clause on a stock action gets none. ADR-327 chose explicit references for a reason, and a tail that names the counterpart statically keeps the body explicit: once the head says `at the gong`, the body can say `the gong`.

**The head ends where its last word ends.** `head = actor gerund { "," gerund }`, the gerund the LAST head word, split syntactically (`chord.ebnf:440-472`); ADR-371 D4 added `[ "to" WORD ]` after it, and `anything as the <role>` is the other tail.

**Asking is topic-shaped.** `ask the recipient about the topic` (`standard-en-us.story:358-363`); the action's one slot is the person, the topic reaches hooks through sharedData (`asking.ts:44-60`). There is no request form: `ask grocer for apple` fails to parse.

**Consulting is an id with nothing behind it.** `if.action.consulting` is declared and in the manifest (checklist note, section A); no grammar, no action. `define topics` is refused on anything that is not a person (`analyzer.ts:2100`: "only people answer `ask`/`tell`"). Topic rows live on the entity's IR (`entity.topics`) and are matched by the dialogue runtime (`story-loader/src/runtime/dialogue.ts`, `matchTopicFilters`, used by `conversation-threads.ts:71`), so a second consumer of the same rows needs no new store.

**There is no money anywhere.** No currency, price or money concept in world-model, stdlib or chord (grep, 2026-10-14; the hits are "credits" in the about screen). Chord has counters: per-entity `counter credits starts 20` in a create block and story-global `define counter` (`chord.ebnf:407-410`, ADR-264).

**UPPS has the rooms but none of the words.** Piazzi Town's Market Row has stalls and a grocer with topics (`docs/work/author-narrative-testing/upps-design-20261012.md:69`); Kepler Station has a Directory Hall (`:88`); the Sparrow's manuals are named in the plan. Nothing in `upps.story` throws, requests, consults or buys.

## Decision

**D1 — A head may name its counterpart.** On a head with exactly one gerund whose action consults two nouns, a tail names the other noun, and the clause fires only when that noun is the one in the command:

```
clause-form  = head [ counterpart ] [ "to" WORD ] [ "anything" "as" "the" WORD ]
counterpart  = [ PREP ] name          (* PREP: at | to | for | from | about | in *)
```

The owner is still the action's object on its own side (ADR-327 D1); the counterpart is the noun on the other side. In the ball's block, `on the player throwing at the gong`; in the gong's block, `on the player throwing the ball`. In the recipient's block, `on the player giving the sherry bottle`; in the bottle's block, `on the player giving to Mrs Kettle`. The preposition is optional and carries no meaning beyond readability; the name is resolved like any entity reference and must name a thing (`analysis.head-counterpart-unknown`).

**[call] The split rule.** The parser reads the tail from the end of the head: the tail opens at the last article (`the`, `a`, `an`) in the head, extended one word left over a preposition (`at`, `for`, `from`, `about`, `in`) if one stands there; when there is no article, a bare `at`, `for` or `from` opens it (`at Tobias`), and `to` keeps its own path — one word after `to` on a two-noun gerund is a counterpart (`giving to Tobias`), several words or an article are too (`giving to Mrs Kettle`). *(Implementation note, 2026-10-14: the bare-preposition set is narrower than the article-extension set so an actor name such as `the man in black` does not split at `in`.)* A tail is taken only when at least two words — an actor and a gerund — stand before it, so `the player giving` and `the wandering mercenaries giving` take none. The gerund is then the last word before the tail, as today. This stays syntactic (ADR-327 D3: never guessed) and costs two edge cases, both caught: a counterpart whose own name has an inner article (`the king of the hill`) splits at the inner one and leaves a non-gerund (`of`) before the tail, which the analyzer reports as `analysis.head-counterpart-one-noun` with a fix-it naming the split rule and suggesting an alias; a proper-named counterpart on the article-led side (`throwing Excalibur`) has no opener and reads `Excalibur` as an untailed gerund, which the loader's dead-gerund error refuses today (`story-loader/src/runtime/bind.ts:192`) — the analyzer gains the same check against the manifest's action ids for a head word that follows a two-noun gerund, so the author sees it at compile time with the same fix-it. Recommended over a fixed keyword (`with the ball`), which reads wrongly on the recipient side.

The analyzer refuses a counterpart on a gerund list (`parse.head-counterpart-list`), on a one-noun gerund (`analysis.head-counterpart-one-noun`; the manifest carries no slot facts today — `StdlibManifest` holds `actionIds`, `settingSchema`, `hidingPositions`, `locales`, `chord/src/stdlib-manifest.ts:27-41` — so it gains `counterpartActions`, the action ids whose lifecycle descriptor declares two slots with `counterpart`, generated with the rest of the manifest and held by its `--check` gate), and on a counterpart that is the clause's own owner (`analysis.head-counterpart-is-owner`). Platform: each two-slot lifecycle descriptor's slots gain `counterpart(ctx)`, returning the other noun's entity (the seeds already carry its id); the loader records the counterpart's entity id on the clause and its guard compares it with the slot's counterpart before the body runs, exactly as ADR-371 D4's value tail compares the value. Untailed clauses fire as today. Throwing, giving, showing, putting, inserting and `asking_for` (D3) carry counterparts; checklist rows 43 and 86 become sayable with no change to throwing itself.

**D2 — No context value for the counterpart.** An untailed clause still cannot name the noun on the other side. Recommended and recorded: the tail is the way to say it, and `the thrown thing` or similar body words are not added; ADR-327's explicit references hold.

**D3 — `ask X for Y` is a request, the `asking_for` action.** A new `if.action.asking_for` with grammar `ask :recipient for :item`, `beg :recipient for :item` *(implementation note, 2026-10-14: `request :item from :recipient` is not shipped — the parser seats slots by position, so it would put the thing in the person's seat; the recipient-first forms carry the request)*; distinct from `asking` by its literal `for`, so `ask grocer about apples` is untouched. Slots: `recipient` (direct object, a person) and `item` (indirect, VISIBLE scope; asking for something unseen is the parser's ordinary "can't see"). Validate refuses `not_a_person`, `self` ("{You} can't ask {yourself} for things."), and `already_have` when the player holds the item. With no clause or a clause that does not refuse, report emits `if.event.asked_for` with the stock refusal `refused`: "{The recipient} {doesn't} seem inclined to hand over {the item}." The action mutates nothing; an authored clause does the giving (`move the wrench to the player`, a phrase, and `refuse` to stop the stock line, as every interceptor does). Clause shapes with D1: in the grocer's block `on the player asking_for the wrench`; in the wrench's block `on the player asking_for from the grocer`. **[call]** `asking_for` (ADR-370's underscore register for verb plus particle) over `requesting`, which reads better in a tailed head but would be the only stock gerund not spelled by its English verb.

**D4 — A readable thing answers `consult`.** `consulting` gets its implementation: grammar `consult :source about :topic`, `look up :topic in :source`, `read about :topic in :source`, `look :topic up in :source`; the topic is a topic slot, as asking's. *(Implementation note, 2026-10-14: in the topic-first forms the parser seats the source as the indirect object, so the action reads its source from either seat; `look :topic up in :source` is not shipped.)* The analyzer's `define topics` gate admits a `readable` owner beside a person. The action finds the source's topic rows through the same matcher asking uses (`matchTopicFilters`) and runs the matched row's body; no match is the stock `nothing_found`: "{You} {find} nothing about that in {the source}."; a source that is not readable is `not_consultable`: "{capitalize the source} isn't something {you} can look things up in." `on the player consulting` on the source is the interceptor, consulted before the table, as asking's interceptor is. **[call]** A readable thing's table is plain `about …:` rows only: `define exchange`, threads, `knows` gating and the character model stay people-only (`analysis.topics-readable-conversation`), because a book has no memory of being asked. Recommended: those mechanics model a listener, and a second consumer that half-honored them would be a seam.

**D5 — `costs <amount> <counter>` gates buying.** A new `if.action.buying` with grammar `buy :item`, `purchase :item`, `pay for :item` *(implementation note, 2026-10-14: `buy :item from :seller` is not shipped — the implementation-dispatching builder has one slot, so a seller counterpart would need the builder extended; deferred until a story needs a seller-narrowed clause; the builder gains an optional `targetScope`, default REACHABLE, and buying passes VISIBLE so a seller's goods in their hands can be bought)*. A thing with no price refuses `not_for_sale`: "{capitalize the item} isn't for sale." **The money model (resolved by David, 2026-10-14, interview Q-1: option a):** `costs 5 credits` on a thing names a counter, and buying spends it from the buyer's own per-entity counter of that name (the courier's `counter credits starts 20`), so a rotating player character carries a purse of its own and the platform gains no store. Rejected: a story-global `define counter` purse (one purse whoever plays), money as things (`costs the brass token`, a swap with no change), and no platform price (`costs` as a gate with the clause body as the implementation). **Where each part lives.** Counters are a story-loader store (`counterKey(name, ownerId)` world-state keys, `story-loader/src/state-keys.ts:92`, seeded at `loader.ts:510`); stdlib cannot read or write them without importing the loader's key format, which would invert the dependency. So the split follows ADR-371's burning and `settable`: world-model gains `PurchasableTrait` (`price: number`, `currency: string`), the gate; stdlib's `buying` is an implementation-dispatching action (`createImplementationDispatchingAction`, `dispatch-shared.ts`) whose validate refuses `not_for_sale` without the trait and `already_have` when the buyer holds the item, then finds the item's capability behavior; the story-loader lowers `costs 3 credits` to the trait and registers the buying capability behavior on it, which owns the money. That behavior's validate refuses `cant_afford` ("{You} can't afford {the item}."; params carry the price and the currency word) when the buyer's counter is below the price or the buyer carries no such counter; its execute subtracts the price from the buyer's counter and moves the item to the buyer through the world model; its report emits `if.event.bought` with `bought`: "{You} {buy} {the item}." An `on the player buying` clause interceptor is consulted around the behavior and may refuse or add (ADR-371 D1a). A TypeScript story registers its own behavior on `PurchasableTrait` with whatever purse it keeps. The analyzer requires the named counter to be declared on some `playable` person (`analysis.costs-counter-unknown`).

### Before and after

Unshipped syntax throughout; UPPS lines are illustrative.

```chord
## Throwing at a target (D1). Today the gong cannot tell the ball from a boot.
create the brass gong
  a thing, scenery
  in the Market Row
  states: still, ringing

  A brass gong hung from a stall's awning, dented by years of customers.

  on the player throwing the dust ball
    change the brass gong to ringing
    phrase gong-rung
  end on

create the dust ball
  a thing
  in the Dust Road

  on the player throwing at the dome glass
    refuse dome-too-far
  end on

## Asking for (D3) and buying (D5) on one stall.
create the grocer
  a person
  in the Market Row
  pronouns she

  on the player asking_for the ration bar
    move the ration bar to the player
    phrase grocer-hands-bar
  end on

create the ration bar
  a thing, costs 3 credits
  in the Market Row

create the courier
  a person, playable
  counter credits starts 10

## Consulting (D4): the Directory Hall's directory.
create the station directory
  a thing, readable with text "KEPLER STATION — ask the directory about a name."
  in the Directory Hall

define topics for the station directory
  about "vance", "company":
    phrase directory-vance
  about "records":
    phrase directory-records
```

Play, with the stock lines where nothing is authored:

```
> throw ball at gong          (the gong's tailed clause fires: gong-rung)
> throw boot at gong          (untailed throwing as today; the stock line)
> ask grocer for bar          (grocer-hands-bar; the bar moves)
> ask grocer for apples       The grocer doesn't seem inclined to hand over the apples.
> buy bar                     You buy the ration bar.  (credits 10 → 7)
> buy gong                    The brass gong isn't for sale.
> consult directory about vance   (directory-vance)
> look up plumbing in directory   You find nothing about that in the station directory.
```

## Consequences

- Every two-noun stock action is fully sayable from either side; the Mrs Kettle workaround remains valid and becomes optional (fernhill is David's; no line there changes).
- The head grammar gains a third tail; the split rule's two edge cases are diagnosed, not silent. A future two-noun action gets counterparts by declaring `counterpart` on its slots and nothing in the analyzer.
- `define topics` has two owner kinds. Conversation mechanics stay people-only, so the dialogue runtime's thread and character code is untouched.
- Buying introduces the platform's first price. Under the recommended D5 the store is an existing counter, so there is still no money concept of its own; a story that wants coins as things writes its own `on the player buying` body.
- Dungeo: `ask X for Y`, `consult`, `look up`, `buy` and `purchase` now parse where "I don't understand that." stood; each answers with a stock refusal. Reported as a finding at the phase, as ADR-370 D8 did.
- The language version does not move (ADR-257); the pin is re-recorded.

## Acceptance criteria

1. `on the player throwing the dust ball` in the gong's block fires for the ball and not for another thrown thing; `on the player throwing at the dome glass` in the ball's block fires only at the dome glass (UPPS cards, both sides, and the negative case).
2. A counterpart tail on a gerund list, on a one-noun gerund, or naming the owner is a diagnostic with the codes above (chord unit tests).
3. `ask grocer for bar` runs the grocer's tailed clause; an unauthored request prints the stock refusal and moves nothing (UPPS card; stdlib test asserting the item's location is unchanged).
4. `consult directory about vance` runs the topic row; an unmatched topic prints `nothing_found`; `consult` on an unreadable thing prints `not_consultable` (UPPS cards; stdlib test).
5. `define topics` on a readable thing compiles; `define exchange` for it is `analysis.topics-readable-conversation`.
6. `buy bar` with enough credits moves the bar to the player and lowers the buyer's counter by the price (story-loader test through the real engine asserting both the location and the counter's world-state value; UPPS card); short of credits is `cant_afford` with neither changed; an unpriced thing is `not_for_sale` (stdlib test, no `PurchasableTrait`); a TypeScript-registered behavior on `PurchasableTrait` is dispatched to (stdlib test).
7. Grammar, manifest and alias `--check` gates fresh; Dungeo chain green with its changed bare answers listed.

## Session

Session a0b591, 2026-10-14, branch `chord-4-0`.

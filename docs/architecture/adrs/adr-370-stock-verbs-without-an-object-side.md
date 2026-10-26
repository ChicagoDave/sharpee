# ADR-370: Stock verbs without an object side — kissing, waving, jumping, saying yes / no / sorry, looking under, emptying

**Status**: **ACCEPTED** (David, 2026-10-13, session 8196a4: "accept", on the four calls as recommended — the underscore gerund register, the drafted stock lines, D7 shipped at Phase 13, Dungeo accepts the stock lines — after `adr-review` 12/12 with two N/A). Drafted the same day on `chord-4-0`, Phase 5 of `docs/work/archive/chord-4-0/plan-20261013-chord-4-0.md`. The six rows are David's 2026-10-12 dispositions in `docs/work/archive/chord-4-0/standard-if-checklist.md` (rows 83, 87, 88, 90, 97, 99); the shape, grammar, stock lines and gates below are Claude's drafting, with reasons. Four calls are put to him, each marked **[call]** where it arises: the gerund spelling for the three saying actions and looking under (D4); the stock lines, which are Sharpee's own words and his to reword (D3); the GH #317 answer, decided here and shipped at Phase 13 (D7); and a Dungeo text finding (D8). No open questions section: each call has a recommended answer that the record is written to.

**Scope**: `packages/stdlib` (eight new action directories — the three saying actions are built from one shared shape, `standard/saying-shared.ts` — three new action ids, the lifecycle registry), `packages/parser-en-us` (`grammar/standard-en-us.story`, `grammar.ts` regenerated), `packages/lang-en-us` (six language entries), `packages/chord` (`stdlib-manifest.ts` and `message-alias-catalog.ts` regenerated; no parser or EBNF change — a gerund is a `WORD`), `packages/story-loader` (nothing: the dead-gerund gate reads the registry), `docs/architecture/chord-grammar-changes.md` (one row), the Chord guide's reactions page and the IDE's Docs tab, `branch-stories/upps` (the exercisers), and `docs/work/archive/chord-4-0/standard-if-checklist.md` (six evidence pointers). D7 adds `packages/if-domain` (a rule-level gate on `GrammarRule`) and `packages/chord` (the `define action … while` head) **at Phase 13, not here**.

## Date: 2026-10-13

**Kind**: technical

## Parent

- **ADR-228** (the shared lifecycle engine; D5 the registry of consulted action ids): every action here is consulted through a descriptor in `packages/stdlib/src/actions/lifecycle/registry.ts`, which is what makes `on the player <gerund>` fire and what the loader's `deadGerundError` reads (`story-loader/src/runtime/bind.ts:176`).
- **ADR-118** (interceptors; a story's reaction speaks in the stock line's place) and **ADR-327** (`on|after <actor> <gerund>` heads): the hook shape every row names.
- **ADR-368** (a head lists its gerunds): `on the player saying_yes, saying_no` is one head.
- **ADR-320 D16 and GH #346** (the open exchange claims bare input first): D6 keeps that stage ahead of the new saying actions.
- **ADR-269 / ADR-271** (`grammar/standard-en-us.story` is the editable source of the standard grammar; `define action` grammar registers at story tier with bare-verb prefixes) and **ADR-268 D2** (story tier outranks standard): the ground D7 and D8 stand on.
- **ADR-276** (the stdlib manifest the analyzer gates against): regenerated for the three new ids.
- **ADR-350 D2** (a word an author can write must change what the game does): D7's word ships with its reader at Phase 13, not before.
- **ADR-257** (language versioning, as amended 2026-08-29): the Chord surface does not change; the number moves at publish.
- **GH #317** (story-action bare-verb grammar needs scoping or stdlib fall-through): answered by D7, which Phase 13 inherits (plan-review 2026-10-13).
- **GH #362 / P-15** (sleeping as a signal action with a stock line): the pattern case for D1.

## Context — measured, not assumed

**Six ids are accepted as gerunds and nothing fires.** `if.action.jumping`, `kissing`, `waving`, `looking_under` and `emptying` are declared in `packages/stdlib/src/actions/constants.ts` (lines 33, 93, 94, 39, 56) and listed in `packages/chord/src/stdlib-manifest.ts` (67 ids after Phase 1's retirements), so the analyzer accepts `on the player jumping`; but no action directory exists for any of them (`packages/stdlib/src/actions/standard/` has 58 directories, none of these), no grammar line maps to them (`grammar.ts` has no `jump`, `kiss`, `wave`, `empty` or `look under` rule), and no descriptor consults them, so the loader refuses the clause at load: "no standard action consults `if.action.jumping`, so this clause would never fire" (`bind.ts:200`). Saying yes, no and sorry have no id at all (checklist row 90: "none; answering is topic-shaped").

**The pattern case exists and is small.** `sleeping` (`packages/stdlib/src/actions/standard/sleeping/sleeping.ts`) is a signal action: validate always succeeds, execute mutates nothing, report emits one `if.event.slept` whose `messageId` is the stock line `not_tired`, and `sleepingLifecycle` names the actor's current room as the one consultable slot, so a Chord `on the player sleeping` on the room speaks in the stock line's place. Its grammar is eight lines in `standard-en-us.story` regenerated into `grammar.ts:154-161`; its text is `lang-en-us/src/actions/sleeping.ts`. `listening` is the same shape with an optional object (`listeningLifecycle` resolves `ctx.command.directObject?.entity`). Three of the six rows need exactly this shape and nothing more.

**Bare `yes` already has one reader.** The engine's exchange-offer stage (`packages/engine/src/turn/exchange-offer.ts`) runs before the parse: while the player's live conversation scene holds an open exchange that claims the input, `yes` becomes `answer yes` and runs through `answering`. Outside an open exchange, `yes` reaches the parser and fails: Dungeo prints "I don't understand that." (probed 2026-10-13, below). `say yes` parses as `answering` (`grammar.ts:241`, `say :response`) and refuses outside an exchange. A conversation scene knows its participants (`conversation-scene-store.ts:91`, `sceneWith(world, player.id)`, `participantIds`), so the speaker the player is talking to is resolvable without an open exchange.

**Searching's reveal is a helper.** `analyzeSearchTarget` collects the target's contents and the `IdentityTrait.concealed` ones among them; `revealConcealedItems` clears the flag (`packages/stdlib/src/actions/standard/searching-helpers.ts:32,75`). Chord's `concealed` adjective lowers to that flag (`loader.ts:1856`) and is unconditional. There is no `under` relation in the world model: `ConcealmentTrait`'s `'under'` is a hiding position for actors (`hiding-spot with position under`), not a place a thing can be. So "reveals `concealed` things as searching does" (row 83) can mean only one thing: the concealed things the target holds.

**Two-word gerunds are spelled with an underscore today.** The corpus writes `on the player switching_on` (around 200 heads across the Secret Letter), `switching_off`, `taking_off` (6); a single `on the player switching on` exists, in a seeded UPPS fixture (`branch-stories/upps/seeded/room-04/TEST-004-M.story:237`) whose purpose is the fix-it. The parser takes the last head word as the gerund (`parser.ts:6383`), so `saying yes` would make `yes` the gerund. The register is the underscore; D4 keeps it.

**What Dungeo says today** (bundle, `--seed 42`, 2026-10-13): `jump`, `kiss mailbox`, `yes`, `no`, `sorry`, `empty mailbox`, `look under mailbox` → "I don't understand that."; `wave` → "What do you want to wave?" (Dungeo's own story-tier `wave :target`, `stories/dungeo/src/grammar/ritual-grammar.ts:106`, and the parser's missing-object flow); `wave hands` → "You can't see any such thing." (the story rule matched and `hands` resolved to nothing). No walkthrough or unit transcript types any of these bare (`wave stick` appears four times; the chain cannot move), but the answers to the bare forms change (D8).

**GH #317's shape.** A `define action` grammar line is a global claim at story tier (`loader.ts:1235`, `registerActionGrammar` with `bareVerbForms: true`): the Secret Letter's `define action releasing` with grammar `drop` (`aerial-runway.chord:360`) shadows the standard `drop` everywhere, so outside On the Wire the only thing bare `drop` can do is print the action's `refuse when` phrase, never reach the parser's own "What do you want to drop?". `GrammarRule` (`if-domain/src/grammar/grammar-builder.ts:440`) has no rule-level predicate — only slot gates via `.where()`. Phase 5 is named because `yes`, `no`, `sorry` and `jump` are bare verbs a story might otherwise reach for `define action` to claim.

## Decision

**D1 — The family: a signal action in sleeping's shape, one descriptor each.** Each of the six actions is a four-phase standard action whose stock line is its *success* message, not a refusal: validate checks only what the grammar's object must be (reachable, held, a container), execute mutates nothing except where the row names a mutation (D5, D6), report emits one event carrying the stock message id, and a lifecycle descriptor in the registry names the consultable slot so a Chord `on`/`after` clause on that entity fires through the ordinary ADR-228 engine and speaks in the stock line's place. No new platform concept: the shape is `sleeping` with an object where the verb has one. Each descriptor joining the registry is what retires the dead id: `interceptorConsultingActionIds` is derived from the descriptor table, so the loader's dead-gerund gate passes the moment the descriptor exists.

**D1a — The contract per action.** Report events, one per action, each carrying `messageId`, `actorId` and the slot entity's id: `if.event.jumped` (`location`), `if.event.kissed` (`target`), `if.event.waved` (`target?`, `location`), `if.event.said_yes` / `said_no` / `said_sorry` (`speaker?`, `location`), `if.event.looked_under` (`target`, `revealedIds`), `if.event.emptied` (`source`, `destination`, `movedIds`, `unmovedIds`). Blocked events are `<report event>` with `blocked: true` and `blockedMessageId`, as `sleeping` does. Descriptor slots resolve as: jumping → `ctx.currentLocation`; kissing, looking_under, emptying → `ctx.command.directObject?.entity`; waving → the direct object, else `ctx.currentLocation`; the three saying actions → the other participant of `sceneWith(ctx.world, actor.id)` (`conversation-scene-store.ts:91`, `participantIds` minus the actor) when a live scene exists, else `ctx.currentLocation`. Each action is registered where `sleeping` is: its directory under `standard/`, the barrel, `actionLifecycleDescriptors` in `lifecycle/registry.ts`, and the standard-actions index.

**D1b — The update contract, performed together.** (1) `constants.ts` gains the three ids; (2) the six action directories and six language entries land with their registry descriptors; (3) `grammar/standard-en-us.story` gains the lines and `./repokit grammar` regenerates `grammar.ts`; (4) `./repokit manifest` regenerates `stdlib-manifest.ts` (70 ids, grammar shapes) and `./repokit aliases` the message-alias catalog; (5) both `--check` gates pass in the build. A story compiled against a stale manifest would accept `saying_yes` and then fail at load, which is why (4) is not optional.

**D2 — Grammar, in `grammar/standard-en-us.story`, regenerated into `grammar.ts` and the manifest.**

| Action | Lines | Object | Consultable slot |
|---|---|---|---|
| jumping | `jump`, `leap`, `hop`, `jump up` | none | the actor's room |
| kissing | `kiss :target`, `hug :target`, `embrace :target` | reachable | the target |
| waving | `wave`, `wave hands`, `wave hand`; `wave :target` | held, for the object form | the target; the actor's room when there is none |
| saying_yes | `yes` (not `y`: clients use it as a prompt answer) | none | the scene speaker, else the actor's room |
| saying_no | `no` | none | as above |
| saying_sorry | `sorry`, `apologize`, `apologise` | none | as above |
| looking_under | `look under :target`, `look beneath :target`, `look underneath :target` | reachable | the target |
| emptying | `empty :target`, `empty out :target`, `empty :target into|in|onto|on :destination` | a reachable container; destination a container or supporter | the target |

`wave hands` is a literal line beside `wave :target`, so literal specificity picks it over a slot match on the word `hands` (ADR-268's tie order). `jump over :target` and `jump off :target` are not lines: Inform treats them as a separate action and no row asks for one; they stay unparsed. Three ids join `constants.ts`: `SAYING_YES: 'if.action.saying_yes'`, `SAYING_NO`, `SAYING_SORRY`; the manifest regenerates to 70 ids. `say yes`, `answer yes` and `reply yes` keep mapping to `answering` (they are answers to something).

**D3 — Stock lines, in Sharpee's own words. [call: wording]** Each action's language entry carries these; a story's reaction replaces them, and `override message` rewords them story-wide. Drafted here for David to reword:

| Action | Message id | Line |
|---|---|---|
| jumping | `jumped` | "{You} {jump} on the spot. Nothing comes of it." |
| kissing | `kissed_person` | "{The target} {is} having none of that." |
| kissing | `kissed_thing` | "{You} {kiss} {the target}. Nothing comes of it." |
| waving | `waved_hands` | "{You} {wave}. Nobody waves back." |
| waving | `waved` | "{You} {wave} {the target} about. Nothing happens." |
| waving | `not_held` (refusal) | "{You} {aren't} holding {the target}." |
| saying_yes | `nobody_asked` | "Nobody asked {you} anything." |
| saying_no | `nobody_asked` | "Nobody asked {you} anything." |
| saying_sorry | `nothing_to_apologize_for` | "There is nothing to apologize for." |
| looking_under | `nothing_under` | "{You} {find} nothing under {the target}." |
| looking_under | `found_under` | "Under {the target} {you} {find} {items}." |
| emptying | `emptied_here` | "{You} {empty} {the target} onto the floor: {items}." |
| emptying | `emptied_into` | "{You} {empty} {the target} into {the destination}: {items}." |
| emptying | `already_empty` (refusal) | "{The target} {is} already empty." |
| emptying | `container_closed` (refusal) | "{The target} {is} closed." |
| emptying | `not_a_container` (refusal) | "{You} {can't} empty {the target}." |
| emptying | `into_itself` (refusal) | "{You} {can't} empty {the target} into itself." |
| emptying | `destination_closed` (refusal) | "{The destination} {is} closed." |
| emptying | `destination_full` (partial) | "{The destination} {has} no room for {the item}." |
| emptying | `cant_empty_into` (refusal) | "{You} {can't} empty {the target} into {the destination}." |
| kissing, looking_under, emptying | `no_target` (refusal) | "Kiss what?" / "Look under what?" / "Empty what?" |

The lines are the platform's and are not Inform's ("You jump on the spot, fruitlessly", "Keep your mind on the game", "That was a rhetorical question", "Oh, don't apologise"): Sharpee does not ship another system's voice.

**D4 — The hooks, and the gerund register. [call: spelling]** The clause gerunds are the action ids' last segment, as every other hook is: `on the player jumping` (on a room), `on the player kissing` (in the kissed thing's block, or `on the player kissing anything as the …` on an actor), `on the player waving` (in a thing's block for `wave <it>`; on a room for the bare form), `on the player saying_yes` / `saying_no` / `saying_sorry` (in a person's block, firing when the player says it while in a conversation scene with that person; on a room, firing when the player says it there outside any scene), `on the player looking_under` (in the thing's block), `on the player emptying` (in the container's block). The underscore is the register every two-word gerund in Chord uses today (`switching_on`, `taking_off`, `saying_goodbye`); David's checklist wording `on the player saying yes` would need the head parser to join two words into a gerund, which is a change to how every head is read and belongs to its own decision over all five existing two-word ids at once, not inside this one. **Recommended: keep the register here; open the two-word surface as its own question if wanted.** The gerund list works unchanged: `on the player saying_yes, saying_no`.

**D5 — Looking under reveals what the target holds.** `look under <x>` reveals the `concealed` things whose location is `x`, exactly the set `searching` reveals through `analyzeSearchTarget` and `revealConcealedItems`, reporting `found_under` with the list; with nothing concealed it reports `nothing_under` and reveals nothing. It does not read `ConcealmentTrait`, which is about actors hiding. A reveal that depends on anything else — pushing the rug first, a lit room — is the story's, written as `on the player looking_under` with the body the story wants; the stock line is what plays when no clause speaks.

**D6 — Emptying moves a container's contents, through the behaviors putting uses.** `empty <x>` requires `x` to be a container the actor can reach (`not_a_container` otherwise) that is open if it is openable (`container_closed`) and not empty (`already_empty`); it moves every item `x` holds to the actor's current location and reports `emptied_here` with the list. `empty <x> into <y>` requires `y` to be a container or supporter the actor can reach, open if openable (`destination_closed`), not `x` itself (`into_itself`); it moves items in listing order, each through the same acceptance check `putting` uses (`ContainerBehavior.canAccept`, which reads `holds <n>` from ADR-369), stopping at the first that does not fit and reporting `destination_full` naming that item after `emptied_into` names the moved ones — a partial empty is a success with a tail, never a refusal that undoes the moves. One event, `if.event.emptied`, carries the moved ids, the source and the destination. Worn things are not contents and are untouched, and an actor standing in an enterable container is not an item and is never moved.

**D7 — GH #317: a `define action` head takes `while <condition>`; decided here, shipped at Phase 13.** `define action releasing while the player is in On the Wire` makes every grammar line of the action a claim only while the condition holds; while it does not, the input parses as though the action did not exist, so a shadowed standard verb reaches its own grammar and clarifications ("What do you want to drop?") untouched. The `refuse when` arm is unchanged and still serves refusals *inside* the claim. The mechanism is a rule-level gate: `GrammarRule` gains an optional `when` predicate over the world, the grammar engine skips a story-tier rule whose predicate is false before matching, and the loader attaches the compiled condition to every rule the action registers (bare-verb prefixes included). This is the "scoped grammar" half of the issue, chosen over refusal fall-through because fall-through is implicit — a story that *means* to shadow a verb with its own elsewhere-refusal would lose the text it wrote — and because the head condition is the shape Chord already uses to scope a clause (`on the player taking while …`). Nothing in Phase 5 needs it: every bare verb this record adds exists in the standard library, so a story scopes its *reaction* with `while` on the clause head, which ships today, and the action's own stock line is the elsewhere behaviour. The word therefore ships with its reader at Phase 13 (custom-command passages, whose first user it is), not before (ADR-350 D2); the EBNF, the grammar log and the pin move then. **[call: this is the design the plan asked Phase 5 to settle once; confirm or redirect.]**

**D8 — Dungeo's text moves on eight bare commands; the finding is reported, not absorbed.** *Confirmed 2026-10-13 after the build*: `jump`, `kiss mailbox`, `yes`, `no`, `sorry`, `empty mailbox`, `look under mailbox` print the stock lines and bare `wave` prints "You wave. Nobody waves back."; `wave hands` still prints "You can't see any such thing.", because Dungeo's story-tier `wave :target` outranks the standard literal `wave hands` (ADR-268 D2: story tier first, before specificity) — a Dungeo matter, not a platform one. The chain is unchanged at 952. After D2, `jump`, `kiss <x>`, `yes`, `no`, `sorry`, `empty <x>` and `look under <x>` print stock lines where Dungeo prints "I don't understand that.", and bare `wave` prints `waved_hands` where Dungeo prints "What do you want to wave?" (its story-tier `wave :target` no longer wins the bare form, because a full standard match outranks a partial story match). No transcript types any of them bare, so the chain cannot see the change. **[call]** Dungeo may keep its answers by removing the standard rules through `grammar.removeRules` in its grammar setup (the same primitive `remove from action` uses), or accept the stock lines; this record changes nothing in `stories/dungeo` and the choice is David's. Recommended: accept the stock lines — mainframe Zork answered `jump` and `yes`, and "I don't understand that." was never the port's intent.

### Before and after

Every example is UPPS, in corpus style. The first block compiles today; everything after it is this record's surface, unshipped until Phase 5 lands.

Today — the only way to react to a bare verb is a story action, which claims the verb everywhere:

```
define action jumping-off
  grammar
    jump
  refuse when the player is not in the Landing Pad: no-jumping-here
  phrase pad-jump

define phrase no-jumping-here
  There is no call for that.
end phrase
```

After D1–D4 — the verb exists, the clause is the hook, and `while` on the head is the scope:

```
create the Landing Pad
  a room
  aka pad, pad 14, pad fourteen, ceres, cement
  in to the Airlock

  Pad 14 is a circle of old cement under a black sky.

  on the player jumping
    phrase pad-jump
  end on

create the pad master
  a person
  in the Landing Pad
  aka quint, dolores, master
  states: unconvinced, waved-through

  on the player saying_yes while the pad master is unconvinced
    phrase quint-takes-yes-as-the-card
  end on

  on the player saying_no, saying_sorry
    phrase quint-shrugs
  end on

  on the player kissing
    phrase quint-kissed
  end on

create the mail crates
  a thing, scenery
  in the Loading Dock
  aka crates, crate, stack

  on the player looking_under
    phrase crates-underneath
  end on

create the route tray
  a container
  in the Sorting Room
  aka tray
  holds 3

  after the player emptying
    phrase tray-emptied
  end after
```

`jump` anywhere but the pad prints the stock line; `yes` to Quint while she is unconvinced fires her clause, `yes` to her afterwards prints "Nobody asked you anything.", and `yes` inside an open `define exchange` never reaches here (D6). `wave` in the Hold prints "You wave. Nobody waves back."; `look under crates` prints the crates' phrase; `empty tray` without a clause spills the three parcels onto the floor.

After D7, at Phase 13 — a story verb that shadows a standard one is claimed only where it means something (**unshipped**; the Secret Letter's own case):

```
define action releasing while the player is in On the Wire
  grammar
    drop
  phrase let-go-drop
  move the old gray cloak to Behind Fruit Stall
  move the player to Behind Fruit Stall
```

Elsewhere, `drop` is the standard verb: "What do you want to drop?"

## Consequences

- **Six checklist rows become sayable** (83, 87, 88, 90, 97, 99), each with an evidence pointer to the UPPS card that exercises it; five dead ids retire (jumping, kissing, waving, looking_under, emptying), leaving `consulting`, `setting` (Phases 6 and 7) and the deferred `hints`, `tasting`.
- **The speaker path of the saying actions is pinned by the stdlib test only** (AC-2): UPPS has no `define conversation` yet, so `talk to quint` opens no scene and an answer on the pad is an answer to nobody — its clauses sit on the Landing Pad room, with a note to move them into Quint's block when her thread lands. Found in implementation, 2026-10-13.
- **D5 in practice**: a thing the player can look under must be a container (or supporter) to hold anything — `world.moveEntity` refuses a placement into a plain thing — so a `concealed` thing "under" a mat is written `in the mat` with the mat `a container`. The guide says so.
- **The derived runner does not yet reach these clauses** (ADR-356): room-consulted intransitive verbs are skipped as `command-shape`, a held-thing clause with a room condition as `subject-unreachable`, and a reaction on a container that starts closed fails on the closed refusal. Filed as a branch-tester issue on 2026-10-13; the authored cards cover every case.
- **Three new action ids** and six action directories, six language entries, the manifest at 70 ids and the alias catalog regenerated; the lifecycle registry grows by six descriptors.
- **No Chord parser change and no EBNF change**: the hooks are gerunds the register already spells. One grammar-log row records that six gerunds now fire.
- **The exchange-offer stage keeps precedence** (D6): inside an open exchange `yes` is still an answer; the new actions see only what no exchange claims.
- **Dungeo's answers to eight bare commands change** (D8); David decides whether the port keeps the old ones.
- **GH #317 is decided but stays open until Phase 13 ships D7**; the issue gets a comment pointing here, and Phase 13's entry state cites this record instead of designing again.
- **One stdlib reader of `holds <n>` is added** (D6's acceptance check), so the Dungeo chain is run once after the phase.

## Acceptance criteria

- **AC-1 (D1, D2)**: each of the eight grammar groups parses to its action id in a parser-en-us test; `grammar.ts` and `stdlib-manifest.ts` are regenerated and both `--check` gates pass; `constants.ts` carries the three new ids and the manifest 70.
- **AC-2 (D1, D4)**: a Chord story with `on the player jumping` on a room, `on the player kissing` / `looking_under` / `emptying` / `waving` in a thing's block, and `on the player saying_yes` in a person's block compiles and loads with no dead-gerund error; a stdlib unit test per action pins that the clause's entity is the one the descriptor resolves (room, target, scene speaker, room-when-no-scene).
- **AC-3 (D3, REAL-PATH)**: through the assembled engine on UPPS lines, each bare verb with no clause prints its stock line; the tree cards pin the text.
- **AC-4 (D4, REAL-PATH)**: on UPPS lines, each clause in the Before-and-after block fires and its phrase prints in the stock line's place; `yes` to Quint while unconvinced fires her clause and `yes` afterwards prints the stock line.
- **AC-5 (D5)**: a stdlib test: `look under <x>` where `x` holds a concealed thing clears `IdentityTrait.concealed` on it and reports `found_under` naming it; where `x` holds nothing concealed, nothing changes and `nothing_under` is reported.
- **AC-6 (D6)**: stdlib tests assert on `world.getLocation()` after `empty`: every item of an open container moves to the actor's room; `empty x into y` moves them into `y` and stops at `y`'s `holds <n>` with `destination_full` naming the first unmoved item and the moved ones in `y`; closed source, closed destination, empty source, non-container source and `into itself` each refuse with their id and move nothing; a worn item inside a container-actor is untouched.
- **AC-7 (D6, REAL-PATH)**: on a UPPS line, `empty tray` spills its parcels onto the floor and `look` lists them; the card pins the text.
- **AC-8 (D6 exchange precedence)**: an engine test (test-only; no engine source changes): with an open exchange claiming `yes`, bare `yes` runs `answering`; with none, it runs `saying_yes`.
- **AC-9 (D8)**: the Dungeo chain is unchanged in one run (952 passing); the eight changed bare answers are listed in the session summary for David's ruling.
- **AC-10 (Scope)**: the grammar-log row, the guide's reactions page naming the six gerunds, the Docs tab regenerated; the stdlib, parser-en-us, lang-en-us, chord and story-loader suites green; the six checklist rows carry their UPPS evidence pointers; GH #317 carries a comment naming D7 and Phase 13.

## Session

Drafted in session 8196a4 (2026-10-13) on branch `chord-4-0`, Phase 5 of the Chord 4.0 plan. The Dungeo probe cited in Context ran against `dist/cli/sharpee.js` built 2026-10-13 21:04.

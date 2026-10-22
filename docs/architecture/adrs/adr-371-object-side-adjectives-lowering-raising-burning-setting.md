# ADR-371: Object-side adjectives — lowering and raising take the clause body as their implementation, `flammable with <tool>` gates burning, and `settable` turns a thing's states into a dial

**Status**: **ACCEPTED** (David, 2026-10-13, session 8196a4: "accept", on the three calls as recommended — `settable` reads the thing's reversible states, the `to <value>` head tail, the factory retired once confirmed for deletion — after `adr-review` 12/12 with two N/A). Drafted the same day on `chord-4-0`, Phase 6 of `docs/work/chord-4-0/plan-20261013-chord-4-0.md`. The four rows are David's 2026-10-12 dispositions in `docs/work/chord-4-0/standard-if-checklist.md` (row 41 lowering and raising, row 91 burning, row 95 setting); the shapes below are Claude's drafting, with reasons. Three calls are put to him, each marked **[call]**: that `settable` reads the thing's own `states, reversible:` line instead of carrying a value list of its own (D3); the `to <value>` tail on a `setting` head (D4); and retiring the capability-dispatch factory once nothing uses it (D1). No open questions section: each call has a recommended answer the record is written to.

**Scope**: `packages/stdlib` (lowering and raising rewritten in turning's shape; new `burning` and `setting` actions and ids; the lifecycle registry; the factory `capability-dispatch.ts` retired), `packages/world-model` (`FlammableTrait` and `FlammableBehavior` in cuttable's shape, both barrels), `packages/parser-en-us` (`grammar/standard-en-us.story`, `grammar.ts` regenerated), `packages/lang-en-us` (two new entries, two amended), `packages/chord` (catalog: `flammable`, `settable`; analyzer: the one-implementation census gains burning, the `settable` gates, the head value tail; parser and `chord.ebnf`: the `to <value>` tail; manifest and alias catalog regenerated; the EBNF pin re-recorded without a bump), `packages/story-loader` (lowering of `flammable with`, the `settable` capability behavior, the value-tail guard, the lowering/raising special case removed), `docs/architecture/chord-grammar-changes.md` (one row per decision), the Chord guide and the stdlib reference, the IDE Docs tab, `branch-stories/upps` (the exercisers), and the checklist's four evidence pointers.

## Date: 2026-10-13

**Kind**: technical

## Parent

- **ADR-090** (capability dispatch) and **ADR-228** (the lifecycle engine; D5 the consulted-id registry): the two implementation surfaces every action here dispatches to.
- **ADR-230 D3c and Phase 6** (cutting and digging: a trait gates eligibility, the entity's own implementation owns the outcome, exactly one implementation): the shape burning takes.
- **Turning (chord go-live G1, 2026-07-17)**: the dual-surface action with no trait gate — the shape lowering, raising and setting take.
- **ADR-350 D5** (the Dungeo bucket and basket are not unified): the basket's capability behaviors stay as they are and keep working through D1's capability surface.
- **ADR-359 D1** and the `states-line` production (`states [, reversible]: …`, ratchet D2/D4/D8): the states D3 reads.
- **ADR-368** (a head lists its gerunds) and **ADR-327** (heads name who acts): the head D4 extends with a tail.
- **ADR-369 D2** (a kind noun takes no `with` settings; an adjective's `with <article> <name>` is its single-entity value): `flammable with the torch` is that form.
- **ADR-370** (Phase 5): the stock-line pattern and the underscore gerund register this record continues; its D7 (`define action … while`) is unrelated and stays at Phase 13.
- **ADR-257** (language versioning, as amended): additive; the pin is re-recorded under the unpublished 4.0 surface.

## Context — measured, not assumed

**Lowering and raising are the last full-delegation factory actions.** `loweringAction` and `raisingAction` are `createCapabilityDispatchAction(...)` (`packages/stdlib/src/actions/standard/lowering/lowering.ts:51`, `raising/raising.ts:25`), the only two users of `packages/stdlib/src/actions/capability-dispatch.ts` (grep, 2026-10-13). The factory finds a trait claiming the capability and calls its behavior; it has no lifecycle descriptor, so no interceptor is ever consulted, which is why the loader refuses `on the player lowering` with a pointed message ("full-delegation capability action by design", `story-loader/src/runtime/bind.ts:194`) and the checklist marks the row "react only". `turning` already solved the same problem on 2026-07-17 (`turning/turning.ts` header): a dual-surface action with no trait gate, dispatching to a capability behavior OR to the entity's interceptor (the Chord clause), refusing `cant_turn_that` when it has neither. The Dungeo basket (`stories/dungeo/src/traits/basket-elevator-trait.ts:38`, capabilities lowering and raising; `basket-elevator-behaviors.ts`) is the one capability-surface user, exercised by `tests/transcripts/basket-elevator.transcript` (`lower basket`, `raise basket`, four times) and no walkthrough.

**Burning has nothing.** No `BURNING` id (`constants.ts`), no grammar line (`grammar.ts` has no `burn`, `ignite` or `light`), no trait (`packages/world-model/src/traits/` has `cuttable` and `diggable`, no flammable). Cutting's shape is complete and reusable: `CuttableTrait` carries `toolId`/`toolIds` (`cuttable/cuttableTrait.ts`), `CuttableBehavior` answers `requiresTool`/`canCutWith`/`requiredTools`, `resolveToolRequirements` (`standard/tool-shared.ts`) turns those into the four tool refusals, the analyzer's census 13 (`analyzer.ts:1630`, `TOOL_GATED_GERUNDS`) and the loader's `checkCuttableImplementations` (`loader.ts:1661`) enforce exactly one implementation, and `loader.ts:1804` lowers `cuttable with the knife` to the trait with a forward-resolved tool id. Every one of those is a table with two rows.

**Setting has an id and nothing else.** `if.action.setting` is declared (`constants.ts:76`) and in the manifest; no grammar, no action, no trait. What a dial needs — a closed list of values and a current one, readable by conditions and changeable by statements — Chord already has: a thing's `states[, reversible]: a, b, c` line, stored as one world-state value under `chord.state.<id>` (`state-keys.ts:14`, `loader.ts:504`), changed by `change the dial to high` through `checkForwardMarch` (`statements.ts:143-170`; plain states march forward, `reversible` ones go anywhere), read by `while the dial is high`, and selected on by `select on the dial`. A second value store on a platform trait would be the seam problem the core concepts name: one fact in two places. The platform's job is the verb — parse `set <x> to <word>`, find the thing's implementation, carry the word — and the story-loader's job is to make a `settable` thing's states that implementation.

**The head has no tail for a value.** `parseOnClauses` reads head words up to `while`, `during`, `anything`, a comma or EOL (`parser.ts:6366`); `anything as the <role>` is the one tail a head takes today. `the match` is the E3 binder of `each` blocks only (`chord.ebnf:1863`, "standalone only").

**UPPS has none of the three.** The Cockpit (`upps.story:272`) has a couch, a card slot and the fold drive (`switchable`); nothing lowers, burns or sets. The design doc names the guidance system and airlock controls as the setting exercisers; the courier ship's ramp (prose only; the robot lowers it) is the lift; the depot's returns bin and dead letter (Phase 5) are where a flammable fits.

## Decision

**D1 — Lowering and raising become turning-shaped actions; the clause body is the implementation.** `loweringAction` and `raisingAction` are rewritten in `turning`'s shape: no trait gate; validate finds the target's implementation — a capability behavior on one of its traits, or an interceptor consulting the action id — and refuses `cant_lower_that` / `cant_raise_that` with neither (the same ids and texts as today); execute runs a behavior's execute when that is the surface; report returns the behavior's effects or the standard `if.event.lowered` / `if.event.raised` with message `lowered` / `raised` for the interceptor surface (texts exist in lang-en-us today). Each gets a lifecycle descriptor (`target`, the direct object) in the registry, so the ids join the consulted set and the loader's special case in `deadGerundError` is removed. A Chord `on the player lowering` in the thing's block is the implementation: its body makes the change, its phrase speaks, exactly as `on the player cutting` does; a thing with no clause and no behavior refuses as it does today. The Dungeo basket's behaviors are the capability surface and keep working unchanged; the chain and `basket-elevator.transcript` prove it. **[call]** With both users gone, `capability-dispatch.ts` has none; recommended: retire it (a deletion, so it waits for David's list-and-confirm) — keeping an unused factory invites a third full-delegation action.

**D2 — `flammable [with the <tool>]` gates burning, in cutting's shape.** A new `if.action.burning` with grammar `burn :target`, `burn :target with|using :tool` (the tool an instrument slot), `ignite :target`, `set fire to :target`; not `light :target`, which would turn `light lamp` into a burning refusal. World-model gains `FlammableTrait` (`toolId?`, `toolIds?`) and `FlammableBehavior` (`requiresTool`, `canBurnWith`, `requiredTools`), mirrors of cuttable's, in both barrels. The action: validate requires the trait (`not_flammable`: "{capitalize the item} isn't something {you} can burn."), resolves the tool through `resolveToolRequirements` (the four cutting refusals, reworded for burning), and requires one implementation (`cant_burn`, the runtime net); execute and report dispatch exactly as cutting does; the interceptor surface's standard event is `if.event.burned` with message `burned` ("{You} {set} fire to {the item}."). Chord: `flammable` joins `TRAIT_ADJECTIVES` with `with the <tool>` as its single-entity value (the `setting` production, ADR-369 D2); the analyzer's census and the loader's check each gain the row `{ flammable, burning }`, so a flammable thing registers exactly one `on the player burning` body (zero or two is `analysis.gerund-implementation`); `loader.ts`'s cuttable case gains `flammable` → `FlammableTrait` with the forward-resolved tool. A thing that is not flammable prints the stock refusal and no clause can fire — the author who wants `burn` on a non-flammable thing makes it flammable and writes the body.

**D3 — `settable` makes a thing's reversible states a dial; the platform sees a dual-surface verb. [call]** A new `if.action.setting` action in turning's shape, with grammar `set :target to :value`, `turn :target to :value`, `adjust :target to :value` (the value a topic slot: free text, so a two-word state like `kepler station` arrives whole). It has no trait gate: validate finds the target's implementation (behavior or interceptor) and refuses `cant_set_that` ("{capitalize the target} isn't something {you} can set.") with neither; the implementation decides whether the value is one of the thing's settings. Chord: `settable` is a marker adjective legal on a thing that has a `states, reversible:` line — `analysis.settable-states` without one (naming the line to add), `analysis.settable-irreversible` on plain states (a dial goes anywhere; a phase marches) — and lowers to nothing on the entity. Instead the **story-loader registers one capability behavior for `if.action.setting` on each settable thing**, built from its states: validate compares the typed value, lowercased with spaces and hyphens equal, against the state words and refuses `not_a_setting` with the list ("{capitalize the target} goes to {values}."); execute writes the state through the same path `change the dial to <state>` takes; report emits `if.event.set` with message `set` ("{You} {set} {the target} to {value}.") and the value. So after `set selector to titan`, `while the guidance selector is titan`, `select on the guidance selector`, `change the guidance selector to ceres` and `after the player setting` all agree, because there is one value and it is the state. Recommended over a `settable to <values>` list of its own because that list would be a second store beside states, with its own conditions to invent; the one thing the row's wording loses is a dial whose values are not states, and nothing in the corpus or the design doc wants one. A TypeScript story gets the same verb by registering a capability behavior, as with turning.

**D4 — A `setting` head takes `to <value>`. [call]** `on the player setting to kepler` and `after the player setting to titan` fire only when the value set is that word; the tail is read after the gerund list and before `anything`, `while` and the modifiers (`parser.ts`'s head stop set gains `to`), carried on the clause as `valueTail` (AST and IR, optional), legal only when the head's gerund is `setting` (`analysis.head-value-tail` elsewhere, naming `while <thing> is <value>` as the form for other verbs), and the word must be one of the thing's states (`analysis.setting-tail-unknown`). The loader guards the registered hook: it runs only when the consultation's seeded `value` equals the tail. Without a tail the clause fires for every value, and `after the player setting while the selector is titan` is the same test written as a condition. Recommended because David's row wrote the hook as `on the player setting it to X`: the `to` tail is that, minus the retired `it`; an `on` clause has no other way to see the value before it is written.

**D5 — The stock lines and refusals, Sharpee's words.** Lowering and raising keep `no_target`, `cant_lower_that` / `cant_raise_that`, `lowered` / `raised`; their `already_down` / `already_up` lines stay for behaviors that use them. Burning: `no_target` "Burn what?", `not_flammable`, `cant_burn` ("Burning {the item} would achieve nothing here."), `no_tool` ("{You} {need} something to burn {the item} with."), `needs_tool`, `tool_not_held`, `wrong_tool` (cutting's wording with "burn"), `burned`. Setting: `no_target` "Set what?", `no_value` ("Set {the target} to what?" — `set :target` with no value is a separate line that refuses), `cant_set_that`, `not_a_setting`, `set`.

**D1a — Implementation-dispatching actions are never pre-empted, and an interceptor counts only for the things it claims. (Amendment, 2026-10-14, session 8196a4, at David's "go"; found by the UPPS probe.)** Two seams stood between D1–D4 as written and the game. (1) The engine's universal capability dispatch (`packages/engine/src/command/command-executor.ts`) ran any capability behavior *instead of* the action and consulted no interceptors, so the `settable` behavior and the selector's own clauses could not both run — `set selector to kepler` succeeded past its refusal and the `after` line never printed. It had the same effect on a TypeScript cutting behavior, skipping cutting's tool check. Fix: `Action.dispatchesImplementations` (stdlib `enhanced-types.ts`), set on turning, cutting, digging, burning, lowering, raising and setting; the executor skips universal dispatch for a flagged action, so the action runs the behavior itself and the phase runner still consults the target's interceptors around it. (2) The loader registers one clause interceptor per verb on the marker trait every Chord clause owner shares, so a thing with any clause "had" an implementation of every verb any other thing implements — `lower crates` printed "You lower the mail crates." because the courier ship has a lowering clause. Turning carried the same flaw since 2026-07-17. Fix: `ActionInterceptor.claims?(entity)` (world-model), answered by the loader's clause interceptor from its per-thing arms, and read by one shared check (`hasInterceptorImplementation`, stdlib `dispatch-shared.ts`) in all seven actions. The derived runner (`packages/branch-tester`) learned the two new surfaces the same day: burning arranges its declared tool in hand as cutting does, and a `setting` branch types its `to <value>` tail (or a state no tailed sibling names), with a tailed refusal intercepting only its own value; world-index carries `valueTail` on the branch clause. Scope grows by `packages/engine`, `packages/world-model` (the interface, beside the trait pair), `packages/branch-tester` and `packages/world-index`.

**D2a — The tool is one shared shape. (Amendment, 2026-10-22, session 36d713; alignment-fixes Q12 C.)** D2's `toolId`/`toolIds` pair on `FlammableTrait` and its `FlammableBehavior` predicates (`requiresTool`, `canBurnWith`, `requiredTools`) are gone, as are cuttable's, diggable's, openable's and light-source's. Each tool-gated trait holds `toolRequirement?: ToolRequirement` (`world-model/src/traits/tool-requirement.ts`), `resolveToolRequirements` takes that value, and the three behaviors that held nothing else were deleted. AC-3's "`FlammableTrait.toolId` resolved" now reads `FlammableTrait.toolRequirement.tools` holding the tool's world id. Chord syntax is unchanged.

**D1b — The builder is public. (Amendment, 2026-10-14, at David's "export it and fix the docs".)** `createImplementationDispatchingAction`, `hasInterceptorImplementation` and `ImplementationDispatchSpec` are exported from `@sharpee/stdlib`, so a story builds a verb with no standard semantics the way lowering, raising and setting are built. It replaces the old factory as the documented way: `createCapabilityDispatchAction` was never exported, though `docs/core-concepts/README.md` showed it imported from `@sharpee/stdlib`; that section, its stale free-function registration snippet and the stdlib notes now describe the two dispatch paths and the builder.

**D6 — Phase 12 reuses `settable` for destinations.** A vehicle's selector is a settable thing whose states are its stops; nothing here is vehicle-specific, which is the point of putting the values on states.

### Before and after

UPPS, corpus style. The first block compiles today; everything after is this record's surface, unshipped until Phase 6 lands.

Today — a lift can only be refused, and nothing burns or sets:

```
create the courier ship
  a thing, scenery
  in the Loading Dock
  aka ship, courier, sparrow, ramp, skids
  states: buttoned, boarding, underway, landed

  ## `on the player lowering` is refused at load: nothing consults it.
```

After D1 — the clause body is what lowering does:

```
create the courier ship
  a thing, scenery
  in the Loading Dock
  aka ship, courier, sparrow, ramp, skids
  states: buttoned, boarding, underway, landed

  on the player lowering, raising
    phrase ramp-is-the-robots
  end on
```

After D2 — a flammable thing with its tool, and exactly one body:

```
create the disposal torch
  a thing
  in the Sorting Room
  aka torch, burner

  A stubby hand torch for undeliverables, its trigger worn to the metal.

create the dead letter
  a thing, flammable with the disposal torch
  in the returns bin
  aka letter, envelope

  on the player burning
    remove the dead letter
    phrase letter-burned
  end on
```

`burn letter` with the torch in hand runs the body; without it, "You need the disposal torch to burn the dead letter."; `burn torch` prints "The disposal torch isn't something you can burn."

After D3 and D4 — a dial is a thing with reversible states:

```
create the guidance selector
  a thing, scenery, settable
  in the Cockpit
  aka selector, guidance, destination selector, dial
  states, reversible: ceres, titan, kepler

  A three-position selector under the viewport, its pointer on CERES.

  on the player setting to kepler
    refuse selector-kepler-last
  end on

  after the player setting
    phrase selector-clicks
  end after
```

`set selector to titan` prints "You set the guidance selector to titan." then the selector's phrase; `set selector to kepler` prints the refusal; `set selector to mars` prints "The guidance selector goes to ceres, titan or kepler."; `set couch to titan` prints "The flight couch isn't something you can set."

## Consequences

- **Four checklist rows become sayable** (41, 91, 95, and burning's `flammable with`), each with a UPPS evidence pointer; the dead `setting` id retires, leaving `consulting` (Phase 7) and the deferred `hints`, `tasting`.
- **Two new action ids** (`burning`; `setting` already exists), one new trait pair in world-model, two actions rewritten; the registry grows by four descriptors; `capability-dispatch.ts` loses its last users (D1 call).
- **The Chord surface grows** by two adjectives and one head tail; `chord.ebnf` and the pin are re-recorded, with a grammar-log row per decision.
- **Dungeo's basket keeps its text**: the capability surface is unchanged and `basket-elevator.transcript` pins it; the chain is run once. `burn`, `set` and their synonyms become parsed verbs in Dungeo (stock refusals where "I don't understand that." stood), reported as Phase 5's D8 was.
- **One value for a dial** (D3): conditions, `select`, `change` and the verb agree by construction.

## Acceptance criteria

- **AC-1 (D1)**: stdlib tests — a thing with a `lowering` interceptor runs it (postExecute mutation observed on world state) and reports `if.event.lowered` with `lowered`; a thing with a capability behavior runs the behavior and reports its effects; a thing with neither refuses `cant_lower_that`; the same for raising; both ids are in `interceptorConsultingActionIds`; `story-loader/tests/gerund-fail-fast.test.ts`, which pins the lowering special case, is updated: `on the player lowering` now loads, and the plain dead-gerund message is pinned on a truly unconsulted id instead.
- **AC-2 (D1, REAL-PATH)**: `basket-elevator.transcript` and the Dungeo chain unchanged in one run; a UPPS card: `lower ramp` fires the ship's clause.
- **AC-3 (D2)**: a story with `a thing, flammable with the torch` loads with `FlammableTrait.toolId` resolved; the same thing without `on the player burning` is `analysis.gerund-implementation`, with two bodies likewise; stdlib tests: `burn x` with the tool held runs the body, without the tool refuses `needs_tool`, on a non-flammable thing refuses `not_flammable`, and the interceptor's mutation is observed on world state.
- **AC-4 (D2, REAL-PATH)**: UPPS cards: `burn letter` without the torch refuses, with it the letter is gone from the room (`look` no longer lists it) and the phrase prints; `burn torch` prints the stock refusal.
- **AC-5 (D3)**: `a thing, settable` without `states` is `analysis.settable-states`; with plain `states:` is `analysis.settable-irreversible`; a loader test: `set dial to high` writes `chord.state.<id>` to `high` and emits `if.event.set`; `set dial to mars` refuses `not_a_setting` naming the three values and leaves the state; `set couch to high` refuses `cant_set_that`; `kepler station` typed matches the state `kepler-station`.
- **AC-6 (D4)**: `on the player setting to kepler` compiles to a clause with `valueTail: 'kepler'`; `to mars` on that head is `analysis.setting-tail-unknown`; `on the player taking to x` is `analysis.head-value-tail`; a loader test: the tailed hook fires for `kepler` and not for `titan`; an untailed `after the player setting` fires for both.
- **AC-7 (D3, D4, REAL-PATH)**: UPPS cards: `set selector to titan` prints the stock line and the `after` phrase, `examine selector` then shows the new position through `select on`, `set selector to kepler` prints the refusal and leaves the state, `set selector to mars` prints the values line.
- **AC-8 (Scope)**: `grammar.ts`, the manifest, the alias catalog and the docs blocks regenerated with every `--check` fresh; `chord.ebnf` carries the two adjectives' notes and the head tail, the pin re-recorded; a grammar-log row per decision; the guide's on-and-after page shows the tail and the creating-things page `flammable with` and `settable`; stdlib reference entries for burning and setting, lowering and raising amended; Docs tab regenerated; stdlib, world-model, chord, story-loader, lang-en-us, parser-en-us suites green; the four checklist rows carry evidence pointers.

## Session

Drafted in session 8196a4 (2026-10-13) on branch `chord-4-0`, Phase 6 of the Chord 4.0 plan, after Phase 5 landed as 4db352377.

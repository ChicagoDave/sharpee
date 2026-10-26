# ADR-373: Physical state the platform enforces — an attached thing stays put until detached, a breakable thing breaks and stays broken, and tying attaches

**Status**: **ACCEPTED** (David, 2026-10-14, session 1ef153: "go", on the four calls as recommended — `broken` read from the trait, `after the player breaking` as a consequence id, no destructible word, stock tying — and the D4 content change, after `adr-review` 14/14 with three findings folded in: branch-tester and world-index in scope, the `runBreakingLifecycle` firing contract, save/restore). Drafted 2026-10-14 (session 1ef153, branch `chord-4-0`, Phase 8 of `docs/work/chord-4-0/plan-20261013-chord-4-0.md`). The rows are David's 2026-10-12 dispositions in `docs/work/chord-4-0/standard-if-checklist.md` (row 59 attached, row 60 breakable and destructible, row 94 Tying it to); the shapes below are Claude's drafting, with reasons. Four calls are put to him, each marked **[call]** with a recommended answer: where `broken` is stored (D2), how a story reacts to a break (D3), what becomes of destructible (D5), and whether tying is a stock verb (D6). One content change is called out separately because it moves Dungeo-visible behavior (D4, fragility). **D1 and D6 are superseded by ADR-381** (accepted 2026-10-22, session 289aa0); D2–D5 and D7's breakable half stand.

**Scope**: `packages/world-model` (`BreakableTrait` gains `fragile`; `AttachedBehavior`, new, both barrels), `packages/stdlib` (taking reads `attached`; pulling detaches; attacking, dropping and throwing fire the breaking id on a break; dropping and throwing read `fragile` instead of guessing it from names; new `tying` and `untying` actions; the lifecycle registry), `packages/parser-en-us` (`grammar/standard-en-us.story`, `grammar.ts` regenerated), `packages/lang-en-us` (new and amended lines), `packages/chord` (catalog: `breakable`, `fragile`, `attached to`, `detachable`; analyzer: the state-adjective table, `PLATFORM_STATE_PAIRS` and `STARTS_STATE_PAIRINGS`, the breaking clause gate, the adjective gates; `chord.ebnf` and its pin re-recorded without a bump; manifest and alias catalog regenerated), `packages/story-loader` (lowering the four words; `broken` and `attached` as state adjectives), `docs/architecture/chord-grammar-changes.md` (one row per decision), the Chord guide and the stdlib reference, the IDE Docs tab, `packages/branch-tester` (the derived runner: an `after the player breaking` branch has no grammar of its own, so it is reached by attacking the thing, or by dropping it when it is fragile; tying's two slots take the ADR-372 counterpart typing), `packages/world-index` (the branch clause for the breaking id), `branch-stories/upps` (the exercisers), and the checklist's evidence pointers.

## Date: 2026-10-14

**Kind**: technical

## Parent

- **ADR-350 D2** (Chord exposes only fields the platform enforces) and **D3** (enforcement is part of the decision): the reason enforcement lands before any word, and the AC-2 gate this record keeps.
- **ADR-228** (the lifecycle engine) and its **D6** (both ids fire: `remove X from Y` consults removing and taking): the precedent D3 follows.
- **ADR-231 D5a** and the evaluator's state adjectives (`open`/`closed`, `locked`, `on`/`off`, `worn`, `lit`): the one-store pattern D2 extends.
- **ADR-372 D1** (a head names its counterpart): tying is a two-noun action and takes the tail with no further work.
- **ADR-371** (the stock-line and refusal pattern, the underscore gerund register) and **ADR-370 D8** (Dungeo's changed answers are reported, not absorbed).
- **ADR-293** (seeded random points): D4 retires one point.
- **ADR-257** (language versioning, as amended): additive; the pin is re-recorded under the unpublished 4.0 surface.

## Context — measured, not assumed

**Attached is data no action reads.** `AttachedTrait` carries `attachedTo`, `attachmentType` (`glued`, `nailed`, `screwed`, `tied`, `welded`, `magnetic`, `stuck`), `detachable`, `detachForce`, `loose`, `detachSound`, `onDetach` (`packages/world-model/src/traits/attached/attachedTrait.ts`); its header says "all logic for detachment is handled by the pulling action", and none is. Taking never consults it (its refusals are `fixed_in_place` for scenery, `cannot_take`, and the rest; `lang-en-us/src/actions/taking.ts:18-33`); pulling refuses anything without `PULLABLE` (`pulling.ts:103`), and its `pullType: 'attached'` is a label on the pullable trait, not a read of this one. Grep across `packages/*/src` and `stories/*/src` finds no other reader (2026-10-14).

**Breakable is half-read: attacking breaks it, nothing else does, and Chord cannot say it.** The checklist's "read by no action today" is wrong for attacking. A non-combatant target goes through `AttackBehavior.attack` (`stdlib/.../attacking/attacking.ts:290-330`), which tries `BreakableBehavior.break` first and then `DestructibleBehavior.damage` (`world-model/src/behaviors/attack.ts:86-130`); the report speaks `target_broke` ("The vase breaks!") or `target_destroyed` / `target_damaged`. A broken thing stays where it was with `broken: true`; a second attack finds it already broken and falls through to `ineffective`. What does not exist: any Chord word, any way for a story to react to the break, any break outside attacking, and any test (`grep BreakableTrait packages/stdlib/tests` finds none).

**Fragility is guessed from names.** Throwing marks an item fragile when its name or description contains `glass`, `crystal`, `delicate`, `fragile`, `bottle`, `vase`, `china` or `porcelain` (`throwing.ts:304-310`), then breaks it on a seeded roll (`BREAKS_POINT`, 0.3 thrown down, 0.5 thrown at something) and removes it from the world (`finalLocation: null`). Dropping picks `dropped_quietly` for a name containing `glass` (`dropping-data.ts:117-121`) and breaks nothing. Neither reads `BreakableTrait`. A word-list guess is the kind of inert, unauthored behavior ADR-350 D2 was written against: an author cannot turn it on for a jade figurine or off for a glass eye.

**`break X` is attacking.** `break the target`, `smash the target`, `destroy the target` are attacking's grammar lines (`standard-en-us.story:337-339`); there is no breaking action, so the row's `after the player breaking it` has no id to hang on.

**Destructible's fields are combat-tuned.** `DestructibleTrait` holds hit points, armor, weapon requirements, `transformTo`, `revealExit` and message overrides (`destructibleTrait.ts`); its behavior can replace the entity and reveal an exit (`destructibleBehavior.ts:120-145`).

**Tying is Dungeo's.** No stdlib action; Dungeo defines `tie :object to :target` and `tie :object` for the balloon (`stories/dungeo/src/grammar/liquid-grammar.ts:101-110`).

**The corpus already writes breaking as a state.** A chord gate fixture declares `states: whole, broken` on a vase (`packages/chord/tests/fixtures/gates/irreversible-state.story:10`); thealderman's seam note reads "breaking is weather; being broken is a state" (`thealderman.story:320`). No corpus story composes a trait for it.

## Decision

> **Superseded by ADR-381** (accepted 2026-10-22, session 289aa0). Attachment goes: a fixed thing is scenery, a hanging thing is on a supporter, and joining is the `use connections` extension's connector. D1 below is kept as the record of what was decided.

**D1 — Taking refuses an attached thing; pulling detaches a detachable one.** Enforcement, before any word:

- *Taking.* Validate refuses a thing whose `AttachedTrait.attachedTo` is set and that is not `loose`, with a new `attached`: "{capitalize the item} {verb:is item} fixed to {the anchor}." (`anchor` is the `attachedTo` entity). Order: after `cant_take_self`/`already_have`, before scenery's `fixed_in_place`, so a nailed-down scenery thing names what holds it. Removing (`take X from Y`) inherits it through ADR-228 D6.
- *Pulling.* Validate accepts an attached, `detachable` thing with or without `PULLABLE`; execute calls a new `AttachedBehavior.detach(entity, world)`, which clears `attachedTo`, and leaves the thing where it is; report emits `if.event.detached` with `detached`: "{You} {pull} {the item} free of {the anchor}." Pulling an attached thing that is not detachable refuses `wont_budge`: "{capitalize the item} won't budge." A thing that is both `PULLABLE` and attached-detachable detaches; its pullable state does not move. The other fields (`detachForce`, `loose` as a starting state, `detachSound`, `onDetach`) stay unread and so stay out of Chord (ADR-350 D2).
- *Chord.* `attached to <the thing>` is a trait adjective with its single-entity value (ADR-369 D2's `with` form, spelled `to`, as `flammable with` is spelled `with`), and `detachable` a marker adjective legal only beside it (`analysis.detachable-not-attached`). `attached` lowers to `AttachedTrait { attachedTo, attachmentType: 'stuck', detachable }`. `attached` joins the state adjectives (D2's table): `while the hook is attached` reads `attachedTo` set.

**D2 — `breakable` lowers to the trait, and `broken` is a state adjective read from it. [call]** `breakable` is a marker adjective lowering to `BreakableTrait`; `fragile` (D4) is legal only beside it (`analysis.fragile-not-breakable`). `broken` joins the evaluator's state adjectives beside `lit` and `worn`, a pure read of `BreakableTrait.broken`, so `while the vase is broken` and `select on` agree with what attacking did. A declared `states: whole, broken` is the shadow-state ratchet's case: `PLATFORM_STATE_PAIRS` (`chord/src/catalog.ts:100`) gains `{ pair: ['whole', 'broken'], trait: 'breakable' }`, so the existing check (`analyzer.ts:4061`, both names in one state set) reports it with the fix-it to compose `breakable` instead. The one corpus hit is a gate fixture for forward-only states (`gates/irreversible-state.story`), which renames its states. Recommended over the ADR-371 D3 route (`breakable` writes a declared `broken` state) because here the writers are stdlib actions — attacking, dropping, throwing — and stdlib cannot write a story-loader state without importing its key format, the same dependency inversion ADR-372 D5 avoided for counters. `change` writes declared states only (`runtime/statements.ts`), so a story does not `change the vase to broken`; the player breaks it in play, and a thing broken from the start writes `starts broken` (D7).

**D3 — A story reacts with `after the player breaking`, a second id the breaking action fires. [call]** A new id `if.action.breaking` with no grammar of its own (`break X` stays attacking, so Dungeo's `break`, `smash` and `destroy` answers do not move). Any action that breaks a thing — attacking, dropping (D4), throwing (D4) — fires the `breaking` lifecycle on that thing after its own report, as removing fires taking (ADR-228 D6); the breaking descriptor has one slot, `target`, and its standard event is `if.event.broken`. In Chord, `after the player breaking` in the thing's block is the reaction: its phrase speaks after the action's own line, its body changes the world (`remove the vase`, `move the shards to the Parlor`). **The firing contract.** A slot's `actionIds` cannot carry it — removing lists `[REMOVING, TAKING]` on one slot (`removing.ts:75`) because taking always happens, while a break happens only sometimes. So `lifecycle/` gains one function, `runBreakingLifecycle(context: ActionContext, broken: IFEntity): ISemanticEvent[]`: it resolves `breakingLifecycle` (one slot, `target`, `actionIds: [IFActions.BREAKING]`, seeded `{ targetId, targetName, causeActionId }`) for that entity, runs its `postExecute` and `postReport` hooks, and returns the standard `if.event.broken` (no message of its own — the causing action's line has spoken) followed by any hook events. Each causing action calls it once, at the end of its own report, when `BreakableBehavior.break` succeeded during execute (recorded in its sharedData as `brokeEntityId`). That is a hand-rolled hook call, so `lifecycle-call-site.test.ts`'s `DECLARED_HOOK_CALLERS` gains a category, `consequence`, for dropping and throwing (attacking is already `runsOwnHooks`), and the descriptor declares it as `contracts.firedAsConsequence`. `breakingLifecycle` joins the registry, so `if.action.breaking` is in `interceptorConsultingActionIds` and the loader's fail-fast binds the clause. Only `after` is admitted: an `on the player breaking` is `analysis.breaking-after-only`, naming `on the player attacking` (or dropping, throwing) as the clause that can still refuse, because a veto that arrives once the thing has already broken has nothing to undo. Recommended over moving `break`/`smash`/`destroy` to a new breaking action, which would change Dungeo's combat answers for no author gain, and over asking authors to write the same body three times on attacking, dropping and throwing with `when the vase is broken`.

**D4 — Fragility is declared, not guessed; a fragile thing breaks when dropped on a floor or thrown, and stays where it lands. (Content change.)** `BreakableTrait` gains `fragile: boolean` (default false). Throwing's word list and its `BREAKS_POINT` roll are retired: a fragile thing thrown always breaks, through `BreakableBehavior.break`, lands where a whole one would, and fires D3; a thing that is not breakable never breaks. Dropping a fragile thing into a room (not into a container or onto a supporter) breaks it the same way, with a new `dropped_breaks`: "{capitalize the item} {verb:hits item} the floor and {verb:breaks item}." Dropping's `glass` name test and `dropped_quietly` go. The thing is no longer removed from the world on a break, anywhere: a broken thing is still a thing, and removing it is the story's call in D3's body. **Reported, not absorbed**: in Dungeo, a thrown item whose name has one of the eight words no longer breaks or vanishes, and a dropped `glass` item prints the ordinary drop line. The chain throws only the red cake, the torch and the lantern (grep of `walkthroughs/` and `tests/transcripts/`), so it is expected to pass unchanged; the change is listed at the phase as ADR-370 D8 did.

**D5 — Destructible gets no Chord word; the row closes as covered by `breakable`. [call]** Multi-hit destruction with armor and weapon types is combat tuning, and its two interesting effects (`transformTo`, `revealExit`) are what an `after the player breaking` body says in Chord terms (`move`, `remove`, `change … exit`). The trait stays for TypeScript stories and attacking keeps reading it. Recommended over a `breakable after <n> hits` form: one word that a story would use rarely, carrying four unread fields behind it.

> **Superseded by ADR-381** (accepted 2026-10-22, session 289aa0). Stock tying and untying are removed with attachment, and nothing stands in for them until a rope extension exists (ADR-381 D1, D6). D6 below is kept as the record of what was decided.

**D6 — Tying is a stock verb that attaches; untying detaches. [call]** A new `if.action.tying` with grammar `tie :item to :anchor`, `fasten :item to :anchor`, `attach :item to :anchor`, two slots with counterparts (ADR-372 D1). Validate requires the item held (implicit take, as putting does), refuses an anchor that is the item (`self`) or a person (`not_to_people`, "{You} can't tie things to people."), and refuses nothing else: anything can be tied to anything. Execute moves the item to the anchor's location and calls `AttachedBehavior.attach(item, anchor, 'tied', detachable: true)`; report emits `if.event.tied` with `tied`: "{You} {tie} {the item} to {the anchor}." A new `if.action.untying` (`untie :item`, `untie :item from :anchor`) refuses a thing not tied (`not_tied`) and otherwise detaches as pulling does, with `untied`. `tie :item` with no anchor is "What do {you} want to tie {the item} to?" (`no_anchor`). Dungeo's own `tie` grammar is story-tier and stays its own: the implementation verifies the story rule outranks the stock one (the chain's balloon sequence is the test) and reports it if not. Recommended because the checklist row is Inform's action and the counterpart tail makes `on the player tying to the railing` sayable at no cost; the alternative, `attached to` as a declaration only, leaves `tie rope to hook` answering "I don't understand that." in every story but Dungeo.

**D7 — Starting state.** `attached to the hull` starts attached (the adjective is the starting state). `breakable, starts broken` starts broken, through the ADR-231 D5a pairing tables (`STARTS_STATE_PAIRINGS` gains `broken` → `breakable`; the loader's field table `broken` → `BreakableTrait.broken = true`); `breakable` alone starts whole.

### Before and after

Unshipped syntax throughout; UPPS lines are illustrative.

```chord
## D1. Today `take placard` succeeds and nothing can pull it free.
create the route placard
  a thing, attached to the sorting machine, detachable
  in the Sorting Room

  A tin placard riveted to the machine's flank: ROUTES 4-9.

## D2-D4. Today only `attack jar` breaks it, and nothing can react.
create the specimen jar
  a container, transparent, breakable, fragile
  in the Specimen Room

  after the player breaking
    move the beetle to the Specimen Room
    phrase jar-shatters
  end after

## D6. The counterpart tail on tying.
create the mooring line
  a thing
  in the Landing Pad

  on the player tying to the ship's cleat
    phrase line-made-fast
  end on
```

Play, with the stock lines where nothing is authored:

```
> take placard              The route placard is fixed to the sorting machine.
> pull placard              You pull the route placard free of the sorting machine.
> take placard              Taken.
> drop jar                  The specimen jar hits the floor and breaks.  (jar-shatters)
> examine jar               (the jar is broken; `while the specimen jar is broken` holds)
> tie line to cleat         You tie the mooring line to the ship's cleat.  (line-made-fast)
> take line                 The mooring line is fixed to the ship's cleat.
> untie line                You untie the mooring line.
```

## Consequences

- Three trait families gain their first readers; `AttachedTrait`'s unread fields, and `DestructibleTrait` as a whole, stay TypeScript-only until something reads them.
- A break is one event however it happened: one behavior, one id, one reaction clause. A future breaking cause (a falling rock, an explosion) fires the same id.
- The state-adjective table grows by `broken` and `attached`; the analyzer's table and the evaluator's switch stay in step, as `starts` pairings do.
- Dungeo: throwing and dropping lose the name guess (D4); `tie` stays Dungeo's own if story grammar outranks stock (D6, verified at implementation); `take`, `pull`, `untie`, `fasten` and `attach` gain stock answers on things that had none. Each is listed at the phase.
- Save and restore: no new store. `broken`, `fragile` and `attachedTo` are trait fields, which the world's entity serialization already carries (`BreakableTrait.broken` survives a save today); the loader adds no world-state keys.
- The language version does not move (ADR-257); the pin is re-recorded.

## Acceptance criteria

1. Taking an attached thing refuses `attached` naming the anchor and leaves it in place; `take X from Y` refuses the same (stdlib test asserting the location; UPPS card).
2. Pulling a detachable attached thing clears `attachedTo` and leaves the thing in place, after which taking succeeds; a non-detachable one refuses `wont_budge` with `attachedTo` unchanged (stdlib test on the trait field; UPPS cards).
3. Attacking a breakable thing sets `broken`, fires the `breaking` lifecycle once, and the story's `after the player breaking` body runs (story-loader test through the real engine asserting the body's world change; UPPS card).
4. Dropping a fragile thing on a floor breaks it and fires D3; dropping it into a container does not; throwing a fragile thing breaks it; a thrown or dropped non-breakable thing named "glass bottle" does not break (stdlib tests asserting `broken` and location).
5. `while X is broken` and `while X is attached` read the traits; `states: whole, broken` on a thing (the shadow-state check, naming `breakable`), `fragile` without `breakable`, `detachable` without `attached to`, and `on the player breaking` are diagnostics with the codes above (chord unit tests).
6. `tie line to cleat` attaches the held line to the cleat, after which taking refuses; `untie line` detaches it (stdlib test on the trait and location; UPPS cards, including the counterpart-tailed clause).
7. For each admitted word (`attached to`, `detachable`, `breakable`, `fragile`), a test fails when the platform stops honoring it (ADR-350 AC-2).
8. `runBreakingLifecycle` runs once per break and never on a failed or ineffective attack (stdlib test counting hook calls); `lifecycle-call-site.test.ts` lists dropping and throwing under `consequence`; the derived runner reaches the UPPS breaking branch with no derived failure.
9. Grammar, manifest and alias `--check` gates fresh; Dungeo chain green with its changed answers listed.

## Implementation notes

- The breaking lifecycle and `runBreakingLifecycle` live in `stdlib/src/actions/standard/breaking/`, beside the actions, not in `lifecycle/` as D3 drafted.
- A fragile thing thrown at a target breaks and stays where a whole one would have landed, as D4 says; it is not removed.
- Chord: `attached to <the thing>` parses as its own composition branch (like `costs`) and lowers to the `attached` adjective with the anchor under the empty config key, resolved after every entity is built. `detachable` and `fragile` are read from their sibling word by the `attached` and `breakable` lowerings, so either order composes. The anchor is checked at compile (`analysis.setting-names-no-entity`).
- An `on the player tying to …` clause's phrase stands in for the stock "You tie …" line, as every `on` clause's phrase does (ADR-371); the ADR's play sample showing both lines is illustrative.
- The derived runner types an `after the player breaking` branch as attacking the thing (`CONSEQUENCE_CAUSES` in `branch-tester/src/derived-runner.ts`). World-index needed no change: the breaking branch already enumerates as a player action.
- Dungeo defines its own `tie`, `fasten`, `attach`, `untie` and `unfasten` grammar, so the stock tying answers never reach it, and none of its things carry `AttachedTrait`. Its only changed answers are D4's.

## Session

Session 1ef153, 2026-10-14, branch `chord-4-0`. Chord side implemented in session 39d4c7.

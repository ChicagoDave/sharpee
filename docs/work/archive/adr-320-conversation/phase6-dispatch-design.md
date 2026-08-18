# Phase 6 Design — stdlib Dispatch Integration and Witnessed Player Claims

**Status**: CONFIRMED (David, 2026-08-17: "confirmed as proposed - go" —
all three §6 contract amendments as proposed; written session 755a11).
**Scope**: the plan's Phase 6 deliverable, coded against the Phase 1 contract
(`contracts.md`) and the Phase 5 runtime as fixed inputs. Touches
`packages/stdlib` (primary), plus `packages/world-model` (read-side seam,
binding types) and `packages/character` (registrant, statement witnessing) —
all inside ADR-320's named package set.

## 1. The dependency wall, and the two seams that cross it

`@sharpee/character` depends on `@sharpee/stdlib`, not the reverse. Everything
Phase 6 asks stdlib to do with scenes — read the addressed NPC's scene, apply a
selection's `sceneDirectives`, open a scene on first address, stamp moves —
lives behind functions in `packages/character/src/conversation/`. stdlib cannot
import them. Two seams fix this, both in world-model (the shared lower package,
same placement as the D15 socket itself):

**Seam A — scene read-side moves to world-model.** The store *shape*
(`SceneStoreState`) and the pure reads (`readSceneStore`, `sceneWith`,
`sceneOf`, `liveScenes`, `CHARACTER_SCENES_KEY`) move to
`packages/world-model/src/traits/character-model/conversation-scene-store.ts`,
beside the scene types they return. `writeSceneStore` stays in
`packages/character/src/conversation/scene-store.ts` — the character runtime
remains the store's only writer (contracts §1.3 unchanged); character's module
re-exports the moved reads so its internal call sites don't churn. This is the
co-located wire-type rule applied to the store shape: stdlib reading the key
through a locally-declared duplicate type would be the drift the rule exists to
prevent.

**Seam B — a scene-runtime binding on the world.** The per-world binding idiom
(ADR-207/208/295, the same family as `registerDialogueSelector`): world-model
declares the interface, character implements it over the Phase 5 runtime, the
registrar wires it at story load, stdlib consults it.

```ts
// packages/world-model/src/capabilities/scene-runtime-binding.ts
interface SceneRuntimeBinding {
  /** Open a scene (dispatch passes openedBy address; general for Phase 8's openers). */
  openScene(participantIds: EntityId[], openedBy: SceneOpenedBy):
    { scene: ConversationSceneState; wireEvents: SceneWireEvent[] };
  /** Stamp an on-floor move (resets the silence clock). */
  recordMove(sceneId: string): void;
  /** Apply a selection's directives (the selector computes, the runtime mutates). */
  applyDirectives(sceneId: string, directives: SceneDirective[]): SceneWireEvent[];
  /** Resolve an open floor (D10) — bids built from disposition-under-circumstance. */
  floorWinnerFor(sceneId: string, occasion: SceneOccasion): FloorDecision;
}
```

(As landed, `openScene` takes the full `SceneOpenedBy` rather than an
address-only signature — same seam, general enough for Phase 8's
initiative and witnessed-event openers without a second method. The
floor-shape re-home also moved `ForceReading`'s declaration to
world-model beside `Force` — `FloorBid` names it — with the arbiter
re-exporting it unchanged; a consequence of amendment 3, not a fourth
amendment.)

Character exports `createSceneRuntimeBinding(memory: ConversationMemoryAccess)`
and `registerCharacterScenes(world, memory)` next to `registerCharacterDialogue`.
(`FloorDecision`/`SceneOccasion` already live in character per contracts §5;
`floorWinnerFor` re-homes those two *types* — not the scoring functions — into
world-model so the binding can name them. See §6, amendment 3.)

## 2. Exchange overlay before table match (D16) — the pure probe

The topic table is not behind the D15 socket: it dispatches through
loader-built action interceptors, and the arm's `postValidate` bumps occurrence
state during the action's *validate* phase — long before `report()` consults
the selector. So "exchange overlay wins over the table" cannot be decided at
report time; by then the table row has already consumed its occurrence.

**Design**: the D15 registration becomes an object with an optional **pure
probe** alongside the mutating selector:

```ts
interface DialogueSelectorRegistration {
  select: DialogueSelector;                     // report-time, may mutate (unchanged semantics)
  /** Pure (D16): does the addressed NPC's open exchange claim this input? */
  exchangeClaims?: (npc: IFEntity, intent: ConversationIntent,
                    ctx: DialogueSelectionContext) => boolean;
}
```

Conversation-action flow (asking / telling / talking, identical shape):

- **validate**, after the standard checks and after `preValidate` (physical
  vetoes like "the troll can't hear you" still gate everything): when the
  addressed NPC is modeled, its scene has an `openExchange`, and
  `exchangeClaims(...)` returns true, stash `exchangeGripped` in sharedData.
  While gripped, the remaining interceptor phases (`postValidate`,
  `postExecute`, `postReport`) are **skipped for this firing** — D16's
  innermost-active-context-wins-outright: the exchange owns the moment, the
  table never sees it, no occurrence is consumed.
- **report**: consult `select` with `ctx.scene` now wired (the Phase 1 contract
  line "absent until Phase 6" comes due). A gripped firing expects a handled
  selection serving the exchange row. Then stdlib applies
  `selection.sceneDirectives` through the Seam B binding, appends the returned
  + selection `wireEvents` as author-channel events
  (`character.scene.<kind>`, payload = the `SceneWireEvent` — the Phase 9
  channel schema consumes these), and stamps `recordMove`.
- **Fallthrough rejection leg (AC2)**: probe false (input matches no exchange
  row) → nothing is skipped; the table gets its normal chance; a table miss
  falls to the action default exactly as today. Never a crash, never a silent
  swallow — the probe is the only new branch and it only ever *narrows* to the
  exchange.

Existing registrants (character's `selector.ts`, tests) update to the object
shape — platform-internal signature, no compatibility concern.

## 3. Scene lifecycle at the dispatch boundary

- **Opening**: in report, when the addressed NPC is modeled and `sceneWith`
  finds no live scene for either party, `openSceneForAddress([player, npc],
  player)` — for ASK, TELL, and TALK TO alike (first conversational contact
  opens the scene; AC1's boundary-row selection reads the memory the open/close
  cycle feeds). Unmodeled NPCs: no scene, no change (D7 discipline, unchanged).
- **Moves**: every conversational firing that reaches a modeled NPC in a live
  scene stamps `recordMove` (resets the ADR-142 decay clock Phase 5 wired).
- **`leave` legality (D8/AC7)**: `close-scene` with boundary `exit` carries the
  leaver (§6, amendment 2). Before handing directives to the binding, stdlib
  checks exit legality with a helper extracted from going's validate —
  `hasTraversableExit(world, roomId)`: any direction with a live exit that is
  not blocked (ADR-240 `exit.blocked.*` evaluator first, `RoomTrait`
  blocked-map fallback — going's own read order) and not barred by a closed
  locked door. Illegal → the `close-scene` directive is dropped (the scene
  stays live) and an author-channel `character.scene.exit_refused` event is
  emitted; the selection's rendered response (typically a rendered silence)
  stands. No new physics — the same read points going uses.

## 4. Witnessed player claims (D11) — the statement site

The plan's phrase "at the existing act-detection sites" is load-bearing:
witnessing already runs in character's observe sub-step over the turn's
semantic events (`detectActs` → `witnessActs` in `tick-phases.ts`). The player's
TELL already emits `if.event.told` with `topic`/`topicEntityId` — stdlib's half
of D11 is **already emitted**; what's missing is the statement site consuming
it. So:

- `act-detection.ts` gains the **statement site**: `if.event.told` (TELL; the
  `say` intent joins when a SAY surface exists — same site, same shape)
  classifies as a statement by `actor` with the normalized topic. For each
  co-located modeled hearer (target and bystanders alike, minus the speaker):
  - the hearer records the fact — `addFact(topic, 'told', …, turn)`;
  - when the speaker is modeled and holds a valued belief on the topic, the
    value rides exactly as propagation moves it (`transferFact` idiom — the
    listener receives the speaker's held value, source `told`, never displacing
    a belief the hearer already holds). A hearer holding a *contradicting*
    value now has the contradiction visible to authored rows on ledger/belief
    state — AC9's "checked against what a hearer knows", asserted on state.
  - when the statement carries a `ClaimTag` (authored exchange answers get
    these from the loader in Phase 7 — Phase 6 lands the optional parameter),
    a modeled speaker's own ledger mints through `recordClaimDelivery`
    unchanged — the both-sides-can-lie symmetry: the player's lie pins on the
    player's ledger per hearer-audience.
- A bare `TELL X ABOUT Y` with an unmodeled PC therefore lands "the player told
  me about Y" knowledge in every modeled hearer — the AC9 landing-half — and a
  modeled PC's statements carry values and mint pins with zero extra machinery.

## 5. Open address (D10) — mechanism, not surface

No SAY/open-remark grammar exists, and ADR-320 rules parser-en-us deliberately
untouched ("any new player-facing verb would be its own discussion"). Phase 6
therefore lands the floor as **dispatch mechanism**: `floorWinnerFor` on the
Seam B binding — character builds `FloorBid`s for each scene participant from
disposition-under-circumstance (authored initiative rows via
`authoredInitiativeFor` first, then motivation readings) and resolves through
Phase 5's `scoreFloor`. Consumers: Phase 6 tests (real store-resident scenes),
Phase 8's NPC↔NPC scheduling and witnessed-event openings, and any future SAY
surface. No player-typed open remark ships in this phase — flagged here so the
gap is a recorded decision, not an oversight.

## 6. Phase 1 contract amendments (the ask)

Three deltas to the APPROVED `contracts.md`, each platform-internal (§ "revisable
at refactor cost"), flagged rather than silently taken:

1. **§1.3 read-side home**: store shape + pure reads relocate to world-model
   (Seam A). Single-writer ownership unchanged — character's runtime remains
   the only writer. Without this, stdlib cannot supply `ctx.scene`, which §4
   explicitly assigns to Phase 6.
2. **§4 `SceneDirective`**: `close-scene` gains optional `leaverId?: EntityId`
   (meaningful for boundary `exit`) so the D8 legality check knows who is
   leaving. Absent = a mutual/narrative close, never legality-checked.
3. **§4/§5 registration shape**: `registerDialogueSelector` takes
   `DialogueSelectorRegistration` (the pure `exchangeClaims` probe beside
   `select`), and the `SceneOccasion`/`FloorBid`/`FloorDecision` *type*
   declarations re-home from character to world-model so `SceneRuntimeBinding`
   can name them (scoring functions stay in character — contracts §5's
   "functions are Phase 5 runtime" is untouched).

## 7. What Phase 6 deliberately does not do

- No Chord IR consumption — the registrant's exchange-row source and claims
  lookup are loader-supplied callbacks that arrive in Phase 7; Phase 6 tests
  register them directly.
- No NPC↔NPC scheduling, no witnessed-event scene opening, no propagation
  travel (Phase 8), no channel schema (Phase 9), no parser grammar (ADR ruling).
- No `ICharacterModelData` field for conversation memory — the binding takes a
  `ConversationMemoryAccess`; Phase 7 re-homes it onto the trait.

## 8. Test plan (mutation-signature bar)

All asserting on real dispatched state via `setupBasicWorld`-style worlds with
registered bindings — an exchange actually overlaying the table (occurrence
NOT consumed on the gripped path; consumed on the fallthrough path), a scene
actually opened/moved in the `character.scenes` store, a claim actually landed
as hearer fact/belief state and (modeled PC) a pin actually minted, a blocked
exit actually leaving the scene live in the store, floor decisions asserted
against store-resident scenes. Behavior Statements precede each
mutation-bearing function per rule 12; suite graded before commit.

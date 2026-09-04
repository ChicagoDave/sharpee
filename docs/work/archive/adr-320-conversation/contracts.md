# TS-Level Contracts — ADR-320 Implementation (Phase 1)

**Status**: APPROVED (David, 2026-08-16, session 8e2f49) — both flagged decisions
ruled: §1.3 scene home (world-state key) and §7 rename (`ContinuationIntent`,
lands Phase 5), plus the §2.1 modeled-PC fold from the same review. The Phase 3/4
vocabulary freeze remains separate (§6 lists are sketches, not freeze candidates).
**Written**: 2026-08-16 (session 8e2f49), from a code survey of
`packages/character/src/conversation/` (lifecycle, selector, dialogue-extension),
`packages/world-model/src/capabilities/dialogue-selector-binding.ts`,
`packages/world-model/src/traits/character-model/`, and
`packages/character/src/arbiter/arbiter-types.ts` + `character-clock.ts`.
**Discharges**: ADR-320's Implementation-section requirement that TS contracts are
the plan's first deliverable — the scene and conversation-memory state shapes, the
wire affordance schema, the socket registration signature, and the
floor/interruption scoring interface.

Everything here is **platform-internal** and revisable at refactor cost (the
ADR-310 contracts §7 rule carries over). Chord vocabulary and grammar are the only
author-facing compatibility surface, and none ships in Phase 1.

Phase 1 adds **types only, unconsumed**: new modules exporting these shapes, no
field added to `ICharacterModelData`, no runtime touched. Phase 5 (runtime),
Phase 6 (dispatch), and Phase 7 (persistence) consume them.

---

## 1. Scene state shape (D4)

A conversation is a scene: participants, a contested floor, at most one open
exchange, boundary lifecycle, per-pair memory. Declared in
`packages/world-model/src/traits/character-model/conversation-scene.ts`.

### 1.1 The scene

```ts
type SceneStrength = 'passive' | 'assertive' | 'blocking';   // D10; same words as lifecycle's ConversationStrength

type SceneOpenedBy =
  | { kind: 'address'; openerId: EntityId }        // a participant addressed someone
  | { kind: 'initiative'; openerId: EntityId }     // NPC opened it (D7)
  | { kind: 'witnessed-event'; eventId: string };  // any witnessed world event (D4 — the shadow at the window)

interface ConversationSceneState {
  /** Stable id, unique within a save (runtime mints; format runtime-owned). */
  id: string;
  /** Everyone in the scene, PC included. Order is not meaningful. */
  participantIds: EntityId[];
  /** How the scene opened — selects boundary rows and seeds what it is "about". */
  openedBy: SceneOpenedBy;
  /** Current floor holder, or null while the floor is contested/open. */
  floorHolderId: EntityId | null;
  /** The one open exchange, or null when the topic table is the default surface. */
  openExchange: ExchangeState | null;
  /** Scene grip against interruption (D10); absent = derived from intent at runtime. */
  strength?: SceneStrength;
  /** Turn the scene opened (read/aged through the character clock seam only). */
  openedTurn: number;
  /** Turn of the last on-floor move (utterance, act, or event — one vocabulary). */
  lastMoveTurn: number;
}
```

### 1.2 The exchange point and boundaries

```ts
interface ExchangeState {
  /** The compiled exchange block this instantiates (Chord IR id, Phases 3–4). */
  exchangeId: string;
  /** Who opened it (whose line defined what the next responses mean). */
  speakerId: EntityId;
  /** Strength marker authored on the exchange, if any (D10). */
  strength?: SceneStrength;
  /** Turn the exchange opened. */
  openedTurn: number;
}

/** The boundary moments the platform recognizes (D4). */
type SceneBoundaryKind = 'first-meeting' | 'return' | 'exit' | 'silence';
```

Boundary *words* (first-time / return / absence-conditioned greetings) are Chord
vocabulary — Phase 3's freeze review, not this contract. The kind union above is
the platform-internal hook they compile onto.

### 1.3 Where scene state lives — APPROVED (David, 2026-08-16)

The plan (Phase 7) defaults to "rides `CharacterModelTrait` versioning per
ADR-310 D17 unless the contract work finds it needs its own home — flag before
diverging." This contract work finds it needs its own home. **Decision**: live
scenes ride a **world-state key** (`character.scenes`, the `CHARACTER_TURN_KEY`
idiom), owned and written solely by the character subsystem's scene runtime,
serialized with the world save like the turn mirror.

- Why not per-trait: a scene is genuinely shared state — one floor, one open
  exchange, N participants. Mirroring it onto every participant's trait invites
  divergence, and the PC (a participant in most scenes) carries no
  `CharacterModelTrait` at all, so at least one participant can never hold it.
- What stays on the trait: everything per-character — the §2 conversation memory
  (per-pair, on the modeled holder), and the existing `activeConversation`
  marker (D16 suspension), unchanged.
- **D10a (2026-09-02)**: unchanged home; the scene wire gains `thread-parting` (the parked thread's authored `on parting` as `messageId` + `params`, delivered on every park-on-close path) and `thread-parked` gains `partnerId` — see ADR-320's D10a amendment.
- D17 compliance: the D17 rule bans *module-level service state and closures*
  (the `ConversationLifecycle` singleton's `toJSON()` side path is the named
  offender). A world-state key is inside the save format, not beside it —
  mid-scene save/restore (AC12) rides the ordinary world serialization.

If rejected, the fallback is scene-on-every-modeled-participant with a
lowest-entity-id writer rule; the shapes above are identical either way.

## 2. Conversation memory (D4/D6/D9)

Per-pair, on the **modeled holder's** trait (each side holds its own view — the
disposition precedent; NPC↔PC pairs live only on the NPC side). Declared in the
same world-model module.

```ts
interface ConversationMemory {
  /** Completed scenes with this partner (drives asked-once/again/many words — runtime owns the word curve). */
  visits: number;
  /** Turn the last scene with this partner closed (absence words age off this, through the clock seam). */
  lastSceneClosedTurn?: number;
  /** Topics covered with this partner, across scenes, any order (D9 `was discussed`). */
  discussedTopics: string[];
  /** Per-topic ask counts with this partner (repetition words; runtime owns the counting). */
  askedCounts: Record<string, number>;
}
```

Phase 7 threads `conversationMemory?: Record<EntityId, ConversationMemory>` into
`ICharacterModelData` with the schema-version bump; Phase 1 does not touch the
trait.

Numbers are never exposed to Chord (ADR-310 D6): recency, absence, and
repetition all reach authors as words; the runtime owns every curve, reading
time only through `character-clock.ts`.

### 2.1 The PC as a modeled character — APPROVED (David, 2026-08-16)

**The player entity may carry `CharacterModelTrait`.** The character model is
the one home for interior state (D17 persistence and schema versioning
included); a story that needs a modeled PC opts the player entity into the
same trait NPCs use, and PC-ness stays a role over characters (the ADR-132
switching premise — this turn's player is next turn's NPC, with memory,
ledger, and beliefs intact across the switch).

- **What it resolves**: the state-home asymmetries this layer keeps hitting.
  A modeled PC holds its own §2 `conversationMemory` (per-pair state exists
  on both modeled sides, the disposition precedent applied symmetrically) and
  its own ledger for D11's both-sides-can-lie symmetry. ADR-310's home-rule
  exception for influences targeting the player becomes unnecessary when the
  PC is modeled (it remains the rule for unmodeled PCs).
- **What it does not change**: §1.3 — scenes stay shared state on the
  world-state key regardless, because unmodeled participants always exist
  (Dungeo-class stories never model their PC; D2's opt-out discipline).
- **What it costs**: mostly convention — the trait's "only NPCs carry this"
  header line loosens, and the Phase 5 character tick phase covers a modeled
  PC (decay, pressure, memory aging) without routing the PC through NPC turn
  scheduling. The ADR-310 doc line stating the NPC-only convention gets its
  amendment noted when Phase 5 lands the behavior.
- **No state-bearing `PlayerTrait`**: rejected — it would mint a second state
  discipline beside the character model. A thin role-marker `PlayerTrait`
  consolidating `ActorTrait.isPlayer` + `WorldModel.playerId` into one truth
  is a separate ADR-132-scale decision, deliberately NOT part of ADR-320.

## 3. Wire affordance schema (D12)

Declared in `packages/world-model/src/capabilities/scene-wire.ts` — runtime-free
data shapes next to the selector binding, importable by `character`, `stdlib`,
and `platform-browser`/`devkit` without duplication (the co-located wire-type
rule). Carried as channel data (ADR-163); clients render, the platform never
does.

```ts
type SceneWireEvent =
  | { kind: 'scene-opened'; sceneId: string; participantIds: EntityId[]; openedBy: SceneOpenedBy }
  | { kind: 'scene-closed'; sceneId: string; boundary: SceneBoundaryKind }
  | { kind: 'utterance'; sceneId: string; speakerId: EntityId; addresseeId?: EntityId;
      messageId: string; beats: string[] }                     // beats: manner beat message ids, D5
  | { kind: 'floor-change'; sceneId: string; holderId: EntityId | null }
  | { kind: 'interruption'; sceneId: string; interrupterId: EntityId;
      outcome: 'yields' | 'protests' | 'blocks' }              // the lifecycle's RedirectResult words
  | { kind: 'rendered-silence'; sceneId: string; speakerId: EntityId; beats: string[] };

/** What an open exchange advertises as its available responses (D12 input affordances). */
type ResponseAffordance =
  | { kind: 'verbal'; rowId: string; messageId: string }
  | { kind: 'act'; rowId: string; actionId: string }
  | { kind: 'silence' };

interface ExchangeAffordances {
  sceneId: string;
  exchangeId: string;
  responses: ResponseAffordance[];
}
```

Author-channel visibility only for scene internals; the player-facing build sees
rendered prose alone (AC11, the ADR-310 D12/AC8 isolation, re-asserted for scene
state — Phase 9 tests it at the channel layer).

## 4. D15 socket extension (exchange-aware selection)

`dialogue-selector-binding.ts` gains **optional** fields only — the
zero-registrant default path and every existing registrant compile and behave
unchanged.

```ts
interface DialogueSelectionContext {
  world: WorldModel;
  speakerId: EntityId;
  /** NEW — the scene the addressed NPC is in, if any (exchange overlay reads it, D16 innermost-wins). */
  scene?: ConversationSceneState;
}

interface DialogueSelectionResult {
  handled: boolean;
  messageId?: string;
  params?: Record<string, unknown>;
  authorEvents?: ISemanticEvent[];
  /** NEW — scene lifecycle the selection asks the runtime to perform (open/close exchange, floor, exit). */
  sceneDirectives?: SceneDirective[];
  /** NEW — D12 wire events this selection produced, for the channel layer. */
  wireEvents?: SceneWireEvent[];
}

type SceneDirective =
  | { kind: 'open-exchange'; exchange: ExchangeState }
  | { kind: 'close-exchange' }
  | { kind: 'set-floor'; holderId: EntityId | null }
  | { kind: 'close-scene'; boundary: SceneBoundaryKind };
```

The directive shape keeps the selector **pure** (the arbiter discipline: it
computes, the runtime mutates) — a selector never writes scene state itself.

## 5. Floor/interruption scoring interface (D7/D10)

Declared in `packages/character/src/conversation/scene-scoring.ts` — the
forces-feed-arbitration idiom (ADR-318), pointed at "do I speak?", not a new
scoring mechanism. Consumes the arbiter's `ForceReading` unchanged.

```ts
/** An occasion a disposition can seize (D7): plumbing, never author-facing. */
type SceneOccasion =
  | { kind: 'open-floor'; sceneId: string }              // unaddressed remark seeking a speaker
  | { kind: 'witnessed-event'; eventId: string }
  | { kind: 'goal-step'; goalId: string }
  | { kind: 'silence'; sceneId: string }
  | { kind: 'subject-change'; sceneId: string; abandonedTopicId: string };  // D9's third exposure

/** One participant's bid for the floor: disposition-under-circumstance, as force readings. */
interface FloorBid {
  participantId: EntityId;
  occasion: SceneOccasion;
  readings: ForceReading[];        // arbiter idiom — feeds carry author-channel attribution
  /** An authored row forcing or suppressing the moment always wins (D7 most-specific-wins). */
  authored?: 'forces' | 'suppresses';
}

interface FloorDecision {
  winnerId: EntityId | null;       // null: nobody seizes (the scene's silence is itself authorable)
  bids: FloorBid[];                // losers' manner still reacts (D10 — one speaker, many tells)
}

/** An outsider (PC included) challenging a scene's grip (D10 interruption). */
interface InterruptionChallenge {
  sceneId: string;
  interrupterId: EntityId;
  bid: FloorBid;
  /** True for world events and acts — breaks even `blocking` (D8's exemption). */
  worldAct: boolean;
}

type InterruptionOutcome = 'yields' | 'protests' | 'blocks';  // the lifecycle's RedirectResult, reused
```

Scoring functions themselves (`scoreFloor`, `resolveInterruption`) are Phase 5
runtime; Phase 1 fixes only their input/output shapes.

## 6. Vocabulary — sketches only, NOT the freeze package

Phase 3/4 own the freeze review. Recorded here so later phases start from one
list: time words (fresh/recent/stale; absence words at boundaries), threading
words (`was discussed`, `the subject changes`), repetition words (asked
once/again/many times), boundary words (first-time/return spelling), strength
markers (`passive`/`assertive`/`blocking` — already existing lifecycle words),
manner block words (`beat`, `voice`). None is compatibility surface until David
freezes it.

## 7. Collisions and renames

- **`ConversationIntent` is double-booked**: `@sharpee/world-model` exports the
  socket's intent (`ask`/`tell`/`say`/`talk-to`) and `@sharpee/character`
  root-exports the ADR-142 lifecycle's intent (`eager`/`reluctant`/`hostile`/
  `confessing`/`neutral`). Both are live exports today; Phase 5 wires them into
  the same code paths, where the collision stops being latent. **Proposal**:
  Phase 5 renames the lifecycle's to `ContinuationIntent` (its consumers are all
  inside `packages/character`: lifecycle, conversation-marker,
  dialogue-extension, builder, barrels — a contained, behavior-neutral rename).
  The world-model socket type keeps the name; stdlib already imports it from
  there. **Approved** (David, 2026-08-16) — lands with Phase 5.
- **`ConversationStrength` vs `SceneStrength`**: identical word-for-word unions
  by design (structurally assignable). Phase 5 collapses the lifecycle's to an
  alias of the world-model union so there is one declaration (the co-located
  wire-type rule; world-model is the shared lower package).
- `RedirectResult` / `InterruptionOutcome`: same union; same Phase 5 collapse,
  same direction.

## 8. What Phase 1 deliberately does not do

- No field on `ICharacterModelData`, no schema-version bump (Phase 7).
- No change to `ConversationLifecycle` or any runtime (Phase 5).
- No Chord grammar, no vocabulary freeze (Phases 3–4).
- No rename executed (§7 proposals land with Phase 5).

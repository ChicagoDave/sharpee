# Phase 7 Design — Persistence and Load-Time Instantiation

**Status**: CONFIRMED (David, 2026-08-17: "confirmed as proposed - go" —
§8 amendment included; written session 844192).
**Scope**: the plan's Phase 7 deliverable, coded against the Phase 1 contract
(`contracts.md`, as amended by Phase 6) and the Phase 3–6 outputs as fixed
inputs. Touches `packages/world-model` and `packages/story-loader` (the
phase's named set) plus `packages/character` (the trait-backed memory access
and one scene-runtime addition — both inside ADR-320's package set).

## 1. What Phase 7 closes

Three deferred seams come due together:

- **contracts §2**: `conversationMemory` threads into `ICharacterModelData`
  with the schema-version bump; the Phase 5 `ConversationMemoryAccess` seam
  re-homes onto the trait (phase 6 design §7 deferred exactly this).
- **Phase 6 design §7**: the D15 selector's Chord-production registrant —
  the loader serving compiled exchange rows (and greeting rows, manner
  beats, authored initiative) through the registration surface Phase 6 made
  live. Loader-supplied claims lookup rides the same path.
- **The evaluator's four loud failures** (`recency` / `discussed` / `asked` /
  `subject-changes`, `evaluator.ts:215`) get real reads — and the
  `execStatements` switch, which today lets the four conversation statement
  kinds (`then-open` / `deflect` / `leave` / `hold-tongue`) fall through
  **silently**, gets loud-failure cases so rogue IR can never swallow them.

Exit state (plan): a story compiled with the new constructs loads without
evaluator gaps; both packages compile clean; no save/restore round trip yet
(Phase 8's).

## 2. Memory re-home (world-model + character)

- `ICharacterModelData` gains
  `conversationMemory?: Record<string, ConversationMemory>` (partnerId →
  per-pair record; the contracts §2 shape, unchanged). The trait gains the
  matching field, constructor copy, and serialization.
- `CHARACTER_MODEL_SCHEMA_VERSION` 1 → 2 with a versioned reader, never a
  hard break (the trait's own header discipline): v1 data (field absent)
  reads as an empty record. No other field moves.
- `packages/character` gains `createTraitMemoryAccess(world)` beside the
  Map-backed test double: `get` reads the holder's trait field, `set`
  writes it — and an unmodeled holder ignores `set` entirely (ADR-310 D7:
  no model, no change). `createMapMemoryAccess` stays as the test double;
  `conversation-memory.ts`'s curves and recorders are untouched (its header
  promised Phase 7 would plug the trait in without touching the module).

## 3. Load-time registration (story-loader)

Registration happens at the end of `applyCharacterBlocks` (the world is
fully built there in either lifecycle order — the same reason character
blocks apply there), whenever the story declares at least one character
block or any conversation block:

- `registerCharacterScenes(world, traitAccess, { authoredFor })` —
  `authoredFor` closes over each owner's compiled `IRInitiativeRow`s and
  delegates to `authoredInitiativeFor`, with `, when` refinements bound to
  the loader's evaluator.
- `world.registerDialogueSelector({ select, exchangeClaims })` — the D15
  Chord-production registrant (§4).

Conversation blocks (`greetings`/`exchange`/`manner`/`initiative`) require
a character-modeled owner — scenes exist only for modeled NPCs (D7). If the
analyzer does not already gate this, the loader throws a `LoadError` on
rogue IR rather than leaving the block silently inert.

Compiled rows stay IR-side (the `entity.topics` precedent) — nothing is
copied onto traits; the registrant and the topic arm close over the IR.

## 4. The exchange registrant (D15/D16 production servant)

**Exchange identity**: `ExchangeState.exchangeId` is minted
`<ownerIrId>.<name>` at open time; the registrant resolves it back to the
compiled `IRExchange`.

**`exchangeClaims` (pure probe)**: true exactly when the open exchange has
an `answer` row matching the intent — entity tier first, then normalized
free-text tier, the SAME `normalizeTopic` matching the topic arm uses (one
implementation). `act` rows are claimed by witnessed acts, not typed input
(Phase 8's act-detection path); `silence` rows fire from scene aging
(Phase 8's scheduling) — neither grips a typed firing in Phase 7.

**`select` (report-time)**, for a gripped firing:

- Exec the matched row's body through the existing `restoreCtx` /
  `execStatements` machinery under an `exchange.<owner>.<name>.<row>`
  occurrence/clause-bag namespace — `first time` ordinals count deliveries
  exactly as topic rows do.
- Output conversion mirrors the topic arm's `postReport`: first
  `chord.phrase` → `messageId`/`params`; other events → `authorEvents`;
  the lie-ledger pin filter and the mint rule run through the same
  `claimsFor` / `pinAllowsClaim` / `recordClaimDelivery` calls — authored
  exchange answers get their ClaimTags for free because claims are keyed by
  phrase key (the Phase 6 §4 "loader-supplied claims" line, discharged).
- **Conversation statements are extracted, not exec'd**: before the body
  runs, the registrant translates them (honoring their `when` suffixes) —
  - `then-open` → `open-exchange` directive with a fresh `ExchangeState`
    (speaker = owner, strength from the target `IRExchange`, the `asks` /
    `invites` word carried as wire data);
  - `deflect to` → serve the owner's own matching TOPIC row's body instead
    (analyzer-validated target), under that row's existing
    `topic.<entity>.<rowIndex>` occurrence key so ordinals agree across
    dispatch paths;
  - `leave` → `close-scene { boundary: 'exit', leaverId: owner }`. The
    registrant pre-checks `hasTraversableExit` (the same exported stdlib
    helper — same read points, no second physics): on an illegal exit it
    serves a rendered silence instead and emits no close directive, so the
    prose never announces a departure the world then refuses. stdlib's own
    check (Phase 6) stays as the enforcement backstop.
- A served `answer` row with no `then-open` appends `close-exchange` — the
  exchange closes and the floor reverts to the table (D4).

**Greetings (boundary rows)**: `select` also serves them. On a firing where
`ctx.scene` is absent (the scene opens this firing — stdlib opens after
select), the registrant picks the boundary row: `boundaryKindOnOpen` gives
first-meeting vs return; `absenceWordFor` refines `on return` rows
(most-specific-wins: a refined row beats the bare one); `asked` heads read
`askedWordFor` over the pair's counts. Delivery: a TALK TO (or a
table-miss ASK/TELL) serves the greeting row body as the selection; a
first-contact ASK/TELL that hits a table row lets the table win (content
rows always win — D5's discipline). `on leaving` rows exec alongside a
legal `leave` close.

**Manner beats**: every served selection (exchange answer, greeting,
rendered silence) consults `selectMannerBeat` over the owner's
`IRMannerRow`s (conditions evaluator-bound) and carries the beat keys and
`voice` on the `utterance` / `rendered-silence` wire event. Rendering is
Phase 9's; Phase 7 puts the beats on the wire.

## 5. Dispatch bookkeeping — the memory recorders get their callers

`recordAsked` / `recordTopicDiscussed` have no production caller today.
Phase 7 wires one shared loader helper, called from BOTH dispatch paths
(the topic arm's `postReport` and the registrant's `select`):

- an ask hit records `recordAsked` and every served topic/exchange answer
  records `recordTopicDiscussed` — on the NPC holder (partner = actor) and
  symmetrically on a modeled PC (partner = NPC), per contracts §2.1;
- the same helper stamps the scene thread (§6's `subject-changes` source)
  via a new scene-runtime function.

## 6. Evaluator coverage (the four kinds)

`EvalContext` gains a loader-internal conversation frame (NOT a Phase 1
contract change): `conversationPartnerId?` and `conversationTopic?`,
supplied by the topic arm and the registrant.

- **`recency`**: the owner's (`it`) trait fact for the topic —
  `recencyWordFor(dialogueTurn(world), fact.turnLearned) === cond.word`;
  no trait or no fact → false (the `feels`/`knows-topic` precedent).
- **`discussed`**: `wasDiscussed(traitAccess, ownerId, partnerId, topic)`.
- **`asked`**: `askedWordFor(pair.askedCounts[conversationTopic]) ===
  cond.word`.
- **`subject-changes`**: the live scene between owner and partner noticed a
  thread abandoned THIS turn — read off new scene state (below);
  no live scene → false.
- A pair-dependent kind evaluated with no conversation frame in context is
  a loud `LoadError` (the analyzer parse-gates these to conversation
  contexts; reaching the evaluator without a frame is rogue IR).

**Scene thread state — the one contract amendment** (§8): the runtime
cannot notice a subject change without knowing the current subject.
`ConversationSceneState` gains two optional fields, written only by the
scene runtime:

```ts
/** The thread the scene is currently on (normalized topic), if any. */
currentTopic?: string;
/** Turn a live thread was abandoned (D9's subject-change), if ever. */
subjectChangedTurn?: number;
```

`packages/character`'s scene runtime gains `noteTopicMove(world, sceneId,
topic)`: a topic differing from `currentTopic` stamps
`subjectChangedTurn = dialogueTurn(world)` and replaces the thread. The
evaluator reads `subjectChangedTurn === dialogueTurn(world)`; Phase 8's
`subject-change` `SceneOccasion` consumes the same stamp.

## 7. `execStatements` loud-failure backstop

The statement switch gains cases for `then-open` / `deflect` / `leave` /
`hold-tongue` that throw `LoadError` — the dialogue paths extract them
before exec (§4), and `hold-tongue` is consumed by `authoredInitiativeFor`
alone, so any of them reaching the general walker is rogue IR. This closes
the current silent fallthrough.

## 8. Phase 1 contract amendments (the ask)

1. **§1.1 scene thread state**: `ConversationSceneState` gains
   `currentTopic?` / `subjectChangedTurn?` (§6) — single-writer unchanged
   (scene runtime only). Without it, `subject-changes` and Phase 8's
   subject-change occasion have no state to read.
2. **§2 comes due as written** (listed for completeness, not a delta):
   `conversationMemory` on `ICharacterModelData`, schema version 2.

**Plan-line deviation, flagged**: the plan names "vocabulary modules for
the new word slices" in world-model. The Phase 3 freeze ruled the
time/threading/repetition words **closed grammar** (parser-owned, like
`at least`) and `voice` an open list carried as data — so there is no
manifest-gated vocabulary module to add; that plan line is discharged by
the freeze, and Phase 7 adds none.

## 9. What Phase 7 deliberately does not do

- No save/restore round-trip test (Phase 8) — but everything lands inside
  the save format by construction: scenes/cursors on the world-state key,
  memory on the trait.
- No NPC↔NPC scheduling, no witnessed-event scene opening, no act/silence
  row firing from typed input, no channel schema (Phase 9), no beat
  rendering, no player-facing SAY surface (ADR ruling).
- No `parser-en-us` / `lang-en-us` changes.

## 10. Test plan (mutation-signature bar, rules 12/13/13a)

Real-path throughout (the project profile's Chord signature: story-loader
interpreting IR into a runnable story): tests compile real Chord source
with the new constructs, load through the real loader into a real world,
drive the REAL stdlib asking/telling/talking actions, and assert on:

- trait `conversationMemory` advancing (visits, discussed, asked) and a
  v1 serialized trait reading clean under the v2 reader;
- exchange open/overlay/close in the `character.scenes` store — grip path
  consuming NO topic occurrence, fallthrough path consuming one
  (AC2's two legs at the loaded-story level);
- greeting row selection flipping first-meeting → return → absence-refined
  as memory and clock advance (AC1/AC4 at the loaded-story level);
- each of the four predicates flipping on real state (recency aging
  through the clock seam; `subject-changes` true exactly on the abandoning
  turn), plus the loud-failure legs (frame-less evaluation, conversation
  statement reaching `execStatements`);
- deflect serving the target row under the target's occurrence key; an
  illegal `leave` leaving the scene live with rendered silence served.

Behavior Statements precede each new mutation-bearing function (trait
serialization, `noteTopicMove`, the registrant's select, the memory
recorders' callers); an Integration Reality Statement covers the
compile→load→dispatch chain before the phase closes; suite graded before
commit.

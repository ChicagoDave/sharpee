# TS-Level Contracts — ADR-310 + ADR-318 Implementation (Phase 1)

**Status**: FROZEN — vocabulary freeze reviewed and approved by David
2026-08-15 (session ce1209), with the `believes` rename rejected (the word
stays; see §6). Both Phase 1 review gates are discharged.
**Written**: 2026-08-15 (session ce1209), from a code survey of
`packages/world-model/src/traits/character-model/`, `packages/character/src/`,
and `packages/stdlib/src/npc/`.
**Discharges**: the deferred TS-contracts findings from both ADRs'
post-interview reviews (ADR-310: D5 custom-mood syntax, D14 spelling, D15
socket name; ADR-318: arbiter API, trait field shapes, selector-pin hook,
tick-phase signature).

Everything here is a contract *proposal* until the freeze review below is
done. Chord vocabulary and grammar are the only author-facing compatibility
surface; every TypeScript signature in this document is **platform-internal**
and revisable (see §7).

---

## 1. Trait field shapes — `ICharacterModelData` v1 (versioned)

`CharacterModelTrait` gains a `schemaVersion` field from this release (ADR-310
D17). Rule of the shape: **authored declarations are re-applied by the loader
on every load; only mutable runtime state serializes.** A restore combines
fresh authored config with restored mutable state.

### 1.1 Kept as-is (ADR-141 shape survives)

- `personality: Record<string, number>` — adjectives with 0–1 intensity
- `dispositions: Record<entityId, number>` — −100..100, NPC-to-NPC included (D14)
- `moodValence` / `moodArousal` — valence-arousal internal axes
- `threatValue` — 0..100
- `cognitiveProfile` — five dimensions, unchanged values
- `knowledge: Record<topic, Fact>` — valueless held topics (`knows`), with
  `Fact = { source, confidence, turnLearned }`
- lucidity and perception-filter fields — unchanged

### 1.2 Changed (D14 — valued beliefs)

- **New** `factBeliefs: Record<factId, ValuedBelief>` where

  ```ts
  interface ValuedBelief {
    value: string;              // must be in the fact declaration's value set
    confidence: ConfidenceWord; // see §6 rename
    source: FactSource;
    turnLearned: number;
    resistance: ResistanceMode; // 'none' | 'reinterprets' | 'ignores'
  }
  ```

  Addressing per D14 — `(holder, subject, facet) → value` — is realized as:
  holder = the trait's owner; `(subject, facet)` = the `factId` introduced by
  `define fact`. The fact *declaration* (id + closed value set) is authored
  story data carried in the compiled story, not trait state; the compiler and
  loader check values against it.

- **Removed**: the old `beliefs: Record<topic, Belief>` map
  (`strength` + `resistance` keyed by bare topic). D14 left "fold or rename"
  open; **proposal: fold** — `resistance` moves into `ValuedBelief`, and for
  valueless topics an optional `resistance` field on `Fact`. `strength` was
  always a `ConfidenceWord` and is subsumed by `confidence`. Nothing keeps a
  second belief map for authors to confuse with `thinks`.

- **New** `told: Record<listenerId, topicOrFactId[]>` — the propagation
  already-told record, decomposed onto the **speaker's** trait (D17: the
  information graph is stored on the holders; `AlreadyToldRecord` as a
  service object is retired).

### 1.3 Changed (D17 — runtime state relocates from `CharacterPhaseRegistry`)

The current `CharacterPhaseRegistry` / `GoalManager` / `InfluenceTracker`
objects hold mutable state with their own `toJSON()`/`restoreState()` side
path (`tick-phases.ts:113–177`). D17 forbids exactly this. Relocations:

- `goalState: Record<goalId, { active: boolean; currentStep: number;
  paused: boolean; interrupted: boolean; prepared?: boolean }>` — on the
  pursuing NPC's trait (replaces `GoalManager`'s per-NPC `ActiveGoal` mutable
  half; goal *definitions* stay authored data). `active` persists because
  activation is edge-triggered, not derivable from the conditions.
- `influencesInForce: InfluenceInForce[]` — on the **target's** trait when
  the target carries a character model (replaces `InfluenceTracker`'s global
  list; each effect names its influencer). Home rule for targets with no
  trait (the player): the record rides the **exerter's** trait with an
  explicit `target` field.
- `told` — §1.2 above (replaces `AlreadyToldRecord`).

The evaluators keep their pure logic; they read and write trait state instead
of registry state. The registry survives only as a non-serialized index of
authored configs rebuilt at load — if it holds anything `toJSON()`-worthy,
that's a defect.

### 1.4 New (ADR-318 — normative layer)

Authored (applied at load, listed here for the loader contract):

- `temperaments: Array<{ name: string; while?: stateName }>` — bindings; the
  named temperament's force-pair orderings are authored data. At most one
  binding may be live for a given entity state (compile-checked, D3).
- `principles: Array<{ category: ActCategory; scope?: ScopeRef;
  except?: PredicateRef }>` — `never` lines and code-bundle unions, flattened
  by the compiler.
- `obligations: Array<{ kind: ObligationWord; scope?: ScopeRef }>` — compile
  to standing goals (D5-318); recorded on the trait so the author channel can
  attribute the duty feed.
- `honor?: { scope: ScopeRef; faceActs: FaceAct[] }` — full bundle from
  `honor before <scope>`, selective from `define honor`.

Mutable (serialized):

- `pressure: { value: number; band: PressureBand }` — runtime-owned curve;
  both stored (ADR-318 D12).
- `burdenedBy: topicId[]` — initial seeds; drained topics removed on
  confession discharge.
- `ledger: LedgerEntry[]` where

  ```ts
  interface LedgerEntry {
    kind: 'claim' | 'promise';
    audience: entityId;
    factId: string;          // for a promise: the derived topic of the promised act
    claimedValue: string;
    turnMinted: number;
    pinned: boolean;         // false after an authored break or `breaking` discharge
  }
  ```

  A promise is a ledger entry whose subject is the speaker's own future act
  (D9); violation is detected by act detection, not scheduling.

## 2. Tick-phase registration (ADR-310 D15)

One registration, existing socket, existing signature:

```ts
npcService.registerTickPhase('character-model', handler); // NpcTickPhase, npc-service.ts:22
```

- **Phase name frozen as `'character-model'`** (platform-internal freeze —
  tests and the author channel reference it; authors never see it).
- The single handler runs ordered sub-steps: **decay** (mood toward baseline,
  lucidity — folding the `processLucidityDecay` call currently inlined at
  `npc-service.ts:229–233`) → **observe** (Phase 5 amendment, 2026-08-15:
  the turn's player-action events — `NpcTickContext.actionEvents`, additive
  — forward to co-located character-model NPCs through stdlib's
  `observeEvent`; after decay so the turn evaluates from settled state,
  before influence so the rest of the turn reacts to what the player just
  did) → **influence** → **propagation** → **goals**
  (activation re-evaluation, step execution, obligation-generated goals) →
  **bookkeeping** (pressure deposits/band transitions from the turn's
  arbitrations, pin maintenance, author-channel emission). One registration,
  not three: ordering between the sub-steps is a contract, and three separate
  registrations would make it registration-order coincidence.
  (`createPropagationPhase` / `createGoalPhase` / `createInfluencePhase`
  factories fold into this and leave the public API.)
- **Temporal note (plan amendment, 2026-08-15)**: this signature is
  platform-internal, NOT compatibility surface. ADR-317/R3 (four-phase over
  stages) may reshape it at refactor cost. Handlers are synchronous, mutate
  trait state directly, and return semantic events — fine today, revisable.

### 2.1 The clock seam

All turn arithmetic in `@sharpee/character` (mood decay, influence
expiry, propagation pacing, pressure curve) reads time through one module —
`character-clock.ts`, wrapping `NpcTickContext.turn` — never scattered raw
`ctx.turn` reads. ADR-316's elapsed-time semantics, when un-deferred, changes
one seam.

### 2.2 The story oracle (Phase 5 amendment, 2026-08-15)

The character runtime's ONE injected seam for asking the loaded story a
question trait state cannot answer:

```ts
interface CompiledStoryOracle {
  evalCondition(cond: IRCondition, opts: { self: entityId; world: WorldModel }): boolean;
  isKindMember(entityId: string, kind: string): boolean;  // reserved: Phase 6 arbitration scopes
}
```

Bound on `CharacterPhaseRegistry` by the loader at load (authored wiring,
never serialized). Goal `active when` / `wait for` compiled conditions
evaluate through it, `it` bound to the asking NPC; a compiled condition
with no oracle bound throws — a wiring defect, never a silent false.
`isKindMember` is the reserved slot the Phase 6 arbitration seam fills for
classifier scopes (`a merchant`) — kind membership lives in the story's
IR, so Phase 6 extends this seam rather than adding a second one.
Platform-internal (§7).

## 3. Arbiter API (ADR-318 D1–D3)

```ts
type Force = 'fear' | 'desire' | 'duty' | 'honor' | 'love';

interface ForceReading {
  force: Force;
  intensity: number;      // runtime-owned scale; feeds per ADR-318 D1 table
  live: boolean;          // feed is off-baseline
  feed: string;           // author-channel attribution, e.g. 'principle:never-lies'
}

interface ActCandidate {
  kind: 'dialogue' | 'goal';
  act: 'comply' | 'refuse' | 'evade' | { goalId: string };
  topicId?: string;
  audiencePresent: entityId[];   // honor sees the room (D7)
}

interface ArbiterVerdict {
  winner: Force;
  act: ActCandidate['act'];      // possibly rewritten: paralysis → 'evade'
  readings: ForceReading[];
  temperamentApplied?: { name: string; pair: [Force, Force] }; // absent = D2 intensity default
  defeats: Array<{ force: Force; feed: string }>;              // → pressure deposits (D8)
  paralysis?: { principles: [string, string] };                // → author-channel warning (D6)
}

function arbitrate(trait: CharacterModelTrait, candidate: ActCandidate,
                   ctx: ArbiterContext): ArbiterVerdict;
```

- **D2 default**: no live temperament pair for the colliding forces → highest
  `intensity` wins. The declaration is the deviation.
- **Temperament lookup**: the binding whose `while` state is current (or the
  unconditional binding); its pair lines override intensity for exactly the
  pairs they name.
- Principles feed `duty` at a strong fixed baseline (D4); a losing live
  principle produces a `defeats` entry, which the bookkeeping sub-step
  converts to a pressure deposit (D8). The arbiter itself is pure — it
  computes; the tick's bookkeeping mutates.

## 4. Selector-pin hook (ADR-318 D9)

Dialogue selection (the D15 selector, built in Phase 2) consults the ledger
before scoring:

```ts
function getActivePin(trait: CharacterModelTrait, audience: entityId,
                      topicId: string): LedgerEntry | undefined;
```

If a pinned claim exists for `(audience, topic's factId)`, the selector must
choose a response line whose `claims` tag matches the pinned value — mood and
disposition drift cannot evaporate a maintained lie. Every pinned selection
is a `duty` defeat feeding pressure (D9). Mint rule lives in the selector's
report path: delivering a line whose `claims` contradicts the speaker's held
`factBeliefs` value mints an entry; honest assertion mints nothing.

## 5. Dialogue-selector socket (ADR-310 D15 — stdlib side, Phase 2 builds it)

Shape reserved here so Phase 1's types compile against it:

```ts
type DialogueSelector = (npc: IFEntity, intent: ConversationIntent,
                         ctx: DialogueSelectionContext) => DialogueResult | undefined;
registerDialogueSelector(selector: DialogueSelector): void;  // world-instance registration, ADR-207/208 idiom
```

ASK/TELL/SAY/TALK TO consult the registered selector when the NPC carries
`CharacterModelTrait`; `undefined` falls through to today's topic-table
ordering (D7: no model, no change). Platform-internal signature, same §7 rule.

## 6. Vocabulary — the freeze-review package

Everything below becomes **author-facing compatibility surface** the moment
the first story ships it. Both ADRs require David's review before freeze.
Lists marked ⊕ are open vocabularies (authors extend via `define`); the
platform-shipped words still freeze.

| List | Words | Source |
|---|---|---|
| Personality adjectives ⊕ | honest, loyal, cowardly, paranoid, cruel, cunning, curious, stubborn, generous, vain, devout, impulsive **+ remorseful, untroubled** (ADR-318 D8 sensitivity) | ADR-141; 318-D8 |
| Intensity words | slightly, somewhat, very, extremely | ADR-141 |
| Disposition words | despises, hates, dislikes, wary of, neutral, likes, trusts, devoted to | ADR-141 |
| Mood words ⊕ | calm, content, cheerful, nervous, anxious, panicked, angry, furious, sad, grieving, suspicious, confused, resigned | ADR-141 |
| Threat words | safe, uneasy, wary, threatened, cornered, desperate | ADR-141 |
| Cognitive dimensions | perception (accurate/filtered/augmented), belief-formation (flexible/rigid/resistant), coherence (focused/drifting/fragmented), lucidity (stable/fluctuating/episodic), self-model (intact/uncertain/fractured) | ADR-141 |
| Profile presets | clear-headed, fixated, elsewhere, loosened, fogged, braced, unmoored, unquiet | ADR-310 D5 (ruled) |
| Confidence words | uncertain, suspects, believes, certain (**rename rejected** — David, 2026-08-15: uncertainty is not an absolute, `believes` is the accurate word for the 0.7 step; `convinced` would blur into `certain`) | ADR-310 D14 |
| Fact sources | witnessed, told, inferred, assumed, hallucinated | ADR-141 |
| Resistance modes | none, reinterprets, ignores | ADR-141 |
| Goal step verbs | seek, acquire, wait for, move to, act, say, give, drop | ADR-310 D8 |
| Goal priorities | (numeric today via GOAL_PRIORITY_VALUES; Chord surface `critical` etc. — words from ADR-145) | ADR-310 D8 |
| Forces | fear, desire, duty, honor, love | ADR-318 D1 |
| Act categories | betray a confidence, lie, harm [scope], steal, break a promise, abandon [scope], trespass | ADR-318 D4 |
| Obligation words | protects [scope], answers honestly | ADR-318 D4 |
| Face-acts | backs down, shows fear, admits fault, pleads, accepts insult, caught lying | ADR-318 D7 |
| Pressure bands | clear, burdened, breaking | ADR-318 D8 |
| Propagation surface | spreads … to … / spreads nothing; audiences: trusted, anyone, allied (`selective` retired per D10) | ADR-310 D10 |
| Knows-line markers | witnessed/told/… (fact sources) + **confided** (318 D4) | ADR-318 D4 |

**Collisions checked**: `believes` (three-way, resolved from the other side —
the confidence word keeps the name; the builder *method* `believes()` is
removed by the §1.2 fold and the Chord construct is spelled `thinks`, so the
word survives in exactly one role);
`stable` preset (resolved by `clear-headed`); ADR-310's Consequence flag that
`act` and `say` as goal-step verbs sit close to existing author vocabulary —
carried to Phase 3's grammar work as a diagnostic-quality concern, not a
rename proposal. New check this pass: ADR-318's band word `breaking` vs. the
threat word list — no overlap (threat has no `breaking`); `uneasy` exists as
a *threat* word and was cut as a *band* word, so the same word never appears
in two normative roles. `wary of` (disposition) vs `wary` (threat) is a
pre-existing near-miss, unchanged by this work, noted for the review.

## 7. Custom vocabulary syntax (ADR-310 D5 — TS contract)

`VocabularyExtension.defineCustomMood(name, { valence, arousal })` and
`defineCustomPersonality(name)` already exist. The contract: Chord's
`define mood` / `define personality` lowers to these two calls, and custom
words join the same compile-time vocabulary check as platform words.
Numbers appear nowhere in Chord source.

**Final syntax (Option 2 — David, 2026-08-15, session ff8983):**

- `define personality <name>` — one line, no body; intensity words compose
  as usual.
- `define mood <name> like <mood>[, but <modifier>]` — anchored at a
  PLATFORM mood's coordinates (custom anchors disallowed), optionally
  nudged ONE axis by a closed modifier word: `restless` / `stiller`
  (energy up/down), `darker` / `brighter` (outlook down/up). The four
  modifier words join the frozen vocabulary (§6); the nudge step sizes are
  runtime-owned (`applyMoodModifier`, world-model).

The earlier sketch's free-word modifier (`but restless` with `restless`
unchecked) was rejected as uncheckable; a mood far from every anchor is a
platform-list conversation, not a syntax one.

## 8. What Phase 1 removes

- `CharacterMessages` player-facing opt-in (stdlib) — retired per D12;
  rerouted to author channel in Phase 2, but the types stop being exported
  player surface now.
- Old `Belief` map and `believes()` builder method — folded (§1.2); builder
  gains `thinks(factId, value, confidence, source)` for naming parity.
- `selective` propagation tendency — retired (D10).
- Clinical preset names — renamed (D5 table).
- `CharacterPhaseRegistry.toJSON()/restoreState()` — deleted with the state
  relocation (§1.3).

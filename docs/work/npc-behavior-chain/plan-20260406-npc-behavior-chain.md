# Session Plan: NPC Behavior Chain — ADR-142, ADR-144, ADR-145, ADR-146

**Created**: 2026-04-06
**Branch**: feature/npc-behavior-chain
**Overall scope**: Implement four interdependent ADRs that compose into a complete NPC intelligence stack: Conversation (142), Information Propagation (144), Goal Pursuit (145), and NPC Influence (146). ADR-141 (Character Model) is already implemented and serves as the foundation all four consume.
**Bounded contexts touched**: `@sharpee/character` (authoring API), `@sharpee/world-model` (new types and trait extensions), `@sharpee/stdlib` (NpcService turn phases, DialogueExtension impl), `@sharpee/lang-en-us` (response intent → prose)
**Key domain language**: ResponseIntent, TopicRegistry, ConversationContext, PropagationProfile, GoalSequence, InfluenceEffect, CharacterModelTrait, predicate registry

---

## Dependency Chain

```
ADR-142 (Conversation)
    ↑ produces: ResponseIntent, ConversationContext, conversation history
ADR-144 (Information Propagation)
    ↑ produces: fact transfers with provenance, propagation events
ADR-145 (Goal Pursuit)
    ↑ consumes: propagated facts trigger goal activation; produces: goal step execution
ADR-146 (Influence)
    ↑ integrates as: goal step type; passive turn-phase evaluation
```

All four systems add evaluation phases to `NpcService.tick()`. They share the predicate registry from ADR-141. All new state must survive save/restore.

---

## Phases

---

### Phase 1: Conversation Types, Topic Registry, and Constraint Evaluation

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: ADR-142 layers 1-2 — the core data model and selection engine that makes conversation deterministic and testable before any builder API or engine integration exists
- **Entry state**: Branch `feature/npc-behavior-chain` checked out; ADR-141 fully implemented (CharacterModelTrait with predicate registry, CharacterBuilder API, applyCharacter); `@sharpee/world-model` exports CharacterModelTrait
- **Deliverable**:
  - `packages/character/src/conversation/` directory with:
    - `topic-registry.ts` — `TopicDef` type (keywords, related, availableWhen predicates); `TopicRegistry` class with `define()`, `resolve(text, npcState)` (exact normalized match → neighborhood fallback → null); `topic-availability-check(npcState)`
    - `response-types.ts` — `ResponseAction` union (`tell | omit | lie | deflect | refuse | ask back | confess | confabulate`); `ResponseCandidate` (action, messageId, constraints, priority, params); `ResponseIntent` interface (action, topic, messageId, mood, coherence, context, params); `ConversationRecord` (topic → {action, turn}); `EvidenceRecord` (what player presented to which NPC, turn)
    - `constraint-evaluator.ts` — `evaluateConstraints(candidates, npcTrait)`: evaluates predicate list against CharacterModelTrait.evaluate(), returns first satisfied candidate by author order (first match wins), falls through to `.otherwise()` if none match; `recordResponse(npcId, topic, action, turn)` — updates ConversationRecord; contradiction detection (same topic, different action)
    - `index.ts` — exports
  - Unit tests in `packages/character/tests/conversation/` covering:
    - Topic resolution: exact match, keyword set match, neighborhood fallback, no-match null
    - Topic availability gating by predicate
    - Constraint evaluation: first-match-wins ordering, `.otherwise()` fallback, empty candidate list
    - Response recording and contradiction detection
    - Evidence tracking (player presented X to NPC Y)
- **Exit state**: TopicRegistry and constraint evaluator pass all unit tests; no engine integration yet; no builder API yet; `@sharpee/character` builds cleanly

---

### Phase 2: Conversation Lifecycle, Attention, and ACL

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: ADR-142 layers 3-4 — conversation as persistent active state with intent/strength, plus the anti-corruption layer that translates ResponseIntent to language layer message IDs
- **Entry state**: Phase 1 complete; TopicRegistry, constraint evaluator, and response types available from `@sharpee/character`
- **Deliverable**:
  - `packages/character/src/conversation/lifecycle.ts` — `ConversationContext` type (active NPC id, intent, strength, decayThreshold, contextLabel, turnCount); `ConversationLifecycle` class:
    - `begin(npcId, intent, strength)` / `end()` / `decay(turnsElapsed)` — lifecycle transitions
    - `isActive()`, `isBlocking()`, `shouldDecay(nonConversationTurns)` — state queries
    - `setContext(label, intent, strength, threshold)` — updates mid-conversation
    - `recordNonConversationTurn()` — increments decay counter
    - Attention shift: `attemptRedirect(toNpcId)` — returns `'yields' | 'protests' | 'blocks'` based on strength
    - NPC continuation scheduling: `scheduleAfter(turns, messageId)` — registers continuation messages
    - NPC initiative triggers: `initiateWhen(condition, messageId)` — fires on NPC turn if condition met
  - `packages/character/src/conversation/acl.ts` — `buildResponseIntent(candidate, npcTrait)`: constructs ResponseIntent from selected ResponseCandidate + current CharacterModelTrait (attaches mood, coherence from cognitive profile); `selectMoodVariant(messageId, mood)` — appends mood suffix if variant registered; `applyCognitiveColoring(intent, cognitiveProfile)` — marks coherence/selfModel for language layer
  - Between-turn platform defaults: `BETWEEN_TURN_DEFAULTS` — message ID map keyed by `(intent, turnCount)` — used when author has not overridden
  - Unit tests covering:
    - Conversation begins, decays by intent threshold, ends on GOODBYE or NPC dismiss
    - `attemptRedirect` returns correct value for each strength level
    - `buildResponseIntent` attaches correct mood and coherence fields
    - Cognitive coloring marks the intent correctly for all cognitive states
    - Between-turn defaults select the right message ID per intent/turn
- **Exit state**: Conversation lifecycle and ACL pass all unit tests; no engine integration yet; no builder API yet

---

### Phase 3: Conversation Builder API and DialogueExtension Implementation

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: ADR-142 layers 5-6 — the authoring surface (builder methods) and the DialogueExtension implementation that wires conversation to stdlib's ASK/TELL/SAY/TALK TO actions
- **Entry state**: Phases 1-2 complete; lifecycle, ACL, topic registry, constraint evaluator all available
- **Deliverable**:
  - `packages/character/src/conversation/builder.ts` — extends `CharacterBuilder` with:
    - `topic(name, def)` — registers a TopicDef in the builder's topic registry
    - `when(trigger)` — returns `ResponseChainBuilder` (fluent chain for `.if().tell()/.lie()/.deflect()` etc.)
    - `ResponseChainBuilder`: `.if(...predicates)`, `.tell(msgId, params?)`, `.lie(msgId)`, `.deflect(msgId)`, `.refuse(msgId)`, `.omit(msgId)`, `.confess(msgId)`, `.confabulate(msgId)`, `.askBack(msgId)`, `.setsContext(label, opts?)`, `.betweenTurns(n, msgId)`, `.onLeaveAttempt(msgId)`, `.otherwise()`, `.updatesState(mutations)`
    - `initiates(trigger, opts)` — NPC initiative trigger definition
    - `offscreen(otherNpcId, opts)` — offscreen NPC-to-NPC conversation
    - `witnessed(otherNpcId, opts)` — eavesdropping sequence
  - Conversation data is added to `CompiledCharacter` output (new `conversationData` field)
  - `packages/character/src/conversation/dialogue-extension.ts` — `CharacterModelDialogue` implementing ADR-102's `DialogueExtension` interface:
    - `handleAsk(npcId, aboutText, context)` — resolve topic → evaluate constraints → record → build intent → return effects
    - `handleTell(npcId, aboutText, context)` — confrontation path, updates state per .updatesState() rules
    - `handleSay(npcId, text, context)` — routes free speech through topic resolution
    - `handleTalkTo(npcId, context)` — initiates conversation lifecycle, fires initiative triggers
  - `packages/lang-en-us/src/conversation-messages.ts` — platform default response intent messages (between-turn defaults per intent, response action vocabulary framing, cognitive speech pattern variants: fragmented, drifting, detached)
  - Integration tests (using real CharacterModelTrait, no mocks) covering:
    - Full ask→constraint-evaluate→response-intent→dialogue-result path
    - Confrontation: TELL updates NPC state via .updatesState()
    - Eavesdropping: player learns fact with source 'overheard'
    - Blocking conversation: `attemptRedirect` returns 'blocks', going action receives block signal
  - **Exit state**: `CharacterModelDialogue` can be registered as the dialogue extension; integration tests pass; builder API compiles cleanly from story-level code

---

### Phase 4: Information Propagation — Profile, Evaluation Engine, and Fact Transfer

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: ADR-144 layers 1-3 — the propagation profile authored per NPC, the per-turn evaluation engine, and the fact transfer with provenance tracking
- **Entry state**: Phase 3 complete; conversation system produces facts in CharacterModelTrait.knowledge with provenance; NpcService.tick() currently handles behavior evaluation, observation, and lucidity decay
- **Deliverable**:
  - `packages/character/src/propagation/` directory with:
    - `propagation-types.ts` — `PropagationTendency` (`chatty | selective | mute`); `PropagationAudience` (`trusted | anyone | allied`); `PropagationPace` (`eager | gradual | reluctant`); `PropagationColoring` (`neutral | dramatic | vague | fearful | conspiratorial`); `PropagationProfile` interface (tendency, audience, excludes, withholds, spreads, overrides, pace, schedule, coloring, playerCanLeverage, receives); `AlreadyToldRecord` (npcId → Set of topic names)
    - `propagation-evaluator.ts` — `evaluatePropagation(npc, room, world, turn)`:
      1. Mute check
      2. Schedule condition check (reuses predicate registry)
      3. Eligible listener discovery (audience filter + exclusions + player-absent check)
      4. Eligible facts (tendency whitelist/blacklist, already-told check)
      5. Pace application (eager = all, gradual = one, reluctant = turn-count check)
      6. Returns list of `PropagationTransfer` objects (speaker, listener, topic, version)
    - `fact-transfer.ts` — `transferFact(speaker, listener, topic, version, world, turn)`:
      - Creates fact in listener's knowledge: `{ source: 'told by {speaker}', confidence: receives setting, turnLearned: turn }`
      - Records in AlreadyToldRecord
      - Emits propagation event (`character.event.fact_transferred`)
      - Triggers listener's ADR-141 observation system with the new fact
  - `NpcService.tick()` extended: new propagation phase runs after behavior evaluation, calls `evaluatePropagation` for each NPC with a PropagationProfile
  - Unit tests covering:
    - Mute NPC: no transfers
    - Chatty NPC: transfers all facts not in withholds to trusted audience
    - Selective NPC: only transfers listed spreads topics
    - Pace: eager sends all, gradual sends one per turn, reluctant waits N turns
    - Already-told: same fact not re-transferred to same listener
    - Provenance chain: cook.knowledge['murder'].source = 'told by maid' after maid→cook transfer
    - playerCanLeverage=false: player-told facts don't propagate
- **Exit state**: Propagation evaluation runs each NPC turn; fact transfers with full provenance; all tests pass; no visibility layer yet (that's Phase 5)

---

### Phase 5: Propagation Visibility, Goal Activation, and Pathfinding

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: ADR-144 layer 4 (visibility) and ADR-145 layers 1-3 (goal activation, step evaluation, NPC movement toward goals)
- **Entry state**: Phase 4 complete; propagation produces PropagationTransfer events; CharacterModelTrait has goals array (priority-sorted) from ADR-141 but nothing activates or evaluates them
- **Deliverable**:
  - `packages/character/src/propagation/visibility.ts` — `emitPropagationVisibility(transfer, playerState, world)`:
    - Absent: no emission (state mutation only, already done in Phase 4)
    - Witnessed: emit `character.event.propagation_witnessed` with coloring-selected message ID (platform default per coloring, or author override per fact)
    - Eavesdropped: emit full dialogue; player gains fact with source 'overheard'; feeds ADR-142 eavesdropping mechanic
  - `packages/character/src/goals/` directory with:
    - `goal-types.ts` — `GoalPriority` (`critical | high | medium | low`); `GoalStep` union (seek, acquire, waitFor, moveTo, act, say, give, drop — each with target, optional `witnessed` messageId); `PursuitMode` (`sequential | opportunistic | prepared`); `GoalDef` (id, activatesWhen predicates, interruptedBy predicates, priority, steps, mode, onInterrupt messageId, resumeOnClear bool)
    - `goal-activation.ts` — `evaluateGoalActivation(npc, world)`: checks all GoalDefs in CharacterModelTrait against current predicate state; activates newly-satisfied goals, deactivates if interruption conditions met; maintains active goal queue (priority-sorted); returns `ActiveGoal[]`
    - `step-evaluator.ts` — `evaluateStep(npc, step, world)`:
      - `seek`/`moveTo`: compute shortest path through NPC's known rooms, move one room toward target, emit witnessed message if player present
      - `acquire`: target item in same room → call world.moveEntity(); emit witnessed
      - `waitFor`: evaluate predicate conditions → advance or hold
      - `act`: emit authored action message ID
      - `say`: initiate conversation via CharacterModelDialogue
      - `give`/`drop`: world mutations with witnessed messages
    - `pathfinding.ts` — BFS over room connection graph filtered by `movement.knows` and `movement.access`; returns next room toward target or null if unreachable
  - `NpcService.tick()` extended: new goal phase runs after propagation; calls `evaluateGoalActivation` then `evaluateStep` on highest-priority active goal
  - Unit tests covering:
    - Goal activates when activation predicates become true
    - Goal deactivates when interruption conditions met
    - Sequential mode: steps execute one per turn in order
    - Opportunistic mode: NPC waits for act conditions, no step execution
    - Pathfinding: BFS finds correct next room; respects knows and access filters
    - Witnessed message fires when player in same room; silent when player absent
- **Exit state**: NPCs activate goals from character state, pursue them step-by-step; pathfinding works; all tests pass

---

### Phase 6: Propagation Builder API, Goal Builder API, Influence System, and NpcService Integration

- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: ADR-144 layer 5, ADR-145 layers 4-5, all of ADR-146 — the authoring surfaces for propagation and goals, plus the full influence system (profile, resistance, evaluation, PC handling, goal step integration)
- **Entry state**: Phases 1-5 complete; all evaluation engines implemented; NpcService.tick() has propagation and goal phases; conversation system complete
- **Deliverable**:
  - **Propagation builder API** (`packages/character/src/propagation/builder.ts`) — extends `CharacterBuilder` with:
    - `.propagation(opts)` — accepts full PropagationProfile options including pace, coloring, schedule, overrides, receives, playerCanLeverage
    - PropagationProfile stored in CompiledCharacter output
  - **Goal builder API** (`packages/character/src/goals/builder.ts`) — replaces existing stub `goal(id, priority)` in CharacterBuilder:
    - `.goal(id)` — returns `GoalBuilder` fluent chain
    - `GoalBuilder`: `.activatesWhen(...predicates)`, `.priority(word)`, `.mode(pursuitMode)`, `.interruptedBy(...predicates)`, `.onInterrupt(msgId)`, `.resumeOnClear(bool)`, `.pursues(steps[])`, `.actsWhen(...predicates)`, `.act(msgId)`
    - GoalDef stored in CompiledCharacter output
  - **Movement profile builder** — `.movement(opts)` on CharacterBuilder: `knows` (array of room IDs/region names, or `'all'`), `access` (array of passage IDs, or `'all'`)
  - **Influence system** (`packages/character/src/influence/`):
    - `influence-types.ts` — `InfluenceMode` (`passive | active`); `InfluenceRange` (`proximity | targeted | room`); `InfluenceDuration` (`while present | momentary | lingering`); `InfluenceDef` (name, mode, range, effect mutations, duration, witnessed msgId, resisted msgId, schedule, onPlayerAction msgId); `ResistanceDef` (influence name, except predicates); `ActiveInfluenceEffect` (name, target, expiresAt or clearCondition)
    - `influence-evaluator.ts` — `evaluatePassiveInfluences(npc, room, world, turn)`: for each passive InfluenceDef on each NPC in room, collect eligible targets (range filter), evaluate resistance (binary: resists → emit resisted msg; doesn't → apply effect mutations, emit witnessed msg, track ActiveInfluenceEffect); `evaluateActiveInfluence(npc, influence, target, world)` — on-demand for goal step `{ influence: name, target }` and direct calls
    - `influence-duration.ts` — `trackInfluenceEffect(effect, turn)`, `expireInfluenceEffects(world, turn)`: clears `'while present'` effects on NPC departure, `'momentary'` after one turn, `'lingering'` after authored turns or condition
    - `pc-influence.ts` — `handlePcInfluence(influence, playerActionContext)`: intercepts player action when under influence; emits `onPlayerAction` message; applies focus disruption (clears conversation context if `focus: 'clouded'`)
  - **Influence builder API** (`packages/character/src/influence/builder.ts`) — extends `CharacterBuilder` with:
    - `.influence(name)` — returns `InfluenceBuilder` fluent chain: `.mode()`, `.range()`, `.effect()`, `.duration()`, `.witnessed()`, `.resisted()`, `.schedule()`, `.onPlayerAction()`
    - `.resistsInfluence(name, opts?)` — registers ResistanceDef with optional `except` predicates
  - **NpcService.tick() final integration**: influence evaluation phase added (passive influences evaluated after goal phase); duration expiry run each turn
  - **`applyCharacter` updated** to apply PropagationProfile, GoalDefs, InfluenceDefs, ResistanceDefs from CompiledCharacter
  - Unit tests covering:
    - Propagation builder round-trips through compile→apply
    - Goal builder produces correct GoalDef sequence for `prepared` mode (sequential steps + opportunistic final act)
    - Passive influence applies to all room entities with correct range filter
    - Resistance blocks effect and emits resisted message
    - `except` condition on resistance creates correct vulnerability (Margaret resists except from female)
    - `'while present'` duration clears when influencer leaves room
    - `'momentary'` clears after one turn
    - PC influence intercepts player action and emits onPlayerAction message
    - Influence as goal step: step fails if target resists, NPC must find alternate path
- **Exit state**: All four ADR builder APIs usable from story-level code; NpcService.tick() runs all phases in order; full unit test coverage; `@sharpee/character` builds cleanly with all new exports

---

### Phase 7: End-to-End Integration, lang-en-us, Save/Restore

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Closing the loop — wiring the full stack into a testable story fragment, adding lang-en-us message mappings for all new message IDs, and verifying save/restore handles all new state
- **Entry state**: Phases 1-6 complete; all systems implemented; builder APIs available; NpcService.tick() runs all phases
- **Deliverable**:
  - **lang-en-us conversation messages** — `packages/lang-en-us/src/conversation/`:
    - `response-actions.ts` — message IDs for response action vocabulary (deflect framing, refuse framing, confabulate framing)
    - `cognitive-speech-patterns.ts` — fragmented, drifting, detached speech pattern variants
    - `between-turn-defaults.ts` — platform default messages per (intent, turnCount) pair: eager/1, eager/3+, reluctant/1, hostile/1, confessing/1, confessing/3, neutral/3+
  - **lang-en-us propagation messages** — `packages/lang-en-us/src/propagation/`:
    - `propagation-defaults.ts` — platform default witnessed messages per coloring (dramatic, vague, fearful, conspiratorial, neutral)
  - **lang-en-us influence messages** — `packages/lang-en-us/src/influence/`:
    - `influence-defaults.ts` — platform default witnessed/resisted messages (authors override per influence name)
  - **Save/restore audit** — verify all new state serializes cleanly:
    - `ConversationContext` (active, intent, strength, decay counter, continuations queue)
    - `ConversationRecord` (per-NPC topic→action history)
    - `EvidenceRecord` (player presentations per NPC)
    - `AlreadyToldRecord` (propagation told-tracking)
    - `ActiveGoal[]` (current step index, paused/interrupted state)
    - `ActiveInfluenceEffect[]` (expiry tracking)
    - Add save/restore round-trip tests if any field is not plain-serializable
  - **Integration test story fragment** — `packages/character/tests/integration/mystery-fragment.test.ts`:
    - Constructs 3 NPCs (maid: chatty propagator; cook: selective; colonel: ruthless killer) with full character builds using all four ADR builder APIs
    - Player asks maid about murder → response constraint evaluated → ResponseIntent produced → DialogueResult returned
    - Maid propagates to cook → cook.knowledge gains 'murder' with provenance 'told by maid'
    - Cook propagates to colonel → colonel.knowledge gains 'murder' with provenance 'told by cook'
    - Colonel activates 'eliminate-player' goal → seeks knife → waits for player alone → act step
    - Ginger influence: player near Ginger loses focus; conversation context cleared
    - All of this driven from builder API, no direct trait construction
  - **Exit state**: Full chain proven by integration test; lang-en-us builds with new message files; save/restore round-trips verified; branch ready for PR

---

## Phase Ordering Notes

Phases 1-2 are strictly sequential (Phase 2 depends on Phase 1 types). Phase 3 depends on Phases 1-2. Phase 4 depends on Phase 3 (conversations produce the facts that propagate). Phase 5 depends on Phase 4 (propagation triggers goal activation). Phase 6 depends on Phase 5 (influence as goal step; all builder APIs depend on evaluation engines existing). Phase 7 integrates everything and must be last.

Within Phase 6, the propagation builder, goal builder, and influence system are independent of each other and can be implemented in any sub-order.

## ADR Coverage by Phase

| ADR | Layer | Phase |
|-----|-------|-------|
| 142 | 1: Topic Registry + Resolution | 1 |
| 142 | 2: Constraint Evaluation | 1 |
| 142 | 3: Conversation Lifecycle + Attention | 2 |
| 142 | 4: ACL | 2 |
| 142 | 5: lang-en-us | 7 |
| 142 | 6: DialogueExtension + Builder API | 3 |
| 144 | 1: Propagation Profile | 4 |
| 144 | 2: Propagation Evaluation Engine | 4 |
| 144 | 3: Fact Transfer + Provenance | 4 |
| 144 | 4: Visibility | 5 |
| 144 | 5: Builder API | 6 |
| 145 | 1: Goal Activation + Storage | 5 |
| 145 | 2: Step Evaluation Engine | 5 |
| 145 | 3: NPC Goal Movement | 5 |
| 145 | 4: Goal Lifecycle Management | 5 |
| 145 | 5: Builder API | 6 |
| 146 | 1: Influence Profile | 6 |
| 146 | 2: Resistance Profile | 6 |
| 146 | 3: Influence Evaluation Engine | 6 |
| 146 | 4: PC Influence Handling | 6 |
| 146 | 5: Builder API | 6 |
| All | lang-en-us + save/restore + integration | 7 |

## Status

- Phase 1: CURRENT
- Phase 2: PENDING
- Phase 3: PENDING
- Phase 4: PENDING
- Phase 5: PENDING
- Phase 6: PENDING
- Phase 7: PENDING

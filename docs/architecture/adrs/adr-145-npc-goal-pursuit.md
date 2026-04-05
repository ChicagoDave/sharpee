# ADR-145: NPC Goal Pursuit

## Status: DRAFT

## Date: 2026-04-05

## Context

### The Problem

ADR-141 defines a character model with personality, disposition, mood, threat, knowledge, beliefs, and goals. ADR-142 defines how NPCs converse with the player and with each other. ADR-144 defines how information propagates through the NPC network based on personality and disposition. But none of these systems address what happens when an NPC decides to **act on what they know** — pursuing a multi-turn sequence of behaviors to achieve a goal.

The motivating example: in a mystery game, the killer learns (through information propagation) that the player suspects them. The killer doesn't instantly attack. They form a plan — acquire a weapon, wait for the right moment, act. This unfolds over multiple turns as the NPC moves through the world, acquires items, and waits for conditions.

### What Exists Today

- **ADR-070 (NPC System Architecture)**: NPCs have a turn phase where behaviors execute. Current behaviors are reactive — respond to the current situation, don't plan ahead.
- **ADR-071 (Daemons and Fuses)**: Timed events that fire after N turns or on conditions. These are timer-based, not goal-based.
- **ADR-141 (Character Model)**: NPCs have a `goals` field (priority-sorted array) but no system consumes it for behavior planning.
- **NpcService.tick()**: Evaluates NPC behaviors each turn. Currently handles movement patterns, combat, and observation — no goal pursuit.

### Design Principles

**Everything is authored.** This is not an AI planner or pathfinding system. The author writes behavior sequences with conditions. The engine evaluates "can I do the next step this turn?" during the NPC phase. No emergent planning, no surprises the author didn't define.

**Goals are character-driven.** Goals aren't assigned directly — they arise from character state changes. The killer doesn't have a "kill player" goal at game start. They acquire it when their character model state crosses a threshold (learns they're suspected + personality is ruthless + threat is hostile).

**NPCs are patient.** A goal doesn't mean immediate action. An NPC with a goal waits for conditions, takes preparatory steps, and acts when the moment is right. The author controls the pacing.

## Decision

### 1. Goal Activation

Goals activate when character state conditions are met. The author defines activation conditions using the same predicate system as ADR-141/142:

```typescript
npc.character('colonel-mustard')
  .personality('ruthless', 'calculating')

  .goal('eliminate-player')
    .activatesWhen(['knows player-suspects-me', 'hostile'])
    .priority('critical')
    .pursues([
      { seek: 'kitchen-knife', from: 'kitchen' },
      { waitFor: 'player alone in room' },
      { act: 'mustard-attacks-player' }
    ])
```

**Activation rules:**
- Conditions are evaluated each NPC turn against current character state
- Once activated, the goal enters the NPC's active goal queue (priority-sorted)
- Goals can be deactivated if conditions change (e.g., NPC calms down, threat drops)
- Multiple goals can be active simultaneously — highest priority executes first

### 2. Behavior Sequences

A goal's pursuit is an ordered sequence of **steps**. Each step has a type, a target, and optional conditions:

**Step types:**

| Type | Description | Example |
|---|---|---|
| `seek` | Move toward a location or entity | Go to kitchen, find the knife |
| `acquire` | Pick up or obtain an item | Take the kitchen knife |
| `waitFor` | Pause until a condition is met | Wait for player to be alone |
| `moveTo` | Go to a specific location | Go to the library |
| `act` | Perform an authored action | Attack the player |
| `say` | Initiate conversation | Confront the player verbally |
| `give` | Hand an item to another entity | Pass the note to the maid |
| `drop` | Leave an item somewhere | Plant evidence in the study |

**Step evaluation during NPC turn:**
1. Get the NPC's highest-priority active goal
2. Get the current step in that goal's sequence
3. Evaluate: can this step execute this turn?
   - `seek`/`moveTo`: Is the NPC adjacent? Move one room toward target. (Uses existing NPC movement system.)
   - `acquire`: Is the item in the same room? Take it.
   - `waitFor`: Are conditions met? If yes, advance to next step. If no, do nothing this turn.
   - `act`/`say`/`give`/`drop`: Execute the authored behavior.
4. If step completed, advance to next step
5. If step cannot execute, NPC does nothing goal-related this turn (but other behaviors still run)

### 3. NPC Movement Toward Goals

The `seek` and `moveTo` steps require the NPC to navigate the world. This uses the existing room connection graph — the NPC moves one room per turn toward the target, following the shortest authored path.

**Movement is observable.** If the player is in a room and the Colonel walks through carrying a knife, that's visible:

```typescript
.goal('eliminate-player')
  .activatesWhen(['knows player-suspects-me', 'hostile'])
  .pursues([
    { seek: 'kitchen-knife', from: 'kitchen',
      witnessed: 'mustard-heads-toward-kitchen' },    // player sees NPC leave
    { acquire: 'kitchen-knife',
      witnessed: 'mustard-takes-knife' },              // player in kitchen sees this
    { waitFor: 'player alone in room' },
    { moveTo: 'player',
      witnessed: 'mustard-enters-with-knife' },        // player sees NPC arrive
    { act: 'mustard-attacks-player' }
  ])
```

The `witnessed` message ID fires when the player observes the step. If the player isn't present, the step executes silently.

### 4. Goal Interruption and Preemption

Goals can be interrupted by state changes or higher-priority goals:

```typescript
npc.character('colonel-mustard')
  .goal('eliminate-player')
    .activatesWhen(['knows player-suspects-me', 'hostile'])
    .priority('critical')
    .interruptedBy(['not hostile', 'restrained', 'weapon taken'])
    .onInterrupt('mustard-abandons-plan')
    .pursues([...])

  .goal('act-natural')
    .activatesWhen(['knows player-suspects-me', 'not hostile'])
    .priority('high')
    .pursues([
      { moveTo: 'drawing-room' },
      { waitFor: 'player enters' },
      { say: 'mustard-casual-greeting' }    // act like nothing's wrong
    ])
```

**Interruption rules:**
- If interruption conditions are met, the goal is suspended (not deleted)
- The NPC reverts to normal behavior or pursues the next active goal
- If interruption conditions clear, the goal can resume from where it left off (author-configurable: resume vs. restart)
- If a higher-priority goal activates, the lower-priority goal is paused, not interrupted

### 5. Preparedness and Opportunism

Not all goals require sequential pursuit. Some goals represent **standing intentions** — the NPC acts when opportunity arises rather than actively seeking it:

```typescript
npc.character('colonel-mustard')
  .goal('eliminate-player')
    .activatesWhen(['knows player-suspects-me', 'hostile'])
    .priority('critical')
    .mode('opportunistic')    // don't seek — wait for conditions
    .actsWhen(['player alone in room', 'has weapon'])
    .act('mustard-attacks-player')
```

**Pursuit modes:**
- `sequential` (default): Execute steps in order, one per turn
- `opportunistic`: No steps — just wait for act conditions, NPC continues normal behavior
- `prepared`: Execute preparatory steps, then switch to opportunistic for the final act

`prepared` is the Clue killer pattern — get the weapon (sequential), then wait for the right moment (opportunistic).

### 6. Relationship to Existing Systems

**NpcService.tick()**: Goal pursuit adds a new phase to the NPC turn. After existing behavior evaluation, the service checks active goals and executes the current step if possible. Goal-driven movement replaces the NPC's normal movement pattern for that turn.

**ADR-141 (Character Model)**: Goals are stored in `CharacterModelTrait.goals`. The activation conditions use the predicate registry. State changes from conversation or propagation trigger goal evaluation.

**ADR-142 (Conversation)**: A `say` step in a goal sequence initiates conversation using the conversation system. A blocking conversation can prevent the player from escaping the NPC's act step.

**ADR-144 (Information Propagation)**: Propagation is the typical trigger for goal activation — the killer learns something through the NPC network that changes their character state, which activates a goal.

**ADR-071 (Daemons and Fuses)**: Daemons are turn-based timers. Goals are condition-based sequences. They complement each other — a daemon might tick down a deadline while a goal pursues the objective.

## Consequences

### Positive

- NPCs with authored multi-turn behavior plans that respond to game state
- The Clue killer pattern works: learn → plan → prepare → act
- Observable NPC behavior (player sees NPCs moving with purpose) creates tension
- Goal interruption allows dynamic shifts without scripting every permutation
- Three pursuit modes (sequential, opportunistic, prepared) cover common NPC behavior patterns
- Everything authored — no emergent behavior surprises

### Negative

- Adds complexity to NpcService.tick() — goal evaluation each NPC turn
- NPC pathfinding (even simple shortest-path) requires room connection graph traversal
- Goal state must be saved/restored (which step, paused goals, interrupted goals)
- Authors must think about goal interactions when multiple goals are active

### Neutral

- Goal pursuit is opt-in — NPCs without goals behave exactly as before
- The step types are extensible — stories can add custom step types
- Goal sequences are data, not code — potentially serializable for save/restore

## Implementation Layers

### Layer 1: Goal Activation and Storage
- Goal definitions in CharacterModelTrait
- Activation condition evaluation against predicate registry
- Active goal queue (priority-sorted)
- Goal state persistence (current step, paused, interrupted)

### Layer 2: Step Evaluation Engine
- Step type registry (seek, acquire, waitFor, moveTo, act, say, give, drop)
- Per-turn step evaluation in NpcService.tick()
- Step completion and sequence advancement
- Witnessed message emission when player observes steps

### Layer 3: NPC Goal Movement
- Author-defined movement profiles (map knowledge + access)
- Room connection graph traversal filtered by NPC's known rooms and accessible passages
- One-room-per-turn movement toward seek/moveTo targets
- Integration with existing NPC movement patterns (goal overrides normal movement)

### Layer 4: Goal Lifecycle Management
- Interruption condition evaluation
- Goal suspension and resumption
- Preemption by higher-priority goals
- Pursuit mode handling (sequential, opportunistic, prepared)

### Layer 5: Builder API (in `@sharpee/character`)
- `.goal()` fluent builder extending CharacterBuilder
- Step definition API
- Activation/interruption condition API
- Pursuit mode selection

## Resolved Questions

1. **How should NPC pathfinding work across locked doors and one-way passages?**
   **Decision**: Author-defined movement profiles. Each NPC has authored map knowledge (which rooms they know about) and access (which locked passages they can traverse). An NPC can only pathfind through rooms they know and can only use passages they have access to.

   ```typescript
   npc.character('maid')
     .movement({
       knows: 'all',                    // knows every room and passage
       access: 'all',                   // has keys to everything
     })

   npc.character('colonel')
     .movement({
       knows: ['public-rooms', 'guest-wing', 'garden'],
       access: ['guest-wing'],          // only has his own room key
     })

   npc.character('gardener')
     .movement({
       knows: ['garden', 'shed', 'kitchen-entrance'],
       access: ['shed'],
     })
   ```

   NPC traversal is narrative, not mechanical. An NPC with access to a locked passage simply goes through it — no key items, no unlock actions. If the player is present, they see a witnessed message:

   > The maid looks around, then quickly opens the door to the study and closes it behind her.

   If the player then tries: `OPEN STUDY DOOR` → "It's locked." The NPC's access is invisible capability, not a simulated key. The author can override the witnessed message per passage for character-specific flavor.

   This creates gameplay — the player can observe where NPCs go and deduce who has access where. The killer can only reach the library through the main hall because they don't have access to the servants' corridor.

2. **Should NPCs be able to observe each other's goal-directed behavior?**
   **Decision**: Yes — this is just ADR-141's observation system operating normally. If the maid is in the kitchen when the Colonel takes a knife, she observes the taking event. Whether she reacts is driven by her character model (threat assessment, mood shift). Whether she tells someone is driven by ADR-144's propagation system (her tendency, schedule, audience). No new mechanism needed — the existing systems compose.

3. **How should goal pursuit interact with combat (ADR-070)?**
   **Decision**: The goal's `act` step initiates combat; combat (ADR-070) takes over from there. The goal system does not coordinate mid-combat. If the NPC wins combat, the goal completes. If the NPC loses, the goal is interrupted (standard interruption rules apply). The goal system's only role is getting the NPC to the point where combat begins.

4. **Should there be a maximum number of active goals per NPC?**
   **Decision**: No cap. Author discipline suffices. Priority sorting determines which goal executes each turn. If an author gives an NPC many goals, that's an authored design choice. The system handles it through priority — only the highest-priority active goal advances each turn, lower-priority goals wait.

## Open Questions

All original open questions have been resolved.

## References

- ADR-070: NPC System Architecture
- ADR-071: Daemons and Fuses (Timed Events)
- ADR-090: Entity-Centric Action Dispatch
- ADR-141: Character Model (upstream — goals stored here)
- ADR-142: Conversation System (upstream — conversation triggers state changes)
- ADR-144: Information Propagation (upstream — propagation triggers goal activation)
- Deadline (Infocom, 1982): NPCs with scheduled behavior sequences, time-based investigation
- Suspect (Infocom, 1984): Multiple NPCs with independent movement patterns and goals
- Versu (Richard Evans, Emily Short): Goal-directed NPC behavior driven by social practice theory

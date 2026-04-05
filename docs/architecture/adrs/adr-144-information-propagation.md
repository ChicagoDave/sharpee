# ADR-144: Information Propagation

## Status: DRAFT

## Date: 2026-04-05

## Context

### The Problem

ADR-141 defines a character model where NPCs carry knowledge (facts with source, confidence, and turn-learned). ADR-142 defines how the player exchanges information with NPCs through conversation, including the confrontation mechanic where presenting evidence changes NPC state. But neither system addresses what happens between NPCs — how information moves through the NPC network when the player isn't involved.

The motivating example: in a mystery game, the player asks the maid about the murder. The maid is chatty. Next time the maid is alone with the colonel, she mentions that someone's been asking questions. The colonel — who is the killer — now knows he's suspected. This triggers goal pursuit (ADR-145) and eventually a game loss condition. The player's investigation has a cost: every question asked is information released into the NPC network.

### What Exists Today

- **ADR-141 (Character Model)**: NPCs have `knowledge` (typed `Map<string, Fact>` with source, confidence, turn-learned), personality traits, and dispositions toward other entities.
- **ADR-141 observation system**: NPCs observe events and update their state. But observation is about witnessing actions in the same room, not receiving second-hand information.
- **ADR-142 (Conversation)**: Defines offscreen NPC-to-NPC conversation (state mutations when player absent) and eavesdropping (player concealed, dialogue performed). But these are authored sequences for specific dramatic moments, not a general information flow system.
- **ADR-142 confrontation mechanic**: Tracks what evidence the player has presented to each NPC, and what response action the NPC took (told, lied, omitted). This is PC→NPC only.

### Design Principles

**The author defines who talks.** Propagation behavior is authored per NPC as part of character building. The system does not infer chattiness from personality traits or calculate propagation scores. The author says "this NPC spreads information" and controls how, when, where, and to whom.

**Character state is the schedule.** There are no implicit delays or turn counters. If the author wants an NPC to sit on information before sharing, they define the character state condition that triggers sharing. The character model's state transitions (ADR-141) are the scheduling mechanism.

**Information has provenance.** Every fact carries its source chain. The system always tracks who told whom. The author decides whether the player can discover the chain.

## Decision

### 1. Propagation Profile

Each NPC's propagation behavior is defined as part of their character build. The profile controls tendency, audience, exclusions, and scheduling:

```typescript
npc.character('maid')
  .personality('gossipy', 'nervous')
  .propagation({
    tendency: 'chatty',
    to: 'trusted',
    excludes: ['colonel'],
  })

npc.character('butler')
  .personality('discreet', 'loyal')
  .propagation({
    tendency: 'mute',
  })

npc.character('cook')
  .personality('honest', 'anxious')
  .propagation({
    tendency: 'selective',
    spreads: ['murder', 'weapon'],
    to: 'anyone',
  })
```

**Tendency vocabulary:**

| Tendency | Behavior |
|---|---|
| `'chatty'` | Spreads everything unless explicitly withheld |
| `'selective'` | Spreads nothing unless explicitly listed |
| `'mute'` | Never spreads anything |

**Audience vocabulary:**

| Audience | Behavior |
|---|---|
| `'trusted'` | Only shares with NPCs the speaker has positive disposition toward |
| `'anyone'` | Shares with any NPC present |
| `'allied'` | Shares with NPCs who share a loyalty (e.g., both loyal to lady-grey) |

### 2. Content Control

The author controls which facts an NPC will share through whitelists and blacklists, depending on tendency:

```typescript
// Chatty NPC: everything except what's withheld
npc.character('maid')
  .propagation({
    tendency: 'chatty',
    withholds: ['own-alibi', 'lady-grey-secret'],
  })

// Selective NPC: nothing except what's listed
npc.character('cook')
  .propagation({
    tendency: 'selective',
    spreads: ['murder', 'weapon'],
  })
```

Per-fact overrides allow exceptions to the NPC's general tendency:

```typescript
npc.character('cook')
  .propagation({
    tendency: 'selective',
    spreads: ['murder'],
    overrides: {
      'murder': { to: 'anyone' },     // murder she tells everyone, not just trusted
    }
  })
```

### 3. Propagation Coloring

When an NPC shares information, the telling has a tone — the fact itself doesn't mutate, but the language layer selects a variant based on the speaker's coloring:

```typescript
npc.character('maid')
  .propagation({
    tendency: 'chatty',
    colors: 'dramatic',       // exaggerates, emphasizes danger
  })

npc.character('gardener')
  .propagation({
    tendency: 'selective',
    colors: 'vague',          // strips details, keeps the gist
  })
```

**Coloring vocabulary:**

| Coloring | Language effect |
|---|---|
| `'neutral'` | States the fact plainly (default) |
| `'dramatic'` | Exaggerates, emphasizes danger or scandal |
| `'vague'` | Strips details, general impression only |
| `'fearful'` | Frames everything as threatening |
| `'conspiratorial'` | Whispered, secretive tone |

Coloring is a hint to the language layer for variant selection — same pattern as mood-colored conversation responses in ADR-142. The receiving NPC gets the fact with source `'told by maid'`. The author can use the source in conversation constraints to reflect how the information was received.

### 4. Propagation Pacing

The author controls how quickly an NPC shares when conditions are met:

```typescript
npc.character('maid')
  .propagation({
    tendency: 'chatty',
    pace: 'eager',
  })

npc.character('cook')
  .propagation({
    tendency: 'selective',
    pace: 'gradual',
  })
```

**Pace vocabulary:**

| Pace | Behavior |
|---|---|
| `'eager'` | Shares all eligible facts in one encounter |
| `'gradual'` | One fact per turn when in the same room |
| `'reluctant'` | Requires multiple turns together before sharing |

### 5. Propagation Scheduling

The optional `schedule` adds authored conditions on when and where propagation happens. Without a schedule, the NPC follows their tendency and pace whenever they're in a room with an eligible listener.

```typescript
npc.character('maid')
  .propagation({
    tendency: 'chatty',
    pace: 'eager',
    schedule: {
      when: ['in dining-room'],             // only gossips at meals
    }
  })

npc.character('butler')
  .propagation({
    tendency: 'selective',
    pace: 'gradual',
    schedule: {
      when: ['player absent'],              // never in front of the PC
    }
  })

npc.character('gardener')
  .propagation({
    tendency: 'selective',
    pace: 'reluctant',
    schedule: {
      when: ['in region outdoors'],         // only outside
    }
  })
```

**Character state as schedule.** When the author wants an NPC to delay sharing, they don't use a timer — they define the character state transition that enables sharing:

```typescript
npc.character('cook')
  .personality('honest', 'anxious')
  .mood('calm')

  // State transitions define the "delay"
  .on('learns murder')
    .becomes('nervous')

  .on('nervous', 'after seeing colonel')
    .becomes('anxious')

  // Propagation triggers on character state
  .propagation({
    tendency: 'chatty',
    pace: 'eager',
    schedule: {
      when: ['anxious'],                    // shares when anxiety overcomes her
    }
  })
```

The cook learns about the murder and becomes nervous. Later, seeing the colonel pushes her to anxious. Only then does she start talking. Every transition is an authored condition the author can see and reason about.

### 6. Player-Directed Propagation

The author decides whether an NPC can be used as a messenger by the player:

```typescript
npc.character('maid')
  .propagation({
    tendency: 'chatty',
    playerCanLeverage: true,      // TELL MAID ABOUT X enters propagation system
  })

npc.character('butler')
  .propagation({
    tendency: 'mute',
    playerCanLeverage: false,     // TELL BUTLER ABOUT X stays with him
  })
```

When `playerCanLeverage` is true, facts the player TELLs to this NPC are eligible for propagation under the NPC's normal rules. This makes "tell the gossip" a deliberate player strategy the author has opted into.

When false, facts from the player stay in the NPC's knowledge but never propagate. The NPC is a dead end for information flow.

### 7. Provenance Tracking

The system always records the source chain on every propagated fact:

```
player tells maid → maid.knowledge['murder'] = { source: 'told by player' }
maid tells cook   → cook.knowledge['murder'] = { source: 'told by maid' }
cook tells colonel → colonel.knowledge['murder'] = { source: 'told by cook' }
```

The author uses source in conversation constraints when they want the player to discover the chain:

```typescript
npc.character('colonel')
  .when('asked about murder')
    .if('knows murder', 'source is told by cook')
    .tell('murder-heard-from-cook')

    .if('knows murder', 'source is told by maid')
    .tell('murder-heard-from-maid')
```

If the author doesn't reference source, the chain is invisible to the player but still drives internal NPC behavior. The system never discards provenance.

### 8. Visibility Modes

Propagation events have three visibility modes depending on the player's presence:

| Player state | Visibility | What happens |
|---|---|---|
| Absent | Offscreen | State mutation only. Player notices effects when they return. |
| Present | Witnessed | Performed text: "The maid pulls the cook aside and whispers urgently." Message ID from NPC's propagation profile or platform default. |
| Concealed | Eavesdropped | Full dialogue performed. Player learns the fact with source `'overheard'`. Connects to ADR-142's eavesdropping mechanic. |

Witnessed messages use the NPC's coloring for variant selection. The author can override the witnessed message per fact:

```typescript
npc.character('maid')
  .propagation({
    tendency: 'chatty',
    colors: 'dramatic',
    overrides: {
      'murder': {
        witnessed: 'maid-whispers-about-murder',    // specific message when player sees it
      }
    }
  })
```

Platform provides default witnessed messages per coloring (e.g., dramatic: "The maid leans in urgently toward {target}..."). Author overrides for character-specific moments.

### 9. Propagation Evaluation

During the NPC turn phase, after behavior evaluation and goal pursuit (ADR-145), the system evaluates propagation for each NPC:

1. Is this NPC's tendency `'mute'`? If yes, skip.
2. Are schedule conditions met (if any)? If not, skip.
3. Are there eligible listeners in the same room? (Audience check + exclusions)
4. Which facts are eligible to share? (Tendency + whitelist/blacklist + already-told check)
5. Apply pace: eager shares all, gradual shares one, reluctant checks turn count.
6. For each shared fact:
   - Add fact to listener's knowledge with source `'told by {speaker}'`
   - Record the propagation event
   - Emit witnessed/eavesdropped message if player is present/concealed
   - Listener's character model processes the new fact through ADR-141's observation system

**Already-told check:** The system tracks which facts an NPC has shared with each listener. An NPC does not repeat themselves to the same listener unless their coloring or state has changed (author-overridable).

## Consequences

### Positive

- Information flow through the NPC network creates strategic consequences for the player's investigation
- Author has full control over who talks, what they share, when they share it, and with whom
- Character state drives scheduling — no opaque timers or derived scores
- Provenance tracking enables the player to reconstruct information chains
- Three visibility modes (offscreen, witnessed, eavesdropped) reuse ADR-142 patterns
- Player-directed propagation enables deliberate "tell the gossip" strategy
- Coloring gives the language layer variant selection without mutating facts

### Negative

- Per-NPC propagation evaluation each turn adds processing to the NPC phase
- Already-told tracking grows over time (N NPCs x M facts x N listeners)
- Authors must think about propagation consequences when designing NPC networks — information spreads can create unintended game states if not carefully authored
- Coloring vocabulary may need story-specific extensions

### Neutral

- Propagation is opt-in — NPCs without a propagation profile don't participate
- The system tracks provenance regardless of whether the author uses it
- Propagation profiles are data, not code — serializable for save/restore

## Implementation Layers

### Layer 1: Propagation Profile
- Profile definition in CharacterBuilder (tendency, audience, exclusions, pace, schedule, coloring)
- Per-fact overrides
- Player leverage flag
- Storage in CharacterModelTrait

### Layer 2: Propagation Evaluation Engine
- Per-NPC evaluation during NPC turn phase
- Schedule condition checking against character state predicates
- Audience and exclusion filtering
- Pace enforcement (eager, gradual, reluctant)
- Already-told tracking

### Layer 3: Fact Transfer and Provenance
- Fact creation on listener with source chain
- Propagation event recording
- Listener observation system integration (ADR-141)
- Duplicate and repeat detection

### Layer 4: Visibility and Language
- Witnessed message emission (player present)
- Eavesdropping integration (player concealed, ADR-142)
- Coloring variant selection in language layer
- Platform default messages per coloring
- Author override messages per fact

### Layer 5: Builder API (in `@sharpee/character`)
- `.propagation()` fluent builder extending CharacterBuilder
- Schedule condition API (reuses predicate system)
- Per-fact override API
- Coloring vocabulary registration

## Resolved Questions

1. **Should propagation create new topics in ADR-142's conversation system?**
   **Decision**: No. The author explicitly defines which propagated facts create conversation topics. When the cook learns about the murder from the maid, the cook doesn't automatically become available for "ASK COOK ABOUT MURDER" — the author must define that topic on the cook with an availability condition like `'knows murder'`. This keeps the author in full control of conversation surface area.

2. **How should propagation interact with NPC beliefs vs. knowledge?**
   **Decision**: The author defines per-NPC whether received information lands as knowledge or belief. This is personality-driven — a credulous NPC accepts what they're told as fact, a skeptical NPC holds it as a belief they may resist:

   ```typescript
   npc.character('cook')
     .propagation({
       tendency: 'chatty',
       receives: 'as fact',         // trusting — accepts what she's told
     })

   npc.character('colonel')
     .propagation({
       tendency: 'mute',
       receives: 'as belief',       // skeptical — holds received info as belief
     })
   ```

   The `receives` field defaults to `'as fact'` if unspecified. Per-fact overrides are available for cases where the NPC trusts some sources more than others.

3. **Should NPCs be able to propagate lies?**
   **Decision**: Yes, author-driven. The author defines per-NPC whether they propagate the truth they know or the lie they told. An NPC who lied to the player might spread the same lie to maintain their cover, or they might share the truth with a trusted ally:

   ```typescript
   npc.character('maid')
     .propagation({
       tendency: 'chatty',
       overrides: {
         'murder': {
           spreadsVersion: 'lie',        // maintains her cover story
           to: 'anyone',
         }
       }
     })

   npc.character('maid')
     .propagation({
       tendency: 'chatty',
       overrides: {
         'murder': {
           spreadsVersion: 'truth',      // confides the real story
           to: 'trusted',               // but only to allies
         }
       }
     })
   ```

   When `spreadsVersion` is `'lie'`, the system propagates the lie version (recorded by ADR-142's response tracking). When `'truth'` (default), the system propagates the actual fact. The receiving NPC's provenance records which version they received.

## Open Questions

All original open questions have been resolved.

## References

- ADR-070: NPC System Architecture
- ADR-071: Daemons and Fuses (Timed Events)
- ADR-141: Character Model (upstream — knowledge, personality, disposition)
- ADR-142: Conversation System (upstream — PC↔NPC information exchange, eavesdropping, offscreen conversations)
- ADR-145: NPC Goal Pursuit (downstream — propagated information triggers goal activation)
- Deadline (Infocom, 1982): NPC schedules and time-sensitive investigation
- Suspect (Infocom, 1984): Multiple NPCs with independent behavior and information
- Versu (Richard Evans, Emily Short): Social practice theory — NPCs with social goals and information sharing
- Cluedo/Clue: Information asymmetry as core gameplay — asking questions has strategic cost

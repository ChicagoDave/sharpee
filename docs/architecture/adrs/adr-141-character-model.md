# ADR-141: Character Model

## Status: DRAFT

## Date: 2026-04-03

## Context

### The Problem

NPCs in interactive fiction are typically modeled as dialogue databases — collections of responses keyed by topic. This produces flat, mechanical interactions because it treats the NPC as a lookup table rather than a person.

Compelling NPC behavior — in conversation, movement, combat, and every other interaction — emerges from **character state**. What an NPC does depends on what they know, what they care about, how they feel about the player, whether they're under threat, and what kind of person they are. Behavior is a projection of internal state, not a database to query.

Sharpee needs a character model that:

1. Gives NPCs rich internal state (knowledge, beliefs, dispositions, mood, goals, personality, cognitive profile)
2. Tracks NPC observations of world events to populate state automatically
3. Makes unreliable witnesses, mood-driven behavior, and memory fall out naturally from the model rather than requiring bespoke implementation per NPC
4. Drives **all** NPC behavior — conversation, movement, combat, and any other system — from a single source of truth

### What Exists Today

- **NpcTrait** (`world-model`): Has `knowledge`, `conversationState`, `goals`, `customProperties` fields. Minimal structure.
- **onObserve hook** (`stdlib`): NPC behaviors can react to witnessed actions. Currently unused by any story.
- **ADR-070**: NPC system with behavior hooks including `onSpokenTo`, `onObserve`, `onTurn`, `onPlayerEnters`.

### Prior Art

A comprehensive survey of IF conversation systems (see `docs/work/forge/conversation-systems-survey.md`) identifies a knowledge representation hierarchy across systems:

| Level | Description | Systems |
|---|---|---|
| 0. None | No memory between exchanges | Basic ASK/TELL |
| 1. Flags | Binary "has been discussed" tracking | TADS 3 revelation, Ink variables |
| 2. Recollection | Ordered history of what was said | Threaded Conversation |
| 3. Facts | Structured knowledge that can be queried | Best of Three, Character Engine |
| 4. Beliefs | Character-specific knowledge that may be incorrect | Versu, Storytron |
| 5. Theory of Mind | Characters model what others know and believe | Versu (partial), Storytron (partial) |

This ADR targets Level 4 (per-character beliefs) with the foundation for Level 5.

Galatea (Emily Short) demonstrated that two mood axes produce genuinely different NPC behavior across playthroughs. Versu (Evans & Short) proved that autonomous agents with beliefs, evaluations, and goals produce emergent social dynamics. Neither survives as reusable technology.

### Design Principles

**The character model is not a conversation system.** It models who the NPC is. Conversation, movement, combat, and any other behavior system consumes it. ADR-142 defines how conversation specifically uses the character model.

**Authors think in words, not numbers.** The authoring surface uses natural-language vocabulary — personality traits, mood words, disposition terms. Numeric state exists internally but is never exposed to the author.

**The same model drives all NPC behavior.** A scared NPC doesn't just talk differently — they act differently. They flee, they hide, they betray. The character model feeds every behavior hook in ADR-070.

## Decision

### 1. Character State Model

Every NPC with behavioral depth gets a `CharacterModelTrait` containing structured internal state.

**Personality** (fixed at creation, defines who the character is):

Traits are string literals drawn from a typed vocabulary. Intensity modifiers adjust the internal value.

```typescript
type PersonalityTrait =
  | 'honest' | 'loyal' | 'cowardly' | 'paranoid'
  | 'cruel' | 'cunning' | 'curious' | 'stubborn'
  | 'generous' | 'vain' | 'devout' | 'impulsive';

type Intensity = 'slightly' | 'somewhat' | 'very' | 'extremely';
type PersonalityExpr = PersonalityTrait | `${Intensity} ${PersonalityTrait}`;
```

Intensity maps to internal values:

| Word | Value |
|---|---|
| slightly | 0.2 |
| somewhat | 0.4 |
| *(bare trait)* | 0.6 |
| very | 0.8 |
| extremely | 0.95 |

**Disposition** (how the NPC feels about each entity, changes over time):

Disposition is *how the NPC feels about a specific entity* — persistent and directed. It is distinct from mood (transient, undirected) and threat (situational).

```typescript
type DispositionWord =
  | 'despises' | 'hates' | 'dislikes' | 'wary of'
  | 'neutral' | 'likes' | 'trusts' | 'devoted to';
```

| Word | Internal Range |
|---|---|
| despises | -90 to -100 |
| hates | -70 to -90 |
| dislikes | -50 to -70 |
| wary of | -20 to -40 |
| neutral | -10 to +10 |
| likes | +30 to +50 |
| trusts | +50 to +70 |
| devoted to | +80 to +100 |

**Mood** (current emotional state, transient and undirected):

Mood is *how the NPC feels right now* — not about anyone in particular. It changes frequently based on events and decays toward a baseline.

```typescript
type Mood =
  | 'calm' | 'content' | 'cheerful'
  | 'nervous' | 'anxious' | 'panicked'
  | 'angry' | 'furious'
  | 'sad' | 'grieving'
  | 'suspicious' | 'confused' | 'resigned';
```

Mood maps internally to a two-dimensional model (valence × arousal) but the author never interacts with the axes directly.

**Threat** (how endangered the NPC feels, situational):

Threat is distinct from mood and disposition. An NPC can be `mood: 'calm'` but `threat: 'threatened'` (stoic under pressure) or `mood: 'panicked'` but `threat: 'safe'` (anxious personality, no actual danger).

```typescript
type ThreatLevel =
  | 'safe' | 'uneasy' | 'wary' | 'threatened' | 'cornered' | 'desperate';
```

**Cognitive Profile** (how the NPC's mind works — usually stable but can shift under specific conditions):

Real cognitive conditions affect specific dimensions of perception, belief, coherence, and identity in distinct patterns. The cognitive profile models these dimensions separately:

```typescript
type PerceptionMode =
  | 'accurate'       // perceives events as they happen
  | 'filtered'       // misses certain categories of events
  | 'augmented';     // perceives events that didn't happen (hallucinations)

type BeliefFormation =
  | 'flexible'       // updates beliefs when presented with evidence
  | 'rigid'          // slow to update, requires strong evidence
  | 'resistant';     // reinterprets counter-evidence to fit existing beliefs (delusions)

type Coherence =
  | 'focused'        // stays on topic, responds to what was asked
  | 'drifting'       // occasionally wanders to adjacent topics
  | 'fragmented';    // jumps between unrelated topics, mixes timeframes

type Lucidity =
  | 'stable'         // cognitive profile is constant
  | 'fluctuating'    // shifts gradually based on conditions
  | 'episodic';      // discrete windows of clarity and confusion

type SelfModel =
  | 'intact'         // consistent sense of identity
  | 'uncertain'      // questions own memories and perceptions
  | 'fractured';     // may not recognize self or maintain continuity

type CognitiveProfile = {
  perception: PerceptionMode;
  beliefFormation: BeliefFormation;
  coherence: Coherence;
  lucidity: Lucidity;
  selfModel: SelfModel;
};
```

Different conditions produce distinct profiles:

| Condition | Perception | Belief | Coherence | Lucidity | Self-Model |
|---|---|---|---|---|---|
| Stable (default) | accurate | flexible | focused | stable | intact |
| PTSD | filtered | rigid | drifting | episodic | uncertain |
| Schizophrenia | augmented | resistant | fragmented | episodic | uncertain |
| Dementia | filtered | rigid | fragmented | fluctuating | fractured |
| Dissociative | accurate | flexible | focused | episodic | fractured |
| Traumatic brain injury | filtered | flexible | drifting | fluctuating | uncertain |
| Obsessive | accurate | resistant | focused | stable | intact |
| Intoxicated | filtered | flexible | drifting | fluctuating | intact |

These are starting-point profiles, not rigid classifications. The author overrides any dimension. A character with schizophrenia who has learned coping strategies might have `coherence: 'drifting'` rather than `'fragmented'`. The profiles are tools, not diagnoses. They ship as documented examples in a tutorial (see Open Questions), not as platform-level constants.

**Lucidity Windows:**

When `lucidity` is `'fluctuating'` or `'episodic'`, the NPC shifts between cognitive states over time. The author defines triggers and decay:

```typescript
npc.character('eleanor')
  .cognitiveProfile('schizophrenic')

  .lucidity({
    baseline: 'fragmented',
    triggers: {
      'player is calm': { target: 'lucid', transition: 'next turn' },
      'loud noise': { target: 'dissociative', transition: 'immediate' },
      'alone too long': { target: 'hallucinating', transition: 'next turn' },
      'feels safe': { target: 'lucid', transition: 'next turn' },
    },
    decay: 'gradual',
    decayRate: 'slow'
  })
```

During a lucid window, the cognitive profile temporarily shifts — perception becomes `'accurate'`, coherence becomes `'focused'`, belief formation becomes `'flexible'`. As lucidity decays, the profile returns to baseline.

The author specifies whether each trigger's shift is `'immediate'` or `'next turn'`. Default is `'next turn'` — immediate transitions are opt-in for dramatic moments (e.g., a loud noise instantly shatters a lucid window).

**Perceived Events (Hallucinations):**

When `perception` is `'augmented'`, the character model can inject perceived events that didn't occur. These are author-defined:

```typescript
npc.character('eleanor')
  .perceives('shadow-figure-in-library', {
    when: 'hallucinating',
    as: 'witnessed',
    content: 'shadow-figure'
  })
```

The NPC reports these perceived events with the same conviction as real ones. The system tracks their origin internally (`source: 'hallucinated'`) so downstream systems can distinguish them, but the NPC cannot.

**Resistant Beliefs:**

When `beliefFormation` is `'resistant'`, presenting counter-evidence triggers reinterpretation rather than belief update:

```typescript
npc.character('eleanor')
  .belief('shadow-figure-is-real', {
    strength: 'certain',
    resistance: 'reinterprets'
  })
```

**Filtered Perception:**

When `perception` is `'filtered'`, certain event categories are missed entirely:

```typescript
npc.character('james')
  .cognitiveProfile({ perception: 'filtered', /* ... */ })
  .filters({
    misses: ['quiet actions', 'events behind him'],
    amplifies: ['sudden movements', 'loud sounds']
  })
```

**Knowledge** (what the NPC knows):

```typescript
interface Fact {
  source: 'witnessed' | 'told' | 'inferred' | 'assumed' | 'hallucinated';
  confidence: ConfidenceWord;
  turnLearned: number;
}

type ConfidenceWord = 'uncertain' | 'suspects' | 'believes' | 'certain';
```

The `'hallucinated'` source is set by the platform when a cognitive profile with `perception: 'augmented'` injects perceived events. The NPC cannot distinguish hallucinated facts from witnessed ones — both carry the confidence the NPC assigns. Only the system (and downstream consumers) can tell them apart.

**Beliefs** (what the NPC thinks is true — may differ from facts):

Beliefs are stored separately from knowledge. An NPC can *know* something (observed it) but *believe* something different (denial, loyalty, delusion). When beliefs and knowledge conflict, consuming systems (conversation, behavior) determine which the NPC acts on.

**Goals** (what the NPC wants, prioritized):

Goals are author-defined strings with priority. They influence behavior selection — an NPC whose top goal is "protect lady grey" will choose actions that serve that goal.

### 2. Observation System

The platform automatically captures events witnessed by NPCs and feeds them into the character model.

When an action occurs in a room where an NPC is present:
1. The engine emits the action's semantic events (already happens today)
2. The NPC's `onObserve` hook fires (already exists in ADR-070)
3. The **cognitive profile filters the event** before it reaches the character model:
   - `perception: 'accurate'` — event stored as-is
   - `perception: 'filtered'` — event checked against the NPC's filter rules; may be missed entirely or amplified (stored with heightened threat)
   - `perception: 'augmented'` — event stored as-is, but author-defined hallucinated events may also be injected on the same turn
4. The character model's observation handler updates state:
   - New facts added to knowledge (with `source: 'witnessed'`)
   - Disposition adjusted based on event type and participants
   - Mood and threat recalculated based on event severity
   - Goals reprioritized if relevant
   - **Lucidity** recalculated if the event matches a lucidity trigger

The author configures **what matters** to the NPC — which event types shift which state dimensions, and by how much. The platform provides sensible defaults (witnessing violence increases threat; receiving gifts improves disposition).

**Lucidity decay** is processed at the end of each turn. If the NPC is in a lucid window and no sustaining trigger is active, lucidity decreases by the decay rate. When lucidity drops below threshold, the cognitive profile returns to baseline.

**Observable behavior events:** The platform emits events when cognitive state changes (lucidity shifts, hallucination onset, mood swings). These are available to any consuming system — conversation, room descriptions, NPC behavior. The author controls whether and how these are surfaced to the player. The default is silent; the author opts in per NPC.

### 3. Character State Predicates

Named predicates resolve against character state. These are consumed by ADR-142 (Conversation System) and any other system that needs to query character state.

```typescript
// Built-in predicates (platform-provided)

// Disposition (directed — about a specific entity)
'trusts player'        // disposition('player') > 50
'loyal to {entity}'    // disposition(entity) > 70 AND personality.loyal > 0.4
'dislikes player'      // disposition('player') < -30

// Threat (situational)
'threatened'           // threat > 60
'cornered'             // threat > 85

// Personality (fixed)
'cowardly'             // personality.cowardly > 0.4
'honest'               // personality.honest > 0.4

// Mood (transient, undirected)
'calm'                 // mood maps to 'calm'
'panicked'             // mood maps to 'panicked'

// Knowledge
'knows {topic}'        // knowledge.has(topic)

// Cognitive state
'lucid'                // current lucidity is in a clear window
'hallucinating'        // perception is currently 'augmented' AND not in lucid window
'fragmented'           // coherence is currently 'fragmented'
'dissociative'         // selfModel is currently 'fractured'
'belief resistant'     // beliefFormation is 'resistant' (delusions active)
'perceives {topic}'    // has a hallucinated fact matching topic
```

Story-specific predicates:

```typescript
npc.definePredicate('drunk', state => state.has('consumed-wine'));
npc.definePredicate('alone with player', state => state.noOtherNpcsPresent());
```

### 4. Authoring Builder

A fluent builder sits on top of the code-heavy API. The author describes characters in words:

```typescript
npc.character('margaret')
  .personality('very honest', 'very loyal', 'cowardly')
  .knows('murder', { witnessed: true })
  .loyalTo('lady-grey')
  .likes('player')
  .mood('nervous')

  .on('player threatens')
    .becomes('panicked')
    .feelsAbout('player', 'wary of')

  .on('player is kind')
    .feelsAbout('player', 'trusts')

  .on('lady-grey arrested')
    .becomes('grieving')
    .shift('threat', 'cornered')
```

**A character with a cognitive profile:**

```typescript
npc.character('eleanor')
  .personality('very curious', 'honest', 'slightly paranoid')
  .cognitiveProfile('schizophrenic')
  .likes('player')
  .mood('anxious')
  .knows('murder', { witnessed: true })

  .lucidity({
    baseline: 'fragmented',
    triggers: {
      'player is calm': { target: 'lucid', transition: 'next turn' },
      'loud noise': { target: 'dissociative', transition: 'immediate' },
      'alone too long': { target: 'hallucinating', transition: 'next turn' },
      'feels safe': { target: 'lucid', transition: 'next turn' },
    },
    decay: 'gradual',
    decayRate: 'slow'
  })

  .perceives('shadow-figure-in-library', {
    when: 'hallucinating',
    as: 'witnessed',
    content: 'shadow-figure'
  })

  .on('loud noise')
    .becomes('panicked')

  .on('player gives medication')
    .becomesLucid()
    .becomes('calm')
```

**A character with PTSD:**

```typescript
npc.character('james')
  .personality('honest', 'very stubborn', 'slightly cowardly')
  .cognitiveProfile({
    perception: 'filtered',
    beliefFormation: 'rigid',
    coherence: 'drifting',
    lucidity: 'episodic',
    selfModel: 'uncertain'
  })
  .mood('wary')

  .filters({
    misses: ['quiet actions', 'events behind him'],
    amplifies: ['sudden movements', 'loud sounds']
  })

  .lucidity({
    baseline: 'drifting',
    triggers: {
      'violence nearby': { target: 'flashback', transition: 'immediate' },
      'calm environment': { target: 'lucid', transition: 'next turn' },
      'direct question': { target: 'focused', transition: 'next turn' },
    },
    decay: 'gradual',
    decayRate: 'fast'
  })
```

The builder compiles this into trait data, event handlers, and state mutation rules. The author never touches the underlying API unless they need story-specific extensions.

**Story-specific vocabulary:**

```typescript
npc.defineMood('lovesick', { valence: 0.3, arousal: 0.6 });
npc.definePersonality('righteous');
```

### 5. Unreliable Witnesses

Unreliable narration is not a feature — it is a natural consequence of the character model. An NPC is unreliable when:

- Their **beliefs** differ from **facts** (delusional, misinformed)
- Their **personality** causes distortion (loyal → omits patron's crimes, cowardly → minimizes own involvement)
- Their **goals** motivate deception (protect someone, avoid blame)
- Their **cognitive profile** corrupts perception or recall:
  - `perception: 'augmented'` → reports hallucinated events as real
  - `perception: 'filtered'` → missed events entirely, fills gaps from assumption
  - `coherence: 'fragmented'` → mixes details from different events or timeframes
  - `beliefFormation: 'resistant'` → rejects evidence that contradicts their version
  - `selfModel: 'fractured'` → may not remember being present, or confuses self with someone else
- Their **mood** colors interpretation (angry → hostile framing, grieving → focus on loss)

**Types of unreliability** map to distinct character configurations:

| Unreliability Type | Primary Driver | Example |
|---|---|---|
| The Liar | Goals + personality | Protecting someone; `'cunning'` personality serves deceptive goals |
| The Loyalist | Disposition + personality | High loyalty → omits or softens patron's actions |
| The Coward | Threat + personality | High threat → minimizes own involvement, agrees with questioner |
| The Delusional | Cognitive profile | `beliefFormation: 'resistant'` + `perception: 'augmented'` → reports hallucinations as fact |
| The Traumatized | Cognitive profile | `coherence: 'drifting'` + `lucidity: 'episodic'` → accurate in windows, confused outside |
| The Confused | Cognitive profile | `perception: 'filtered'` + `coherence: 'fragmented'` → missed key details, fills gaps |
| The Drunk | Mood + cognitive | Intoxicated profile → filtered perception, drifting coherence |
| The Self-Deceived | Beliefs vs. knowledge | Knows the truth but believes otherwise; genuinely believes their distorted version |

The character model provides the foundation. How unreliability manifests in *conversation* specifically is defined in ADR-142.

### 6. Relationship to NPC Behavior (ADR-070)

The character model feeds the existing NPC behavior system. An NPC's `onTurn`, `onPlayerEnters`, and `onSpokenTo` hooks all read from the same character state. This means:

- A threatened NPC might flee on their turn AND refuse to answer questions
- An NPC whose disposition dropped below zero might attack AND become hostile in dialogue
- The author doesn't maintain separate "conversation state" and "behavior state" — it's one model

## Consequences

### Positive

- Authors describe characters, not state machines — the mental model matches how writers think about NPCs
- Unreliable witnesses, mood-driven behavior, and memory fall out naturally from the model
- The vocabulary-based authoring surface keeps implementation complexity away from story authors
- Same character model drives both conversation and all other NPC behavior — no state divergence
- Cognitive profile system addresses a gap no existing IF platform has filled
- Deterministic and testable — all state transitions are author-defined

### Negative

- Higher platform implementation cost than simpler NPC state tracking
- Authors must think about character state even for NPCs that just need basic behavior (mitigated: the trait is opt-in)
- The predicate vocabulary must be well-documented; authors need to know what strings are valid

### Neutral

- The character model is opt-in per NPC — not every NPC needs a `CharacterModelTrait`
- The builder API will evolve through iteration; this ADR defines the model, not the final syntax
- Story-specific predicates and vocabulary extensions keep the platform vocabulary focused

## Implementation Layers

### Layer 1: Character State Trait (`world-model`)
- `CharacterModelTrait` with typed state fields
- Vocabulary types (string literal unions for all word-based inputs)
- State mutation methods
- Predicate registry and evaluation

### Layer 2: Observation and State Update (`stdlib`)
- Event observation handler that populates character state from witnessed events
- Cognitive profile filtering (perception modes)
- Default state transition rules (violence → threat increase, etc.)
- Lucidity decay processing
- Observable behavior event emission

### Layer 3: Character Builder (new `@sharpee/character` package)
- Fluent builder API
- Vocabulary documentation and validation
- Compilation from builder to trait data + event handlers + state mutation rules
- Story-specific vocabulary extension points

## Open Questions

1. ~~**Should personality be truly fixed, or can it shift under extreme circumstances?**~~ **Resolved: personality is fixed; cognitive profile handles the rest.** A traumatic event doesn't change `'brave'` to `'cowardly'` — it changes the cognitive profile. The NPC is still brave by nature, but their perception, coherence, or lucidity has been affected. This matches how real personality works — core traits persist, but cognitive and emotional conditions alter how those traits manifest.

2. **How granular should observation be?** Should NPCs in adjacent rooms hear loud events? Should NPCs remember the order of events or just that they happened? Deferred until the Clue tutorial implementation provides concrete reference material for what observation granularity the system actually needs.

3. **Should the system support NPC-to-NPC information propagation?** (Gossip: NPC A tells NPC B what they saw.) This is a systemic feature — the best IF authors build stories around systems, and NPC-to-NPC awareness is a natural extension of the character model. Worth a separate design discussion and potentially its own ADR. The character model as defined here provides the foundation (per-character knowledge with source tracking, `source: 'told'`), but the propagation mechanics — when NPCs share information, how trust/disposition affects what they pass along, how distortion accumulates through retelling — are a distinct problem.

## References

- ADR-070: NPC System Architecture
- ADR-090: Entity-Centric Action Dispatch (Capability Dispatch)
- ADR-142: Conversation System (consumes this character model)
- `docs/work/forge/conversation-systems-survey.md`: Comprehensive survey of IF conversation systems
- Galatea (Emily Short): Two-axis mood tracking producing genuinely different NPC behavior
- Versu (Evans & Short): Autonomous agents with beliefs, evaluations, and social practices

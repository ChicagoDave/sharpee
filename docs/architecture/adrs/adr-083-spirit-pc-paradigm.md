# ADR-083: Spirit PC Paradigm - Non-Physical Player Character

**Status:** Proposed
**Date:** 2026-01-01
**Story:** Aspect of God

## Context

"Aspect of God" presents a fundamentally different IF paradigm where the player character is a spirit that cannot interact with the physical world. Instead, the PC operates on an emotional/spiritual layer, influencing NPCs through their memories and emotions.

From the Inform 7 source (`docs/aspectofgod/story.ni`):
- PC is "an Aspect of God" answering "The Call" from a troubled soul
- Movement is "apparating" to known locations, passing through physical barriers
- Entities have spiritual states: `known`, `unknown`, `obscured`
- Interaction is through `COMFORT`, `ANSWER`, `LISTEN` rather than physical verbs
- Entities emanate "vibes" of varying strength
- Strong spirits can block the PC's passage (Mack guards the property)

## Decision

Implement a **Spirit PC Mode** that provides:

### 1. Alternate Verb Layer

Standard verbs are blocked or reinterpreted:

| Physical Verb | Spirit Reinterpretation |
|---------------|------------------------|
| `TAKE` | Cannot interact with physical objects |
| `OPEN` | Pass through (spirit form) |
| `GO NORTH` | Apparate or drift (if path known) |
| `EXAMINE` | Sense/perceive the entity's spirit |
| `TALK TO` | Attempt spiritual connection |

New spirit-specific verbs:

| Verb | Purpose |
|------|---------|
| `COMFORT [entity]` | Build connection, learn about an entity |
| `EVOKE [memory]` | Bring a memory to the surface |
| `STIR [emotion]` | Amplify an emotion in an entity |
| `SOOTHE [feeling]` | Calm turbulent emotions |
| `ANSWER [call]` | Respond to a spiritual call |
| `APPARATE [location]` | Teleport to a known location |
| `LISTEN` | Sense emotional/spiritual state |
| `DREAM` | Access prophetic/memory visions |
| `CONSIDERING [X], [action]` | Influence while focusing on memory/emotion |

### 2. Entity Knowledge System

Entities have a `spiritualAvailability` trait with states:

```typescript
type SpiritualAvailability =
  | 'unknown'    // Spirit hasn't connected yet
  | 'obscured'   // Spirit is blocked/protected
  | 'known'      // Full spiritual connection
  | 'resonating' // Deep emotional connection
```

Knowledge gates actions:
- `unknown`: Can only EXAMINE (sense presence), COMFORT (attempt connection)
- `obscured`: Must find alternate approach (blocked by protection/turmoil)
- `known`: Full spiritual interaction available
- `resonating`: Can EVOKE memories, influence deeply

### 3. Spiritual Scope Rules

The spirit's scope is not physical proximity but **emotional connection**:

```typescript
interface SpiritualScope {
  // What the spirit can perceive
  canPerceive: (entity: IFEntity) => boolean;

  // What the spirit can influence
  canInfluence: (entity: IFEntity) => boolean;

  // Connection strength affects interaction options
  connectionStrength: (entity: IFEntity) => number;
}
```

Scope factors:
- Physical presence in same location (weak connection)
- Previous COMFORT interactions (stronger)
- Shared emotional resonance (strongest)
- Spiritual barriers (Mack's protection blocks entry)

### 4. Emotional/Memory Layer

Each NPC has an emotional state and memory bank:

```typescript
interface SpiritualEntity {
  // Current emotional state
  emotions: Map<EmotionType, number>; // 0-100 intensity

  // Memories the spirit can access
  memories: Memory[];

  // Current spiritual protection level
  protection: number;

  // The "vibe" they emanate
  emanatingVibe: 'weak' | 'normal' | 'strong' | 'very strong';
}

interface Memory {
  id: string;
  description: string;
  emotionalCharge: EmotionType;
  intensity: number;
  linkedEntities: string[]; // Other entities in this memory
  discovered: boolean;
}
```

### 5. "The Call" Mechanic

The story's main goal is represented as a spiritual objective:

```typescript
interface TheCall {
  source: string; // Entity ID (e.g., Jessica)
  nature: string; // Type of distress
  resolved: boolean;
  requirements: CallRequirement[];
}

interface CallRequirement {
  type: 'know_entity' | 'resolve_emotion' | 'evoke_memory' | 'connect_entities';
  target: string;
  satisfied: boolean;
}
```

### 6. NPC Schedule Integration

Leverages ADR-071 Daemons for NPC movement schedules:

```typescript
// From story.ni - Jessica's 34-move daily schedule
const jessicaSchedule: ScheduledMove[] = [
  { time: '7:30 AM', from: 'front-porch', to: 'foyer' },
  { time: '7:33 AM', from: 'foyer', to: 'lower-hallway' },
  // ... 32 more moves
];
```

The spirit can observe these patterns and learn to intercept NPCs at emotional moments.

### 7. "CONSIDERING X, DO Y" Pattern

The unique grammar pattern for influencing while focused:

```typescript
// Grammar pattern
grammar
  .define('considering :focus , :action...')
  .entity('focus')  // Memory or emotion being focused on
  .text('action')   // The action to perform
  .mapsTo('spirit.considering_action')
  .build();

// In action execution
if (intention.consideration) {
  // The spirit is focusing on a memory/emotion while acting
  // This modifies how the action affects the NPC
  applyConsiderationModifier(intention.consideration, baseEffect);
}
```

Example:
```
> CONSIDERING HIS MOTHER, COMFORT JONATHON
(You focus on the warmth of his mother's memory as you reach out
to Jonathon. The hard shell around his heart softens, and for a
moment you sense the boy he once was.)
```

## Implementation Phases

### Phase 1: Core Spirit Mechanics
- SpiritualAvailability trait
- Block physical verbs, add spirit verbs
- Basic COMFORT/EXAMINE/LISTEN actions
- Apparate movement system

### Phase 2: Emotional Layer
- Emotion state on NPCs
- Memory system
- EVOKE/STIR/SOOTHE actions
- Vibe/emanation sensing

### Phase 3: Connection System
- Knowledge gating (unknown → known progression)
- Spiritual barriers (protection blocking)
- Connection strength tracking
- "The Call" objective system

### Phase 4: Advanced Patterns
- CONSIDERING X, DO Y grammar
- NPC schedule integration
- Memory linking between entities
- Resolution mechanics

## Consequences

### Positive
- Novel IF experience fundamentally different from object manipulation
- Deep NPC interaction possibilities
- Emotional narrative mechanics built into the engine
- Tests Sharpee's flexibility for non-standard IF

### Negative
- Requires significant new verb set
- Emotional state is complex to balance
- May need special client UI for spiritual perception
- Testing emotional narratives is subjective

### Neutral
- Could become a reusable "Spirit Mode" for other stories
- Vocabulary slots (ADR-082) useful for emotion/memory words
- Demonstrates Sharpee can handle experimental IF paradigms

## Related ADRs

- ADR-070: NPC System Architecture (NPCs with behaviors)
- ADR-071: Daemons and Fuses (NPC schedules)
- ADR-082: Grammar Enhancements (CONSIDERING pattern, vocabulary slots)

## References

- `docs/aspectofgod/story.ni` - Original Inform 7 source
- Inform 7's "availability" pattern for knowledge states
- Classic spiritual IF: "Vespers", "Galatea", "Photopia"

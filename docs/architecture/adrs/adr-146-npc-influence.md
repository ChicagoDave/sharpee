# ADR-146: NPC Influence

## Status: DRAFT

## Date: 2026-04-05

## Context

### The Problem

ADR-141 defines character state. ADR-142 defines information exchange through conversation. ADR-144 defines information propagation through the NPC network. ADR-145 defines goal-directed behavior. But none of these systems address how one entity directly affects another entity's *state* through proximity, social pressure, or deliberate action — without exchanging information.

The motivating example: Ginger brushes up against the player slowly, clouding their judgment. The player loses focus for a turn. This isn't conversation, isn't information transfer, isn't goal pursuit — it's one entity's presence or action modifying another entity's character state.

### What Exists Today

- **ADR-141 (Character Model)**: NPCs have mood, threat, disposition, and cognitive state — all modifiable. But modifications are triggered by observation (witnessing events) or conversation, not by direct NPC-to-NPC or NPC-to-PC influence.
- **ADR-142 (Conversation)**: NPCs can change each other's state through dialogue (confrontation mechanic). But influence is broader — it includes non-verbal, passive, proximity-based effects.
- **ADR-145 (NPC Goal Pursuit)**: An NPC might use influence as a step in goal pursuit (the Colonel intimidates the gardener to get past a door). But the goal system doesn't own the influence mechanic.

### Design Principles

**The author defines everything.** Influence names, effects, resistance — all authored. The platform provides the evaluation mechanism, not a taxonomy of influence types.

**Influence is simple.** One entity exerts, the other resists or doesn't. The platform evaluates the match and selects the appropriate message. No scoring, no partial effects, no derived calculations.

## Decision

### 1. Influence Definition

The author defines influences on the exerting NPC. An influence has a name (author-invented string), a mode, a range, an effect, and messages:

```typescript
npc.character('ginger')
  .influence('seduction')
    .mode('passive')
    .range('proximity')
    .effect({ focus: 'clouded', mood: 'distracted' })
    .witnessed('ginger-brushes-against-{target}')
    .resisted('ginger-brushes-against-{target}-no-effect')

npc.character('colonel')
  .influence('intimidation')
    .mode('active')
    .range('targeted')
    .effect({ propagation: 'mute', mood: 'fearful' })
    .witnessed('colonel-looms-over-{target}')
    .resisted('colonel-looms-over-{target}-unfazed')

npc.character('priest')
  .influence('calming')
    .mode('passive')
    .range('room')
    .effect({ threat: 'calm', mood: 'at ease' })
    .witnessed('priest-presence-calms-{target}')
```

**Influence names** are author-defined strings — seduction, intimidation, charm, guilt-tripping, nagging, divine presence, whatever the story needs. The platform doesn't define or constrain them.

**Mode:**

| Mode | Behavior |
|---|---|
| `'passive'` | Exerted automatically when conditions are met (proximity, same room) |
| `'active'` | Exerted deliberately as part of NPC behavior or goal pursuit |

**Range:**

| Range | Behavior |
|---|---|
| `'proximity'` | Target must be in the same room as the influencer |
| `'targeted'` | Influencer selects a specific target (used with active mode) |
| `'room'` | Affects all entities in the room (aura) |

### 2. Resistance

The author defines resistance on the target. Resistance is keyed by influence name:

```typescript
npc.character('james')
  .resistsInfluence('seduction')

npc.character('margaret')
  .resistsInfluence('seduction', {
    except: ['from female'],
  })

npc.character('detective')
  .resistsInfluence('intimidation')

npc.character('gardener')
  .resistsInfluence('calming')     // too paranoid to be calmed
```

**Evaluation is binary.** The target either resists or doesn't. If they resist, the `resisted` message fires and no effect is applied. If they don't resist, the `witnessed` message fires and the effect applies.

The `except` clause allows conditional vulnerability — Margaret resists seduction except from women. The except conditions use the same predicate system as ADR-141/142.

### 3. Effects

Effects are character state mutations expressed in vocabulary words, consistent with ADR-141:

```typescript
.effect({ focus: 'clouded', mood: 'distracted' })
.effect({ propagation: 'mute', mood: 'fearful' })
.effect({ threat: 'calm', mood: 'at ease' })
```

Effects can also modify system behavior beyond character state:

| Effect key | What it modifies |
|---|---|
| `mood` | ADR-141 mood state |
| `threat` | ADR-141 threat level |
| `focus` | PC or NPC ability to pursue current activity (conversation context, goal pursuit) |
| `propagation` | ADR-144 propagation tendency (temporarily override to mute, chatty, etc.) |
| `disposition` | ADR-141 disposition toward a specific entity |

Effects are temporary by default — they last while the influence condition holds (passive) or for a duration the author specifies (active):

```typescript
npc.character('ginger')
  .influence('seduction')
    .mode('passive')
    .range('proximity')
    .effect({ focus: 'clouded', mood: 'distracted' })
    .duration('while present')      // clears when Ginger leaves

npc.character('colonel')
  .influence('intimidation')
    .mode('active')
    .range('targeted')
    .effect({ propagation: 'mute', mood: 'fearful' })
    .duration('lingering')          // persists after Colonel leaves
```

**Duration vocabulary:**

| Duration | Behavior |
|---|---|
| `'while present'` | Effect clears when influencer leaves the room (default for passive) |
| `'momentary'` | Effect lasts one turn (default for active) |
| `'lingering'` | Effect persists for author-defined number of turns or until a condition clears it |

### 4. Influence on the Player Character

When the target is the PC, effects modify gameplay:

- `focus: 'clouded'` — the player's next command might be forgotten ("You were about to do something, but you've lost your train of thought"), or conversation context is cleared
- `mood: 'distracted'` — narrative framing changes, the player sees the world through the influence
- `threat: 'calm'` — if the PC has a threat/alertness system, it decreases

PC effects are primarily narrative — the author provides the messages and decides the mechanical impact. The platform provides hooks for the author to intercept player actions while influenced:

```typescript
npc.character('ginger')
  .influence('seduction')
    .mode('passive')
    .range('proximity')
    .effect({ focus: 'clouded' })
    .onPlayerAction('ginger-distracts-from-{action}')   // fires when PC tries to act
    .duration('while present')
```

### 5. Influence as Goal Pursuit Step

Influence integrates with ADR-145 — an NPC can use influence as a step in goal pursuit:

```typescript
npc.character('colonel')
  .goal('access-study')
    .activatesWhen(['needs weapon', 'knows gardener guards study'])
    .pursues([
      { moveTo: 'garden' },
      { influence: 'intimidation', target: 'gardener' },
      { waitFor: 'gardener not guarding study' },
      { moveTo: 'study' },
      { acquire: 'letter-opener' },
    ])
```

The influence step exerts the influence on the target. If the target resists, the step fails and the NPC must find another approach (author defines fallback behavior or the goal is blocked).

### 6. Influence Scheduling

Like propagation (ADR-144), passive influences can be scheduled by character state:

```typescript
npc.character('ginger')
  .influence('seduction')
    .mode('passive')
    .range('proximity')
    .effect({ focus: 'clouded' })
    .schedule({
      when: ['alone with target'],    // only when no witnesses
    })
```

Without a schedule, passive influences are exerted whenever the range condition is met. The schedule adds authored conditions.

## Consequences

### Positive

- Simple binary system — exert, resist or don't, apply effect or don't
- Author defines everything — influence names, effects, resistance, messages
- No platform taxonomy to maintain or extend
- Integrates cleanly with goal pursuit (ADR-145) as a step type
- PC influence creates narrative gameplay moments
- Conditional resistance (`except`) enables character-revealing moments (Margaret's reaction to female seduction is a tell)

### Negative

- Temporary effect tracking adds state that must be saved/restored
- Passive room-wide influences evaluated each turn for all entities in the room
- Authors must define resistance on targets — if they forget, the influence always succeeds (though this could be the desired default)

### Neutral

- Influence is opt-in — NPCs without influence definitions don't participate
- The binary resist/don't-resist model is intentionally simple. If an author wants partial effects, they can define multiple influence levels as separate influences

## Implementation Layers

### Layer 1: Influence Profile
- Influence definition in CharacterBuilder (name, mode, range, effect, duration, messages)
- Schedule conditions
- Storage in CharacterModelTrait

### Layer 2: Resistance Profile
- Resistance definition in CharacterBuilder (influence name, except conditions)
- Storage in CharacterModelTrait

### Layer 3: Influence Evaluation Engine
- Per-NPC evaluation during NPC turn phase (passive influences)
- On-demand evaluation for active influences and goal pursuit steps
- Resistance check against target
- Effect application (character state mutations)
- Temporary effect tracking and duration management

### Layer 4: PC Influence Handling
- Player action interception when under influence
- Narrative message emission
- Focus/context disruption mechanics

### Layer 5: Builder API (in `@sharpee/character`)
- `.influence()` fluent builder extending CharacterBuilder
- `.resistsInfluence()` fluent builder extending CharacterBuilder
- Duration and schedule APIs

## Open Questions

All questions resolved during design discussion.

## References

- ADR-141: Character Model (upstream — character state modified by influence)
- ADR-142: Conversation System (influence can disrupt conversation context)
- ADR-144: Information Propagation (influence can suppress or enable propagation)
- ADR-145: NPC Goal Pursuit (influence as a goal pursuit step)

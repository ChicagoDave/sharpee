# Scope System Design

## Overview

The scope system determines what entities are perceivable by actors in the game world. It works in conjunction with the witnessing system to provide a complete knowledge and perception model.

## Core Concepts

### Scope vs Knowledge
- **Scope**: Physical possibility of perception (can the actor physically see/hear/reach this?)
- **Knowledge**: What the actor knows exists (has the actor discovered this?)

The scope system handles physics; the witnessing system handles discovery and memory.

### Scope Levels
```typescript
enum ScopeLevel {
  CARRIED,     // In actor's inventory
  REACHABLE,   // Can physically touch
  VISIBLE,     // Can see (line of sight + lighting)
  AUDIBLE,     // Can hear  
  DETECTABLE,  // Can smell/sense
  OUT_OF_SCOPE // Cannot perceive at all
}
```

### Sensory Channels
```typescript
enum SenseType {
  SIGHT,    // Blocked by opaque barriers, needs light
  HEARING,  // Travels through walls, diminishes with distance
  SMELL,    // Needs air path, lingers
  TOUCH,    // Requires physical contact
  VIBE      // Game-specific supernatural awareness
}
```

## Architecture

### Core Interfaces

```typescript
interface ScopeResolver {
  // Determine highest level of scope for target
  getScope(actor: IFEntity, target: IFEntity): ScopeLevel;
  
  // Check specific sensory channels
  canSee(actor: IFEntity, target: IFEntity): boolean;
  canReach(actor: IFEntity, target: IFEntity): boolean;
  canHear(actor: IFEntity, target: IFEntity): boolean;
  canSmell(actor: IFEntity, target: IFEntity): boolean;
  
  // Get all entities at specific scope level
  getVisible(actor: IFEntity): IFEntity[];
  getReachable(actor: IFEntity): IFEntity[];
  getAudible(actor: IFEntity): IFEntity[];
}

interface WitnessSystem {
  // Record who can perceive a change
  recordWitnesses(change: StateChange): WitnessRecord;
  
  // Update knowledge based on what was witnessed
  updateKnowledge(witnesses: string[], change: StateChange): void;
  
  // Query what an actor knows
  getKnownEntities(actorId: string): EntityKnowledge[];
  hasDiscovered(actorId: string, entityId: string): boolean;
}
```

## Scope Rules

### Visual Scope
1. **Same Room**: Entities in same room are visible unless:
   - Inside closed container
   - Behind/under furniture (until searched)
   - In darkness
   - Explicitly hidden

2. **Containers**: 
   - Closed opaque containers block sight
   - Open containers allow sight but may limit reach
   - Transparent containers allow sight through

3. **Supporters**:
   - Items on supporters are visible if supporter is visible
   - Height may affect reachability

4. **Darkness**:
   - Blocks visual scope unless actor has light source
   - Other senses still work

### Reach Scope
1. **Inventory**: Always reachable
2. **Same Location**: Usually reachable unless:
   - Too high (position.y > threshold)
   - Behind barrier
   - Inside container (depends on depth)
3. **Containers**: Reachability depends on:
   - Container must be open
   - Depth/size constraints

### Auditory Scope  
1. **Same Room**: Always audible
2. **Adjacent Rooms**: Audible through:
   - Open doors (full volume)
   - Closed doors (muffled)
   - Thin walls (very muffled)
3. **Distance**: Sound diminishes with distance

### Other Senses
- **Smell**: Requires air path, affected by ventilation
- **Touch**: Requires physical contact (same as REACHABLE)
- **Vibe**: Game-specific, may transcend physical barriers

## Integration with Actions

### Command Resolution
```typescript
// When player types "TAKE COIN"
1. Knowledge System: What coins does player know about?
2. Scope System: Which known coins are in scope?
3. Resolution: Choose best match or ask for clarification
```

### Action Validation
Actions check scope and emit structured error events:
```typescript
// Can't see target
{
  type: 'action.error',
  payload: {
    actionId: 'if.action.taking',
    messageId: 'not_visible',
    reason: 'not_visible',
    params: {
      targetId: 'coin-id'
    }
  }
}

// Can't reach target  
{
  type: 'action.error',
  payload: {
    actionId: 'if.action.taking',
    messageId: 'not_reachable',
    reason: 'not_reachable',
    params: {
      targetId: 'coin-id',
      targetLocation: 'high-shelf-id'
    }
  }
}
```

## Witness Events

The witness system emits structured events with data only (no text):

```typescript
// Witnessed action
{
  type: 'if.witness.action',
  payload: {
    witnessId: 'player-id',
    sense: SenseType.SIGHT,
    level: WitnessLevel.FULL,
    action: 'taking',
    actorId: 'npc-bob-id',
    targetId: 'coin-id',
    fromLocation: 'table-id',
    timestamp: 1234567890
  }
}

// Witnessed movement
{
  type: 'if.witness.movement',
  payload: {
    witnessId: 'player-id',
    sense: SenseType.SIGHT,
    level: WitnessLevel.PERIPHERAL,
    entityId: 'unknown', // Couldn't identify who/what
    fromLocation: 'room-id',
    toLocation: 'hallway-id',
    direction: 'north',
    timestamp: 1234567890
  }
}

// Witnessed sound
{
  type: 'if.witness.sound', 
  payload: {
    witnessId: 'player-id',
    sense: SenseType.HEARING,
    soundType: 'impact',
    intensity: 'loud',
    fromDirection: 'east',
    estimatedLocation: 'next-room-id',
    timestamp: 1234567890
  }
}

// Witnessed smell
{
  type: 'if.witness.scent',
  payload: {
    witnessId: 'player-id', 
    sense: SenseType.SMELL,
    scentType: 'food',
    intensity: 'strong',
    fromDirection: 'south',
    characteristics: ['fresh', 'baked'],
    timestamp: 1234567890
  }
}
```

The text service later interprets these events to generate appropriate narrative based on the witness's perspective, language settings, and game style.

## Implementation Phases

### Phase 1: Core Scope System
- Basic scope resolver
- Visual and reach calculations
- Container/supporter rules

### Phase 2: Witnessing System
- Knowledge tracking
- Discovery states
- Witness determination

### Phase 3: Sensory Extensions
- Hearing through barriers
- Smell propagation
- Darkness handling

### Phase 4: Integration
- Update ActionContext
- Modify command validator
- Update all actions to use scope

### Phase 5: Advanced Features
- Partial visibility
- Witness confidence levels
- Scope modifiers (fog, etc)
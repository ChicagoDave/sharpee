# Climbing Action Design

## Overview
The Climbing action handles vertical movement and mounting objects. It operates in two distinct modes: directional climbing (up/down movement between rooms) and object climbing (mounting enterable supporters). This dual-mode design unifies vertical navigation under a single action.

## Action Metadata
- **ID**: `IFActions.CLIMBING`
- **Group**: `movement`
- **Direct Object**: Optional (target object)
- **Indirect Object**: Not used
- **Direct Object Scope**: ScopeLevel.REACHABLE

## Core Concepts

### Dual-Mode Operation
1. **Directional Mode**: `climb up` / `climb down` - Room-to-room movement
2. **Object Mode**: `climb tree` / `climb ladder` - Mounting objects

### Climbing vs Going
- **Going**: Horizontal movement (north, south, east, west)
- **Climbing**: Vertical movement (up, down) or mounting
- **Overlap**: Both can use up/down exits

## Core Components

### 1. Main Action File (`climbing.ts`)

#### Required Messages
- `no_target` - Neither direction nor object specified
- `not_climbable` - Object cannot be climbed
- `cant_go_that_way` - No exit in that direction
- `climbed_up` - Successfully climbed upward
- `climbed_down` - Successfully climbed downward
- `climbed_onto` - Successfully mounted object
- `already_there` - Already at/on target
- `too_high` - Target too high to reach
- `too_dangerous` - Unsafe to climb

#### Mode Detection
```typescript
// Priority order:
1. Check for direction in extras
2. Check for direct object
3. Return error if neither
```

### 2. Event Types (`climbing-events.ts`)

#### ClimbedEventData
```typescript
{
  direction?: string,        // 'up' or 'down' for directional
  targetId?: EntityId,       // Object being climbed
  method: 'directional' | 'onto',
  destinationId?: EntityId   // Room ID for directional climbing
}
```

#### Related Events
- `if.event.moved` - For room transitions
- `if.event.entered` - For mounting objects

### 3. State Interface
```typescript
interface ClimbingState {
  mode: 'directional' | 'object',
  direction?: string,
  target?: any,
  destinationId?: string,
  messageId: string,
  params: Record<string, any>
}
```

## Validation Phase

### Mode Determination
```typescript
if (direction && !target) {
  // Directional climbing
  return validateDirectionalClimbing(direction, context);
} else if (target) {
  // Object climbing
  return validateObjectClimbing(target, context);
} else {
  return { valid: false, error: 'no_target' };
}
```

### Directional Climbing Validation

#### 1. Direction Verification
```typescript
const normalized = direction.toLowerCase();
if (normalized !== 'up' && normalized !== 'down') {
  return { valid: false, error: 'cant_go_that_way' };
}
```

#### 2. Room Check
```typescript
if (!currentLocation.hasTrait(TraitType.ROOM)) {
  return { valid: false, error: 'cant_go_that_way' };
}
```

#### 3. Exit Existence
```typescript
const roomTrait = currentLocation.getTrait(TraitType.ROOM);
if (!roomTrait.exits || !roomTrait.exits[normalized]) {
  return { valid: false, error: 'cant_go_that_way' };
}
```

#### 4. Destination Retrieval
```typescript
const exitConfig = roomTrait.exits[normalized];
const destinationId = exitConfig.to || exitConfig.destination;
```

### Object Climbing Validation

#### 1. Climbability Check
Object is climbable if it has:
- **ENTRY trait**: Explicitly enterable
- **SUPPORTER trait** with `enterable: true`

```typescript
if (target.hasTrait(TraitType.ENTRY)) {
  if (EntryBehavior.canEnter(target, context.player)) {
    isClimbable = true;
    destination = target.id;
  }
} else if (target.hasTrait(TraitType.SUPPORTER)) {
  const supporterTrait = target.getTrait(TraitType.SUPPORTER);
  if (supporterTrait.enterable) {
    isClimbable = true;
    destination = target.id;
  }
}
```

#### 2. Already There Check
```typescript
const currentLocation = context.world.getLocation(context.player.id);
if (currentLocation === target.id) {
  return { valid: false, error: 'already_there' };
}
```

## Execution Phase

### State Reconstruction
```typescript
// Re-validate for consistency
const result = this.validate(context);
if (!result.valid) {
  return [context.event('action.error', ...)];
}

// Rebuild state from context
const target = context.command.directObject?.entity;
const direction = context.command.parsed.extras?.direction;
```

### Directional Climbing Execution

#### 1. Mode Detection
```typescript
if (direction && !target) {
  mode = 'directional';
  const normalized = direction.toLowerCase();
```

#### 2. Destination Resolution
```typescript
const room = context.currentLocation;
const exits = room.get(TraitType.ROOM).exits || {};

if (normalized === 'up' && exits.up) {
  destinationId = exits.up.to || exits.up.destination;
} else if (normalized === 'down' && exits.down) {
  destinationId = exits.down.to || exits.down.destination;
}
```

#### 3. Event Generation
```typescript
// Climbing event
events.push(context.event('if.event.climbed', {
  direction: normalized,
  method: 'directional',
  destinationId: destinationId
}));

// Movement event (if destination exists)
if (destinationId) {
  events.push(context.event('if.event.moved', {
    direction: normalized,
    fromRoom: context.currentLocation.id,
    toRoom: destinationId,
    method: 'climbing'
  }));
}
```

### Object Climbing Execution

#### 1. Mode Setting
```typescript
mode = 'object';
messageId = 'climbed_onto';
params.object = target.name;
```

#### 2. Event Generation
```typescript
// Climbing event
events.push(context.event('if.event.climbed', {
  targetId: target.id,
  method: 'onto'
}));

// Entry event
events.push(context.event('if.event.entered', {
  targetId: target.id,
  method: 'climbing',
  preposition: 'onto'
}));
```

### Success Message
```typescript
events.push(context.event('action.success', {
  actionId: this.id,
  messageId: messageId,
  params: params
}));
```

## Trait Integrations

### Required Traits

#### For Directional Climbing
- **ROOM**: Current location must be a room
- Room must have `exits.up` or `exits.down`

#### For Object Climbing
- **ENTRY**: Makes object explicitly enterable
- **SUPPORTER**: With `enterable: true` flag
- **OPENABLE**: If present, must be open

### Entry Trait
```typescript
interface EntryTrait {
  canEnter: boolean,           // Allow entry
  preposition: string,          // 'in', 'on', 'under'
  maxOccupants?: number,        // Capacity limit
  occupants: string[],          // Current occupants
  occupantsVisible: boolean,   // Can see who's inside
  canSeeOut: boolean,          // Visibility from inside
  posture?: string,            // Required posture
  enterMessage?: string,        // Custom message
  fullMessage?: string         // When at capacity
}
```

### EntryBehavior Integration
```typescript
EntryBehavior.canEnter(target, actor) checks:
- canEnter flag is true
- Not at capacity
- Actor not already inside
- Open if openable
```

## Design Patterns

### Mode Selection Pattern
Single action handles multiple behaviors:
```typescript
if (hasDirection && !hasObject) -> Directional
if (hasObject) -> Object
else -> Error
```

### Event Cascading
Different events for different outcomes:
- **Directional**: `climbed` + `moved`
- **Object**: `climbed` + `entered`
- **Both**: `action.success`

### Trait-Based Capability
Objects declare climbability through traits:
- Explicit: ENTRY trait
- Implicit: SUPPORTER with flag
- Never: No relevant traits

## Movement Integration

### Relationship with Going Action
```
Going handles: north, south, east, west, in, out
Climbing handles: up, down (when climbing verb used)
Both can use: up/down exits in rooms
```

### Unified Movement Events
Both actions emit `if.event.moved` for room transitions:
```typescript
{
  direction: string,
  fromRoom: EntityId,
  toRoom: EntityId,
  method: 'climbing' | 'walking'
}
```

## Special Cases

### Ladder/Stairs Handling
Can be implemented as:
1. **Room Exit**: Direct up/down connection
2. **Enterable Object**: Climb onto first
3. **Both**: Object that leads to exit

### Rope/Vine Climbing
Special objects that are:
- Climbable (ENTRY trait)
- Lead to destinations (custom exit data)
- May have skill requirements

### Tree/Wall Climbing
Objects with:
- Multiple climbing positions (branches)
- Height-based exits
- Fall risk mechanics

## Error Handling

### Contextual Messages
```typescript
// Direction not climbable
'cant_go_that_way' - "You can't climb that way."

// Object not climbable  
'not_climbable' - "You can't climb the table."

// Already positioned
'already_there' - "You're already on the platform."
```

### Safety Checks
Stories can add:
- Height restrictions
- Skill requirements
- Equipment needs
- Danger warnings

## Performance Considerations

### Validation Efficiency
- Check direction first (simple string)
- Then check object traits
- Avoid duplicate room lookups

### Event Optimization
- Only generate movement events if moving
- Batch related events
- Reuse validation results

## Testing Considerations

### Test Scenarios

#### Directional Climbing
- Valid up/down exits
- Missing exits
- Invalid directions
- Blocked passages

#### Object Climbing
- Enterable objects
- Non-climbable objects
- Capacity limits
- Already positioned

#### Edge Cases
- Climbing while contained
- Nested climbing (climb while on something)
- Closed enterable objects
- Full containers

### Verification Points
- Correct mode detection
- Proper event sequence
- Message selection
- Trait validation

## Extension Points

### Custom Climbability
Stories can implement:
- Skill-based climbing
- Tool requirements (rope, ladder)
- Stamina/strength checks
- Environmental factors

### Advanced Positioning
- Multiple levels (tree branches)
- Partial climbing (halfway up)
- Climbing progress tracking
- Fall mechanics

### Environmental Effects
- Weather impact
- Surface conditions
- Time-based changes
- Visibility requirements

## Future Enhancements

### Potential Features

#### 1. Climbing Skill System
```typescript
interface ClimbingSkill {
  level: number,
  experience: number,
  maxHeight: number,
  equipment: string[]
}
```

#### 2. Multi-Stage Climbing
```
> climb tree
You climb into the lower branches.
> climb higher
You reach the upper branches.
> climb down
You descend to the lower branches.
```

#### 3. Climbing Challenges
- Dice rolls for success
- Stamina consumption
- Risk assessment
- Recovery from falls

#### 4. Equipment Integration
- Ropes increase range
- Harnesses prevent falls
- Special shoes improve grip
- Tools enable new routes

## Design Philosophy

### Unified Vertical Movement
- Single action for all climbing
- Consistent with movement patterns
- Clear mode separation
- Predictable behavior

### Safety First
- Validation prevents impossible climbs
- Clear error messages
- State verification
- Graceful failure

### Extensibility
- Trait-based capabilities
- Event-driven outcomes
- Story customization
- Skill system ready

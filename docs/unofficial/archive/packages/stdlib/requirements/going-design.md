# Going Action Design

## Overview
The Going action implements movement through the game world via directional exits. It handles room-to-room navigation, door interactions, lighting requirements, and generates comprehensive movement events for all observers.

## Action Metadata
- **ID**: `IFActions.GOING`
- **Group**: `movement`
- **Direct Object**: Not required (direction in extras)
- **Indirect Object**: Not required

## Core Concepts

### Direction System
- **Language-Agnostic Constants**: Uses `Direction.NORTH`, not "north"
- **12 Cardinal Directions**: N, S, E, W, NE, NW, SE, SW, UP, DOWN, IN, OUT
- **Opposite Mapping**: Each direction has a defined opposite
- **Parser Integration**: Direction resolved before action execution

### Exit Architecture
```typescript
interface IExitInfo {
  destination: EntityId;  // Target room ID
  via?: EntityId;        // Optional door/portal ID
}
```

### Movement Prerequisites
1. Actor must be in a room (not contained)
2. Exit must exist in the direction
3. Exit must not be blocked
4. Door (if any) must be open
5. Destination must exist
6. Destination must have sufficient light

## Core Components

### 1. Main Action File (`going.ts`)

#### Required Messages
- `no_direction` - Direction not specified
- `not_in_room` - Actor is contained (not in room)
- `no_exits` - Room has no exits at all
- `no_exit_that_way` - No exit in that direction
- `movement_blocked` - Exit is blocked
- `door_closed` - Door blocks passage
- `door_locked` - Door is locked
- `destination_not_found` - Target room missing
- `moved` - Basic success
- `moved_to` - Success with destination
- `first_visit` - First time entering room
- `too_dark` - Insufficient light
- `need_light` - Light source required

#### Direction Resolution
```typescript
// Priority order for finding direction:
1. context.command.parsed.extras?.direction
2. context.command.directObject?.entity.name
3. context.command.directObject?.entity.attributes?.name
```

### 2. Data Builders (`going-data.ts`)

#### Three Event Data Builders

**1. Actor Moved Data**
```typescript
{
  actor: EntitySnapshot,           // Actor snapshot
  sourceRoom: RoomSnapshot,        // Origin room
  destinationRoom: RoomSnapshot,   // Target room
  direction: DirectionType,        // Movement direction
  fromRoom: EntityId,              // Source ID
  toRoom: EntityId,                // Destination ID
  oppositeDirection: DirectionType,// For arrival description
  firstVisit: boolean              // First time in destination
}
```

**2. Actor Exited Data**
```typescript
{
  actorId: EntityId,               // Who left
  direction: DirectionType,        // Which way
  toRoom: EntityId                 // Where to
}
```

**3. Actor Entered Data**
```typescript
{
  actorId: EntityId,               // Who arrived
  direction: DirectionType,        // From which direction (opposite)
  fromRoom: EntityId               // Where from
}
```

### 3. Event Types (`going-events.ts`)

#### Movement Event Sequence
1. `if.event.actor_exited` - For observers in departure room
2. `if.event.actor_moved` - Complete movement record
3. `if.event.actor_entered` - For observers in arrival room
4. `action.success` - User feedback

## Validation Phase

### Validation Sequence

#### 1. Direction Validation
```typescript
if (!direction) {
  return { valid: false, error: 'no_direction' };
}
```

#### 2. Containment Check
```typescript
const playerDirectLocation = context.world.getLocation(actor.id);
if (playerDirectLocation !== currentRoom.id) {
  // Player is inside container/supporter
  return { valid: false, error: 'not_in_room' };
}
```

#### 3. Exit Existence
```typescript
const exitConfig = RoomBehavior.getExit(currentRoom, direction);
if (!exitConfig) {
  // Check if any exits exist for better error
  const allExits = RoomBehavior.getAllExits(currentRoom);
  if (allExits.size === 0) {
    return { valid: false, error: 'no_exits' };
  }
  return { valid: false, error: 'no_exit_that_way' };
}
```

#### 4. Exit Blocking
```typescript
if (RoomBehavior.isExitBlocked(currentRoom, direction)) {
  const blockedMessage = RoomBehavior.getBlockedMessage(currentRoom, direction);
  return { valid: false, error: 'movement_blocked' };
}
```

#### 5. Door State
```typescript
if (exitConfig.via) {
  const door = context.world.getEntity(exitConfig.via);
  if (door) {
    const isLocked = LockableBehavior.isLocked(door);
    const isClosed = !OpenableBehavior.isOpen(door);
    
    if (isLocked) return { valid: false, error: 'door_locked' };
    if (isClosed) return { valid: false, error: 'door_closed' };
  }
}
```

#### 6. Destination Validation
```typescript
const destination = context.world.getEntity(exitConfig.destination);
if (!destination) {
  return { valid: false, error: 'destination_not_found' };
}
```

#### 7. Lighting Requirements
```typescript
if (isDarkRoom(destination) && !hasLightInRoom(actor, context)) {
  return { valid: false, error: 'too_dark' };
}
```

## Execution Phase

### State Mutations

#### 1. Store First Visit Status
```typescript
const isFirstVisit = !RoomBehavior.hasBeenVisited(destination);
(context as any)._isFirstVisit = isFirstVisit;
```

#### 2. Move Actor
```typescript
context.world.moveEntity(actor.id, destination.id);
```

#### 3. Mark Room Visited
```typescript
if (isFirstVisit) {
  RoomBehavior.markVisited(destination, actor);
}
```

### Context Extensions
- `_isFirstVisit`: Boolean flag for report phase

## Report Phase

### Event Generation Sequence

#### 1. Exit Event
For NPCs/observers in the departure room:
```typescript
context.event('if.event.actor_exited', {
  actorId: actor.id,
  direction: direction,
  toRoom: destination.id
})
```

#### 2. Movement Event
Complete movement record with snapshots:
```typescript
context.event('if.event.actor_moved', {
  actor: actorSnapshot,
  sourceRoom: sourceSnapshot,
  destinationRoom: destinationSnapshot,
  direction: direction,
  fromRoom: source.id,
  toRoom: destination.id,
  oppositeDirection: opposite,
  firstVisit: isFirstVisit
})
```

#### 3. Entry Event
For NPCs/observers in the arrival room:
```typescript
context.event('if.event.actor_entered', {
  actorId: actor.id,
  direction: oppositeDirection,
  fromRoom: source.id
})
```

#### 4. Success Message
Dynamic message based on context:
```typescript
const messageId = firstVisit ? 'first_visit' : 'moved_to';
```

### Source Room Discovery
Since execution has already moved the actor:
```typescript
function findSourceRoom(currentRoom, direction, world) {
  // Find room with exit leading to current location
  for (const room of allRooms) {
    const exit = RoomBehavior.getExit(room, direction);
    if (exit?.destination === currentRoom.id) {
      return room;
    }
  }
  return currentRoom; // Fallback
}
```

## Trait Integrations

### Required Traits
- **ROOM**: Both source and destination must be rooms
- **DOOR**: Optional via entities for passages
- **OPENABLE**: Doors may be openable
- **LOCKABLE**: Doors may be lockable
- **LIGHT_SOURCE**: For dark room navigation

### Behavior Dependencies

#### RoomBehavior
- `getExit()`: Retrieve exit configuration
- `getAllExits()`: List all exits
- `isExitBlocked()`: Check blocking
- `getBlockedMessage()`: Get block reason
- `hasBeenVisited()`: Check visit status
- `markVisited()`: Set visited flag

#### Door Behaviors
- `OpenableBehavior.isOpen()`: Check door state
- `LockableBehavior.isLocked()`: Check lock state

#### Light Behaviors
- `LightSourceBehavior.isLit()`: Check light sources

## World Model Integration

### Required Methods
- `getLocation(entityId)`: Get entity container
- `getEntity(entityId)`: Retrieve entities
- `getContents(entityId)`: Check inventory for lights
- `moveEntity(entityId, targetId)`: Perform movement
- `getAllEntities()`: Find source room

### Room Graph Navigation
- Rooms connected via exit mappings
- Bidirectional connections not enforced
- Doors as optional intermediaries

## Design Patterns

### Observer Pattern
Three separate events notify different observers:
1. **Exit Event**: Observers in departure room
2. **Move Event**: Complete record for system
3. **Enter Event**: Observers in arrival room

### State Preservation
- Capture snapshots after movement
- Store first visit flag during execution
- Reconstruct source room in report phase

### Containment Hierarchy
```
Room (can move between)
  ├── Actor (direct containment)
  │   └── Items (can't use room exits)
  └── Container/Supporter
      └── Actor (can't use room exits)
```

## Special Cases

### Dark Room Mechanics

#### Room Darkness Check
```typescript
function isDarkRoom(room: IFEntity): boolean {
  const roomTrait = room.get(TraitType.ROOM) as RoomTrait;
  return roomTrait.isDark || false;
}
```

#### Light Source Detection
```typescript
function hasLightInRoom(actor: IFEntity, context: ActionContext): boolean {
  // Check actor itself
  if (LightSourceBehavior.isLit(actor)) return true;
  
  // Check carried items
  const carried = context.world.getContents(actor.id);
  for (const item of carried) {
    if (LightSourceBehavior.isLit(item)) return true;
  }
  
  return false;
}
```

### Blocked Exits
- Exits can be blocked with custom messages
- Blocking is separate from door closure
- Unblocking generates events

### First Visit Tracking
- Rooms track visited status
- First visit triggers special message
- Can display initial descriptions

## Error Messages

### Contextual Error Information
Errors include relevant context:
```typescript
// Door errors include state
{
  error: 'door_locked',
  params: {
    door: door.name,
    direction: direction,
    isClosed: true,
    isLocked: true
  }
}

// Direction errors include attempted direction
{
  error: 'no_exit_that_way',
  params: { direction: direction }
}
```

## Performance Considerations

### Optimization Strategies

#### Room Discovery
- Cache room connections if needed
- Index exits by destination
- Maintain bidirectional mappings

#### Light Calculation
- Cache light source status
- Only check when entering dark rooms
- Aggregate light levels if needed

#### Snapshot Efficiency
- Room snapshots exclude deep contents
- Actor snapshots are shallow
- Reuse snapshots within turn

## Extension Points

### Story Customization

#### Custom Exit Types
- Magical portals
- One-way passages
- Conditional exits

#### Movement Restrictions
- Size-based limitations
- Weight restrictions
- Skill requirements

#### Dynamic Exits
- Time-based passages
- State-dependent routes
- Randomized connections

### Event Extensions
- Movement sounds
- Footstep tracking
- Trail leaving

## Testing Considerations

### Test Scenarios

#### Basic Movement
- Valid directions
- Invalid directions
- No exits

#### Door Interactions
- Open doors
- Closed doors
- Locked doors

#### Special Conditions
- Dark rooms with/without light
- Contained actors
- First visits

#### Edge Cases
- Missing destinations
- Circular paths
- Blocked exits

### Verification Points
- Correct room after movement
- Proper event sequence
- Snapshot accuracy
- Visit tracking

## Design Decisions

### Why Three Events?
1. **Separation of Concerns**: Different observers need different information
2. **NPC Reactions**: NPCs can react to arrivals/departures
3. **Complete Record**: Full movement data for game systems

### Direction as Constants
- Language independence
- Type safety
- Consistent opposites
- Parser abstraction

### Containment Restrictions
- Prevents movement while in containers
- Maintains logical consistency
- Simplifies exit resolution

## Future Enhancements

### Potential Features

#### Advanced Movement
- Diagonal shortcuts
- Path finding
- Auto-navigation

#### Environmental Effects
- Difficult terrain
- Movement costs
- Speed modifiers

#### Group Movement
- Following mechanics
- Party travel
- NPC companions

#### Dynamic World
- Moving rooms (vehicles)
- Shifting passages
- Temporal exits

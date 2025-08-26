# Taking Action Design

## Overview
The Taking action implements object acquisition functionality, allowing actors to pick up items from the world and add them to their inventory. It follows the standard three-phase action pattern (validate, execute, report) and integrates with multiple trait behaviors.

## Action Metadata
- **ID**: `IFActions.TAKING`
- **Group**: `object_manipulation`
- **Direct Object**: Required (ScopeLevel.REACHABLE)
- **Indirect Object**: Not required

## Core Components

### 1. Main Action File (`taking.ts`)
The primary action implementation containing the three-phase logic.

#### Required Messages
- `no_target` - No object was specified
- `cant_take_self` - Attempting to take yourself
- `already_have` - Item is already in inventory
- `cant_take_room` - Attempting to take a room entity
- `fixed_in_place` - Item is scenery/immovable
- `container_full` - Actor's inventory is at capacity
- `too_heavy` - Item exceeds weight capacity
- `taken` - Success message for taking
- `taken_from` - Success message when taking from container/supporter

### 2. Data Builder (`taking-data.ts`)
Centralizes entity snapshot logic and data structure creation for events.

#### Data Builder Configuration
```typescript
export const takenDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildTakenData,
  protectedFields: ['item', 'itemSnapshot', 'actorSnapshot']
};
```

#### Data Structure
The `buildTakenData` function creates:
- **itemSnapshot**: Complete entity snapshot after taking (includes contents)
- **actorSnapshot**: Actor snapshot after taking (without nested contents)
- **item**: Item name (backward compatibility)
- **fromLocation**: Previous location entity ID (optional)
- **container**: Container/supporter name (optional)
- **fromContainer**: Boolean flag for container source
- **fromSupporter**: Boolean flag for supporter source

### 3. Event Types (`taking-events.ts`)
Defines TypeScript interfaces for event data structures.

#### Event Types
- **TakenEventData**: Success event data structure
- **TakingErrorData**: Error event data with specific reason codes
- **RemovedEventData**: Implicit removal event (for worn items)

## Validation Phase

### Validation Checks (Sequential)
1. **Target Existence**: Verify direct object exists
2. **Self-Reference**: Prevent taking yourself
3. **Already Held**: Check if item is already in actor's inventory
4. **Room Check**: Prevent taking room entities
5. **Scenery Check**: Prevent taking fixed/scenery items
   - Uses `SceneryBehavior.getCantTakeMessage()` for custom messages
6. **Capacity Check**: Validate actor can carry the item
   - Delegates to `ActorBehavior.canTakeItem()`
   - Checks container capacity if actor has CONTAINER trait
   - Returns specific error messages for capacity failures

### Validation Result
Returns `ValidationResult` with:
- `valid`: Boolean success indicator
- `error`: Message key for failure reason
- `params`: Additional parameters for message formatting

## Execution Phase

### State Mutations
1. **Store Previous Location**: Saves current item location to context
2. **Handle Worn Items**: If item has WEARABLE trait and is worn:
   - Sets `_implicitlyRemoved` flag on context
   - Calls `WearableBehavior.remove()` to update worn status
3. **Move Entity**: Transfers item to actor's inventory
   - Uses `context.world.moveEntity(noun.id, actor.id)`

### Context Extensions
The execution phase adds temporary data to context:
- `_previousLocation`: Original location before taking
- `_implicitlyRemoved`: Flag for implicit worn item removal

## Report Phase

### Error Reporting
Handles two types of errors:

#### Validation Errors
- Creates error event with validation failure details
- Captures entity snapshots for both direct and indirect objects
- Uses error reason as message ID

#### Execution Errors
- Creates generic execution failure event
- Includes error message in parameters

### Success Reporting
Generates multiple events for successful taking:

1. **Implicit Removal Event** (conditional)
   - Type: `if.event.removed`
   - Generated when worn item was implicitly removed
   - Includes item and container names

2. **Taken Event**
   - Type: `if.event.taken`
   - Uses data builder to create complete event data
   - Includes full entity snapshots

3. **Success Event**
   - Type: `action.success`
   - Message ID varies based on source:
     - `taken_from` - When taken from container/supporter
     - `taken` - When taken from room/floor
   - Includes complete taken data as parameters

## Trait Integrations

### Used Traits
- **ROOM**: Checked to prevent taking rooms
- **SCENERY**: Checked for immovable objects
- **CONTAINER**: Checked for capacity constraints
- **WEARABLE**: Checked for worn status handling
- **ACTOR**: Required on the acting entity

### Behavior Dependencies
- **SceneryBehavior**: Custom "can't take" messages
- **ActorBehavior**: Capacity validation via `canTakeItem()`
- **WearableBehavior**: Worn item removal via `remove()`
- **ContainerBehavior**: Indirect capacity checking

## World Model Integration

### Required World Methods
- `getLocation(entityId)`: Get current entity location
- `getEntity(entityId)`: Retrieve entity by ID
- `getContents(entityId)`: Get contained entities
- `moveEntity(entityId, targetId)`: Transfer entity location

### Entity Snapshot Capture
Uses `captureEntitySnapshot()` utility:
- Item snapshot includes nested contents
- Actor snapshot excludes nested contents for performance

## Design Patterns

### Three-Phase Pattern
Standard action execution flow:
1. **Validate**: Check all preconditions
2. **Execute**: Perform state mutations
3. **Report**: Generate events

### Data Builder Pattern
Separates data structure creation from business logic:
- Centralized snapshot logic
- Protected core fields
- Extensible by stories

### Event-Driven Architecture
All outcomes communicated through semantic events:
- Error events for failures
- Multiple success events for different aspects
- Implicit action events (removal)

## Backward Compatibility

### Legacy Fields Maintained
- `item`: String name (alongside new `itemSnapshot`)
- `container`: Unified field for container/supporter/actor source

### Progressive Enhancement
New atomic snapshot pattern coexists with legacy string fields, allowing gradual migration.

## Extension Points

### Story Customization
- Custom "can't take" messages via SceneryBehavior
- Extended event data via data builder configuration
- Additional validation via trait behaviors

### Protected Fields
Core fields that cannot be overridden:
- `item`
- `itemSnapshot`
- `actorSnapshot`

## Performance Considerations

### Snapshot Optimization
- Actor snapshots exclude nested contents
- Item snapshots include contents for completeness
- Snapshots captured after state mutation for accuracy

### Validation Ordering
Checks ordered from least to most expensive:
1. Simple property checks (self, already held)
2. Trait existence checks (room, scenery)
3. Complex behavior checks (capacity validation)

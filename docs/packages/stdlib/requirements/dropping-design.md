# Dropping Action Design Document

## Action Overview
The dropping action allows actors to put down items they are currently holding. This action transfers items from the actor's inventory to their current location, which can be a room, container, or supporter.

## Action ID
`IFActions.DROPPING`

## Required Messages
- `no_target` - No object was specified to drop
- `not_held` - The specified item is not being carried
- `still_worn` - The item is currently being worn
- `container_not_open` - Target container is closed
- `container_full` - Target container has no space
- `dropped` - Standard success message
- `dropped_in` - Success message when dropping into a container
- `dropped_on` - Success message when dropping onto a supporter
- `cant_drop_here` - Location won't accept drops
- `dropped_quietly` - Success message for fragile items
- `dropped_carelessly` - Success message when using "discard" verb

## Validation Logic

### Phase: validate()
1. **Check for Target Object**
   - Verifies that a direct object was specified in the command
   - Returns `no_target` error if no object specified

2. **Check Item is Held**
   - Uses `ActorBehavior.isHolding()` to verify the actor is carrying the item
   - Returns `not_held` error with item name if not being carried

3. **Check Item Not Worn**
   - Uses `WearableBehavior.isWorn()` to check if item has WEARABLE trait and is worn
   - Returns `still_worn` error with item name if currently worn

4. **Determine Drop Location**
   - Gets player's current location from world model
   - Falls back to `context.currentLocation` if not found
   - Returns `cant_drop_here` error if no valid location

5. **Check Location Acceptance**
   - For containers (non-room entities with CONTAINER trait):
     - Uses `ContainerBehavior.canAccept()` to verify container can accept item
     - Checks capacity limits if defined
     - Returns `container_full` error if at capacity
     - Returns `cant_drop_here` if container cannot accept for other reasons

### Return Value
- `{ valid: true }` if all checks pass
- `{ valid: false, error: string, params?: object }` if validation fails

## Execution Logic

### Phase: execute()
1. **Retrieve Entities**
   - Gets actor from context.player
   - Gets noun from command.directObject.entity

2. **Perform Drop Action**
   - Delegates to `ActorBehavior.dropItem()` to handle the actual transfer
   - Returns an `IDropItemResult` with success status and failure reasons

3. **Store Result**
   - Temporarily stores drop result on context for report phase
   - Uses private property `_dropResult`

## Reporting Logic

### Phase: report()
1. **Handle Validation Errors**
   - Creates error event with validation failure details
   - Captures entity snapshots for error context
   - Returns `action.error` event with appropriate message

2. **Handle Execution Errors**
   - Creates error event for unexpected execution failures
   - Returns generic `action_failed` message

3. **Handle Drop Result**
   - Checks stored drop result from execution phase
   - For failures:
     - `notHeld`: Returns `not_held` error
     - `stillWorn`: Returns `still_worn` error
     - Generic failure: Returns `cant_drop` error

4. **Build Success Event Data**
   - Uses `buildDroppedData()` to create event data
   - Includes entity snapshots and location information
   - Uses `determineDroppingMessage()` to select appropriate success message

5. **Return Events**
   - Domain event: `if.event.dropped` with complete drop data
   - Success event: `action.success` with selected message and parameters

## Data Structures

### DroppedEventData
```typescript
{
  item: EntityId,              // ID of dropped item
  itemName: string,           // Display name of item
  toLocation: EntityId,       // ID of drop location
  toLocationName: string,     // Display name of location
  toRoom?: boolean,           // True if dropped in room
  toContainer?: boolean,      // True if dropped in container
  toSupporter?: boolean,      // True if dropped on supporter
  itemSnapshot?: EntitySnapshot,     // Complete item state
  actorSnapshot?: EntitySnapshot,    // Complete actor state
  locationSnapshot?: EntitySnapshot  // Complete location state
}
```

### DroppingErrorData
```typescript
{
  reason: string,     // Error reason code
  item?: string,      // Item name (when applicable)
  container?: string, // Container name (for container errors)
  details?: object    // Additional error context
}
```

## Traits Used

### Primary Traits
- **IDENTITY** - Used to get entity names for messages
- **WEARABLE** - Checked to prevent dropping worn items
- **CONTAINER** - Checked on target location for acceptance rules
- **SUPPORTER** - Checked to determine drop message variation
- **ROOM** - Used to distinguish rooms from containers

### Behavior Classes Used
- **ActorBehavior**
  - `isHolding()` - Validates item ownership
  - `dropItem()` - Performs the actual drop operation
- **WearableBehavior**
  - `isWorn()` - Checks if item is currently worn
- **ContainerBehavior**
  - `canAccept()` - Validates container can receive item

## Message Selection Logic

The success message is determined by:
1. **Drop Location Type**
   - Container: Uses `dropped_in` message
   - Supporter: Uses `dropped_on` message
   - Room: Uses base `dropped` or variations

2. **Verb Variations**
   - "discard" verb: Uses `dropped_carelessly` message

3. **Item Properties**
   - Items with "glass" in name: Uses `dropped_quietly` message

## Metadata

```typescript
{
  requiresDirectObject: true,
  requiresIndirectObject: false,
  directObjectScope: ScopeLevel.CARRIED
}
```

- **Group**: `object_manipulation`
- **Direct Object**: Required, must be in CARRIED scope
- **Indirect Object**: Not required

## Event Flow

1. **Validation Phase**
   - All preconditions checked
   - Early return on any failure

2. **Execution Phase**
   - State changes applied atomically
   - Result stored for reporting

3. **Report Phase**
   - Events generated based on outcome
   - Both domain and UI events emitted

## Integration Points

### World Model Integration
- Uses world model to track item locations
- Queries entity relationships and containment
- Updates location mappings on successful drop

### Snapshot System
- Captures complete entity states for event data
- Includes actor, item, and location snapshots
- Provides full context for event handlers

### Data Builder Pattern
- Separates data structure from business logic
- Configurable through `droppedDataConfig`
- Protected core fields prevent accidental modification

## Error Handling

### Validation Errors
- Specific error codes for each failure condition
- Contextual parameters included in error events
- Entity snapshots captured for debugging

### Execution Errors
- Generic fallback for unexpected failures
- Error message included in event parameters
- Maintains consistency even on failure

## Design Patterns

1. **Three-Phase Pattern** (ADR-051)
   - Clean separation of validation, execution, and reporting
   - Atomic state changes in execution
   - Event generation isolated in report phase

2. **Delegation Pattern**
   - Core logic delegated to behavior classes
   - Action focuses on orchestration
   - Reusable behaviors across actions

3. **Data Builder Pattern**
   - Centralized data structure creation
   - Extensible through configuration
   - Protected fields ensure data integrity

4. **Snapshot Pattern**
   - Complete entity state captured at action time
   - Enables accurate event replay
   - Provides debugging context
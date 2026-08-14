# Exiting Action Design Document

## Action Overview
The exiting action allows actors to exit from containers, supporters, or other enterable objects. This action is the inverse of the entering action, handling movement out of objects that the actor is currently inside or on. It manages occupancy updates, proper preposition usage, and checks for containment restrictions.

## Action ID
`IFActions.EXITING`

## Required Messages
- `already_outside` - Actor is not inside anything that can be exited
- `container_closed` - Container must be opened before exiting
- `cant_exit` - Exit is blocked or not allowed
- `exited` - Standard success message
- `exited_from` - Alternative success message (for "off" preposition)
- `nowhere_to_go` - No valid destination for exiting

## Validation Logic

### Phase: validate()
1. **Check Current Location**
   - Gets actor's current location from world model
   - Returns `nowhere_to_go` if no location found
   - Retrieves entity for current location
   - Returns `nowhere_to_go` if entity not found

2. **Check Exitability**
   - Verifies current location has CONTAINER, SUPPORTER, or ENTRY trait
   - Returns `already_outside` if no exitable traits found

3. **Find Parent Location**
   - Gets parent location (destination after exiting)
   - Returns `nowhere_to_go` if no parent location exists

4. **Check Exit Permission**
   - For ENTRY trait objects:
     - Checks `canEnter` flag (if can't enter, can't exit)
     - Returns `cant_exit` if exit not allowed

5. **Check Container Openness**
   - For containers with OPENABLE trait:
     - Uses `OpenableBehavior.isOpen()` to check state
     - Returns `container_closed` if container is closed

### Return Value
- `{ valid: true }` if all checks pass
- `{ valid: false, error: string, params?: object }` if validation fails

## Execution Logic

### Phase: execute()
**Note**: This action currently combines validation, execution, and reporting in a single phase.

1. **Re-validate**
   - Calls validate() again at start of execution
   - Returns error event if validation fails

2. **Retrieve Entities**
   - Gets actor from context.player
   - Gets current location from world model
   - Gets current container entity
   - Gets parent location (destination)

3. **Determine Preposition**
   - Default: "from"
   - For CONTAINER trait: "out of"
   - For SUPPORTER trait: "off"
   - For ENTRY trait:
     - Maps entry preposition to exit preposition:
       - "in" → "out of"
       - "on" → "off"
       - "under" → "from under"
       - "behind" → "from behind"

4. **Update Occupancy**
   - For ENTRY trait objects:
     - Checks if actor is in occupants list using `EntryBehavior.contains()`
     - Removes actor ID from occupants array
     - Handles missing or invalid indices gracefully

5. **Build Event Data**
   - Creates parameters with place name and preposition
   - Creates `ExitedEventData` with:
     - From location (current)
     - To location (parent)
     - Preposition

6. **Generate Events**
   - Creates `if.event.exited` domain event
   - Creates `action.success` with appropriate message:
     - "exited_from" for "off" preposition
     - "exited" for other prepositions

## Reporting Logic
**Note**: Currently integrated into execute() phase - no separate report() method.

## Data Structures

### ExitedEventData
```typescript
{
  fromLocation: EntityId,  // Location being exited
  toLocation: EntityId,    // Destination location
  preposition: string       // Spatial relationship phrase
}
```

### ExitingErrorData
```typescript
{
  reason: string,       // Error reason code
  container?: string,   // Container name (for closed containers)
  place?: string        // Place name (for exit blocks)
}
```

## Traits Used

### Primary Traits
- **CONTAINER** - Container trait
  - Indicates actor is inside something
  - Affects preposition selection

- **SUPPORTER** - Supporter trait  
  - Indicates actor is on something
  - Affects preposition selection

- **ENTRY** - Specialized entry/exit trait
  - `canEnter` - Permission flag for entry/exit
  - `occupants` - Array of entity IDs inside
  - `preposition` - Spatial relationship for custom prepositions

- **OPENABLE** - Openable trait
  - Checked for container closure state
  - Blocks exit when closed

### Behavior Classes Used
- **OpenableBehavior**
  - `isOpen()` - Checks open/closed state

- **EntryBehavior**
  - `contains()` - Checks if entity is an occupant
  - Referenced but exit events handled manually

## Message Selection Logic

The success message is determined by:
1. **Preposition Type**
   - "off": Uses `exited_from` message
   - All others: Uses `exited` message

Message parameters include:
- `place` - Name of exited object
- `preposition` - Spatial relationship phrase

## Metadata

```typescript
{
  requiresDirectObject: false,
  requiresIndirectObject: false,
  directObjectScope: ScopeLevel.REACHABLE
}
```

- **Group**: `movement`
- **Direct Object**: Not required (exits current location)
- **Indirect Object**: Not required

## Event Flow

1. **Combined Phase**
   - Validation performed
   - Re-validation in execute
   - State changes applied
   - Events generated
   - All in single execute() method

## Special Behaviors

### No Target Required
- Unlike entering, exiting requires no direct object
- Always exits current location
- Destination determined automatically

### Preposition Mapping
- Entry prepositions mapped to exit prepositions
- Supports complex spatial relationships
- "under" → "from under"
- "behind" → "from behind"

### Occupancy Cleanup
- Removes actor from occupants list
- Safe handling of missing entries
- No error on already removed occupants

### Container Restrictions
- Closed containers prevent exit
- Similar to real-world physics
- Ensures logical consistency

## Integration Points

### World Model Integration
- Queries location hierarchy
- Does not directly move entities (movement in events)
- Updates occupancy tracking
- Navigates parent-child relationships

### Behavior System
- Uses OpenableBehavior for closure checks
- References EntryBehavior for occupancy
- Manual occupancy updates

### Event System
- Generates domain events for state changes
- Success messages vary by exit type
- Includes movement path in events

## Error Handling

### Validation Errors
- Specific error codes for each failure type
- Contextual parameters for error messages
- Container names in closure errors
- Place names in exit block errors

### Location Validation
- Verifies valid location hierarchy
- Checks for orphaned locations
- Ensures destination exists

### State Consistency
- Safe occupancy list manipulation
- Handles missing array indices
- Prevents array corruption

## Design Patterns

### Current Implementation Notes
1. **Combined Phases**
   - Does not follow three-phase pattern (ADR-051)
   - Validation repeated in execute()
   - No separate report() method

2. **Automatic Destination**
   - Destination determined from location hierarchy
   - No user specification needed
   - Follows containment chain

3. **Preposition Intelligence**
   - Smart mapping of entry to exit prepositions
   - Context-aware message generation
   - Natural language consistency

4. **Safe Array Manipulation**
   - Defensive coding for occupants array
   - Handles undefined and missing indices
   - No assumptions about array state

## Limitations and Assumptions

1. **Single Level Exit**
   - Exits only one level of containment
   - No multi-level exit support
   - Must exit repeatedly for nested containers

2. **No Movement Validation**
   - Doesn't verify destination is safe
   - No checks for dangerous locations
   - Assumes parent location is valid

3. **No Carried Items**
   - Only moves the actor
   - Carried items implicitly follow
   - No bulk or size considerations

4. **Limited Exit Blocking**
   - Basic permission check via canEnter
   - No complex exit conditions
   - No event-based exit prevention

5. **No Direction Support**
   - Cannot specify exit direction
   - Always exits to parent location
   - No alternative exit paths
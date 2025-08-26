# Entering Action Design Document

## Action Overview
The entering action allows actors to enter containers, supporters, or other enterable objects. This action handles movement into objects that have the ENTRY trait or are containers/supporters marked as enterable. It manages occupancy limits, posture changes, and proper preposition usage.

## Action ID
`IFActions.ENTERING`

## Required Messages
- `no_target` - No object specified to enter
- `not_enterable` - Object cannot be entered
- `already_inside` - Actor is already inside the target
- `container_closed` - Container must be opened first
- `too_full` - Target has reached occupancy limit
- `entered` - Standard success message (for "in")
- `entered_on` - Success message for supporters (for "on")
- `cant_enter` - Generic failure to enter

## Validation Logic

### Phase: validate()
1. **Check for Target Object**
   - Verifies that a direct object was specified
   - Returns `no_target` error if no object specified

2. **Check Current Location**
   - Verifies actor is not already inside the target
   - Returns `already_inside` error with place name if already there

3. **Check ENTRY Trait** (Highest Priority)
   - If target has ENTRY trait, uses `EntryBehavior.canEnter()`
   - Gets blocked reason if cannot enter:
     - "full": Returns `too_full` error with occupancy details
     - "closed": Returns `container_closed` error
     - "entry_blocked": Returns `cant_enter` with blocked message
     - Other: Returns `cant_enter` with reason
   - Returns valid if can enter

4. **Check Enterable Container**
   - Verifies container has `enterable` flag set
   - Returns `not_enterable` if not enterable
   - Checks if container needs to be open:
     - Uses `OpenableBehavior.isOpen()` if has OPENABLE trait
     - Returns `container_closed` if closed
   - Checks capacity using `ContainerBehavior.canAccept()`
   - Returns `too_full` if cannot accept actor

5. **Check Enterable Supporter**
   - Verifies supporter has `enterable` flag set
   - Returns `not_enterable` if not enterable
   - Checks capacity using `SupporterBehavior.canAccept()`
   - Returns `too_full` if cannot accept actor

6. **Default Rejection**
   - Returns `not_enterable` if no enterable traits found

### Return Value
- `{ valid: true }` if all checks pass
- `{ valid: false, error: string, params?: object }` if validation fails

## Execution Logic

### Phase: execute()
**Note**: This action currently combines execution and reporting in a single phase.

1. **Retrieve Entities**
   - Gets actor from context.player
   - Gets target from command.directObject.entity
   - Gets current location from world model

2. **Determine Entry Details**
   - For ENTRY trait:
     - Gets preposition from trait (defaults to "in")
     - Gets posture from trait if defined
     - Updates occupants list in trait
   - For CONTAINER trait:
     - Sets preposition to "in"
   - For SUPPORTER trait:
     - Sets preposition to "on"

3. **Update Occupancy**
   - For ENTRY trait objects:
     - Adds actor ID to occupants array
     - Ensures no duplicates

4. **Move Actor**
   - Uses `context.world.moveEntity()` to relocate actor
   - Moves from current location to target

5. **Build Event Data**
   - Creates parameters with place name and preposition
   - Adds posture if defined
   - Creates `EnteredEventData` with:
     - Target ID
     - Previous location
     - Preposition
     - Posture (optional)

6. **Generate Events**
   - Creates `if.event.entered` domain event
   - Creates `action.success` with appropriate message:
     - "entered_on" for supporters (on)
     - "entered" for containers (in)

## Reporting Logic
**Note**: Currently integrated into execute() phase - no separate report() method.

## Data Structures

### EnteredEventData
```typescript
{
  targetId: EntityId,         // ID of entered object
  fromLocation?: EntityId,    // Previous location ID
  preposition: 'in' | 'on',  // Spatial relationship
  posture?: string            // Body position (sitting, lying, etc.)
}
```

### EnteringErrorData
```typescript
{
  reason: string,      // Error reason code
  place?: string,      // Name of target place
  container?: string,  // Container name (for closed containers)
  occupants?: number,  // Current occupant count
  max?: number        // Maximum occupancy
}
```

## Traits Used

### Primary Traits
- **ENTRY** - Specialized entering trait
  - `preposition` - Spatial relationship ("in" or "on")
  - `posture` - Body position when entered
  - `occupants` - Array of entity IDs inside
  - `maxOccupants` - Occupancy limit
  - `blockedMessage` - Custom blocked message

- **CONTAINER** - Container trait
  - `enterable` - Boolean flag for enterability
  - Used with OPENABLE for closure checks

- **SUPPORTER** - Supporter trait
  - `enterable` - Boolean flag for enterability

- **OPENABLE** - Openable trait
  - Checked for container closure state

- **ACTOR** - Actor trait
  - Used to identify occupants

### Behavior Classes Used
- **EntryBehavior**
  - `canEnter()` - Validates entry permission
  - `getBlockedReason()` - Gets specific block reason
  - `getOccupants()` - Lists current occupants

- **ContainerBehavior**
  - `canAccept()` - Checks container capacity

- **SupporterBehavior**
  - `canAccept()` - Checks supporter capacity

- **OpenableBehavior**
  - `isOpen()` - Checks open/closed state

## Message Selection Logic

The success message is determined by:
1. **Preposition Type**
   - "on": Uses `entered_on` message
   - "in": Uses `entered` message

Message parameters include:
- `place` - Name of entered object
- `preposition` - Spatial relationship
- `posture` - Body position (if specified)

## Metadata

```typescript
{
  requiresDirectObject: true,
  requiresIndirectObject: false,
  directObjectScope: ScopeLevel.REACHABLE
}
```

- **Group**: `movement`
- **Direct Object**: Required, must be in REACHABLE scope
- **Indirect Object**: Not required

## Event Flow

1. **Combined Phase**
   - Validation performed
   - State changes applied
   - Events generated
   - All in single execute() method

## Special Behaviors

### Priority System
- ENTRY trait takes highest priority
- Container trait checked second
- Supporter trait checked last
- Allows objects to have multiple traits with clear precedence

### Occupancy Management
- Tracks occupants in ENTRY trait
- Respects maximum occupancy limits
- Filters actors from general contents
- Prevents duplicate occupant entries

### Posture Support
- ENTRY trait can specify posture
- Posture included in event data
- Enables sitting, lying, standing variations

### Preposition Handling
- "in" for containers and default
- "on" for supporters
- Customizable via ENTRY trait
- Affects message selection

## Integration Points

### World Model Integration
- Queries current location
- Moves entities between locations
- Updates occupancy tracking
- Queries contents for capacity checks

### Behavior System
- Delegates validation to behavior classes
- Uses behaviors for capacity checks
- Leverages existing openable logic

### Event System
- Generates domain events for state changes
- Success messages vary by entry type
- Includes movement history in events

## Error Handling

### Validation Errors
- Specific error codes for each failure type
- Contextual parameters for error messages
- Occupancy details in overflow errors
- Custom blocked messages supported

### State Consistency
- Updates occupants list atomically
- Prevents duplicate occupants
- Maintains location consistency

## Design Patterns

### Current Implementation Notes
1. **Combined Phases**
   - Does not follow three-phase pattern (ADR-051)
   - Validation and execution/reporting combined
   - No separate report() method

2. **Trait Priority**
   - Clear precedence order for multiple traits
   - ENTRY > CONTAINER > SUPPORTER
   - Allows flexible object modeling

3. **Delegation Pattern**
   - Uses behavior classes for validation
   - Centralizes capacity logic
   - Reuses openable checks

4. **Direct State Manipulation**
   - Updates occupants array directly
   - Modifies world model in execute()
   - No intermediate state management

## Limitations and Assumptions

1. **Single Actor Movement**
   - Moves only the actor, not carried items
   - No automatic movement of followers
   - No consideration of item bulk

2. **No Exit Checks**
   - Doesn't verify actor can leave current location
   - No checks for locked exits
   - Assumes movement is always possible

3. **Limited Posture System**
   - Posture is informational only
   - No mechanical effects from posture
   - No posture validation

4. **Capacity Simplification**
   - Binary capacity check (can/cannot)
   - No partial capacity consideration
   - No weight or volume calculations
# Giving Action Design Document

## Action Overview
The giving action allows actors to transfer objects to NPCs or other actors. This action handles object ownership transfer with support for recipient preferences, capacity limits, and acceptance behaviors. Recipients can accept items gratefully, reluctantly, or refuse them entirely based on their configured preferences.

## Action ID
`IFActions.GIVING`

## Required Messages
- `no_item` - No item specified to give
- `no_recipient` - No recipient specified
- `not_holding` - Item is not being held
- `recipient_not_visible` - Recipient cannot be seen
- `recipient_not_reachable` - Recipient cannot be reached
- `not_actor` - Recipient is not an actor (cannot receive items)
- `self` - Cannot give items to yourself
- `inventory_full` - Recipient's inventory is full
- `too_heavy` - Item too heavy for recipient
- `not_interested` - Recipient refuses the item
- `refuses` - Recipient refuses to accept
- `given` - Standard success message
- `accepts` - Recipient accepts the item
- `gratefully_accepts` - Recipient is pleased to receive item
- `reluctantly_accepts` - Recipient accepts but isn't happy about it

## Validation Logic

### Phase: validate()
1. **Check for Item and Recipient**
   - Verifies direct object (item) was specified
   - Returns `no_item` error if no item
   - Verifies indirect object (recipient) was specified
   - Returns `no_recipient` error if no recipient

2. **Check Recipient Type**
   - Verifies recipient has ACTOR trait
   - Returns `not_actor` error with recipient name if not an actor

3. **Prevent Self-Giving**
   - Checks if recipient ID matches actor ID
   - Returns `self` error with item name if attempting to give to self

4. **Check Inventory Capacity**
   - Supports both `capacity` and `inventoryLimit` properties
   - **Item Count Check**:
     - Gets recipient's current inventory contents
     - Compares against `maxItems` limit
     - Returns `inventory_full` error if at capacity
   - **Weight Check**:
     - Calculates total weight of recipient's inventory
     - Uses `IdentityBehavior.getWeight()` for each item
     - Adds weight of item being given
     - Returns `too_heavy` error if exceeds `maxWeight`

5. **Check Recipient Preferences**
   - Examines `preferences` object on recipient's ACTOR trait
   - **Refusal Check**:
     - Checks `refuses` array for item name matches
     - Case-insensitive substring matching
     - Returns `not_interested` error if item is refused

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
   - Gets item from command.directObject.entity
   - Gets recipient from command.indirectObject.entity

3. **Determine Acceptance Type**
   - Default: "normal" acceptance
   - Checks recipient preferences:
     - **Grateful Acceptance**:
       - Checks `likes` array for item name matches
       - Case-insensitive substring matching
       - Sets acceptance type to "grateful"
     - **Reluctant Acceptance**:
       - Only checked if not already grateful
       - Checks `dislikes` array for item name matches
       - Case-insensitive substring matching
       - Sets acceptance type to "reluctant"

4. **Build Event Data**
   - Creates `GivenEventData` with:
     - Item ID and name
     - Recipient ID and name
     - Accepted flag (always true if execution reached)

5. **Select Success Message**
   - "grateful" → `gratefully_accepts`
   - "reluctant" → `reluctantly_accepts`
   - "normal" → `given`

6. **Generate Events**
   - Creates `if.event.given` domain event
   - Creates `action.success` with selected message

## Reporting Logic
**Note**: Currently integrated into execute() phase - no separate report() method.

## Data Structures

### GivenEventData
```typescript
{
  item: string,           // ID of given item
  itemName: string,       // Display name of item
  recipient: string,      // ID of recipient
  recipientName: string,  // Display name of recipient
  accepted: boolean,      // Whether gift was accepted
  refusalReason?: string  // Reason for refusal (if refused)
}
```

### Recipient Preferences Structure
```typescript
{
  preferences: {
    likes?: string[],     // Items recipient likes
    dislikes?: string[],  // Items recipient tolerates
    refuses?: string[]    // Items recipient won't accept
  }
}
```

### Capacity Structure
```typescript
{
  capacity: {  // or inventoryLimit for backwards compatibility
    maxItems?: number,   // Maximum item count
    maxWeight?: number   // Maximum total weight
  }
}
```

## Traits Used

### Primary Traits
- **ACTOR** - Required on recipient
  - `capacity` or `inventoryLimit` - Inventory limits
  - `preferences` - Acceptance preferences
    - `likes` - Preferred items array
    - `dislikes` - Tolerated items array
    - `refuses` - Rejected items array

- **IDENTITY** - Used for weight calculation
  - Weight property accessed via `IdentityBehavior.getWeight()`

### Behavior Classes Used
- **ActorBehavior** - (Referenced but not explicitly used)
- **IdentityBehavior**
  - `getWeight()` - Gets item weight for capacity checks

## Message Selection Logic

The success message is determined by acceptance type:

1. **Preference-Based Selection**
   - Item in `likes` array: `gratefully_accepts`
   - Item in `dislikes` array: `reluctantly_accepts`
   - Item not in any array: `given`

2. **Refusal Messages**
   - Item in `refuses` array: `not_interested` (validation failure)

Message parameters always include:
- `item` - Name of given item
- `recipient` - Name of recipient

## Metadata

```typescript
{
  requiresDirectObject: true,
  requiresIndirectObject: true,
  directObjectScope: ScopeLevel.CARRIED,
  indirectObjectScope: ScopeLevel.REACHABLE
}
```

- **Group**: `social`
- **Direct Object**: Required, must be CARRIED
- **Indirect Object**: Required, must be REACHABLE

## Event Flow

1. **Combined Phase**
   - Validation performed
   - Re-validation in execute
   - Preference evaluation
   - Events generated
   - All in single execute() method

## Special Behaviors

### Preference System
- Three-tier preference model:
  - Likes: Positive reception
  - Dislikes: Reluctant acceptance
  - Refuses: Complete rejection
- Case-insensitive matching
- Substring-based matching
- Priority: refuses > likes > dislikes

### Capacity Management
- Dual limit system:
  - Item count limits
  - Weight limits
- Backwards compatibility with `inventoryLimit`
- Cumulative weight calculation
- Pre-transfer validation

### Acceptance Variations
- Message varies by recipient preference
- Emotional context in responses
- No mechanical difference in outcome

## Integration Points

### World Model Integration
- Queries inventory contents
- Does not directly transfer items (handled by events)
- Weight calculation through entities

### Behavior System
- Uses IdentityBehavior for weight
- Future integration point for ActorBehavior

### Event System
- Single domain event for transfer
- Success messages reflect emotional context
- Transfer logic handled by event processors

## Error Handling

### Validation Errors
- Specific error codes for each failure type
- Contextual parameters for all errors
- Recipient and item names included
- Graceful handling of missing preferences

### Preference Handling
- Safe navigation of preference arrays
- Default to normal acceptance
- Case-insensitive comparison
- Substring matching for flexibility

### Capacity Checks
- Supports multiple capacity formats
- Handles missing capacity definitions
- Zero-weight items handled correctly
- Undefined limits treated as unlimited

## Design Patterns

### Current Implementation Notes
1. **Combined Phases**
   - Does not follow three-phase pattern (ADR-051)
   - Validation repeated in execute()
   - No separate report() method

2. **Preference Matching**
   - Substring-based for flexibility
   - Case-insensitive for robustness
   - Array-based for multiple matches

3. **Backwards Compatibility**
   - Supports both `capacity` and `inventoryLimit`
   - Graceful fallback for missing properties
   - Future-proof structure

4. **Emotional Context**
   - Preferences affect messaging only
   - No mechanical gameplay differences
   - Rich narrative possibilities

## Limitations and Assumptions

1. **No Actual Transfer**
   - Action doesn't move items
   - Assumes event processor handles transfer
   - No rollback on failure

2. **Simple Preference Matching**
   - Basic substring matching
   - No regex or pattern support
   - No conditional preferences

3. **Binary Acceptance**
   - Items are accepted or refused
   - No partial acceptance
   - No negotiation mechanics

4. **Limited Weight System**
   - Simple additive weight
   - No volume considerations
   - No item stacking

5. **No Counter-Offers**
   - Recipient cannot suggest alternatives
   - No trading mechanics
   - One-way transfer only
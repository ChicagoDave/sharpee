# Eating Action Design Document

## Action Overview
The eating action allows actors to consume edible items. This action handles food consumption, including multi-portion items, taste descriptions, nutritional effects, and hunger satisfaction. The action distinguishes between solid food and drinks (drinks use the DRINKING action).

## Action ID
`IFActions.EATING`

## Required Messages
- `no_item` - No item specified to eat
- `not_visible` - Item is not visible
- `not_reachable` - Item cannot be reached
- `not_edible` - Item cannot be eaten
- `is_drink` - Item is a drink (should use DRINKING instead)
- `already_consumed` - Item has already been consumed
- `eaten` - Standard success message
- `eaten_all` - All portions consumed
- `eaten_some` - Partial portions consumed
- `eaten_portion` - Single portion consumed
- `delicious` - High-quality food consumed
- `tasty` - Good-quality food consumed
- `bland` - Plain food consumed
- `awful` - Poor-quality food consumed
- `filling` - Food that satisfies hunger
- `still_hungry` - Food that doesn't satisfy hunger
- `satisfying` - Satisfying meal
- `poisonous` - Poisonous food consumed
- `nibbled` - Used with "nibble" verb
- `tasted` - Used with "taste" verb
- `devoured` - Used with "devour" verb
- `munched` - Used with "munch" verb

## Validation Logic

### Phase: validate()
1. **Check for Target Item**
   - Verifies that a direct object was specified
   - Returns `no_item` error if no item specified

2. **Check Edibility**
   - Verifies item has the EDIBLE trait
   - Returns `not_edible` error with item name if not edible

3. **Check Item Type**
   - Checks if item is marked as a drink
   - Returns `is_drink` error if item should use DRINKING action

4. **Check Consumption Status**
   - Checks if item has already been consumed
   - Returns `already_consumed` error if already eaten

### Return Value
- `{ valid: true }` if all checks pass
- `{ valid: false, error: string, params?: object }` if validation fails

## Execution Logic

### Phase: execute()
**Note**: This action currently combines validation, execution, and reporting in a single phase.

1. **Re-validate**
   - Calls validate() again at start of execution
   - Returns error event if validation fails

2. **Check Item Location**
   - Determines if item is held by actor
   - Prepares for implicit take if not held

3. **Implicit Take**
   - If item not held, generates implicit take event
   - Creates `if.event.taken` with implicit flag

4. **Build Event Data**
   - Creates base eaten event data with item ID and name
   - Adds nutritional information if available
   - Adds portion information if multi-portion item
   - Calculates remaining portions

5. **Determine Message**
   - Selects base message based on:
     - Portion status (some/all)
     - Taste quality (delicious/tasty/bland/awful)
     - Effects (poisonous)
     - Hunger satisfaction (filling/still_hungry)
     - Verb variation (nibble/taste/devour/munch)

6. **Generate Events**
   - Creates `if.event.eaten` with complete data
   - Creates `action.success` with selected message

## Reporting Logic
**Note**: Currently integrated into execute() phase - no separate report() method.

## Data Structures

### EatenEventData
```typescript
{
  item: EntityId,              // ID of eaten item
  itemName: string,           // Display name of item
  nutrition?: number,         // Nutritional value
  portions?: number,          // Total portions
  portionsRemaining?: number, // Portions left after eating
  effects?: string[],         // Side effects (e.g., "poison")
  satisfiesHunger?: boolean   // Whether satisfies hunger
}
```

### ImplicitTakenEventData
```typescript
{
  implicit: boolean,  // Always true for implicit takes
  item: EntityId,     // ID of taken item
  itemName: string    // Display name of item
}
```

### EatingErrorData
```typescript
{
  reason: string,     // Error reason code
  item?: string       // Item name (when applicable)
}
```

## Traits Used

### Primary Traits
- **EDIBLE** - Required trait for consumable items
  - `isDrink` - Distinguishes drinks from food
  - `consumed` - Tracks consumption status
  - `nutrition` - Nutritional value
  - `portions` - Number of servings
  - `taste` - Quality descriptor
  - `effects` - Side effects array
  - `satisfiesHunger` - Hunger satisfaction flag

### Behavior Classes Used
- **EdibleBehavior** - (Referenced but not explicitly used in current implementation)

## Message Selection Logic

The success message is determined by a hierarchy of conditions:

1. **Portion Status**
   - Multiple portions with some remaining: `eaten_some`
   - Last portion or single portion: `eaten_all` or `eaten`

2. **Taste Quality** (overrides portion message)
   - "delicious": `delicious` message
   - "tasty" or "good": `tasty` message
   - "bland" or "plain": `bland` message
   - "awful" or "terrible": `awful` message

3. **Effects** (highest priority)
   - Contains "poison": `poisonous` message

4. **Hunger Satisfaction**
   - `satisfiesHunger === true`: `filling` message
   - `satisfiesHunger === false`: `still_hungry` message

5. **Verb Variations** (applied to base messages)
   - "nibble": `nibbled` message
   - "taste": `tasted` message
   - "devour": `devoured` message
   - "munch": `munched` message

## Metadata

```typescript
{
  requiresDirectObject: true,
  requiresIndirectObject: false,
  directObjectScope: ScopeLevel.REACHABLE
}
```

- **Group**: `interaction`
- **Direct Object**: Required, must be in REACHABLE scope
- **Indirect Object**: Not required

## Event Flow

1. **Combined Phase**
   - Validation performed
   - State changes applied
   - Events generated
   - All in single execute() method

## Special Behaviors

### Implicit Taking
- If item not held, automatically picks it up
- Generates implicit take event before eating event
- Allows eating items directly from environment

### Multi-Portion Items
- Tracks remaining portions after consumption
- Different messages for partial vs complete consumption
- Portion count decremented with each eating action

### Quality and Effects
- Taste descriptors affect message selection
- Nutritional values passed in event data
- Effects array can trigger special messages
- Poisonous items get warning message

## Integration Points

### World Model Integration
- Queries item location for implicit take
- Uses entity traits for edibility checks
- No explicit state changes (handled by behaviors)

### Event System
- Generates domain events for eaten items
- Includes implicit take events when needed
- Success messages vary based on context

## Error Handling

### Validation Errors
- Specific error codes for each failure type
- Item name included in error parameters
- Early return prevents execution

### Missing Data Handling
- Graceful fallback for missing trait properties
- Default values for undefined portions
- Safe navigation for nested properties

## Design Patterns

### Current Implementation Notes
1. **Combined Phases**
   - Does not follow three-phase pattern (ADR-051)
   - Validation, execution, and reporting combined
   - Re-validates at start of execute()

2. **Implicit Actions**
   - Automatic taking when item not held
   - Transparent to user experience
   - Generates appropriate events

3. **Message Selection Hierarchy**
   - Priority-based message selection
   - Effects override quality
   - Quality overrides portions
   - Verb variations as final modifier

4. **Property Detection**
   - Dynamic property checking on traits
   - Flexible handling of optional properties
   - Extensible for story-specific attributes

## Limitations and Assumptions

1. **No State Modification**
   - Action doesn't directly modify item state
   - Assumes behaviors handle consumption tracking
   - No world model updates performed

2. **Single Portion Consumption**
   - Consumes one portion per action
   - No variable portion sizes
   - No partial portion consumption

3. **No Container Checks**
   - Doesn't verify if item in closed container
   - Assumes scope system handles accessibility
   - No special handling for contained items
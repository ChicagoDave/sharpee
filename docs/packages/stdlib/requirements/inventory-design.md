# Inventory Action Design Document

## Action Overview
The inventory action allows players to check what they are carrying. This is treated as an observable action where the player physically checks their pockets or bag, which NPCs can notice. The action queries the world model directly for carried items, separates worn items from held items, calculates weight burden if applicable, and generates appropriate display messages.

## Action ID
`IFActions.INVENTORY`

## Required Messages
- `inventory_empty` - No items carried
- `carrying` - Standard carrying message
- `wearing` - Only wearing items
- `carrying_and_wearing` - Both carrying and wearing items
- `holding_list` - List of held items
- `worn_list` - List of worn items
- `checking_pockets` - Flavor text for checking inventory
- `rifling_through_bag` - Alternative flavor text
- `inventory_header` - Header for inventory display
- `nothing_at_all` - Alternative empty message
- `hands_empty` - Alternative empty message
- `pockets_empty` - Alternative empty message
- `carrying_count` - Count of carried items
- `wearing_count` - Count of worn items
- `burden_light` - Light weight burden
- `burden_heavy` - Heavy weight burden
- `burden_overloaded` - Overloaded weight burden

## Validation Logic

### Phase: validate()
**Note**: The validate method performs all calculations but doesn't use the results.

1. **Query Inventory**
   - Gets all contents of player entity from world model
   - Represents everything the player carries

2. **Separate Worn from Held**
   - Filters items with WEARABLE trait and `worn` flag
   - Creates two lists: worn items and holding items
   - Items without WEARABLE trait default to holding

3. **Calculate Weight Burden**
   - Checks if player has ACTOR trait with `inventoryLimit`
   - If weight limit exists:
     - Sums weight from IDENTITY trait of all items
     - Calculates total weight
     - Stores weight limit

4. **Build Event Data**
   - Creates comprehensive inventory data:
     - Actor and location IDs
     - Item counts (total, held, worn)
     - Empty status
     - Item lists with names and IDs
     - Weight information if applicable
     - Burden status calculation

5. **Determine Burden Status**
   - If weight limit exists and items carried:
     - >= 90% capacity: "overloaded"
     - >= 75% capacity: "heavy"
     - < 75% capacity: "light"

6. **Check Command Variations**
   - Detects short forms ("i" or "inv")
   - Sets `brief` flag for condensed output

7. **Select Message**
   - Empty inventory: Random selection from empty messages
   - Both held and worn: `carrying_and_wearing`
   - Only worn: `wearing`
   - Only held: `carrying`

8. **Prepare Display Data**
   - Creates comma-separated item lists
   - Selects burden message if applicable

### Return Value
- Always returns `{ valid: true }` (no validation failures possible)

## Execution Logic

### Phase: execute()
**Note**: This action duplicates ALL logic from validate() phase.

1. **Repeat All Validation Logic**
   - Queries inventory again
   - Separates worn from held again
   - Calculates weight burden again
   - Builds event data again
   - Determines burden status again
   - Checks command variations again
   - Selects messages again
   - Prepares display data again

2. **Generate Events**
   - Creates `if.action.inventory` observable event
   - Creates main `action.success` with selected message
   - Adds `holding_list` success event if items held
   - Adds `worn_list` success event if items worn
   - Adds burden status success event if applicable

## Reporting Logic
**Note**: No separate report() method - all logic in execute().

## Data Structures

### InventoryEventData
```typescript
{
  actorId: string,              // ID of actor checking inventory
  locationId: string,           // Current location ID
  totalItems: number,           // Total item count
  heldItems: number,            // Non-worn item count
  wornItems: number,            // Worn item count
  isEmpty: boolean,             // No items carried
  carried: InventoryItem[],     // Held items list
  worn: InventoryItem[],        // Worn items list
  items: InventoryItem[],       // All items with worn status
  totalWeight?: number,         // Current weight carried
  maxWeight?: number,           // Weight capacity
  weightLimit?: number,         // Same as maxWeight
  weightPercentage?: number,    // Weight as percentage
  burden?: string,              // Burden status
  brief?: boolean               // Brief output requested
}
```

### InventoryItem
```typescript
{
  id: string,      // Entity ID
  name: string,    // Display name
  worn?: boolean   // Worn status
}
```

### InventoryState (Internal)
```typescript
{
  holding: IFEntity[],          // Held entities
  worn: IFEntity[],             // Worn entities
  carried: IFEntity[],          // All carried entities
  messageId: string,            // Selected message
  params: Record<string, any>,  // Message parameters
  eventData: InventoryEventData, // Event data
  holdingList?: string,         // Formatted held list
  wornList?: string,            // Formatted worn list
  burdenMessage?: string,       // Burden message ID
  totalWeight?: number,         // Total weight
  weightLimit?: number          // Weight limit
}
```

## Traits Used

### Primary Traits
- **WEARABLE** - Identifies wearable items
  - `worn` - Boolean flag for worn status

- **ACTOR** - Player trait for inventory limits
  - `inventoryLimit.maxWeight` - Weight capacity

- **IDENTITY** - Item properties
  - `weight` - Item weight value

## Message Selection Logic

1. **Empty Inventory**
   - Randomly selects from:
     - `inventory_empty`
     - `nothing_at_all`
     - `hands_empty`
     - `pockets_empty`

2. **Items Present**
   - Both held and worn: `carrying_and_wearing`
   - Only worn: `wearing`
   - Only held: `carrying`

3. **Additional Messages**
   - `holding_list` if items held
   - `worn_list` if items worn
   - Burden message if weight limit exists

Message parameters include:
- `holdingCount` - Number of held items
- `wearingCount` - Number of worn items
- `items` - Comma-separated item names
- `weight` - Current weight
- `limit` - Weight limit

## Metadata

```typescript
{
  requiresDirectObject: false,
  requiresIndirectObject: false
}
```

- **Group**: `meta`
- **Direct Object**: Not required
- **Indirect Object**: Not required

## Event Flow

1. **Validation Phase**
   - Performs all calculations
   - Results discarded
   - Always returns valid

2. **Execution Phase**
   - Repeats all calculations
   - Generates multiple events:
     - Observable inventory event
     - Main success message
     - Optional list messages
     - Optional burden message

## Special Behaviors

### Observable Action
- Generates `if.action.inventory` event
- NPCs can detect and react
- Treated as physical action

### Weight Burden System
- Three burden levels based on percentage
- Automatic calculation from item weights
- Optional feature (requires inventoryLimit)

### Message Variation
- Random selection for empty inventory
- Prevents repetitive responses
- Adds narrative variety

### Brief Mode
- Detected from command shortcuts
- Sets brief flag in event data
- Text service can provide condensed output

### Multi-Event Response
- Up to 4 success events generated
- Structured display output
- Separate messages for different aspects

## Integration Points

### World Model Integration
- Direct query for entity contents
- No state modification
- Real-time inventory status

### Trait System
- Checks multiple traits for features
- Graceful handling of missing traits
- Extensible for new item properties

### Event System
- Observable action event
- Multiple success events
- Structured data for text services

## Error Handling

### Missing Data Handling
- Safe navigation for trait properties
- Default values for missing weights
- Graceful fallback for undefined limits

### Empty Inventory
- Special handling with varied messages
- No list events generated
- Clear empty status indication

## Design Patterns

### Current Implementation Notes
1. **Complete Duplication**
   - Entire logic duplicated between validate and execute
   - Identical calculations performed twice
   - Maintenance burden and inefficiency

2. **Observable Pattern**
   - Inventory check is visible action
   - NPCs can observe and react
   - Adds realism to game world

3. **Multi-Message Output**
   - Structured display through multiple events
   - Separation of concerns for display
   - Flexible formatting options

4. **Random Variation**
   - Prevents repetitive messaging
   - Adds narrative interest
   - Simple randomization strategy

## Limitations and Assumptions

1. **Performance Impact**
   - All calculations done twice
   - Unnecessary duplication
   - Could impact performance with many items

2. **No Caching**
   - Recalculates everything
   - No state preservation
   - Validate results ignored

3. **Simple Weight System**
   - Linear weight addition
   - No item stacking
   - No volume considerations

4. **Limited Customization**
   - Fixed burden thresholds
   - No per-story configuration
   - Hard-coded message selection

5. **No Sorting**
   - Items listed in storage order
   - No grouping by type
   - No prioritization

## Recommended Improvements

1. **Eliminate Duplication**
   - Calculate once in validate
   - Pass state to execute
   - Reduce computation

2. **Configurable Thresholds**
   - Allow story-specific burden levels
   - Customizable message pools
   - Flexible weight systems

3. **Item Categorization**
   - Group similar items
   - Sort by importance
   - Better organization

4. **Performance Optimization**
   - Cache calculations
   - Incremental updates
   - Lazy evaluation
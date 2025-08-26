# Putting Action Design

## Overview
The putting action handles placing objects into containers or onto supporters. This action has been migrated to the three-phase pattern (validate/execute/report) and properly delegates to behavior classes. It intelligently determines the appropriate preposition based on target traits.

## Required Messages
- `no_target` - No item specified
- `no_destination` - No destination specified
- `not_held` - Item not being carried
- `not_container` - Target is not a container
- `not_surface` - Target is not a surface/supporter
- `container_closed` - Container must be opened first
- `already_there` - Item already in/on destination
- `put_in` - Success message for containers
- `put_on` - Success message for supporters
- `cant_put_in_itself` - Cannot put item inside itself
- `cant_put_on_itself` - Cannot put item on itself
- `no_room` - Container has no room
- `no_space` - Supporter has no space

## Validation Logic

### 1. Basic Validation
- **Item check**: Must have direct object (`no_target`)
- **Destination check**: Must have indirect object (`no_destination`)
- **Self-reference check**: Cannot put item in/on itself (`cant_put_in_itself`, `cant_put_on_itself`)
- **Already placed check**: Item already at destination (`already_there`)

### 2. Preposition Determination
Complex logic to determine target preposition:

#### With User-Specified Preposition
- `in/into/inside` + container → use 'in'
- `on/onto` + supporter → use 'on'
- Mismatched combinations → error (`not_container` or `not_surface`)

#### Auto-Determination (No Preposition)
- Prefer container over supporter if both traits present
- Container → use 'in'
- Supporter → use 'on'
- Neither → error (`not_container`)

### 3. Container-Specific Validation
For 'in' preposition:
- **Openable check**: Uses `OpenableBehavior.isOpen()` (`container_closed`)
- **Capacity check**: Uses `ContainerBehavior.canAccept()` (`no_room`)

### 4. Supporter-Specific Validation
For 'on' preposition:
- **Space check**: Uses `SupporterBehavior.canAccept()` (`no_space`)

## Execution Flow

### 1. Re-determine Preposition
**Minor duplication**: Repeats preposition determination logic
- Could be optimized by storing in validation result

### 2. Store Context Data
- Stores `_targetPreposition` for report phase
- Stores `_putResult` from behavior delegation

### 3. Delegate to Behaviors
Based on preposition:
- **For 'in'**: `ContainerBehavior.addItem(target, item, world)`
- **For 'on'**: `SupporterBehavior.addItem(target, item, world)`

## Report Phase

### 1. Error Handling
- Validation errors: Captures entity snapshots for context
- Execution errors: Generic failure message

### 2. Process Behavior Results
Handles failure cases from behaviors:

#### Container Result Failures
- `alreadyContains` → `already_there` error
- `containerFull` → `no_room` error
- Generic failure → `cant_put` error

#### Supporter Result Failures
- `alreadyThere` → `already_there` error
- `noSpace` → `no_space` error
- Generic failure → `cant_put` error

### 3. Success Events
Generates two events per success:

#### For Containers
1. `if.event.put_in`:
   ```typescript
   {
     itemId: item.id,
     targetId: target.id,
     preposition: 'in',
     itemSnapshot: EntitySnapshot,
     targetSnapshot: EntitySnapshot
   }
   ```
2. `action.success` with `put_in` message

#### For Supporters
1. `if.event.put_on`:
   ```typescript
   {
     itemId: item.id,
     targetId: target.id,
     preposition: 'on',
     itemSnapshot: EntitySnapshot,
     targetSnapshot: EntitySnapshot
   }
   ```
2. `action.success` with `put_on` message

## Data Structures

### IAddItemResult (Container)
```typescript
interface IAddItemResult {
  success: boolean;
  alreadyContains?: boolean;
  containerFull?: boolean;
}
```

### IAddItemToSupporterResult
```typescript
interface IAddItemToSupporterResult {
  success: boolean;
  alreadyThere?: boolean;
  noSpace?: boolean;
}
```

### Event Data
Both `put_in` and `put_on` events include:
- `itemId` - ID of item being placed
- `targetId` - ID of destination
- `preposition` - 'in' or 'on'
- `itemSnapshot` - Complete item state
- `targetSnapshot` - Complete target state

## Traits and Behaviors

### Target Traits
- `CONTAINER` - For putting items inside
- `SUPPORTER` - For putting items on top
- `OPENABLE` - Affects container access

### Behaviors Used
- `ContainerBehavior`:
  - `canAccept()` - Validates capacity
  - `addItem()` - Performs placement
- `SupporterBehavior`:
  - `canAccept()` - Validates space
  - `addItem()` - Performs placement
- `OpenableBehavior`:
  - `isOpen()` - Checks if container accessible

## Message Selection Logic
1. **Validation errors** based on specific failure
2. **Success messages**:
   - `put_in` - For containers
   - `put_on` - For supporters

Parameters vary by message:
- Container messages: `item`, `container`
- Supporter messages: `item`, `surface`
- Error messages: Context-specific parameters

## Integration Points
- **World model**: Location queries and updates
- **Behavior delegation**: Proper use of behavior classes
- **Event system**: Atomic events with snapshots
- **Scope system**: Carried and reachable validation

## Current Implementation Notes

### Strengths
1. **Three-phase pattern**: Proper separation of concerns
2. **Behavior delegation**: Correctly uses behavior classes
3. **Atomic events**: Complete snapshots included
4. **Smart preposition handling**: Auto-determines based on traits
5. **Comprehensive validation**: All edge cases covered

### Minor Issues
1. **Preposition re-determination**: Logic duplicated in execute
2. **Context casting**: Uses `(context as any)` for phase data
3. **Separate events**: Different events for in/on (could be unified)

### Patterns Observed
1. **Result caching**: Stores behavior results for report phase
2. **Dual event emission**: Domain and UI events
3. **Snapshot inclusion**: Atomic state capture

## Recommended Improvements
1. **Unify preposition logic**: Store in validation result
2. **Type-safe context**: Proper typing for phase data
3. **Event consolidation**: Single put event with preposition field
4. **Implicit taking**: Auto-take if item nearby but not held
5. **Bulk operations**: Put multiple items at once

## Usage Examples

### Put in Container
```
> put key in box
You put the brass key in the wooden box.
```

### Put on Supporter
```
> put book on table
You put the book on the table.
```

### Auto-Determined Preposition
```
> put coin chest
You put the coin in the chest.
```

### Error Cases
```
> put box in itself
You can't put the box inside itself.

> put vase closed cabinet
The cabinet is closed.

> put elephant tiny box
There's no room in the tiny box.
```
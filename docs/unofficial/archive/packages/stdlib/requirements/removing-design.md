# Removing Action Design

## Overview
The removing action handles taking objects from containers or supporters, essentially a targeted form of taking. This action has been migrated to the three-phase pattern and properly delegates to behavior classes for both removal and taking operations.

## Required Messages
- `no_target` - No item specified
- `no_source` - No source container/supporter specified
- `not_in_container` - Item not in the specified container
- `not_on_surface` - Item not on the specified surface
- `container_closed` - Container must be opened first
- `removed_from` - Success message for containers
- `removed_from_surface` - Success message for supporters
- `cant_reach` - Item out of reach
- `already_have` - Already holding the item

## Validation Logic

### 1. Basic Validation
- **Item check**: Must have direct object (`no_target`)
- **Source check**: Must have indirect object (`no_source`)
- **Already held check**: Uses `ActorBehavior.isHolding()` (`already_have`)

### 2. Location Validation
- **Item location check**: Verifies item is actually in/on source
- Different error messages based on source type:
  - Container → `not_in_container`
  - Supporter → `not_on_surface`
  - Other → defaults to `not_in_container`

### 3. Container-Specific Checks
For containers:
- **Openable check**: Uses `OpenableBehavior.isOpen()` (`container_closed`)

### 4. Taking Capacity
- Uses `ActorBehavior.canTakeItem()` to validate actor can take the item
- Returns `cannot_take` if validation fails

## Execution Flow

### 1. Remove from Source
Delegates based on source type:
- **Container**: `ContainerBehavior.removeItem(source, item, world)`
- **Supporter**: `SupporterBehavior.removeItem(source, item, world)`
- Stores result as `_removeResult`

### 2. Take Item
- Uses `ActorBehavior.takeItem(actor, item, world)`
- Stores result as `_takeResult`

### Clean Separation
Unlike many actions, removing properly delegates all operations to behaviors with no logic duplication.

## Report Phase

### 1. Error Handling
Standard error handling with entity snapshots for context

### 2. Process Remove Result
Checks behavior result for failures:
- Container `notContained` → `not_in_container`
- Supporter `notThere` → `not_on_surface`
- Generic failure → `cant_remove`

### 3. Process Take Result
Checks taking result for failures:
- `tooHeavy` → `too_heavy`
- `inventoryFull` → `container_full`
- Generic failure → `cant_take`

### 4. Success Events
Generates two events:

#### Taken Event (`if.event.taken`)
```typescript
{
  item: item.name,
  fromLocation: source.id,
  container: source.name,
  fromContainer: boolean,
  fromSupporter: boolean,
  itemSnapshot: EntitySnapshot,
  actorSnapshot: EntitySnapshot,
  sourceSnapshot: EntitySnapshot
}
```

#### Success Message
- `removed_from` for containers
- `removed_from_surface` for supporters

## Data Structures

### IRemoveItemResult (Container)
```typescript
interface IRemoveItemResult {
  success: boolean;
  notContained?: boolean;
}
```

### IRemoveItemFromSupporterResult
```typescript
interface IRemoveItemFromSupporterResult {
  success: boolean;
  notThere?: boolean;
}
```

### ITakeItemResult
```typescript
interface ITakeItemResult {
  success: boolean;
  tooHeavy?: boolean;
  inventoryFull?: boolean;
}
```

## Traits and Behaviors

### Source Traits
- `CONTAINER` - For removing from inside
- `SUPPORTER` - For removing from surface
- `OPENABLE` - Affects container access

### Behaviors Used
- `ContainerBehavior`:
  - `removeItem()` - Removes from container
- `SupporterBehavior`:
  - `removeItem()` - Removes from surface
- `OpenableBehavior`:
  - `isOpen()` - Checks container accessibility
- `ActorBehavior`:
  - `isHolding()` - Checks if already held
  - `canTakeItem()` - Validates taking capacity
  - `takeItem()` - Performs the taking

## Message Selection Logic
1. **Error messages** based on validation/execution failures
2. **Success messages**:
   - `removed_from` - From containers
   - `removed_from_surface` - From supporters

Parameters:
- Container: `item`, `container`
- Supporter: `item`, `surface`

## Integration Points
- **World model**: Location queries and updates
- **Behavior delegation**: Proper use of multiple behaviors
- **Event system**: Reuses `if.event.taken` from taking action
- **Scope system**: Reachable scope for objects

## Current Implementation Notes

### Strengths
1. **Three-phase pattern**: Proper separation of concerns
2. **Full behavior delegation**: All operations delegated
3. **No logic duplication**: Clean execution
4. **Atomic events**: Complete snapshots included
5. **Reuses taking event**: Consistent with taking action

### Minor Issues
1. **Context casting**: Uses `(context as any)` for phase data
2. **Type complexity**: Complex type casting for event data
3. **Missing messages**: Some defined messages not used

### Patterns Observed
1. **Two-step operation**: Remove then take
2. **Result chaining**: Checks both operation results
3. **Event reuse**: Uses existing taking event

## Recommended Improvements
1. **Type-safe context**: Proper typing for phase data
2. **Simplify event types**: Reduce type casting complexity
3. **Bulk operations**: Remove multiple items at once
4. **Partial removal**: Support removing specific quantities
5. **Permission system**: Check ownership/access rights

## Usage Examples

### Remove from Container
```
> remove key from box
You take the brass key from the wooden box.
```

### Remove from Surface
```
> remove book from table
You take the book from the table.
```

### Error Cases
```
> remove coin from chest
The chest is closed.

> remove elephant from box
The elephant isn't in the box.

> remove feather from hand
You're already carrying the feather.
```

## Relationship to Taking
Removing is essentially taking with a specified source:
- `take key` - Takes from anywhere accessible
- `remove key from box` - Takes specifically from box
- Both use same underlying behaviors
- Both emit same `if.event.taken` event
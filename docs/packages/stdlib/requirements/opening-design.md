# Opening Action Design

## Overview
The opening action allows players to open containers and doors, revealing their contents. This action has been migrated to the three-phase pattern (validate/execute/report) for atomic event generation. It properly delegates to `OpenableBehavior` and `LockableBehavior` for validation and execution.

## Required Messages
- `no_target` - No object specified to open
- `not_openable` - Object cannot be opened (lacks openable trait)
- `already_open` - Object is already open
- `locked` - Object is locked and must be unlocked first
- `opened` - Success message for opening
- `revealing` - Success message when contents are revealed
- `its_empty` - Success message when opening empty container
- `cant_reach` - Object is out of reach

## Validation Logic

### 1. Target Validation
- **Check for target**: Ensures direct object exists (`no_target`)
- **Check openability**: Verifies target has `OPENABLE` trait (`not_openable`)

### 2. State Validation
- **Open state check**: Uses `OpenableBehavior.canOpen()` to verify not already open (`already_open`)
- **Lock check**: If has `LOCKABLE` trait, uses `LockableBehavior.isLocked()` (`locked`)

## Execution Flow

### 1. Delegate to Behavior
- Calls `OpenableBehavior.open(noun)` to perform actual opening
- Receives `IOpenResult` with success status and optional details
- Stores result in context for report phase using `(context as any)._openResult`

## Report Phase

### 1. Error Handling
Handles validation and execution errors:
- **Validation errors**: Captures entity snapshots for error context
- **Execution errors**: Returns generic execution failure

### 2. Check Behavior Result
If behavior reports failure:
- Check `alreadyOpen` flag → emit `already_open` error
- Default fallback → emit generic `cannot_open` error

### 3. Build Event Data
Uses data builder to create base event data:
```typescript
{
  target: noun.name,
  targetSnapshot: EntitySnapshot,
  contentsSnapshots: EntitySnapshot[],
  targetId: noun.id
}
```

Then extends with additional fields:
```typescript
{
  containerId: noun.id,
  containerName: noun.name,
  isContainer: boolean,
  isDoor: boolean,
  isSupporter: boolean,
  hasContents: boolean,
  contentsCount: number,
  contentsIds: EntityId[],
  revealedItems: number,
  item: noun.name
}
```

### 4. Message Selection
- **Empty container**: Uses `its_empty` message
- **Default**: Uses `opened` message

### 5. Emit Events
Generates three events:
1. **Domain event** (`opened`):
   ```typescript
   {
     targetId: noun.id,
     targetName: noun.name,
     customMessage?: string,
     sound?: string,
     revealsContents?: boolean
   }
   ```

2. **Action event** (`if.event.opened`):
   Full event data with all fields

3. **Success event** (`action.success`):
   Selected message with appropriate params

## Data Structures

### OpenedEventData
```typescript
interface OpenedEventData {
  targetId: EntityId;
  targetName: string;
  containerId: EntityId;      // Duplicate for compatibility
  containerName: string;       // Duplicate for compatibility
  isContainer?: boolean;
  isDoor?: boolean;
  isSupporter?: boolean;
  hasContents?: boolean;
  contentsCount?: number;
  contentsIds?: EntityId[];
  revealedItems?: number;
  targetSnapshot?: EntitySnapshot;
  contentsSnapshots?: EntitySnapshot[];
}
```

### IOpenResult (from behavior)
```typescript
interface IOpenResult {
  success: boolean;
  alreadyOpen?: boolean;
  openMessage?: string;      // Custom success message
  openSound?: string;        // Sound effect
  revealsContents?: boolean; // Whether contents revealed
}
```

## Traits and Behaviors

### Required Traits
- `OPENABLE` - Target must have this trait

### Optional Traits
- `LOCKABLE` - Affects validation (must be unlocked)
- `CONTAINER` - Affects event data and messaging
- `DOOR` - Affects event data
- `SUPPORTER` - Affects event data

### Behaviors Used
- `OpenableBehavior`:
  - `canOpen()` - Validates can be opened
  - `open()` - Performs the opening
- `LockableBehavior`:
  - `isLocked()` - Checks lock state

## Message Selection Logic
1. **Error messages** based on validation failure
2. **Success messages**:
   - `its_empty` - When opening empty container
   - `opened` - Default success message

Message parameters:
- `item` - Name of opened object
- `container` - Name of container (for empty message)

## Integration Points
- **World model**: Queries entity contents
- **Behavior delegation**: Relies on `OpenableBehavior` for state changes
- **Event system**: Emits multiple domain and UI events
- **Snapshot system**: Creates atomic state captures

## Current Implementation Notes

### Strengths
1. **Three-phase pattern**: Proper separation of concerns
2. **Atomic events**: Complete state snapshots
3. **Proper delegation**: Uses behaviors correctly
4. **Multiple event types**: Domain, action, and UI events
5. **Content revelation**: Tracks what was revealed

### Patterns Observed
1. **Result caching**: Stores behavior result for report phase
2. **Multi-event**: Generates three events per success
3. **Backward compatibility**: Maintains duplicate fields
4. **Data builder usage**: Uses centralized data building

### Design Issues
1. **Result passing**: Uses context casting to pass result between phases
2. **Duplicate fields**: Maintains both targetId and containerId
3. **Mixed event types**: Emits both old (`opened`) and new (`if.event.opened`) events

## Recommended Improvements
1. **Clean result passing**: Use proper context fields for result storage
2. **Event consolidation**: Remove duplicate event types
3. **Automatic opening**: Support implicit opening when taking from closed container
4. **Bulk operations**: Support opening multiple items
5. **Partial opening**: Support doors that open partially (ajar, wide open)

## Usage Examples

### Open Container
```
> open chest
You open the wooden chest, revealing a brass key and a silver coin.
```

### Open Empty Container
```
> open box
You open the box. It's empty.
```

### Open Door
```
> open door
You open the door.
```

### Error Cases
```
> open window
The window cannot be opened.

> open chest
The chest is already open.

> open safe
The safe is locked.
```
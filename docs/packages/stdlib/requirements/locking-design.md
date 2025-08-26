# Locking Action Design

## Overview
The locking action allows players to lock containers and doors, preventing them from being opened. This action properly delegates to the `LockableBehavior` for validation and execution, and follows the validate/execute pattern with clear separation of concerns.

## Required Messages
- `no_target` - No object specified to lock
- `not_lockable` - Object cannot be locked (lacks lockable trait)
- `no_key` - Key required but not specified
- `wrong_key` - Wrong key for this lock
- `already_locked` - Object is already locked
- `not_closed` - Can't lock something that's open
- `locked` - Success message for simple locking
- `locked_with` - Success message when locked with a key
- `cant_reach` - Object is out of reach
- `key_not_held` - Don't have the specified key

## Validation Logic

### 1. Target Validation
- **Check for target**: Ensures direct object exists (`no_target`)
- **Check lockability**: Verifies target has `LOCKABLE` trait (`not_lockable`)

### 2. State Validation
Using `LockableBehavior.canLock()`:
- **Already locked check**: Prevents locking already locked items (`already_locked`)
- **Open state check**: For openable items, ensures they're closed first (`not_closed`)

### 3. Key Validation
If `LockableBehavior.requiresKey()` returns true:
- **Key specified**: Ensures a key was provided (`no_key`)
- **Key possession**: Verifies player has the key (`key_not_held`)
- **Key compatibility**: Validates key works with this lock using `canLockWith()` (`wrong_key`)

## Execution Flow

### 1. Delegate to Behavior
- Calls `LockableBehavior.lock(noun, withKey)` to perform actual locking
- Receives `ILockResult` with success status and optional details

### 2. Handle Behavior Result
If behavior reports failure (shouldn't happen after validation):
- Check `alreadyLocked` flag → emit `already_locked` error
- Check `notClosed` flag → emit `not_closed` error
- Check `noKey` flag → emit `no_key` error
- Check `wrongKey` flag → emit `wrong_key` error
- Default fallback → emit generic `cannot_lock` error

### 3. Build Success Event Data
Creates `LockedEventData`:
```typescript
{
  targetId: noun.id,
  targetName: noun.name,
  isContainer?: true,  // if has CONTAINER trait
  isDoor?: true,       // if has DOOR trait
  keyId?: withKey.id,
  keyName?: withKey.name,
  sound?: result.lockSound
}
```

### 4. Emit Events
- `if.event.locked` - Domain event with lock details
- `action.success` - UI message event with appropriate message:
  - `locked` - Simple lock without key
  - `locked_with` - Lock with specific key

## Data Structures

### LockedEventData
```typescript
interface LockedEventData {
  targetId: EntityId;      // What was locked
  targetName: string;
  keyId?: EntityId;        // Key used (if any)
  keyName?: string;
  isContainer?: boolean;   // Type flags
  isDoor?: boolean;
  sound?: string;          // Lock sound effect
}
```

### ILockResult (from behavior)
```typescript
interface ILockResult {
  success: boolean;
  alreadyLocked?: boolean;
  notClosed?: boolean;
  noKey?: boolean;
  wrongKey?: boolean;
  lockSound?: string;
}
```

## Traits and Behaviors

### Required Traits
- `LOCKABLE` - Target must have this trait
- `OPENABLE` - Optional, but affects validation (must be closed)
- `CONTAINER` - Optional, affects messaging
- `DOOR` - Optional, affects messaging

### Behaviors Used
- `LockableBehavior`:
  - `canLock()` - Validates lock state
  - `isLocked()` - Checks current lock state
  - `requiresKey()` - Determines if key needed
  - `canLockWith()` - Validates key compatibility
  - `lock()` - Performs the locking
- `OpenableBehavior`:
  - `isOpen()` - Checks if item is open

## Message Selection Logic
1. **Error messages** based on validation failure reason
2. **Success messages**:
   - `locked` - Default success message
   - `locked_with` - When a key was used

Message parameters include:
- `item` - Name of locked object
- `key` - Name of key (when applicable)
- `isContainer` - Boolean flag for containers
- `isDoor` - Boolean flag for doors

## Integration Points
- **World model**: Queries entity locations for key possession check
- **Player inventory**: Validates key is held by actor
- **Event system**: Emits domain and UI events
- **Behavior delegation**: Relies on `LockableBehavior` for state changes

## Error Handling
- Comprehensive validation prevents most runtime errors
- Behavior result checking as fallback safety
- All error conditions have specific messages
- Parameters passed for contextual error messages

## Current Implementation Notes

### Strengths
1. **Proper delegation**: Uses behaviors correctly for validation and execution
2. **Clean separation**: Validate and execute phases are distinct
3. **No duplication**: Validation logic not repeated in execute
4. **Rich event data**: Includes type flags and sound effects
5. **Comprehensive validation**: Checks all preconditions

### Patterns Observed
1. **Behavior-centric**: Delegates complex logic to behavior classes
2. **Result objects**: Uses structured results from behaviors
3. **Type checking**: Adds contextual flags based on traits
4. **Sound support**: Includes audio feedback in events

## Recommended Improvements
1. **Scope validation**: Add reachability checks using scope system
2. **NPC support**: Allow NPCs to lock things
3. **Bulk operations**: Support locking multiple items
4. **Event ordering**: Consider before/after lock events for interruption
5. **Key alternatives**: Support lockpicks or magic unlocking

## Usage Examples

### Simple Lock (no key)
```
> lock chest
You lock the chest.
```

### Lock with Key
```
> lock door with brass key
You lock the door with the brass key.
```

### Error Cases
```
> lock window
The window cannot be locked.

> lock open chest  
You can't lock something that's open.

> lock door
You need a key to lock the door.
```
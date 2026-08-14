# Unlocking Action Design

## Overview
The unlocking action unlocks containers and doors, properly delegating to `LockableBehavior` for validation and execution. As the inverse of locking, it follows good patterns with clean separation and minimal duplication.

## Required Messages
- `no_target` - No object specified
- `not_lockable` - Object cannot be locked
- `no_key` - Key required but not specified
- `wrong_key` - Wrong key for this lock
- `already_unlocked` - Object already unlocked
- `unlocked` - Success message (no key)
- `unlocked_with` - Success message (with key)
- `cant_reach` - Object out of reach
- `key_not_held` - Don't have the key
- `still_locked` - Still locked (unused)

## Validation Logic

### 1. Target Validation
- **Check for target**: Must exist (`no_target`)
- **Check lockability**: Must have LOCKABLE trait (`not_lockable`)

### 2. State Validation
- **Can unlock check**: Uses `LockableBehavior.canUnlock()` (`already_unlocked`)

### 3. Key Validation
If `LockableBehavior.requiresKey()`:
- **Key specified**: Must provide key (`no_key`)
- **Key possession**: Player must hold key (`key_not_held`)
- **Key compatibility**: Uses `canUnlockWith()` (`wrong_key`)

## Execution Flow

### Clean Implementation
Comments note: "Assumes validation has already passed"

### 1. Delegate to Behavior
- Calls `LockableBehavior.unlock(noun, withKey)`
- Returns `IUnlockResult`

### 2. Handle Failure (Defensive)
Checks result for failures:
- `alreadyUnlocked` → `already_unlocked`
- `noKey` → `no_key`
- `wrongKey` → `wrong_key`
- Default → `cannot_unlock`

### 3. Gather Information
- Container/door type checking
- Contents counting
- Auto-open detection

### 4. Build Event Data
Comprehensive data including:
- Target information
- Container/door flags
- Key details (if used)
- Contents metadata
- Sound effects
- Auto-open flag

### 5. Message Selection
- With key → `unlocked_with`
- No key → `unlocked`

## Data Structures

### UnlockedEventData
```typescript
interface UnlockedEventData {
  targetId: EntityId;
  targetName: string;
  containerId: EntityId;  // Duplicate for compatibility
  containerName: string;  // Duplicate for compatibility
  isContainer: boolean;
  isDoor: boolean;
  requiresKey: boolean;
  hasContents: boolean;
  contentsCount: number;
  contentsIds: EntityId[];
  sound?: string;
  willAutoOpen: boolean;
  keyId?: EntityId;
  keyName?: string;
}
```

### IUnlockResult (from behavior)
```typescript
interface IUnlockResult {
  success: boolean;
  alreadyUnlocked?: boolean;
  noKey?: boolean;
  wrongKey?: boolean;
  unlockSound?: string;
}
```

## Traits and Behaviors

### Required Traits
- `LOCKABLE` - Target must have

### Optional Traits
- `CONTAINER` - Affects event data
- `DOOR` - Affects event data
- `OPENABLE` - For auto-open check

### Behaviors Used
- `LockableBehavior`:
  - `canUnlock()` - Validation
  - `requiresKey()` - Key requirement
  - `canUnlockWith()` - Key compatibility
  - `unlock()` - State change

## Integration Points
- **World model**: Location queries for key
- **Behavior delegation**: Proper use of LockableBehavior
- **Event system**: Domain and UI events
- **Auto-open**: Integration with openable

## Current Implementation Notes

### Strengths
1. **Proper delegation**: Uses behaviors correctly
2. **Clean separation**: Validation and execution distinct
3. **No duplication**: Clean implementation
4. **Clear comments**: Documents assumptions
5. **Defensive checks**: Handles behavior failures

### Minor Issues
1. **No three-phase pattern**: Could use report phase
2. **Duplicate fields**: targetId/containerId redundancy
3. **Unused message**: `still_locked` defined but unused

## Recommended Improvements
1. **Add report phase**: Move events to report
2. **Clean up fields**: Remove duplicate fields
3. **Add pick support**: Lock picking mechanics
4. **Batch unlocking**: Unlock multiple items
5. **Force unlock**: Magic or strength-based

## Usage Examples

### Simple Unlock
```
> unlock door
You unlock the door.
```

### Unlock with Key
```
> unlock chest with brass key
You unlock the chest with the brass key.
```

### Error Cases
```
> unlock window
The window cannot be unlocked.

> unlock door
The door is already unlocked.

> unlock safe
You need a key to unlock the safe.
```

## Relationship to Locking
- Inverse of locking action
- Similar structure and delegation
- Uses same behaviors
- Should maintain parallel implementation
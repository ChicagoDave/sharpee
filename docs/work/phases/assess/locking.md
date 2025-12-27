# Locking Action - IF Logic Assessment

## Action Overview
**Action ID**: `LOCKING`
**Description**: Locks containers and doors with optional key requirements

## What It Does in IF Terms
The locking action allows the player to secure lockable objects (containers, doors) by setting their locked state to true. It implements IF semantics around:
- Preventing objects from being opened when locked
- Requiring a closed state before locking (can't lock an open door)
- Optionally requiring a specific key to perform the lock action
- Handling containers and doors distinctly for messaging

## Core IF Validations Implemented

### 1. Target Validation
- ✓ Has target: Requires a direct object (noun)
- ✓ Is lockable: Target must have LOCKABLE trait

### 2. State Validations
- ✓ Not already locked: Prevents redundant locking
- ✓ Is closed: For openable objects, must be closed before locking (can't lock an open door)

### 3. Key Requirements
- ✓ Key required check: Some lockables require a specific key to lock
- ✓ Key held: If required, player must be holding the key
- ✓ Key validity: The provided key must match the lockable's keyId or keyIds array

### 4. Reachability
- ✓ Target reachable: Uses REACHABLE scope level to ensure object is accessible

## Current Implementation Coverage

**Validate Phase**: Comprehensive
- Performs pre-condition checks through behavior methods (canLock, requiresKey, canLockWith)
- Delegates to shared lock validation helper (validateKeyRequirements)
- Handles state conflicts (already locked, open but openable)

**Execute Phase**: Proper delegation
- Calls LockableBehavior.lock() which handles all mutations
- Captures behavior result flags (alreadyLocked, wrongKey, noKey, notClosed)
- Falls back to error handling if behavior reports failure
- Stores result data (key, sound, target info) in sharedData

**Report Phase**: Well-structured
- Generates if.event.locked semantic event with full context
- Creates action.success event with appropriate message
- Supports differentiated messages for locked/locked_with based on key usage

**Blocked Phase**: Proper error reporting
- Returns action.blocked event with validation error message

## Basic IF Expectations Met?

**YES** - The implementation covers all fundamental IF locking semantics:

1. Objects can be locked/unlocked based on their lockable state
2. Certain objects require being closed before locking
3. Some objects require a key held by the player to lock
4. The key provided must be the correct key
5. Duplicate actions (locking already locked) are prevented
6. Different object types (doors vs containers) are tracked and reported

## Potential Gaps

### None identified in core IF logic

The implementation is solid for basic IF expectations. All standard locking preconditions are validated before execution, behavior mutations are properly delegated, and failures are appropriately reported.

### Note on Edge Cases (Out of Scope)
- Locked objects preventing examination/interaction: Handled elsewhere (not locking action)
- Key reachability/visibility: Not action concern
- Custom lock messages/sounds: Supported through trait configuration

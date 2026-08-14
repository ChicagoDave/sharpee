# Wearing Action Design

## Overview
The wearing action handles putting on clothing and wearable items, delegating to `WearableBehavior` for state changes. It shows partial logic duplication with complex layering and body part conflict checking embedded in the execute phase rather than properly separated.

## Required Messages
- `no_target` - No object specified
- `not_wearable` - Object cannot be worn
- `not_held` - Item not held (unused in current implementation)
- `already_wearing` - Already wearing that/another item
- `worn` - Success message
- `cant_wear_that` - Cannot wear that item
- `hands_full` - Layering conflict message

## Validation Logic

### 1. Target Validation
- **Check for target**: Must exist (`no_target`)
- **Check wearability**: Must have WEARABLE trait (`not_wearable`)

### 2. Behavior Delegation
- Uses `WearableBehavior.canWear()` for validation
- Returns `already_wearing` if worn
- Returns `cant_wear_that` for other failures

### Clean Validation
No conflict checking in validation phase - deferred to execute

## Execution Flow

### ISSUE: Complex Logic in Execute
Lines 74-120 contain complex conflict checking that should be in validation or delegated to behavior

### 1. Location Check
- Checks if item is held by actor
- Generates implicit TAKEN event if not held

### 2. Body Part Conflicts (Lines 74-97)
Complex nested logic for:
- Checking for items on same body part
- Ignoring if items support layering
- Finding conflicting worn items
- **Should be in validation or behavior**

### 3. Layering Rules (Lines 99-119)
Even more complex logic for:
- Finding all worn items
- Checking layer numbers
- Validating layer ordering
- **Definitely should be in validation**

### 4. Behavior Delegation
- Calls `WearableBehavior.wear(item, actor)`
- Handles failure cases defensively

### 5. Event Generation
- WORN event with body part and layer
- Success message with item name

## Data Structures

### WornEventData
```typescript
interface WornEventData {
  itemId: EntityId;
  bodyPart?: string;
  layer?: number;
}
```

### ImplicitTakenEventData
```typescript
interface ImplicitTakenEventData {
  implicit: boolean;
  item: string;
}
```

### WearableTrait
```typescript
interface WearableTrait {
  worn: boolean;
  bodyPart?: string;
  layer?: number;
  // Other properties inferred from usage
}
```

### IWearResult (from behavior)
```typescript
interface IWearResult {
  success: boolean;
  alreadyWorn?: boolean;
  wornByOther?: string;
}
```

## Traits and Behaviors

### Required Traits
- `WEARABLE` - Item must have

### Behaviors Used
- `WearableBehavior`:
  - `canWear()` - Validation check
  - `wear()` - State change

## Current Implementation Issues

### Logic Placement Problems
1. **Conflict checking in execute**: 46 lines of validation logic (74-120)
2. **Should be in validate**: Body part and layering checks
3. **Or in behavior**: Complex rules belong in WearableBehavior
4. **TODO comment**: Line 73 acknowledges this issue

### Design Issues
1. **No three-phase pattern**: Missing report phase
2. **Validation incomplete**: Only basic checks
3. **Execute too complex**: Mixed concerns
4. **Scope metadata**: Uses REACHABLE but also checks location

### Good Patterns
1. **Proper delegation**: Uses WearableBehavior for state
2. **Defensive checks**: Handles behavior failures
3. **Implicit taking**: Handles reachable items properly

## Recommended Improvements

### Immediate Fixes
1. **Move conflict logic to validation**:
```typescript
validate() {
  // Basic checks
  // Body part conflicts
  // Layering rules
  return { valid: true, state: conflicts };
}
```

2. **Or delegate to behavior**:
```typescript
validate() {
  return WearableBehavior.canWearWithConflicts(item, actor);
}
```

3. **Implement three-phase pattern**: Separate report phase

### Proper Implementation
```typescript
validate(): ValidationResult {
  // All validation including conflicts
  const conflicts = checkConflicts();
  const layering = checkLayering();
  return { 
    valid: true, 
    state: { conflicts, layering }
  };
}

execute(): void {
  // Only state changes
  WearableBehavior.wear(item, actor);
}

report(): ISemanticEvent[] {
  // Generate events based on stored state
}
```

### Feature Enhancements
1. **Outfit system**: Wear multiple items at once
2. **Size checking**: Items must fit
3. folklore **Style compatibility**: Fashion rules
4. **Equipment slots**: RPG-style slots
5. **Encumbrance**: Weight from worn items

## Usage Examples

### Simple Wear
```
> wear shirt
You put on the shirt.
```

### Already Wearing
```
> wear hat
You're already wearing the hat.
```

### Body Part Conflict
```
> wear gloves
You're already wearing the mittens.
```

### Layering
```
> wear coat
You put on the coat over your shirt.
```

### Implicit Taking
```
> wear shoes
(first taking the shoes)
You put on the shoes.
```

## Implementation Notes

### Conflict Logic Misplacement
The 46 lines of conflict checking in execute (lines 74-120) represent validation logic that runs after validation has supposedly passed. This violates the validate/execute separation principle.

### TODO Acknowledgment
Line 73 contains a TODO comment recognizing that conflict checking should be moved to WearableBehavior, indicating awareness of the design issue.

### Scope vs Location
The action declares `directObjectScope: REACHABLE` but then manually checks location in execute, suggesting confusion about scope handling.

## Comparison with Taking Off
This is the inverse of the taking_off action and should maintain parallel structure. Both actions should handle:
- Body part conflicts
- Layering rules
- Implicit actions (taking vs dropping)
- Similar validation patterns
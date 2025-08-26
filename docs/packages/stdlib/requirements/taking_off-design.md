# Taking Off Action Design

## Overview
The taking off action removes worn clothing or equipment, handling layering rules and cursed items. It properly delegates to `WearableBehavior` with some validation logic in execute that should be in validate.

## Required Messages
- `no_target` - No item specified
- `not_wearing` - Item not being worn
- `removed` - Successfully removed
- `cant_remove` - Cannot be removed (cursed)
- `prevents_removal` - Another item prevents removal

## Validation Logic

### 1. Basic Validation
- **Target check**: Must exist (`no_target`)
- **Wearable check**: Must have WEARABLE trait (`not_wearing`)
- **Can remove check**: Uses `WearableBehavior.canRemove()`
  - Not worn → `not_wearing`
  - Worn by other → `not_wearing`
  - Cannot remove → `cant_remove`

## Execution Flow

### ISSUE: Validation in Execute
**Layering and curse checks done in execute instead of validate:**
- Lines 59-80: Layering conflict check
- Lines 83-90: Cursed item check
- These should be in validate phase

### 1. Layering Check (Misplaced)
Checks for items worn over this one:
- Same body part
- Higher layer number
- Returns `prevents_removal` if blocked

### 2. Curse Check (Misplaced)
- Checks `cursed` property
- Returns `cant_remove` if cursed

### 3. Delegate to Behavior
- Calls `WearableBehavior.remove(item, actor)`
- Handles state change

### 4. Error Handling
Defensive checks for behavior result:
- `notWorn` → `not_wearing`
- `wornByOther` → `not_wearing` with actor info
- Default → `cant_remove`

## Data Structures

### RemovedEventData
```typescript
interface RemovedEventData {
  itemId: EntityId;
  bodyPart?: string;
  layer?: number;
}
```

### WearableTrait
```typescript
interface WearableTrait {
  worn: boolean;
  wornBy?: EntityId;
  bodyPart?: string;
  layer?: number;
  cursed?: boolean;
}
```

## Traits and Behaviors

### Required Traits
- `WEARABLE` - Must have for removal

### Behaviors Used
- `WearableBehavior`:
  - `canRemove()` - Validation check
  - `remove()` - State change

## Layering System

### Layer Numbers
Items with higher layer numbers must be removed first:
- Underwear: layer 0
- Shirt: layer 1
- Jacket: layer 2

### Body Parts
Layering only applies to same body part:
- torso, head, hands, feet, etc.

## Current Implementation Issues

### Critical Problems
1. **Validation in execute**: Layering and curse checks misplaced
2. **No three-phase pattern**: Missing report phase
3. **Inconsistent validation**: Some checks in validate, others in execute

### Design Issues
1. **Direct trait access**: Uses `as any` for cursed
2. **Manual layering check**: Should be in behavior
3. **Limited error messages**: Generic cant_remove

## Recommended Improvements

### Immediate Fixes
1. **Move validation to validate phase**:
   - Layering checks
   - Curse checks
   - All preconditions
2. **Implement three-phase pattern**
3. **Add to WearableBehavior**:
   - `hasLayeringConflict()`
   - `isCursed()`

### Feature Enhancements
1. **Multi-remove**: Remove all worn items
2. **Force remove**: Override curse with magic
3. **Quick change**: Swap worn items
4. **Outfit system**: Remove complete outfits
5. **Damage effects**: Torn/damaged items

## Usage Examples

### Simple Removal
```
> take off shirt
You take off the shirt.
```

### Layering Conflict
```
> take off shirt
You need to remove the jacket first.
```

### Cursed Item
```
> remove cursed ring
The ring won't come off!
```

### Error Cases
```
> take off rock
You're not wearing that.

> take off someone else's hat
You're not wearing that.
```

## Relationship to Wearing
- Inverse of wearing action
- Uses same trait and behavior
- Should have parallel validation logic
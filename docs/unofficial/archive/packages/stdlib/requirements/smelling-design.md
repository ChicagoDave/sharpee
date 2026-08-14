# Smelling Action Design

## Overview
The smelling action allows players to detect scents from objects or the environment. This sensory action checks for various scent sources (food, burning items, containers) and exhibits complete logic duplication between validate and execute phases.

## Required Messages
- `not_visible` - Target not visible
- `too_far` - Target in different room
- `no_scent` - No detectable scent
- `room_scents` - General room scents
- `food_nearby` - Food scent detected
- `smoke_detected` - Smoke from burning items
- `no_particular_scent` - Object has no scent
- `food_scent` - Edible item scent
- `drink_scent` - Drinkable item scent
- `burning_scent` - Burning light source
- `container_food_scent` - Food inside container
- `musty_scent` - Musty smell
- `fresh_scent` - Fresh smell
- `smelled` - Generic smell message
- `smelled_environment` - Smelled surroundings

## Validation Logic

### 1. Target Validation
If target specified:
- Different room check → `too_far`
- Scope handled by CommandValidator

### 2. Scent Detection for Objects
Checks in order:
- **EDIBLE trait**:
  - `isDrink` → `drink_scent`
  - Otherwise → `food_scent`
- **LIGHT_SOURCE trait**:
  - If `isLit` → `burning_scent`
- **CONTAINER + OPENABLE**:
  - If open with edible contents → `container_food_scent`
- Default → `no_particular_scent`

### 3. Environment Smelling
If no target:
- Scans location contents
- Tracks food items and lit light sources
- Priority:
  1. Smoke → `smoke_detected`
  2. Food → `food_nearby`
  3. Any scents → `room_scents`
  4. Nothing → `no_scent`

## Execution Flow

### CRITICAL ISSUE: Complete Logic Duplication
**Entire validation logic repeated:**
- Re-checks all traits
- Rescans environment
- Rebuilds scent sources
- Recalculates message selection

### Duplicated Operations
- Container content filtering (lines 103-111, 218-227)
- Environment scanning (lines 124-145, 237-256)
- Message determination logic
- Event data building

## Data Structures

### SmelledEventData
```typescript
interface SmelledEventData {
  target?: EntityId;
  hasScent?: boolean;
  scentType?: 'edible' | 'drinkable' | 'burning' | 'container_contents';
  scentSources?: EntityId[];
  smellingEnvironment?: boolean;
  roomId?: EntityId;
}
```

## Traits and Behaviors

### Traits Checked
- `EDIBLE` - Food/drink scents
- `LIGHT_SOURCE` - Burning scents
- `CONTAINER` - Contents checking
- `OPENABLE` - Access to contents

### No Behaviors Used
- Direct trait manipulation only
- No scent behavior class

## Message Selection Logic

### Object Smelling
1. Edible → food/drink based on `isDrink`
2. Lit light → burning
3. Open container with food → container food
4. Default → no particular scent

### Environment Smelling
Priority order:
1. Smoke (highest)
2. Food
3. Any scent sources
4. No scent (lowest)

## Integration Points
- **World model**: Content queries
- **Trait system**: Direct trait checking
- **Scope system**: Detectable scope

## Current Implementation Issues

### Critical Problems
1. **Complete duplication**: All logic repeated (120+ lines)
2. **No state preservation**: Everything recalculated
3. **No three-phase pattern**: Missing report phase
4. **Performance impact**: Double scanning

### Design Issues
1. **No scent trait**: Uses proxy traits (edible, light)
2. **Limited scent types**: Only 4 categories
3. **No scent strength**: Binary detection
4. **No custom scents**: Can't add unique smells

## Recommended Improvements

### Immediate Fixes
1. **Implement three-phase pattern**
2. **Store validation results**
3. **Create ScentBehavior class**
4. **Add SCENT trait**

### Feature Enhancements
1. **Scent strength**: Distance-based detection
2. **Custom scents**: Unique smells per object
3. **Scent mixing**: Multiple scents combine
4. **Wind effects**: Scent direction
5. **Scent memory**: Remember previous smells

## Usage Examples

### Smell Object
```
> smell bread
You smell fresh bread.
```

### Smell Environment
```
> smell
You detect the aroma of food nearby.
```

### Burning Item
```
> smell torch
You smell burning wood and pitch.
```

### Container Contents
```
> smell open basket
You smell food from inside the basket.
```

### Error Cases
```
> smell distant object
It's too far away to smell.

> smell rock
It has no particular scent.
```
# Throwing Action Design

## Overview
The throwing action handles throwing objects at targets or in directions, with complex physics including hit/miss calculations, fragility checks, and breaking mechanics. Like talking, it calls validate from execute to avoid duplication.

## Required Messages
- `no_item` - No item specified
- `not_holding` - Not carrying item
- `target_not_visible` - Target not visible
- `target_not_here` - Target in different room
- `no_exit` - No exit in direction
- `too_heavy` - Item too heavy to throw
- `self` - Cannot throw at self
- `thrown` - Basic thrown message
- `thrown_down` - Dropped gently
- `thrown_gently` - Gentle toss
- `thrown_at` - Thrown at target
- `hits_target` - Hit the target
- `misses_target` - Missed the target
- `bounces_off` - Bounces off closed container
- `lands_on` - Lands on supporter
- `lands_in` - Lands in container
- `thrown_direction` - Thrown in direction
- `sails_through` - Goes through exit
- `breaks_on_impact` - Breaks when landing
- `breaks_against` - Breaks against target
- `fragile_breaks` - Fragile item breaks
- `target_ducks` - Target dodges
- `target_catches` - Target catches item
- `target_angry` - Target becomes angry

## Validation Logic

### 1. Basic Checks
- Item must exist (`no_item`)

### 2. Target Validation (if throwing at)
- Same room required (`target_not_here`)
- Cannot be self (`self`)

### 3. Direction Validation (if throwing direction)
- Parse direction string to constant
- Check exit exists (`no_exit`)

### 4. Weight Check
For targeted/directional throws:
- Weight > 10kg → `too_heavy`

## Execution Flow

### Pattern: Calls Validate
Like talking, calls `this.validate()` at start

### 1. Throw Type Determination
Three types:
- `at_target` - Throwing at entity
- `directional` - Throwing through exit
- `general` - Just dropping

### 2. Fragility Detection
Keyword-based detection:
- Checks name and description
- Keywords: glass, crystal, delicate, fragile, bottle, vase, china, porcelain

### 3. Hit Calculation (Target Throws)

#### Against Actors
- Base 70% hit chance
- Agility check for dodging
- Catch ability check (30% if capable)
- Caught items go to target inventory

#### Against Objects
- 90% hit chance for stationary targets

### 4. Breaking Logic

#### Different by Context
- **Hit target**: 80% break if fragile
- **Directional**: 50% break on landing
- **General**: 30% break even gentle

### 5. Final Location

#### Based on Outcome
- **Caught**: Target inventory
- **Lands on supporter**: On target
- **Lands in open container**: In target
- **Through exit**: Next room
- **Breaks**: No location (destroyed)
- **Default**: Current room floor

### 6. Random Elements
Multiple `Math.random()` calls:
- Hit chance
- Catch chance
- Break chance
- All non-deterministic

## Data Structures

### ThrowingEventData
```typescript
interface ThrowingEventData {
  item: EntityId;
  itemName: string;
  throwType: 'at_target' | 'directional' | 'general';
  isFragile: boolean;
  weight: number;
  willBreak: boolean;
  finalLocation: EntityId | null;
  target?: EntityId;
  targetName?: string;
  direction?: DirectionType;
  hit?: boolean;
}
```

## Physics System

### Hit Chances
- Actors: 70% base
- Objects: 90% base
- Modified by agility

### Break Chances
- Against target: 80%
- Direction landing: 50%
- Gentle drop: 30%

### Weight Limit
- 10kg maximum for throwing
- No limit for dropping

## Current Implementation Issues

### Critical Problems
1. **Random in execution**: Non-deterministic behavior
2. **No physics behaviors**: All logic inline
3. **Keyword fragility**: Brittle detection system
4. **No trajectory**: Simple hit/miss

### Design Issues
1. **Magic numbers**: Hardcoded percentages
2. **No strength system**: Fixed weight limit
3. **Limited reactions**: Only anger for actors
4. **No partial damage**: Break or intact only

## Recommended Improvements

### Immediate Fixes
1. **Move randomization to separate phase**
2. **Create ThrowableBehavior**
3. **Add FRAGILE trait**
4. **Implement proper physics**

### Feature Enhancements
1. **Trajectory system**: Arc calculations
2. **Damage system**: Partial damage
3. **Skill-based**: Throwing skill affects accuracy
4. **Reaction variety**: Different NPC responses
5. **Ricochet**: Bouncing mechanics

## Usage Examples

### Throw at Target
```
> throw ball at window
The ball hits the window and shatters it!
```

### Throw Direction
```
> throw key north
The key sails through the doorway to the north.
```

### Target Catches
```
> throw apple to child
The child catches the apple.
```

### Fragile Break
```
> throw vase
The vase shatters as it hits the ground.
```

### Error Cases
```
> throw boulder
It's too heavy to throw.

> throw ball at distant target
They're not here.
```
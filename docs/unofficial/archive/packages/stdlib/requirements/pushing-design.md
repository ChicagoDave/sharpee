# Pushing Action Design

## Overview
The pushing action handles pushing various objects including buttons, heavy items, and moveable scenery. Like pulling, this action demonstrates trait-based behavior differentiation but suffers from significant logic duplication between validate and execute phases.

## Required Messages
- `no_target` - No object specified
- `not_visible` - Object not visible
- `not_reachable` - Object not reachable
- `too_heavy` - Too heavy to push
- `wearing_it` - Cannot push worn items
- `button_pushed` - Button pushed
- `button_clicks` - Button clicks when pushed
- `switch_toggled` - Switch toggles state
- `pushed_direction` - Pushed in a direction
- `pushed_nudged` - Nudged slightly
- `pushed_with_effort` - Pushed with great effort
- `reveals_passage` - Pushing reveals hidden passage
- `wont_budge` - Won't move
- `pushing_does_nothing` - No effect
- `fixed_in_place` - Scenery cannot be moved

## Validation Logic

### 1. Basic Validation
- **Target check**: Must have direct object (`no_target`)
- **Worn items**: Cannot push items being worn (`wearing_it`)
- **Pushability check**:
  - If not pushable and has `SCENERY` trait → `fixed_in_place`
  - If not pushable → `pushing_does_nothing`
  - Must have `PUSHABLE` trait to proceed

### 2. Push Type Processing
Based on `pushType` in PUSHABLE trait:

#### Button Type
- Sets `activated = true`
- Checks for `SWITCHABLE` trait:
  - If switchable: Records current/new state
  - Message selection:
    - Has `BUTTON` trait → `button_clicks`
    - Otherwise → `switch_toggled`
  - No switchable → `button_pushed`
- Includes push sound if specified

#### Heavy Type
- Records strength requirements
- With direction:
  - `moved = true`, `moveDirection = direction`
  - Message: `pushed_with_effort`
- Without direction:
  - `moved = false`, `nudged = true`
  - Message: `wont_budge`

#### Moveable Type
- With direction:
  - `moved = true`, `moveDirection = direction`
  - If `revealsPassage` → message: `reveals_passage`
  - Otherwise → message: `pushed_direction`
- Without direction:
  - `moved = false`, `nudged = true`
  - Message: `pushed_nudged`
- Includes push sound if specified

#### Default Type
- Fallback: `pushing_does_nothing`

### 3. Message Parameter Building
Creates minimal parameters based on message type:
- Button messages: `target` only
- Switch toggle: `target` and `newState`
- Directional pushes: `target` and `direction`
- Heavy pushes: `target`, optional `direction` and `requiresStrength`

## Execution Flow

### ISSUE: Logic Duplication
**Similar to pulling, most validation logic is duplicated in execute:**
- Re-checks trait presence
- Rebuilds event data from scratch
- Repeats push type processing
- Recalculates message selection

Notable differences from validation:
- Different message IDs in some cases (`button_toggles` vs `switch_toggled`)
- Default case handles `requiresStrength` differently

### Execution Steps
1. **Verify target and trait** (redundant check)
2. **Rebuild event data** completely
3. **Repeat push type processing**
4. **Generate events**:
   - `if.event.pushed` - Main push event
   - `action.success` - Success message

## Data Structures

### PushedEventData
```typescript
interface PushedEventData {
  target: EntityId;
  targetName: string;
  direction?: string;
  pushType?: 'button' | 'heavy' | 'moveable';
  
  // Activation
  activated?: boolean;
  
  // Switching
  willToggle?: boolean;
  currentState?: boolean;
  newState?: boolean;
  
  // Movement
  moved?: boolean;
  moveDirection?: string;
  nudged?: boolean;
  
  // Special effects
  revealsPassage?: boolean;
  requiresStrength?: number;
  sound?: string;
}
```

### PushableTrait
```typescript
interface PushableTrait {
  pushType?: 'button' | 'heavy' | 'moveable';
  requiresStrength?: number;
  pushSound?: string;
  revealsPassage?: boolean;
}
```

## Traits and Behaviors

### Required Traits
- `PUSHABLE` - Must have for pushing

### Optional Traits
- `WEARABLE` - Check if worn
- `SCENERY` - Fixed in place
- `SWITCHABLE` - Toggle functionality
- `BUTTON` - Button-specific behavior

### Trait Interactions
- `PUSHABLE` + `SWITCHABLE` → Toggle switch behavior
- `PUSHABLE` + `BUTTON` → Button click behavior
- `PUSHABLE` + `SCENERY` → Fixed object (error)

## Message Selection Logic
Based on:
1. Push type (button/heavy/moveable)
2. Presence of direction parameter
3. Additional trait combinations
4. Special flags (revealsPassage)

## Integration Points
- **World model**: Location queries for worn items
- **Event system**: Push event emission
- **Sound system**: Push sound effects
- **Hidden mechanics**: Passage revelation

## Current Implementation Issues

### Critical Problems
1. **Logic duplication**: Validation logic repeated in execute
2. **Message ID inconsistency**: Different IDs between phases
3. **No state preservation**: Rebuilds everything
4. **No three-phase pattern**: Should use validate/execute/report

### Design Issues
1. **Limited physics**: No actual strength checking
2. **Simple movement**: No collision detection
3. **Mixed concerns**: UI and logic intertwined
4. **Type safety**: Requires type casting

## Recommended Improvements

### Immediate Fixes
1. **Implement three-phase pattern**
2. **Store validation state**
3. **Consolidate message IDs**
4. **Extract push type handlers**

### Feature Enhancements
1. **Strength system**: Actual player strength checks
2. **Push puzzles**: Multi-object arrangements
3. **Push chains**: One push triggers another
4. **Gradual movement**: Progress-based pushing
5. **Surface effects**: Different surfaces affect pushing

## Usage Examples

### Button
```
> push button
You push the button and it clicks.
```

### Heavy Object with Direction
```
> push crate north
With great effort, you push the heavy crate northward.
```

### Moveable Revealing Passage
```
> push bookshelf west
You push the bookshelf westward, revealing a hidden passage!
```

### Nudging
```
> push statue
You give the statue a nudge, but it barely moves.
```

### Error Cases
```
> push shirt
You're wearing it!

> push wall
That's fixed in place.

> push feather
Pushing the feather does nothing.
```
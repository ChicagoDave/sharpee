# Pulling Action Design

## Overview
The pulling action handles various types of pulling interactions including levers, cords, bell pulls, attached items, and heavy objects. This action demonstrates extensive trait-based behavior differentiation but suffers from complete logic duplication between validate and execute phases.

## Required Messages
- `no_target` - No object specified
- `not_visible` - Object not visible  
- `not_reachable` - Object not reachable
- `not_pullable` - Object cannot be pulled
- `too_heavy` - Too heavy to pull
- `wearing_it` - Cannot pull worn items
- `wont_budge` - Object won't budge
- **Lever messages**:
  - `lever_pulled` - Generic lever pulled
  - `lever_clicks` - Lever clicks into position
  - `lever_toggled` - Lever toggles switch
  - `lever_stuck` - Lever is stuck
  - `lever_springs_back` - Spring-loaded lever returns
- **Cord messages**:
  - `cord_pulled` - Generic cord pulled
  - `bell_rings` - Bell pull rings bell
  - `cord_activates` - Cord activates something
  - `cord_breaks` - Cord breaks from force
- **Attachment messages**:
  - `comes_loose` - Attached item detaches
  - `firmly_attached` - Cannot detach
  - `tugging_useless` - Loose but won't detach
- **Heavy object messages**:
  - `pulled_direction` - Pulled in direction
  - `pulled_nudged` - Nudged slightly
  - `pulled_with_effort` - Pulled with great effort
- **Generic messages**:
  - `pulling_does_nothing` - No effect
  - `fixed_in_place` - Immovable
  - `already_pulled` - Already pulled
  - `max_pulls_reached` - Maximum pulls exceeded

## Validation Logic

### 1. Basic Validation
- **Target check**: Must have direct object (`no_target`)
- **Worn items**: Cannot pull items being worn (`wearing_it`)
- **Pullability**: Must have `PULLABLE` trait (`not_pullable`)

### 2. Pull Limit Validation
- **Max pulls**: Check `maxPulls` limit (`max_pulls_reached`)
- **Repeatability**: Check `repeatable` flag and `pullCount` (`already_pulled`)

### 3. Strength Requirements
Different handling by pull type:
- **Standard items**: Player strength must meet `requiresStrength`
- **Heavy objects**: Allow up to 4x player strength with effort
- **Cords**: Handle strength requirements differently
- Default player strength: 10

### 4. Pull Type Processing
Complex branching based on `pullType`:

#### Lever Type
- Check `LEVER` trait
- Check if stuck
- Determine position change (up/down/neutral)
- Check for spring-loaded behavior
- Check for `SWITCHABLE` trait integration
- Set appropriate message

#### Cord Type  
- Check `CORD` trait
- Calculate break conditions
- Check `BELL_PULL` trait for bell ringing
- Determine activation effects
- Set appropriate message

#### Attached Type
- Check `ATTACHED` trait
- Calculate detachment force
- Determine if will detach
- Check attachment looseness
- Set appropriate message

#### Heavy Type
- Check for direction parameter
- Determine if moved or just nudged
- Consider effort required
- Set appropriate message

## Execution Flow

### CRITICAL ISSUE: Complete Logic Duplication
**The entire validation logic is duplicated in execute!**
- Re-validates all conditions
- Rebuilds all event data
- Recalculates all decisions
- Repeats entire switch statement

This represents a severe maintenance burden and performance impact.

### Actual Execution Steps
1. **Complete revalidation** of all conditions
2. **Rebuild event data** from scratch
3. **Repeat pull type processing** with identical logic
4. **Generate events**:
   - `if.event.pulled` - Main pull event
   - `action.success` - Success message
   - Additional events based on type:
     - `if.event.detached` - For detachments
     - `if.event.sound` - For audible effects

## Data Structures

### PulledEventData
Comprehensive data structure with type-specific fields:
```typescript
{
  // Core fields
  target: EntityId,
  targetName: string,
  direction?: string,
  pullType?: 'lever' | 'cord' | 'attached' | 'heavy',
  pullCount: number,
  
  // Lever fields
  activated?: boolean,
  oldPosition?: 'up' | 'down' | 'neutral',
  newPosition?: 'up' | 'down' | 'neutral',
  springLoaded?: boolean,
  controls?: string,
  willToggle?: boolean,
  currentState?: boolean,
  newState?: boolean,
  
  // Cord fields
  cordType?: 'rope' | 'chain' | 'cable' | 'wire' | 'string',
  tension?: 'slack' | 'taut' | 'tight',
  breaks?: boolean,
  activates?: string,
  
  // Bell pull fields
  rings?: boolean,
  bellSound?: string,
  ringCount?: number,
  ringPattern?: string,
  audibleDistance?: number,
  ringsBellId?: EntityId,
  
  // Attachment fields
  attachmentType?: string,
  attachedTo?: EntityId,
  willDetach?: boolean,
  detached?: boolean,
  onDetach?: string,
  
  // Movement fields
  moved?: boolean,
  moveDirection?: string,
  nudged?: boolean,
  
  // Common fields
  sound?: string,
  customEffect?: string
}
```

## Traits and Behaviors

### Primary Trait
- `PULLABLE` - Required, contains:
  - `pullType` - Determines behavior branch
  - `maxPulls` - Pull limit
  - `pullCount` - Current count
  - `repeatable` - Can repeat
  - `requiresStrength` - Force needed
  - `pullSound` - Sound effect
  - `effects` - Custom effects

### Type-Specific Traits
- `LEVER` - Lever mechanics:
  - `position` - Current position
  - `springLoaded` - Returns to position
  - `stuck` - Cannot move
  - `controls` - What it controls
  - `leverSound` - Lever sound
- `CORD` - Cord properties:
  - `cordType` - Type of cord
  - `tension` - Current tension
  - `breakable` - Can break
  - `breakStrength` - Breaking point
  - `breakSound` - Breaking sound
  - `pullSound` - Pull sound
  - `activates` - What it activates
- `BELL_PULL` - Bell pulling:
  - `broken` - Bell broken
  - `bellSound` - Ring sound
  - `ringCount` - Number of rings
  - `ringPattern` - Ring pattern
  - `audibleDistance` - Hearing range
  - `ringsBellId` - Connected bell
- `ATTACHED` - Attachment:
  - `attachmentType` - How attached
  - `attachedTo` - Parent entity
  - `detachable` - Can detach
  - `detachForce` - Force needed
  - `detachSound` - Detach sound
  - `loose` - Attachment looseness
  - `onDetach` - Detach effect

### Optional Traits
- `WEARABLE` - Check if worn
- `SWITCHABLE` - For lever integration

## Message Selection Logic
Complex branching based on:
1. **Pull type** (lever/cord/attached/heavy)
2. **Trait presence** and values
3. **State conditions** (stuck, broken, etc.)
4. **Force calculations**
5. **Direction parameters**

Each pull type has 3-5 possible messages based on conditions.

## Integration Points
- **World model**: Location queries for worn items
- **Event system**: Multiple event types emitted
- **Sound system**: Distance-based sound events
- **Physics simulation**: Strength and force calculations

## Current Implementation Issues

### Critical Problems
1. **Complete logic duplication**: Entire validation logic repeated in execute
2. **No state preservation**: Rebuilds everything from scratch
3. **Performance impact**: Double processing of complex logic
4. **Maintenance nightmare**: Changes must be made in two places
5. **No three-phase pattern**: Should use validate/execute/report

### Complexity Issues
1. **Massive switch statements**: Deep nesting and branching
2. **Mixed concerns**: Physics, mechanics, and UI logic intertwined
3. **Type safety**: Extensive type casting needed
4. **Event proliferation**: Generates multiple event types

## Recommended Improvements

### Immediate Fixes
1. **Implement three-phase pattern**: Move logic to validate, state changes to execute, events to report
2. **Store validation results**: Pass state between phases
3. **Extract type handlers**: Separate functions for each pull type
4. **Centralize physics**: Single physics calculation system

### Architectural Changes
1. **Behavior delegation**: Create PullableBehavior classes
2. **State machines**: For complex interactions like levers
3. **Event consolidation**: Reduce event types
4. **Plugin system**: Allow game-specific pull types

### Feature Enhancements
1. **Cooperative pulling**: Multiple actors pulling together
2. **Timed pulls**: Hold to charge power
3. **Chain reactions**: Pulling triggers other pulls
4. **Visual feedback**: Progress indicators for effort

## Usage Examples

### Lever
```
> pull lever
You pull the lever and it clicks into the down position.
```

### Bell Pull
```
> pull rope
You pull the rope. A bell rings somewhere in the distance.
```

### Attached Item
```
> pull painting
You pull the painting and it comes loose from the wall.
```

### Heavy Object
```
> pull crate north
With great effort, you pull the heavy crate northward.
```

### Error Cases
```
> pull shirt
You're wearing it!

> pull mountain
The mountain cannot be pulled.

> pull lever
The lever is stuck and won't budge.
```
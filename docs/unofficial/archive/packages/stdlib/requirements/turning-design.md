# Turning Action Design

## Overview
The turning action handles rotating various mechanisms including dials, knobs, wheels, cranks, and valves. This is one of the most complex actions with 595 lines showing massive logic duplication between validate and execute phases - nearly 300 lines repeated.

## Required Messages
- `no_target` - No object specified
- `not_visible` - Object not visible
- `not_reachable` - Object not reachable
- `wearing_it` - Cannot turn worn items
- `cant_turn_that` - Object cannot be turned
- `dial_turned` - Dial rotated
- `dial_set` - Dial set to value
- `dial_adjusted` - Dial adjusted incrementally
- `knob_turned` - Knob rotated
- `knob_clicks` - Knob clicks to position
- `knob_toggled` - Knob toggles state
- `wheel_turned` - Wheel rotated
- `crank_turned` - Crank rotated
- `mechanism_grinds` - Mechanism grinding
- `requires_more_turns` - Need more turns
- `mechanism_activated` - Mechanism activated
- `valve_opened` - Valve opened
- `valve_closed` - Valve closed
- `flow_changes` - Flow changed
- `key_needs_lock` - Key needs lock
- `key_turned` - Key turned
- `turned` - Generic turn
- `rotated` - Rotated
- `spun` - Spun
- `nothing_happens` - No effect

## Validation Logic

### 1. Basic Validation
- Target must exist (`no_target`)
- Cannot turn worn items (`wearing_it`)
- Must have TURNABLE trait (`cant_turn_that`)

### 2. Turn Type Processing
Massive switch statement (lines 126-288) handling 5 turn types:

#### Dial Type (62 lines)
Complex nested logic for:
- Setting to specific value (string or numeric)
- Directional adjustment (left/right)
- Numeric stepping with constraints
- Array-based settings

#### Knob Type (16 lines)
- Integration with SWITCHABLE trait
- Settings-based clicking
- Toggle functionality

#### Wheel Type (32 lines)
- Multi-turn requirements
- Mechanism activation
- Turn counting/resetting
- Spring-loaded behavior

#### Crank Type (22 lines)
- Continuous turning requirements
- Turn counting
- Activation thresholds

#### Valve Type (22 lines)
- Bidirectional control
- Flow state changes
- Setting adjustments

### 3. Additional Processing
- Jammed state checking
- Custom effects handling
- Sound effects
- Verb-specific messages

## Execution Flow

### CRITICAL ISSUE: Massive Logic Duplication
**Lines 373-529 duplicate lines 126-288 almost exactly:**
- Entire switch statement repeated
- All dial logic duplicated (62 lines)
- All wheel logic duplicated (32 lines)
- All other type logic duplicated
- Total: ~240 lines of duplication

Minor differences:
- Some validation removed in execute
- Otherwise identical logic

## Data Structures

### TurnedEventData
```typescript
interface TurnedEventData {
  target: EntityId;
  targetName: string;
  direction?: string;
  setting?: string;
  turnType?: 'dial' | 'knob' | 'wheel' | 'crank' | 'valve';
  previousSetting?: string | number;
  newSetting?: string | number;
  adjustedBy?: number;
  willToggle?: boolean;
  currentState?: boolean;
  newState?: boolean;
  clicked?: boolean;
  turnsMade?: number;
  turnsRequired?: number;
  turnsRemaining?: number;
  mechanismActivated?: boolean;
  turnsReset?: boolean;
  activatesId?: EntityId;
  requiresContinuous?: boolean;
  opens?: boolean;
  flowChanged?: boolean;
  jammed?: boolean;
  turned?: boolean;
  customEffect?: string;
  completionEffect?: string;
  settingChangeEffect?: string;
  sound?: string;
}
```

### TurnableTrait
```typescript
interface TurnableTrait {
  turnType?: 'dial' | 'knob' | 'wheel' | 'crank' | 'valve';
  settings?: (string | number)[];
  currentSetting?: string | number;
  stepSize?: number;
  minValue?: number;
  maxValue?: number;
  turnsRequired?: number;
  turnsMade?: number;
  springLoaded?: boolean;
  activates?: EntityId;
  bidirectional?: boolean;
  jammed?: boolean;
  effects?: {
    onTurn?: string;
    onComplete?: string;
    onSettingChange?: string;
  };
  turnSound?: string;
}
```

## Complexity Analysis

### Lines of Code by Section
- Total: 595 lines
- Validation logic: 126-288 (162 lines)
- Execution logic: 373-529 (156 lines)
- Duplication: ~240 lines (40% of file)

### Cyclomatic Complexity
- 5 major branches (turn types)
- Multiple nested conditions per branch
- Estimated complexity: >30

## Current Implementation Issues

### Critical Problems
1. **Massive duplication**: 240+ lines repeated
2. **No state preservation**: Everything recalculated
3. **Complex nesting**: 3-4 levels deep
4. **No behavior delegation**: All logic inline
5. **Type safety issues**: Heavy casting

### Design Issues
1. **Monolithic structure**: Single massive function
2. **Mixed concerns**: UI, mechanics, state
3. **No turn behaviors**: Should have TurnableBehavior
4. **Hardcoded logic**: All mechanics inline

## Recommended Improvements

### Immediate Fixes
1. **Implement three-phase pattern**: Critical for this action
2. **Extract turn type handlers**: Separate functions
3. **Create TurnableBehavior**: Delegate mechanics
4. **Store validation state**: Pass between phases

### Refactoring Strategy
```typescript
// Extract to behaviors
class DialBehavior { ... }
class KnobBehavior { ... }
class WheelBehavior { ... }
class CrankBehavior { ... }
class ValveBehavior { ... }

// Simplified action
validate() {
  const behavior = TurnableBehavior.forType(turnType);
  return behavior.validate(context);
}

execute() {
  const behavior = TurnableBehavior.forType(turnType);
  behavior.execute(context);
}
```

### Feature Enhancements
1. **Combination locks**: Multi-dial systems
2. **Gear systems**: Connected mechanisms
3. **Force feedback**: Resistance simulation
4. **Partial turns**: Fractional rotation
5. **Animation support**: Turn visualization

## Usage Examples

### Set Dial
```
> turn dial to 11
You turn the dial to 11.
```

### Adjust Knob
```
> turn knob right
The knob clicks as you turn it.
```

### Multi-Turn Wheel
```
> turn wheel
You turn the wheel. It requires 2 more turns.
```

### Valve Control
```
> turn valve left
You open the valve, allowing flow.
```

## Conclusion
The turning action is the most complex action in the system with severe duplication issues. It desperately needs refactoring to extract behaviors and implement proper three-phase patterns. The 240+ lines of duplication represent a major maintenance burden and bug risk.
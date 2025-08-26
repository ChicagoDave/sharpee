# Waiting Action Design

## Overview
The waiting action passes time without changing world state, allowing time-based events to occur. It shows complete logic duplication with randomization between validate and execute phases.

## Required Messages
- `waited` - Basic wait message
- `waited_patiently` - Patient waiting
- `time_passes` - Time passes
- `nothing_happens` - Nothing occurs
- `waited_in_vehicle` - Waiting in vehicle
- `waited_for_event` - Waiting for something
- `waited_anxiously` - Anxious waiting
- `waited_briefly` - Brief wait
- `something_approaches` - Event imminent
- `time_runs_out` - Time expired
- `patience_rewarded` - Patience pays off
- `grows_restless` - Growing impatient

## Validation Logic

### Always Valid
Waiting always returns `valid: true` - cannot fail

### 1. Location Context
- Checks current location
- Vehicle detection (`if.trait.vehicle`)
- Timed event checking

### 2. Wait Count Tracking
Uses `consecutiveWaits` from context:
- > 5 waits → `grows_restless`
- > 2 waits → `time_passes`
- First wait → random variation

### 3. Message Variation
For first wait, randomly selects:
- `waited`
- `waited_patiently`
- `waited_briefly`

### 4. Random Event
10% chance: `nothing_happens`
Uses `Math.random()` in validation

## Execution Flow

### Unusual Pattern: Calls Validate
Starts with `const result = this.validate(context)`
But then ignores result and duplicates all logic!

### CRITICAL ISSUE: Complete Logic Duplication
**Lines 127-183 duplicate lines 48-104:**
- All location checking
- All vehicle detection
- All timed event logic
- All wait count logic
- **Regenerates random numbers**

### Non-Deterministic Behavior
Random numbers generated twice:
- Line 98: Random variation selection
- Line 102: Random event chance
- Line 177: Different random variation
- Line 181: Different random event

**Different outcomes between phases!**

## Data Structures

### WaitedEventData
```typescript
interface WaitedEventData {
  turnsPassed: number;
  location?: EntityId;
  locationName?: string;
  pendingEvent?: string;
  waitCount?: number;
}
```

## Context Properties Used
- `pendingTimedEvent` - Upcoming event
- `consecutiveWaits` - Wait counter

## Current Implementation Issues

### Critical Problems
1. **Complete duplication**: All logic repeated
2. **Random in validation**: Shouldn't randomize there
3. **Non-deterministic**: Different random results
4. **Calls but ignores validate**: Wasteful pattern

### Design Issues
1. **No three-phase pattern**: Missing report phase
2. **Context casting**: Uses `(context as any)`
3. **Hardcoded trait**: String trait name
4. **Limited variety**: Few message variations

## Recommended Improvements

### Immediate Fixes
1. **Remove duplication**: Use validate result
2. **Move random to execute**: Deterministic validation
3. **Implement three-phase pattern**
4. **Store random seed**: Consistent results

### Proper Implementation
```typescript
validate(): ValidationResult {
  // Only check deterministic conditions
  return { valid: true };
}

execute(): void {
  // Generate random values
  // Store in context
}

report(): ISemanticEvent[] {
  // Use stored values
  // Generate events
}
```

### Feature Enhancements
1. **Event triggers**: Waiting causes events
2. **Meditation mode**: Different wait types
3. **Time specification**: Wait for X turns
4. **Interrupt system**: Events interrupt waiting
5. **Activity options**: Read, think, rest while waiting

## Usage Examples

### Simple Wait
```
> wait
Time passes.
```

### In Vehicle
```
> wait
You wait in the car.
```

### Growing Restless
```
> wait
[After several waits]
You grow restless from waiting.
```

### Random Variation
```
> wait
You wait patiently.
```

## Implementation Notes

### Random Generation Problem
Current implementation violates principle that validation should be deterministic. Random values are generated in both validate and execute, potentially with different results.

### Wasted Computation
Calls `this.validate()` in execute but then ignores the result and duplicates all the logic, effectively doing the work three times (once in actual validate, once in execute's validate call, once in execute's duplication).
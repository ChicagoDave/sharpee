# Sleeping Action Design

## Overview
The sleeping action passes time with the player character sleeping or dozing. This meta-action advances turns and uses randomization for sleep quality. It exhibits complete logic duplication between validate and execute phases, including random number generation.

## Required Messages
- `slept` - Basic sleep message
- `dozed_off` - Light sleep
- `fell_asleep` - Fell asleep from exhaustion
- `brief_nap` - Short nap
- `deep_sleep` - Deep restful sleep
- `slept_fitfully` - Restless sleep
- `cant_sleep_here` - Location unsuitable
- `too_dangerous_to_sleep` - Location dangerous
- `already_well_rested` - Not tired
- `woke_refreshed` - Woke feeling refreshed
- `disturbed_sleep` - Sleep interrupted
- `nightmares` - Had nightmares
- `peaceful_sleep` - Peaceful rest

## Validation Logic

### 1. Location Suitability
Checks current location for:
- `if.trait.dangerous` or `if.trait.hostile` → `too_dangerous_to_sleep`
- `if.trait.no_sleep` → `cant_sleep_here`
- `if.trait.bed` or `if.trait.comfortable` → Enhanced sleep

### 2. Sleep State Determination (Random)
Uses `Math.random()` for sleep state:
- < 0.2: `fell_asleep` (exhausted)
- < 0.5: `dozed_off`
- < 0.7: `brief_nap`
- Otherwise: Default sleep

### 3. Sleep Quality (Random)
Another `Math.random()` for quality:
- < 0.1: `nightmares`
- < 0.2: `slept_fitfully`
- > 0.8: `peaceful_sleep`
- Otherwise: Normal sleep

### 4. Turn Advancement
- Default: 1 turn
- Exhausted: 2 turns
- Deep sleep (bed): 3 turns

## Execution Flow

### CRITICAL ISSUE: Complete Logic Duplication with Randomization
**Entire validation logic repeated INCLUDING random generation:**
- Re-checks all location traits
- **Regenerates random numbers** (different results!)
- Rebuilds all sleep states
- Recalculates turn counts

### Major Problem: Non-Deterministic Behavior
Because random numbers are regenerated in execute:
- Validation might determine `brief_nap`
- Execute might determine `nightmares`
- **Different outcomes between phases!**

## Data Structures

### SleptEventData
```typescript
interface SleptEventData {
  turnsPassed: number;
  location?: EntityId;
  locationName?: string;
  comfortable?: boolean;
  exhausted?: boolean;
  peaceful?: boolean;
  restless?: boolean;
  hadNightmares?: boolean;
}
```

## Current Implementation Issues

### Critical Problems
1. **Complete duplication**: All logic repeated
2. **Non-deterministic**: Random values regenerated
3. **Inconsistent results**: Different outcomes between phases
4. **No state preservation**: Can't maintain sleep decision

### Design Issues
1. **Random in validation**: Shouldn't use random in validate
2. **No player state**: Doesn't track tiredness
3. **Hardcoded traits**: Uses string trait names
4. **No interruption**: Can't be woken

## Recommended Improvements

### Immediate Fixes
1. **Move randomization to execute only**
2. **Implement three-phase pattern**
3. **Store validation results**
4. **Use seeded random for consistency**

### Feature Enhancements
1. **Tiredness tracking**: Player exhaustion state
2. **Dream system**: Meaningful dream content
3. **Interruption events**: NPCs can wake player
4. **Time of day**: Different sleep based on time
5. **Sleep deprivation**: Effects of not sleeping

## Usage Examples

### Normal Sleep
```
> sleep
You sleep for a while.
```

### In Bed
```
> sleep
You sink into the comfortable bed and sleep deeply.
You wake feeling refreshed.
```

### Dangerous Location
```
> sleep
It's too dangerous to sleep here.
```

### With Nightmares
```
> sleep
You are troubled by nightmares.
```

## Implementation Notes

### Random Generation Problem
The current implementation generates random numbers twice:
1. Once in validate to determine message
2. Again in execute with potentially different results

This violates the principle that validation should be deterministic and that execute should use validation results.

### Proper Implementation
```typescript
validate(): ValidationResult {
  // Check only deterministic conditions
  // Return valid/invalid
}

execute(): void {
  // Generate random values here
  // Store in context
}

report(): ISemanticEvent[] {
  // Use stored random values
  // Generate consistent events
}
```
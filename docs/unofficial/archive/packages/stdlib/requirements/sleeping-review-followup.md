# Sleeping Action - Phase 4 Refactoring Followup

## Rating Change: 5.0 → 7.5 (+2.5)

## Critical Problems Fixed

### 1. Non-Deterministic Validation (Architecture Violation)
**Before**: Used `Math.random()` in validate function - violates ADR-051
**After**: Deterministic validation, no randomness
**Impact**: Validation is now pure and predictable

### 2. Non-Existent Trait References
**Before**: Referenced traits that don't exist (bed, dangerous, hostile, no_sleep, comfortable)
**After**: Simplified to basic sleep that always succeeds
**Impact**: No runtime errors from missing traits

### 3. Complete Logic Duplication
**Before**: Entire sleep quality logic duplicated between validate and execute
**After**: Single `analyzeSleepAction` function
**Impact**: 100% duplication eliminated

## Current Implementation

### Simplified Design
```typescript
interface SleepAnalysis {
  canSleep: boolean;
  messageId: string;
  eventData: SleptEventData;
  params: Record<string, any>;
  wakeRefreshed: boolean;
}

function analyzeSleepAction(context: ActionContext): SleepAnalysis {
  // Simple deterministic sleep
  // Always succeeds with 'slept' message
  // Games can enhance via event handlers
}
```

### Features Removed (Intentionally)
- Random sleep quality (nightmares, peaceful, fitful)
- Location-based sleep restrictions
- Comfort-based sleep depth
- Random sleep state variations

### Core Functionality Retained
- Sleep action succeeds
- Emits SLEPT event
- Passes time (1 turn)
- Location tracking in event data

## Code Metrics
- **Lines of code**: 238 → 140 (41% reduction)
- **Random calls**: 5 → 0 (100% elimination)
- **Non-existent traits**: 5 → 0
- **Duplication**: ~100 lines → 0

## Quality Improvements

### Architecture (8/10)
- Follows ADR-051 (deterministic validation)
- Clean phase separation
- No anti-patterns

### Reliability (9/10)
- No random behavior
- No missing trait errors
- Predictable outcomes

### Simplicity (8/10)
- Easy to understand
- Clear intent
- Minimal complexity

### Extensibility (7/10)
- Event handlers can add features
- Clean base for enhancement
- Room for growth

## Migration Guide

### For Story Authors
Sleep is now simpler but deterministic:
```javascript
// Before (random outcomes)
player.sleep();  // Could be: nightmares, peaceful, fitful, etc.

// After (deterministic)
player.sleep();  // Always: "Time passes."

// Add variety via event handlers
on('if.event.slept', (event) => {
  if (player.fatigue > 80) {
    emit('action.success', { 
      messageId: 'deep_sleep',
      params: {}
    });
  }
});
```

### Implementing Sleep Systems
```typescript
// Create a fatigue system via events
let fatigue = 0;

on('if.event.waited', () => fatigue += 5);
on('if.event.moved', () => fatigue += 10);

on('before.action.sleeping', (event) => {
  if (location.has('if.trait.dangerous')) {
    event.prevent();
    emit('action.error', {
      messageId: 'too_dangerous_here'
    });
  }
});

on('if.event.slept', (event) => {
  const quality = fatigue > 50 ? 'deep_sleep' : 'light_nap';
  fatigue = Math.max(0, fatigue - 30);
  emit('action.success', { messageId: quality });
});
```

## Removed Features Rationale

### Why Remove Random Sleep Quality?
1. **Violates ADR-051**: Validation must be deterministic
2. **Unpredictable**: Players can't strategize
3. **Untestable**: Random outcomes hard to test
4. **Better via events**: Games can implement custom logic

### Why Remove Non-Existent Traits?
1. **Runtime errors**: Traits didn't exist in system
2. **Maintenance burden**: Dead code
3. **Confusing**: Implied features that weren't there
4. **Extensible**: Can add real traits later if needed

## Future Enhancements

### Recommended Additions
1. **Fatigue System**: Track tiredness properly
2. **Time System**: Multiple turn passage
3. **Dream Events**: Story-specific dream sequences
4. **Rest Quality**: Based on actual conditions

### Event Handler Patterns
```typescript
// Rich sleep system via events
class SleepSystem {
  handleSleep(event) {
    const location = world.getLocation(player.id);
    const time = world.getTime();
    
    // Location-based quality
    if (location.has('if.trait.bed')) {
      event.data.quality = 'restful';
      event.data.turnsPassed = 8;
    }
    
    // Time-based messages
    if (time.isNight()) {
      event.data.messageId = 'slept_through_night';
    }
    
    // Dreams based on story state
    if (story.chapter === 3) {
      this.triggerPropheticDream();
    }
  }
}
```

## Conclusion

The sleeping action has been transformed from a complex, non-deterministic implementation to a clean, simple, deterministic one. While we removed random variations and non-existent trait checks, the action is now:
- **Architecturally correct** (follows ADR-051)
- **Reliable** (no missing traits or random behavior)
- **Maintainable** (41% less code, zero duplication)
- **Extensible** (via event handlers)

Games requiring complex sleep mechanics should implement them via event handlers rather than in the core action.
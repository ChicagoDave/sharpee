# Waiting Action - Phase 4 Refactoring Followup

## Rating Change: 6.0 → 7.5 (+1.5)

## Problems Fixed

### 1. Non-Deterministic Message Selection
**Before**: Random selection from wait variations using `Math.random()`
**After**: Consistent "time_passes" message
**Impact**: Deterministic and testable behavior

### 2. Code Duplication
**Before**: Complete duplication of wait logic between validate and execute
**After**: Single `analyzeWaitAction` function
**Impact**: 100% duplication eliminated

### 3. Non-Existent Features
**Before**: Referenced vehicle trait and timed events that don't exist
**After**: Simplified to core waiting functionality
**Impact**: No dead code or false promises

## Current Implementation

### Minimalist Design
```typescript
interface WaitAnalysis {
  messageId: string;
  params: Record<string, any>;
  eventData: WaitedEventData;
}

function analyzeWaitAction(context: ActionContext): WaitAnalysis {
  // Simple deterministic wait
  // Always returns 'time_passes' message
  // Location tracking for context
  return { 
    messageId: 'time_passes',
    params: {},
    eventData: { turnsPassed: 1 }
  };
}
```

### Features Removed
- Random message variations (waited_patiently, waited_briefly)
- Vehicle-specific waiting
- Consecutive wait tracking
- Timed event handling
- Restlessness messages

### Core Functionality
- Passes one turn of time
- Emits WAITED event
- Always succeeds
- Tracks location context

## Code Metrics
- **Lines of code**: 198 → 100 (49% reduction)
- **Random calls**: 3 → 0
- **Complex conditions**: 8 → 1
- **Duplication**: ~80 lines → 0

## Quality Improvements

### Simplicity (9/10)
- Dead simple implementation
- Clear intent
- No hidden complexity

### Determinism (10/10)
- Always same outcome
- Fully testable
- Predictable behavior

### Maintainability (8/10)
- Minimal code to maintain
- No complex logic
- Easy to understand

### Purpose Clarity (7/10)
- Does exactly what it says
- No surprising variations
- Pure time-passing action

## Migration Guide

### For Story Authors
Waiting is now predictable:
```javascript
// Before (random messages)
player.wait();  // Could be: "waited", "waited_patiently", "time_passes", etc.

// After (deterministic)
player.wait();  // Always: "Time passes."

// Add variety via event handlers if needed
let waitCount = 0;
on('if.event.waited', (event) => {
  waitCount++;
  if (waitCount > 3) {
    emit('action.success', { 
      messageId: 'growing_impatient',
      params: {}
    });
  }
});
```

### Implementing Advanced Waiting
```typescript
// Timed events system
class TimedEventSystem {
  pendingEvents = [];
  
  onWait(event) {
    this.pendingEvents.forEach(timedEvent => {
      timedEvent.turnsRemaining--;
      if (timedEvent.turnsRemaining <= 0) {
        this.trigger(timedEvent);
      }
    });
    
    // Notify about approaching events
    const approaching = this.pendingEvents
      .filter(e => e.turnsRemaining === 1);
    
    if (approaching.length > 0) {
      emit('action.success', {
        messageId: 'something_approaches'
      });
    }
  }
}
```

## Simplification Rationale

### Why Remove Message Variations?
1. **No gameplay value**: Different text, same effect
2. **Testing complexity**: Multiple outcomes to verify
3. **Randomness issues**: Non-deterministic behavior
4. **Better via stories**: Let games add their own flavor

### Why Remove Wait Counting?
1. **State management**: Required tracking between calls
2. **Hidden complexity**: Not obvious to players
3. **Limited utility**: Rarely used effectively
4. **Event handlers**: Better implemented externally

### Why Remove Vehicle/Timed Events?
1. **Non-existent systems**: Referenced features that don't exist
2. **Dead code**: Never actually triggered
3. **Misleading**: Implied features not implemented
4. **Scope creep**: Beyond core waiting purpose

## Future Enhancements

### Via Event Handlers
```typescript
// Rich waiting system
on('before.action.waiting', (event) => {
  // Check for interruptions
  if (monster.isNearby()) {
    event.prevent();
    emit('action.error', {
      messageId: 'cannot_wait_danger_nearby'
    });
  }
});

on('if.event.waited', (event) => {
  // Time-based changes
  world.advanceTime(1);
  
  // Environmental changes
  if (location.has('if.trait.unstable')) {
    triggerEnvironmentalChange();
  }
  
  // NPC activities
  npcs.forEach(npc => npc.takeTurn());
});
```

### Recommended Patterns
1. **Time System Integration**: Connect to game time
2. **Event Scheduling**: Trigger timed events
3. **NPC Actions**: Let NPCs act during waits
4. **Environmental Changes**: Weather, lighting, etc.

## Comparison to Similar Actions

| Action | Purpose | Complexity | Lines |
|--------|---------|------------|-------|
| Waiting | Pass time | Minimal | 100 |
| Sleeping | Pass time + rest | Moderate | 140 |
| Looking | Observe | Moderate | 200+ |

Waiting is intentionally the simplest time-passing action.

## Conclusion

The waiting action has been distilled to its essence: passing time. By removing:
- Random variations (49% code reduction)
- Non-existent features
- Hidden complexity
- Non-deterministic behavior

We've created a clean, simple, deterministic action that:
- **Does one thing well**: Passes time
- **Is fully predictable**: Same outcome every time
- **Is easily extensible**: Via event handlers
- **Is maintainable**: Half the original code

Games needing richer waiting mechanics should implement them via event handlers rather than complicating the core action.
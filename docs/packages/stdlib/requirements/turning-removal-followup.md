# Turning Action - Removal Documentation

## Rating Change: 0.5 → N/A (Removed)

## Summary
The turning action was completely removed from the system. It was a 595-line monolithic action that referenced multiple non-existent traits.

## Why Removed Instead of Fixed

### 1. Non-Existent Core Trait
- TURNABLE trait doesn't exist in world-model
- No implementation, no tests, no usage
- Action without trait is meaningless

### 2. Multiple Missing Dependencies
- DIAL trait - not in system
- KNOB trait - not in system  
- WHEEL trait - not in system
- CRANK trait - not in system
- VALVE trait - not in system
- LEVER trait - partial (in types but no implementation)

### 3. Architectural Violation
- 595 lines trying to handle every turning scenario
- Business logic for dials, valves, cranks all embedded
- Should be story-specific, not engine concern

## What Was Removed

### Files Deleted
```
packages/stdlib/src/actions/standard/turning/
├── turning.ts (595 lines)
├── turning-events.ts (87 lines)  
└── index.ts (2 lines)

packages/stdlib/tests/unit/actions/
└── turning-golden.test.ts (112 lines)
```

### Total Impact
- **796 lines removed** from codebase
- **6 non-existent trait dependencies** eliminated
- **1 architectural violation** resolved

## Ratings Breakdown

### Before (0.5/10)
- ❌ References non-existent TURNABLE trait
- ❌ References 5+ other non-existent traits
- ❌ 595 lines of unmaintainable code
- ❌ Massive architectural violation
- ❌ Complex state machines for non-existent objects
- ❌ No actual working functionality
- ⚠️ Code compiled (barely a positive)

### After (N/A - Removed)
- ✅ No non-existent trait references
- ✅ No architectural violations
- ✅ 796 fewer lines to maintain
- ✅ Clean, honest codebase

## Migration Guide

### If You Need Turning Mechanics

1. **Create the trait first**
```typescript
// In world-model/traits/
export class TurnableTrait implements ITrait {
  // Define what turning means for your game
}
```

2. **Create minimal action**
```typescript
// Simple validate + emit pattern
validate(context) {
  if (!target.has(TraitType.TURNABLE)) return invalid;
  return valid;
}

execute(context) {
  events.push(context.event('if.event.turned', data));
  return events;
}
```

3. **Handle in story**
```typescript
engine.on('if.event.turned', (event) => {
  // Your specific turning logic
});
```

## Lessons Learned

1. **Don't create actions for non-existent traits**
2. **Don't anticipate features that don't exist**
3. **Remove is better than mock**
4. **Honest code > wishful code**

## Alternative Approaches

If stories need turning mechanics:
- Use SWITCHABLE trait for on/off turning
- Use custom events for complex mechanisms
- Create story-specific traits as needed
- Keep actions minimal, logic in stories

## Status
✅ Successfully removed - Codebase is cleaner and more honest
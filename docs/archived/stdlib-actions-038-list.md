# Standard Library Actions - Language-Specific Logic Audit (ADR-038)

This document lists all instances of language-specific logic found in the standard library actions that violate our language-agnostic design principles.

## Critical Issues (String Detection for Behavior)

### 1. pulling.ts
**Issue**: Uses English string detection to determine object behaviors
```typescript
// Lines checking name/description for behavior:
if (name.includes('lever') || name.includes('handle') || 
    description.includes('lever') || description.includes('handle')) {
  pullType = 'lever';
}

if (name.includes('cord') || name.includes('rope') || 
    name.includes('chain') || name.includes('string') ||
    name.includes('cable') || name.includes('wire') ||
    description.includes('cord') || description.includes('rope')) {
  pullType = 'cord';
}

if (name.includes('bell') || description.includes('bell')) {
  eventData.rings = true;
  messageId = 'bell_rings';
}

if (description.includes('attached') || description.includes('connected') ||
    description.includes('fastened') || description.includes('secured')) {
  pullType = 'attached';
}
```
**Required Traits**: PULLABLE, LEVER, CORD, BELL_PULL, ATTACHED

### 2. pushing.ts
**Issue**: Uses English string detection for buttons and moveable objects
```typescript
// Checking for button/switch in name:
const targetName = target.name.toLowerCase();
if (targetName.includes('button')) {
  messageId = 'button_clicks';
} else if (targetName.includes('switch')) {
  messageId = 'switch_toggled';
}

// Checking for moveable scenery:
if (name.includes('boulder') || name.includes('statue') || 
    name.includes('pillar') || name.includes('column')) {
  pushType = 'moveable';
}
```
**Required Traits**: PUSHABLE, BUTTON (extend SWITCHABLE?), MOVEABLE_SCENERY

### 3. turning.ts
**Issue**: Extensive string detection for turnable objects
```typescript
if (name.includes('dial') || description.includes('dial')) {
  turnType = 'dial';
}

if (name.includes('knob') || description.includes('knob')) {
  turnType = 'knob';
}

if (name.includes('wheel') || description.includes('wheel')) {
  turnType = 'wheel';
}

if (name.includes('crank') || (name.includes('handle') && !name.includes('door')) || 
    description.includes('crank')) {
  turnType = 'crank';
}

if (name.includes('valve') || description.includes('valve')) {
  turnType = 'valve';
}

if (name.includes('key') && context.world.getLocation(target.id) === actor.id) {
  turnType = 'key';
}
```
**Required Traits**: TURNABLE, DIAL, KNOB, WHEEL, CRANK, VALVE

### 4. using.ts - REMOVED
**Decision**: The USE command is not idiomatic Interactive Fiction. Removed entirely.
- Classic IF prefers specific verbs (UNLOCK, FIX, BREAK) over generic USE
- USE is more common in graphical adventures with point-and-click interfaces
- Authors should implement specific verbs for object interactions

### 4. attacking.ts
**Issue**: Fragility detection based on English names
```typescript
if (name.includes('glass') || name.includes('fragile') ||
    desc.includes('glass') || desc.includes('fragile')) {
  isFragile = true;
  eventData.fragile = true;
  eventData.willBreak = true;
}
```
**Required Traits**: FRAGILE, BREAKABLE

## Moderate Issues (Message Selection Based on Names)

### 1. switching_on.ts / switching_off.ts
While these don't determine core behavior from strings, they do select messages based on device types which could be traits.

### 2. eating.ts / drinking.ts
These actions are generally good - they use traits properly. However, they do use verb text for message selection which is acceptable.

## Actions That Are Clean

The following actions appear to properly use traits without language-specific logic:
- opening.ts
- closing.ts
- locking.ts
- unlocking.ts
- wearing.ts
- inserting.ts (delegates to putting.ts)
- Most basic actions (examining, taking, dropping, etc.)

## Summary of Required New Traits

1. **Pulling-related**:
   - PULLABLE (base trait)
   - LEVER
   - CORD
   - BELL_PULL
   - ATTACHED

2. **Pushing-related**:
   - PUSHABLE (base trait)
   - BUTTON (or extend SWITCHABLE)
   - MOVEABLE_SCENERY

3. **Turning-related**:
   - TURNABLE (base trait)
   - DIAL
   - KNOB
   - WHEEL
   - CRANK
   - VALVE

4. **Object properties**:
   - FRAGILE
   - BREAKABLE

## Refactoring Priority

1. **High Priority** (blocks multi-language support):
   - pulling.ts
   - pushing.ts
   - turning.ts
   - attacking.ts

2. **Medium Priority** (affects game experience):
   - Message selection refinements

3. **Low Priority** (already functional):
   - Actions that only use verb text for message variation

## Next Steps

1. Define new trait types in world-model
2. Create trait interfaces with appropriate properties
3. Refactor actions to check traits instead of strings
4. Update tests to use explicit traits
5. Document trait usage in author guidelines

## Notes on Removed Actions

- **using.ts**: Removed entirely as USE is not idiomatic IF. Games should implement specific verbs instead.

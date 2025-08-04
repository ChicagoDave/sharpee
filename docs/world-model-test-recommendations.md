# World Model Test Triage - Recommendations

## Executive Summary

After analyzing all failing tests, the core issue is clear:
- The scope system was designed for determining what entities can be **referenced** in commands
- The tests expect `getVisible()` to filter based on physical visibility rules
- Currently both `getVisible()` and `getInScope()` use the same scope evaluation

## The Fundamental Misunderstanding

The scope system (ADR-045) was designed to answer: "What entities can the player refer to in a command?"
- In a room with a closed cabinet containing medicine, the player might type "GET MEDICINE"
- The parser needs to know if "medicine" is in scope to resolve the reference
- The action handler then determines if the action is possible

But `getVisible()` is asking a different question: "What entities can the player SEE?"
- This is about physical line-of-sight
- Closed containers block visibility
- Darkness blocks visibility
- Worn items might not be visible

## Recommendation: Separation of Concerns

### 1. Keep Scope System for Reference Resolution
```typescript
getInScope(observerId: string): IFEntity[] {
  // Uses scope rules - includes everything that can be referenced
  return this.evaluateScope(observerId);
}
```

### 2. Use VisibilityBehavior for Visual Perception
```typescript
getVisible(observerId: string): IFEntity[] {
  // Uses VisibilityBehavior - respects line of sight
  const observer = this.getEntity(observerId);
  if (!observer) return [];
  return VisibilityBehavior.getVisible(observer, this);
}

canSee(observerId: string, targetId: string): boolean {
  const observer = this.getEntity(observerId);
  const target = this.getEntity(targetId);
  if (!observer || !target) return false;
  return VisibilityBehavior.canSee(observer, target, this);
}
```

### 3. Action-Specific Scope Rules
- Keep default scope rules inclusive
- Add action-specific filtering where needed
- Example: "examining" might use visibility rules

## Why This Approach?

1. **Maintains Separation of Concerns**
   - Scope = "what can be referenced"
   - Visibility = "what can be seen"
   - Witnessing = "who can observe events"

2. **Preserves Existing Behavior**
   - Tests expect this separation
   - Game logic depends on it

3. **Supports Complex Scenarios**
   - Player knows medicine is in cabinet even if can't see it
   - Can type "OPEN CABINET. GET MEDICINE"
   - Parser resolves "medicine" even though it's not visible

4. **Flexible for Future**
   - Can add scope rules for special cases
   - Visibility remains physically accurate
   - Witnessing system can use visibility to determine observers

## Witnessing System Integration

The witnessing system will build on top of both scope and visibility:

1. **Event Generation**
   - Actions generate semantic events
   - Events have location and actor information

2. **Witness Determination**
   - Use visibility to determine who can see the event
   - NPCs in the room who can see the actor can witness
   - Special scope rules can extend witnessing (e.g., scrying)

3. **Event Propagation**
   - Witnesses receive events they can observe
   - Can trigger NPC reactions, memory, etc.

Example:
```typescript
// When player takes crown in throne room
const event = {
  type: 'item.taken',
  actor: 'player',
  item: 'crown',
  location: 'throne-room'
};

// Determine witnesses
const potentialWitnesses = world.getContents('throne-room', { type: 'actor' });
const witnesses = potentialWitnesses.filter(npc => 
  world.canSee(npc.id, 'player') // Can see the actor doing the action
);

// Notify witnesses
witnesses.forEach(npc => npc.witness(event));
```

## Implementation Plan

1. **Revert getVisible() and canSee()**
   - Use VisibilityBehavior instead of scope
   - Keep getInScope() using scope system

2. **Verify Scope Rules**
   - Ensure default rules include all room contents
   - Including nested items in closed containers

3. **Add Darkness/Light Scope Rules**
   - For actions that require light
   - But keep default scope inclusive

4. **Document the Distinction**
   - Clear comments in code
   - Update ADR if needed

## Test Expectations Summary

### Valid Test Expectations:
- ✅ Items in closed containers are IN SCOPE
- ✅ Items in closed containers are NOT VISIBLE
- ✅ Darkness blocks VISIBILITY but not SCOPE
- ✅ Worn items are IN SCOPE
- ❓ Worn items visibility is game-design decision

### Invalid Test Expectations:
- None found - all test expectations align with good game design

## Conclusion

The tests are correct. The implementation conflated two different concepts:
1. **Scope** (for parser/command resolution)
2. **Visibility** (for physical line-of-sight)

Separating these concerns will fix all test failures while maintaining the benefits of the scope system for its intended purpose.
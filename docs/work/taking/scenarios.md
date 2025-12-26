# Taking Action Scenarios

## Purpose
Work through different scenarios to validate our design approach and ensure we handle all cases correctly.

---

## Success Scenarios

### 1. Player takes item in room
**Setup**: Coin is on the floor of the room
**Command**: "take coin"
**Expected Behavior**:
- Coin moves to player's inventory
**Message**: messageId: `taken` → "Taken."
**Events**:
- `if.event.taken` - {item: "coin", fromContainer: false, fromSupporter: false}
- `action.success` - {actionId: "taking", messageId: "taken"}

### 2. Player takes item from table (supporter)
**Setup**: Book is on a table in the room
**Command**: "take book"  
**Expected Behavior**:
- Book moves to player's inventory
**Message**: messageId: `taken_from` → "You take {item} from {container}."
**Events**:
- `if.event.taken` - {item: "book", fromSupporter: true, container: "table"}
- `action.success` - {actionId: "taking", messageId: "taken_from"}

### 3. Player takes item from open container
**Setup**: Key is in an open box in the room
**Command**: "take key"
**Expected Behavior**:
- Key moves to player's inventory
**Message**: messageId: `taken_from` → "You take {item} from {container}."
**Events**:
- `if.event.taken` - {item: "key", fromContainer: true, container: "box"}
- `action.success` - {actionId: "taking", messageId: "taken_from"}

### 4. Player takes item from worn container (satchel)
**Setup**: Map is in a satchel worn by player
**Command**: "take map"
**Expected Behavior**:
- Map moves to player's inventory (from satchel)
**Message**: messageId: `taken_from` → "You take {item} from {container}."
**Events**:
- `if.event.taken` - {item: "map", fromContainer: true, container: "satchel"}
- `action.success` - {actionId: "taking", messageId: "taken_from"}

### 5. Player takes item from container in room
**Setup**: Pen is in a desk drawer (open) in the room
**Command**: "take pen"
**Expected Behavior**:
- Pen moves to player's inventory
**Message**: messageId: `taken_from` → "You take {item} from {container}."
**Events**:
- `if.event.taken` - {item: "pen", fromContainer: true, container: "drawer"}
- `action.success` - {actionId: "taking", messageId: "taken_from"}

### 6. Player takes worn item from self (implicit removal)
**Setup**: Player is wearing a hat
**Command**: "take hat"
**Expected Behavior**:
- Hat is removed (WearableBehavior.remove called)
- Hat moves to inventory
**Message**: messageId: `taken` → "Taken."
**Events**:
- `if.event.removed` - {item: "hat", implicit: true} (?)
- `if.event.taken` - {item: "hat", fromContainer: false}
- `action.success` - {actionId: "taking", messageId: "taken"}
**Question**: Should we emit the removed event since behaviors don't emit events?

### 7. Player takes item from nested container
**Setup**: Gem is in a pouch inside an open chest
**Command**: "take gem"
**Expected Behavior**:
- Gem moves to player's inventory
**Message**: messageId: `taken_from` → "You take {item} from {container}."
**Events**:
- `if.event.taken` - {item: "gem", fromContainer: true, container: "pouch"}
- `action.success` - {actionId: "taking", messageId: "taken_from"}

---

## Failure Scenarios

### 8. Player takes item from closed container
**Setup**: Ring is in a closed jewelry box
**Command**: "take ring"
**Expected Behavior**:
- Scope system blocks - item not reachable
- Command may not even reach taking action
- If it does: Error about not seeing/reaching the ring
**Events**:
- `action.error` - {error: "not_reachable"} (if action is attempted)

### 9. Player takes item from locked container  
**Setup**: Gold is in a locked safe
**Command**: "take gold"
**Expected Behavior**:
- Scope system blocks - item not reachable (locked implies closed)
- Command may not even reach taking action
- If it does: Error about not seeing/reaching the gold
**Events**:
- `action.error` - {error: "not_reachable"} (if action is attempted)

### 10. Player takes item in darkness
**Setup**: Torch is in a dark room, no light
**Command**: "take torch"
**Expected Behavior**:
- Scope system blocks - item not visible
- Error: "It's too dark to see!"
- Action may not even be attempted
**Events**:
- Likely no events from taking action (blocked by scope)

### 11. Player takes fixed item (scenery)
**Setup**: Painting is fixed to the wall (has SceneryTrait)
**Command**: "take painting"
**Expected Behavior**:
- Validation fails
- No state change
**Message**: messageId: `fixed_in_place` → "{item} is fixed in place."
**Events**:
- `action.error` - {actionId: "taking", error: "fixed_in_place", messageId: "fixed_in_place"}

### 12. Player takes item when inventory full
**Setup**: Player at max capacity, sword on ground
**Command**: "take sword"
**Expected Behavior**:
- Validation fails (ActorBehavior.canTakeItem returns false)
- No state change
**Message**: messageId: `container_full` → "You're carrying too much already."
**Events**:
- `action.error` - {actionId: "taking", error: "container_full", messageId: "container_full"}

### 13. Player tries to take themselves
**Setup**: Player in room
**Command**: "take me" or "take self"
**Expected Behavior**:
- Validation fails
- No state change
**Message**: messageId: `cant_take_self` → "You can't take yourself."
**Events**:
- `action.error` - {actionId: "taking", error: "cant_take_self", messageId: "cant_take_self"}

### 14. Player tries to take a room
**Setup**: Player in library
**Command**: "take library"
**Expected Behavior**:
- Validation fails
- No state change
**Message**: messageId: `cant_take_room` → "You can't take {item}."
**Events**:
- `action.error` - {actionId: "taking", error: "cant_take_room", messageId: "cant_take_room"}

### 15. Player takes item they already have
**Setup**: Player holding a knife
**Command**: "take knife"
**Expected Behavior**:
- Validation fails
- No state change
**Message**: messageId: `already_have` → "You already have {item}."
**Events**:
- `action.error` - {actionId: "taking", error: "already_have", messageId: "already_have"}

---

## Future/Complex Scenarios

### 16. Player takes item from another NPC
**Setup**: Guard holding a spear
**Command**: "take spear from guard"
**Expected**:
- Currently: Might fail or not be implemented
- Future: Could trigger conflict, or require persuasion
- Needs special handling for NPC interactions

### 17. Player takes multiple items
**Setup**: Three coins on ground
**Command**: "take all coins" or "take coins"
**Expected**:
- Currently: Not implemented
- Future: Loop through all matching items
- Multiple events generated

### 18. Player takes part of an item
**Setup**: Coat with pockets (pocket is separate entity)
**Command**: "take pocket"
**Expected**:
- Should fail - pocket has SceneryTrait
- Message: "The pocket is sewn into the coat."

---

## Design Validation Questions

Based on these scenarios:

1. **Do we need to track where items came from?**
   - No, not for core functionality
   - "Taken." works for all success cases
   - Specific messages are nice-to-have

2. **Do we need to emit removal events?**
   - No, WearableBehavior handles its own events
   - Taking action just reports taking

3. **Does scope validation handle all access checks?**
   - Yes for closed/locked containers
   - Yes for darkness
   - Yes for reachability

4. **What validation belongs in the action?**
   - Can't take self
   - Can't take rooms  
   - Can't take scenery
   - Already holding check
   - Capacity checks (via ActorBehavior)

5. **What mutations are needed?**
   - WearableBehavior.remove() if worn
   - world.moveEntity() to move item

---

## Conclusion

The simplified design works for all scenarios:
- Remove context pollution
- Let scope handle visibility/access
- Let behaviors handle their own events
- Keep validation simple and focused
- Use generic "Taken." message
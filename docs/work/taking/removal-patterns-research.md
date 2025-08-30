# Removal Patterns Research

## Three Distinct Actions

### 1. TAKING (`take X`)
**Purpose**: Pick up an object from anywhere
**Patterns**: `take X`, `get X`, `pick up X`
**Examples**: 
- `take coin` (from floor)
- `take book` (from table) 
- `take key` (from open box)
**Events**:
- `if.event.taken`
- `action.success` with messageId: "taken" or "taken_from"

### 2. REMOVING (`remove X from Y`, `take X from Y`)
**Purpose**: Explicitly take something FROM a container/supporter
**Patterns**: `remove X from Y`, `take X from Y`, `get X from Y`
**Examples**:
- `remove coin from box`
- `take book from shelf`
- `get key from drawer`
**Events**:
- `if.event.taken` (reuses same event as taking!)
- `action.success` with messageId: "removed_from" or "removed_from_surface"

### 3. TAKING_OFF (`take off X`, `remove X`)
**Purpose**: Remove worn clothing/accessories
**Patterns**: `take off X`, `take X off`, `remove X`, `doff X`
**Examples**:
- `take off hat`
- `remove coat`
- `doff gloves`
**Events**:
- `if.event.removed`
- `action.success` with messageId: "removed"

---

## Event Overlap and Confusion

### `if.event.taken` used by:
- **taking** action - when picking something up
- **removing** action - when taking from container (same event!)

### `if.event.removed` used by:
- **taking_off** action - when removing worn items
- **taking** action (sometimes) - when implicitly removing worn items

### The Problem
The current taking action tries to handle implicit removal of worn items:
```typescript
// If taking a worn hat, it:
1. Calls WearableBehavior.remove() to unmark as worn
2. Emits if.event.removed (implicit: true)
3. Moves item to inventory
4. Emits if.event.taken
```

---

## Container Interaction Patterns

### Taking from Containers (Implicit)
**Command**: `take key` (where key is in a box)
**Action**: taking
**Behavior**: 
- Scope must allow reaching into box (open)
- Just moves item to inventory
- Should indicate it came from box somehow

### Removing from Containers (Explicit)
**Command**: `take key from box`
**Action**: removing
**Behavior**:
- Explicitly specifies the source
- Uses ContainerBehavior.removeItem()
- Then uses ActorBehavior.takeItem()
- Clearer intent

---

## The Context Pollution Issue

All three actions currently pollute context:

### taking
```typescript
(context as any)._previousLocation = previousLocation;
(context as any)._implicitlyRemoved = true;
```

### removing
```typescript
(context as any)._removeResult = removeResult;
(context as any)._takeResult = takeResult;
```

### taking_off
Doesn't seem to pollute context (good!)

---

## Questions to Resolve

1. **Should `taking` emit `if.event.removed` for worn items?**
   - Currently: Yes (with implicit: true)
   - Alternative: No, just emit `if.event.taken`

2. **How to track where items came from without context pollution?**
   - Option A: Don't track it (always use "Taken.")
   - Option B: Local variables in action class
   - Option C: Query world state in report phase
   - Option D: Use witness system

3. **Should `taking` and `removing` share the same event?**
   - Currently: Both emit `if.event.taken`
   - This seems confusing

4. **Message selection for taking**
   - "taken" - simple message
   - "taken_from" - requires container name
   - How to choose without tracking source?

---

## NPCs and Future Considerations

When taking from NPCs:
- `take sword from guard` - Should this work?
- Might trigger conflict/dialogue
- Different from container removal
- May need special handling

---

## Recommendations

1. **Simplify taking action**:
   - Don't track previous location
   - Always use "taken" message
   - Still emit `if.event.removed` for worn items (for consistency)

2. **Keep removing action separate**:
   - It's for explicit "from" commands
   - It knows the source container
   - Can use "taken_from" message

3. **Fix context pollution**:
   - Use local variables or query world state
   - Don't store on context object

4. **Consider event naming**:
   - Maybe removing should emit `if.event.removed_from_container`?
   - Keep `if.event.taken` for simple taking?
   - This would be clearer but breaking change
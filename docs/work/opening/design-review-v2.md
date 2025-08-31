# Opening Action Design Review (Revised)

## Core Principle: Atomic Events

After extensive discussion, we've identified that the opening action should emit truly atomic events - each representing one discrete fact about what changed in the world.

## Atomic Event Design

### For Opening a Container with Items

Instead of one fat event with all data, emit separate atomic facts:

1. **`if.event.opened`** - The state change
   ```typescript
   {
     targetId: "box",
     targetName: "box"
   }
   ```

2. **`if.event.revealed`** - Each item becomes accessible (one event per item)
   ```typescript
   {
     itemId: "ball",
     itemName: "red ball",
     containerId: "box"
   }
   ```

### For Opening a Door

1. **`if.event.opened`** - The state change
   ```typescript
   {
     targetId: "door",
     targetName: "wooden door"
   }
   ```

2. **`if.event.exit_revealed`** - New passage available
   ```typescript
   {
     direction: "north",
     fromRoomId: "hallway",
     toRoomId: "kitchen"
   }
   ```

## What "Atomic" Means for Opening

The atomic fact is: **"Entity X changed from closed to open"**

Everything else is either:
- **Side effects** (items revealed, exits revealed) - separate atomic events
- **Presentation concerns** (how to display) - platform's job
- **Sensory effects** (smells, sounds, light) - story's job via event handlers
- **Computed values** (counts, emptiness) - derivable by consumers

## Stdlib vs Story Responsibilities

### Stdlib (Opening Action) Provides:
- **Mechanical facts**: What opened, what was revealed
- **Topological facts**: New exits available
- **State changes**: Closed → Open

### Story Layer Provides (via Event Handlers):
- **Sensory events**: Smells, sounds, light changes
- **Narrative significance**: Memories, emotions, atmosphere
- **Custom mechanics**: Traps, magic effects, puzzles

### Example Story Handler:
```typescript
on("if.event.opened", (event) => {
  if (event.targetId === "kitchen_door") {
    // Story adds sensory layer
    emit("if.event.smell_detected", {
      sourceId: "bread",
      intensity: "strong"
    });
    
    // Story adds atmosphere
    emit("if.event.light_change", {
      fromLevel: "dim",
      toLevel: "bright"
    });
    
    // Story adds narrative
    emit("if.event.memory_triggered", {
      memory: "grandmother's kitchen"
    });
  }
});
```

## Benefits of This Approach

1. **True Atomicity**: Each event is one fact
2. **Composability**: Stories compose atomic events into experiences
3. **Flexibility**: Event handlers can subscribe to just what they need
4. **Clean Boundaries**: Clear separation between mechanical and narrative
5. **Extensibility**: Stories can add any sensory/narrative layer

## What We're NOT Doing

### Not Pre-computing Display Data:
- ❌ `contentsCount`, `hasContents`, `revealedItems`
- ✅ Consumers count revealed events if they care

### Not Packaging Everything:
- ❌ One event with `contentsSnapshots` array
- ✅ Separate `revealed` event per item

### Not Predicting Needs:
- ❌ Including all possible data "just in case"
- ✅ Minimal facts that consumers can query/compose

## Implementation Changes Needed

1. **Simplify `if.event.opened`**:
   - Remove redundant fields (containerId, containerName, item)
   - Remove computed fields (counts, hasContents)
   - Remove snapshots (consumers can query world)
   - Keep only: targetId, targetName

2. **Add `if.event.revealed`**:
   - Emit one per revealed item
   - Include: itemId, itemName, containerId

3. **Add `if.event.exit_revealed`** (for doors):
   - Include: direction, fromRoomId, toRoomId

4. **Remove Data Prefetching**:
   - No contents snapshots
   - No automatic aggregation
   - Let consumers query what they need

## Example: Complete Event Flow

**Command**: OPEN TREASURE CHEST (containing gold, map, key)

**Events Emitted**:
```typescript
// 1. The opening
{ type: "if.event.opened", targetId: "chest", targetName: "treasure chest" }

// 2. Each reveal
{ type: "if.event.revealed", itemId: "gold", itemName: "gold coins", containerId: "chest" }
{ type: "if.event.revealed", itemId: "map", itemName: "ancient map", containerId: "chest" }
{ type: "if.event.revealed", itemId: "key", itemName: "silver key", containerId: "chest" }

// 3. Success
{ type: "action.success", actionId: "opening", messageId: "opened" }
```

**Story Handler Adds** (if desired):
```typescript
{ type: "if.event.light_reflected", source: "gold", description: "gleaming" }
{ type: "if.event.significance", item: "map", meaning: "quest_started" }
```

## Design Philosophy

**Mechanical Layer** (stdlib): What physically happened
**Narrative Layer** (story): What it means
**Presentation Layer** (platform): How to show it

Each layer subscribes to the events it cares about and adds its own interpretation. The stdlib should never try to predict or provide narrative/presentation concerns.

## Questions Resolved

1. **Why not just use directObjectId?** 
   - Each action is its own bounded context with its own language
   - "target" is more meaningful than "directObject" in opening's context

2. **What about snapshots?**
   - Not needed - consumers have access to world model
   - Snapshots are for distributed/audit scenarios we don't have

3. **How do stories add sensory effects?**
   - Through event handlers, not stdlib configuration
   - Stdlib provides mechanical facts, stories add narrative layer

## Next Steps

1. Implement simplified opening events
2. Add revealed event generation
3. Document this pattern for other actions
4. Consider applying to other "revealing" actions (examining, searching)
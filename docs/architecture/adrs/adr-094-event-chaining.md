# ADR-094: Event Chaining

## Status: Accepted

## Context

When certain events occur in the game, they should automatically trigger related events. For example:
- When a container is opened (`if.event.opened`), items inside become visible (`if.event.revealed`)
- When an item is taken that was covering something, the hidden item is revealed
- When an item is put in a machine, the machine might activate
- Story-specific chains: stepping on a tile triggers a trap

Currently, the platform has two event handler mechanisms:
1. **WorldModel.registerEventHandler()** - Returns `void`, cannot emit new events
2. **EventProcessor.registerHandler()** - CAN return events, but authors don't interact with it directly

This gap means:
- Authors can react to events but can't chain them
- Standard chains like `opened → revealed` must be hard-coded in actions
- Story authors have no clean API for custom event chains

## Decision Drivers

1. **Author ergonomics** - Should be easy for story authors to define chains
2. **Consistency** - Standard IF behaviors (opened reveals contents) should work uniformly
3. **Flexibility** - Stories need custom chains for puzzles and mechanics
4. **Debuggability** - Event chains should be traceable
5. **Performance** - Chains shouldn't create infinite loops or excessive events

## Options Considered

### Option A: Extend WorldModel.registerEventHandler to Return Events

Change the handler signature from `void` to `ISemanticEvent[]`:

```typescript
// Current
type EventHandler = (event: ISemanticEvent, world: IWorldModel) => void;

// Proposed
type EventHandler = (event: ISemanticEvent, world: IWorldModel) => ISemanticEvent[] | void;
```

**Pros:**
- Minimal API change - authors already know `registerEventHandler`
- Returned events flow through existing EventProcessor pipeline
- Backward compatible (void still works)

**Cons:**
- Mixes reaction logic with event creation
- Handler registration doesn't indicate it will chain

### Option B: Explicit chainEvent API

Add a dedicated method for declaring chains:

```typescript
world.chainEvent(
  'if.event.opened',
  (event, world) => {
    const contents = world.getContents(event.data.targetId);
    if (contents.length === 0) return null;

    return {
      type: 'if.event.revealed',
      data: {
        containerId: event.data.targetId,
        items: contents.map(item => ({
          entityId: item.id,
          messageId: item.name
        }))
      }
    };
  }
);
```

**Pros:**
- Clear intent - this handler creates new events
- Can have different semantics (chains vs reactions)
- Easy to list/debug all chains

**Cons:**
- New API to learn
- Two ways to handle events

### Option C: Declarative Chain Configuration

Configuration-based approach:

```typescript
world.registerEventChain({
  id: 'opened-reveals-contents',
  trigger: 'if.event.opened',
  emit: 'if.event.revealed',
  condition: (event, world) => {
    const target = world.getEntity(event.data.targetId);
    return target?.has(TraitType.CONTAINER);
  },
  transform: (event, world) => {
    const contents = world.getContents(event.data.targetId);
    return {
      containerId: event.data.targetId,
      containerName: event.data.targetName,
      items: contents.map(item => ({
        entityId: item.id,
        messageId: item.name
      }))
    };
  }
});
```

**Pros:**
- Self-documenting chain definitions
- Easy to introspect/debug
- Can enforce patterns (always have id, condition, etc.)

**Cons:**
- More verbose for simple cases
- Configuration objects vs functions

### Option D: Entity-Based Chain Declaration

Entities declare what events they emit when receiving events:

```typescript
// On the container entity
container.registerChain('if.event.opened', (event, world) => {
  return [{
    type: 'if.event.revealed',
    data: { ... }
  }];
});
```

**Pros:**
- Chains are co-located with entities
- Natural for entity-specific behavior

**Cons:**
- Doesn't work for global chains
- Duplicates capability dispatch pattern

## Decision

**Option B (chainEvent API)** - Direct functions over configuration objects.

Rationale:
1. Clear separation of "react to event" vs "chain to new event"
2. Simple for authors - one method call, return events
3. Flexible - can return zero, one, or many events of any type based on conditions
4. Consistent with Sharpee patterns - actions, behaviors, and handlers are all direct functions
5. EventProcessor already supports returning events - just need to wire it
6. Easy to debug - straight function calls, no config interpretation

## Proposed API

### For Authors (WorldModel)

```typescript
// Simple chain - return event(s) or null/empty to skip
world.chainEvent('if.event.opened', (event, world) => {
  const target = world.getEntity(event.data.targetId);
  if (!target?.has(TraitType.CONTAINER)) return null;

  const contents = world.getContents(event.data.targetId);
  if (contents.length === 0) return null;

  return {
    type: 'if.event.revealed',
    data: {
      containerId: event.data.targetId,
      containerName: event.data.targetName,
      items: contents.map(item => ({
        entityId: item.id,
        messageId: item.name
      }))
    }
  };
});

// Multiple events from one chain
world.chainEvent('some.event', (event, world) => {
  return [
    { type: 'first.chained', data: {...} },
    { type: 'second.chained', data: {...} }
  ];
});
```

### Chain Registration: Cascade vs Override

When multiple chains are registered for the same trigger event, the author can choose:

**Cascade (default)** - All chains fire, events accumulate:
```typescript
// stdlib registers
world.chainEvent('if.event.opened', revealContentsHandler);

// story adds additional behavior - BOTH fire
world.chainEvent('if.event.opened', checkForTrapsHandler, { mode: 'cascade' });
```

Result: Both `if.event.revealed` and `dungeo.trap.check` events emitted.

**Override** - Replace previous chains for this trigger:
```typescript
// stdlib registers standard reveal behavior
world.chainEvent('if.event.opened', standardRevealHandler);

// story wants completely custom behavior - REPLACES stdlib
world.chainEvent('if.event.opened', customRevealHandler, { mode: 'override' });
```

Result: Only custom handler fires, stdlib handler is removed.

**Keyed chains** - Named chains can be selectively replaced:
```typescript
// stdlib registers with a key
world.chainEvent('if.event.opened', standardRevealHandler, {
  key: 'stdlib.opened.reveal'
});

// story replaces just that chain by key
world.chainEvent('if.event.opened', customRevealHandler, {
  key: 'stdlib.opened.reveal'  // same key = replacement
});

// story adds additional chain with different key - both fire
world.chainEvent('if.event.opened', trapCheckHandler, {
  key: 'dungeo.opened.trap-check'
});
```

### Options Object

```typescript
interface ChainEventOptions {
  /**
   * How to handle existing chains for this trigger:
   * - 'cascade' (default): Add to existing chains, all fire
   * - 'override': Replace ALL existing chains for this trigger
   */
  mode?: 'cascade' | 'override';

  /**
   * Unique key for this chain. Chains with same key replace each other.
   * Useful for stdlib to define replaceable defaults.
   */
  key?: string;

  /**
   * Priority for ordering when multiple chains fire (lower = earlier)
   * Default: 100
   */
  priority?: number;
}
```

### Example: Story Customization

```typescript
// stdlib default: opening reveals contents
world.chainEvent('if.event.opened', (event, world) => {
  // ... reveal contents
}, { key: 'stdlib.opened.reveal', priority: 100 });

// Story wants custom reveal that includes trap detection
world.chainEvent('if.event.opened', (event, world) => {
  const revealed = getRevealedContents(event, world);
  const trapTriggered = checkForTrap(event, world);

  const events = [];
  if (revealed) events.push(revealed);
  if (trapTriggered) events.push(trapTriggered);
  return events;
}, {
  key: 'stdlib.opened.reveal',  // replaces stdlib version
  priority: 100
});
```

### For Stdlib (Pre-registered Chains)

```typescript
// In stdlib initialization
export function registerStandardChains(world: WorldModel): void {
  // opened → revealed
  world.chainEvent('if.event.opened', createOpenedRevealedChain());
}

function createOpenedRevealedChain() {
  return (event: ISemanticEvent, world: IWorldModel) => {
    // ... implementation
  };
}
```

## Implementation

### Phase 1: Core API

1. Add `chainEvent()` method to WorldModel
2. Store chain handlers separately from reaction handlers
3. Wire chain handlers to EventProcessor to return events
4. Returned events are processed in the same turn

### Phase 2: Standard Chains

1. Create `opened → revealed` chain in stdlib
2. Register standard chains in engine initialization
3. Update opening action to NOT emit revealed (chain handles it)

### Phase 3: Debugging

1. Add chain tracing to event metadata
2. `event.meta.chainedFrom: 'if.event.opened'`
3. Tools to list registered chains

## Safety Considerations

### Infinite Loop Prevention

```typescript
// Track chain depth
const MAX_CHAIN_DEPTH = 10;

// In chain processing
if (event.meta?.chainDepth >= MAX_CHAIN_DEPTH) {
  console.warn(`Chain depth exceeded for ${event.type}`);
  return [];
}

// Increment depth on chained events
chainedEvent.meta = {
  ...chainedEvent.meta,
  chainDepth: (event.meta?.chainDepth || 0) + 1,
  chainedFrom: event.type
};
```

### Order Guarantees

- Chained events are processed AFTER the triggering event completes
- Multiple chains on same event type are processed in registration order
- Chained events can themselves trigger chains (up to depth limit)

## Event Metadata

All events within a single player action share a `transactionId`. This enables:
- Grouping related events for prose rendering
- Correct ordering (action result before consequences)
- Debugging/tracing event flow

### Metadata Fields

```typescript
interface EventMeta {
  /** Groups all events from one player action */
  transactionId: string;

  /** The event type that triggered this chain (if chained) */
  chainedFrom?: string;

  /** How deep in the chain (0 = original, 1 = first chain, etc.) */
  chainDepth: number;
}
```

### Transaction Flow

```
Player: "open chest"

Transaction: txn-abc-123
├── action.success    { transactionId: 'txn-abc-123', chainDepth: 0 }
├── if.event.opened   { transactionId: 'txn-abc-123', chainDepth: 0 }
└── if.event.revealed { transactionId: 'txn-abc-123', chainDepth: 1, chainedFrom: 'if.event.opened' }
```

### Engine Responsibility

Engine assigns `transactionId` at the start of each player action. All events
emitted during that action (including chained events) inherit the same ID.

TextService uses `transactionId` to group events and `chainDepth` to sort them
for correct prose ordering (see ADR-096).

## Examples

### Story: Trap Triggered by Movement

```typescript
// When player enters trap room, trigger trap
world.chainEvent('if.event.actor_entered', (event, world) => {
  if (event.data.roomId !== trapRoomId) return null;
  if (world.getStateValue('trap.triggered')) return null;

  world.setStateValue('trap.triggered', true);

  return {
    type: 'dungeo.trap.triggered',
    data: {
      trapId: 'poison-dart-trap',
      roomId: trapRoomId,
      targetId: event.data.actorId
    }
  };
});
```

### Story: Machine Activation

```typescript
// When coal is put in machine, machine activates
world.chainEvent('if.event.put_in', (event, world) => {
  if (event.data.containerId !== machineId) return null;
  if (event.data.itemId !== coalId) return null;

  return {
    type: 'dungeo.machine.activated',
    data: {
      machineId: machineId,
      fuelId: coalId
    }
  };
});
```

## Text Service Consumption

A key consumer of the event stream is the text service, which renders events as prose. Event chaining must produce a coherent narrative.

### The Event Stream as Narrative

When the player types "open chest", the event stream should tell the complete story:

```
Turn 5:
  if.event.opened       { targetId: 'chest', targetName: 'wooden chest' }
  if.event.revealed     { containerId: 'chest', items: [{...}, {...}] }
  action.success        { messageId: 'opening.opened', params: {...} }
```

The text service renders this as:
> You open the wooden chest. Inside you see a gold coin and a rusty key.

### Requirements for Clear Rendering

1. **Complete information** - Each event must contain enough data for the language layer to render it without additional queries

2. **Correct ordering** - Events must appear in the stream in narrative order:
   - First: the action that happened (`opened`)
   - Then: consequences of that action (`revealed`)
   - Finally: success/completion message

3. **Relationship clarity** - The text service must know events are related:
   ```typescript
   // Chained events include origin reference
   revealedEvent.meta = {
     chainedFrom: 'if.event.opened',
     chainSourceId: openedEvent.id
   };
   ```

4. **Message IDs for items** - Revealed items need message IDs so the language layer can render them appropriately:
   ```typescript
   items: [
     { entityId: 'gold-coin', messageId: 'if.item.gold_coin' },
     { entityId: 'rusty-key', messageId: 'if.item.rusty_key' }
   ]
   ```

   This allows different renderings:
   - "a gold coin" (indefinite)
   - "the gold coin" (definite, if seen before)
   - "una moneda de oro" (Spanish)

### Text Service Handler Pattern

```typescript
// In lang-en-us
registerEventRenderer('if.event.revealed', (event, context) => {
  const { containerName, items } = event.data;

  if (items.length === 0) return ''; // Empty, no text

  const itemList = items
    .map(item => context.getIndefiniteNoun(item.messageId))
    .join(', ');

  return `Inside the ${containerName} you see ${itemList}.`;
});
```

### Why This Matters

Without proper event structure:
- Text service would need to query world state to know what's in the container
- Queries during rendering create timing issues (world may have changed)
- Language layer can't properly decline/conjugate without message IDs
- No way to know which events belong together for paragraph grouping

With proper event structure:
- Events are self-contained snapshots of "what happened"
- Text service renders declaratively from event data
- Chained events can be grouped into coherent paragraphs
- Translation/localization has all needed information

## Open Questions

1. Should chains be removable? `world.unchainEvent(id)`?
2. Should we support conditional chains in the API itself?
3. How do chains interact with event validation/preview?
4. Should chained events be distinguishable in the event stream?
5. How should the text service group related events into paragraphs?

## References

- ADR-052: Event Handlers for Custom Logic
- ADR-086: EventProcessor Integration
- Current EventProcessor implementation in `packages/engine/src/`

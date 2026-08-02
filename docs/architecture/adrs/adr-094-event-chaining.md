# ADR-094: Event Chaining

## Status: Accepted — **Amended A1** (2026-08-02, session f081ec): implementation reality recorded fourteen months on — the chaining mechanism and its positional ordering rule are load-bearing and unchanged; the metadata-based *re-ordering* layer (§Event Metadata's `transactionId` grouping and the prose-side `chainDepth` sort) was never completed and never carried the ordering, and its retirement is proposed by ADR-296 (DRAFT). See Amendment A1 at the end of this document.

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

## Amendment A1 (2026-08-02, session f081ec) — what this ADR built, what carried the load, and what did not

Recorded during the GH #208 investigation (ADR-296 DRAFT). This amendment changes no
decision retroactively; it records which parts of this ADR proved load-bearing so that
ADR-296's proposed retirement of the remainder is legible against the original intent.

### The chaining mechanism was needed, is used, and is untouched

The core of this ADR — `world.chainEvent()`, `executeChains` dispatch through the
event processor, the depth limit, cascade/override/key registration — is load-bearing
platform surface today:

- The **Chord story-loader** wires every declarative author reaction through
  `chainEvent` (`story-loader/src/loader.ts:382`, `runtime.ts:523`) — chaining is the
  runtime substrate for Chord's event responses, far beyond this ADR's original examples.
- Story TS code uses it directly: family-zoo-tutorial (six chains — scoring and
  dynamic text), dungeo (carousel entry message, ADR-295).

Nothing in ADR-296 alters registration, dispatch, the depth limit, or handler shape.

### The ordering guarantee that carried the load is POSITIONAL, and it was specified here

This ADR's processing rule — "chained events are processed AFTER the triggering event
completes" — is what actually guarantees cause-before-consequence: `executeChains`
returns the chained events as processor emissions at the moment the trigger is
processed, so they enter the turn stream after their trigger, by construction. That
guarantee has carried consequence ordering for the entire life of this feature.

One property of it is worth stating explicitly, because the old prose-sort sometimes
masked it: a chained event's stream position is **relative to its trigger**, not to the
end of the action's narration. Narration chained off an early event (e.g.
`if.event.actor_moved`, which the going action emits before its room description)
renders before the room description. That is frequently the wanted order (ADR-295's
carousel entry message; MDL prints travel narration before arrivals); an author who
wants consequence prose after the description chains off a later event. The retired
room-description hoist reordered some of these cases as a side effect, but it was
never a principled "consequences last" mechanism — it also reordered cases the wrong
way (ADR-296 Context, probe evidence).

### The metadata re-ordering layer never carried anything

§Event Metadata specified `transactionId` grouping ("Engine assigns transactionId at
the start of each player action") plus prose-side sorting by `chainDepth`. What
actually shipped: chain dispatch stamps `_chainDepth`/`_chainedFrom`/`_chainSourceId`
and *inherits* `_transactionId` (`WorldEventSystem.executeChains`), but **no origin
ever stamps the field** — the engine half was never built. The prose sort's
within-transaction rules therefore compared `undefined === undefined` and applied
turn-globally (GH #208), while the positional rule above silently provided the real
ordering. Fourteen months and two hundred ADRs passed without anyone noticing the
metadata layer was inert — which is the strongest evidence that the positional
guarantee, not the metadata, is the invariant.

ADR-296 (DRAFT v3 at this writing; design source
`docs/work/prose-order/design-20260802-turn-narrative-slots.md`) proposes delivering
this ADR's authorial promise by a better mechanism than the one specified here: the
engine gains the missing origin stamping (one transaction per player action, one per
plugin batch), and chained narration gets a **declared narrative slot** (default
`afterRoomDescription`) placing it within its transaction's frame — while the
depth-sort mechanism this ADR specified for the same purpose is retired (slot
declaration is what depth sorting was groping at, stated in author terms), and the
prose sort's room-description and `action.*` hoists (no authorial contract behind
them; reordering against emitters' intent) are removed. The chain-provenance stamps
remain. The metadata layer was not needless; it was unfinished, and the finishing
changed its shape. If ADR-296 is not accepted, this amendment still stands as the
accurate record of what was and was not implemented.

**Further (2026-08-02, ADR-296 ACCEPTED and implemented):** the promise is
delivered via slots. The engine's two funnels now stamp real per-source
`_transactionId`s (`txn:{turn}:action`, `txn:{turn}:plugin:{id}`), chains
declare a narrative slot (`ChainEventOptions.slot`, stamped as
`_narrativeSlot` on produced phrase events), and the prose sort places
slot-stamped phrases at their transaction's frame boundary. The depth-sort
mechanism is retired — the chain-depth comparator and the type-based hoists
are deleted from `sort.ts` — and the provenance stamps
(`_chainedFrom`/`_chainSourceId`/`_chainDepth`) remain.

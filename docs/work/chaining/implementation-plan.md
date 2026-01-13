# Event Chaining Implementation Plan

## Overview

Implement ADR-094: Event Chaining - Allow events to trigger other events through a `world.chainEvent()` API.

## Goal

Enable authors to define event chains where one event automatically triggers related events:
- `if.event.opened` → `if.event.revealed` (container contents)
- Story-specific chains (traps, machines, puzzles)

## Phase 1: Core API in WorldModel ✅ COMPLETE

**Completed**: 2026-01-13
**Tests**: 23 passing

**Implementation Notes**:
- Chain metadata stored in `data._chainedFrom`, `data._chainSourceId`, `data._chainDepth` (not `meta` - ISemanticEvent doesn't have that field)
- Types exported from `packages/world-model/src/world/index.ts`
- Test file: `packages/world-model/tests/unit/world/event-chaining.test.ts`

### 1.1 Add Types

**File:** `packages/world-model/src/world/WorldModel.ts`

```typescript
// Chain handler type - returns events to emit (or null/empty)
export type EventChainHandler = (
  event: ISemanticEvent,
  world: IWorldModel
) => ISemanticEvent | ISemanticEvent[] | null | void;

// Options for chain registration
export interface ChainEventOptions {
  mode?: 'cascade' | 'override';
  key?: string;
  priority?: number;
}

// Internal chain registration
interface ChainRegistration {
  handler: EventChainHandler;
  key?: string;
  priority: number;
}
```

### 1.2 Add Storage

**File:** `packages/world-model/src/world/WorldModel.ts`

```typescript
// In WorldModel class
private eventChains: Map<string, ChainRegistration[]> = new Map();
```

### 1.3 Add chainEvent Method

**File:** `packages/world-model/src/world/WorldModel.ts`

```typescript
chainEvent(
  triggerType: string,
  handler: EventChainHandler,
  options: ChainEventOptions = {}
): void {
  const { mode = 'cascade', key, priority = 100 } = options;

  const registration: ChainRegistration = { handler, key, priority };

  if (!this.eventChains.has(triggerType)) {
    this.eventChains.set(triggerType, []);
  }

  const chains = this.eventChains.get(triggerType)!;

  if (mode === 'override') {
    // Replace all existing chains
    this.eventChains.set(triggerType, [registration]);
  } else if (key) {
    // Replace chain with same key, or add
    const existingIndex = chains.findIndex(c => c.key === key);
    if (existingIndex >= 0) {
      chains[existingIndex] = registration;
    } else {
      chains.push(registration);
    }
  } else {
    // Cascade - just add
    chains.push(registration);
  }

  // Sort by priority
  chains.sort((a, b) => a.priority - b.priority);

  // Wire to EventProcessor if connected
  if (this.eventProcessorWiring) {
    this.wireChainToProcessor(triggerType);
  }
}
```

### 1.4 Wire Chains to EventProcessor

**File:** `packages/world-model/src/world/WorldModel.ts`

```typescript
private wireChainToProcessor(triggerType: string): void {
  if (!this.eventProcessorWiring) return;

  // Register a handler that invokes all chains and returns their events
  this.eventProcessorWiring.registerHandler(triggerType, (event) => {
    return this.executeChains(triggerType, event);
  });
}

private executeChains(triggerType: string, event: ISemanticEvent): ISemanticEvent[] {
  const chains = this.eventChains.get(triggerType) || [];
  const results: ISemanticEvent[] = [];

  for (const chain of chains) {
    const chainedEvents = chain.handler(event, this);

    if (chainedEvents) {
      const eventsArray = Array.isArray(chainedEvents) ? chainedEvents : [chainedEvents];

      // Add chain metadata
      for (const chainedEvent of eventsArray) {
        chainedEvent.meta = {
          ...chainedEvent.meta,
          chainedFrom: event.type,
          chainSourceId: event.id,
          chainDepth: ((event.meta?.chainDepth as number) || 0) + 1
        };

        // Safety: prevent infinite loops
        if ((chainedEvent.meta.chainDepth as number) > 10) {
          console.warn(`Chain depth exceeded for ${chainedEvent.type}`);
          continue;
        }

        results.push(chainedEvent);
      }
    }
  }

  return results;
}
```

### 1.5 Export Types

**File:** `packages/world-model/src/index.ts`

Add exports for new types.

### 1.6 Tests

**File:** `packages/world-model/tests/event-chaining.test.ts`

- Test basic chain registration
- Test cascade mode (multiple chains fire)
- Test override mode (replaces all)
- Test keyed replacement
- Test priority ordering
- Test chain depth limit
- Test metadata propagation

## Phase 2: Standard Chains in Stdlib ✅ COMPLETE

**Completed**: 2026-01-13
**Tests**: 15 passing

**Implementation Notes**:
- Chain key is `stdlib.chain.opened-revealed` (not `stdlib.opened.reveal`)
- Entities use standard fields: `target` for container, `others` for items (ISemanticEvent constraint)
- Registration happens in GameEngine constructor after `connectEventProcessor()`
- Test file: `packages/stdlib/tests/unit/chains/opened-revealed.test.ts`

### 2.1 Create Opened→Revealed Chain

**File:** `packages/stdlib/src/chains/opened-revealed.ts`

- Created `createOpenedRevealedChain()` factory function
- Checks if target is a container with contents
- Returns `null` for non-containers or empty containers
- Generates `if.event.revealed` with `RevealedEventData`
- Uses `entities.target` for container ID, `entities.others` for item IDs

### 2.2 Register Standard Chains

**File:** `packages/stdlib/src/chains/index.ts`

- Created `registerStandardChains(world)` function
- Registers opened→revealed chain with priority 100
- Exports chain key for story overrides

### 2.3 Wire Registration into Engine

**File:** `packages/engine/src/game-engine.ts`

- Added import for `registerStandardChains`
- Called in constructor after `world.connectEventProcessor(wiring)`
- Comment explains dependency on EventProcessor connection

### 2.4 Export from Stdlib

**File:** `packages/stdlib/src/index.ts`

- Added `export * from './chains';`

### 2.5 Tests

**File:** `packages/stdlib/tests/unit/chains/opened-revealed.test.ts`

15 tests covering:
- Basic behavior (container with contents, non-containers, empty containers)
- Multiple items handling
- Event data structure (entities, id, type, timestamp)
- Item messageId resolution (name fallback to id)
- Chain key constant
- Container name fallback from world

## Phase 3: Language Layer Support

### 3.1 Add Revealed Event Renderer

**File:** `packages/lang-en-us/src/events/revealed.ts`

```typescript
export function renderRevealed(event: ISemanticEvent, context: RenderContext): string {
  const { containerName, items } = event.data;

  if (!items || items.length === 0) {
    return '';
  }

  const itemList = items
    .map(item => context.indefiniteNoun(item.messageId))
    .join(', ');

  return `Inside the ${containerName} you see ${itemList}.`;
}
```

### 3.2 Register Renderer

Wire into LanguageProvider's event rendering system.

## Phase 4: Documentation & Debugging

### 4.1 Debug Tooling

Add method to list registered chains:

```typescript
world.getRegisteredChains(): Map<string, { key?: string; priority: number }[]>
```

### 4.2 Update Docs

- Update ADR-094 with implementation notes
- Add examples to story authoring guide

## File Changes Summary

### New Files (Phase 1)
- `packages/world-model/tests/unit/world/event-chaining.test.ts` ✅

### New Files (Phase 2)
- `packages/stdlib/src/chains/opened-revealed.ts` ✅
- `packages/stdlib/src/chains/index.ts` ✅
- `packages/stdlib/tests/unit/chains/opened-revealed.test.ts` ✅

### New Files (Phase 3 - pending)
- `packages/lang-en-us/src/events/revealed.ts`

### Modified Files (Phase 1)
- `packages/world-model/src/world/WorldModel.ts` - Add chainEvent API ✅
- `packages/world-model/src/world/index.ts` - Export new types ✅

### Modified Files (Phase 2)
- `packages/engine/src/game-engine.ts` - Register standard chains ✅
- `packages/stdlib/src/index.ts` - Export chains module ✅

## Testing Strategy

1. Unit tests for WorldModel.chainEvent
2. Unit tests for stdlib chains
3. Integration test: open container → revealed event in stream
4. Transcript test: verify "Inside you see..." text appears

## Open Items

- [ ] Determine proper message ID format for revealed items
- [ ] Consider whether chains should fire during event preview
- [ ] Add chain tracing to debug output

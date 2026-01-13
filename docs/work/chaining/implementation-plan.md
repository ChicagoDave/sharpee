# Event Chaining Implementation Plan

## Overview

Implement ADR-094: Event Chaining - Allow events to trigger other events through a `world.chainEvent()` API.

## Goal

Enable authors to define event chains where one event automatically triggers related events:
- `if.event.opened` → `if.event.revealed` (container contents)
- Story-specific chains (traps, machines, puzzles)

## Phase 1: Core API in WorldModel

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

## Phase 2: Standard Chains in Stdlib

### 2.1 Create Opened→Revealed Chain

**File:** `packages/stdlib/src/chains/opened-revealed.ts`

```typescript
import { ISemanticEvent, IWorldModel } from '@sharpee/world-model';
import { TraitType } from '@sharpee/world-model';

export const OPENED_REVEALED_CHAIN_KEY = 'stdlib.opened.reveal';

export function createOpenedRevealedChain() {
  return (event: ISemanticEvent, world: IWorldModel): ISemanticEvent | null => {
    const { targetId, targetName } = event.data as { targetId: string; targetName: string };

    const target = world.getEntity(targetId);
    if (!target?.has(TraitType.CONTAINER)) {
      return null;
    }

    const contents = world.getContents(targetId);
    if (contents.length === 0) {
      return null;
    }

    return {
      id: `revealed-${Date.now()}`,
      type: 'if.event.revealed',
      timestamp: Date.now(),
      entities: { container: targetId },
      data: {
        containerId: targetId,
        containerName: targetName,
        items: contents.map(item => ({
          entityId: item.id,
          messageId: item.name // TODO: proper message ID resolution
        }))
      }
    };
  };
}
```

### 2.2 Register Standard Chains

**File:** `packages/stdlib/src/chains/index.ts`

```typescript
import { WorldModel } from '@sharpee/world-model';
import { createOpenedRevealedChain, OPENED_REVEALED_CHAIN_KEY } from './opened-revealed';

export function registerStandardChains(world: WorldModel): void {
  world.chainEvent(
    'if.event.opened',
    createOpenedRevealedChain(),
    { key: OPENED_REVEALED_CHAIN_KEY, priority: 100 }
  );
}

export { OPENED_REVEALED_CHAIN_KEY };
```

### 2.3 Wire Registration into Engine

**File:** `packages/engine/src/game-engine.ts`

In `setStory()` or initialization, call `registerStandardChains(world)`.

### 2.4 Update Opening Action

**File:** `packages/stdlib/src/actions/standard/opening/opening.ts`

Remove the inline revealed event emission (already done in this session).
Add comment pointing to chain.

### 2.5 Tests

**File:** `packages/stdlib/tests/chains/opened-revealed.test.ts`

- Test revealed event emitted when container opened
- Test no event for non-containers
- Test no event for empty containers
- Test items array populated correctly

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

### New Files
- `packages/stdlib/src/chains/opened-revealed.ts`
- `packages/stdlib/src/chains/index.ts`
- `packages/lang-en-us/src/events/revealed.ts`
- `packages/world-model/tests/event-chaining.test.ts`
- `packages/stdlib/tests/chains/opened-revealed.test.ts`

### Modified Files
- `packages/world-model/src/world/WorldModel.ts` - Add chainEvent API
- `packages/world-model/src/index.ts` - Export new types
- `packages/engine/src/game-engine.ts` - Register standard chains
- `packages/stdlib/src/actions/standard/opening/opening.ts` - Already updated
- `packages/stdlib/src/index.ts` - Export chains module

## Testing Strategy

1. Unit tests for WorldModel.chainEvent
2. Unit tests for stdlib chains
3. Integration test: open container → revealed event in stream
4. Transcript test: verify "Inside you see..." text appears

## Open Items

- [ ] Determine proper message ID format for revealed items
- [ ] Consider whether chains should fire during event preview
- [ ] Add chain tracing to debug output

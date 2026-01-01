# ADR-082: Typed Event System

**Status:** Accepted
**Date:** 2026-01-01
**Implemented:** 2026-01-01
**Context:** Beta release preparation exposed type safety gaps in event system

## Problem Statement

The current `ISemanticEvent` interface defines `data` as `unknown`:

```typescript
export interface ISemanticEvent {
  id: string;
  type: string;
  timestamp: number;
  entities: { actor?: EntityId; target?: EntityId; /* ... */ };
  data?: unknown;  // ← The problem
  tags?: string[];
  priority?: number;
  narrate?: boolean;
}
```

This design has two issues:

1. **Stringly-typed discriminant:** `type: string` prevents TypeScript from narrowing event types
2. **Untyped payload:** `data?: unknown` forces consumers to use unsafe casts or `as any`

The monorepo refactor (workspace:* + project references) exposed this: `text-service-template` fails to build because it accesses `event.data.message` without proving to the compiler that `message` exists.

### Current State of the Codebase

Packages work around this inconsistently:
- `text-services`: Uses `as any` everywhere (technical debt)
- `text-service-browser`: Uses `event.data || {}` then accesses properties (unsafe)
- `transcript-tester`: Uses `event.data as any` (unsafe)
- `parser-en-us` tests: Uses `event.data as any` (unsafe)

This isn't type safety—it's type theater.

## Decision

Implement a **Type-Safe Event Registry** pattern that:
1. Defines all event types and their data shapes in a central registry
2. Provides type-safe event creation functions
3. Provides type-safe event consumption helpers
4. Maintains backward compatibility with existing `ISemanticEvent`

## Design

### 1. Event Data Registry

Create a central mapping of event type strings to their data interfaces:

```typescript
// packages/core/src/events/event-registry.ts

/**
 * Registry mapping event type strings to their data shapes.
 * This is the single source of truth for event data types.
 */
export interface EventDataRegistry {
  // Query events
  'query.pending': QueryPendingData;
  'query.invalid': QueryInvalidData;
  'query.response': QueryResponseData;

  // Message events
  'message.success': MessageData;
  'message.failure': MessageData;
  'message.info': MessageData;
  'message.warning': MessageData;

  // Game lifecycle
  'game.initialized': GameInitializedData;
  'game.started': GameStartedData;
  'game.ended': GameEndedData;

  // Platform events
  'platform.save_completed': SaveCompletedData;
  'platform.save_failed': SaveFailedData;
  'platform.restore_completed': RestoreCompletedData;
  'platform.restore_failed': RestoreFailedData;
  'platform.quit_confirmed': QuitConfirmedData;
  'platform.quit_cancelled': EmptyData;
  'platform.restart_completed': EmptyData;
  'platform.restart_cancelled': EmptyData;

  // Action events (from stdlib)
  // These are extensible - stdlib adds its own
}

// Common data interfaces
export interface EmptyData {}

export interface MessageData {
  messageId: string;
  params?: Record<string, unknown>;
}

export interface QueryPendingData {
  query: {
    messageId: string;
    messageParams?: Record<string, unknown>;
    options?: string[];
  };
}

export interface QueryInvalidData {
  message?: string;
  hint?: string;
}

export interface QueryResponseData {
  response: string | number;
}

export interface QuitConfirmedData {
  messageId?: string;
  finalScore?: number;
  maxScore?: number;
  moves?: number;
}

// ... other data interfaces
```

### 2. Typed Event Interface

A generic event type that carries its data type:

```typescript
// packages/core/src/events/typed-event.ts

import { EventDataRegistry } from './event-registry';
import { ISemanticEvent } from './types';

/**
 * A semantic event with typed data based on the event type.
 * Use this when you know the specific event type at compile time.
 */
export interface TypedSemanticEvent<T extends keyof EventDataRegistry>
  extends Omit<ISemanticEvent, 'type' | 'data'> {
  type: T;
  data: EventDataRegistry[T];
}

/**
 * Union of all known typed events.
 * Use for exhaustive event handling.
 */
export type KnownSemanticEvent = {
  [K in keyof EventDataRegistry]: TypedSemanticEvent<K>;
}[keyof EventDataRegistry];
```

### 3. Type-Safe Event Creation

Factory functions that ensure events are created with correct data:

```typescript
// packages/core/src/events/event-factory.ts

import { EventDataRegistry } from './event-registry';
import { TypedSemanticEvent } from './typed-event';
import { ISemanticEvent, EntityId } from './types';

let eventCounter = 0;

interface EventOptions {
  entities?: ISemanticEvent['entities'];
  tags?: string[];
  priority?: number;
  narrate?: boolean;
}

/**
 * Create a type-safe semantic event.
 * The data parameter is strictly typed based on the event type.
 */
export function createEvent<T extends keyof EventDataRegistry>(
  type: T,
  data: EventDataRegistry[T],
  options: EventOptions = {}
): TypedSemanticEvent<T> {
  return {
    id: `evt-${Date.now()}-${++eventCounter}`,
    type,
    timestamp: Date.now(),
    data,
    entities: options.entities ?? {},
    tags: options.tags,
    priority: options.priority,
    narrate: options.narrate
  };
}

/**
 * Create a message event (convenience helper).
 */
export function createMessageEvent(
  variant: 'success' | 'failure' | 'info' | 'warning',
  messageId: string,
  params?: Record<string, unknown>,
  options?: EventOptions
): TypedSemanticEvent<`message.${typeof variant}`> {
  return createEvent(
    `message.${variant}` as `message.${typeof variant}`,
    { messageId, params },
    options
  );
}
```

### 4. Type-Safe Event Consumption

Helper functions for safely extracting typed data from events:

```typescript
// packages/core/src/events/event-helpers.ts

import { EventDataRegistry } from './event-registry';
import { ISemanticEvent } from './types';

/**
 * Check if an event is of a specific type and narrow its type.
 * Returns true if the event matches, with TypeScript narrowing the type.
 */
export function isEventType<T extends keyof EventDataRegistry>(
  event: ISemanticEvent,
  type: T
): event is ISemanticEvent & { type: T; data: EventDataRegistry[T] } {
  return event.type === type;
}

/**
 * Get typed event data if the event matches the expected type.
 * Returns undefined if the event type doesn't match.
 */
export function getEventData<T extends keyof EventDataRegistry>(
  event: ISemanticEvent,
  expectedType: T
): EventDataRegistry[T] | undefined {
  if (event.type === expectedType) {
    return event.data as EventDataRegistry[T];
  }
  return undefined;
}

/**
 * Assert and get typed event data.
 * Throws if the event type doesn't match.
 */
export function requireEventData<T extends keyof EventDataRegistry>(
  event: ISemanticEvent,
  expectedType: T
): EventDataRegistry[T] {
  if (event.type !== expectedType) {
    throw new Error(
      `Expected event type '${expectedType}', got '${event.type}'`
    );
  }
  return event.data as EventDataRegistry[T];
}
```

### 5. Extensibility for Stdlib/Stories

The registry can be extended via TypeScript declaration merging:

```typescript
// packages/stdlib/src/events/stdlib-event-registry.ts

import { EventDataRegistry } from '@sharpee/core';

// Extend the core registry with stdlib action events
declare module '@sharpee/core' {
  interface EventDataRegistry {
    // Taking action events
    'action.taking.success': TakingSuccessData;
    'action.taking.blocked': TakingBlockedData;

    // Opening action events
    'action.opening.success': OpeningSuccessData;
    'action.opening.blocked': OpeningBlockedData;

    // ... all stdlib action events
  }
}

export interface TakingSuccessData {
  item: EntityId;
  from?: EntityId;
}

export interface TakingBlockedData {
  item: EntityId;
  reason: string;
  messageId: string;
}
// ... etc
```

Stories can do the same for custom events:

```typescript
// stories/dungeo/src/events/dungeo-events.ts

declare module '@sharpee/core' {
  interface EventDataRegistry {
    'dungeo.thief.steals': ThiefStealsData;
    'dungeo.lamp.flicker': LampFlickerData;
    // ... story-specific events
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Unblocks Build)
1. Create `event-registry.ts` with core event data interfaces
2. Create `typed-event.ts` with `TypedSemanticEvent`
3. Create `event-factory.ts` with `createEvent()`
4. Create `event-helpers.ts` with `isEventType()`, `getEventData()`
5. Export from `@sharpee/core`
6. Fix `text-service-template` using the new helpers

### Phase 2: Stdlib Event Types
1. Define data interfaces for all 43 action event types
2. Extend `EventDataRegistry` via declaration merging
3. Update action implementations to use `createEvent()`
4. Update text services to use typed consumption

### Phase 3: Migration
1. Audit all `as any` casts on event.data
2. Replace with typed helpers
3. Add lint rule to prevent `event.data as any`

### Phase 4: Documentation
1. Document the event type system
2. Add examples for story authors
3. Update core-concepts.md

## Alternatives Considered

### A. Keep `data?: unknown`, Add Local Type Guards

**Rejected:** This spreads type definitions across consumers. Each package defines its own interfaces, leading to drift and duplication.

### B. Change `data` to `Record<string, any>`

**Rejected:** This is just slightly-less-bad `any`. Doesn't provide real type safety.

### C. Make `ISemanticEvent` Generic

```typescript
interface ISemanticEvent<TData = unknown> {
  data?: TData;
}
```

**Rejected:** Requires updating every usage site. Functions that handle mixed event types become complex with generics. Declaration merging is cleaner.

## Consequences

### Positive
- Compile-time type safety for event data
- IDE autocomplete for event properties
- Centralized documentation of all event types
- Catches event data mismatches early
- Extensible for stdlib and stories

### Negative
- Must maintain the registry as events are added
- Some boilerplate for new event types
- Migration effort for existing code

### Neutral
- `ISemanticEvent` remains for backward compatibility
- Untyped events still work (for flexibility)

## Implementation Notes

### Phase 1: Core Infrastructure (Complete)

Created in `packages/core/src/events/`:

| File | Purpose |
|------|---------|
| `event-registry.ts` | Central `EventDataRegistry` with 25+ core event data interfaces |
| `typed-event.ts` | `TypedSemanticEvent<T>` generic and `KnownSemanticEvent` union |
| `event-factory.ts` | `createTypedEvent()`, `createMessageEvent()`, `createEmptyEvent()` |
| `event-helpers.ts` | `isEventType()`, `getEventData()`, `getEventDataWithDefaults()`, `getUntypedEventData()` |

All exported from `@sharpee/core`.

### Phase 2: Stdlib Event Types (Complete)

Created `packages/stdlib/src/events/event-registry.ts` extending core registry:

- **Taking/Dropping:** `if.event.taken`, `if.event.dropped`
- **Looking/Examining:** `if.event.looked`, `if.event.room.description`, `if.event.list.contents`, `if.event.examined`
- **Movement:** `if.event.actor_moved`, `if.event.actor_exited`, `if.event.actor_entered`
- **Opening/Closing:** `if.event.opened`, `if.event.closed`, `if.event.revealed`, `if.event.exit_revealed`
- **Containers:** `if.event.put_in`, `if.event.put_on`
- **Locking:** `if.event.locked`, `if.event.unlocked`
- **Wearing:** `if.event.worn`, `if.event.removed`
- **Entering/Exiting:** `if.event.entered`, `if.event.exited`
- **Switching:** `if.event.switched_on`, `if.event.switched_off`
- **Meta:** `if.event.score_displayed`, `if.action.inventory`
- **Generic:** `action.success`, `action.error`

### Phase 3: Migration (Complete)

Migrated 17 `event.data as any` usages in production code:

| Package | Files |
|---------|-------|
| `text-services` | `template-text-service.ts`, `cli-events-text-service.ts` |
| `text-service-template` | `index.ts` |
| `text-service-browser` | `index.ts` |
| `event-processor` | `device/index.ts`, `sensory.ts`, `complex-manipulation.ts` |
| `engine` | `game-engine.ts`, `event-adapter.ts` |

~40 casts remain in test files (lower priority, tests can use `as any` for flexibility).

### Phase 4: Documentation (Complete)

This ADR updated to reflect implementation. Key usage patterns documented in code.

## References

- TypeScript Handbook: [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- Pattern inspiration: Redux Toolkit's action type system
- Related: ADR-039 (Action Event Emission Pattern), ADR-042 (Stdlib Action Event Types)

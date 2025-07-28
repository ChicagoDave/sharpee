# @sharpee/if-domain

Core domain model and contracts for the Sharpee Interactive Fiction Platform.

## Overview

This package contains the shared domain types, events, and contracts that define the Interactive Fiction domain model. It serves as the single source of truth for domain concepts used across the Sharpee platform.

## Contents

### Events (`events.ts`)
- `IFEvents` - Standard interactive fiction event constants
- `IFEventType` - Type-safe event type
- `IFEventCategory` - Event categorization for filtering and handling

### Contracts (`contracts.ts`)
- `EventHandler` - Function type for handling events
- `EventValidator` - Function type for validating events
- `EventPreviewer` - Function type for previewing event effects
- `WorldChange` - Interface for world state changes
- `ProcessedEvents` - Result of event processing
- `ProcessorOptions` - Event processing configuration

### Changes (`changes.ts`)
- `WorldChangeType` - Types of world state changes
- `ContentsOptions` - Options for querying entity contents
- `FindOptions` - Options for finding entities
- `WorldConfig` - World behavior configuration
- `WorldState` - World state storage interface

### Sequencing (`sequencing.ts`)
- `TurnPhase` - Phases of turn execution
- `EventSequence` - Sequencing information for events
- `SequencedEvent` - Event with sequence information
- `EventSequencer` - Interface for event sequencing

## Usage

```typescript
import { IFEvents, EventHandler, WorldChange } from '@sharpee/if-domain';

// Use event constants
const moveEvent = {
  type: IFEvents.ACTOR_MOVED,
  // ...
};

// Implement event handlers
const handleMove: EventHandler = (event, world) => {
  // Handle the event
};
```

## Design Principles

1. **Domain-Driven Design**: All types represent domain concepts, not technical implementations
2. **Single Source of Truth**: Event constants and core types defined once
3. **No Implementation**: Pure type definitions with no runtime code (except constants)
4. **Minimal Dependencies**: Only depends on @sharpee/core for base types

## Dependencies

- `@sharpee/core` - Core semantic event types

## Build Order

This package must be built after `core` but before:
- `world-model`
- `event-processor`
- `engine`
- `stdlib`

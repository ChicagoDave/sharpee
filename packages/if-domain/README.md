# @sharpee/if-domain

Core domain model and contracts for the Sharpee Interactive Fiction Platform.

## Installation

```bash
npm install @sharpee/if-domain
```

## Overview

This package contains the shared domain types, events, and contracts that define the Interactive Fiction domain model. It serves as the single source of truth for domain concepts used across the Sharpee platform.

## Contents

### Events (`events.ts`)
- `IFEvents` - Standard interactive fiction event constants
- `IFEventType` - Type-safe event type
- `IFEventCategory` - Event categorization for filtering and handling

### Contracts (`contracts.ts`)
- `WorldChange` - Interface for world state changes
- `WorldConfig`, `WorldState` - World behavior configuration and state storage
- `FindOptions`, `ContentsOptions` - Options for finding entities and querying contents
- `ProcessedEvents`, `ProcessorOptions` - Event processing result and configuration
- `CommandInput`, `CommandSemantics`, `EntityReference` - Command contracts
- `ValidationResult`, `IActionContext`, `IAction`, `IActionRegistry` - Action contracts
- `ScopeLevel`, `IScopeResolver` - Scope contracts

### Changes (`changes.ts`)
- `WorldChangeType` - Types of world state changes

### Language & Parser Contracts
- `LanguageProvider`, `ParserLanguageProvider` - Language provider interfaces
- Parser contracts (`Parser`, `ParserFactory`, `BaseParser`, `Token`, …) and the grammar system (ADR-087)
- Vocabulary contracts (`VocabularyEntry`, `PartOfSpeech`, `vocabularyRegistry`, …)

### Other Contracts
- Prompt types (ADR-137)
- Channel-I/O type contracts (ADR-163) — the universal UI surface
- Spatial sound propagation contracts (ADR-172)
- Phrase algebra contracts (`phrase.ts`, ADR-192)
- Room-description snippet contracts (`snippets.ts`, ADR-209)
- Story ending contract (`endings.ts`, ADR-210)

## Usage

```typescript
import { IFEvents, WorldChange } from '@sharpee/if-domain';

// Use event constants
const moveEvent = {
  type: IFEvents.ACTOR_MOVED,
  // ...
};

// Describe world state changes
const change: WorldChange = {
  type: 'move',
  entityId: 'player',
  // ...
};
```

## Design Principles

1. **Domain-Driven Design**: All types represent domain concepts, not technical implementations
2. **Single Source of Truth**: Event constants and core types defined once
3. **Contracts First**: Mostly type definitions and constants, plus a small runtime surface (vocabulary registry, parser factory, grammar engine, scope builder)
4. **Minimal Dependencies**: Only depends on @sharpee/core and @sharpee/text-blocks

## Dependencies

- `@sharpee/core` - Core semantic event types
- `@sharpee/text-blocks` - Text-block types used by the language, phrase, and channel contracts

## Build Order

This package must be built after `core` but before:
- `world-model`
- `event-processor`
- `engine`
- `stdlib`

## License

MIT

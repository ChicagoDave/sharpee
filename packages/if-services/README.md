# @sharpee/if-services

Runtime service interfaces for the Sharpee Interactive Fiction Platform.

## Installation

```bash
npm install @sharpee/if-services
```

## Purpose

This package provides runtime service interfaces that need access to the world model. It separates these interfaces from the pure domain package (`@sharpee/if-domain`) to maintain clean architectural boundaries.

> **Note (ADR-174):** Rendering is no longer a separate text service. The engine's prose pipeline produces `ITextBlock[]`, which are carried to the UI by channels (ADR-163). The former `TextService` interface has been removed from this package.

## Contents

- **Perception service**: Interface for computing what an actor can perceive of the world (visibility, audibility) — used by rendering and sound propagation.

## Architecture

The if-services package acts as a bridge between:
- The pure domain model (`@sharpee/if-domain`)
- The world model (`@sharpee/world-model`)
- Runtime implementations that need both

This pattern ensures that domain packages remain pure and don't have runtime dependencies, while still providing typed interfaces for runtime services.

## Usage

```typescript
import { IPerceptionService } from '@sharpee/if-services';
```

## Dependencies

- `@sharpee/core`: Core event system
- `@sharpee/if-domain`: Domain types and contracts
- `@sharpee/world-model`: World state management

## License

MIT

# @sharpee/if-services

Runtime service interfaces for the Sharpee Interactive Fiction Platform.

## Purpose

This package provides runtime service interfaces that need access to the world model. It separates these interfaces from the pure domain package (`@sharpee/if-domain`) to maintain clean architectural boundaries.

## Contents

- **TextService**: Interface for text generation services that process game events and produce formatted output
- (Future) Audio service interfaces
- (Future) Graphics service interfaces  
- (Future) Analytics service interfaces

## Architecture

The if-services package acts as a bridge between:
- The pure domain model (`@sharpee/if-domain`)
- The world model (`@sharpee/world-model`)
- Runtime implementations that need both

This pattern ensures that domain packages remain pure and don't have runtime dependencies, while still providing typed interfaces for runtime services.

## Usage

```typescript
import { TextService, TextServiceContext } from '@sharpee/if-services';

// Implement the TextService interface
class MyTextService implements TextService {
  initialize(context: TextServiceContext): void {
    // Initialize with game context
  }
  
  processTurn(): TextOutput {
    // Generate output for the current turn
  }
  
  // ... other methods
}
```

## Dependencies

- `@sharpee/core`: Core event system
- `@sharpee/if-domain`: Domain types and contracts
- `@sharpee/world-model`: World state management

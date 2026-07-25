# @sharpee/core

Core types, interfaces, and utilities for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/core
```

## Overview

This package provides the foundational types used across all Sharpee packages:

- **Event System** - `ISemanticEvent`, typed event registry, event helpers
- **Query System** - `QueryManager` for player input (yes/no, menus)
- **Platform Events** - Save, restore, quit, restart handling
- **Core Utilities** - Common interfaces and type definitions

## Usage

```typescript
import {
  ISemanticEvent,
  createTypedEvent,
  isEventType,
  QueryManager,
  PlatformEventType
} from '@sharpee/core';

// Create typed events (data shape is checked per event type)
const event = createTypedEvent('game.started', {
  storyId: 'my-story',
  initialLocation: 'foyer'
});
console.log(event.timestamp); // set by the factory

// Type-safe event checking
if (isEventType(event, 'game.started')) {
  console.log(event.data.initialLocation);
}
```

## Related Packages

- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle
- [@sharpee/engine](https://www.npmjs.com/package/@sharpee/engine) - Game runtime
- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity system

## License

MIT

# @sharpee/core

Core types, interfaces, and utilities for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/core
```

## Overview

This package provides the foundational types used across all Sharpee packages:

- **Event System** - `SemanticEvent`, typed event registry, event helpers
- **Query System** - `QueryManager` for player input (yes/no, menus)
- **Platform Events** - Save, restore, quit, restart handling
- **Core Utilities** - Common interfaces and type definitions

## Usage

```typescript
import {
  SemanticEvent,
  createTypedEvent,
  isEventType,
  QueryManager,
  PlatformEventType
} from '@sharpee/core';

// Create typed events
const event = createTypedEvent('game.started', { timestamp: Date.now() });

// Type-safe event checking
if (isEventType(event, 'game.started')) {
  console.log(event.data.timestamp);
}
```

## Related Packages

- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle
- [@sharpee/engine](https://www.npmjs.com/package/@sharpee/engine) - Game runtime
- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity system

## License

MIT

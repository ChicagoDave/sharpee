# @sharpee/event-processor

Event processing and state application for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/event-processor
```

## Overview

Applies semantic events to the world model:

- **Event Application** - Updates world state based on events
- **Event Ordering** - Ensures consistent state transitions
- **Side Effects** - Triggers handlers for event types

## Usage

```typescript
import { EventProcessor } from '@sharpee/event-processor';

const processor = new EventProcessor(world);

// Apply events from action execution
const updatedWorld = processor.apply(events);
```

## Event Flow

```
Player Input → Parser → Action → Events → EventProcessor → Updated World
```

## Related Packages

- [@sharpee/engine](https://www.npmjs.com/package/@sharpee/engine) - Game runtime
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT

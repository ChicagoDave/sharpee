# @sharpee/event-processor

Event processing and state application for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/event-processor
```

## Overview

Runs each turn's semantic events through the handlers registered for them:

- **Validation and history** - Each event is checked by the world's validator and recorded
- **Handlers** - A story's own handlers, the world-level handlers the engine wires in, and event chains run for the event's type
- **Reactions** - Events that handlers emit are processed in turn, to a bounded depth
- **Effects System (ADR-075)** - Handlers return effects; also exports the `WorldQuery` type and `EffectProcessor`

The processor registers no handlers of its own. A standard action's state change is made by a behavior in the action's execute phase; the event that follows records it.

## Usage

```typescript
import { EventProcessor } from '@sharpee/event-processor';

const processor = new EventProcessor(world);

// Process the events an action reported (handlers' effects are applied in place)
const results = processor.processEvents(events);
// results: { applied, failed, changes, reactions }
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

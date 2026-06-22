# @sharpee/plugin-npc

NPC plugin for the Sharpee engine: lets non-player characters act each turn (ADR-070, ADR-120).

## Installation

```bash
npm install @sharpee/plugin-npc
```

## Overview

This package implements the `TurnPlugin` contract from `@sharpee/plugins` for NPCs:

- **`NpcPlugin`** - Runs at priority 100, before state machines (75) and the scheduler (50), so NPCs react immediately after the player's action (ADR-070, ADR-120).
- Wraps the NPC service from `@sharpee/stdlib`, pre-registering the standard `guard` and `passive` behaviours.
- Ticks the NPC service every successful turn and merges the events NPCs produce into the turn's event stream.
- Holds no state of its own — NPC state lives in world-model entity traits and is saved with the world.
- Exposes the underlying service via `getNpcService()` for registering story-specific NPC behaviours.

## Usage

```typescript
import { NpcPlugin } from '@sharpee/plugin-npc';

const npcPlugin = new NpcPlugin();

// Register with the engine's plugin registry
engine.plugins.register(npcPlugin);

// Add a story-specific NPC behaviour through the wrapped service
const npcService = npcPlugin.getNpcService();
npcService.registerBehavior(myCustomBehavior);
```

## Related Packages

- [@sharpee/plugins](https://www.npmjs.com/package/@sharpee/plugins) - Turn-plugin contracts
- [@sharpee/stdlib](https://www.npmjs.com/package/@sharpee/stdlib) - NPC service and standard behaviours
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT

# @sharpee/plugins

Plugin contracts for Sharpee engine turn-cycle extensibility.

## Installation

```bash
npm install @sharpee/plugins
```

## Overview

This package defines the turn-plugin contract the engine uses to extend each turn (ADR-120):

- **`TurnPlugin`** - The interface a plugin implements: an `id`, a `priority`, and an `onAfterAction` hook called once per player action — including refused/blocked ones; consumers gate on `actionResult.success` to distinguish genuine successes.
- **`TurnPluginContext`** - The read-only per-turn context (world, turn, player, seeded RNG, action result and events) passed to every plugin.
- **`TurnPluginActionResult`** - Summary of the player action that just completed.
- **`PluginRegistry`** - Holds a game's plugins, hands them to the engine in descending priority order, and aggregates plugin save/restore state.

The engine owns a single `PluginRegistry`. Stories add behaviour by registering the implementing packages — NPC (priority 100), state machine (75), scheduler (50) — rather than implementing `TurnPlugin` directly.

## Usage

This package is mostly contracts. The engine consumes `TurnPlugin`/`PluginRegistry`; the plugin packages implement them. A minimal plugin looks like:

```typescript
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { ISemanticEvent } from '@sharpee/core';

class HeartbeatPlugin implements TurnPlugin {
  id = 'example.heartbeat';
  priority = 10;

  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    // Contribute additional events on turn `ctx.turn`; return [] for nothing.
    return [];
  }
}
```

## Band Crossing

Beyond the contracts, the package ships one piece of runtime code: the banded-scalar crossing engine (ADR-262). `createBandDataWatcher` and `createBandNarrator` detect when a scalar value (score, hunger) crosses a named band boundary and narrate the crossing; the supporting types (`BandAnnounceMode`, `BandRung`, `BandCrossingSpan`, `BandCrossedData`, `BandCrossingConfig`, `BandWatcherState`, `BandNarrationParams`, `BandNarratorConfig`) are exported alongside. `@sharpee/ext-scoring` and `@sharpee/ext-hunger` consume these.

## Related Packages

- [@sharpee/plugin-npc](https://www.npmjs.com/package/@sharpee/plugin-npc) - NPC behaviours and turn processing
- [@sharpee/plugin-scheduler](https://www.npmjs.com/package/@sharpee/plugin-scheduler) - Daemons and fuses
- [@sharpee/plugin-state-machine](https://www.npmjs.com/package/@sharpee/plugin-state-machine) - Declarative puzzle/narrative orchestration
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT

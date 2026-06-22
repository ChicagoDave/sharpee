# @sharpee/plugin-scheduler

Scheduler plugin for the Sharpee engine: background temporal events via daemons and fuses (ADR-071, ADR-120).

## Installation

```bash
npm install @sharpee/plugin-scheduler
```

## Overview

This package implements the `TurnPlugin` contract from `@sharpee/plugins` for scheduled, time-based events:

- **`SchedulerPlugin`** - Runs at priority 50, after NPCs (100) and state machines (75), so temporal events resolve at the end of the turn (ADR-071, ADR-120).
- **Daemons** - Processes that run every turn (optionally conditional, prioritized, or `runOnce`).
- **Fuses** - Countdown timers that trigger after N turns; support `repeat`, pause/resume, adjustment, and entity-bound cleanup.
- **`SchedulerService` / `createSchedulerService`** - The registration API behind the plugin, reachable via `getScheduler()`.
- **Deterministic RNG** - A seeded random source so scheduled events stay replayable; scheduler state is serialized for save/load.

## Usage

```typescript
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';

const schedulerPlugin = new SchedulerPlugin(/* seed */ 12345);
engine.plugins.register(schedulerPlugin);

const scheduler = schedulerPlugin.getScheduler();

// A daemon that runs every turn
scheduler.registerDaemon({
  id: 'wind',
  name: 'howling wind',
  run: (ctx) => [/* ...semantic events... */]
});

// A fuse that triggers in 3 turns
scheduler.setFuse({
  id: 'bomb',
  name: 'ticking bomb',
  turns: 3,
  trigger: (ctx) => [/* ...semantic events... */]
});
```

## Related Packages

- [@sharpee/plugins](https://www.npmjs.com/package/@sharpee/plugins) - Turn-plugin contracts
- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity system the scheduler mutates
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT

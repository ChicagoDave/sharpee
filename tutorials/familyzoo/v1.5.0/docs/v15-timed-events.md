# V15: Timed Events (Daemons and Fuses)

## Concept

The **SchedulerPlugin** adds timed events to the Sharpee engine. After each player turn, the scheduler "ticks" — running all active daemons and counting down all active fuses.

**Daemons** are functions that run every turn (like background processes). They can optionally have a `condition()` that controls when they run.

**Fuses** are countdown timers. They tick down each turn and trigger when they reach zero. A fuse can be one-shot (fires once and disappears) or repeating (re-arms after triggering).

## Key Code Pattern

```typescript
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import type { Daemon, Fuse, SchedulerContext } from '@sharpee/plugin-scheduler';

// In onEngineReady():
const schedulerPlugin = new SchedulerPlugin();
engine.getPluginRegistry().register(schedulerPlugin);
const scheduler = schedulerPlugin.getScheduler();

// Daemon — runs every turn when condition is met
const myDaemon: Daemon = {
  id: 'story.daemon.name',
  name: 'Human Readable Name',
  condition: (ctx: SchedulerContext) => ctx.turn % 5 === 0,
  run: (ctx: SchedulerContext) => [{
    id: `event-${ctx.turn}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: { messageId: 'story.message.id' },
    narrate: true,
  }],
};
scheduler.registerDaemon(myDaemon);

// Fuse — counts down and triggers after N turns
const myFuse: Fuse = {
  id: 'story.fuse.name',
  name: 'Countdown Timer',
  turns: 10,          // Fires after 10 turns
  repeat: true,       // Re-arm after triggering
  originalTurns: 8,   // Subsequent triggers every 8 turns
  trigger: (ctx: SchedulerContext) => [/* events */],
};
scheduler.setFuse(myFuse);
```

## What to Try

```
> wait                (repeat 5 times — PA announcement fires)
> south / east        (go to petting zoo)
> wait                (repeat until "FEEDING TIME")
> wait                (goats start bleating)
> take feed
> feed goats          (stops the bleating)
```

## Common Mistakes

- **Forgetting to register the SchedulerPlugin** — Daemons and fuses do nothing until the plugin is registered with the engine.
- **Using `ctx.turn` without understanding the offset** — Turn counting starts at 1 for the first player command. The opening turn may or may not tick the scheduler.
- **Daemon without condition** — A daemon with no `condition()` runs every single turn. Use a condition to control timing.
- **Fuse skipNextTick** — New fuses skip their first tick, so a fuse with `turns: 10` fires 11 ticks after registration (10 countdown + 1 skip).

# Turns, Timed Events & Daemons

![](art/shiva.jpg){.chapter-ornament}

A living world doesn't only react to the player — it has a clock of its own.
Announcements crackle over the zoo PA as closing time approaches. Feeding time
arrives on a schedule, and if you miss it the goats bleat for a few turns until
they're fed or give up. None of this is triggered by a command; it happens
*because time passes*. Sharpee provides that clock through the
**SchedulerPlugin**, which after every player turn runs two kinds of timed event:
**daemons** and **fuses**.

## How the scheduler ticks

Register the `SchedulerPlugin` and, after each player turn, it "ticks": it runs
every active daemon and counts down every active fuse. A **daemon** is a function
that runs each turn — a background process, a ticking clock. A **fuse** is a
countdown timer that fires once when it reaches zero, optionally re-arming to fire
again.

Registration follows the same `onEngineReady()` pattern as the NPC plugin:

```typescript
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import type { Daemon, Fuse, SchedulerContext } from '@sharpee/plugin-scheduler';

onEngineReady(engine: GameEngine): void {
  const schedulerPlugin = new SchedulerPlugin();
  engine.getPluginRegistry().register(schedulerPlugin);
  const scheduler = schedulerPlugin.getScheduler();

  scheduler.registerDaemon(createPAAnnouncementDaemon());
  scheduler.setFuse(createFeedingTimeFuse());
  scheduler.registerDaemon(createGoatBleatingDaemon());
}
```

Both daemons and fuses receive a `SchedulerContext` — `{ world, turn, random,
playerLocation, playerId }` — giving them the turn number, the world, and where
the player is.

## Daemons — run every turn

A `Daemon` has an `id`, a `name`, a `run` function that returns events, and an
optional `condition` that gates when it runs. Here's the PA announcer, which
fires every fifth turn and walks through a sequence of closing announcements:

```typescript
function createPAAnnouncementDaemon(): Daemon {
  let announcementCount = 0;        // internal state, kept across turns

  return {
    id: 'zoo.daemon.pa_announcements',
    name: 'Zoo PA Announcements',
    priority: 5,                    // low — runs after more important daemons

    // Only run every 5th turn, and only four times total
    condition: (ctx: SchedulerContext): boolean =>
      ctx.turn > 0 && ctx.turn % 5 === 0 && announcementCount < 4,

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      announcementCount++;
      let messageId: string;
      switch (announcementCount) {
        case 1: messageId = TimedMessages.PA_CLOSING_3; break;
        case 2: messageId = TimedMessages.PA_CLOSING_2; break;
        case 3: messageId = TimedMessages.PA_CLOSING_1; break;
        default: messageId = TimedMessages.PA_CLOSED; break;
      }
      return [{
        id: `zoo-pa-${ctx.turn}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: { messageId },
        narrate: true,
      }];
    },

    // Save/restore the internal counter so it survives a save/load
    getRunnerState() { return { announcementCount }; },
    restoreRunnerState(state) { announcementCount = (state.announcementCount as number) ?? 0; },
  };
}
```

A few things to notice. The daemon keeps its own state (`announcementCount`) in
the closure, and exposes `getRunnerState`/`restoreRunnerState` so that state
survives a save and reload. Daemon events here use `type: 'game.message'` with a
`messageId` and `narrate: true` — that's the right form for scheduler output,
which the engine narrates as ambient text. (Contrast this with the chain handlers
in *Event Handlers*, which must avoid `game.message` because there it would
override the action's own text. Different context, different rule.)

> **The mistake everyone makes once:** writing a daemon with no `condition`. A
> daemon without one runs *every single turn*, which is rarely what you want for
> something like an announcement. Use a `condition` to control timing — a turn
> modulus, a world-state flag, whatever fits.

## Conditional daemons — react to state

A daemon's `condition` can read world state, not just the turn count. The goat
bleating daemon only runs while feeding time is active and there are bleats left,
counting itself down and stopping:

```typescript
function createGoatBleatingDaemon(): Daemon {
  return {
    id: 'zoo.daemon.goat_bleating',
    name: 'Goat Bleating',
    priority: 3,

    condition: (ctx: SchedulerContext): boolean => {
      const active = ctx.world.getStateValue('zoo.feeding_time_active') as boolean;
      const left = ctx.world.getStateValue('zoo.bleat_turns_remaining') as number;
      return active === true && (left ?? 0) > 0;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const left = (ctx.world.getStateValue('zoo.bleat_turns_remaining') as number) ?? 0;
      if (left <= 1) {
        ctx.world.setStateValue('zoo.feeding_time_active', false);
        ctx.world.setStateValue('zoo.bleat_turns_remaining', 0);
      } else {
        ctx.world.setStateValue('zoo.bleat_turns_remaining', left - 1);
      }

      // Ambient sound — only heard if the player is in the petting zoo
      const room = ctx.world.getEntity(ctx.playerLocation);
      if ((room?.get(IdentityTrait)?.name || '').includes('Petting Zoo')) {
        return [{
          id: `zoo-bleat-${ctx.turn}`, type: 'game.message',
          timestamp: Date.now(), entities: {},
          data: { messageId: TimedMessages.GOATS_BLEATING }, narrate: true,
        }];
      }
      return [];
    },
  };
}
```

Returning an empty array is how a daemon stays silent on a given turn while still
having run — here, the goats only bleat *aloud* if the player is around to hear
them.

## Fuses — count down and fire

A `Fuse` ticks down `turns` each turn and calls `trigger` when it hits zero. Set
`repeat: true` with an `originalTurns` value and it re-arms after firing. The
feeding-time fuse first fires at turn 10, then every 8 turns after that, and each
time it primes the bleating daemon:

```typescript
function createFeedingTimeFuse(): Fuse {
  return {
    id: 'zoo.fuse.feeding_time',
    name: 'Feeding Time',
    turns: 10,            // first feeding time at turn 10
    repeat: true,         // keep re-arming
    originalTurns: 8,     // subsequent feedings every 8 turns
    priority: 10,

    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      ctx.world.setStateValue('zoo.feeding_time_active', true);
      ctx.world.setStateValue('zoo.bleat_turns_remaining', 3);
      return [{
        id: `zoo-feeding-${ctx.turn}`, type: 'game.message',
        timestamp: Date.now(), entities: {},
        data: { messageId: TimedMessages.FEEDING_TIME }, narrate: true,
      }];
    },
  };
}
```

This is a clean two-part collaboration: the fuse marks the schedule and sets the
state; the conditional daemon does the per-turn reaction until the state clears.

> **The mistake everyone makes once:** expecting a fuse with `turns: 10` to fire
> exactly ten turns after you set it. A newly set fuse skips its first tick, so it
> fires about *eleven* ticks after registration. If precise timing matters, count
> from the skip — or test it and adjust `turns`.

## Try it

```
> wait                      (repeat ~5 times — the first PA announcement crackles)
> wait                      …closing announcements count down
> south; east               Petting Zoo
> wait                      (repeat until "FEEDING TIME" is announced)
> wait                      The goats start bleating
> take feed                 Grab the feed
> feed goats                The bleating stops
```

## Key takeaway

The `SchedulerPlugin` gives the world a clock: register it in `onEngineReady()`
and it ticks after every player turn. **Daemons** run each turn — gate them with a
`condition` (turn modulus or world state), keep internal state in the closure, and
expose `getRunnerState`/`restoreRunnerState` for saves. **Fuses** count down and
`trigger` once, re-arming when `repeat` is set, but skip their first tick. Both
return `game.message` events with `narrate: true`, and both can cooperate through
world state — a fuse setting the stage for a daemon to play out.

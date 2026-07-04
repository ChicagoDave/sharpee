# Turns, Timed Events & Daemons: Giving the World a Clock

A living world doesn't only react to the player. It has a clock of its own.
Announcements crackle over the zoo PA as closing time approaches. Feeding time
arrives on a schedule, and if you miss it the goats bleat for a few turns until
they're fed or give up. None of this is triggered by a command; it happens
*because time passes*. Sharpee provides that clock through the
**SchedulerPlugin**, which after every player turn runs two kinds of timed event:
**daemons** and **fuses**.

## How the scheduler ticks

Register the `SchedulerPlugin` and, after each player turn, it "ticks": it runs
every active daemon and counts down every active fuse. A **daemon** is a function
that runs each turn: a background process, a ticking clock. A **fuse** is a
countdown timer that fires once when it reaches zero, optionally re-arming to fire
again.

Registration follows the same `onEngineReady()` pattern as the NPC plugin, and in
fact lives in the *same* `onEngineReady`, alongside the NPC registration from
Chapter 20. The daemon `run` functions return `ISemanticEvent[]`, and one reads an
`IdentityTrait`, so the imports grow a little:

```typescript
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import type {
  Daemon, Fuse, SchedulerContext,
} from '@sharpee/plugin-scheduler';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';

onEngineReady(engine: GameEngine): void {
  // … the NPC plugin registration from Chapter 20 stays here …

  const schedulerPlugin = new SchedulerPlugin();
  engine.getPluginRegistry().register(schedulerPlugin);
  const scheduler = schedulerPlugin.getScheduler();

  scheduler.registerDaemon(createPAAnnouncementDaemon());
  scheduler.setFuse(createFeedingTimeFuse());
  scheduler.registerDaemon(createGoatBleatingDaemon());
}
```

The daemons and fuse below emit message ids from a `TimedMessages` table; declare
it once, near the top of your story module:

```typescript
const TimedMessages = {
  PA_CLOSING_3: 'zoo.pa.closing_3',
  PA_CLOSING_2: 'zoo.pa.closing_2',
  PA_CLOSING_1: 'zoo.pa.closing_1',
  PA_CLOSED:    'zoo.pa.closed',
  FEEDING_TIME: 'zoo.feeding_time.announced',
  GOATS_BLEATING: 'zoo.goats.bleating',
} as const;
```

Both daemons and fuses receive a `SchedulerContext` (`{ world, turn, random,
playerLocation, playerId }`), giving them the turn number, the world, and where
the player is.

## Daemons: run every turn

A `Daemon` has an `id`, a `name`, a `run` function that returns events, and an
optional `condition` that gates when it runs. Here's the PA announcer, which
fires every fifth turn and walks through a sequence of closing announcements:

```typescript
function createPAAnnouncementDaemon(): Daemon {
  // internal state, kept across turns
  let announcementCount = 0;

  return {
    id: 'zoo.daemon.pa_announcements',
    name: 'Zoo PA Announcements',
    // low; runs after more important daemons
    priority: 5,

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

    // Save/restore the internal counter so it survives
    // a save/load
    getRunnerState() { return { announcementCount }; },
    restoreRunnerState(state) {
      announcementCount =
        (state.announcementCount as number) ?? 0;
    },
  };
}
```

The daemon keeps its own state (`announcementCount`) in the closure, and exposes
`getRunnerState`/`restoreRunnerState` so that state survives a save and reload. Daemon events here use `type: 'game.message'` with a
`messageId` and `narrate: true`, which is the right form for scheduler output,
which the engine narrates as ambient text. (Contrast this with the chain handlers
in *Event Handlers*, which must avoid `game.message` because there it would
override the action's own text. Different context, different rule.)

> **The mistake everyone makes once:** writing a daemon with no `condition`. A
> daemon without one runs *every single turn*, which is rarely what you want for
> something like an announcement. Use a `condition` to control timing: a turn
> modulus, a world-state flag, whatever fits.

## Conditional daemons: react to state

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
      const active = ctx.world
        .getStateValue('zoo.feeding_time_active') as boolean;
      const left = ctx.world
        .getStateValue('zoo.bleat_turns_remaining') as number;
      return active === true && (left ?? 0) > 0;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const left = (ctx.world.getStateValue(
        'zoo.bleat_turns_remaining'
      ) as number) ?? 0;
      if (left <= 1) {
        ctx.world.setStateValue('zoo.feeding_time_active', false);
        ctx.world.setStateValue('zoo.bleat_turns_remaining', 0);
      } else {
        ctx.world
          .setStateValue('zoo.bleat_turns_remaining', left - 1);
      }

      // Ambient sound, only heard if the player is in the
      // petting zoo
      const room = ctx.world.getEntity(ctx.playerLocation);
      if ((room?.get(IdentityTrait)?.name || '')
        .includes('Petting Zoo')) {
        return [{
          id: `zoo-bleat-${ctx.turn}`, type: 'game.message',
          timestamp: Date.now(), entities: {},
          data: { messageId: TimedMessages.GOATS_BLEATING },
          narrate: true,
        }];
      }
      return [];
    },
  };
}
```

Returning an empty array is how a daemon stays silent on a given turn while still
having run. Here, the goats only bleat *aloud* if the player is around to hear
them.

## Fuses: count down and fire

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
        data: { messageId: TimedMessages.FEEDING_TIME },
        narrate: true,
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
> from the skip, or test it and adjust `turns`.

## Giving the announcements their words

Every `TimedMessages` id the daemons emit needs text in `extendLanguage`, or the PA
just narrates raw ids:

```typescript
extendLanguage(language: LanguageProvider): void {
  language.addMessage(TimedMessages.PA_CLOSING_3,
    '*DING DONG* "Attention visitors! The zoo closes in ' +
    'three hours. Please visit all exhibits before closing ' +
    'time!"');
  language.addMessage(TimedMessages.PA_CLOSING_2,
    '*DING DONG* "Two hours until closing. ' +
    'Don\'t forget the gift shop!"');
  language.addMessage(TimedMessages.PA_CLOSING_1,
    '*DING DONG* "One hour until closing. Please make ' +
    'your way toward the exit."');
  language.addMessage(TimedMessages.PA_CLOSED,
    '*DING DONG* "The zoo is now closed. ' +
    'Thank you for visiting!"');
  language.addMessage(TimedMessages.FEEDING_TIME,
    '*DING DONG* "It\'s FEEDING TIME at the Petting ' +
    'Zoo! Come watch the goats and rabbits enjoy their ' +
    'snacks!"');
  language.addMessage(TimedMessages.GOATS_BLEATING,
    'The pygmy goats are bleating loudly and headbutting ' +
    'the fence. They seem very hungry!');
}
```

(If your story already has an `extendLanguage` from earlier chapters, add these
lines to it; a story has just one.)

## Try it

```
> wait                      (repeat ~5 times; the first PA announcement crackles)
> wait                      …closing announcements count down
> south                     Main Path
> east                      Petting Zoo
> wait                      (repeat until "FEEDING TIME" is announced)
> wait                      The goats start bleating
> take feed                 Grab the feed
> feed goats                Feed them, but the bleating runs on its own timer
> wait                      …a turn or two later the bleating stops on its own
```

The bleating ends when the daemon's three-turn countdown reaches zero, *not*
because you fed the goats. The feeding action (Chapter 14) records that the goats
were fed; it never touches `zoo.feeding_time_active`, which is the only state the
daemon watches. If you *wanted* feeding to silence them early, you'd add an event
handler on the feed action that clears that flag. That's a nice exercise, but the
scheduler's own countdown is doing the stopping here, exactly as the conditional
daemon above ("counting itself down and stopping") was built to do.

## Test it

Timed events are the easiest thing in the zoo to break by accident: an
off-by-one in a condition and the PA falls silent. This test walks the clock
turn by turn. Add `tests/transcripts/timed-events.transcript`:

```text
title: Timed events
story: familyzoo
description: PA announcements, the feeding-time fuse, and the bleating daemon

---

> wait
[OK: not contains "DING DONG"]

> wait
[OK: not contains "DING DONG"]

> wait
[OK: not contains "DING DONG"]

> wait
[OK: not contains "DING DONG"]

> wait
[OK: contains "three hours"]

> south
[OK: contains "Main Path"]

> east
[OK: contains "Petting Zoo"]

> wait
[OK: matches /./]

> wait
[OK: matches /./]

> wait
[OK: contains "Two hours"]

> wait
[OK: contains "FEEDING TIME"]

> take feed
[OK: contains "Taken"]
[OK: contains "bleating loudly"]

> feed goats
[OK: contains "devour"]
[OK: contains "bleating loudly"]

> wait
[OK: contains "bleating loudly"]

> wait
[OK: contains "One hour"]
[OK: not contains "bleating loudly"]
```

## Key takeaway

The `SchedulerPlugin` gives the world a clock once you register it in
`onEngineReady()`. **Daemons** run every turn; gate them with a `condition`, and
expose `getRunnerState`/`restoreRunnerState` so their closure state survives a
save. **Fuses** count down and fire once (re-arming with `repeat`), but skip their
first tick. Both narrate through `game.message` events, and both can cooperate
through world state: a fuse can set the stage for a daemon to play out.

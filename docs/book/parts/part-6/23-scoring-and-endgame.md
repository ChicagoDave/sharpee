# Scoring & Endgame: Winning the Game

A game needs a way to keep score and a way to end. The zoo gives points for
seeing the sights and doing the activities — visiting each exhibit, feeding the
animals, pressing a souvenir penny, reading the brochure — and when the player has
done it all, the game declares victory. This final mechanic chapter ties together
much of what came before: a **score ledger** that records achievements, event
handlers that award points as the player plays, and a **victory daemon** that
watches for the win and triggers the ending.

## The score ledger

Sharpee tracks score with `world.awardScore()`. Each award has a unique ID, and
that ID is what makes scoring safe: awarding the same ID twice does nothing the
second time. You never have to worry about a player re-entering a room and scoring
for it again.

```typescript
// Set the maximum in initializeWorld() so "score" can show "X out of Y"
world.setMaxScore(75);

// Award points — idempotent: the same ID never scores twice
const awarded = world.awardScore(
  'zoo.visit.petting_zoo',  // unique ID
  5,                        // points
  'Visited the petting zoo' // description (for debugging / transcripts)
);
// awarded === true the first time, false on every call after

// Read the score back
const current = world.getScore();
const max = world.getMaxScore();
```

> **The mistake everyone makes once:** reusing a score ID for two different
> achievements. Because awarding is idempotent on the ID, the second achievement
> silently never scores — the ledger thinks it's already been counted. Give every
> achievement its own descriptive, unique ID.

## Defining the scoring table

It pays to declare all the IDs and point values up front, as constants, rather
than scattering string literals through the code:

```typescript
const MAX_SCORE = 75;

const ScoreIds = {
  VISIT_PETTING_ZOO: 'zoo.visit.petting_zoo',
  VISIT_AVIARY: 'zoo.visit.aviary',
  VISIT_GIFT_SHOP: 'zoo.visit.gift_shop',
  VISIT_SUPPLY_ROOM: 'zoo.visit.supply_room',
  VISIT_NOCTURNAL: 'zoo.visit.nocturnal',
  FEED_GOATS: 'zoo.action.fed_goats',
  FEED_RABBITS: 'zoo.action.fed_rabbits',
  COLLECT_MAP: 'zoo.collect.map',
  COLLECT_PRESSED_PENNY: 'zoo.collect.pressed_penny',
  PHOTOGRAPH_ANIMAL: 'zoo.action.photographed',
  PET_ANIMAL: 'zoo.action.petted',
  READ_BROCHURE: 'zoo.action.read_brochure',
} as const;

const ScorePoints: Record<string, number> = {
  [ScoreIds.VISIT_PETTING_ZOO]: 5,
  [ScoreIds.VISIT_AVIARY]: 5,
  [ScoreIds.VISIT_GIFT_SHOP]: 5,
  [ScoreIds.VISIT_SUPPLY_ROOM]: 5,
  [ScoreIds.VISIT_NOCTURNAL]: 5,
  [ScoreIds.FEED_GOATS]: 10,
  [ScoreIds.FEED_RABBITS]: 10,
  [ScoreIds.COLLECT_MAP]: 5,
  [ScoreIds.COLLECT_PRESSED_PENNY]: 10,
  [ScoreIds.PHOTOGRAPH_ANIMAL]: 5,
  [ScoreIds.PET_ANIMAL]: 5,
  [ScoreIds.READ_BROCHURE]: 5,
};
```

| Achievement | Points |
|---|---|
| Visit each of the five exhibits | 5 each (25) |
| Feed the goats / the rabbits | 10 each (20) |
| Collect the map / press a penny | 5 / 10 |
| Photograph something | 5 |
| Pet an animal | 5 |
| Read the brochure | 5 |
| **Total** | **75** |

Two more tables finish the setup — one maps room names to their visit-score id (the
room-visit handler reads it), and one holds the endgame message id:

```typescript
const ROOM_SCORE_MAP: Record<string, string> = {
  'Petting Zoo': ScoreIds.VISIT_PETTING_ZOO,
  'Aviary': ScoreIds.VISIT_AVIARY,
  'Gift Shop': ScoreIds.VISIT_GIFT_SHOP,
  'Supply Room': ScoreIds.VISIT_SUPPLY_ROOM,
  'Nocturnal Animals Exhibit': ScoreIds.VISIT_NOCTURNAL,
};

const ScoreMessages = {
  VICTORY: 'zoo.victory',
} as const;
```

The `chainEvent` handlers below use the same `ISemanticEvent`/`IWorldModel` types
and the `this.entityIds` field you established in *Event Handlers* (Chapter 13).

## Awarding points as the player plays

Scoring hooks into the action layers you already know. Some awards live inside a
custom action or capability behavior — petting an animal awards its points right
in the behavior's `execute()`:

```typescript
execute(_entity, world, _actorId, _shared): void {
  world.awardScore(ScoreIds.PET_ANIMAL, ScorePoints[ScoreIds.PET_ANIMAL], 'Petted an animal');
},
```

Others ride on standard-action events through `chainEvent`. Room visits award
points on `if.event.actor_moved`, looking the destination up in a room-to-score-ID
map; because `awardScore` is idempotent, re-entering a scored room is harmless:

```typescript
world.chainEvent('if.event.actor_moved', (event, w) => {
  const data = event.data as Record<string, any>;
  const toRoom = data.toRoom || data.destination;
  if (!toRoom) return null;

  const roomName = w.getEntity(toRoom)?.get(IdentityTrait)?.name || '';
  const scoreId = ROOM_SCORE_MAP[roomName];
  if (!scoreId) return null;

  w.awardScore(scoreId, ScorePoints[scoreId], `Visited ${roomName}`);
  return null;   // scoring is silent — no custom event
}, { key: 'zoo.chain.room-visit-scoring' });
```

The same shape covers collecting the map and reading the brochure. Each matches the
event against the entity id recorded in `this.entityIds` (Chapter 13), awards the
points, and returns `null` to stay silent:

```typescript
const mapId = this.entityIds.zooMap;
world.chainEvent('if.event.taken', (event: ISemanticEvent, w: IWorldModel) => {
  const data = event.data as Record<string, any>;
  if (data.itemId === mapId) {
    w.awardScore(ScoreIds.COLLECT_MAP, ScorePoints[ScoreIds.COLLECT_MAP],
      'Collected the zoo map');
  }
  return null;
}, { key: 'zoo.chain.take-scoring' });

const brochureId = this.entityIds.brochure;
world.chainEvent('if.event.read', (event: ISemanticEvent, w: IWorldModel) => {
  const data = event.data as Record<string, any>;
  if (data.entityId === brochureId || data.targetId === brochureId) {
    w.awardScore(ScoreIds.READ_BROCHURE, ScorePoints[ScoreIds.READ_BROCHURE],
      'Read the zoo brochure');
  }
  return null;
}, { key: 'zoo.chain.read-scoring' });
```

(`this.entityIds.zooMap` and `.brochure` are recorded in `initializeWorld` when you
create those items, the same way Chapter 13 stored the feed and penny ids.)

That covers eight of the twelve awards (40 of the 75 points). The remaining four
ride the very same two patterns, so wire them up the same way. Feeding the goats or
rabbits and photographing an animal award inside their custom actions' `execute()`
(like petting, above); pressing a souvenir penny awards in the penny-press chain
from Chapter 13 (like collecting the map):

```typescript
// inside the feeding action's execute(), keyed on which animal was fed:
world.awardScore(ScoreIds.FEED_GOATS, ScorePoints[ScoreIds.FEED_GOATS], 'Fed the goats');
//   …and ScoreIds.FEED_RABBITS the same way when the rabbits are fed.

// inside the photograph action's execute():
world.awardScore(ScoreIds.PHOTOGRAPH_ANIMAL,
  ScorePoints[ScoreIds.PHOTOGRAPH_ANIMAL], 'Photographed an animal');

// in the penny-press chain (Chapter 13), the same shape as the map award:
w.awardScore(ScoreIds.COLLECT_PRESSED_PENNY,
  ScorePoints[ScoreIds.COLLECT_PRESSED_PENNY], 'Pressed a souvenir penny');
```

With all twelve awards in place the scores sum to the full 75, so the victory
daemon below has a target it can actually reach. Leave any of these four out and
the game caps at 40 (or wherever you stopped) and the win never fires — a useful
reminder that the max score and the awarding code have to agree.

## The victory daemon

The win condition is checked by a daemon — exactly the scheduler pattern from the
last chapter. It watches the score each turn and, when the maximum is reached,
marks the game over and emits the victory message. Its `priority: 100` makes it
run *last*, after every other daemon and all the turn's scoring has settled:

```typescript
function createVictoryDaemon(): Daemon {
  let victoryTriggered = false;

  return {
    id: 'zoo.daemon.victory',
    name: 'Victory Check',
    priority: 100,   // run last, after all scoring for the turn

    condition: (ctx: SchedulerContext): boolean => {
      if (victoryTriggered) return false;
      return ctx.world.getScore() >= MAX_SCORE;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      victoryTriggered = true;
      ctx.world.setStateValue('game.victory', true);
      ctx.world.setStateValue('game.ended', true);
      return [{
        id: `zoo-victory-${ctx.turn}`, type: 'game.message',
        timestamp: Date.now(), entities: {},
        data: { messageId: ScoreMessages.VICTORY }, narrate: true,
      }];
    },

    getRunnerState() { return { victoryTriggered }; },
    restoreRunnerState(state) { victoryTriggered = (state.victoryTriggered as boolean) ?? false; },
  };
}
```

Register it like any daemon, alongside the others:

```typescript
scheduler.registerDaemon(createVictoryDaemon());
```

And give `ScoreMessages.VICTORY` its text in `extendLanguage`, or the win narrates
a raw id:

```typescript
language.addMessage(ScoreMessages.VICTORY,
  "Congratulations! You've earned your JUNIOR ZOOKEEPER badge — you visited " +
  'every exhibit, fed the animals, collected souvenirs, and made memories to ' +
  'last a lifetime.\n\n*** You have won ***');
```

> **The mistake everyone makes once:** giving the victory check a low priority, so
> it runs *before* the turn's scoring daemons and event handlers. It then sees a
> stale score, misses the moment the player crosses the line, and only fires a turn
> late. Keep the victory daemon at high priority so it evaluates after everything
> else has had its say.

## Try it

```
> score                     Check the score — 0 out of 75
> south; east               Visit the petting zoo — +5
> score                     Now 5 out of 75
> take feed
> feed goats                +10
> ... visit every exhibit, feed, pet, photograph, press a penny, read ...
> score                     75 out of 75 — victory!
```

## Key takeaway

`world.awardScore(id, …)` records an achievement, and the unique `id` makes it
idempotent, so the same award never counts twice. Hang awards wherever the
achievement actually happens, whether in custom actions, capability behaviors, or
standard-action events via `chainEvent`, and let a high-priority **victory daemon**
watch `getScore()` and trigger the ending when the maximum is reached. With scoring
and an endgame in place, the zoo is a complete, winnable game.

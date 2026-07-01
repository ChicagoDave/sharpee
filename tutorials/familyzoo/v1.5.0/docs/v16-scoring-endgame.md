# V16: Scoring and Endgame

## Concept

Sharpee's **score ledger** tracks player achievements with `world.awardScore()`. Each award has a unique ID that prevents double-scoring — awarding the same ID twice does nothing. A **victory daemon** watches for the win condition each turn and triggers the endgame.

## Key Code Pattern

```typescript
// Set max score in initializeWorld()
world.setMaxScore(75);

// Award points (idempotent — same ID never scores twice)
const awarded = world.awardScore(
  'story.visit.room_name',   // Unique ID
  5,                          // Points
  'Visited the room'          // Description (for debugging)
);
// awarded === true first time, false on subsequent calls

// Check score
const currentScore = world.getScore();
const maxScore = world.getMaxScore();

// Victory daemon — checks for win condition each turn
const victoryDaemon: Daemon = {
  id: 'story.daemon.victory',
  name: 'Victory Check',
  priority: 100,  // Run last
  condition: (ctx) => ctx.world.getScore() >= MAX_SCORE,
  run: (ctx) => {
    ctx.world.setStateValue('game.victory', true);
    ctx.world.setStateValue('game.ended', true);
    return [/* victory events */];
  },
};

// Score on room visit via event handler
world.chainEvent('if.event.actor_moved', (event, w) => {
  const toRoom = event.data.toRoom;
  w.awardScore(`visit:${toRoom}`, 5, 'Visited room');
  return null;
});
```

## Scoring Breakdown

| Achievement | Points | Score ID |
|---|---|---|
| Visit Petting Zoo | 5 | `zoo.visit.petting_zoo` |
| Visit Aviary | 5 | `zoo.visit.aviary` |
| Visit Gift Shop | 5 | `zoo.visit.gift_shop` |
| Visit Supply Room | 5 | `zoo.visit.supply_room` |
| Visit Nocturnal Exhibit | 5 | `zoo.visit.nocturnal` |
| Feed the goats | 10 | `zoo.action.fed_goats` |
| Feed the rabbits | 10 | `zoo.action.fed_rabbits` |
| Collect zoo map | 5 | `zoo.collect.map` |
| Collect pressed penny | 10 | `zoo.collect.pressed_penny` |
| Photograph something | 5 | `zoo.action.photographed` |
| Pet an animal | 5 | `zoo.action.petted` |
| Read the brochure | 5 | `zoo.action.read_brochure` |
| **Total** | **75** | |

## What to Try

```
> score               (check current score — 0)
> south / east        (visit petting zoo — 5 pts)
> score               (now 5 out of 75)
> take feed
> feed goats          (10 pts)
> ... visit all exhibits, collect items ...
> score               (75 out of 75 — victory!)
```

## Common Mistakes

- **Non-unique score IDs** — If two different achievements share the same ID, only the first one awards points. Always use unique, descriptive IDs.
- **Forgetting `world.setMaxScore()`** — Without this, the built-in `score` command can't show "X out of Y".
- **Victory daemon priority** — Set victory check to high priority (100) so it runs after all scoring logic has completed for the turn.

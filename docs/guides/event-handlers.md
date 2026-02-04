# Event Handlers Guide

## Overview

Event handlers let you add custom game logic that **reacts** to domain events. When an action completes and records a domain event (like `if.event.taken`), your handlers can execute custom logic.

## Understanding Domain Events

**Domain events** (`if.event.*`) are records of what happened in the game world:
- `if.event.taken` - Item was picked up
- `if.event.dropped` - Item was dropped
- `if.event.opened` - Container/door was opened
- `if.event.closed` - Container/door was closed
- `if.event.put_in` - Item was put in container

**Event handlers** react to these events during processing, allowing you to implement puzzles, trigger sequences, and add custom behavior.

## Registering Handlers

Use `world.registerEventHandler()` to register story-level handlers:

```typescript
// In initializeWorld()
world.registerEventHandler('if.event.taken', (event, world) => {
  const itemId = event.data.itemId;

  if (itemId === treasureId) {
    // Update score
    world.setState({ score: (world.getState()?.score ?? 0) + 10 });
  }
});
```

## Common Domain Events

| Event | When Fired | Data |
|-------|------------|------|
| `if.event.taken` | Item picked up | `itemId`, `actorId` |
| `if.event.dropped` | Item dropped | `itemId`, `actorId`, `locationId` |
| `if.event.opened` | Container/door opened | `targetId` |
| `if.event.closed` | Container/door closed | `targetId` |
| `if.event.locked` | Lock engaged | `targetId`, `keyId` |
| `if.event.unlocked` | Lock disengaged | `targetId`, `keyId` |
| `if.event.put_in` | Item put in container | `itemId`, `containerId` |
| `if.event.put_on` | Item put on supporter | `itemId`, `supporterId` |
| `if.event.entered` | Player entered enterable | `targetId` |
| `if.event.exited` | Player exited enterable | `targetId` |
| `if.event.moved` | Player moved rooms | `fromId`, `toId`, `direction` |

## Example: Lever Opens Secret Door

```typescript
initializeWorld(world: WorldModel): void {
  const lever = world.createEntity('lever', EntityType.OBJECT);
  lever.add(new IdentityTrait({ name: 'rusty lever' }));
  lever.add(new PullableTrait());
  world.moveEntity(lever.id, room.id);

  const secretDoor = world.createEntity('secret-door', EntityType.OBJECT);
  secretDoor.add(new IdentityTrait({ name: 'secret door' }));
  secretDoor.add(new OpenableTrait({ isOpen: false }));
  secretDoor.add(new SceneryTrait());

  // When lever is pulled, open the secret door
  world.registerEventHandler('if.event.pulled', (event, world) => {
    if (event.data.targetId === lever.id) {
      const door = world.getEntity(secretDoor.id);
      const openable = door?.get(OpenableTrait);
      if (openable && !openable.isOpen) {
        openable.isOpen = true;
        // Handler can return additional events if needed
      }
    }
  });
}
```

## Example: Three Statues Puzzle

Track state across multiple interactions:

```typescript
export class MyStory implements Story {
  private pushedStatues = new Set<string>();
  private statueIds: string[] = [];
  private doorId = '';

  initializeWorld(world: WorldModel): void {
    // Create statues
    for (let i = 1; i <= 3; i++) {
      const statue = world.createEntity(`statue-${i}`, EntityType.OBJECT);
      statue.add(new IdentityTrait({ name: `stone statue ${i}` }));
      statue.add(new PushableTrait());
      this.statueIds.push(statue.id);
    }

    // Create door
    const door = world.createEntity('secret-door', EntityType.OBJECT);
    door.add(new OpenableTrait({ isOpen: false }));
    this.doorId = door.id;

    // Handler: track pushed statues
    world.registerEventHandler('if.event.pushed', (event, world) => {
      const targetId = event.data.targetId;

      if (this.statueIds.includes(targetId)) {
        this.pushedStatues.add(targetId);

        if (this.pushedStatues.size === 3) {
          // All three pushed - open door
          const door = world.getEntity(this.doorId);
          const openable = door?.get(OpenableTrait);
          if (openable) {
            openable.isOpen = true;
          }
        }
      }
    });
  }
}
```

## Example: Scoring on Treasure Pickup

```typescript
world.registerEventHandler('if.event.taken', (event, world) => {
  const item = world.getEntity(event.data.itemId);
  const treasureTrait = item?.get(TreasureTrait);

  if (treasureTrait && !treasureTrait.scored) {
    treasureTrait.scored = true;
    const state = world.getState() ?? { score: 0 };
    state.score += treasureTrait.value;
    world.setState(state);
  }
});
```

## Example: Breakable Object

```typescript
world.registerEventHandler('if.event.dropped', (event, world) => {
  const itemId = event.data.itemId;

  if (itemId === vaseId) {
    // Remove the vase
    world.removeEntity(vaseId);

    // Create fragments
    const fragments = world.createEntity('fragments', EntityType.OBJECT);
    fragments.add(new IdentityTrait({
      name: 'vase fragments',
      description: 'Broken pieces of the vase.',
    }));
    world.moveEntity(fragments.id, event.data.locationId);
  }
});
```

## Handler Return Values

Handlers can return:
- `undefined` or `void` - No additional events
- `ISemanticEvent[]` - Array of new events to process

```typescript
world.registerEventHandler('if.event.pushed', (event, world) => {
  // Return additional events for custom messages
  return [{
    type: 'if.event.custom',
    data: {
      messageId: 'mystory.mechanism.clicks',
    },
  }];
});
```

## Best Practices

### 1. Check Trait Existence

Always verify traits exist before using them:

```typescript
const openable = entity?.get(OpenableTrait);
if (openable) {
  openable.isOpen = true;
}
```

### 2. Use Guard Clauses

Exit early if conditions aren't met:

```typescript
world.registerEventHandler('if.event.taken', (event, world) => {
  if (event.data.itemId !== specialItemId) return;

  // Handle special item...
});
```

### 3. Avoid Side Effects in Validation

Handlers run during event processing. Keep them focused on reacting to the event.

### 4. Test Handler Interactions

When multiple handlers might fire for the same event, test that they work correctly together.

## Event Processing Order

When a domain event is recorded:

1. Entity-level behaviors execute
2. Story-level handlers execute (via `registerEventHandler`)
3. Event is written to event source
4. At turn end, text service renders all events

## Common Patterns

### Toggle Something

```typescript
world.registerEventHandler('if.event.pushed', (event, world) => {
  if (event.data.targetId === switchId) {
    const switchable = world.getEntity(lightId)?.get(SwitchableTrait);
    if (switchable) {
      switchable.isOn = !switchable.isOn;
    }
  }
});
```

### Connect Rooms Dynamically

```typescript
world.registerEventHandler('if.event.opened', (event, world) => {
  if (event.data.targetId === drawbridgeId) {
    // Add new exit
    const room = world.getEntity(castleEntranceId);
    const roomTrait = room?.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: courtyardId };
    }
  }
});
```

### Count-Based Triggers

```typescript
let bellRings = 0;

world.registerEventHandler('if.event.rung', (event, world) => {
  if (event.data.targetId === bellId) {
    bellRings++;
    if (bellRings >= 3) {
      // Something happens after ringing 3 times
    }
  }
});
```

## Debugging

Add logging to see when handlers fire:

```typescript
world.registerEventHandler('if.event.taken', (event, world) => {
  console.log('Taken event:', event.data);
  // ...
});
```

Run with verbose mode to see event flow:

```bash
node dist/cli/sharpee.js --play --verbose
```

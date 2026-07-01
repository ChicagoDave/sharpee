# V12 — Event Handlers

## What This Version Teaches

Event handlers let you react to things that happen in the game — when the player drops an item, opens a container, or walks into a room. This is how you build puzzles and special effects without writing custom actions.

## Key Concepts

### How Events Work

Every stdlib action emits an event when it succeeds:

| Event | Fired When |
|---|---|
| `if.event.taken` | Player took an item |
| `if.event.dropped` | Player dropped an item |
| `if.event.put_in` | Player put an item in a container |
| `if.event.put_on` | Player put an item on a supporter |
| `if.event.opened` | Player opened something |
| `if.event.closed` | Player closed something |
| `if.event.locked` | Player locked something |
| `if.event.unlocked` | Player unlocked something |

### Two Kinds of Handlers

**Silent handlers** — mutate world state without producing text:

```typescript
world.registerEventHandler('if.event.dropped', (event, world) => {
  // Set a flag, move an item, change state — but no text output
  world.setStateValue('item-was-dropped', true);
});
```

**Chain handlers** — return an event that produces visible text:

```typescript
world.chainEvent(
  'if.event.dropped',
  (event, world) => {
    const data = event.data as Record<string, any>;
    if (data.item !== feedId) return null;

    return {
      id: `goats-react-${Date.now()}`,
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: { text: 'The goats rush over and eat the feed!' },
    };
  },
  { key: 'zoo.chain.goats-eat-feed' },
);
```

Use `chainEvent()` when you want the player to **see** something happen.

### Event Data

Each event carries data about what happened. The shape depends on the event type:

```typescript
// if.event.dropped
{ item: EntityId, itemName: string, toLocation: EntityId }

// if.event.put_in
{ itemId: string, targetId: string, preposition: 'in' }
```

### Item Transformation Pattern

A common puzzle pattern: put item A into machine, get item B out.

```typescript
world.chainEvent('if.event.put_in', (event, w) => {
  const data = event.data as Record<string, any>;
  if (data.itemId !== pennyId || data.targetId !== pressId) return null;

  // Remove the input item
  w.removeEntity(pennyId);

  // Create the output item
  const pressedPenny = w.createEntity('pressed penny', EntityType.ITEM);
  pressedPenny.add(new IdentityTrait({ name: 'pressed penny', ... }));

  // Give it to the player
  const player = w.getPlayer();
  if (player) w.moveEntity(pressedPenny.id, player.id);

  // Tell the player what happened
  return {
    id: `press-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: { text: 'The machine produces a beautiful pressed penny!' },
  };
}, { key: 'zoo.chain.penny-press' });
```

## Commands to Try

```
> south / east                  (go to Petting Zoo)
> take feed                     (pick up the animal feed)
> drop feed                     (watch the goats react!)
> west / west / west            (go to Gift Shop via Aviary)
> examine press                 (see the souvenir press)
> east / east / take penny      (get the penny from Main Path)
> west / west / put penny in press  (make a pressed penny!)
> inventory                     (see the pressed penny)
```

## Key Takeaways

- Every stdlib action emits an event you can react to
- `world.registerEventHandler()` for silent state changes
- `world.chainEvent()` for reactions that produce visible text
- Chain handlers return `ISemanticEvent | null` — return null to ignore
- The `game.message` event type with a `text` field renders custom text
- Item transformation: remove old item + create new item + move to player
- Use `{ key: '...' }` to give each chain handler a unique identifier

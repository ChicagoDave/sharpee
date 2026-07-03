# Version 4: Portable Objects

## What This Version Does

There are now things you can actually pick up: a zoo map at the entrance, a bag of animal feed at the petting zoo, and a souvenir penny on the main path. You can take them, carry them between rooms, check your inventory, and drop them wherever you like.

## What's New (Compared to V3)

V3 was all about things you can't take. V4 is the opposite — things you can.

## What You'll Learn

### Items Are Portable by Default

This is the key insight in Sharpee's design: **you don't need a special trait to make something portable.** Just create an entity with `EntityType.ITEM` and an `IdentityTrait`, and the player can take it.

```typescript
const zooMap = world.createEntity('zoo map', EntityType.ITEM);
zooMap.add(new IdentityTrait({
  name: 'zoo map',
  description: 'A colorful folding map of the zoo.',
  aliases: ['map', 'zoo map', 'folding map'],
}));
world.moveEntity(zooMap.id, entrance.id);
```

That's all you need. No "PortableTrait" exists — portability is the default. You add SceneryTrait to *remove* portability, not the other way around.

### Built-in Actions for Portable Objects

Sharpee's standard library handles all the common inventory actions automatically:

| Player Types | What Happens |
|-------------|-------------|
| `take map` | Moves the map from the room to the player's inventory |
| `drop map` | Moves the map from inventory to the current room |
| `inventory` or `i` | Lists everything the player is carrying |
| `take all` | Takes every portable object in the room |
| `drop all` | Drops everything the player is carrying |

You don't write any code for these — they're built into the engine.

### How Taking Works Under the Hood

When the player types `take map`:

1. The **parser** finds the entity named "map" in the current room
2. The **taking action** checks if the entity has `SceneryTrait`
   - If yes: blocked — *"The map is fixed in place."*
   - If no: proceeds to step 3
3. The taking action calls `world.moveEntity(map.id, player.id)`
4. The player sees *"Taken."*

That's it. The distinction between portable and non-portable is simply: does the entity have SceneryTrait?

### Portable Objects Move with the Player

When the player carries an item and walks to a new room, the item moves with them. This happens automatically — items inside the player's ContainerTrait travel wherever the player goes.

### Room Descriptions Show Loose Objects

When the player types `look`, portable objects lying on the ground are listed after the room description:

```
Main Path
A wide gravel path winds through the heart of the zoo...

You can see a souvenir penny here.
```

Scenery objects are NOT listed this way — they're expected to be mentioned in the room's description text.

### EntityType.ITEM

`EntityType.ITEM` is the type for generic portable objects. It's the counterpart to `EntityType.SCENERY`:

| Entity Type | Portable by Default | Example |
|------------|-------------------|---------|
| `EntityType.ITEM` | Yes | Maps, keys, coins |
| `EntityType.SCENERY` | No (with SceneryTrait) | Fences, benches, animals |

## Commands to Try

```
> look                  Notice the zoo map on the ground
> take map              Pick up the map
> inventory             See what you're carrying
> examine map           Read the map
> south                 Walk to Main Path (map comes with you)
> take penny            Pick up the souvenir penny
> inventory             Now carrying map and penny
> drop map              Leave the map here
> look                  Map is now on the ground in Main Path
> east                  Go to Petting Zoo
> take feed             Pick up the bag of animal feed
> take goats            Can't — they're scenery!
```

## The Code

See `src/v04.ts` for the complete, commented source.

## Key Takeaway

Items are portable by default — no special trait needed. Create an entity with `EntityType.ITEM` and `IdentityTrait`, place it in a room, and the player can take it, carry it, and drop it. SceneryTrait is what blocks portability, not what enables it.

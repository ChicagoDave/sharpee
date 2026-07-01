# Version 1: A Single Room

## What This Version Does

You're standing at the entrance to the Willowbrook Family Zoo. There's a welcome sign and a ticket booth. You can look around and examine things, but there's nowhere to go yet.

That's it. One room, two things to look at. This is the simplest possible Sharpee story.

## What You'll Learn

### The Story Interface

Every Sharpee story is a TypeScript class that implements the `Story` interface. The engine calls your class's methods during startup to build the game world. There are three things every story must provide:

1. **`config`** — A `StoryConfig` object with the story's title, author, version, and ID. The engine displays this as a banner when the game starts.

2. **`createPlayer(world)`** — Creates the player character. The engine calls this first, before anything else. You create an entity, attach traits to it, and return it.

3. **`initializeWorld(world)`** — Builds the game world. This is where you create rooms, objects, and connections. The engine calls this after `createPlayer`.

There are optional methods too (`extendParser`, `extendLanguage`, `onEngineReady`, and others), but you don't need any of them for a basic story.

### Entities

Everything in a Sharpee game is an **entity** — rooms, objects, characters, doors, even the player. An entity by itself is just an empty shell with an ID. You make it useful by attaching **traits**.

Entities have a **type** that gives the engine a hint about what they are:

| Type | What It Is |
|------|-----------|
| `EntityType.ROOM` | A location the player can be in |
| `EntityType.ITEM` | A portable object |
| `EntityType.ACTOR` | A character (player or NPC) |
| `EntityType.SCENERY` | A fixed object that can't be picked up |
| `EntityType.CONTAINER` | An object that holds other objects |
| `EntityType.SUPPORTER` | An object things can be placed on |

You create entities with `world.createEntity(name, type)`.

### Traits

Traits are components you attach to entities to give them capabilities. Think of them as answers to "what IS this thing?" and "what can this thing DO?"

In V1, we use four traits:

- **`IdentityTrait`** — Gives an entity a name, description, and aliases. Almost every entity has this. The `description` is what the player sees when they type `examine`. The `aliases` are alternative words the parser recognizes — so the player can type `examine sign` or `examine wooden sign` and both work.

- **`ActorTrait`** — Marks an entity as a character. The `isPlayer: true` flag tells the engine this is the player character.

- **`ContainerTrait`** — Lets an entity hold other entities inside it. The player needs this so they can carry items in their inventory.

- **`SceneryTrait`** — Marks an entity as fixed scenery. The player can examine it but not pick it up. Without this, `take sign` would put the sign in the player's inventory.

- **`RoomTrait`** — Marks an entity as a room. Rooms have exits (empty in V1 since there's only one room) and a darkness flag.

### Placing Things in Rooms

Creating an entity doesn't put it anywhere. You must explicitly place it with `world.moveEntity(entityId, locationId)`. This puts the entity "inside" the location — whether that's an object inside a room, an item inside a container, or the player inside a room.

If you forget this step, the entity exists in the world's database but is invisible — the player can never find it.

### The Player's Starting Location

The player is an entity too, and they need to be placed in a room just like any object. `world.moveEntity(player.id, entrance.id)` sets the starting location.

## Commands to Try

```
> look                  See the room description
> examine sign          Read the welcome sign
> examine booth         Look at the ticket booth
> take sign             Can't — it's scenery ("fixed in place")
> inventory             Check what you're carrying (nothing yet)
```

## The Code

See `src/v01.ts` for the complete, commented source.

## Key Takeaway

A Sharpee story is a class with a config, a player creator, and a world initializer. The world is made of entities with traits. Place everything explicitly, or it won't exist.

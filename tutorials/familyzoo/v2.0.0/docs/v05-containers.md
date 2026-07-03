# Version 5: Containers & Supporters

## What This Version Does

The zoo now has things that hold other things. A red backpack at the entrance can store items inside it. A feed dispenser at the petting zoo is a container mounted to a post. A park bench on the main path lets you place things on top of it.

## What's New (Compared to V4)

V4 introduced portable items the player carries directly. V5 adds intermediate holders — containers you put things *in* and supporters you put things *on*.

## What You'll Learn

### Two Kinds of Holders

Sharpee has two traits for entities that hold other entities:

**ContainerTrait** — things go *inside*:
```
> put map in backpack
You put zoo map in backpack.
> look in backpack
In the backpack you can see a zoo map.
```

**SupporterTrait** — things go *on top*:
```
> put penny on bench
You put souvenir penny on park bench.
```

The parser handles the preposition automatically — "put X **in** Y" routes to ContainerTrait, "put X **on** Y" routes to SupporterTrait.

### ContainerTrait

ContainerTrait lets an entity hold other entities inside it. You've already seen it on the player (for inventory). In V5, we use it on objects too.

```typescript
const backpack = world.createEntity('backpack', EntityType.CONTAINER);

backpack.add(new IdentityTrait({
  name: 'backpack',
  description: 'A small red canvas backpack.',
  aliases: ['backpack', 'bag', 'pack'],
}));

backpack.add(new ContainerTrait({
  capacity: { maxItems: 5 },   // Can hold up to 5 things
}));
```

#### Portable vs Fixed Containers

Containers can be portable or fixed:

| Container | Portable? | How? |
|-----------|----------|------|
| Backpack | Yes | No SceneryTrait — player can take it |
| Feed dispenser | No | Has SceneryTrait — fixed in place |

A portable container is powerful: the player can take the backpack, and everything inside comes along. They're carrying a container full of items, which counts as one item in their own inventory.

A fixed container is useful for dispensers, lockers, drawers, and other built-in storage the player can access but not move.

### SupporterTrait

SupporterTrait is the surface counterpart to ContainerTrait. Things go *on* a supporter rather than *in* it.

```typescript
const parkBench = world.createEntity('park bench', EntityType.SUPPORTER);

parkBench.add(new SupporterTrait({
  capacity: { maxItems: 3 },
}));

parkBench.add(new SceneryTrait());   // Can't take the bench itself
```

Common supporters: tables, shelves, counters, altars, pedestals, desks.

The key difference from containers: supporters are typically **open** — you can see what's on them without a special action. Containers can be open or closed (we'll explore OpenableTrait in V6).

### Capacity Limits

Both ContainerTrait and SupporterTrait accept a `capacity` option:

```typescript
capacity: { maxItems: 5 }
```

If the player tries to put a sixth item in, they'll get a "can't fit" message. This prevents infinite storage and lets you create puzzles around limited space.

### The Player Is a Container

Remember from V1: the player entity has ContainerTrait with `maxItems: 10`. That's why inventory works — carried items are literally inside the player's ContainerTrait. The player is a walking container.

### Combining Traits

V5 shows an important pattern: **entities can have multiple traits.** The park bench has both `SupporterTrait` (things go on it) and `SceneryTrait` (can't be taken). The feed dispenser has both `ContainerTrait` (things go in it) and `SceneryTrait` (can't be taken).

Traits are composable. You mix and match them to create the exact behavior you need.

## Commands to Try

```
> take backpack          Pick up the portable container
> take map               Pick up the zoo map
> put map in backpack    Store the map inside the backpack
> look in backpack       See what's in the backpack
> inventory              Backpack is one item in your inventory
> south                  Go to Main Path
> take penny             Pick up the penny
> put penny on bench     Place penny on the supporter
> look                   Penny visible on the bench
> east                   Go to Petting Zoo
> take dispenser         Can't — it's scenery
> examine dispenser      But you can look at it
```

## The Code

See `src/v05.ts` for the complete, commented source.

## Key Takeaway

ContainerTrait lets entities hold things inside them. SupporterTrait lets entities have things placed on them. Both can be portable or fixed (via SceneryTrait). Traits are composable — combine them to create the exact behavior each object needs.

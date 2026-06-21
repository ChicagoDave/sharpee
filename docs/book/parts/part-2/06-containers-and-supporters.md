# Containers & Supporters

![](art/ewer.jpg){.chapter-ornament}

So far the zoo has things you walk past and things you carry. This chapter adds
things that hold *other* things: a red backpack the player can store items inside,
a feed dispenser bolted to a post at the petting zoo, and a park bench you can set
objects on top of. Two new traits cover both cases — and the difference between
them is the difference between *in* and *on*.

## Two kinds of holders

Sharpee gives you two traits for entities that hold other entities:

- **`ContainerTrait`** — things go *inside*. Backpacks, boxes, drawers, dispensers.
- **`SupporterTrait`** — things go *on top*. Tables, shelves, benches, pedestals.

The parser sorts them out by preposition. "put X **in** Y" routes to the
container; "put X **on** Y" routes to the supporter. You never write that logic —
you just declare which kind of holder each object is.

```
> put map in backpack
You put zoo map in backpack.
> put penny on bench
You put souvenir penny on park bench.
```

## ContainerTrait

A container holds entities inside it. You've already met this trait once: the
player carries an inventory because the player entity itself has a
`ContainerTrait`. In this chapter we put it on ordinary objects too.

```typescript
const backpack = world.createEntity('backpack', EntityType.CONTAINER);
backpack.add(new IdentityTrait({
  name: 'backpack',
  description: 'A small red canvas backpack.',
  aliases: ['backpack', 'bag', 'pack'],
}));
backpack.add(new ContainerTrait({
  capacity: { maxItems: 5 },   // holds up to 5 things
}));
```

Because we *didn't* add `SceneryTrait`, this backpack is portable — and that's
where containers get interesting.

### Portable vs fixed containers

A container is fixed or portable on exactly the rule from the last chapter:
`SceneryTrait` or not.

| Container | Portable? | How |
|---|---|---|
| Backpack | Yes | No `SceneryTrait` — the player can take it |
| Feed dispenser | No | Has `SceneryTrait` — fixed to its post |

A portable container is a small piece of magic: the player takes the backpack and
everything inside comes with it. A bag of five items counts as **one** item in the
player's own inventory. A fixed container — the dispenser below — is for built-in
storage the player can reach into but never walk off with:

```typescript
const dispenser = world.createEntity('feed dispenser', EntityType.CONTAINER);
dispenser.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
dispenser.add(new SceneryTrait());   // can't take the dispenser itself
```

## SupporterTrait

A supporter is the surface counterpart: things rest *on* it rather than *in* it.

```typescript
const parkBench = world.createEntity('park bench', EntityType.SUPPORTER);
parkBench.add(new IdentityTrait({
  name: 'park bench',
  description: 'A weathered wooden bench worn smooth by decades of visitors.',
  aliases: ['bench', 'park bench', 'seat'],
}));
parkBench.add(new SupporterTrait({ capacity: { maxItems: 3 } }));
parkBench.add(new SceneryTrait());   // can't take the bench itself
```

The key behavioral difference from a container: supporters are always
**open** — whatever sits on a bench is visible without any special action.
Containers, as the next chapter shows, can be opened and closed to hide their
contents.

## Capacity limits

Both traits accept the same `capacity` option:

```typescript
capacity: { maxItems: 5 }
```

Try to put a sixth item in a five-item container and the player gets a "can't fit"
message. Capacity isn't just bookkeeping — limited space is the raw material of
puzzles, forcing the player to choose what to carry and what to leave behind.

> **The mistake everyone makes once:** leaving `capacity` off. A container or
> supporter with no `capacity` has *no limit* — it will swallow the entire zoo.
> If you want a bound, set `maxItems` explicitly.

## Traits are composable

The real lesson of this chapter isn't either trait on its own — it's that an
entity can wear several traits at once, and they stack cleanly:

- The park bench is a `SupporterTrait` (things go on it) **and** a `SceneryTrait`
  (you can't take it).
- The feed dispenser is a `ContainerTrait` (things go in it) **and** a
  `SceneryTrait` (you can't take it).

You're not choosing one behavior per object. You're assembling each object out of
small, single-purpose traits until it does exactly what the world needs. Every
chapter from here on is, underneath, more of this same move: combine traits to get
new behavior.

## Try it

```
> take backpack          Pick up the portable container
> take map               Pick up the zoo map
> put map in backpack    Store the map inside
> look in backpack       See what's in the backpack
> inventory              Backpack counts as one item — its contents ride along
> south                  Go to the Main Path
> take penny             Pick up the penny
> put penny on bench     Place it on the supporter
> look                   The penny is visible on the bench
> east                   Go to the Petting Zoo
> take dispenser         Can't — it's scenery
> examine dispenser      But you can look at it
```

## Key takeaway

`ContainerTrait` holds things *inside*; `SupporterTrait` holds things *on top*;
the parser routes "in" and "on" to the right one automatically. Either can be
portable or fixed depending on whether it also has `SceneryTrait`, and a portable
container carries its contents with it as a single inventory item. Set `capacity`
to bound them — and remember that traits are composable, so you build each object
by stacking the small traits it needs.

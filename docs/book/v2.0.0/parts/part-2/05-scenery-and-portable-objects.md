# Scenery & Portable Objects: Everything Is Portable by Default

A world you can only walk through is a stage set. In this chapter the zoo gains
two kinds of things: **scenery** you can examine but never carry off (fences,
benches, animals) and **portable items** the player can take, pocket, and drop
(a zoo map, a souvenir penny, a bag of feed). Together they're the difference
between a room description and a place you can rummage through.

The surprising part is how little code each one takes. One of them takes *no new
trait at all*.

## Everything is portable by default

Here is Sharpee's central rule about objects, and it catches everyone the first
time: **an entity is takeable unless you say otherwise.** Create something with an
`IdentityTrait` and nothing else, and the player can pick it up, carry it between
rooms, and drop it wherever they like. There is no `PortableTrait`, because
portability isn't a feature you add. It's the starting state.

So a souvenir penny needs only its identity and a home. Like every
world-building block from here on, it goes at the end of `initializeWorld`,
before the player is placed (the placement rule from How to Read This Book):

```typescript
const penny = world.createEntity(
  'souvenir penny',
  EntityType.ITEM,
);
penny.add(new IdentityTrait({
  name: 'souvenir penny',
  description:
    'A flattened copper penny stamped with a smiling elephant.',
  aliases: ['penny', 'coin', 'souvenir'],
}));
world.moveEntity(penny.id, mainPath.id);
```

That's a complete, takeable object. `EntityType.ITEM` is the type label for a
generic portable thing; the `IdentityTrait` gives it a name, description, and
aliases. No trait is needed to make it carryable; that's the default.

## EntityType.SCENERY makes a thing fixed

Most of the things in a room are *not* meant to be carried. You don't want the
player stuffing a park bench into a backpack or wandering off with the iron
fence. Create a fixed thing as `EntityType.SCENERY` and it comes with a
`SceneryTrait` already attached. That trait does exactly one thing: it blocks the
taking action.

```typescript
const fence = world.createEntity(
  'iron fence',
  EntityType.SCENERY,
);
fence.add(new IdentityTrait({
  name: 'iron fence',
  description:
    'A tall wrought-iron fence with animal silhouettes.',
  aliases: ['fence', 'iron fence', 'railing'],
}));
world.moveEntity(fence.id, entrance.id);
```

Now `take fence` gives the player *"The iron fence is fixed in place."* But
`examine fence` still works: scenery blocks *taking*, not *looking*. The entity
keeps its `IdentityTrait`, so its description is always readable.

> **The mistake everyone makes once:** a fixed thing that *isn't* typed
> `EntityType.SCENERY`. The scenery type pins it for you, but a container, a
> supporter, or an animal you made an `ACTOR` is portable by default. If the player
> can pocket your feed dispenser, it has no `SceneryTrait` and you need to add one
> by hand.

## When you still add SceneryTrait by hand

Typing a thing `EntityType.SCENERY` is the usual way to fix it, and it is enough
on its own. You reach for an explicit `SceneryTrait` in only two cases:

- **A fixed thing of another type.** A feed dispenser is a `CONTAINER` and a park
  bench is a `SUPPORTER`; those types don't arrive fixed, so you add a
  `SceneryTrait` to pin them in place.
- **A custom refusal.** A plain `SceneryTrait` gives the standard "fixed in place"
  line; construct it with your own message to say something specific.

| Entity type | Fixed by default | Example |
|---|---|---|
| `EntityType.ITEM` | No (portable) | Maps, keys, coins |
| `EntityType.SCENERY` | Yes (gets `SceneryTrait`) | Fences, benches, animals |
| `EntityType.CONTAINER` / `SUPPORTER` | No (add `SceneryTrait` to fix) | Dispensers, shelves |

A rule of thumb: if you'd find it strange for the player to put a thing in their
pocket, make it `EntityType.SCENERY`.

## Aliases make objects findable

Whether takeable or fixed, every object should answer to more than its exact
name. If a room mentions "a wrought-iron fence," the player might type
`examine fence`, `examine railing`, or `examine wrought-iron fence`, and all of
them should land:

```typescript
aliases: ['fence', 'iron fence', 'wrought-iron fence', 'railing'],
```

> **The other easy miss:** thin aliases. A player who can see a thing in the
> description but can't refer to it the way they'd naturally say it will assume
> it isn't really there. Be generous: every noun in your prose is a word the
> player may type.

## What you get for free

Because portability is built in, so are the verbs that go with it. The standard
library handles the whole inventory vocabulary without a line of code from you:

| Player types | What happens |
|---|---|
| `take map` | Moves the map from the room into the player's inventory |
| `drop map` | Moves the map from inventory to the current room |
| `inventory` / `i` | Lists everything the player is carrying |
| `take all` | Takes every portable object in the room |
| `drop all` | Drops everything the player is holding |

When the player carries an item and walks to a new room, the item travels with
them. Carried things live with the player's default ability to 'contain' items,
so they go wherever the player goes. Loose portable objects left on the floor are
listed after the room description:

```
Main Path
A wide gravel path winds through the heart of the zoo...

You can see a souvenir penny here.
```

Scenery is *not* listed this way; it's expected to be named in the room's
description prose, where it belongs.

## How taking actually decides

The whole portable-vs-fixed distinction comes down to one check. When the player
types `take map`:

1. The **parser** finds the entity named "map" in the current room.
2. The **taking** action asks: does this entity have `SceneryTrait`?
   - If yes → blocked: *"The zoo map is fixed in place."*
   - If no → it proceeds.
3. The action moves the entity into the player: `world.moveEntity(map.id, player.id)`.
4. The player sees *"Taken."*

That's the entire rule. Portable or not is simply: *does it have `SceneryTrait`?*
Creating a thing as `EntityType.SCENERY` is just the quickest way to give it one.

## Putting it together

Fill each room with scenery for atmosphere, then scatter a few takeable items.
Scenery is typed `EntityType.SCENERY`, which fixes it in place; items get nothing
extra. (The iron fence below is the same one from the `EntityType.SCENERY`
section above, shown again so this listing reads whole; add it once. The
souvenir penny you created earlier in the chapter is not re-shown; it stays
where you typed it.)

```typescript
// Scenery: the SCENERY type fixes it in place, examinable,
// mentioned in room prose.
const fence = world.createEntity(
  'iron fence',
  EntityType.SCENERY,
);
fence.add(new IdentityTrait({
  name: 'iron fence',
  description:
    'A tall wrought-iron fence with animal silhouettes.',
  aliases: ['fence', 'iron fence', 'railing'],
}));
world.moveEntity(fence.id, entrance.id);

// More scenery: a pair of rabbits in the Petting Zoo, beside the
// goats.
const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
rabbits.add(new IdentityTrait({
  name: 'rabbits',
  description:
    'A pair of Holland Lop rabbits with floppy ears and ' +
    'twitching noses, one pure white and the other brown and ' +
    'cream.',
  aliases: ['rabbits', 'rabbit', 'bunnies', 'bunny'],
  article: 'some',
  grammaticalNumber: 'plural',
}));
world.moveEntity(rabbits.id, pettingZoo.id);

// A takeable item: no SceneryTrait, so it's portable by default.
const zooMap = world.createEntity('zoo map', EntityType.ITEM);
zooMap.add(new IdentityTrait({
  name: 'zoo map',
  description:
    'A colorful folding map of the zoo, a heart drawn around ' +
    'the petting zoo in crayon.',
  aliases: ['map', 'zoo map', 'folding map'],
}));
world.moveEntity(zooMap.id, entrance.id);

// A second takeable item, in the Petting Zoo this time.
const animalFeed = world.createEntity(
  'bag of animal feed',
  EntityType.ITEM,
);
animalFeed.add(new IdentityTrait({
  name: 'bag of animal feed',
  description:
    'A small brown paper bag of dried corn and pellets. The ' +
    'label reads "ZOO SNACKS: Safe for goats, rabbits, and ' +
    'birds." It rustles invitingly.',
  aliases: [
    'feed', 'animal feed', 'bag of feed',
    'bag', 'corn', 'pellets',
  ],
}));
world.moveEntity(animalFeed.id, pettingZoo.id);
```

The souvenir penny from earlier in the chapter sits on the Main Path, and the
**pygmy goats** you placed in the Petting Zoo back in Chapter 4 are scenery, so
every object the "Try it" walkthrough touches is now in the world: the map and
penny are portable, the feed waits in the Petting Zoo, and the goats stay put.

> **Plural-named scenery:** the rabbits get `grammaticalNumber: 'plural'`. Sharpee's
> messages agree in number with the entity, so this is what makes `take rabbits`
> report "The rabbits **are** fixed in place." rather than "is". Set it on anything
> with a plural name (*pygmy goats*, *direction signs*, *flower beds*) and the
> generated prose stays grammatical. (See Chapter 19 for how the message templates
> choose the verb.) The multi-file chapter's `object()` builder (a fluent
> alternative you'll meet in Chapter 28) spells this `.plural()`.

## Room-description snippets

Scenery lives in the room's prose, and that rule pushes real work onto the
prose: every fence, bench, and animal wants its clause, and every later change
means re-editing one long string. Sharpee gives room descriptions one
purpose-built tool for this. A **snippet** is a piece of text you write,
spliced into the description at a **marker** you place. The splice is purely
mechanical. There is no generated prose and no rewriting; every rendered
character is something you wrote.

A marker is written `{snippet:name}` inside the description, and the room's
`RoomTrait` carries a matching **snippet map** giving each marker its text.
Take the Petting Zoo. Chapter 4 wrote the rabbits directly into its
description; carve that clause out as a snippet instead. In the Chapter 4
creation block, the description gains a marker where the clause used to be
(the replacement rule):

```typescript
  pettingZoo.add(new IdentityTrait({
    name: 'Petting Zoo',
    description:
      'A cheerful open-air enclosure filled with friendly ' +
      'animals. Pygmy goats trot around nibbling at ' +
      'visitors\' shoelaces{snippet:rabbits}. The main path ' +
      'is back to the west.',
    aliases: ['petting zoo', 'petting area', 'pen'],
    article: 'the',
  }));
```

Then, at the end of this chapter's scenery code, after the rabbits exist, the
room gets its snippet map. `RoomTrait` data is yours to set through `.get()`,
the same way Chapter 4 wired exits:

```typescript
pettingZoo.get(RoomTrait)!.snippets = {
  rabbits:
    ', while a pair of fluffy rabbits hop near a hay bale',
};
```

Rendered, the paragraph is exactly the one Chapter 4 shipped:

```
A cheerful open-air enclosure filled with friendly animals. Pygmy goats trot
around nibbling at visitors' shoelaces, while a pair of fluffy rabbits hop
near a hay bale. The main path is back to the west.
```

Two details to notice. The snippet carries its own leading comma and space:
the splice inserts the text and nothing else, so whatever spacing and
punctuation the sentence needs travels with the snippet. And the room only
*whispers* the rabbits while the entity keeps its full identity: `examine
rabbits` still gives the close-up from the rabbits' own `IdentityTrait`, and
nothing forces the spliced clause to name the entity the way the world model
does. A quiet aside in the prose that rewards the player who examines it is
exactly what this tool is for.

So far the snippet has only moved a clause. The payoff comes in three parts.

### Lists vary the text

A snippet may be a list, and the platform picks one entry per render:

```typescript
pettingZoo.get(RoomTrait)!.snippets = {
  rabbits: [
    ', while a pair of fluffy rabbits hop near a hay bale',
    ', while the rabbits doze in a heap of loose hay',
    '',
  ],
};
```

A list **cycles** by default: the first entry on the first render, the second
on the next, wrapping when it runs out. The empty string is a legal entry that
renders nothing, so with this map every third look leaves the rabbits
unmentioned. Selection is seeded and deterministic, never wall-clock
randomness, and each entry's counter is saved with the game: transcripts
replay identically (Chapter 29), and a saved game resumes its cycle where it
left off (Chapter 30).

Cycling is one of five selectors, and the long form names one explicitly:

```typescript
rabbits: {
  selector: 'random',
  texts: [ /* ... */ ],
},
```

`cycling` takes turns, `stopping` advances and then stays on the last entry,
`firstTime` uses the first entry once and the second ever after, `random`
picks with a seeded generator, and `sticky` picks once and repeats that pick
forever. Chapter 19 shows the same selectors at work inside message templates.

### `mentions` ties a snippet to its entity

The rabbits clause describes an entity that might not always be there. Name
that entity in the entry and the snippet gates itself on the entity's
presence:

```typescript
pettingZoo.get(RoomTrait)!.snippets = {
  rabbits: {
    texts: [
      ', while a pair of fluffy rabbits hop near a hay bale',
      ', while the rabbits doze in a heap of loose hay',
      '',
    ],
    mentions: rabbits.id,
  },
};
```

A snippet with `mentions` renders only while that entity is in the room, with
no bookkeeping from you: if the rabbits are ever moved away or removed from
play, their clause simply evaporates from the description, and it returns when
they do. Presence is transitive containment, so rabbits inside a hutch inside
the room still count as here. The field does a second job as coverage
metadata: it records, mechanically, which scenery this prose accounts for.

### The map is data your handlers can edit

The snippet map is plain data on the trait, so the event handlers of
Chapter 13 may rewrite entries at runtime: swap in aftermath text after some
event, or quiet a mention whose moment has passed. One convention keeps that
safe: set an entry to the empty string rather than deleting it, so the
load-time check described next stays meaningful.

### The rules

Snippets are opt-in, room by room. A room with no snippet map is never
scanned: braces in its description are ordinary prose, which is why nothing
you wrote before this section changes meaning. Giving a room a map is what
turns every `{snippet:x}` in its description into a marker. One invariant
follows, so keep it in mind: the same description text renders differently
depending on whether the room has a snippet map.

Mistakes fail loudly and early. A marker with no matching entry is an error
the moment the story loads, naming the room and the marker. A map entry whose
marker appears nowhere in the room's text is a `sharpee build` warning
(Chapter 31), since it is usually mid-edit drift. And if a handler leaves a
marker unbound at runtime, the render splices nothing and logs a warning
rather than crashing the turn.

Markers work in `initialDescription` too (the first-visit text from
Chapter 4). Both texts share the room's one snippet map, and a marker used in
both draws from the same entry and the same counter: a first visit that
renders the initial text advances the cycle, and the next look continues it
in the standing description.

Two boundaries complete the picture. Snippets are not a general conditional
text system: the map holds no functions, only text, and the one piece of
world state it reads is the `mentions` presence gate. Anything more
conditional belongs in an event handler editing the map. And for a localized
story, any snippet text may be `{ messageId: '...' }` instead of a literal
string, resolving through the language layer of Chapter 18; single-language
stories just write the text.

## Try it

```
> look                  Notice the zoo map on the ground
> take map              Pick up the map
> inventory             See what you're carrying
> examine fence         You can look at scenery...
> take fence            ...but "The iron fence is fixed in place."
> south                 Walk to the Main Path (map comes with you)
> take penny            Pick up the souvenir penny
> drop map              Leave the map here
> look                  Map is now on the ground in Main Path
> east                  Go to the Petting Zoo
> take feed             Pick up the bag of animal feed
> take goats            Can't: they're scenery!
```

## Test it

Portable-versus-fixed is exactly the kind of rule a later chapter can
accidentally break. Add `tests/transcripts/scenery-and-items.transcript`:

```text
title: Scenery and items
story: familyzoo
description: Portable by default; scenery fixed in place

---

> look
[OK: contains "zoo map"]

> take map
[OK: contains "Taken"]

> inventory
[OK: contains "zoo map"]

> examine fence
[OK: contains "wrought-iron"]

> take fence
[OK: contains "fixed in place"]

> south
[OK: contains "Main Path"]

> take penny
[OK: contains "Taken"]

> drop map
[OK: contains "Dropped"]

> look
[OK: contains "zoo map"]

> east
[OK: contains "Petting Zoo"]

> take feed
[OK: contains "Taken"]

> take goats
[OK: contains "fixed in place"]
```

The rabbits snippet deserves its own pin, because its whole point is behavior
across *repeated* looks: the cycle advances, goes quiet on the empty entry,
and wraps. Add `tests/transcripts/room-snippets.transcript`:

```text
title: Room snippets
story: familyzoo
description: The rabbits snippet cycles, goes quiet, and wraps

---

> south
[OK: contains "Main Path"]

> east
[OK: contains "hop near a hay bale"]

> look
[OK: contains "doze in a heap"]

> look
[OK: not contains "rabbits"]

> look
[OK: contains "hop near a hay bale"]
```

The third `look` lands on the empty entry, so the description says nothing
about rabbits at all, and the fourth wraps back to the first clause. That
sequence is reliable enough to assert on because snippet selection is seeded,
not random at the wall clock.

## Key takeaway

Items are portable by default: `EntityType.ITEM` plus an `IdentityTrait` is a
complete takeable object, no special trait required. `SceneryTrait` *removes*
portability; it's what makes fences, benches, and animals fixed in place while
still examinable. Reach for scenery on anything the player shouldn't pocket, and
give every object generous aliases so it can be named the way a player would say
it. And when the prose that mentions your scenery wants tuning or variety,
room-description snippets splice author-written clauses at markers you place,
deterministic, save-stable, and opt-in room by room.

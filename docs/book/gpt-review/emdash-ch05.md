# Em-dash review — Chapter 05: Scenery & Portable Objects

### 1. "The label and the trait" paragraph (line 73) — prose
OLD:
You want both for a proper fixed object. `EntityType.SCENERY` without
`SceneryTrait` is scenery the player can still pick up — almost never what you
mean. The pair to keep straight:

NEW:
You want both for a proper fixed object. `EntityType.SCENERY` without
`SceneryTrait` is scenery the player can still pick up, which is almost never what you
mean. The pair to keep straight:

### 2. "What you get for free" paragraph (line 114) — prose
OLD:
When the player carries an item and walks to a new room, the item travels with
them — carried things live inside the player's own container, so they move
wherever the player goes. And loose portable objects on the floor are listed
after the room description:

NEW:
When the player carries an item and walks to a new room, the item travels with
them: carried things live inside the player's own container, so they move
wherever the player goes. And loose portable objects on the floor are listed
after the room description:

### 3. Scenery-not-listed paragraph (line 125) — prose
OLD:
Scenery is *not* listed this way — it's expected to be named in the room's
description prose, where it belongs.

NEW:
Scenery is *not* listed this way; it's expected to be named in the room's
description prose, where it belongs.

### 4. "Putting it together" scenery comment (line 148) — comment
OLD:
```typescript
// Scenery — fixed in place, examinable, mentioned in room prose.
const fence = world.createEntity('iron fence', EntityType.SCENERY);
```

NEW:
```typescript
// Scenery: fixed in place, examinable, mentioned in room prose.
const fence = world.createEntity('iron fence', EntityType.SCENERY);
```

### 5. "More scenery" rabbits comment (line 158) — comment
OLD:
```typescript
// More scenery — a pair of rabbits in the Petting Zoo, beside the goats.
const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
```

NEW:
```typescript
// More scenery: a pair of rabbits in the Petting Zoo, beside the goats.
const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
```

### 6. "A takeable item" comment (line 172) — comment
OLD:
```typescript
// A takeable item — no SceneryTrait, so it's portable by default.
const zooMap = world.createEntity('zoo map', EntityType.ITEM);
```

NEW:
```typescript
// A takeable item: no SceneryTrait, so it's portable by default.
const zooMap = world.createEntity('zoo map', EntityType.ITEM);
```

### 7. Animal feed label text (line 187) — in-world
OLD:
```typescript
    'A small brown paper bag of dried corn and pellets. The label reads ' +
    '"ZOO SNACKS — Safe for goats, rabbits, and birds." It rustles invitingly.',
```

NEW:
LEAVE (in-world copy) — or if converting:
```typescript
    'A small brown paper bag of dried corn and pellets. The label reads ' +
    '"ZOO SNACKS: Safe for goats, rabbits, and birds." It rustles invitingly.',
```

### 8. "Try it" transcript annotation (line 219) — transcript
OLD:
```
> take goats            Can't — they're scenery!
```

NEW:
```
> take goats            Can't: they're scenery!
```

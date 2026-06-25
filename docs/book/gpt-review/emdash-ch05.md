# Em-dash review — Chapter 05: Scenery & Portable Objects

> STATUS: integrated. Chapter 05 was reworked for ADR-189 (the `EntityType.SCENERY`
> type now carries `SceneryTrait`) in PR #169, and every em-dash was folded into
> that rework. The chapter is em-dash clean. Entries are kept for the record:
> #1 and #4 were SUPERSEDED (the surrounding text was rewritten, so the OLD passage
> no longer exists); the rest were APPLIED as the recast below.

### 1. "The label and the trait" paragraph — prose — SUPERSEDED
The "The label and the trait are two different things" section (with its
`... still pick up — almost never what you mean` em-dash) was replaced wholesale by
"When you still add SceneryTrait by hand" in the ADR-189 rework. The OLD paragraph
no longer exists in the chapter.

### 2. "What you get for free" paragraph — prose — REWRITTEN (not a colon swap)
OLD:
When the player carries an item and walks to a new room, the item travels with
them — carried things live inside the player's own container, so they move
wherever the player goes.

NEW:
When the player carries an item and walks to a new room, the item travels with
them. Carried things live with the player's default ability to 'contain' items,
so they go wherever the player goes.

### 3. Scenery-not-listed paragraph — prose — APPLIED
OLD:
Scenery is *not* listed this way — it's expected to be named in the room's
description prose, where it belongs.

NEW:
Scenery is *not* listed this way; it's expected to be named in the room's
description prose, where it belongs.

### 4. "Putting it together" scenery comment — comment — SUPERSEDED
The fence comment was rewritten by the rework to drop the now-redundant
`SceneryTrait` add, and reads `// Scenery: the SCENERY type fixes it in place,
examinable, mentioned in room prose.` (no em-dash).

### 5. "More scenery" rabbits comment — comment — APPLIED
OLD:
```typescript
// More scenery — a pair of rabbits in the Petting Zoo, beside the goats.
```

NEW:
```typescript
// More scenery: a pair of rabbits in the Petting Zoo, beside the goats.
```

### 6. "A takeable item" comment — comment — APPLIED
OLD:
```typescript
// A takeable item — no SceneryTrait, so it's portable by default.
```

NEW:
```typescript
// A takeable item: no SceneryTrait, so it's portable by default.
```

### 7. Animal feed label text — in-world — APPLIED (converted to colon)
OLD:
```typescript
    '"ZOO SNACKS — Safe for goats, rabbits, and birds." It rustles invitingly.',
```

NEW:
```typescript
    '"ZOO SNACKS: Safe for goats, rabbits, and birds." It rustles invitingly.',
```

### 8. "Try it" transcript annotation — transcript — APPLIED
OLD:
```
> take goats            Can't — they're scenery!
```

NEW:
```
> take goats            Can't: they're scenery!
```

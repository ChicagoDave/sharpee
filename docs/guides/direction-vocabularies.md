# Direction Vocabularies Guide

## Overview

Direction vocabularies control what words the player uses to navigate. By default, every room uses compass directions (north, south, east, west). But different environments call for different words — a ship uses fore, aft, port, and starboard. A cave system might only have in, out, up, and down.

Sharpee separates **direction constants** (abstract IDs like `Direction.NORTH`) from **direction words** (what the player types and the game displays). Room connections always use constants. Vocabularies control the presentation layer.

## How It Works

1. **Room exits use abstract direction IDs** — `Direction.NORTH`, `Direction.SOUTH`, etc.
2. **Vocabularies map those IDs to words** — display names and parser aliases
3. **Only directions in the vocabulary are accepted** — if the vocabulary omits northeast, the parser won't recognize it
4. **The parser adapts when the player moves** — crossing from ship to shore swaps accepted words automatically

## Built-in Vocabularies

### `'compass'` (default)

Standard IF directions. Used automatically if you don't set anything.

| Direction ID | Display | Player Types |
|---|---|---|
| NORTH | north | north, n |
| SOUTH | south | south, s |
| EAST | east | east, e |
| WEST | west | west, w |
| NORTHEAST | northeast | northeast, ne |
| NORTHWEST | northwest | northwest, nw |
| SOUTHEAST | southeast | southeast, se |
| SOUTHWEST | southwest | southwest, sw |
| UP | up | up, u |
| DOWN | down | down, d |
| IN | in | in, inside |
| OUT | out | out, outside |

### `'naval'`

Shipboard directions. No diagonals — ships don't have northeast.

| Direction ID | Display | Player Types |
|---|---|---|
| NORTH | fore | fore, f, forward, bow |
| SOUTH | aft | aft, a, back, stern |
| EAST | starboard | starboard, sb, right |
| WEST | port | port, p, left |
| UP | topside | topside, ts, up, u |
| DOWN | below decks | below, below decks, bd, down, d |
| IN | in | in, inside |
| OUT | out | out, outside |

### `'minimal'`

For caves, abstract spaces, and interiors. No compass directions at all.

| Direction ID | Display | Player Types |
|---|---|---|
| UP | up | up, u, climb |
| DOWN | down | down, d, descend |
| IN | in | in, inside, enter, deeper |
| OUT | out | out, outside, exit, back |

## Using a Built-in Vocabulary

Switch the active vocabulary through the direction registry on the world model:

```typescript
// In initializeWorld()
const directions = world.directions();

// Switch the whole story to naval directions
directions.useVocabulary('naval');

// Or minimal for a cave-crawl
directions.useVocabulary('minimal');
```

Room connections are unchanged — you still wire exits with `Direction.NORTH`, `Direction.SOUTH`, etc. The vocabulary only affects what the player sees and types.

```typescript
import { Direction } from '@sharpee/world-model';

// These connections work regardless of active vocabulary.
// With 'naval' active, the player types FORE instead of NORTH.
world.connectRooms(quarterdeck.id, forecastle.id, Direction.NORTH);
world.connectRooms(quarterdeck.id, cargoHold.id, Direction.DOWN);
world.connectRooms(quarterdeck.id, gunDeck.id, Direction.WEST);
```

Exit listings adapt automatically:
- With `'compass'`: "Exits: north, down, west"
- With `'naval'`: "Exits: fore, below decks, port"

## Creating Custom Vocabularies

Define a vocabulary for your story's fiction:

```typescript
const directions = world.directions();

directions.define({
  id: 'discworld',
  entries: {
    [Direction.NORTH]: { display: 'hubward',     words: ['hubward', 'hub'] },
    [Direction.SOUTH]: { display: 'rimward',     words: ['rimward', 'rim'] },
    [Direction.EAST]:  { display: 'turnwise',    words: ['turnwise', 'turn'] },
    [Direction.WEST]:  { display: 'widdershins', words: ['widdershins', 'widder'] },
    [Direction.UP]:    { display: 'up',           words: ['up', 'u'] },
    [Direction.DOWN]:  { display: 'down',         words: ['down', 'd'] },
  }
});

directions.useVocabulary('discworld');
```

Only include the directions your story needs. Omitted directions won't be recognized by the parser.

## Renaming Individual Directions

If you want compass directions but need to rename one or two:

```typescript
const directions = world.directions();

// Start with compass, then customize
directions.rename(Direction.UP, {
  display: 'ascend',
  words: ['ascend', 'up', 'u', 'climb']
});
```

This creates a custom copy of the active vocabulary — the original `'compass'` vocabulary is not mutated.

## Adding Aliases

Add extra words to an existing direction without replacing its current words:

```typescript
const directions = world.directions();

// Add "skyward" as an alias for UP alongside existing words
directions.alias(Direction.UP, {
  display: 'up',
  words: ['skyward', 'heavenward']
});
// Player can now type: up, u, skyward, heavenward
```

## Key Points

- **Room connections always use `Direction` constants** — vocabulary is presentation only
- **Changing vocabulary never breaks exits** — the abstract wiring is stable
- **The default is `'compass'`** — most stories never need to change it
- **Omitted directions are unavailable** — the `'minimal'` vocabulary rejects "north" entirely
- **Save/restore is unaffected** — saves use direction constants, not display names

## References

- ADR-143: Location-Relative Direction Vocabularies
- `packages/world-model/src/constants/directions.ts`: Direction constants, vocabulary interfaces, built-in vocabularies, and `DirectionVocabularyRegistry`

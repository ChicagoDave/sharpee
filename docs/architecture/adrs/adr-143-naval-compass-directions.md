# ADR-143: Location-Relative Direction Vocabularies

## Status: DRAFT

## Date: 2026-04-03

## Context

### The Problem

Sharpee's direction system uses 12 fixed directions with fixed English names. Every room in every story uses the same vocabulary: NORTH, SOUTH, EAST, WEST, and so on.

Real environments don't work this way. On a ship, people navigate by FORE, AFT, PORT, and STARBOARD — relative to the vessel. In a cave system, compass directions are meaningless — you go IN, OUT, UP, DOWN, or follow passages. In a building, you might navigate by floor (UP, DOWN) and room relationships (IN, OUT) with no compass at all. In a fantasy world, directions might be SUNWARD, NIGHTWARD, RIMWARD, HUBWARD.

The direction vocabulary should belong to the **location**, not the story. When the player crosses from ship to shore, the available directions and their names change — because the frame of reference changed.

### What Exists Today

The direction system is cleanly layered:

1. **Direction constants** (`world-model`): Language-agnostic IDs — `Direction.NORTH`, `Direction.SOUTH`, etc. Fixed set of 12.
2. **Parser mappings** (`parser-en-us`): English words → direction constants. Global, story-wide.
3. **Grammar** (`parser-en-us`): Direction aliases (`'north': ['north', 'n']`). Global, story-wide.
4. **Going action** (`stdlib`): Uses direction constants, doesn't care about words.
5. **Language layer** (`lang-en-us`): Direction constants → display strings for messages. Global, story-wide.
6. **Room exits** (`world-model`): `Partial<Record<DirectionType, IExitInfo>>` — direction-keyed.

The going action and room exits are direction-agnostic — they work with whatever constants are in the exit map. The problem is that the parser and language layer are globally fixed. There's no concept of "this region uses different direction words."

### Design Principles

**Directions are a vocabulary, and vocabularies belong to locations.** The platform defines a direction vocabulary interface. Different locations declare which vocabulary they use. The parser and language layer adapt when the player moves.

**Room connections use abstract direction IDs.** The vocabulary is a presentation and input layer, not a storage layer. The author wires exits with abstract constants; the vocabulary determines how they're named, parsed, and displayed.

**Vocabulary boundaries are explicit.** When the player crosses from one vocabulary to another (ship to shore), the transition is visible — available directions change, exit listings update, and the parser accepts different words.

## Decision

### 1. Direction Vocabulary

A direction vocabulary is a named mapping between abstract direction IDs and local presentation:

```typescript
interface DirectionVocabulary {
  id: string;
  directions: Record<string, DirectionEntry>;
}

interface DirectionEntry {
  directionId: string;           // abstract ID (e.g., 'north')
  display: string;               // what the game prints (e.g., 'fore')
  words: string[];               // what the parser accepts (e.g., ['fore', 'f', 'forward'])
}
```

### 2. Platform-Provided Vocabularies

The platform ships standard vocabularies:

**`'compass'`** (default):
| Direction ID | Display | Words |
|---|---|---|
| north | north | north, n |
| south | south | south, s |
| east | east | east, e |
| west | west | west, w |
| northeast | northeast | northeast, ne |
| northwest | northwest | northwest, nw |
| southeast | southeast | southeast, se |
| southwest | southwest | southwest, sw |
| up | up | up, u |
| down | down | down, d |
| in | in | in, inside, enter |
| out | out | out, outside, exit |

**`'naval'`**:
| Direction ID | Display | Words |
|---|---|---|
| north | fore | fore, f, forward, bow |
| south | aft | aft, a, back, stern |
| east | starboard | starboard, sb, right |
| west | port | port, p, left |
| up | topside | topside, ts, up, u |
| down | below decks | below, below decks, bd, down, d |
| in | in | in, inside, enter |
| out | out | out, outside, exit |

**`'minimal'`** (caves, abstract spaces):
| Direction ID | Display | Words |
|---|---|---|
| up | up | up, u, climb |
| down | down | down, d, descend |
| in | in | in, inside, enter, deeper |
| out | out | out, outside, exit, back |

Only the directions listed in the vocabulary are accepted by the parser in that location. A room using the `'minimal'` vocabulary won't accept NORTH — the parser treats it as an unknown command, not an invalid direction.

### 3. Regions Declare Vocabularies

Regions (or individual rooms) declare which vocabulary they use:

```typescript
helpers.region('ship')
  .directionVocabulary('naval')

helpers.region('port-town')
  .directionVocabulary('compass')

helpers.region('caves')
  .directionVocabulary('minimal')
```

If no vocabulary is set, the region inherits from its parent. If no parent sets one, the default is `'compass'`.

Individual rooms can override their region:

```typescript
helpers.room('Crow\'s Nest')
  .directionVocabulary('naval')       // inherits from ship region anyway
  .connectsTo('Main Deck', 'down')    // player types BELOW or DOWN
  .build();
```

### 4. Vocabulary Boundaries

When a room's exit leads to a room with a different vocabulary, the exit is a **vocabulary boundary**. The system handles this by presenting boundary exits in both the local vocabulary and as named destinations:

```typescript
helpers.room('Main Deck')              // naval vocabulary
  .connectsTo('Forecastle', 'north')   // displayed as "fore"
  .connectsTo('Cargo Hold', 'down')    // displayed as "below decks"
  .connectsTo('Dock', 'out')           // boundary — displayed as "ashore" or "out"
  .build();
```

**Threshold directions** at boundaries:

The author can define boundary-specific words for exits that cross vocabularies:

```typescript
helpers.room('Main Deck')
  .exit('out', 'Dock', { boundaryWords: ['ashore', 'disembark', 'off'] })
  .build();

helpers.room('Dock')
  .exit('in', 'Main Deck', { boundaryWords: ['aboard', 'embark', 'board'] })
  .build();
```

At the Main Deck, the player can type ASHORE or OUT. At the Dock, the player can type ABOARD or IN. The abstract direction IDs are still `'out'` and `'in'` — the boundary words are additional parser aliases scoped to that specific exit.

### 5. Parser Adaptation

When the player moves, the parser's accepted direction words update to match the current room's vocabulary. This happens in the going action's execute phase, after the move:

1. Player moves to new room
2. Engine resolves the room's effective vocabulary (room → region → default)
3. Parser direction mappings are swapped to the new vocabulary
4. Next player input is parsed against the new vocabulary

If the player types a word from the previous vocabulary (e.g., NORTH after boarding the ship), the parser doesn't recognize it. The game can optionally provide a hint: "On the ship, you navigate by fore, aft, port, and starboard."

### 6. Exit Listing

Room descriptions list exits using the local vocabulary's display names:

- On the ship: "Exits: fore, port, below decks"
- On land: "Exits: north, south, east"
- In the caves: "Exits: in, up"

Boundary exits use their boundary display name if defined, otherwise the local vocabulary's name for that direction.

### 7. Custom Vocabularies

Authors define story-specific vocabularies:

```typescript
world.directions().defineVocabulary({
  id: 'discworld',
  directions: {
    north: { display: 'hubward', words: ['hubward', 'hub'] },
    south: { display: 'rimward', words: ['rimward', 'rim'] },
    east: { display: 'turnwise', words: ['turnwise', 'turn'] },
    west: { display: 'widdershins', words: ['widdershins', 'widder'] },
    up: { display: 'up', words: ['up', 'u'] },
    down: { display: 'down', words: ['down', 'd'] },
  }
});

helpers.region('ankh-morpork')
  .directionVocabulary('discworld');
```

Only directions included in the vocabulary are available. If the author omits `northeast` from their vocabulary, diagonal movement doesn't exist in that region.

### 8. Room Connections Are Unchanged

The author still wires exits using abstract direction IDs:

```typescript
helpers.room('Quarterdeck')
  .connectsTo('Forecastle', 'north')    // player types FORE
  .connectsTo('Cargo Hold', 'down')     // player types BELOW DECKS
  .connectsTo('Gun Deck', 'west')       // player types PORT
  .build();
```

The vocabulary determines how these are presented and parsed. The connections themselves are stable — changing vocabulary doesn't break exits.

## Consequences

### Positive

- Direction vocabulary belongs to the location — different regions naturally present different direction systems
- Authors wire exits with stable abstract IDs — vocabulary changes don't break room connections
- Parser adapts automatically when the player moves between vocabularies
- Custom vocabularies support any fiction (naval, fantasy, abstract)
- Boundary handling makes transitions between vocabularies explicit and navigable
- The going action is unchanged — it only sees direction constants

### Negative

- Parser direction swapping on room change adds a small processing step per move
- Authors must think about which vocabulary each region uses (mitigated: default is `'compass'`, most stories never change it)
- Testing must cover vocabulary boundaries — a room reachable from two different vocabulary regions needs both sets of words to work

### Neutral

- Save/restore unaffected — saves use direction constants, not display names
- Existing stories are unchanged — `'compass'` is the default, all 12 directions work as before
- The going action's four-phase structure is unchanged

## Implementation

### Platform Changes

1. **`world-model`**: Add `DirectionVocabulary` interface and `DirectionVocabularyRegistry`. Add optional `directionVocabulary` field to `RoomTrait` and region configuration. Pre-register `'compass'`, `'naval'`, `'minimal'` vocabularies.
2. **`stdlib`**: Going action's execute phase triggers vocabulary swap on the parser after a successful move. Exit listing in room descriptions uses the local vocabulary's display names.
3. **`parser-en-us`**: Add `setActiveVocabulary(vocab)` method that rebuilds direction word/abbreviation maps from the given vocabulary. Called by the going action after each move.
4. **`lang-en-us`**: Direction display names pulled from active vocabulary rather than static mapping.
5. **`helpers`**: Add `.directionVocabulary()` to region and room builders. Add `.exit()` variant with `boundaryWords` option.

### Story-Level

1. Define custom vocabularies if needed (most stories skip this, use platform-provided sets)
2. Assign vocabularies to regions
3. Define boundary words for exits that cross vocabularies
4. Wire room exits with abstract direction IDs as usual

## Open Questions

1. **Should the parser provide a hint when the player uses words from the wrong vocabulary?** "On the ship, you navigate by fore, aft, port, and starboard." This is helpful but potentially annoying on repeated mistakes. Likely author-configurable — on by default, suppressible per region.

2. **Should vocabularies support direction IDs beyond the standard 12?** A space station might need SPINWARD/ANTISPINWARD as genuinely new directions, not remappings of existing ones. This ADR covers remapping only. New direction IDs would require opening the `DirectionType` union — a separate concern.

## References

- ADR-087: Action-Centric Grammar (`.directions()` builder method)
- ADR-113: Map Hints (exit positioning for visual maps — vocabulary display names should propagate to map labels)
- `packages/world-model/src/constants/directions.ts`: Direction constants and opposites
- `packages/parser-en-us/src/direction-mappings.ts`: English word → direction constant mappings
- `packages/parser-en-us/src/grammar.ts`: Direction grammar patterns

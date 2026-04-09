# ADR-143: Location-Relative Direction Vocabularies

## Status: WITHDRAWN

> **Reverted 2026-04-09.** Partially implemented, then removed. The implementation violated language layer separation (English strings in world-model) and no story consumed the feature. Will re-implement from scratch with proper language layer separation when a story needs it.

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

### 1. Direction Vocabulary (Semantic Layer)

A direction vocabulary defines a named mapping between abstract direction IDs and semantic labels. The semantic labels are **not player-facing words** — they are keys that the language layer resolves to locale-specific text.

```typescript
// world-model — language-agnostic
interface DirectionVocabulary {
  id: string;
  entries: Partial<Record<DirectionType, DirectionSemanticEntry>>;
}

interface DirectionSemanticEntry {
  /** Semantic label — resolved to display text by the language layer */
  labelId: string;
  /** Fallback display (used if language layer has no override) */
  fallbackDisplay: string;
}
```

The language layer provides locale-specific words and display names:

```typescript
// lang-en-us (or lang-fr, lang-de, etc.)
interface DirectionLocaleEntry {
  /** What the game prints: "fore", "proue" */
  display: string;
  /** What the parser accepts: ['fore', 'f', 'forward', 'bow'] */
  words: string[];
}

// Registered per vocabulary per locale
interface DirectionLanguageMap {
  vocabularyId: string;
  directions: Partial<Record<DirectionType, DirectionLocaleEntry>>;
}
```

### 2. Platform-Provided Vocabularies

**Semantic definitions** (world-model, language-agnostic):

| Vocabulary | Direction ID | Semantic Label |
|---|---|---|
| compass | NORTH | direction.compass.north |
| compass | SOUTH | direction.compass.south |
| compass | EAST | direction.compass.east |
| compass | WEST | direction.compass.west |
| compass | UP | direction.compass.up |
| compass | DOWN | direction.compass.down |
| naval | NORTH | direction.naval.forward |
| naval | SOUTH | direction.naval.aft |
| naval | EAST | direction.naval.starboard |
| naval | WEST | direction.naval.port |
| naval | UP | direction.naval.topside |
| naval | DOWN | direction.naval.below |
| minimal | UP | direction.minimal.up |
| minimal | DOWN | direction.minimal.down |
| minimal | IN | direction.minimal.in |
| minimal | OUT | direction.minimal.out |

**English locale entries** (lang-en-us):

| Vocabulary | Direction ID | Display | Words |
|---|---|---|---|
| compass | NORTH | north | north, n |
| compass | SOUTH | south | south, s |
| compass | EAST | east | east, e |
| compass | WEST | west | west, w |
| compass | UP | up | up, u |
| compass | DOWN | down | down, d |
| compass | IN | in | in, inside, enter |
| compass | OUT | out | out, outside, exit |
| naval | NORTH | fore | fore, f, forward, bow |
| naval | SOUTH | aft | aft, a, back, stern |
| naval | EAST | starboard | starboard, sb, right |
| naval | WEST | port | port, p, left |
| naval | UP | topside | topside, ts, up, u |
| naval | DOWN | below decks | below, below decks, bd, down, d |
| naval | IN | in | in, inside |
| naval | OUT | out | out, outside |
| minimal | UP | up | up, u, climb |
| minimal | DOWN | down | down, d, descend |
| minimal | IN | in | in, inside, enter, deeper |
| minimal | OUT | out | out, outside, exit, back |

**French locale entries** (lang-fr — example):

| Vocabulary | Direction ID | Display | Words |
|---|---|---|---|
| naval | NORTH | proue | proue, pr, avant |
| naval | SOUTH | poupe | poupe, pp, arriere |
| naval | EAST | tribord | tribord, tb, droite |
| naval | WEST | babord | babord, bb, gauche |

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

**Parser update contract** — when vocabulary changes, the parser must update three things:
1. **Direction mappings** (`setActiveVocabulary`): word → direction constant lookup
2. **Grammar patterns** (`replaceDirections`): bare direction commands in the grammar engine
3. **Tokenizer vocabulary registry** (`registerDirections`): token tagging so `PartOfSpeech.DIRECTION` is assigned to the new words

All three must be updated atomically. Missing any one causes silent failures — the grammar matches but the direction can't be extracted (missing #3), or the direction is resolved but the grammar doesn't match (missing #2).

### 6. Exit Listing

Room descriptions list exits using the local vocabulary's display names:

- On the ship: "Exits: fore, port, below decks"
- On land: "Exits: north, south, east"
- In the caves: "Exits: in, up"

Boundary exits use their boundary display name if defined, otherwise the local vocabulary's name for that direction.

### 7. Custom Vocabularies

Authors define story-specific vocabularies:

```typescript
// Semantic layer — world-model
world.directions().defineVocabulary({
  id: 'discworld',
  entries: {
    [Direction.NORTH]: { labelId: 'direction.discworld.hubward', fallbackDisplay: 'hubward' },
    [Direction.SOUTH]: { labelId: 'direction.discworld.rimward', fallbackDisplay: 'rimward' },
    [Direction.EAST]:  { labelId: 'direction.discworld.turnwise', fallbackDisplay: 'turnwise' },
    [Direction.WEST]:  { labelId: 'direction.discworld.widdershins', fallbackDisplay: 'widdershins' },
    [Direction.UP]:    { labelId: 'direction.discworld.up', fallbackDisplay: 'up' },
    [Direction.DOWN]:  { labelId: 'direction.discworld.down', fallbackDisplay: 'down' },
  }
});

// Language layer — in extendLanguage()
language.registerDirectionWords('discworld', {
  [Direction.NORTH]: { display: 'hubward', words: ['hubward', 'hub'] },
  [Direction.SOUTH]: { display: 'rimward', words: ['rimward', 'rim'] },
  [Direction.EAST]:  { display: 'turnwise', words: ['turnwise', 'turn'] },
  [Direction.WEST]:  { display: 'widdershins', words: ['widdershins', 'widder'] },
  [Direction.UP]:    { display: 'up', words: ['up', 'u'] },
  [Direction.DOWN]:  { display: 'down', words: ['down', 'd'] },
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
- Language layer separation is respected — world-model defines semantics, lang-{locale} provides words

### Negative

- Parser direction swapping on room change adds a small processing step per move
- Authors must think about which vocabulary each region uses (mitigated: default is `'compass'`, most stories never change it)
- Testing must cover vocabulary boundaries — a room reachable from two different vocabulary regions needs both sets of words to work
- Language layer must register direction words for every vocabulary it supports — more registration calls for multi-vocabulary stories

### Neutral

- Save/restore unaffected — saves use direction constants, not display names
- Existing stories are unchanged — `'compass'` is the default, all 12 directions work as before
- The going action's four-phase structure is unchanged

## Implementation

### What's Done (Partial — Does Not Match This ADR)

The current implementation shipped with English words baked into `DirectionVocabulary` in world-model, bypassing the language layer. This works for English-only stories but violates the language layer separation principle and cannot support non-English locales.

**Implemented (working):**
- `DirectionVocabularyRegistry` in world-model with compass/naval/minimal vocabularies
- `useVocabulary()` and `define()` for switching and registering custom vocabularies
- `setActiveVocabulary()` in parser-en-us for rebuilding direction word maps
- `replaceDirections()` in grammar engine for updating bare direction patterns
- Vocabulary change listener from world-model to parser

**Implemented (fixed 2026-04-09):**
- Tokenizer vocabulary registry update when direction vocabulary changes
- Removed hardcoded compass word fallback in `convertGrammarMatch()`

**Not yet implemented:**
- Language layer separation (this ADR's sections 1, 2, 7)
- `DirectionSemanticEntry` with `labelId` instead of embedded words
- `language.registerDirectionWords()` API
- Region-level vocabulary assignment (section 3)
- Vocabulary boundary handling (section 4)
- Boundary-specific words (`boundaryWords` option on exits)
- Parser hint when player uses wrong vocabulary's words (section 5)
- Exit listing using local vocabulary display names (section 6)
- End-to-end tests: `parse("aft")` after `useVocabulary('naval')` → correct direction

### Remaining Platform Changes

1. **`world-model`**: Split `DirectionVocabulary` — replace `words: string[]` in `DirectionEntry` with `labelId: string` semantic key. Keep `fallbackDisplay` for stories that don't use a language layer.
2. **`lang-en-us`**: Add `registerDirectionWords(vocabId, map)` API. Register English words for compass, naval, and minimal vocabularies. Parser pulls words from the language layer instead of from the vocabulary definition.
3. **`parser-en-us`**: `setDirectionVocabulary()` resolves words from the language layer (via the language provider) instead of from the vocabulary's `words` field. The three-step update contract (mappings, grammar, registry) remains the same.
4. **`stdlib`**: Going action's execute phase triggers vocabulary swap on the parser after a successful move. Exit listing in room descriptions uses the local vocabulary's display names.
5. **`helpers`**: Add `.directionVocabulary()` to region and room builders. Add `.exit()` variant with `boundaryWords` option.

### Story-Level

1. Define custom vocabularies if needed (most stories skip this, use platform-provided sets)
2. Register locale-specific direction words in `extendLanguage()` for custom vocabularies
3. Assign vocabularies to regions
4. Define boundary words for exits that cross vocabularies
5. Wire room exits with abstract direction IDs as usual

## Open Questions

1. **Should the parser provide a hint when the player uses words from the wrong vocabulary?** "On the ship, you navigate by fore, aft, port, and starboard." This is helpful but potentially annoying on repeated mistakes. Likely author-configurable — on by default, suppressible per region.

2. **Should vocabularies support direction IDs beyond the standard 12?** A space station might need SPINWARD/ANTISPINWARD as genuinely new directions, not remappings of existing ones. This ADR covers remapping only. New direction IDs would require opening the `DirectionType` union — a separate concern.

3. **Backward compatibility with the current `words` field.** When the language layer separation ships, existing stories that define vocabularies with inline `words` should continue to work. The `words` field becomes the fallback when no language layer entry exists — same role as `fallbackDisplay` for display names.

## References

- ADR-087: Action-Centric Grammar (`.directions()` builder method)
- ADR-113: Map Hints (exit positioning for visual maps — vocabulary display names should propagate to map labels)
- `packages/world-model/src/constants/directions.ts`: Direction constants and opposites
- `packages/parser-en-us/src/direction-mappings.ts`: English word → direction constant mappings
- `packages/parser-en-us/src/grammar.ts`: Direction grammar patterns

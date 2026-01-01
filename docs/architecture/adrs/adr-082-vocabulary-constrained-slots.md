# ADR-082: Extended Grammar Slot Types

**Status:** Accepted (Phases 1-3 implemented)
**Date:** 2026-01-01
**Deciders:** ChicagoDave, Claude
**Context:** Comprehensive IF grammar requirements based on analysis of 25+ games across 40 years

## Problem

The current grammar system supports only three slot types:
- **ENTITY** - resolves to a game entity
- **TEXT** - captures a single raw word
- **TEXT_GREEDY** - captures words until a delimiter

This is insufficient for the full range of interactive fiction command patterns. Analysis of games from Zork (1980) through modern works like Hadean Lands (2014) and Counterfeit Monkey (2012) reveals many command patterns that require typed slot values beyond simple entity resolution.

### Patterns That Cannot Be Expressed

| Pattern | Example | Problem |
|---------|---------|---------|
| Numeric dials | `turn dial to 29` | No numeric slot type |
| Vocabulary constraints | `push red panel` | No adjective/noun validation |
| Directional actions | `pace 5 north` | No direction slot type |
| Time expressions | `wait until 10:40` | No time slot type |
| Ordinal selection | `take first key` | No ordinal slot type |
| Quoted text | `write "hello" on cube` | No quoted text capture |
| Conversation topics | `ask wizard about curse` | No topic slot type |

## Research Summary

### Games Analyzed

**Infocom Era (1980-1989):**
Zork I-III, Enchanter, Sorcerer, Spellbreaker, Hitchhiker's Guide, Trinity, Planetfall, Stationfall, Suspended, A Mind Forever Voyaging, Leather Goddesses of Phobos, Deadline, Witness, Nord and Bert, Bureaucracy

**Inform/TADS Era (1993-2005):**
Curses, Anchorhead, Photopia, Savoir-Faire, Shade, So Far, Babel

**Modern Era (2006-present):**
Blue Lacuna, Hadean Lands, Counterfeit Monkey, Cragne Manor

### Pattern Categories Discovered

1. **Vocabulary-Constrained** - adjective, noun, direction slots
2. **Numeric** - integer, ordinal, time values
3. **Text Capture** - raw, quoted, topic-style
4. **Magic Systems** - spell names, ritual invocations
5. **Delegation** - NPC command embedding
6. **Meta-Commands** - recall, find, go-to

## Proposed Solution

Extend `SlotType` enum with new typed slots and add corresponding builder methods.

### SlotType Enum

```typescript
export enum SlotType {
  // Existing
  ENTITY = 'entity',
  TEXT = 'text',
  TEXT_GREEDY = 'text_greedy',
  INSTRUMENT = 'instrument',

  // Vocabulary-Constrained (NEW)
  ADJECTIVE = 'adjective',
  NOUN = 'noun',
  DIRECTION = 'direction',

  // Typed Values (NEW)
  NUMBER = 'number',
  ORDINAL = 'ordinal',
  TIME = 'time',

  // Text Variants (NEW)
  QUOTED_TEXT = 'quoted_text',
  TOPIC = 'topic'
}
```

### PatternBuilder Methods

```typescript
interface PatternBuilder {
  // Existing
  text(slot: string): PatternBuilder;
  instrument(slot: string): PatternBuilder;
  where(slot: string, constraint: Constraint): PatternBuilder;

  // Vocabulary-Constrained (NEW)
  adjective(slot: string): PatternBuilder;
  noun(slot: string): PatternBuilder;
  direction(slot: string): PatternBuilder;

  // Typed Values (NEW)
  number(slot: string): PatternBuilder;
  ordinal(slot: string): PatternBuilder;
  time(slot: string): PatternBuilder;

  // Text Variants (NEW)
  quotedText(slot: string): PatternBuilder;
  topic(slot: string): PatternBuilder;
}
```

### IParsedCommand Extension

```typescript
interface IParsedCommand {
  // Existing
  textSlots?: Map<string, string>;
  instrument?: EntityReference;

  // NEW: Typed slot values
  typedSlots?: Map<string, TypedSlotValue>;
}

type TypedSlotValue =
  | { type: 'adjective' | 'noun'; word: string }
  | { type: 'direction'; direction: Direction }
  | { type: 'number'; value: number }
  | { type: 'ordinal'; value: number; word: string }
  | { type: 'time'; hours: number; minutes: number }
  | { type: 'quoted_text'; text: string }
  | { type: 'topic'; words: string[] };
```

## Slot Type Specifications

### 1. ADJECTIVE

Matches a single word from the registered adjective vocabulary.

```typescript
// Registration
language.addAdjectives(['red', 'yellow', 'mahogany', 'pine', 'large', 'small']);

// Pattern
grammar.define('push :color panel').adjective('color').mapsTo('push_panel');

// Matches: push RED panel, push YELLOW panel
// Rejects: push BANANA panel (not in vocabulary)
```

### 2. NOUN

Matches a single word from the registered noun vocabulary.

```typescript
// Registration
language.addNouns(['panel', 'wall', 'button', 'lever']);

// Pattern
grammar.define('push :surface').noun('surface').mapsTo('push_surface');
```

### 3. DIRECTION

Matches cardinal directions, ordinal directions, and special directions.

```typescript
// Built-in vocabulary
const directions = [
  'north', 'south', 'east', 'west',
  'northeast', 'northwest', 'southeast', 'southwest',
  'up', 'down', 'in', 'out',
  'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd'
];

// Pattern
grammar.define('push :entity :dir').direction('dir').mapsTo('push_direction');

// Matches: push boulder EAST, push cart NORTH
```

### 4. NUMBER

Matches integer values (digits or number words).

```typescript
// Built-in number words: one, two, three, ... twenty
// Also matches: 1, 2, 3, 42, 100, etc.

// Pattern
grammar.define('turn dial to :n').number('n').mapsTo('set_dial');
grammar.define('wait :n').number('n').mapsTo('wait_turns');
grammar.define('set slider to :value').number('value').mapsTo('set_slider');

// Matches: turn dial to 29, wait 5, set slider to 414
```

### 5. ORDINAL

Matches ordinal values (first, second, 1st, 2nd, etc.).

```typescript
// Built-in: first, second, third, ... twentieth
// Also: 1st, 2nd, 3rd, 4th, etc.

// Pattern
grammar.define('take :ord :entity').ordinal('ord').mapsTo('take_nth');
grammar.define('push :ord button').ordinal('ord').mapsTo('push_nth_button');

// Matches: take FIRST key, push THIRD button, take 2ND coin
```

### 6. TIME

Matches time expressions in HH:MM format or relative time.

```typescript
// Matches: 10:40, 6:00, 23:59
// Also: 30 minutes, 2 hours

// Pattern
grammar.define('wait until :t').time('t').mapsTo('wait_until');
grammar.define('set alarm to :t').time('t').mapsTo('set_alarm');

// Matches: wait until 10:40, set alarm to 6:00
```

### 7. QUOTED_TEXT

Matches text enclosed in double quotes.

```typescript
// Pattern
grammar.define('write ":msg" on :entity').quotedText('msg').mapsTo('inscribe');
grammar.define('say ":words"').quotedText('words').mapsTo('speak');
grammar.define('carve ":text" on :entity').quotedText('text').mapsTo('carve');

// Matches: write "EARTH" on cube, say "hello there"
```

### 8. TOPIC

Matches one or more words as a conversation topic (fuzzy matching).

```typescript
// Pattern
grammar.define('ask :entity about :topic').topic('topic').mapsTo('ask_about');
grammar.define('tell :entity about :topic').topic('topic').mapsTo('tell_about');
grammar.define('recall :topic').topic('topic').mapsTo('recall');

// Matches: ask wizard about THE CURSE, tell guard about robbery
// Topic captures: ['the', 'curse'] or ['robbery']
```

## Usage Examples

### Dungeo Inside Mirror Puzzle

```typescript
// Register vocabulary
language.addAdjectives(['red', 'yellow', 'mahogany', 'pine']);
language.addNouns(['panel', 'wall']);

// Define patterns
grammar.define('push :color :surface')
  .adjective('color')
  .noun('surface')
  .mapsTo('dungeo.action.push_panel')
  .withPriority(170);

grammar.define('push :color')
  .adjective('color')
  .mapsTo('dungeo.action.push_panel')
  .withPriority(165);
```

### Babel Radiation Chamber

```typescript
grammar.define('set dial to :n')
  .number('n')
  .mapsTo('set_dial')
  .withPriority(160);

grammar.define('set :color slider to :n')
  .adjective('color')
  .number('n')
  .mapsTo('set_slider')
  .withPriority(165);
```

### Spellbreaker Cube Inscription

```typescript
grammar.define('write ":text" on :entity')
  .quotedText('text')
  .mapsTo('inscribe')
  .withPriority(160);

grammar.define('label :entity ":text"')
  .quotedText('text')
  .mapsTo('inscribe')
  .withPriority(155);
```

### Curses Measured Movement

```typescript
grammar.define('pace :n :dir')
  .number('n')
  .direction('dir')
  .mapsTo('pace')
  .withPriority(160);
```

### Suspended Robot Commands

```typescript
// NPC delegation uses existing TEXT_GREEDY for the command portion
grammar.define(':npc, :command...')
  .entity('npc')
  .mapsTo('delegate_command')
  .withPriority(200);
```

## Implementation Notes

### Vocabulary Registration

Stories register vocabulary through the language provider:

```typescript
interface ParserLanguageProvider {
  // Existing
  getPrepositions(): string[];

  // NEW
  getAdjectives(): string[];
  getNouns(): string[];
  addAdjectives(words: string[]): void;
  addNouns(words: string[]): void;
}
```

### Grammar Engine Changes

The grammar engine needs new consumption functions:

```typescript
function consumeTypedSlot(
  tokens: string[],
  position: number,
  slotType: SlotType,
  languageProvider: ParserLanguageProvider
): TypedSlotMatch | null {
  switch (slotType) {
    case SlotType.NUMBER:
      return consumeNumber(tokens, position);
    case SlotType.ORDINAL:
      return consumeOrdinal(tokens, position);
    case SlotType.TIME:
      return consumeTime(tokens, position);
    case SlotType.DIRECTION:
      return consumeDirection(tokens, position);
    case SlotType.ADJECTIVE:
      return consumeVocabulary(tokens, position, languageProvider.getAdjectives());
    case SlotType.NOUN:
      return consumeVocabulary(tokens, position, languageProvider.getNouns());
    case SlotType.QUOTED_TEXT:
      return consumeQuotedText(tokens, position);
    case SlotType.TOPIC:
      return consumeTopic(tokens, position);
    default:
      return null;
  }
}
```

### Number Parsing

```typescript
const numberWords: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
};

function consumeNumber(tokens: string[], position: number): NumberMatch | null {
  const token = tokens[position]?.toLowerCase();
  if (!token) return null;

  // Check word form
  if (token in numberWords) {
    return { value: numberWords[token], consumed: 1 };
  }

  // Check digit form
  if (/^\d+$/.test(token)) {
    return { value: parseInt(token, 10), consumed: 1 };
  }

  return null;
}
```

## Alternatives Considered

### 1. Regex-Based Patterns

Allow arbitrary regex in patterns. Rejected because:
- Too complex for story authors
- Hard to provide good error messages
- Doesn't integrate with vocabulary system

### 2. Custom Slot Types

Let stories define their own slot types. Rejected because:
- Adds significant complexity
- The built-in types cover 95%+ of use cases
- Can be added later if needed

### 3. Entity Tags Instead of Vocabulary

Tag entities with "is_adjective", "is_noun". Rejected because:
- Conflates entity system with grammar system
- Creates entities that aren't really game objects
- Vocabulary words often aren't entities at all

## Decision

Implement the extended slot type system with vocabulary-constrained, numeric, and text variant slots.

## Consequences

### Positive

- Enables the full range of classic IF command patterns
- Clean type system for slot values
- Stories can express complex grammars declaratively
- Vocabulary validation prevents nonsense inputs
- Numbers, times, and ordinals are properly typed
- Explicit vocabulary registration makes contracts clear and discoverable
- Enables tooling support (autocomplete, validation at load time)

### Negative

- Grammar engine becomes more complex
- Multiple slot type systems to understand
- Migration path for existing patterns

## Implementation Phases

1. **Phase 1:** NUMBER, ORDINAL slots (highest priority for puzzles)
2. **Phase 2:** ADJECTIVE, NOUN, DIRECTION vocabulary slots
3. **Phase 3:** QUOTED_TEXT, TIME slots
4. **Phase 4:** TOPIC slot (conversation systems)

## References

- [Grammar Pattern Catalog](/docs/work/dungeo/context/2026-01-01-1314-grammar-pattern-catalog.md)
- [Key & Compass Walkthroughs](https://plover.net/~davidw/sol/)
- [Inform 7 Understanding](https://ganelson.github.io/inform-website/book/WI_15_16.html)

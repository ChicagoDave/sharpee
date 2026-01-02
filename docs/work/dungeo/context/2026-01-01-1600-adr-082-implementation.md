# Work Summary: ADR-082 Extended Grammar Slot Types Implementation

**Date:** 2026-01-01 16:00
**Branch:** vocabulary-slots
**Status:** Phases 1-3 complete, tests passing

## What Was Accomplished

Implemented ADR-082 "Extended Grammar Slot Types" with careful, elegant design:

### 1. SlotType Enum Extensions (`grammar-builder.ts`)

Added 8 new slot types:
- **Typed Values:** NUMBER, ORDINAL, TIME
- **Vocabulary-Constrained:** DIRECTION, ADJECTIVE, NOUN
- **Text Variants:** QUOTED_TEXT, TOPIC

### 2. TypedSlotValue Type (`grammar-builder.ts`)

Union type for typed slot matches:
```typescript
type TypedSlotValue =
  | { type: 'adjective'; word: string }
  | { type: 'noun'; word: string }
  | { type: 'direction'; direction: string; canonical: string }
  | { type: 'number'; value: number; word: string }
  | { type: 'ordinal'; value: number; word: string }
  | { type: 'time'; hours: number; minutes: number; text: string }
  | { type: 'quoted_text'; text: string }
  | { type: 'topic'; words: string[] };
```

### 3. PatternBuilder Interface Methods (`grammar-builder.ts`)

Added 8 new methods: `number()`, `ordinal()`, `time()`, `direction()`, `adjective()`, `noun()`, `quotedText()`, `topic()`

### 4. GrammarEngine Implementation (`grammar-engine.ts`)

All 8 methods implemented in `createBuilder()`.

### 5. English Grammar Engine (`english-grammar-engine.ts`)

Consumption functions for each slot type:
- `consumeNumberSlot()` - digits (29, 100) or words (one, twenty)
- `consumeOrdinalSlot()` - words (first, second) or suffixed (1st, 2nd, 3rd)
- `consumeTimeSlot()` - HH:MM format (10:40, 6:00)
- `consumeDirectionSlot()` - built-in vocabulary (n, north, ne, up, etc.)
- `consumeAdjectiveSlot()` - story-registered vocabulary
- `consumeNounSlot()` - story-registered vocabulary
- `consumeQuotedTextSlot()` - text in double quotes
- `consumeTopicSlot()` - words until next pattern element

Static vocabularies:
- NUMBER_WORDS: zero through twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, hundred
- ORDINAL_WORDS: first through twentieth
- DIRECTIONS: all cardinal, ordinal, vertical, and abbreviated directions

Static extraction helpers:
- `extractNumberValue()` - get number from slot match
- `extractOrdinalValue()` - get ordinal from slot match
- `extractDirectionValue()` - get canonical direction
- `extractTimeValue()` - get hours/minutes object

### 6. IParsedCommand Extension (`parsed-command.ts`)

Added `typedSlots?: Map<string, TypedSlotValue>` field.

### 7. Tests (`adr-082-typed-slots.test.ts`)

20 tests covering all slot types:
- NUMBER: digit matching, word matching, rejection of non-numbers, value extraction
- ORDINAL: word matching, suffixed ordinals (1st, 2nd, etc.), value extraction
- TIME: HH:MM format matching, component extraction, rejection of invalid formats
- DIRECTION: cardinals, abbreviations, ordinals (ne, sw), verticals (up, down)
- QUOTED_TEXT: single-token quoted text
- TOPIC: multi-word consumption with delimiters
- Combined: multiple typed slots in single pattern

## Files Changed

- `packages/if-domain/src/grammar/grammar-builder.ts` - SlotType enum, TypedSlotValue, PatternBuilder methods
- `packages/if-domain/src/grammar/grammar-engine.ts` - PatternBuilder implementation
- `packages/parser-en-us/src/english-grammar-engine.ts` - Consumption functions, vocabularies, helpers
- `packages/world-model/src/commands/parsed-command.ts` - typedSlots field
- `packages/parser-en-us/tests/adr-082-typed-slots.test.ts` - 20 tests
- `docs/architecture/adrs/adr-082-vocabulary-constrained-slots.md` - Status updated

## Design Principles Applied

1. **Thought and elegance over speed** - Each slot type carefully designed
2. **Built-in vocabularies for universal concepts** - Numbers, ordinals, directions
3. **Story registration for game-specific vocabulary** - Adjectives and nouns
4. **Static helper functions** - Extract typed values without instance reference
5. **Consistent API** - All builder methods follow same pattern

## Next Steps (Phase 4)

1. Implement vocabulary provider interface on WorldModel
2. Add `language.addAdjectives()` and `language.addNouns()` to language layer
3. Wire up ADJECTIVE and NOUN slots to vocabulary provider
4. Test with Dungeo Inside Mirror puzzle

## Usage Example

```typescript
// Dungeo dial puzzle
grammar
  .define('turn dial to :n')
  .number('n')
  .mapsTo('set_dial')
  .build();

// Curses measured movement
grammar
  .define('pace :n :dir')
  .number('n')
  .direction('dir')
  .mapsTo('pace')
  .build();

// Inside Mirror (once vocabulary is wired)
grammar
  .define('push :color panel')
  .adjective('color')
  .mapsTo('push_panel')
  .build();
```

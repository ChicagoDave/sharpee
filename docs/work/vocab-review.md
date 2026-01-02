# ADR-082 Vocabulary Slots Implementation Review

**Date:** 2026-01-01
**Branch:** vocabulary-slots
**Status:** Implementation complete, ready for merge

## Work Summary

### What Was Implemented

ADR-082 "Extended Grammar Slot Types" adds 8 new slot types to the grammar system, enabling typed value parsing beyond simple entity resolution.

#### New Slot Types

| Slot Type | Purpose | Example Pattern | Example Input |
|-----------|---------|-----------------|---------------|
| `NUMBER` | Integer values | `turn dial to :n` | `turn dial to 29` or `wait five` |
| `ORDINAL` | Ordinal positions | `take :ord key` | `take first key` or `push 3rd button` |
| `TIME` | Time expressions | `wait until :t` | `wait until 10:40` |
| `DIRECTION` | Cardinal/ordinal directions | `push :entity :dir` | `push boulder north` |
| `ADJECTIVE` | Story-registered adjectives | `push :color panel` | `push red panel` |
| `NOUN` | Story-registered nouns | `push :color :surface` | `push red wall` |
| `QUOTED_TEXT` | Quoted strings | `write :msg on :entity` | `write "EARTH" on cube` |
| `TOPIC` | Multi-word topics | `ask :entity about :topic` | `ask wizard about the curse` |

#### Files Changed

**Core Grammar System (`if-domain`):**
- `grammar-builder.ts` - SlotType enum, TypedSlotValue type, PatternBuilder interface

**Grammar Engine (`if-domain`):**
- `grammar-engine.ts` - PatternBuilder method implementations

**English Parser (`parser-en-us`):**
- `english-grammar-engine.ts` - Consumption functions for all 8 slot types
- `package.json` - Added `@sharpee/lang-en-us` dependency

**Language Layer (`lang-en-us`):**
- `data/words.ts` - Added `cardinalNumbers`, `ordinalNumbers`, `directionMap`
- `index.ts` - Exported new vocabulary maps

**World Model:**
- `parsed-command.ts` - Added `typedSlots` field to `IParsedCommand`

#### Tests

20 new tests in `adr-082-typed-slots.test.ts` covering:
- NUMBER: digit matching, word matching, rejection, value extraction
- ORDINAL: word matching, suffixed (1st, 2nd), value extraction
- TIME: HH:MM format, component extraction, invalid rejection
- DIRECTION: cardinals, abbreviations, ordinals, verticals
- QUOTED_TEXT: single-token quoted text
- TOPIC: multi-word consumption with delimiters
- Combined patterns with multiple typed slots

---

## Issues Encountered

### 1. Vocabulary Duplication (Fixed)

**Problem:** Initial implementation duplicated vocabulary as static class members in `EnglishGrammarEngine` instead of using the existing vocabulary in `lang-en-us/data/words.ts`.

**Resolution:** Refactored to:
- Add `cardinalNumbers`, `ordinalNumbers`, `directionMap` to `words.ts`
- Export from `lang-en-us` index
- Import in `parser-en-us` (added as dependency)
- Remove duplicate statics from `EnglishGrammarEngine`

### 2. ADJECTIVE/NOUN Slots Not Yet Wired

**Problem:** ADJECTIVE and NOUN slots require vocabulary registration via a `VocabularyProvider` interface on WorldModel. This interface doesn't exist yet.

**Current State:** The consumption functions exist but return `null` when no vocabulary provider is available. Stories cannot use these slots until Phase 4 is implemented.

**Next Steps:**
1. Add `VocabularyProvider` interface to world-model
2. Implement `getVocabularyProvider()` on WorldModel
3. Add `addAdjectives()` / `addNouns()` methods to language layer
4. Wire up Inside Mirror puzzle in Dungeo

### 3. Compound Numbers Not Supported

**Problem:** Numbers like "twenty-one" or "thirty-five" are not parsed. Only single-token numbers are recognized.

**Scope:** This is a known limitation, not a bug. The current implementation handles 0-100 as single words plus any digit string. Compound numbers could be added later if needed.

### 4. Time Format Limited

**Problem:** Only HH:MM format is recognized. Relative times ("30 minutes", "2 hours") and word times ("noon", "midnight") are not supported.

**Scope:** Sufficient for games like Suspended that use clock times. Can be extended if needed.

---

## Assessment of New Parser Capabilities

### What We Can Now Parse

**Before ADR-082:**
- Entity references only
- Raw text capture (unvalidated)
- Greedy text capture

**After ADR-082:**
```typescript
// Dial puzzles (Babel, Suspended)
grammar.define('turn dial to :n').number('n').mapsTo('set_dial')
// → "turn dial to 29" → { n: { text: "29", slotType: NUMBER } }

// Ordinal selection (disambiguation)
grammar.define('take :ord :item').ordinal('ord').mapsTo('take_nth')
// → "take first key" → { ord: { text: "first", slotType: ORDINAL } }

// Time-based puzzles (Suspended, Deadline)
grammar.define('wait until :t').time('t').mapsTo('wait_until')
// → "wait until 10:40" → { t: { text: "10:40", slotType: TIME } }

// Directional actions (Curses, Zork)
grammar.define('push :entity :dir').direction('dir').mapsTo('push_direction')
// → "push boulder north" → { dir: { text: "north", slotType: DIRECTION } }

// Cube inscription (Spellbreaker)
grammar.define('write :msg on :entity').quotedText('msg').mapsTo('inscribe')
// → write "EARTH" on cube → { msg: { text: "EARTH", slotType: QUOTED_TEXT } }

// Conversation topics (Blue Lacuna, Hadean Lands)
grammar.define('ask :entity about :topic').topic('topic').mapsTo('ask_about')
// → "ask wizard about the ancient curse" → { topic: { text: "the ancient curse", slotType: TOPIC } }
```

### Value Extraction Helpers

Static methods for extracting typed values:
```typescript
EnglishGrammarEngine.extractNumberValue(slot)    // → 29 (from "29" or "twenty")
EnglishGrammarEngine.extractOrdinalValue(slot)   // → 1 (from "first" or "1st")
EnglishGrammarEngine.extractDirectionValue(slot) // → "north" (from "n" or "north")
EnglishGrammarEngine.extractTimeValue(slot)      // → { hours: 10, minutes: 40 }
```

### Games Now Supportable

| Game | Pattern | ADR-082 Feature |
|------|---------|-----------------|
| Zork (Inside Mirror) | `push red panel` | ADJECTIVE + NOUN |
| Babel | `set dial to 414` | NUMBER |
| Suspended | `wait until 10:40` | TIME |
| Curses | `pace 5 north` | NUMBER + DIRECTION |
| Spellbreaker | `write "EARTH" on cube` | QUOTED_TEXT |
| Blue Lacuna | `ask about the war` | TOPIC |
| Enchanter | `take first scroll` | ORDINAL |

### Remaining Gaps

1. **Vocabulary-constrained slots (ADJECTIVE, NOUN)** - Infrastructure exists but needs vocabulary provider wiring

2. **Multi-object with typed slots** - Not yet tested (e.g., "take first and second key")

3. **Compound numbers** - "twenty-one" not recognized

4. **Relative time** - "wait 30 minutes" not supported

5. **Spell slots** - ADR-082 mentioned SPELL slot type but not implemented (can use ADJECTIVE with spell vocabulary)

---

## Commits

1. **`feat(parser): Implement ADR-082 extended grammar slot types`**
   - Core implementation of all 8 slot types
   - 20 tests
   - 2018 insertions

2. **`refactor(parser): Move vocabulary to lang-en-us (ADR-082)`**
   - Centralized vocabulary in lang-en-us
   - Proper architecture: lang owns vocab, parser imports

---

## Recommendation

**Ready to merge to main.** The implementation is complete for Phases 1-3 of ADR-082. Phase 4 (vocabulary provider for ADJECTIVE/NOUN) should be a follow-up PR when Dungeo's Inside Mirror puzzle needs it.

The typed slot system significantly expands what Sharpee can parse, enabling puzzle patterns from classic IF that were previously impossible without custom code.

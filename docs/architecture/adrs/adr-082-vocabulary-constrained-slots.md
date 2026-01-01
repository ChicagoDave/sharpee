# ADR-082: Vocabulary-Constrained Grammar Slots

**Status:** Proposed
**Date:** 2026-01-01
**Deciders:** ChicagoDave, Claude
**Context:** Dungeo endgame Inside Mirror puzzle requires `push red panel`

## Problem

The current grammar system cannot properly parse commands like:
- `push red panel` (adjective + noun without entity resolution)
- `put orange ball in blue slot` (complex noun phrases with modifiers)

When a story defines `push :target` patterns, the parser tries to resolve `:target` as an entity. If "red panel" isn't a registered entity (or is scenery), validation fails with `ENTITY_NOT_FOUND`.

Stories need to define patterns that match **vocabulary words** (adjectives, nouns) without requiring entity registration.

## Current State

`PatternBuilder` supports:
- `.where(slot, constraint)` - entity property constraints
- `.text(slot)` - raw text capture (no vocabulary validation)
- `.instrument(slot)` - mark slot as instrument

**Gap:** No way to constrain a slot to match vocabulary categories (adjective, noun, adverb, preposition) while still capturing the matched word(s).

## Proposed Solution

### Phase 1: Simple Vocabulary Slots

Add methods to constrain slots to vocabulary categories:

```typescript
interface PatternBuilder {
  // Existing
  text(slot: string): PatternBuilder;
  instrument(slot: string): PatternBuilder;
  where(slot: string, constraint: Constraint): PatternBuilder;

  // NEW: Vocabulary-constrained slots
  adjective(slot: string): PatternBuilder;
  noun(slot: string): PatternBuilder;
  adverb(slot: string): PatternBuilder;
  preposition(slot: string): PatternBuilder;
}
```

**Usage:**
```typescript
grammar
  .define('push :color :surface')
  .adjective('color')
  .noun('surface')
  .mapsTo('story.action.push_panel')
  .withPriority(170)
  .build();
```

**Behavior:**
- `:color` only matches if word is in `languageProvider.getAdjectives()`
- `:surface` only matches if word is in `languageProvider.getNouns()`
- Matched words stored in `command.vocabularySlots` (similar to `textSlots`)
- No entity resolution attempted

### Phase 2: Noun Phrase Slots

For complex commands like `put orange ball in blue slot`, we need noun phrase parsing:

```typescript
interface PatternBuilder {
  // NEW: Noun phrase slot (optional adjectives + noun)
  nounPhrase(slot: string): PatternBuilder;
}
```

**Usage:**
```typescript
grammar
  .define('put :item in :container')
  .nounPhrase('item')
  .nounPhrase('container')
  .mapsTo('if.action.putting')
  .build();
```

**Behavior:**
- `:item` matches `[adjective]* noun` pattern
- Captures full phrase: `{ adjectives: ['orange'], noun: 'ball' }`
- Still attempts entity resolution using the full phrase
- Falls back to vocabulary match if no entity found

### Phase 3: Hybrid Resolution

Allow vocabulary slots to optionally attempt entity resolution:

```typescript
grammar
  .define('push :color :surface')
  .adjective('color')
  .noun('surface', { resolveEntity: true })  // Try entity, fall back to vocab
  .mapsTo('story.action.push_panel')
  .build();
```

## Implementation Details

### SlotType Enum Extension

```typescript
export enum SlotType {
  ENTITY = 'entity',           // Existing: resolve to entity
  TEXT = 'text',               // Existing: raw single token
  TEXT_GREEDY = 'text_greedy', // Existing: raw until delimiter
  INSTRUMENT = 'instrument',   // Existing: entity as instrument

  // NEW
  ADJECTIVE = 'adjective',     // Match adjective vocabulary
  NOUN = 'noun',               // Match noun vocabulary
  ADVERB = 'adverb',           // Match adverb vocabulary
  PREPOSITION = 'preposition', // Match preposition vocabulary
  NOUN_PHRASE = 'noun_phrase'  // Match [adj]* noun pattern
}
```

### IParsedCommand Extension

```typescript
interface IParsedCommand {
  // Existing
  textSlots?: Map<string, string>;

  // NEW
  vocabularySlots?: Map<string, VocabularyMatch>;
}

interface VocabularyMatch {
  word: string;           // The matched word
  category: SlotType;     // ADJECTIVE, NOUN, etc.
  // For noun phrases:
  adjectives?: string[];
  noun?: string;
}
```

### Grammar Engine Changes

In `english-grammar-engine.ts`, add vocabulary matching:

```typescript
function consumeVocabularySlot(
  tokens: string[],
  position: number,
  slotType: SlotType,
  languageProvider: ParserLanguageProvider
): { word: string; consumed: number } | null {
  const word = tokens[position];

  switch (slotType) {
    case SlotType.ADJECTIVE:
      if (languageProvider.getAdjectives().includes(word)) {
        return { word, consumed: 1 };
      }
      break;
    case SlotType.NOUN:
      if (languageProvider.getNouns().includes(word)) {
        return { word, consumed: 1 };
      }
      break;
    // ... etc
  }

  return null;
}
```

## Story Registration

Stories must register their vocabulary:

```typescript
extendLanguage(language: LanguageProvider): void {
  // Register adjectives for panel colors
  language.addAdjectives(['red', 'yellow', 'mahogany', 'pine']);

  // Register nouns for panel/wall
  language.addNouns(['panel', 'wall']);
}
```

Or via `ParserLanguageProvider`:

```typescript
const langProvider: ParserLanguageProvider = {
  getAdjectives: () => [...baseAdjectives, 'red', 'yellow', 'mahogany', 'pine'],
  getNouns: () => [...baseNouns, 'panel', 'wall'],
  // ...
};
```

## Examples

### Inside Mirror Panels

```typescript
// Story grammar
grammar
  .define('push :color :surface')
  .adjective('color')
  .noun('surface')
  .mapsTo('dungeo.action.push_panel')
  .withPriority(170)
  .build();

grammar
  .define('push :color')
  .adjective('color')
  .mapsTo('dungeo.action.push_panel')
  .withPriority(165)
  .build();

// Action receives
context.command.vocabularySlots.get('color')  // 'red'
context.command.vocabularySlots.get('surface') // 'panel'
```

### Complex Puzzle

```typescript
// "put orange ball in blue slot"
grammar
  .define('put :item in :container')
  .nounPhrase('item')
  .nounPhrase('container')
  .mapsTo('puzzle.action.place_ball')
  .build();

// Action receives
context.command.vocabularySlots.get('item')
// { adjectives: ['orange'], noun: 'ball' }

context.command.vocabularySlots.get('container')
// { adjectives: ['blue'], noun: 'slot' }
```

## Alternatives Considered

### 1. Entity-Based Approach
Create scenery entities for each panel color. Rejected because:
- Clutters entity space with non-interactive objects
- Requires special-casing scenery in actions
- Doesn't solve the general problem

### 2. Text Slots Only
Use `.text()` for everything. Rejected because:
- No vocabulary validation
- Can't distinguish "push red panel" from "push banana panel"
- Loses semantic information

### 3. Literal Patterns
Define `push red panel`, `push yellow panel`, etc. explicitly. Rejected because:
- Combinatorial explosion for complex patterns
- Doesn't scale to `put :adj :noun in :adj :noun`

## Migration Path

1. Implement Phase 1 (simple vocabulary slots)
2. Update Dungeo push-panel to use `.adjective()` / `.noun()`
3. Implement Phase 2 (noun phrases) if needed for other puzzles
4. Phase 3 (hybrid) only if required

## Decision

Implement Phase 1 immediately to unblock Dungeo Inside Mirror puzzle.

## Consequences

### Positive
- Clean separation of vocabulary matching vs entity resolution
- Enables rich grammar patterns without entity overhead
- Extensible to future vocabulary categories

### Negative
- Stories must register vocabulary explicitly
- Additional complexity in grammar engine
- Two parallel slot systems (entity vs vocabulary)

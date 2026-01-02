# ADR-082: Context-Aware Vocabulary and Extended Grammar Slots

**Status:** Revised (incorporating context-aware design)
**Date:** 2026-01-01 (revised)
**Deciders:** ChicagoDave, Claude
**Context:** Comprehensive IF grammar requirements with Sharpee's context awareness and intention systems

## Problem

The current grammar system supports only basic slot types:
- **ENTITY** - resolves to a game entity
- **TEXT** - captures a single raw word
- **TEXT_GREEDY** - captures words until a delimiter

This is insufficient for puzzles like the Inside Mirror ("push red panel") where:
1. "red" is a vocabulary word, not an entity
2. The command is only valid in a specific location
3. The parser should reject invalid colors at parse time, not in action validation

### Key Insight

Sharpee has **context awareness** built into the parser via `GrammarContext`. Vocabulary should be scoped to contexts, not global. The parser already knows the player's location—vocabulary should leverage this.

## Solution: Context-Aware Vocabulary

### Core Concept

Vocabulary categories are registered with optional context predicates. The parser only considers a pattern if its vocabulary is active in the current context.

```typescript
// Vocabulary only active in Inside Mirror
vocab.define('panel-colors', {
  words: ['red', 'yellow', 'mahogany', 'pine'],
  when: (ctx) => ctx.currentLocation === insideMirrorId
});

// Grammar references the category
grammar
  .define('push :color panel')
  .fromVocabulary('color', 'panel-colors')
  .mapsTo('dungeo.action.push_panel')
  .build();
```

### Parse-Time Flow

```
Input: "push red panel"
Context: { currentLocation: insideMirrorId, world, actorId }
              │
              ▼
    ┌─────────────────────────────────┐
    │ Pattern: "push :color panel"    │
    │ Slot 'color' → 'panel-colors'   │
    └─────────────────────────────────┘
              │
              ▼
    Is 'panel-colors' active in context?
              │
       ┌──────┴──────┐
      Yes            No
       │              │
       ▼              ▼
    Is 'red' in     Pattern doesn't match,
    panel-colors?   try next pattern
       │            (falls through to stdlib push)
       ▼
    Match! → push_panel action
```

### Benefits Over Global Vocabulary

| Aspect | Global Vocabulary | Context-Aware Vocabulary |
|--------|-------------------|--------------------------|
| "push red panel" outside Mirror | Parses, action rejects | Pattern doesn't match |
| Error handling | In action's validate() | At parser level |
| Vocabulary pollution | All puzzle words always active | Only relevant words active |
| Disambiguation | Must manage pattern priority | Context resolves naturally |

## VocabularyProvider Interface

```typescript
interface VocabularyProvider {
  /**
   * Define a named vocabulary category
   * @param category - Unique category name
   * @param config - Words and optional context predicate
   */
  define(category: string, config: {
    words: string[];
    when?: (ctx: GrammarContext) => boolean;
  }): void;

  /**
   * Extend an existing category with additional words
   */
  extend(category: string, words: string[]): void;

  /**
   * Check if word matches category in current context
   */
  match(category: string, word: string, ctx: GrammarContext): boolean;

  /**
   * Get all words in a category (for tooling/debugging)
   */
  getWords(category: string): Set<string>;

  /**
   * Check if category is active in context
   */
  isActive(category: string, ctx: GrammarContext): boolean;
}
```

## Slot Type Taxonomy

### Built-In Universal Slots (Always Active)

These require no registration—they're universal concepts with built-in vocabularies.

| Slot Type | Builder Method | Example | Output |
|-----------|----------------|---------|--------|
| NUMBER | `.number(slot)` | "turn dial to 29" | `{ type: 'number', value: 29 }` |
| ORDINAL | `.ordinal(slot)` | "take first key" | `{ type: 'ordinal', value: 1 }` |
| TIME | `.time(slot)` | "wait until 10:40" | `{ type: 'time', hours: 10, minutes: 40 }` |
| DIRECTION | `.direction(slot)` | "go north" | `{ type: 'direction', canonical: 'north' }` |
| MANNER | `.manner(slot)` | "carefully open" | `{ type: 'manner', word: 'carefully' }` → `intention.manner` |
| QUOTED_TEXT | `.quotedText(slot)` | `say "hello"` | `{ type: 'quoted_text', text: 'hello' }` |
| TOPIC | `.topic(slot)` | "ask about the war" | `{ type: 'topic', words: ['the', 'war'] }` |

### Category-Based Slots (Story-Defined)

Stories register vocabulary categories, then reference them in patterns.

```typescript
// Builder method
.fromVocabulary(slotName: string, categoryName: string): PatternBuilder
```

## MANNER Slot and Intention Integration

Sharpee's intention system differentiates it from traditional IF. The MANNER slot feeds directly into `command.intention.manner`.

### Built-In Manner Vocabulary

```typescript
const MANNER_ADVERBS = [
  'carefully', 'quietly', 'quickly', 'slowly',
  'forcefully', 'gently', 'loudly', 'softly',
  'cautiously', 'boldly', 'stealthily'
];
```

### Usage

```typescript
// Pattern with optional manner
grammar
  .define(':manner? open :target')
  .manner('manner')
  .entity('target')
  .mapsTo('open')
  .build();

// Matches: "open door", "carefully open door", "forcefully open door"
```

### Action Usage

```typescript
execute(context: ActionContext): void {
  const manner = context.command.intention?.manner;

  if (manner === 'carefully') {
    // Less noise, less chance of breaking
  } else if (manner === 'forcefully') {
    // More noise, might damage, but succeeds if stuck
  } else if (manner === 'quietly') {
    // NPCs don't notice
  }
}
```

### Story Extension

```typescript
// Add story-specific manner adverbs
vocab.extend('manner', ['recklessly', 'methodically', 'frantically']);
```

## SlotType Enum (Revised)

```typescript
export enum SlotType {
  // Entity resolution
  ENTITY = 'entity',
  INSTRUMENT = 'instrument',

  // Text capture
  TEXT = 'text',
  TEXT_GREEDY = 'text_greedy',
  QUOTED_TEXT = 'quoted_text',
  TOPIC = 'topic',

  // Built-in typed values
  NUMBER = 'number',
  ORDINAL = 'ordinal',
  TIME = 'time',
  DIRECTION = 'direction',
  MANNER = 'manner',

  // Category-based (story-defined vocabulary)
  VOCABULARY = 'vocabulary'
}
```

**Note:** Generic ADJECTIVE and NOUN slots are removed. Use `.fromVocabulary()` with named categories instead.

## PatternBuilder Interface (Revised)

```typescript
interface PatternBuilder {
  // Entity resolution
  entity(slot: string): PatternBuilder;
  instrument(slot: string): PatternBuilder;
  where(slot: string, constraint: Constraint): PatternBuilder;

  // Text capture
  text(slot: string): PatternBuilder;
  quotedText(slot: string): PatternBuilder;
  topic(slot: string): PatternBuilder;

  // Built-in typed values
  number(slot: string): PatternBuilder;
  ordinal(slot: string): PatternBuilder;
  time(slot: string): PatternBuilder;
  direction(slot: string): PatternBuilder;
  manner(slot: string): PatternBuilder;

  // Category-based vocabulary
  fromVocabulary(slot: string, category: string): PatternBuilder;

  // Pattern metadata
  mapsTo(actionId: string): PatternBuilder;
  withPriority(priority: number): PatternBuilder;
  build(): void;
}
```

## IParsedCommand Extension

```typescript
interface IParsedCommand {
  // Existing
  actionId: string;
  structure: CommandStructure;
  textSlots?: Map<string, string>;
  instrument?: EntityReference;

  // NEW: Typed slot values
  typedSlots?: Map<string, TypedSlotValue>;

  // NEW: Vocabulary matches (from .fromVocabulary())
  vocabularySlots?: Map<string, VocabularyMatch>;
}

type TypedSlotValue =
  | { type: 'number'; value: number; word: string }
  | { type: 'ordinal'; value: number; word: string }
  | { type: 'time'; hours: number; minutes: number; text: string }
  | { type: 'direction'; direction: string; canonical: string }
  | { type: 'manner'; word: string }
  | { type: 'quoted_text'; text: string }
  | { type: 'topic'; words: string[] };

interface VocabularyMatch {
  word: string;
  category: string;
}
```

## Usage Examples

### Dungeo Inside Mirror

```typescript
// Story initialization
const vocab = world.getVocabularyProvider();
const insideMirrorId = world.getStateValue('endgame.insideMirrorId');

vocab.define('panel-colors', {
  words: ['red', 'yellow', 'mahogany', 'pine'],
  when: (ctx) => ctx.currentLocation === insideMirrorId
});

vocab.define('surfaces', {
  words: ['panel', 'wall'],
  when: (ctx) => ctx.currentLocation === insideMirrorId
});

// Grammar patterns
grammar
  .define('push :color :surface')
  .fromVocabulary('color', 'panel-colors')
  .fromVocabulary('surface', 'surfaces')
  .mapsTo('dungeo.action.push_panel')
  .build();

grammar
  .define('push :color')
  .fromVocabulary('color', 'panel-colors')
  .mapsTo('dungeo.action.push_panel')
  .build();
```

### Simplified Action

```typescript
// The action no longer needs to check location or parse raw input
const pushPanelAction: Action = {
  id: 'dungeo.action.push_panel',

  validate(context: ActionContext): ValidationResult {
    // If we got here, context was valid (parser checked location)
    const colorMatch = context.command.parsed?.vocabularySlots?.get('color');

    if (!colorMatch) {
      return { valid: false, error: 'NO_COLOR_SPECIFIED' };
    }

    context.sharedData.panelColor = colorMatch.word;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const color = context.sharedData.panelColor;

    if (color === 'red') rotateBox(world, true);
    else if (color === 'yellow') rotateBox(world, false);
    else if (color === 'mahogany') moveBox(world, true);
    else if (color === 'pine') moveBox(world, false);
  }
};
```

### Dungeo Parapet Dial

```typescript
vocab.define('dial-positions', {
  words: ['1', '2', '3', '4', '5', '6', '7', '8'],
  when: (ctx) => ctx.currentLocation === parapetId
});

grammar
  .define('turn dial to :pos')
  .fromVocabulary('pos', 'dial-positions')
  .mapsTo('dungeo.action.set_dial')
  .build();

// Or use NUMBER slot if any integer is valid
grammar
  .define('turn dial to :n')
  .number('n')
  .mapsTo('dungeo.action.set_dial')
  .build();
```

### Combat with Manner

```typescript
vocab.define('combat-styles', {
  words: ['aggressively', 'defensively', 'recklessly'],
  when: (ctx) => {
    // Only active when in combat
    return ctx.world.getStateValue('inCombat') === true;
  }
});

grammar
  .define(':style attack :target')
  .fromVocabulary('style', 'combat-styles')
  .entity('target')
  .mapsTo('attack')
  .build();
```

## Implementation Phases

### Phase 1: Core Infrastructure (Complete)
- NUMBER, ORDINAL, TIME, DIRECTION slots
- QUOTED_TEXT, TOPIC slots
- `typedSlots` on IParsedCommand

### Phase 2: Vocabulary Provider
- VocabularyProvider interface in if-domain
- Implementation in world-model
- Context predicate evaluation

### Phase 3: Category-Based Slots
- `.fromVocabulary()` builder method
- `vocabularySlots` on IParsedCommand
- Context-aware pattern matching

### Phase 4: Manner and Intention
- MANNER slot type
- Built-in manner adverbs
- Integration with `command.intention.manner`

### Phase 5: Dungeo Integration
- Migrate Inside Mirror to vocabulary-based
- Migrate Parapet dial
- Add manner support to combat actions

## Consequences

### Positive

- **Context-aware parsing** - Patterns only match where vocabulary is active
- **Clean separation** - Parser handles context, action handles logic
- **Better errors** - "I don't recognize that color" at parse time
- **Reduced action complexity** - No location checks in validate()
- **Intention integration** - Manner adverbs affect action behavior
- **Explicit vocabulary** - Story declares what words mean where

### Negative

- More upfront vocabulary registration
- Context predicates add complexity
- Must think about vocabulary scope during story design

## Alternatives Considered

### 1. Global Vocabulary Pools

Generic `.adjective()` / `.noun()` matching any registered word. Rejected because:
- No context scoping
- All puzzle words active everywhere
- Action must re-check context

### 2. Inline Vocabulary on Pattern

```typescript
.adjective('color', ['red', 'yellow', 'mahogany', 'pine'])
```

Rejected because:
- Vocabulary might be shared across patterns
- No context awareness
- Harder to extend dynamically

### 3. Action-Level Context Checks

Keep vocabulary global, let actions check context. Rejected because:
- Duplicates context checks in every action
- Worse error messages
- Doesn't leverage parser's context awareness

## References

- [Grammar Pattern Catalog](/docs/work/dungeo/context/2026-01-01-1314-grammar-pattern-catalog.md)
- [Sharpee Intention System](/docs/reference/intention-system.md)
- [GrammarContext Interface](/packages/if-domain/src/grammar/grammar-context.ts)

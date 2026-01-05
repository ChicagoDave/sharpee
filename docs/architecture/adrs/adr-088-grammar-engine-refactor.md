# ADR-088: Grammar Engine Refactoring

## Status
PROPOSED

## Context

`english-grammar-engine.ts` has grown to 1355 lines with 24 methods, making it difficult to maintain and test. The file has accumulated functionality from multiple ADRs:

- Core pattern matching (original)
- ADR-080: Multi-object parsing (`consumeAllSlot`, `consumeExcludedEntities`, `consumeEntityWithListDetection`)
- ADR-082: Typed slots (`consumeNumberSlot`, `consumeOrdinalSlot`, `consumeTimeSlot`, etc.)

Current method inventory:

| Category | Methods | Lines (est.) |
|----------|---------|--------------|
| Core matching | `findMatches`, `tryMatchRule`, `buildSemantics` | ~200 |
| Slot dispatch | `consumeSlot` | ~90 |
| Entity slots | `consumeEntitySlot`, `consumeAllSlot`, `consumeExcludedEntities`, `consumeEntityWithListDetection`, `evaluateSlotConstraints` | ~350 |
| Text slots | `consumeTextSlot`, `consumeGreedyTextSlot`, `consumeQuotedTextSlot`, `consumeTopicSlot` | ~150 |
| Typed slots (ADR-082) | `consumeNumberSlot`, `consumeOrdinalSlot`, `consumeTimeSlot`, `consumeDirectionSlot`, `consumeAdjectiveSlot`, `consumeNounSlot`, `consumeVocabularySlot`, `consumeMannerSlot`, `getVocabulary` | ~400 |

Problems:
1. **Single Responsibility Violation** - One class does pattern matching, slot consumption, entity resolution, vocabulary lookup
2. **Testing Difficulty** - Can't unit test slot consumers in isolation
3. **Cognitive Load** - 1355 lines is too much to hold in working memory
4. **Extension Pain** - Adding new slot types means modifying the giant switch in `consumeSlot`

## Decision

Extract slot consumption logic into separate, focused modules using a **Strategy Pattern** for slot consumers.

### Proposed Structure

```
packages/parser-en-us/src/
├── english-grammar-engine.ts      (~300 lines - core matching only)
├── slot-consumers/
│   ├── index.ts                   (registry and dispatcher)
│   ├── slot-consumer.ts           (interface/base class)
│   ├── entity-slot-consumer.ts    (entity, multi-object)
│   ├── text-slot-consumer.ts      (text, greedy, quoted, topic)
│   ├── typed-slot-consumer.ts     (number, ordinal, time, direction)
│   └── vocabulary-slot-consumer.ts (adjective, noun, vocabulary, manner)
└── scope-evaluator.ts             (unchanged)
```

### SlotConsumer Interface

```typescript
// slot-consumer.ts
export interface SlotConsumer {
  /**
   * Slot types this consumer handles
   */
  readonly slotTypes: SlotType[];

  /**
   * Attempt to consume tokens for this slot type
   */
  consume(
    slotName: string,
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    slotTokenIndex: number,
    rule: GrammarRule,
    context: GrammarContext,
    slotType: SlotType
  ): SlotMatch | null;
}
```

### Consumer Registry

```typescript
// index.ts
export class SlotConsumerRegistry {
  private consumers: Map<SlotType, SlotConsumer> = new Map();

  register(consumer: SlotConsumer): void {
    for (const type of consumer.slotTypes) {
      this.consumers.set(type, consumer);
    }
  }

  consume(slotType: SlotType, ...args): SlotMatch | null {
    const consumer = this.consumers.get(slotType);
    if (!consumer) {
      throw new Error(`No consumer registered for slot type: ${slotType}`);
    }
    return consumer.consume(...args);
  }
}

// Default registry with all consumers
export const defaultRegistry = new SlotConsumerRegistry();
defaultRegistry.register(new EntitySlotConsumer());
defaultRegistry.register(new TextSlotConsumer());
defaultRegistry.register(new TypedSlotConsumer());
defaultRegistry.register(new VocabularySlotConsumer());
```

### Simplified Grammar Engine

```typescript
// english-grammar-engine.ts (~300 lines)
export class EnglishGrammarEngine extends GrammarEngine {
  constructor(
    private slotConsumers: SlotConsumerRegistry = defaultRegistry
  ) {
    super(new EnglishPatternCompiler());
  }

  findMatches(tokens, context, options): PatternMatch[] {
    // ... unchanged
  }

  private tryMatchRule(rule, tokens, context): PatternMatch | null {
    // ... mostly unchanged, but consumeSlot is now:
  }

  private consumeSlot(
    slotName: string,
    slotType: SlotType,
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    slotTokenIndex: number,
    rule: any,
    context: GrammarContext
  ): SlotMatch | null {
    // Single delegation - no giant switch!
    return this.slotConsumers.consume(
      slotType, slotName, tokens, startIndex, pattern, slotTokenIndex, rule, context, slotType
    );
  }

  private buildSemantics(rule, matchedTokens, slots): any {
    // ... unchanged
  }
}
```

## Implementation Plan

### Phase 1: Extract Entity Slot Consumer (~350 lines)
Most complex, handles multi-object parsing from ADR-080.

```typescript
// entity-slot-consumer.ts
export class EntitySlotConsumer implements SlotConsumer {
  readonly slotTypes = [SlotType.ENTITY, SlotType.INSTRUMENT];

  consume(...): SlotMatch | null { /* moved from grammar engine */ }

  private consumeAllSlot(...): SlotMatch | null { /* ... */ }
  private consumeExcludedEntities(...): { tokens; items } | null { /* ... */ }
  private consumeEntityWithListDetection(...): SlotMatch | null { /* ... */ }
  private evaluateSlotConstraints(...): number { /* ... */ }
}
```

### Phase 2: Extract Text Slot Consumer (~150 lines)

```typescript
// text-slot-consumer.ts
export class TextSlotConsumer implements SlotConsumer {
  readonly slotTypes = [SlotType.TEXT, SlotType.TEXT_GREEDY, SlotType.QUOTED, SlotType.TOPIC];

  consume(...): SlotMatch | null {
    switch (slotType) {
      case SlotType.TEXT: return this.consumeText(...);
      case SlotType.TEXT_GREEDY: return this.consumeGreedyText(...);
      case SlotType.QUOTED: return this.consumeQuotedText(...);
      case SlotType.TOPIC: return this.consumeTopic(...);
    }
  }

  private consumeText(...): SlotMatch | null { /* ... */ }
  private consumeGreedyText(...): SlotMatch | null { /* ... */ }
  private consumeQuotedText(...): SlotMatch | null { /* ... */ }
  private consumeTopic(...): SlotMatch | null { /* ... */ }
}
```

### Phase 3: Extract Typed Slot Consumer (~250 lines)
ADR-082 slots.

```typescript
// typed-slot-consumer.ts
export class TypedSlotConsumer implements SlotConsumer {
  readonly slotTypes = [
    SlotType.NUMBER, SlotType.ORDINAL, SlotType.TIME, SlotType.DIRECTION
  ];

  consume(...): SlotMatch | null { /* dispatch */ }

  private consumeNumber(...): SlotMatch | null { /* ... */ }
  private consumeOrdinal(...): SlotMatch | null { /* ... */ }
  private consumeTime(...): SlotMatch | null { /* ... */ }
  private consumeDirection(...): SlotMatch | null { /* ... */ }
}
```

### Phase 4: Extract Vocabulary Slot Consumer (~150 lines)

```typescript
// vocabulary-slot-consumer.ts
export class VocabularySlotConsumer implements SlotConsumer {
  readonly slotTypes = [
    SlotType.ADJECTIVE, SlotType.NOUN, SlotType.VOCABULARY, SlotType.MANNER
  ];

  consume(...): SlotMatch | null { /* dispatch */ }

  private consumeAdjective(...): SlotMatch | null { /* ... */ }
  private consumeNoun(...): SlotMatch | null { /* ... */ }
  private consumeVocabulary(...): SlotMatch | null { /* ... */ }
  private consumeManner(...): SlotMatch | null { /* ... */ }
  private getVocabulary(...): string[] { /* ... */ }
}
```

### Phase 5: Cleanup and Testing
- Add unit tests for each consumer in isolation
- Remove dead code from grammar engine
- Update imports

## Benefits

1. **Testability** - Each consumer can be unit tested independently
2. **Single Responsibility** - Grammar engine does matching; consumers do slot parsing
3. **Extensibility** - New slot types just register a new consumer
4. **Readability** - Each file is ~150-350 lines instead of 1355
5. **Dependency Injection** - Can swap consumers for testing or localization

## Risks

1. **More Files** - 6 files instead of 1 (manageable)
2. **Interface Overhead** - Slight indirection cost (negligible)
3. **Migration Risk** - Must preserve exact behavior during extraction

## Testing Strategy

1. Create integration tests that capture current behavior BEFORE refactoring
2. Extract one consumer at a time
3. Run integration tests after each extraction
4. Add unit tests for each new consumer

## Alternatives Considered

### Keep as-is with better comments
- Doesn't solve testing or extension problems
- File will only grow larger

### Split by ADR origin
- Would create arbitrary boundaries
- Doesn't reflect logical groupings

### Move to if-domain package
- Slot consumption is English-specific
- Would create wrong abstraction boundary

## Consequences

### Positive
- Reduced cognitive load per file
- Easier to add new slot types (ADR-087 verb aliases, future work)
- Better test coverage possible
- Clearer code organization

### Negative
- More files to navigate
- Initial refactoring effort
- Potential for bugs during extraction

### Neutral
- No API changes to external consumers
- No performance impact

## References

- Current file: `packages/parser-en-us/src/english-grammar-engine.ts` (1355 lines)
- ADR-080: Grammar Enhancements (multi-object parsing)
- ADR-082: Typed Value Slots
- ADR-087: Action-Centric Grammar (will benefit from this refactor)

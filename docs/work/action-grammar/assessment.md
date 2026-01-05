# Sharpee Parser System Assessment

**Author**: Claude (as IF Platform Developer)
**Date**: 2026-01-05
**Version**: Post ADR-087/088 Implementation

---

## Executive Summary

The Sharpee parser is a **modern, TypeScript-native parser** for interactive fiction that successfully balances classic IF parsing patterns with contemporary software engineering practices. It represents a significant departure from the traditional Inform/TADS approach while maintaining compatibility with the command structures players expect.

**Overall Rating**: **B+** (Solid foundation with room for optimization)

### Strengths
- Clean separation between grammar definition and execution
- Sophisticated scope constraint system
- Multi-object parsing (all/but/and)
- Extensible slot type system
- Action-centric grammar builder API (ADR-087)

### Areas for Improvement
- Entity resolution still tightly coupled to parsing
- Limited disambiguation UI support
- No pronoun reference tracking ("it", "them")
- Verb-first assumption limits certain patterns

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EnglishParser                             │
│  - Tokenization (preserves position, quotes)                     │
│  - Command structure extraction                                  │
│  - Result building (IParsedCommand)                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   EnglishGrammarEngine                           │
│  - Rule matching against token stream                            │
│  - Semantic property derivation                                  │
│  - Slot consumption delegation                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                 Slot Consumer Registry (ADR-088)                 │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│  │ EntityConsumer │ │ TextConsumer   │ │ TypedConsumer  │       │
│  │ (ENTITY,INSTR) │ │ (TEXT,GREEDY)  │ │ (NUM,ORD,TIME) │       │
│  └────────────────┘ └────────────────┘ └────────────────┘       │
│  ┌────────────────┐                                              │
│  │ VocabConsumer  │                                              │
│  │ (VOCAB,MANNER) │                                              │
│  └────────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure (Post-ADR-088)

| File | Lines | Purpose |
|------|-------|---------|
| `english-parser.ts` | 1325 | Main parser, tokenization, result building |
| `english-grammar-engine.ts` | 433 | Rule matching, slot delegation |
| `grammar.ts` | 675 | Standard grammar definitions |
| `slot-consumers/entity-*.ts` | 381 | Multi-object parsing |
| `slot-consumers/text-*.ts` | 183 | Raw text capture |
| `slot-consumers/typed-*.ts` | 174 | Numbers, ordinals, time |
| `slot-consumers/vocabulary-*.ts` | 216 | Custom vocabulary matching |
| `scope-evaluator.ts` | 224 | Constraint evaluation |

**Total**: ~3,600 lines (parser-en-us package)

---

## Component Analysis

### 1. Grammar Builder (A)

The grammar builder is the strongest part of the system, especially after ADR-087.

**Pattern Definition API**:
```typescript
// Action-centric (ADR-087) - preferred
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();

// Pattern-centric (legacy) - still available
grammar
  .define('unlock :door with :key')
  .where('door', scope => scope.touchable().matching({ locked: true }))
  .where('key', scope => scope.carried())
  .mapsTo('if.action.unlocking')
  .build();
```

**Strengths**:
- Fluent API reads like natural language
- Scope constraints are composable and type-safe
- Alternation syntax (`in|into|inside`) handles synonyms elegantly
- Optional elements (`[carefully]`) reduce pattern duplication
- Direction patterns consolidated into single declaration

**Weaknesses**:
- Phrasal verbs ("pick up", "put down") require separate `.define()` calls
- No negative constraints (e.g., "NOT matching container")
- Pattern priority requires manual tuning

### 2. Slot Type System (A-)

The SlotType enum provides 13 distinct slot types:

| Type | Example | Use Case |
|------|---------|----------|
| ENTITY | `:item` | Standard entity resolution |
| TEXT | `:word` | Single raw word |
| TEXT_GREEDY | `:message...` | Multi-word capture |
| INSTRUMENT | `:tool` | "with" clause entities |
| DIRECTION | `:dir` | n/s/e/w/up/down |
| NUMBER | `:count` | 1, 29, "twenty" |
| ORDINAL | `:nth` | 1st, "first" |
| TIME | `:time` | 10:40, 6:00 |
| MANNER | `:how` | carefully, quickly |
| VOCABULARY | `:color` | Story-defined word lists |
| QUOTED_TEXT | `:said` | "hello world" |
| TOPIC | `:about` | Multi-word topic |

**Strengths**:
- Covers most classic IF needs
- Custom vocabulary categories enable story-specific parsing
- Semantic extraction helpers (extractNumberValue, etc.)

**Weaknesses**:
- No composable slot types (can't say "NUMBER or ORDINAL")
- VOCABULARY requires pre-registration, no dynamic lookup
- TIME only supports HH:MM format

### 3. Entity Resolution (B)

Entity resolution happens during slot consumption via `ScopeEvaluator`.

**Scope Constraint Chain**:
```typescript
scope => scope
  .visible()                    // Base scope
  .matching({ portable: true }) // Property filter
  .kind('treasure')             // Kind filter
  .orExplicitly(['compass-1'])  // Always include
```

**Strengths**:
- Scope-based filtering reduces entity search space
- Supports IdentityTrait aliases
- Partial name matching as fallback

**Weaknesses**:
- **Resolution happens at parse time**, before action validation
- No confidence weighting based on match quality
- No support for adjective disambiguation ("red book" vs "blue book")
- Homonym handling is implicit (first match wins)

### 4. Multi-Object Parsing (B+)

ADR-080 Phase 2 implemented classic multi-object patterns:

```
take all              → isAll: true
take all but sword    → isAll: true, excluded: [sword]
take knife and lamp   → isList: true, items: [knife, lamp]
```

**Strengths**:
- Handles Infocom-style mass manipulation
- Exclusion lists work correctly
- Integrates with entity resolution

**Weaknesses**:
- No "everything except" synonym for "all but"
- List detection requires "and" - no comma lists ("take a, b, c")
- No scope-aware "all" (can't say "take all portable things")

### 5. Command Chaining (C)

Period-separated commands are parsed:
```
take sword. go north. → [take sword, go north]
```

**Weaknesses**:
- No semicolon support
- No "then" keyword ("take sword then go north")
- Comma chaining only works when verb follows comma
- No recovery from mid-chain parse errors

---

## Comparison to Classic IF Parsers

### vs. Inform 7 Parser

| Feature | Inform 7 | Sharpee |
|---------|----------|---------|
| Natural language patterns | ✓ (Excellent) | Partial |
| Disambiguation | ✓ Interactive | ✗ First match |
| Pronouns (it/them) | ✓ | ✗ |
| Understand "X as Y" | ✓ | ✓ (aliases) |
| Multi-word verbs | ✓ Native | Separate patterns |
| Scope checking | ✓ | ✓ |
| Action abstraction | ✓ (Actions) | ✓ (Actions) |

### vs. TADS 3 Parser

| Feature | TADS 3 | Sharpee |
|---------|--------|---------|
| VerbRule macros | ✓ | ✓ (forAction) |
| dobjFor/iobjFor | ✓ | Via traits |
| Disambiguation | ✓ Interactive | ✗ |
| Parser precedence | ✓ Priority numbers | ✓ Priority numbers |
| Tokenization | ✓ | ✓ |
| Semantic properties | Limited | ✓ Rich |

### vs. Dialog Parser

| Feature | Dialog | Sharpee |
|---------|--------|---------|
| Rule-based | ✓ | ✓ |
| Prolog-style | ✓ | ✗ (Procedural) |
| Backtracking | ✓ | ✗ |
| Grammar notation | BNF-like | Fluent API |

---

## Performance Considerations

### Current Approach
- Linear scan through all grammar rules for each parse
- Entity resolution queries world model per constraint
- Token-by-token consumption (no lookahead optimization)

### Recommendations

1. **Rule Indexing**: Index rules by first verb/literal token for O(1) lookup
2. **Lazy Entity Resolution**: Defer resolution until action needs it
3. **Compiled Patterns**: Current CompiledPattern is good; consider further optimization
4. **Caching**: Cache entity scope queries per turn

---

## Critical Gaps

### 1. No Pronoun Resolution
Classic IF allows:
```
> take the lamp
Taken.
> light it
```

Sharpee has no pronoun tracking. The parser would fail on "it".

**Recommendation**: Add `PronounContext` tracking in parser state:
```typescript
interface PronounContext {
  it: string | null;      // Last singular direct object
  them: string[] | null;  // Last plural/list object
  him: string | null;     // Last male NPC
  her: string | null;     // Last female NPC
}
```

### 2. No Interactive Disambiguation
When multiple entities match, Inform/TADS ask:
```
> take book
Which book do you mean, the red book or the blue book?
```

Sharpee returns the first match silently.

**Recommendation**: Add disambiguation callback:
```typescript
interface ParserOptions {
  onAmbiguity?: (candidates: IEntity[], slotName: string) => Promise<IEntity>;
}
```

### 3. No Implicit Actions
Classic IF allows:
```
> take the sword from the stone
(first opening the stone case)
```

Sharpee doesn't auto-open containers.

**Note**: This is arguably a feature - stdlib should handle implicit actions, not the parser.

### 4. Limited Error Messages
Parser returns generic "Could not match input" on failure.

**Recommendation**: Implement partial match analysis:
```
> put lamp
I understood "put" but couldn't find what you want to put it in.
```

---

## Recommendations for Future Development

### Short Term (v1.0)
1. Add pronoun tracking ("it", "them")
2. Improve parse failure messages
3. Add comma-separated list support ("take a, b, and c")

### Medium Term (v1.x)
1. Interactive disambiguation API
2. Rule indexing for performance
3. "then" keyword for command chaining
4. Adjective-based disambiguation

### Long Term (v2.0)
1. Incremental parsing (character-by-character for autocomplete)
2. Natural language understanding (NLU) integration option
3. Parser generator (compile DSL to optimized matcher)

---

## Conclusion

The Sharpee parser successfully modernizes classic IF parsing for TypeScript while maintaining the patterns players expect. The ADR-087/088 refactors significantly improved maintainability, reducing the grammar engine from 1355 to 433 lines through proper separation of concerns.

The main gaps (pronouns, disambiguation) are well-understood problems with known solutions. The architecture is sound enough to support these additions without major restructuring.

**The parser is production-ready for games that don't require:**
- Pronoun references
- Interactive disambiguation
- Command chaining with "then"

For a Zork implementation (Project Dungeo), these limitations are acceptable with workarounds.

---

## References

- ADR-087: Action-Centric Grammar Builder
- ADR-088: Grammar Engine Refactoring (Slot Consumers)
- ADR-080: Multi-Object Parsing
- ADR-082: Typed Value Slots
- Graham Nelson, "Inform 7 Documentation" (2006)
- Mike Roberts, "TADS 3 Technical Manual" (2012)

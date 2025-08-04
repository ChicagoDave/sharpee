# ADR-044: Parser and Vocabulary System Gaps

Date: 2025-08-02
Status: Proposed

## Context

During implementation of the Cloak of Darkness story, we discovered that the command "hang cloak on hook" was being incorrectly parsed as VERB_NOUN pattern with directObject="cloak on hook" instead of VERB_NOUN_PREP_NOUN pattern. Investigation revealed that prepositions are never registered in the vocabulary system, leading to a comprehensive review of the parser implementation.

## Current State Analysis

### 1. Vocabulary Registration Gaps

The vocabulary system currently registers:
- Verbs (via `registerVerbs()`)
- Directions (via `registerDirections()`)
- Special words: pronouns, articles, "all" words, "except" words (via `registerSpecial()`)

Missing vocabulary types:
- **Prepositions** - Defined in lang-en-us but no registration method
- **Determiners** - Beyond articles (some, any, each, every)
- **Conjunctions** - For compound commands (and, then)
- **Numbers** - Both digits and words (1, 2, one, two)
- **Common nouns** - For better tokenization hints

### 2. Pattern Matching Limitations

Current patterns:
- VERB_ONLY ("look")
- VERB_NOUN ("take sword")
- VERB_NOUN_PREP_NOUN ("put sword in chest")
- DIRECTION_ONLY ("north")

Missing patterns common in IF:
- VERB_PREP_NOUN ("look at mirror", "sit on chair")
- VERB_NOUN_NOUN ("give guard sword", "show ticket to conductor")
- VERB_STRING ("say hello", 'write "help" on paper')
- VERB_ADV ("look carefully", "search thoroughly")
- Complex patterns with multiple prepositions

### 3. Grammar System Architecture

Current approach:
- Hardcoded pattern matching in `tryStandardPatterns()`
- Fixed confidence scores
- No pattern priority system
- No extensibility for story-specific patterns

### 4. Tokenization Limitations

- No quoted string support
- No number recognition
- Limited compound word handling
- No abbreviation expansion beyond simple dictionary lookup

### 5. Disambiguation and Error Handling

- No disambiguation when multiple objects match
- Generic error messages
- No partial matching or suggestions
- No pronoun resolution system

## Decision Drivers

1. **Correctness** - Parser should handle common IF commands correctly
2. **Extensibility** - Stories should be able to define custom patterns
3. **Performance** - Vocabulary lookup and pattern matching should be efficient
4. **Debuggability** - Clear platform events and error messages
5. **Compatibility** - Don't break existing functionality

## Considered Options

### Option 1: Minimal Fix (Prepositions Only)

Add preposition registration to fix immediate issue.

**Pros:**
- Quick fix for Cloak of Darkness
- Low risk
- Minimal changes

**Cons:**
- Doesn't address other gaps
- Technical debt accumulation
- Will need revisiting

### Option 2: Complete Vocabulary System

Add registration methods for all missing word types.

**Pros:**
- Comprehensive vocabulary coverage
- Better tokenization accuracy
- Foundation for better parsing

**Cons:**
- Larger change
- Need to update multiple packages
- More testing required

### Option 3: Grammar Rules Engine

Replace hardcoded patterns with a declarative grammar system.

**Pros:**
- Extensible by stories
- Industry standard approach (like Inform 7)
- Cleaner architecture

**Cons:**
- Major refactoring
- Performance implications
- Learning curve

### Option 4: Phased Approach

Phase 1: Fix critical gaps (prepositions, basic patterns)
Phase 2: Add grammar rules system
Phase 3: Advanced features (disambiguation, etc.)

**Pros:**
- Immediate fixes for blocking issues
- Gradual improvement
- Lower risk

**Cons:**
- Multiple migration steps
- Temporary solutions

## Decision

**Option 3: Grammar Rules Engine**

We will implement a comprehensive grammar rules engine that replaces the hardcoded pattern matching with a declarative, extensible system. This approach provides the flexibility needed for complex interactive fiction while maintaining performance and debuggability.

### Rationale for Option 3:

1. **Immediate fix included**: The grammar engine will naturally handle prepositions and other missing vocabulary as part of pattern definitions
2. **Future-proof**: Extensible architecture that can grow with the platform
3. **Author-friendly**: Stories can define custom grammar patterns
4. **Standards-based**: Similar to proven IF systems but with modern JS/TS idioms
5. **Clean architecture**: Removes hardcoded patterns from parser implementation

### Implementation Approach:

We'll still use a phased approach but within the context of building the grammar engine:

**Phase 1 - Core Grammar Engine (Immediate)**
- Grammar rule definition and compilation
- Pattern matching engine
- Basic patterns (VERB, VERB_NOUN, VERB_NOUN_PREP_NOUN)
- Vocabulary registration for all word types
- Integration with existing parser

**Phase 2 - Advanced Patterns (Near-term)**
- Complex patterns (VERB_PREP_NOUN, VERB_NOUN_NOUN)
- Scope integration (see ADR-045)
- Pattern priorities and scoring
- Story-specific grammar registration

**Phase 3 - Advanced Features (Future)**
- Disambiguation system
- Quoted strings and special tokens
- Pronoun resolution
- Grammar debugging tools

## Implementation Details

### Core Grammar Engine Architecture

```typescript
// Grammar Builder API
interface GrammarBuilder {
  define(pattern: string): PatternBuilder;
}

interface PatternBuilder {
  where(slot: string, constraint: Constraint | ConstraintBuilder): PatternBuilder;
  mapsTo(action: string): PatternBuilder;
  withPriority(priority: number): PatternBuilder;
  build(): GrammarRule;
}

// Pattern syntax: 'verb :slot1 prep|prep|prep :slot2'
// Examples:
//   'take :item'
//   'put :item in|into|inside :container'
//   'give :item to :recipient'
//   'look at|examine :target'

// Constraint types
type Constraint = 
  | PropertyConstraint     // { portable: true }
  | FunctionConstraint    // (entity) => boolean
  | ScopeConstraint;      // scope => scope.visible()

// Grammar compilation result
interface CompiledPattern {
  tokens: PatternToken[];
  slots: Map<string, SlotDefinition>;
  action: string;
  priority: number;
}
```

### Vocabulary System Extensions

All vocabulary types will be properly registered:

1. **Prepositions** - Spatial, temporal, logical relationships
2. **Determiners** - Quantifiers beyond articles
3. **Conjunctions** - For compound commands
4. **Numbers** - Both digits and words
5. **Special tokens** - Quotes, punctuation with meaning

### Phase 2 Structure:

The grammar rules engine will use a builder pattern that feels natural to JavaScript/TypeScript developers:

```typescript
// Grammar builder API
grammar
  .define('put :item in|into|inside :container')
  .where('item', { portable: true })
  .where('container', { kind: 'container', open: true })
  .mapsTo('putting');

grammar
  .define('look at|examine :target from :location')
  .where('target', scope => scope
    .visible()
    .orExplicitly(['bulldozer', 'mountain'])  // Entity IDs
  )
  .where('location', { kind: 'room' })
  .mapsTo('examining');

// Complex scope with functions
grammar
  .define('unlock :door with :key')
  .where('door', scope => scope
    .nearby()
    .matching({ locked: true })
    .kind('door')
  )
  .where('key', scope => scope
    .carried()
    .matching(key => key.unlocks === ':door')  // Reference other slots
  )
  .mapsTo('unlocking');
```

This compiles to internal rules:

```typescript
interface CompiledGrammarRule {
  id: string;
  pattern: string;  // Tokenized pattern
  slots: Map<string, SlotConstraint>;
  priority: number;
  action: string;
}

interface SlotConstraint {
  name: string;
  scopeRules: ScopeRule[];  // See ADR-045
  validators: ((entity: Entity, context: Context) => boolean)[];
}
```

Key benefits:
- Familiar builder pattern for JS/TS developers
- `:slot` syntax from Express/routing libraries
- Compiles to entity IDs for stdlib compatibility
- Integrates with scope system (ADR-045)

## Consequences

### Positive:
- Cloak of Darkness "hang" command will work
- Better parser accuracy overall
- Foundation for more sophisticated parsing
- Stories can extend grammar (Phase 2)

### Negative:
- Multiple packages need updating
- Potential performance impact (mitigated by indexing)
- More complex codebase

### Risks:
- Breaking existing parsing behavior
- Performance degradation
- Increased maintenance burden

## Mitigation:
- Comprehensive test suite
- Performance benchmarks
- Platform events for debugging
- Gradual rollout

## References
- Issue: Cloak of Darkness "hang cloak on hook" parsing failure
- Prior ADRs: ADR-025 (Parser Abstraction), ADR-027 (Vocabulary System)
- Inform 7 grammar system for inspiration
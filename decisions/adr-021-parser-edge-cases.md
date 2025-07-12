# ADR-021: Parser Edge Cases and Complex Command Support

Date: 2024-01-09
Status: Proposed

## Context

Interactive fiction has a rich history of complex parsing patterns that players have come to expect or enjoy experimenting with. These include:

- Multiple commands in one input ("take the lamp then go north")
- Exceptions and filtering ("take all but the snake")
- Article-based disambiguation ("a" vs "the")
- Ordinal references ("examine the second door")
- Complex preposition binding ("look under the rug with the lamp")
- Compound actions ("take the gold and silver coins")
- Contextual references ("take it", "look at them")

Currently, the parser strips articles and provides basic command parsing. We need to decide how sophisticated our parser should be.

## Decision Drivers

- Player expectations from classic IF
- Architectural principle of "no virtual machine"
- Query-able world model design
- Event-driven architecture
- Debugging and testing complexity
- Author experience

## Considered Options

### Option 1: Simple Parser (Current State)
- Strip noise words (articles, etc.)
- Support basic patterns only
- Let world model handle all complexity

**Pros:**
- Simple to implement and test
- Predictable behavior
- Fast parsing
- Easy to debug

**Cons:**
- Missing classic IF features
- May frustrate experienced players
- Limits narrative possibilities

### Option 2: Full Parser Intelligence
- Preserve all input details
- Support all classic patterns
- Complex grammar rules

**Pros:**
- Supports all classic IF patterns
- Delights experienced players
- Maximum flexibility

**Cons:**
- Complex implementation
- Hard to test thoroughly
- Violates "no VM" principle
- Difficult to debug

### Option 3: Structured Parsing with Metadata (Recommended)
- Preserve articles and structure
- Add metadata about parsing decisions
- Let validator/world model use metadata for resolution

**Pros:**
- Supports classic patterns
- Maintains separation of concerns
- Preserves debugging information
- Extensible

**Cons:**
- More complex than Option 1
- Requires coordination between components

## Decision

We will implement **Option 3: Structured Parsing with Metadata**.

The parser will:
1. Preserve articles and other "noise" words
2. Add metadata about what it found (hasDefiniteArticle, hasIndefiniteArticle, etc.)
3. Support basic multi-command splitting (by "then", "and then", periods)
4. Mark ordinals and special words
5. Preserve original text for debugging

The validator will:
1. Use metadata hints for disambiguation
2. Handle "all but X" patterns
3. Process ordinal references
4. Track context for article interpretation

## Implementation Details

### Enhanced ParsedCommand Structure
```typescript
interface ParsedCommand {
  rawInput: string;
  action: string;
  directObject?: {
    text: string;              // "the red ball"
    candidates: string[];      // ["red", "ball"]
    modifiers: string[];      // ["red"]
    metadata: {
      hasDefiniteArticle?: boolean;   // "the"
      hasIndefiniteArticle?: boolean; // "a/an"
      ordinal?: number;              // "second"
      quantifier?: string;           // "all", "every"
      exceptions?: string[];         // "but X", "except Y"
    }
  };
  // ... rest of structure
}
```

### Supported Patterns

Phase 1 (Core):
- Article preservation ("take the ball" vs "take a ball")
- Basic ordinals ("take the first key")
- Simple exceptions ("take all but the lamp")
- It/them references

Phase 2 (Enhanced):
- Multi-command ("take lamp then go north")
- Complex exceptions ("all but the red and blue balls")
- Compound objects ("take the gold and silver coins")

Phase 3 (Advanced):
- Implicit actions ("north" → "go north")
- Complex preposition binding
- Conversational patterns ("ask guard about the key")

## Consequences

### Positive
- Supports player expectations from classic IF
- Enables rich command possibilities
- Maintains clean architecture
- Preserves debugging information
- Articles become available for disambiguation

### Negative
- Parser becomes more complex
- More test cases needed
- Coordination required between parser and validator
- Some edge cases may still surprise players

### Neutral
- Authors need to understand what patterns are supported
- Documentation must clearly explain parsing behavior
- Test coverage must include edge cases

## Notes

- Start with Phase 1 patterns and expand based on player feedback
- Each pattern should have comprehensive tests
- Consider providing parser debugging commands for authors
- Document which classic patterns we intentionally don't support

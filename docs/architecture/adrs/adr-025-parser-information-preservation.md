# ADR-025: Parser Information Preservation

Date: 2025-07-12

## Status

Accepted

## Context

The current parser implementation has several fundamental issues:

1. **Information Loss**: Articles are filtered out, original text positions are lost, word relationships are not preserved
2. **Premature Decisions**: The parser decides what constitutes a "noun phrase" too early, before understanding the full command structure
3. **Incomplete Classification**: Not all words are properly classified (articles, adjectives, etc.)
4. **Poor Error Reporting**: Without position information, we can't show users exactly where parsing failed
5. **Limited Extensibility**: Hard to add features like pronoun resolution or complex phrases

Current parser output loses information:
```typescript
// Input: "put the red ball in the wooden box"
// Current output:
{
  directObject: {
    text: "ball",  // Lost "the red"
    candidates: ["ball"]
  }
}
```

## Decision

Redesign the parser to follow these first principles:

1. **Preserve Everything** - Every word the player typed must be preserved and accessible
2. **Identify Everything** - Every word should be classified by part of speech
3. **Track Positions** - Maintain original position of every token
4. **Build Structure** - Group words into meaningful phrases without losing detail
5. **Defer Decisions** - Don't filter or interpret, just parse and classify

New parsed command structure:
```typescript
interface ParsedCommand {
  rawInput: string;
  tokens: Token[];
  structure: {
    verb: VerbPhrase;
    directObject?: NounPhrase;
    preposition?: PrepPhrase;
    indirectObject?: NounPhrase;
  };
  pattern: string;  // Which grammar pattern matched
  confidence: number;
}

interface Token {
  word: string;
  normalized: string;
  position: number;      // Character position in input
  length: number;
  partOfSpeech: PartOfSpeech[];  // Can have multiple interpretations
  candidates: TokenCandidate[];
}

interface NounPhrase {
  tokens: number[];      // Indices into token array
  text: string;         // Original text "the red ball"
  head: string;         // Head noun "ball"
  modifiers: string[];  // ["red"]
  articles: string[];   // ["the"]
  determiners: string[]; // ["all", "every"]
}
```

## Implementation Approach

1. **Tokenization Phase**
   - Split input into tokens
   - Preserve position and length
   - Look up all possible interpretations

2. **Classification Phase**
   - Identify part of speech for each token
   - Allow multiple classifications per token
   - Don't filter anything

3. **Structure Building Phase**
   - Match against grammar patterns
   - Group tokens into phrases
   - Preserve all relationships

4. **Output Phase**
   - Return rich structure with all information
   - Let validator/actions decide what to use

## Consequences

### Positive
- Complete information preservation
- Better debugging and error messages
- Foundation for advanced features (pronouns, complex phrases)
- Cleaner separation of concerns
- More testable components

### Negative
- Breaking change to ParsedCommand interface
- Need to update validator to handle new structure
- Test suite needs significant updates
- Slightly more complex data structure

## Migration Impact

### Must Update:
- `ParsedCommand` interface in world-model
- `BasicParser` implementation
- `CommandValidator` to read new structure
- All parser tests
- Some validator tests

### No Changes Needed:
- Action implementations (work with ValidatedCommand)
- World model
- Language providers
- Core engine

## Examples

### Example 1: Articles Preserved
```typescript
// Input: "take the ball"
{
  tokens: [
    { word: "take", partOfSpeech: [VERB] },
    { word: "the", partOfSpeech: [ARTICLE] },
    { word: "ball", partOfSpeech: [NOUN] }
  ],
  structure: {
    verb: { tokens: [0], text: "take" },
    directObject: {
      tokens: [1, 2],
      text: "the ball",
      head: "ball",
      articles: ["the"]
    }
  }
}
```

### Example 2: Complex Noun Phrases
```typescript
// Input: "put all the small red balls in the first wooden box"
{
  structure: {
    directObject: {
      text: "all the small red balls",
      head: "balls",
      modifiers: ["small", "red"],
      articles: ["the"],
      determiners: ["all"]
    },
    indirectObject: {
      text: "the first wooden box",
      head: "box",
      modifiers: ["first", "wooden"],
      articles: ["the"]
    }
  }
}
```

## Related

- ADR-003: Internal parser types
- ADR-004: Parser validation separation
- ADR-021: Parser edge cases

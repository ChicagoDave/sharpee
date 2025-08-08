# Parser Refactor Implementation Prompt

## Context

You are continuing work on the Sharpee Interactive Fiction Platform. In the previous session, we:

1. Implemented a capability-segregated data model (ADR-024)
2. Updated the scoring action to use capabilities
3. Fixed scoring tests
4. Discovered parser issues that need fundamental fixes
5. Created ADR-025 for parser information preservation

## Current State

The parser has these failing tests:
- Multi-word noun parsing ("put ball in box" incorrectly parsed)
- Article handling (articles being stripped from text)
- Pattern matching too permissive ("take in box" accepted)
- Error type casing issues
- Compound preposition handling ("look at" not mapping correctly)

## Your Task

Implement ADR-025 to redesign the parser following these principles:

1. **Preserve Everything** - Keep all words, positions, and relationships
2. **Identify Everything** - Classify every token by part of speech
3. **Build Rich Structure** - Create detailed phrase structures
4. **No Information Loss** - Original text must be recoverable

## Implementation Order

1. Start with updating the `ParsedCommand` interface in `packages/world-model/src/commands/parsed-command.ts`
2. Update parser interfaces in world-model
3. Rewrite `BasicParser` in `packages/stdlib/src/parser/basic-parser.ts`
4. Update `CommandValidator` to handle the new structure
5. Fix all tests

## Key Files

- `/decisions/adr-025-parser-information-preservation.md` - The design
- `/decisions/parser-refactor-checklist.md` - Step-by-step checklist
- `/logs/test-stdlib-20250712-142947.log` - Current test failures

## Design Example

The new parser should transform:
```
"put the red ball in the wooden box"
```

Into:
```typescript
{
  rawInput: "put the red ball in the wooden box",
  tokens: [
    { word: "put", position: 0, partOfSpeech: [VERB] },
    { word: "the", position: 4, partOfSpeech: [ARTICLE] },
    { word: "red", position: 8, partOfSpeech: [ADJECTIVE] },
    { word: "ball", position: 12, partOfSpeech: [NOUN] },
    // etc...
  ],
  structure: {
    verb: { tokens: [0], text: "put" },
    directObject: {
      tokens: [1, 2, 3],
      text: "the red ball",
      head: "ball",
      modifiers: ["red"],
      articles: ["the"]
    },
    preposition: { tokens: [4], text: "in" },
    indirectObject: {
      tokens: [5, 6, 7],
      text: "the wooden box",
      head: "box",
      modifiers: ["wooden"],
      articles: ["the"]
    }
  }
}
```

## Important Notes

- We're NOT worried about backward compatibility
- The validator still needs to work with the new structure
- Actions don't need to change (they use ValidatedCommand)
- Focus on information preservation over performance

Begin by examining the current `ParsedCommand` interface and proposing the new structure.

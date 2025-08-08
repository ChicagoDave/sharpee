# Parser Refactor Summary

Date: 2025-07-12

## Overview

Implemented ADR-025 to redesign the parser with full information preservation. The new parser maintains all tokens, positions, and grammatical structure while remaining backward compatible.

## Key Changes

### 1. Rich Command Structure

The new `ParsedCommand` interface includes:
- **Full token array** with position tracking
- **Structured phrases** (VerbPhrase, NounPhrase, PrepPhrase)
- **Part-of-speech classification** for every token
- **Preserved articles and modifiers**
- **Pattern and confidence information**

### 2. Information Preservation

Before:
```typescript
// Input: "put the red ball in the wooden box"
{
  directObject: { text: "ball", candidates: ["ball"] },
  indirectObject: { text: "box", candidates: ["box"] }
}
```

After:
```typescript
{
  tokens: [/* all tokens with positions */],
  structure: {
    verb: { tokens: [0], text: "put", head: "put" },
    directObject: {
      tokens: [1, 2, 3],
      text: "the red ball",
      head: "ball",
      modifiers: ["red"],
      articles: ["the"],
      candidates: ["ball"]
    },
    preposition: { tokens: [4], text: "in" },
    indirectObject: {
      tokens: [5, 6, 7],
      text: "the wooden box",
      head: "box",
      modifiers: ["wooden"],
      articles: ["the"],
      candidates: ["box"]
    }
  },
  pattern: "VERB_NOUN_PREP_NOUN",
  confidence: 0.7
}
```

### 3. Compound Verb Support

The parser now properly recognizes compound verbs from the language provider:
- "look at" → examining action
- "pick up" → taking action
- "put down" → dropping action

### 4. Backward Compatibility

The new parser maintains compatibility by:
- Including old format fields alongside new structure
- Supporting the `parseWithErrors` method
- Preserving the tokenize interface
- Handling both old and new formats in the validator

## Architecture Improvements

1. **Multi-phase parsing**:
   - Tokenization (with positions)
   - Part-of-speech classification
   - Pattern matching
   - Structure building

2. **Better error handling**:
   - Position information for errors
   - Unknown word detection
   - Invalid pattern rejection

3. **Language abstraction**:
   - Compound verbs from LanguageProvider
   - No hardcoded English patterns
   - Foundation for ADR-026 (language-specific parsers)

## Testing

All parser tests updated to verify:
- Position tracking works correctly
- Articles are preserved
- Compound verbs are recognized
- Invalid patterns are rejected
- Multi-word nouns handled properly

## Next Steps

1. Implement ADR-026 for language-specific parsers
2. Add more sophisticated noun phrase parsing
3. Implement pronoun resolution
4. Add parse tree visualization for debugging

## Breaking Changes

None for external consumers. The parser maintains backward compatibility while adding the new rich structure.

## Files Modified

- `/packages/world-model/src/commands/parsed-command.ts` - New interfaces
- `/packages/stdlib/src/parser/basic-parser.ts` - Rewritten implementation
- `/packages/stdlib/src/parser/parser-internals.ts` - Updated error types
- `/packages/stdlib/src/validation/command-validator.ts` - Handle both formats
- Test files updated for new structure

## Performance

The new parser has similar performance characteristics:
- Tokenization: O(n) where n is input length
- Pattern matching: O(p*t) where p is patterns, t is tokens
- Overall complexity unchanged

Memory usage slightly higher due to preserving all information, but negligible for typical commands.

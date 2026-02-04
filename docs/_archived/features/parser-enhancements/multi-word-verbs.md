# Feature: Multi-Word Verb Support

**Status:** Proposed  
**Priority:** Medium  
**Effort:** Medium (2-3 days)  
**Category:** Parser Enhancement

## Overview

Add support for multi-word verbs (phrasal verbs) in the parser, allowing commands like "PICK UP", "LOOK AT", "TALK TO" to be recognized as single verb units rather than verb + preposition combinations.

## Motivation

Interactive Fiction commonly uses multi-word verbs:
- **pick up** the sword (not "pick" with preposition "up")
- **look at** the painting (not "look" with preposition "at")  
- **talk to** the guardian (not "talk" with preposition "to")
- **switch on** the light (not "switch" with preposition "on")

Currently, the parser treats these as separate tokens, which:
1. Loses semantic meaning (the verb is "pick up", not just "pick")
2. Can cause incorrect pattern matching
3. Makes it harder for action handlers to distinguish between true prepositions and verb particles

## Current Behavior

### Input: "PICK UP THE SWORD"
```
Tokens: ["pick", "up", "the", "sword"]
Parsed as: VERB("pick") + PREP("up") + NOUN("sword")
Pattern: verb_prep_noun
```

### Input: "PUT SWORD IN CHEST"  
```
Tokens: ["put", "sword", "in", "chest"]
Parsed as: VERB("put") + NOUN("sword") + PREP("in") + NOUN("chest")
Pattern: verb_noun_prep_noun
```

Both "up" and "in" are treated as prepositions, but "up" is actually part of the verb "pick up".

## Proposed Solution

### 1. Multi-Word Verb Registry

Add a registry of known multi-word verbs:
```typescript
interface MultiWordVerb {
  phrase: string[];  // ["pick", "up"]
  actionId: string;  // "if.action.taking"
  priority: number;  // For disambiguation
}
```

### 2. Enhanced Tokenization

Modify the tokenizer to recognize multi-word verbs before splitting into individual tokens:

```typescript
tokenize(input: string): Token[] {
  // First pass: identify multi-word verbs
  const multiWordTokens = this.identifyMultiWordVerbs(input);
  
  // Second pass: tokenize remaining text
  const allTokens = this.completeTokenization(input, multiWordTokens);
  
  return allTokens;
}
```

### 3. Longest Match First

When multiple matches are possible, prefer the longest:
- "LOOK AT THE PAINTING" → ["look at", "the", "painting"] ✓
- Not: ["look", "at", "the", "painting"] ✗

### 4. Vocabulary Entry Enhancement

```typescript
interface VocabularyEntry {
  word: string;          // Single word
  phrase?: string[];     // Multi-word phrase
  // ... rest of interface
}
```

## Implementation Details

### Phase 1: Data Structure Updates
1. Extend `VerbVocabulary` to support multi-word verbs
2. Update `VocabularyEntry` to handle phrases
3. Add phrase lookup to `VocabularyRegistry`

### Phase 2: Tokenizer Enhancement
1. Add pre-tokenization phase for multi-word detection
2. Implement longest-match-first algorithm
3. Handle overlapping phrases (e.g., "pick" vs "pick up")

### Phase 3: Parser Updates
1. Update pattern matching to handle multi-word verb tokens
2. Ensure backward compatibility with existing patterns
3. Add debug events for multi-word verb detection

### Phase 4: Language Provider Updates
1. Update `LanguageProvider` interface to provide multi-word verbs
2. Update `lang-en-us` to mark which verbs are multi-word
3. Add helper methods for phrase detection

## Examples

### Supported Multi-Word Verbs (English)
- pick up / put down
- look at / look in / look under
- talk to / speak with
- switch on / switch off / turn on / turn off
- go in / go out / go into
- wake up / stand up / sit down / lie down

### Expected Behavior After Implementation

**Input:** "PICK UP ALL COINS"
```
Tokens: [
  { word: "pick up", type: VERB, mapsTo: "if.action.taking" },
  { word: "all", type: SPECIAL, mapsTo: "ALL" },
  { word: "coins", type: NOUN, mapsTo: "coin" }
]
Pattern: verb_noun (with ALL modifier)
```

**Input:** "LOOK AT PAINTING CAREFULLY"
```
Tokens: [
  { word: "look at", type: VERB, mapsTo: "if.action.examining" },
  { word: "painting", type: NOUN },
  { word: "carefully", type: ADVERB }
]
Pattern: verb_noun
```

## Testing

### Unit Tests
1. Multi-word verb recognition
2. Longest match selection
3. Ambiguity resolution
4. Performance with large verb lists

### Integration Tests
1. Common IF commands with multi-word verbs
2. Edge cases (partial matches, overlaps)
3. Backward compatibility with existing stories

### Test Cases
```typescript
// Should recognize multi-word verb
expect(parser.parse("pick up sword")).toMatchObject({
  action: "if.action.taking",
  directObject: { text: "sword" }
});

// Should handle verb + actual preposition
expect(parser.parse("put sword in chest")).toMatchObject({
  action: "if.action.putting",
  directObject: { text: "sword" },
  preposition: "in",
  indirectObject: { text: "chest" }
});

// Should prefer longest match
expect(parser.parse("look at the brass lamp")).toMatchObject({
  action: "if.action.examining",  // "look at" maps to examining
  directObject: { text: "brass lamp" }
});
```

## Performance Considerations

1. **Tokenization overhead**: Pre-scanning for multi-word verbs adds a pass
2. **Memory usage**: Storing phrase variations increases vocabulary size
3. **Optimization**: Use trie or similar structure for efficient phrase matching

## Migration Path

1. Feature is backward compatible - existing single-word verbs continue to work
2. Multi-word verbs can be gradually added to vocabulary
3. Existing stories don't need changes
4. New stories can use more natural commands

## Success Criteria

1. Parser correctly identifies common multi-word verbs
2. No performance degradation for typical commands
3. Improved natural language understanding
4. Cleaner action handler code (no need to check for verb particles in preposition)

## Future Enhancements

1. **Separable phrasal verbs**: "pick the sword up" vs "pick up the sword"
2. **Three-word verbs**: "get rid of", "look forward to"
3. **Context-sensitive parsing**: Different meanings based on object
4. **Dynamic verb learning**: Learn new multi-word verbs from usage

## References

- [Phrasal Verbs in English](https://en.wikipedia.org/wiki/Phrasal_verb)
- [TADS 3 Multi-Word Verb Handling](https://www.tads.org/tads3/doc/sysman/gramprod.htm)
- [Inform 7 Grammar Lines](http://inform7.com/book/WI_17_1.html)

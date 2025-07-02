# Parser System Implementation Summary

## What We Built

### 1. Vocabulary Types (`vocabulary-types.ts`)
- **VocabularyEntry**: Core type for words in the system
- **Part of Speech enum**: VERB, NOUN, ADJECTIVE, etc.
- **VocabularyProvider interface**: For extensible vocabulary sources
- **Specialized vocabulary types**: VerbVocabulary, DirectionVocabulary, etc.
- **Grammar Patterns**: Standard IF patterns (VERB_NOUN, etc.)

### 2. Vocabulary Registry (`vocabulary-registry.ts`)
- **Central registry** for all vocabulary in the system
- **Multiple sources**: Base, extensions, stories, entities
- **Dynamic entity vocabulary**: Entities register their nouns/adjectives
- **Efficient lookup**: By word, by part of speech
- **Priority system**: For disambiguation
- **Helper methods**: registerVerbs(), registerDirections(), etc.

### 3. Parser Types (`parser-types.ts`)
- **CandidateCommand**: World-agnostic parse result
- **Token & TokenCandidate**: Lexical analysis types
- **ParseError**: Detailed error information
- **Parser interface**: Standard parser contract

### 4. Basic Parser (`basic-parser.ts`)
- **World-agnostic parsing**: No world model access
- **Grammar pattern matching**: Tries multiple patterns
- **Token analysis**: Maps words to vocabulary entries
- **Error reporting**: Unknown words, missing verbs, etc.
- **Handles**:
  - Simple commands: "take sword"
  - Adjective+noun: "take red ball"
  - Complex commands: "put sword in chest"
  - Implicit go: "north" → "go north"
  - Abbreviations: "n" → "north"

### 5. Command Resolver (`command-resolver.ts`)
- **World-aware validation**: Resolves candidates to entities
- **Ambiguity handling**: Multiple matching entities
- **Scoring system**: Prefers visible, local, recent entities
- **Auto-resolution**: Can pick best match automatically
- **Resolution tracking**: Records how ambiguities were resolved

### 6. Standard Vocabulary (`standard-english.ts`)
- **All standard IF verbs**: take, drop, examine, go, etc.
- **Directions**: north, south, up, down, etc.
- **Special words**: pronouns, articles, "all", "except"
- **Common prepositions**: in, on, at, etc.
- **Auto-registers on import**

## Architecture Flow

```
User Input
    ↓
[Basic Parser] ← [Vocabulary Registry]
    ↓
CandidateCommand (world-agnostic)
    ↓
[Command Resolver] ← [World Model]
    ↓
ParsedCommand (with resolved entities)
    ↓
[Action Executor]
```

## Key Design Decisions

1. **Parser is world-agnostic**: Can't see entities, only vocabulary
2. **Resolver handles world validation**: Separate concerns
3. **Extensible vocabulary**: Multiple sources can contribute
4. **Entity vocabulary is dynamic**: Updates as scope changes
5. **Grammar patterns**: Flexible but structured
6. **Ambiguity is first-class**: Not an error, needs resolution

## Usage Examples

```typescript
// Parse input
const candidates = basicParser.parse("take red ball");

// Resolve against world
const resolved = commandResolver.resolve(candidates[0], context);

if (Array.isArray(resolved)) {
  // Handle ambiguities
  console.log("Which do you mean?", resolved);
} else {
  // Execute command
  const { command } = resolved;
  actionExecutor.execute(command);
}
```

## Vocabulary Registration

```typescript
// Entities register their vocabulary
vocabularyRegistry.registerEntity({
  entityId: 'magic-sword',
  nouns: ['sword', 'blade'],
  adjectives: ['magic', 'glowing'],
  inScope: true
});

// Extensions add domain vocabulary
vocabularyRegistry.registerProvider({
  id: 'cooking-extension',
  getVocabulary: () => [
    { word: 'cook', partOfSpeech: PartOfSpeech.VERB, mapsTo: 'COOK' },
    { word: 'fry', partOfSpeech: PartOfSpeech.VERB, mapsTo: 'COOK' }
  ]
});
```

## Next Steps

1. **Create command executor** to tie parser → actions
2. **Implement text generator** (Priority 3)
3. **Build game loop** (Priority 4)
4. **Handle compound commands** ("take sword and shield")
5. **Add pronoun resolution** ("take it")

The parser system is now complete and ready for integration!

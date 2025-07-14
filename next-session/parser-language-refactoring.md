# Parser and Language Architecture Refactoring

## Context

We've identified a fundamental design flaw in the Sharpee Interactive Fiction Platform regarding parts of speech and language handling:

1. **Parts of Speech are currently in wrong places**: 
   - `PartOfSpeech` enum exists in both `@sharpee/stdlib` and `@sharpee/world-model`
   - These enums are incompatible (different values)
   - Parser has to map between them (code smell)

2. **Parts of Speech are language-specific**:
   - English has articles, Japanese has particles
   - Turkish has postpositions, Finnish has 15 cases
   - Current design is English-centric

3. **Using enums violates ADR-006**:
   - We decided to use const objects instead of enums
   - Enums aren't tree-shakeable, have runtime overhead

## Current State

```typescript
// stdlib has:
export const PartOfSpeech = {
  VERB: 'verb',
  NOUN: 'noun',
  ADJECTIVE: 'adjective',
  PREPOSITION: 'preposition',
  ARTICLE: 'article',
  PRONOUN: 'pronoun',
  DIRECTION: 'direction',
  SPECIAL: 'special'
} as const;

// world-model has:
export enum PartOfSpeech {
  VERB = 'VERB',
  NOUN = 'NOUN',
  ADJECTIVE = 'ADJECTIVE',
  ARTICLE = 'ARTICLE',
  PREPOSITION = 'PREPOSITION',
  PRONOUN = 'PRONOUN',
  DETERMINER = 'DETERMINER',
  CONJUNCTION = 'CONJUNCTION',
  UNKNOWN = 'UNKNOWN'
}
```

## Proposed Solution

1. **Move parts of speech to language packages** where they belong
2. **Make ParsedCommand language-agnostic** in world-model
3. **Each parser uses its own language's grammar types**
4. **Use const objects, not enums** (per ADR-006)

## Tasks

### 1. Create grammar types in lang-en-us

Create `packages/lang-en-us/src/grammar.ts`:
```typescript
export const EnglishPartsOfSpeech = {
  VERB: 'verb',
  NOUN: 'noun',
  ADJECTIVE: 'adjective',
  ARTICLE: 'article',
  PREPOSITION: 'preposition',
  PRONOUN: 'pronoun',
  DETERMINER: 'determiner',
  CONJUNCTION: 'conjunction',
  INTERJECTION: 'interjection',
  DIRECTION: 'direction'
} as const;

export type EnglishPartOfSpeech = typeof EnglishPartsOfSpeech[keyof typeof EnglishPartsOfSpeech];
```

### 2. Update world-model types to be language-agnostic

Update `packages/world-model/src/commands/parsed-command.ts`:
- Remove the PartOfSpeech enum
- Make Token interface language-agnostic (no partOfSpeech field)
- Add optional languageData field for language-specific information

### 3. Update parser-en-us

- Import grammar types from lang-en-us
- Use EnglishPartOfSpeech internally
- Store language-specific data in metadata/languageData fields

### 4. Remove PartOfSpeech from stdlib

- Delete the vocabulary PartOfSpeech const
- Update vocabulary types to use strings or language-specific types

### 5. Update tests

- Fix any tests that depend on the old PartOfSpeech enums
- Ensure parser tests work with new structure

## Benefits

1. **Proper separation**: Grammar belongs with language
2. **Language independence**: Each language defines its own parts of speech
3. **No more mapping**: Parsers use their own types directly
4. **Follows standards**: Const objects instead of enums
5. **Future-proof**: Easy to add new languages with different grammar

## Questions to Resolve

1. Should we keep any grammar info in ParsedCommand or make it purely structural?
2. How should the validator work without knowing parts of speech?
3. Should we create a migration ADR (ADR-029) for this change?

## Files to Change

- `packages/lang-en-us/src/grammar.ts` (new)
- `packages/lang-en-us/src/index.ts` (export grammar)
- `packages/world-model/src/commands/parsed-command.ts`
- `packages/stdlib/src/parser/vocabulary-types.ts`
- `packages/parser-en-us/src/english-parser.ts`
- Tests in parser-en-us and engine

## Success Criteria

1. No PartOfSpeech enums anywhere
2. Parts of speech defined in language packages
3. Parser works without mapping between incompatible types
4. All tests pass
5. Design supports non-English languages properly

---

Please proceed with this refactoring, creating the grammar types in lang-en-us first, then updating world-model to be language-agnostic, and finally updating the parser to use the new structure.

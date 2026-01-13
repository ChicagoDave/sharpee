# ADR-093: I18N-Aware Entity Vocabulary and Adjective Disambiguation

## Status: DRAFT

## Date: 2026-01-12

## Context

### The Problem

When parsing "press yellow button", the system cannot disambiguate between multiple buttons because:

1. **IdentityTrait has no `adjectives` field** - entities can only define `name` and `aliases`
2. **Parser doesn't extract modifiers** - "yellow button" becomes `{text: "yellow button", head: "button", modifiers: []}`
3. **VocabularyRegistry registers empty adjectives** - `updateEntityVocabulary()` hard-codes `adjectives: []`
4. **CommandValidator looks for non-existent field** - `getEntityAdjectives()` reads `identity.adjectives` which doesn't exist

### The Deeper Problem: Language Coupling

Current entity definitions bake English strings directly into traits:

```typescript
// WRONG: English strings in entity definition
yellowButton.add(new IdentityTrait({
  name: 'yellow button',           // English
  aliases: ['button', 'danger button'],  // English
}));
```

This means:
- Stories must be rewritten for each language
- Parser vocabulary and entity definitions are duplicated
- No separation between semantic identity and localized text

### What Should Happen

Entity definitions should be **language-agnostic**. The language layer should provide all localized text:

```typescript
// Entity defines SEMANTIC properties (no English)
yellowButton.add(new IdentityTrait({
  semanticId: 'maintenance-room.yellow-button',
  adjectives: ['color:yellow'],  // Semantic categories
  nouns: ['button'],             // Semantic categories
}));

// lang-en-us provides localized vocabulary
vocabulary.register({
  entityId: 'maintenance-room.yellow-button',
  words: [
    { word: 'yellow', category: 'color:yellow', partOfSpeech: 'adjective' },
    { word: 'button', category: 'button', partOfSpeech: 'noun' },
    { word: 'danger button', partOfSpeech: 'noun' }
  ],
  displayName: 'yellow button',
  article: 'a'
});

// lang-es provides Spanish vocabulary
vocabulary.register({
  entityId: 'maintenance-room.yellow-button',
  words: [
    { word: 'amarillo', category: 'color:yellow', partOfSpeech: 'adjective' },
    { word: 'boton', category: 'button', partOfSpeech: 'noun' },
  ],
  displayName: 'boton amarillo',
  article: 'el'
});
```

## Decision

### Phase 1: Add Adjectives to Current System (Immediate Fix)

Minimal changes to unblock button disambiguation:

1. **Add `adjectives` field to IdentityTrait**
   ```typescript
   export class IdentityTrait {
     adjectives: string[] = [];  // NEW
   }
   ```

2. **Update `updateEntityVocabulary()` to read adjectives**
   ```typescript
   vocabularyRegistry.registerEntity({
     entityId: entity.id,
     nouns: nouns,
     adjectives: identity.adjectives || [],  // READ FROM TRAIT
     inScope
   });
   ```

3. **Parser extracts modifiers from noun phrases**
   - "yellow button" → `{head: "button", modifiers: ["yellow"]}`
   - CommandValidator matches modifiers against entity adjectives

### Phase 2: Semantic Entity Vocabulary (Future)

Full i18n-aware architecture:

1. **IdentityTrait becomes language-agnostic**
   ```typescript
   export class IdentityTrait {
     semanticId: string;           // Unique identifier for language lookup
     semanticNouns: string[];      // Category tags: ['button', 'control']
     semanticAdjectives: string[]; // Category tags: ['color:yellow', 'material:metal']
   }
   ```

2. **Language layer provides all text**
   - Display names, articles, descriptions
   - Vocabulary words mapped to semantic categories
   - Parser uses language-specific vocabulary

3. **VocabularyRegistry bridges semantic → localized**
   - Registers localized words that map to semantic categories
   - Parser matches input against localized vocabulary
   - Resolution uses semantic categories for disambiguation

## Flow After Implementation

```
Input: "press yellow button"
    ↓
Parser tokenizes → ["press", "yellow", "button"]
    ↓
VocabularyRegistry lookup:
  - "press" → verb
  - "yellow" → adjective, mapsTo entity i0p (via category 'color:yellow')
  - "button" → noun, mapsTo entities [i0p, i0q, i0r, i0s]
    ↓
EntitySlotConsumer:
  - Consumes "yellow button"
  - Sets head="button", modifiers=["yellow"]
  - Or directly resolves via vocabulary registry
    ↓
CommandValidator:
  - Finds entities with noun "button": [yellowBtn, brownBtn, redBtn, blueBtn]
  - Scores by adjective match: "yellow" matches yellowBtn.adjectives
  - Returns yellowBtn as resolved entity
```

## Consequences

### Positive
- Disambiguation works for "yellow button", "red ball", etc.
- Stories can be localized without rewriting entity definitions
- Parser vocabulary and entity vocabulary are unified
- Clear separation: entities define semantics, language defines words

### Negative
- Breaking change to IdentityTrait (Phase 1)
- Significant refactor for full i18n (Phase 2)
- Existing stories need migration

### Migration Path

**Phase 1 (backward compatible):**
- `adjectives` field is optional, defaults to `[]`
- Existing stories work unchanged
- New stories can use adjectives for disambiguation

**Phase 2 (breaking):**
- Provide migration script to extract English from IdentityTrait
- Generate lang-en-us vocabulary from existing entity definitions
- Update IdentityTrait to semantic-only fields

## Related ADRs

- ADR-017: Disambiguation
- ADR-037: Parser Language Provider
- ADR-038: Language-Agnostic Actions
- ADR-044: Parser Vocabulary Gaps
- ADR-048: Static Language Architecture

## Open Questions

1. Should semantic adjectives use a taxonomy (color:yellow) or flat strings (yellow)?
2. How do we handle adjectives that vary by entity (a "small" elephant vs "small" ant)?
3. Should vocabulary registration be automatic from IdentityTrait or explicit?

# Work Summary: ADR-082 Vocabulary-Constrained Slots

**Date:** 2026-01-01 15:00
**Branch:** dungeo
**Focus:** Designing grammar system enhancement for vocabulary-based slot matching

## Problem

The Inside Mirror puzzle requires `push red panel` commands where "red" and "panel" are vocabulary words, not entities. The current grammar system only supports:
- Entity resolution (fails if entity not found/is scenery)
- Raw text capture (no vocabulary validation)

This blocks the Inside Mirror puzzle and limits future puzzle designs.

## Solution: ADR-082

Created comprehensive ADR proposing vocabulary-constrained grammar slots:

### Phase 1: Simple Vocabulary Slots
```typescript
grammar
  .define('push :color :surface')
  .adjective('color')   // Match against languageProvider.getAdjectives()
  .noun('surface')      // Match against languageProvider.getNouns()
  .mapsTo('dungeo.action.push_panel')
  .build();
```

### Phase 2: Noun Phrase Slots
```typescript
// "put orange ball in blue slot"
grammar
  .define('put :item in :container')
  .nounPhrase('item')      // [adjective]* noun
  .nounPhrase('container')
  .build();
```

### Phase 3: Hybrid Resolution
Optional entity resolution with vocabulary fallback.

## Key Design Decisions

1. **New SlotType values:** ADJECTIVE, NOUN, ADVERB, PREPOSITION, NOUN_PHRASE
2. **New IParsedCommand field:** `vocabularySlots: Map<string, VocabularyMatch>`
3. **Story registration:** Stories add vocabulary via `language.addAdjectives()` etc.
4. **Separate from entities:** Vocabulary slots don't attempt entity resolution

## Files Created

- `docs/architecture/adrs/adr-082-vocabulary-constrained-slots.md`

## Investigation Files (to be cleaned up)

From earlier push-panel investigation:
- `packages/parser-en-us/tests/push-panel-pattern.test.ts`
- `packages/parser-en-us/tests/push-panel-with-core.test.ts`
- `docs/work/dungeo/context/2026-01-01-1400-push-panel-investigation.md`

## Next Steps

1. Create `vocabulary-slots` branch from dungeo
2. Implement Phase 1 in `packages/if-domain/src/grammar/grammar-builder.ts`
3. Implement matching in `packages/parser-en-us/src/english-grammar-engine.ts`
4. Update Dungeo push-panel to use new vocabulary slots
5. Test with Inside Mirror puzzle

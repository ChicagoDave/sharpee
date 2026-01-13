# Session Summary: Dam Map Fixes and Adjective Disambiguation Discovery

**Date:** 2026-01-12 19:30
**Branch:** dungeo
**Focus:** Dam puzzle debugging, entity vocabulary architecture

## Work Completed

### 1. Dam Region Map Connection Fixes

Fixed incorrect map connections in `stories/dungeo/src/regions/dam.ts`:
- **Dam**: Changed N→Reservoir South (wrong) to N→Dam Lobby (correct)
- **Deep Canyon**: Fixed NW→Reservoir South, E→Dam connections
- **Reservoir South**: Fixed UP→Deep Canyon, N→Reservoir, W→Stream View
- **Reservoir North**: Fixed N→Atlantis Room (was pointing to Stream View)
- Added `connectStreamViewToGlacier` function
- Removed dead `connectDamToTemple` function

Result: 17/20 dam-drain transcript tests now pass (map navigation works).

### 2. Build Error Fixes

Fixed multiple TypeScript errors after map refactoring:
- Removed `setTurnBoltScheduler` call and imports (dead code)
- Updated dam message IDs from `DAM_DRAINING/NEARLY_EMPTY/EMPTY` to `DAM_GATES_OPEN/CLOSE`
- Fixed AuthorModel imports in `bank-of-zork.ts` and `round-room.ts` (engine → world-model)
- Rewrote `death-penalty-handler.ts` to use Effects system (ADR-075)

### 3. Button Disambiguation Investigation

Investigated why "press yellow button" fails with ENTITY_NOT_FOUND:
- Parser extracts head noun "button" from "yellow button"
- CommandValidator searches for entities, needs adjectives for disambiguation
- **Root cause discovered**: Adjective system exists but is not wired up

### 4. ADR-093: I18N-Aware Entity Vocabulary

Created architectural decision record documenting:
- Current broken state of adjective disambiguation
- Why IdentityTrait with English strings is wrong for i18n
- Phase 1: Quick fix (add adjectives to IdentityTrait)
- Phase 2: Full i18n (semantic IDs + language layer vocabulary)

## Key Discovery: Broken Adjective Pipeline

The vocabulary system has all the pieces but nothing is connected:

1. **IdentityTrait** - has `aliases` but no `adjectives` field
2. **VocabularyRegistry** - supports EntityVocabulary with adjectives, but...
3. **GameEngine.updateEntityVocabulary()** - hard-codes `adjectives: []`
4. **Parser EntitySlotConsumer** - doesn't extract modifiers from noun phrases
5. **CommandValidator.getEntityAdjectives()** - reads non-existent `identity.adjectives`

Result: "yellow button" → finds all buttons → no adjective match → ENTITY_NOT_FOUND

## Files Changed

### Modified
- `stories/dungeo/src/regions/dam.ts` - map connections, button aliases
- `stories/dungeo/src/index.ts` - imports, message registrations
- `stories/dungeo/src/actions/index.ts` - removed dead scheduler code
- `stories/dungeo/src/handlers/death-penalty-handler.ts` - Effects system
- `stories/dungeo/src/regions/bank-of-zork.ts` - AuthorModel import
- `stories/dungeo/src/regions/round-room.ts` - AuthorModel import

### Created
- `docs/architecture/adrs/adr-093-i18n-entity-vocabulary.md`

## Test Results

Dam-drain transcript: 17 passed, 3 failed
- PASS: All map navigation tests
- PASS: Reservoir blocking when flooded
- FAIL: "press yellow button" (adjective disambiguation)
- FAIL: "turn bolt" (depends on yellow button)
- FAIL: Walk through drained reservoir (depends on bolt)

## Next Steps

1. **Implement ADR-093 Phase 1** - Add adjectives to IdentityTrait
2. **Update GameEngine** - Read adjectives in updateEntityVocabulary()
3. **Update Parser** - Extract modifiers from noun phrases
4. **Test** - Verify button disambiguation works

## Decisions Made

- Adjective disambiguation is a platform issue, not story issue
- Need i18n-aware design to avoid redoing for Spanish/other languages
- Phase 1 quick fix acceptable, with Phase 2 for proper architecture

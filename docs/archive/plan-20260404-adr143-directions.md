# Plan: ADR-143 — Location-Relative Direction Vocabularies

## Goal

Enable authors to replace compass direction words (north/south/east/west) with alternative vocabularies (fore/aft/port/starboard) from a single configuration point. No editing parser, grammar, and language layer separately.

## Architecture

The direction system has 3 touch points today:
1. **Parser input** (`parser-en-us/direction-mappings.ts`): word → Direction constant
2. **Grammar patterns** (`parser-en-us/grammar.ts` via `if-domain/grammar-engine.ts`): alias patterns
3. **Display output** (`parser-en-us/direction-mappings.ts` `getDirectionWord()`): Direction constant → word

All 3 need to update from a single configuration.

## Implementation Phases

### Phase 1: Direction Vocabulary Type (world-model)

Add to `packages/world-model/src/constants/directions.ts`:

- `DirectionVocabulary` interface: `{ id: string, entries: Record<DirectionType, DirectionEntry> }`
- `DirectionEntry`: `{ display: string, words: string[] }`
- `DirectionVocabularyRegistry` class with:
  - `define(vocab: DirectionVocabulary)` — register a named vocabulary
  - `get(id: string)` — retrieve by name
  - Pre-defined: `'compass'` (standard), `'naval'`, `'minimal'`
- `DirectionVocabularyConfig` — serializable config stored on rooms/regions for save/restore
- Export from `constants/index.ts`

### Phase 2: Mutable Direction Mappings (parser-en-us)

Modify `packages/parser-en-us/src/direction-mappings.ts`:

- Convert `DirectionWords` and `DirectionAbbreviations` from `const` to `let` (mutable)
- Add `setActiveVocabulary(vocab: DirectionVocabulary)`: rebuilds both maps from vocabulary entries
- `getDirectionWord()` reads from current active vocabulary display names
- `parseDirection()` reads from current active maps (already does — just needs mutable backing)
- Add `getActiveVocabulary(): DirectionVocabulary` for introspection

### Phase 3: Grammar Re-registration (if-domain / parser-en-us)

The grammar `.directions()` call in `grammar.ts` registers static patterns at init time. When vocabulary changes, direction patterns need re-registration.

- Add `updateDirectionPatterns(map: Record<string, string[]>)` to grammar engine
- This removes old direction patterns and registers new ones
- Called by `setActiveVocabulary()`
- The parser needs access to the grammar engine — check if this coupling already exists

**Alternative (simpler):** Since direction parsing goes through `parseDirection()` in the parser, and the grammar just creates patterns that the parser resolves, the grammar patterns may not need to change at all if the parser handles the word → constant mapping. Check whether bare direction commands (`n`, `fore`) go through `parseDirection` or are matched directly by grammar patterns.

### Phase 4: Story-Level API

Add a convenience API accessible from the story's `initializeWorld`:

```typescript
world.directions().useVocabulary('naval');
// or
world.directions()
  .rename('north', { words: ['fore', 'f', 'forward'], display: 'fore' })
  .rename('south', { words: ['aft', 'a', 'back'], display: 'aft' });
```

This calls through to the vocabulary registry and triggers the parser/grammar update.

### Phase 5: Per-Region Vocabularies (deferred)

The ADR describes per-region vocabularies with parser adaptation on room change. This is a future enhancement. Phase 1-4 deliver the "single point of override" that the author requested.

## Files Modified

1. `packages/world-model/src/constants/directions.ts` — vocabulary types, registry, pre-defined sets
2. `packages/parser-en-us/src/direction-mappings.ts` — mutable maps, setActiveVocabulary
3. `packages/parser-en-us/src/grammar.ts` — may need direction pattern update hook
4. `packages/if-domain/src/grammar/grammar-engine.ts` — may need pattern removal/re-add
5. `packages/world-model/src/world/world-model.ts` or similar — `world.directions()` API

## Testing

- Unit test: define naval vocabulary, verify `parseDirection('fore')` returns `Direction.NORTH`
- Unit test: verify `getDirectionWord(Direction.NORTH)` returns `'fore'` after vocab switch
- Unit test: verify standard directions still work when no vocabulary override is set
- Integration: story sets `useVocabulary('naval')`, player types `fore`, going action fires north

## Risk

- Grammar patterns are registered at init, not dynamically. If bare direction commands (`n`, `fore`) are matched by grammar rules rather than parsed by `parseDirection`, we need dynamic pattern management. Need to verify this in Phase 3.

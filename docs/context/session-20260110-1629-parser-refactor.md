# Session Summary: 20260110 - Parser Refactor Phase 5

## Status: In Progress

## Goals
- Implement Phase 5: Disambiguation Support
- Add author-controlled disambiguation priorities via `entity.scope(actionId, priority)`
- Add author-controlled scope additions via `entity.setMinimumScope(level, rooms?)`
- Add AMBIGUOUS_ENTITY error code for multiple matches

## Completed

### 1. Fixed Build Errors from Previous Session
- Added scope methods to `ReadOnlyActionContext` (deprecated but still implements ActionContext)
- Fixed `requiredScope` → `scope` typo in command-validator.ts
- Added 'AMBIGUOUS_ENTITY' to `IValidationError.code` type in world-model

### 2. Author-Controlled Disambiguation (`entity.scope()`)
- Added `scopePriorities: Map<string, number>` to IFEntity
- Added `scope(actionId, priority?)` method for getting/setting disambiguation priority
- Added `clearScope()`, `clearAllScopes()`, `getScopePriorities()` methods
- Updated `clone()` and `toJSON()`/`fromJSON()` to preserve scope priorities
- Default priority is 100; higher = preferred, lower = deprioritized

### 3. CommandValidator Scoring Integration
- Added `currentActionId` property to track action being validated
- Added scope priority scoring in `scoreEntities()`:
  - Reads `entity.scope(actionId)` for priority (default 100)
  - Converts to score bonus: `(priority - 100) / 10` (so 150 → +5, 50 → -5)
- Added `'AMBIGUOUS_ENTITY'` error code for multiple matches

### 4. Modifier Extraction Fix
- Parser wasn't populating `modifiers` field in noun phrases
- Added fallback extraction: compare `ref.text` to `ref.head` to find adjectives
- Example: `text: "green ball"`, `head: "ball"` → extracts modifier "green"
- Applied fix in both `scoreEntities()` and ambiguity handling

### 5. Smart Disambiguation Logic
- If user specified modifiers but NO candidate matches them → `ENTITY_NOT_FOUND`
  - Example: "green ball" when only red/blue balls exist → not found
- If multiple candidates match equally → `AMBIGUOUS_ENTITY`
  - Returns list of choices for potential disambiguation prompt

### 6. Author-Controlled Scope Additions (`entity.setMinimumScope()`)
Allows entities to be "in scope" regardless of spatial location.

**IFEntity additions:**
- `minimumScopes: Map<string, number>` - stores minimum scope per room ('*' = all)
- `setMinimumScope(level, rooms?)` - set minimum scope level
- `getMinimumScope(roomId)` - get minimum scope for a room
- `clearMinimumScope(rooms?)` - clear minimum scope
- `getMinimumScopes()` - get all for serialization
- Updated `clone()`, `toJSON()`, `fromJSON()` for persistence

**ScopeResolver updates:**
- `getScope()` returns `max(physical, minimum)` - additive only
- `getVisible()`, `getReachable()`, `getAudible()` include minimum scope entities

**Use cases:**
```typescript
// Always visible everywhere
sky.setMinimumScope(ScopeLevel.VISIBLE);

// Visible from specific rooms
mountain.setMinimumScope(ScopeLevel.VISIBLE, ['overlook', 'trail']);

// Butterfly reachable (but may escape) in garden
butterfly.setMinimumScope(ScopeLevel.REACHABLE, ['garden']);

// Can be set/cleared dynamically in event handlers
clock.clearMinimumScope();  // Ticking stops when broken
```

## Key Decisions
- **ENTITY_NOT_FOUND vs AMBIGUOUS_ENTITY**: If user specifies a modifier (adjective) that no entity matches, return `ENTITY_NOT_FOUND`. Only return `AMBIGUOUS_ENTITY` when multiple candidates genuinely match.
- **Minimum scope is additive only**: Can raise scope level, never lower it. Entity in inventory is always CARRIED.
- **Dynamic scope changes**: `setMinimumScope()` and `clearMinimumScope()` can be called from event handlers during gameplay.

## Files Modified

| File | Changes |
|------|---------|
| `packages/world-model/src/entities/if-entity.ts` | scope priorities + minimum scopes |
| `packages/world-model/src/commands/validated-command.ts` | AMBIGUOUS_ENTITY error code |
| `packages/stdlib/src/actions/context.ts` | Scope methods for ReadOnlyActionContext |
| `packages/stdlib/src/validation/command-validator.ts` | Scoring, modifier extraction |
| `packages/stdlib/src/validation/types.ts` | AMBIGUOUS_ENTITY error code |
| `packages/stdlib/src/scope/scope-resolver.ts` | Minimum scope integration |

## Test Results
- **stdlib tests**: 1033 passed, 25 failed (baseline)
- **scope tests**: 32 passed (includes 14 new minimum scope tests)
- "handles wrong adjective" test now passes

### Minimum Scope Tests Added (14 tests)
- `should make entity visible globally with setMinimumScope`
- `should make entity reachable globally with setMinimumScope`
- `should apply minimum scope only to specific rooms`
- `should apply minimum scope to multiple specific rooms`
- `should be additive - cannot lower physical scope`
- `should raise scope from physical level`
- `should clear minimum scope with clearMinimumScope`
- `should clear minimum scope for specific rooms only`
- `should include minimum scope entities in getVisible`
- `should include minimum scope entities in getReachable`
- `should include minimum scope entities in getAudible`
- `should persist minimum scope through clone`
- `should persist minimum scope through toJSON/fromJSON`
- `should allow dynamic scope changes during gameplay`

## Open Items
- Add disambiguation prompt support via events
- Write tests for author-controlled disambiguation (`entity.scope()`)

## Notes
- Session started: 2026-01-10 16:29
- Continued from session-20260110-1452 which completed Phase 4

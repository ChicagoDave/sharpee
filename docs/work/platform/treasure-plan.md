# Plan: Move TreasureTrait to Platform + Fix Scoring (ISSUE-053)

## Context

Score is 20/616 after placing 12+ treasures in trophy case and visiting scored rooms. Only combat achievements count. Root causes:

1. **Treasure detection broken**: `ScoringEventProcessor` uses `(item as any).isTreasure` but Dungeo uses `TreasureTrait` — property doesn't exist on entities
2. **Room visit scoring broken**: Going action emits `toRoom` field, but scoring processor expects `toRoomId`
3. **Light-shaft handler broken**: Same `toRoomId` mismatch in `orchestration/event-handlers.ts`

User direction: TreasureTrait should be a platform trait (in world-model), configurable by stories.

## Changes

### 1. Create Platform TreasureTrait

Create `packages/world-model/src/traits/treasure/treasureTrait.ts`:
- Move from `stories/dungeo/src/traits/treasure-trait.ts`
- Change type from `'dungeo.trait.treasure'` to `TraitType.TREASURE` (`'treasure'`)
- Keep same config interface: `treasureId`, `treasureValue`, `trophyCaseValue`

Create `packages/world-model/src/traits/treasure/index.ts` (barrel export).

### 2. Register in Platform Systems

- `packages/world-model/src/traits/trait-types.ts`: Add `TREASURE: 'treasure'` to TraitType const, add to `TRAIT_CATEGORIES` as STANDARD
- `packages/world-model/src/traits/implementations.ts`: Add TreasureTrait to `TRAIT_IMPLEMENTATIONS`
- `packages/world-model/src/traits/index.ts`: Add `export * from './treasure'`
- `packages/world-model/src/traits/all-traits.ts`: Add TreasureTrait to Traits namespace + type guard
- `packages/world-model/src/index.ts`: Add `export * from './traits/treasure'`

### 3. Fix ScoringEventProcessor

`packages/stdlib/src/services/scoring/scoring-event-processor.ts`:

**handleTaken()** (lines 386-406): Replace `(item as any).isTreasure` check with:
```typescript
const treasureTrait = item.get(TraitType.TREASURE);
if (!treasureTrait) return;
const treasureValue = treasureTrait.treasureValue || 0;
const treasureId = treasureTrait.treasureId || item.id;
```

**handlePutIn()** (lines 437-464): Same pattern — use trait lookup instead of `as any`.

**handlePlayerMoved()** (line 474): Fix field name:
```typescript
// Before:
const toRoomId = (data?.toRoomId ?? eventAny.toRoomId) as string | undefined;
// After:
const toRoomId = (data?.toRoom ?? eventAny.toRoom) as string | undefined;
```

### 4. Update Dungeo Story

- **Delete** `stories/dungeo/src/traits/treasure-trait.ts`
- **Update** `stories/dungeo/src/traits/index.ts`: Remove TreasureTrait export
- **Update** all region files that import TreasureTrait: Change from local import to `'@sharpee/world-model'`
  - Regions: maze, frigid-river, coal-mine, forest, round-room, temple, volcano, underground, dam, house-interior, well-room, bank-of-zork, endgame
  - Any other files importing TreasureTrait
- **Fix** `stories/dungeo/src/orchestration/event-handlers.ts` (lines 107-108): Change `toRoomId` to `toRoom`

### 5. Update Stale Docs

`stories/dungeo/CLAUDE.md`: Update the Treasures section to show `TreasureTrait` pattern instead of `(item as any).isTreasure`.

### 6. Log ISSUE-053

Add scoring bug to `docs/work/issues/issues-list-03.md` with root causes and fix description.

## Files Modified

**Platform (packages/):**
- `packages/world-model/src/traits/treasure/treasureTrait.ts` — NEW
- `packages/world-model/src/traits/treasure/index.ts` — NEW
- `packages/world-model/src/traits/trait-types.ts` — Add TREASURE
- `packages/world-model/src/traits/implementations.ts` — Add TreasureTrait
- `packages/world-model/src/traits/index.ts` — Export treasure
- `packages/world-model/src/traits/all-traits.ts` — Add to namespace
- `packages/world-model/src/index.ts` — Export treasure
- `packages/stdlib/src/services/scoring/scoring-event-processor.ts` — Fix treasure detection + toRoom field

**Story (stories/dungeo/):**
- `stories/dungeo/src/traits/treasure-trait.ts` — DELETE
- `stories/dungeo/src/traits/index.ts` — Remove export
- `stories/dungeo/src/regions/*.ts` — Update imports (10-13 files)
- `stories/dungeo/src/orchestration/event-handlers.ts` — Fix toRoom field
- `stories/dungeo/CLAUDE.md` — Update treasure docs

**Docs:**
- `docs/work/issues/issues-list-03.md` — Add ISSUE-053

## Verification

1. `./build.sh -s dungeo` — Must compile clean
2. Run walkthrough chain + score check — Score should be >> 20 (treasures + room visits + achievements)
3. Run all troll transcripts — No regressions (104 tests, 3 expected failures)
4. Run full walkthrough chain — 216+ pass, 6 skip

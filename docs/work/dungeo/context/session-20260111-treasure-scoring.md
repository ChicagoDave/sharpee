# Work Summary: Treasure Scoring Implementation

**Date**: 2026-01-11
**Branch**: dungeo
**Duration**: ~30 minutes

## Summary

Implemented complete treasure scoring system with both take points (treasureValue) and trophy case bonus points (trophyCaseValue).

## Completed

### 1. Fixed Trophy Case Handler
**File**: `stories/dungeo/src/index.ts:1940-1946`

Changed from using `treasureValue` to `trophyCaseValue`:
```typescript
// Before (incorrect)
const treasureValue = (item as any).treasureValue || 0;
scoringService.scoreTreasure(treasureId, treasureValue);

// After (correct)
const trophyCaseValue = (item as any).trophyCaseValue || 0;
if (trophyCaseValue > 0) {
  scoringService.scoreTreasureCase(treasureId, trophyCaseValue);
}
```

### 2. Added Take Points Handler
**File**: `stories/dungeo/src/index.ts`

New handler for `if.event.taken` awards `treasureValue` when picking up treasures:
```typescript
world.registerEventHandler('if.event.taken', (event, w) => {
  const data = event.data as Record<string, any> | undefined;
  const itemId = data?.itemId as string | undefined;
  if (!itemId) return;

  const item = w.getEntity(itemId);
  if (!item) return;

  const isTreasure = (item as any).isTreasure;
  if (!isTreasure) return;

  const treasureValue = (item as any).treasureValue || 0;
  const treasureId = (item as any).treasureId || item.id;

  if (treasureValue > 0) {
    scoringService.scoreTreasureTake(treasureId, treasureValue);
  }
});
```

### 3. Extended DungeoScoringService
**File**: `stories/dungeo/src/scoring/dungeo-scoring-service.ts`

Added separate tracking for take vs case points:
- `scoreTreasureTake(treasureId, points)` - Awards take points, tracks in `takenTreasures[]`
- `isTreasureTakeScored(treasureId)` - Check if take points awarded
- `scoreTreasureCase(treasureId, points)` - Awards case points, tracks in `scoredTreasures[]`
- `isTreasureCaseScored(treasureId)` - Check if case points awarded
- Deprecated old `scoreTreasure()` and `isTreasureScored()` methods

### 4. Updated Transcript Tests
**File**: `stories/dungeo/tests/transcripts/trophy-case-scoring.transcript`

- Verifies take points awarded when picking up egg (5 pts)
- Verifies case bonus awarded when placing in trophy case (5 pts)
- Total score after both actions: 10 points
- Verifies no double-scoring when removing/re-adding

## Key Debugging Insight

Handler registration method matters:
- `engine.getEventProcessor().registerHandler()` - Used in `onEngineReady()`
- `world.registerEventHandler()` - Used in `initializeWorld()` - **This is what works**

The handlers needed to be registered during `initializeWorld()`, not `onEngineReady()`, to properly receive events.

## Files Modified

1. `stories/dungeo/src/index.ts` - Added take handler, fixed case handler, moved registration
2. `stories/dungeo/src/scoring/dungeo-scoring-service.ts` - Added separate take/case tracking
3. `stories/dungeo/tests/transcripts/trophy-case-scoring.transcript` - Updated expected scores

## Test Results

Trophy case scoring transcript: 19/19 tests pass

## Remaining from Audit

From `docs/work/dungeo/context/2026-01-11-treasure-points-audit.md`:

| Priority | Item | Status |
|----------|------|--------|
| High | Trophy Case Handler | DONE |
| High | Missing Treasures (Violin 20, Crown 25, Spices 10) | Pending |
| Medium | Room Points (RVAL) - 7 rooms, 115 pts | Pending |
| Medium | Light Shaft Bonus - 10 pts | Pending |
| Low | Max Score Display (shows 716, should be 616) | Pending |

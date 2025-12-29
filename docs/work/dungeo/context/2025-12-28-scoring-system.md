# Work Summary: Trophy Case Scoring System

**Date**: 2025-12-28
**Branch**: dungeo
**Status**: Complete

## Objective

Implement two-layer scoring architecture per ADR-076:
1. **stdlib**: Default `ScoringService` with basic scoring
2. **Dungeo**: Extended `DungeoScoringService` with trophy case mechanics

## What Was Accomplished

### 1. stdlib ScoringService (Layer 1)

Created base scoring service in `packages/stdlib/src/services/scoring/`:

**Interface** (`IScoringService`):
- `addPoints(points, reason)` - Add points with optional reason
- `getScore()` - Get current score
- `getMaxScore()` - Get maximum possible score
- `getMoves()` - Get move count
- `incrementMoves()` - Increment move counter
- `getRank()` - Get rank based on score
- `getHistory()` - Get score history

**Default Ranks**: Beginner → Novice → Amateur → Experienced → Expert → Master

### 2. DungeoScoringService (Layer 2)

Created Dungeo-specific service in `stories/dungeo/src/scoring/`:

**Extended Interface** (`IDungeoScoringService`):
- `scoreTreasure(treasureId, points)` - Score treasure, prevent double-scoring
- `isTreasureScored(treasureId)` - Check if treasure already scored
- `addAchievement(name, points)` - Add named achievement
- `hasAchievement(name)` - Check if achievement earned

**Zork Ranks**: Beginner → Amateur Adventurer → Novice Adventurer → Junior Adventurer → Adventurer → Master → Wizard → Master Adventurer

### 3. Trophy Case Event Handler

Registered handler in `stories/dungeo/src/index.ts`:
- Listens for `if.event.put_in` events
- Checks if target is trophy case
- Checks if item has `isTreasure` flag
- Calls `scoringService.scoreTreasure()` to award points
- Prevents double-scoring via `scoredTreasures` array

### 4. Treasure Metadata

Added treasure properties to items:
- `isTreasure: true` - Marks item as treasure
- `treasureId: string` - Unique ID for scoring tracking
- `treasureValue: number` - Point value

**Treasures Updated**:
- Jewel-encrusted egg: 5 points
- Golden clockwork canary: 6 points
- Trunk of jewels: 15 points

### 5. Capability Schema Update

Added `scoredTreasures` field to scoring capability in `packages/stdlib/src/capabilities/scoring.ts`.

## Test Results

All 106 transcript tests pass:
- 105 passed
- 1 expected failure (troll blocking)

New test added: `trophy-case-scoring.transcript`

## Files Created

```
packages/stdlib/src/services/scoring/scoring-service.ts
packages/stdlib/src/services/scoring/index.ts
stories/dungeo/src/scoring/dungeo-scoring-service.ts
stories/dungeo/src/scoring/index.ts
stories/dungeo/tests/transcripts/trophy-case-scoring.transcript
```

## Files Modified

```
packages/stdlib/src/services/index.ts
packages/stdlib/src/capabilities/scoring.ts
stories/dungeo/src/index.ts
stories/dungeo/src/objects/forest-objects.ts
stories/dungeo/src/regions/dam/objects/index.ts
```

## How Trophy Case Scoring Works

```
Player: PUT EGG IN TROPHY CASE
  → puttingAction emits if.event.put_in
  → Story handler checks target = "trophy case"
  → Checks item.isTreasure = true
  → scoringService.scoreTreasure("jewel-encrusted-egg", 5)
  → Score increases from 0 to 5
  → scoredTreasures = ["jewel-encrusted-egg"]

Player: TAKE EGG, PUT EGG IN TROPHY CASE (again)
  → scoreTreasure returns false (already scored)
  → Score stays at 5
```

## Next Steps

1. **Region Refactoring** - Refactor other regions to match dam folder pattern
2. **More Treasures** - Add remaining treasures from objects-inventory.md
3. **Score Display** - Consider showing score message when treasure is placed

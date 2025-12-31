# ADR-078 Hidden Max Points System - Work Summary

**Date**: 2025-12-31
**Duration**: ~30 minutes
**Result**: Hidden max points system fully implemented

## Overview

Implemented the "hidden max points" narrative feature for ADR-078 (Thief's Canvas puzzle). The game now shows 616 max points until the thief dies, then reveals 650 with a special message.

## What Was Done

### 1. Updated ADR-078 Documentation

Added new "Hidden Max Points System" section to `docs/architecture/adrs/adr-078-magic-paper-puzzle.md`:
- Design explanation (616 → 650 on thief death)
- "Reality altered" one-time message mechanic
- "Master of Secrets" rank table (500 pts + thief dead + canvas obtained)
- Implementation pseudocode

### 2. Thief Death Handler Updates

**File**: `src/npcs/thief/thief-entity.ts`

On thief death, now sets:
- `scoring.thiefDead = true` - Flag for rank calculation
- `scoring.maxScore = 650` - Updates visible max score
- `scoring.realityAlteredPending = true` - Queues message for next SCORE

### 3. DungeoScoringService Enhancements

**File**: `src/scoring/dungeo-scoring-service.ts`

Added new methods:
- `isThiefDead()` - Check if thief has been killed
- `isRealityAlteredPending()` - Check for pending message
- `clearRealityAlteredPending()` - Clear the pending flag

Added `getRank()` override:
- Returns "Master of Secrets" when score ≥ 500 AND thief dead AND canvas obtained
- Otherwise falls through to standard Zork ranks

### 4. Reality Altered Handler

**File**: `src/handlers/reality-altered-handler.ts` (new)

Two-part implementation:
1. **Event Handler**: Listens for `score_displayed`, sets `realityAlteredQueued` flag
2. **Daemon**: Checks queue flag, emits "reality altered" message, clears flag

This ensures the message appears once, on the first SCORE command after thief death.

### 5. Story Integration

**File**: `src/index.ts`

- Imported `registerRealityAlteredHandler` and `registerRealityAlteredDaemon`
- Registered handler in `initializeWorld()`
- Registered daemon in `onEngineReady()` (with scheduler)
- Added language message: "The death of the thief seems to alter reality in some subtle way..."

## Technical Notes

### Why Event Handler + Daemon?

Event handlers in Sharpee return `void`, so they can't emit events directly. The solution:
1. Event handler sets a state flag
2. Daemon checks flag and emits the message (daemons CAN return events)

### Rank Hierarchy

| Rank | Threshold | Condition |
|------|-----------|-----------|
| Adventurer | 200 | - |
| Master | 300 | - |
| Wizard | 400 | - |
| **Master of Secrets** | **500** | Thief dead + canvas obtained |
| Master Adventurer | 500 | Standard path |

Players who complete the ghost ritual see "Master of Secrets" before reaching "Master Adventurer" on the standard path.

## Files Modified

| File | Changes |
|------|---------|
| `docs/architecture/adrs/adr-078-magic-paper-puzzle.md` | Added Hidden Max Points section |
| `src/npcs/thief/thief-entity.ts` | Set thiefDead, maxScore=650, realityAlteredPending on death |
| `src/scoring/dungeo-scoring-service.ts` | Added helper methods, getRank() override |
| `src/handlers/reality-altered-handler.ts` | New file - event handler + daemon |
| `src/handlers/index.ts` | Export new handler functions |
| `src/index.ts` | Register handler and daemon, add language message |
| `docs/work/dungeo/implementation-plan.md` | Added to Recently Completed |

## Test Results

- All 404 transcript tests pass (399 passed, 5 expected failures)
- Build succeeds with no TypeScript errors

## User Experience

1. Player explores game, sees "X out of 616 points"
2. Player kills thief (normal combat)
3. Player types SCORE
4. Output: "Your score is X out of 650 points"
5. Output: "The death of the thief seems to alter reality in some subtle way..."
6. (Message never appears again)
7. At 500+ points with canvas: rank shows "Master of Secrets"

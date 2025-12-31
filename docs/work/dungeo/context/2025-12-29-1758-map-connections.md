# Work Summary: Map Connection Audit & Fixes

**Date**: 2025-12-29
**Branch**: dungeo

## Overview

Audited existing room connections against the canonical `docs/work/dungeo/map-connections.md` and fixed critical path issues. The Cellar/Troll Room area was significantly restructured to match the Mainframe Zork map.

## Changes Made

### 1. Canyon Bottom ↔ End of Rainbow Connection

**File**: `stories/dungeo/src/regions/frigid-river/index.ts`

Added `connectRainbowToCanyon()` function:
- End of Rainbow SE → Canyon Bottom
- Canyon Bottom N → End of Rainbow

**File**: `stories/dungeo/src/index.ts`
- Called new connection function with appropriate IDs

### 2. Cellar/Troll Room Layout Restructure

**File**: `stories/dungeo/src/regions/underground/index.ts`

Completely restructured to match map-connections.md:

| Room | Before | After |
|------|--------|-------|
| Cellar | N→narrowPassage | E→Troll Room |
| Troll Room | W→Cellar only | W→Cellar, N→E/W Passage (blocked), E→N/S Crawlway, S→Maze-1 |
| N/S Crawlway | E→? | N→West Chasm, E→Troll Room, S→Studio |
| Studio | N→narrowPassage | N→N/S Crawlway, NW→Gallery |
| E/W Passage | W→Troll Room | S→Troll Room, E→Round Room |

### 3. Troll Behavior Update

**File**: `stories/dungeo/src/regions/underground/objects/index.ts`

- Troll now blocks NORTH exit (not EAST)
- Death handler unblocks NORTH passage to E/W Passage
- Updated message: "With the troll dispatched, the passage to the north is now clear."

### 4. Maze Connection Fix

**File**: `stories/dungeo/src/regions/maze/index.ts`

- Changed `connectMazeToTrollRoom` to set Troll Room SOUTH → Maze-1 (was WEST)

### 5. Bank Connection Update

**File**: `stories/dungeo/src/regions/bank-of-zork/index.ts`

- Added optional `nsCrawlwayId` parameter to `connectBankToUnderground`
- West Chasm now connects N → N/S Crawlway when ID provided

### 6. Transcript Test Updates

Updated all affected transcripts:
- `troll-blocking.transcript` - Navigate via Cellar E→Troll Room, test N blocked
- `troll-combat.transcript` - Navigate via Cellar E→Troll Room, test N opens after kill
- `maze-navigation.transcript` - Troll Room S→Maze-1
- `maze-loops.transcript` - Troll Room S→Maze-1

## Test Results

All 324 tests pass (318 passed + 6 expected failures).

## Key Insight

The map-connections.md file is the source of truth for room layout. When transcript tests fail, update the tests to match the map, not the other way around.

## Remaining Map Work

Per map-connections.md audit:
- 15 missing rooms identified (see implementation-plan.md)
- Additional connections to verify against source material
- Some blockers not yet annotated in map-connections.md

## Files Modified

1. `stories/dungeo/src/regions/frigid-river/index.ts`
2. `stories/dungeo/src/regions/underground/index.ts`
3. `stories/dungeo/src/regions/underground/objects/index.ts`
4. `stories/dungeo/src/regions/maze/index.ts`
5. `stories/dungeo/src/regions/bank-of-zork/index.ts`
6. `stories/dungeo/src/index.ts`
7. `stories/dungeo/tests/transcripts/troll-blocking.transcript`
8. `stories/dungeo/tests/transcripts/troll-combat.transcript`
9. `stories/dungeo/tests/transcripts/maze-navigation.transcript`
10. `stories/dungeo/tests/transcripts/maze-loops.transcript`
11. `docs/work/dungeo/implementation-plan.md`

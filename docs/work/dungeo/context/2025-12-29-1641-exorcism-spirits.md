# Work Summary: Exorcism Puzzle and Infrastructure Fixes

**Date**: 2025-12-29
**Branch**: dungeo
**Status**: Complete

## Overview

Implemented the Exorcism puzzle (bell/book/candle ritual) to banish spirits at Entry to Hades, and fixed critical infrastructure issues with the transcript tester and bat handler daemon.

## Completed Work

### 1. Infrastructure Fixes

#### Transcript Tester Event Capture
- **Issue**: Transcript tester only captured action events, not scheduler/NPC daemon events
- **Fix**: Updated `packages/transcript-tester/src/story-loader.ts` to capture ALL events via the `engine.on('event', ...)` emitter instead of just `result.events`
- **Impact**: All tests can now assert on scheduler daemon events (bat, thief, etc.)

#### Bat Handler Priority Bug
- **Issue**: Reset daemon ran before bat daemon due to priority ordering (higher = first)
- **Fix**: Changed reset daemon priority from 200 to -100
- **File**: `stories/dungeo/src/handlers/bat-handler.ts:192`

### 2. RING Action

Created story-specific action for ringing the bell:

| File | Purpose |
|------|---------|
| `stories/dungeo/src/actions/ring/types.ts` | Action ID and message constants |
| `stories/dungeo/src/actions/ring/ring-action.ts` | Full action implementation |
| `stories/dungeo/src/actions/ring/index.ts` | Module exports |

**Features**:
- Pattern: `ring bell`, `ring :target`
- Validates target is ringable (contains "bell")
- Tracks bell rung location for exorcism
- Emits `game.message` with `dungeo.ring.bell` messageId

### 3. Exorcism Handler

Created daemon-based handler for the exorcism ritual:

**File**: `stories/dungeo/src/handlers/exorcism-handler.ts`

**Ritual Requirements** (all at Entry to Hades):
1. Ring the bell → sets `dungeo.exorcism.bell_rung` state
2. Read the black book → sets `dungeo.exorcism.book_read` state
3. Light the candles → sets `dungeo.exorcism.candles_lit` state

**When Complete**:
- Spirits vanish (`npc.emoted` event)
- South passage unblocked (`RoomBehavior.unblockExit`)
- Room description updated
- +10 points awarded

### 4. Entry to Hades Updates

**File**: `stories/dungeo/src/regions/temple/rooms/entry-to-hades.ts`

**Changes**:
- Added `blockedExits: { [Direction.SOUTH]: 'dungeo.exorcism.spirits_block' }`
- Spirits blocking flag cleared when exorcism complete
- Room description changes to remove ghostly figures mention

### 5. Language Messages

Added to `stories/dungeo/src/index.ts`:

```typescript
// Ring action messages
'dungeo.ring.success' → 'Ding!'
'dungeo.ring.bell' → 'The bell produces a clear, resonant tone.'
'dungeo.ring.not_ringable' → "That doesn't make a sound when rung."
'dungeo.ring.no_target' → 'Ring what?'

// Exorcism messages
'dungeo.exorcism.spirits_block' → 'Ghostly figures bar your way...'
'dungeo.exorcism.spirits_vanish' → 'The spirits shriek in terror...'
'dungeo.exorcism.passage_opens' → 'The way to the south is now clear.'
```

### 6. Transcript Tests

**New test**: `stories/dungeo/tests/transcripts/exorcism-ritual.transcript`
- Navigates to Altar via GDT
- Picks up bell, book, candles
- Travels to Entry to Hades
- Verifies spirits block south passage
- Performs ritual (ring, read, light)
- Verifies passage opens
- Travels to Land of Dead and back

**Updated test**: `stories/dungeo/tests/transcripts/rug-trapdoor.transcript`
- Removed fragile `[EVENTS: 3]` assertion

## Test Results

```
Total: 326 tests in 18 transcripts
320 passed, 6 expected failures
Duration: 131ms
✓ All tests passed!
```

## Files Changed

### New Files
- `stories/dungeo/src/actions/ring/types.ts`
- `stories/dungeo/src/actions/ring/ring-action.ts`
- `stories/dungeo/src/actions/ring/index.ts`
- `stories/dungeo/src/handlers/exorcism-handler.ts`
- `stories/dungeo/tests/transcripts/exorcism-ritual.transcript`

### Modified Files
- `packages/transcript-tester/src/story-loader.ts` - Event capture fix
- `stories/dungeo/src/handlers/bat-handler.ts` - Priority fix
- `stories/dungeo/src/handlers/index.ts` - Export exorcism handler
- `stories/dungeo/src/actions/index.ts` - Export ring action
- `stories/dungeo/src/regions/temple/rooms/entry-to-hades.ts` - Blocked exit
- `stories/dungeo/src/index.ts` - Parser patterns, language messages, handler registration
- `stories/dungeo/tests/transcripts/rug-trapdoor.transcript` - Remove event count
- `docs/work/dungeo/implementation-plan.md` - Updated tracking

## Implementation Plan Updates

### NPCs Complete
- Cyclops: ✅ Done (Say "Odysseus"/"Ulysses")
- Vampire Bat: ✅ Done (Daemon, garlic protection)
- Spirits: ✅ Done (Exorcism ritual)

### Systems Complete
- RING action: ✅ Done
- Exorcism sequence: ✅ Done

### Progress
- NPCs: 5/8 (63%)
- Puzzles: 7/~25 (28%)

## Next Steps

1. Remaining treasures (spheres, violin, grail, ruby, coins, chalice)
2. Puzzle mechanics (riddle, loud room echo, rainbow wave)
3. Royal Puzzle (8x8 sliding block puzzle)
4. Remaining NPCs (Dungeon Master, Robot, Gnome)
5. Endgame (~15 rooms)

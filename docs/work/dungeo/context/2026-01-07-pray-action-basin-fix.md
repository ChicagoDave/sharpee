# Work Summary: PRAY Action Fix & Basin Ritual Correction

**Date**: 2026-01-07
**Branch**: dungeo

## Summary

Fixed the PRAY action to correctly implement Fortran Zork behavior and corrected the Basin Room ghost ritual mechanics. PRAY was incorrectly tied to the Basin Room puzzle when it should only teleport from Altar to Forest.

## Changes Made

### PRAY Action (Complete Rewrite)

**Before**: PRAY had complex Basin Room logic with 'disarmed'/'blessed' state machine
**After**: PRAY only does two things:
- At **Altar**: Teleport player to Forest Path 1 (per Fortran sverbs.for V79)
- Elsewhere: Show generic message "If you pray hard enough, your prayers may be answered."

### Basin Room Ghost Ritual (Corrected)

**Before**: Required PRAY to bless the water (incorrect)
**After**: Works with incense-only disarm:
1. `BURN INCENSE` - Sets `basinState = 'disarmed'`
2. `DROP FRAME PIECE` - Triggers ghost ritual while incense burns (3 turns)

No PRAY step required.

## Files Changed

### Modified
- `stories/dungeo/src/actions/pray/pray-action.ts` - Complete rewrite for Altar→Forest teleport
- `stories/dungeo/src/actions/pray/types.ts` - Simplified to PRAY_GENERIC and PRAY_TELEPORT messages
- `stories/dungeo/src/actions/burn/burn-action.ts` - Added Basin Room basinState='disarmed' on burn
- `stories/dungeo/src/handlers/ghost-ritual-handler.ts` - Check 'disarmed' not 'blessed'
- `stories/dungeo/src/regions/dam/rooms/basin-room.ts` - Updated comments
- `stories/dungeo/src/regions/forest/rooms/forest-path-1.ts` - Added 'forest path 1' alias
- `stories/dungeo/src/index.ts` - Updated language messages
- `docs/work/dungeo/implementation-plan.md` - Updated PRAY status and recently completed

### New Files
- `stories/dungeo/tests/transcripts/pray-altar-teleport.transcript` - 10 tests for PRAY teleport

## Test Results

```
Total: 787 tests in 49 transcripts
782 passed, 5 expected failures
Duration: 6955ms
✓ All tests passed!
```

New transcript `pray-altar-teleport.transcript` verifies:
- PRAY at Altar teleports to Forest Path with "prayer is answered" message
- PRAY elsewhere gives generic message and doesn't teleport

## Technical Notes

### Fortran Reference (sverbs.for V79, label 10000)
```fortran
C V79--  PRAY.  IF IN TEMP2, POOF
10000   IF(HERE.NE.TEMP2) GO TO 10050    !IN TEMPLE?
        IF(MOVETO(FORE1,WINNER)) GO TO 10100  !FORE1 STILL THERE?
10050   CALL RSPEAK(340)                  !JOKE.
        RETURN
```
- TEMP2 = Altar room
- FORE1 = Forest Path 1
- Message 340 = Generic prayer joke

### Basin State Machine (Simplified)
- `'normal'` - Default, trap active
- `'disarmed'` - Incense burning, safe to drop frame piece

The 'blessed' state has been removed entirely.

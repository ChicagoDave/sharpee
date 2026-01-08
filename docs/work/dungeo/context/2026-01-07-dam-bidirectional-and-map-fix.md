# Work Summary: Dam Bidirectional Toggle & Map Fix

**Date**: 2026-01-07
**Branch**: dungeo
**Session**: Fixed map bug and implemented bidirectional dam toggle

## Completed

### 1. Map Bug Fix - Reservoir South → Temple Connection
- **Problem**: `connectTempleToDam()` in `regions/temple/index.ts` was overwriting Reservoir South's south exit (to Dam) with a connection to Temple
- **Solution**: Removed the spurious `connectTempleToDam()` call from `index.ts`
- Temple is correctly accessed via:
  - Glacier Room → Egyptian Room → Temple (`connectGlacierToEgyptian`)
  - Grail Room → Temple (`connectGrailRoomToTemple`)
- Added transcript test verifying Reservoir South → S → Dam works

### 2. Bidirectional Dam Toggle
- **Previous behavior**: Turn bolt only opened/drained the dam
- **New behavior**: Turn bolt toggles dam state:
  - When closed → starts draining (existing)
  - When drained → closes dam, refills reservoir, re-blocks exits

**Files changed**:
- `scheduler/dam-fuse.ts`: Added `closeDamGate()` function to reset `isDrained` state
- `actions/turn-bolt/turn-bolt-action.ts`: Toggle logic + emits `dungeo.dam.closed` event
- `handlers/dam-handler.ts`: Listens for `dungeo.dam.closed` and calls `closeDam()` to re-block exits and update room descriptions

### 3. Event Flow
```
Turn bolt (dam drained)
  → closeDamGate() resets isDrained
  → report() emits dungeo.dam.closed event
  → dam-handler receives event
  → closeDam() re-blocks reservoir exits + updates descriptions
```

## Test Results
- **761 tests, 756 passed, 5 expected failures**
- Dam-drain transcript test passes (includes S from Reservoir South → Dam)

## Commits
1. `3268ac6` - feat(dungeo): Implement reservoir exit blocking for coffin puzzle
2. `b7c973e` - fix(dungeo): Remove spurious Temple→Reservoir South connection
3. `8dc42d1` - feat(dungeo): Support bidirectional dam gate toggle

## Next Steps for Coffin Puzzle
The coffin transport puzzle infrastructure is now complete:
1. Reservoir exits block when dam closed (water present)
2. Reservoir exits unblock when dam drained
3. Dam can be re-closed to refill reservoir

Remaining work:
- Verify coffin can be taken (not SceneryTrait)
- Test carrying coffin across drained reservoir
- May need weight/capacity research for full puzzle

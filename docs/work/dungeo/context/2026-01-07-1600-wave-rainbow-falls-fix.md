# Work Summary: Wave-Rainbow Puzzle & Falls Death Handler Fixes

**Date**: 2026-01-07
**Duration**: ~1 hour
**Branch**: dungeo
**Commit**: 2686b4a

## Objective

Fix the wave-rainbow transcript test failures where going west at Aragain Falls and waving the sceptre were incorrectly triggering death instead of showing blocked exit message or creating rainbow.

## Root Cause Analysis

Three interacting issues:

1. **Falls death handler too aggressive** - Was killing player for ALL actions except LOOK, including:
   - WAVE (needed for rainbow puzzle)
   - GO directions other than south (should show blocked exit)
   - `dungeo.rainbow.blocked` action (transformed by rainbow blocked handler)

2. **River handler blocking rainbow→falls movement** - Aragain Falls is marked as `isWaterRoom`, so the river entry transformer blocked walking from rainbow rooms to the falls

3. **Basket handler build errors** - Uncommitted code had invalid `vehicleType: 'basket'` (should be 'cable') and non-existent properties (`enterable`, `exitDirection`)

## Solution

### Falls Death Handler (`falls-death-handler.ts`)

Updated `isSafeAction()` to allow:
- LOOK and EXAMINE (per FORTRAN source)
- WAVE action (rainbow puzzle)
- GDT commands (debugging)
- `dungeo.rainbow.blocked` action (shows "insubstantial" message)
- GO directions except SOUTH (blocked exits handle them)

Everything else (WAIT, INVENTORY, TAKE, etc.) still kills per FORTRAN spec.

Key insight: The rainbow-blocked command transformer runs BEFORE falls death handler, so `dungeo.rainbow.blocked` needs to be whitelisted.

### River Handler (`river-handler.ts`)

Added `isPlayerOnRainbow()` check:
```typescript
function isPlayerOnRainbow(world: WorldModel): boolean {
  const containingRoom = world.getContainingRoom(player.id);
  return (containingRoom as any).isRainbowRoom === true;
}
```

River entry transformer now allows movement if player is on rainbow (magic bridge to falls).

### Rainbow Rooms

Added `isRainbowRoom = true` marker to:
- `on-the-rainbow.ts`
- `end-of-rainbow.ts`

### Basket Handler (`basket-handler.ts`)

Fixed build errors:
- Changed `vehicleType: 'basket'` to `vehicleType: 'cable'`
- Removed invalid `enterable` and `exitDirection` properties
- Removed unused `ParsedCommandTransformer` import

## Debug Process

Added temporary logging to falls death handler:
```typescript
console.log('[FALLS] action:', actionId, 'extras:', JSON.stringify(parsed.extras));
```

Output revealed the action was `dungeo.rainbow.blocked`, not `if.action.going` as expected - the rainbow blocked transformer intercepts the command first.

## Test Results

```
Total: 857 tests in 53 transcripts
851 passed, 5 expected failures, 1 skipped
Duration: ~2000ms
✓ All tests passed!
```

## Files Changed

- `stories/dungeo/src/handlers/falls-death-handler.ts` - Safe action logic
- `stories/dungeo/src/handlers/river-handler.ts` - Rainbow room check
- `stories/dungeo/src/handlers/basket-handler.ts` - Build error fixes
- `stories/dungeo/src/regions/frigid-river/rooms/on-the-rainbow.ts` - isRainbowRoom marker
- `stories/dungeo/src/regions/frigid-river/rooms/end-of-rainbow.ts` - isRainbowRoom marker
- `stories/dungeo/tests/transcripts/coffin-transport.transcript` - Test fix
- `docs/work/dungeo/implementation-plan.md` - Work log entry

## Key Learnings

1. **Command transformer ordering matters** - Falls death handler sees already-transformed commands, not raw parser output
2. **Direction values are uppercase** - `parsed.extras.direction` is 'WEST' not 'west'
3. **Multiple transformers interact** - Rainbow blocked transformer runs before falls death handler

## Next Steps

- Robot commands ("tell robot 'X'" syntax) still TODO
- Water current (river auto-movement) still TODO
- Push to remote when network available

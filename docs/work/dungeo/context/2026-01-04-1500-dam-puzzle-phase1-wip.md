# Work Summary: Dam Puzzle Phase 1 (Work in Progress)

**Date**: 2026-01-04
**Duration**: ~1 hour
**Feature/Area**: Dam Puzzle - Buttons and Bolt Implementation
**Status**: IN PROGRESS - Paused before completion

## Objective

Implement Phase 1 of the dam puzzle to allow players to drain the reservoir and access the trunk of jewels.

## What Was Accomplished

### Research Complete

Analyzed FORTRAN source to understand authentic behavior:

**Maintenance Room Buttons:**
| Button | Effect |
|--------|--------|
| Yellow | Enables bolt (GATEF=TRUE) |
| Brown | Disables bolt (GATEF=FALSE) |
| Red | Toggles room lights |
| Blue | Starts 16-turn flooding death trap |

**Bolt (at Dam):**
- Requires wrench to turn
- Only works if yellow button pressed
- Toggles dam open/closed

### Files Created

1. **`docs/work/dungeo/dam-plan.md`** - Comprehensive implementation plan with 3 phases

2. **Button entities** - Added to `regions/dam/objects/index.ts`:
   - `createMaintenanceButtons()` - Creates yellow, brown, red, blue buttons
   - `createDamBolt()` - Creates bolt at Dam
   - Each button has `buttonColor` property for identification

3. **Press Button Action** - `actions/press-button/`:
   - `types.ts` - Action ID and message constants
   - `press-button-action.ts` - Validates button target, handles yellow/brown (dam state), red (lights), blue (stub)
   - `index.ts` - Module exports

4. **Turn Bolt Action** - `actions/turn-bolt/`:
   - `types.ts` - Action ID and message constants
   - `turn-bolt-action.ts` - Validates bolt target, requires wrench, checks buttonPressed state
   - `index.ts` - Module exports with `setTurnBoltScheduler()` for wiring

5. **Updated `actions/index.ts`**:
   - Added imports for both new actions
   - Added to `customActions` array
   - Added re-exports

6. **Updated story imports** in `src/index.ts`:
   - Added `PRESS_BUTTON_ACTION_ID`, `PressButtonMessages`
   - Added `TURN_BOLT_ACTION_ID`, `TurnBoltMessages`, `setTurnBoltScheduler`

## What Still Needs to Be Done

### Immediate (to complete Phase 1):

1. **Add grammar patterns** in `extendParser()`:
   ```typescript
   // Press button patterns
   grammar.define('press :target').mapsTo(PRESS_BUTTON_ACTION_ID)...
   grammar.define('push :target').mapsTo(PRESS_BUTTON_ACTION_ID)...

   // Turn bolt patterns
   grammar.define('turn :target').mapsTo(TURN_BOLT_ACTION_ID)...
   grammar.define('turn :target with :instrument').mapsTo(TURN_BOLT_ACTION_ID)...
   ```

2. **Wire scheduler in `onEngineReady()`**:
   ```typescript
   setTurnBoltScheduler(engine.scheduler, this.damIds.reservoir);
   ```

3. **Add language messages** in `extendLanguage()`:
   - `PressButtonMessages.CLICK` → "Click."
   - `TurnBoltMessages.GATES_OPEN` → "The sluice gates open, and water pours through the dam."
   - etc.

4. **Build and test** with transcript test

### Later (Phase 2-3):

- Blue button flooding daemon (16-turn death trap)
- Red button light toggle
- Dynamic bolt description (green bubble glowing when enabled)
- Dam state affecting reservoir description

## Key Design Decisions

1. **Button identification**: Using `buttonColor` property on entity rather than name matching
2. **Dam state**: Reusing existing `DAM_STATE_KEY` capability from `dam-fuse.ts`
3. **Wrench requirement**: Action checks inventory for wrench if not specified as instrument
4. **Scheduler wiring**: Using `setTurnBoltScheduler()` pattern (like GDT) to inject scheduler reference

## Files Modified

- `stories/dungeo/src/regions/dam/objects/index.ts` - Added button and bolt creation
- `stories/dungeo/src/actions/index.ts` - Added new action exports
- `stories/dungeo/src/index.ts` - Added imports (grammar/language not yet added)

## Next Steps to Resume

1. Read `stories/dungeo/src/index.ts` from line 1000+
2. Add grammar patterns after UNTIE patterns (around line 1022)
3. Add language messages in `extendLanguage()` (around line 1028+)
4. Add `setTurnBoltScheduler()` call in `onEngineReady()` (around line 1568+)
5. Build: `./scripts/bundle-sharpee.sh`
6. Test with transcript test

## References

- `docs/work/dungeo/dam-plan.md` - Full implementation plan
- `docs/dungeon-ref/objects.for` lines 1017-1157 - FORTRAN bolt/button logic
- `stories/dungeo/src/scheduler/dam-fuse.ts` - Existing draining sequence

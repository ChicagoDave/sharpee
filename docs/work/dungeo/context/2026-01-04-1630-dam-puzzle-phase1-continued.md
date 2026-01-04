# Work Summary: Dam Puzzle Phase 1 (Continued)

**Date**: 2026-01-04
**Duration**: ~45 minutes
**Feature/Area**: Dam Puzzle - Fixing TypeScript errors and entity visibility
**Status**: IN PROGRESS - Paused with TypeScript fixes pending compilation

## Objective

Continue Phase 1 of the dam puzzle implementation from the previous session.

## What Was Accomplished

### 1. Completed Grammar and Language Wiring

Added to `stories/dungeo/src/index.ts`:

**Grammar patterns** (lines 1024-1049):
```typescript
// Press button patterns
grammar.define('press :target').mapsTo(PRESS_BUTTON_ACTION_ID).withPriority(150)
grammar.define('push :target').mapsTo(PRESS_BUTTON_ACTION_ID).withPriority(145)

// Turn bolt patterns
grammar.define('turn :target').mapsTo(TURN_BOLT_ACTION_ID).withPriority(150)
grammar.define('turn :target with :instrument').instrument('instrument').mapsTo(TURN_BOLT_ACTION_ID).withPriority(155)
```

**Language messages** (lines 1523-1537):
- `PressButtonMessages.CLICK` → "Click."
- `PressButtonMessages.NOT_A_BUTTON` → "That's not a button."
- `PressButtonMessages.LIGHTS_ON/OFF` → Light toggle messages
- `PressButtonMessages.BLUE_JAMMED` → "The blue button appears to be jammed."
- `TurnBoltMessages.GATES_OPEN/CLOSE` → Sluice gate messages
- `TurnBoltMessages.WONT_TURN` → "The bolt won't turn. Perhaps the control panel..."
- `TurnBoltMessages.NO_TOOL` → "You can't turn the bolt with your bare hands."

**Scheduler wiring** (line 1743):
```typescript
setTurnBoltScheduler(scheduler, this.damIds.reservoir);
```

### 2. Discovered Critical Issue: Stale Compiled JS

The bundle was using old compiled JavaScript that didn't include `createMaintenanceButtons()` or `createDamBolt()`. This explained why the buttons and bolt weren't in the game.

**Root cause**: TypeScript compilation was failing silently due to type errors in the new action files.

### 3. Fixed TypeScript Errors in Action Files

**press-button-action.ts**:
- Changed from `command.parsed?.structure.directObject?.entityRef` to `context.command.directObject?.entity`
- Removed `world.emitEvent?.()` calls (method doesn't exist on WorldModel)

**turn-bolt-action.ts**:
- Same fixes for entity access pattern
- Simplified instrument handling (just checks inventory for wrench)
- Removed `world.emitEvent?.()` call

### 4. Removed SceneryTrait from Buttons/Bolt

Changed in `regions/dam/objects/index.ts`:
- Removed `SceneryTrait()` from all four buttons (yellow, brown, red, blue)
- Removed `SceneryTrait()` from bolt
- Added comments explaining they need to be in parser scope

## What Still Needs to Be Done

### Immediate (to complete Phase 1):

1. **Recompile the story**:
   ```bash
   npx tsc -p stories/dungeo/tsconfig.json
   ```

2. **Rebuild bundle**:
   ```bash
   ./scripts/bundle-sharpee.sh
   ```

3. **Run dam puzzle test**:
   ```bash
   ./scripts/fast-transcript-test.sh stories/dungeo stories/dungeo/tests/transcripts/dam-puzzle.transcript --verbose
   ```

4. **If buttons still not visible**: The issue may be that items without SceneryTrait still aren't being included in scope. May need to investigate scope rules or use a different approach.

### Potential Scope Issue

The parser's scope evaluator may not be including certain items. The control panel (with SceneryTrait) IS visible, but buttons (now without SceneryTrait) may still not be. If recompilation doesn't fix visibility, consider:

1. Making buttons children of the control panel (containment)
2. Adding buttons to scope explicitly via story initialization
3. Investigating why some items are visible and others aren't

## Files Modified This Session

- `stories/dungeo/src/index.ts` - Grammar, language, scheduler wiring
- `stories/dungeo/src/actions/press-button/press-button-action.ts` - Fixed type errors
- `stories/dungeo/src/actions/turn-bolt/turn-bolt-action.ts` - Fixed type errors
- `stories/dungeo/src/regions/dam/objects/index.ts` - Removed SceneryTrait from buttons/bolt

## Test Files

- `stories/dungeo/tests/transcripts/dam-puzzle.transcript` - Main test
- `stories/dungeo/tests/transcripts/dam-debug.transcript` - Debug test (can delete)

## Next Steps to Resume

1. Run: `npx tsc -p stories/dungeo/tsconfig.json`
2. Check for any remaining errors
3. Run: `./scripts/bundle-sharpee.sh`
4. Run: `./scripts/fast-transcript-test.sh stories/dungeo stories/dungeo/tests/transcripts/dam-puzzle.transcript --verbose`
5. If still failing, investigate scope/visibility issues

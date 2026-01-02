# Work Summary: Inside Mirror Puzzle Fix

**Date**: 2026-01-02
**Branch**: dungeo
**Commit**: be363b3

## Summary

Fixed the Inside Mirror puzzle in the endgame region. The puzzle involves a rotating wooden box with colored panels (red/yellow for rotation, mahogany/pine for movement) and a pole mechanism that locks/unlocks different operations.

## Bugs Found and Fixed

### 1. Story Dist Out of Date
The story TypeScript was newer than the compiled JavaScript. Grammar patterns for `push red panel`, `push red`, etc. weren't being included in the parser.

**Fix**: Rebuilt story with `pnpm --filter '@sharpee/story-dungeo' run build`

### 2. Double Execution of State Changes
Event handlers for `if.event.lifted`, `if.event.lowered`, and `if.event.pushed` were calling `raisePole()`, `lowerPole()`, `rotateBox()`, and `moveBox()` - but the actions (lift-action, lower-action, push-panel-action) already call these functions in their `execute()` methods.

This caused:
- Rotation jumping 90° instead of 45° (push red called rotateBox twice)
- Pole state getting corrupted

**Fix**: Removed the event handlers from `inside-mirror-handler.ts`. Actions own state changes, daemon handles feedback messages.

### 3. Nullish Coalescing Bug (Root Cause of Most Failures)
In `getMirrorState()`:
```typescript
// Before - WRONG: 0 is falsy, so POLE_LOWERED (0) becomes POLE_ON_FLOOR (1)
poleState: (world.getStateValue(POLE_STATE_KEY) as number) || POLE_ON_FLOOR

// After - CORRECT: only null/undefined triggers default
poleState: (world.getStateValue(POLE_STATE_KEY) as number) ?? POLE_ON_FLOOR
```

This bug meant that after successfully lowering the pole into the channel (state = 0), any subsequent check would see state = 1 (on floor), causing "box_cant_move_unlocked" errors.

### 4. Message Params Wrapper
Game.message events needed `params: { direction }` instead of `direction` directly at the data level for the language provider to interpolate `{direction}` in message templates.

**Before**: `data: { messageId: '...', direction: newDirection }`
**After**: `data: { messageId: '...', params: { direction: newDirection } }`

### 5. rawInput Access Path
In `push-panel-action.ts`, changed `context.command.rawInput` to `context.command.parsed?.rawInput` to match the ValidatedCommand interface.

## Test Results

- **Endgame tests**: 56/56 pass
- **All dungeo tests**: 461 pass, 7 fail (failures are in Royal Puzzle, not Inside Mirror)

## Files Changed

- `stories/dungeo/src/handlers/inside-mirror-handler.ts`
  - Removed redundant event handlers (76 lines deleted)
  - Fixed nullish coalescing operator
  - Fixed message params wrapper

- `stories/dungeo/src/actions/push-panel/push-panel-action.ts`
  - Fixed rawInput access path

## Key Debugging Insight

Used `PARSER_DEBUG=true` environment variable to trace grammar pattern matching. This revealed that the story's `push red panel` patterns weren't being tried at all - only stdlib's `push :target` was matching.

This led to discovering the story dist was out of date, which was the first domino in the chain of issues.

## Next Steps

- Royal Puzzle has 7 failing tests (movement and card retrieval issues)
- Endgame puzzles still needed: trivia questions, dial mechanism, victory condition

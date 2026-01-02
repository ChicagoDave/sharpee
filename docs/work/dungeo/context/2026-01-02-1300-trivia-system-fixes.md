# Work Summary: Trivia System Fixes and GDT TQ Command

**Date**: 2026-01-02
**Time**: ~1:00 PM CST
**Duration**: ~45 minutes
**Branch**: dungeo

## Objective

Fix the Dungeon Master trivia system that was implemented earlier but had several issues preventing it from working correctly.

## Issues Fixed

### 1. Greedy Text Slot Bug (answer action not parsing multi-word answers)

**Problem**: "answer rusty knife" produced `Parse failed: INVALID_SYNTAX` while "answer forest" worked.

**Root Cause**: The grammar registration was:
```typescript
grammar
  .define('answer :text...')
  .text('text')  // BUG: This overwrites TEXT_GREEDY with TEXT
  .mapsTo(ANSWER_ACTION_ID)
```

The `:text...` syntax sets `SlotType.TEXT_GREEDY` for multi-word capture, but calling `.text('text')` overwrote it with `SlotType.TEXT` (single word only).

**Fix**: Removed the `.text('text')` call. The `:text...` syntax is sufficient.

### 2. Door Not Opening After Trivia Passed

**Problem**: After answering 3 questions correctly, going N showed "no_exits".

**Root Cause**: The answer action set `world.setStateValue('dungeonMaster.doorOpen', true)` but nothing actually added the N exit to Dungeon Entrance.

**Fix**: Added `openDungeonDoor(context)` function that:
1. Gets Dungeon Entrance room (player's current location)
2. Finds Narrow Corridor by name
3. Adds `roomTrait.exits[Direction.NORTH] = { destination: narrowCorridorId }`

### 3. Non-Deterministic Trivia Start

**Problem**: Trivia starts with a random question (0-7), making transcript tests non-deterministic.

**Fix**: Created GDT TQ command with `TQ RESET` to set question 0.

## New GDT TQ Command

Created `/stories/dungeo/src/actions/gdt/commands/tq.ts`:

| Command | Description |
|---------|-------------|
| `TQ` | Display current trivia state |
| `TQ RESET` | Reset to question 0 (deterministic) |
| `TQ SOLVE` | Auto-solve trivia and open door |
| `TQ Q <n>` | Set current question (0-7) |
| `TQ PASS` | Mark trivia as passed, open door |
| `TQ FAIL` | Mark trivia as failed |

### Registration Required in 4 Places

1. **types.ts** - Added `'TQ'` to `GDTCommandCode` union type
2. **gdt-parser.ts** - Added `'TQ'` to `VALID_CODES` Set
3. **index.ts** - Added `'tq'` to `twoArgCodes` array for grammar registration
4. **commands/index.ts** - Imported and registered `tqHandler`

## Files Modified

- `stories/dungeo/src/actions/answer/answer-action.ts` - Added door opening logic
- `stories/dungeo/src/actions/gdt/commands/tq.ts` - New file
- `stories/dungeo/src/actions/gdt/commands/index.ts` - Register TQ handler
- `stories/dungeo/src/actions/gdt/gdt-parser.ts` - Add TQ to valid codes
- `stories/dungeo/src/actions/gdt/types.ts` - Add TQ to type
- `stories/dungeo/src/index.ts` - Remove .text() call, add tq to grammar
- `stories/dungeo/tests/transcripts/endgame-trivia.transcript` - Use TQ RESET

## Test Results

All 485 transcript tests pass (5 expected failures for pre-existing Bat Room issues).

## Key Learnings

1. **Grammar slot types**: `:slot...` syntax automatically sets `TEXT_GREEDY`. Don't call `.text()` which overrides to single-word `TEXT`.

2. **GDT commands require 4 registrations**: Type, parser valid codes, grammar patterns, and handler registration.

3. **Dynamic exits**: Room exits can be added at runtime by modifying `roomTrait.exits`.

## Trivia Question Cycle

With `TQ RESET` (starts at Q0):
- Q0 (temple) → +3 → Q3 (flask) → +3 → Q6 (rusty knife) → PASS

Questions and answers:
| Q# | Topic | Answer |
|----|-------|--------|
| 0 | Room to reach thief's lair | temple |
| 1 | Where from altar besides temple | forest |
| 2 | Minimum zorkmid treasure value | 30003 |
| 3 | How to read the cakes | flask |
| 4 | Useful thing with mirror | rub |
| 5 | Body part offends spirits | bones |
| 6 | Object that is haunted | rusty knife |
| 7 | Is 'hello sailor' useful | no |

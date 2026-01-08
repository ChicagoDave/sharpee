# Work Summary: Coal Machine Puzzle Complete

**Date:** 2026-01-07
**Branch:** dungeo

## Completed Work

### 1. CLAUDE.md Documentation Update

Added comprehensive documentation for **Capability Dispatch, Actions, and Event Handlers (ADR-090)**:

- Pattern decision tree for choosing between story actions, capability dispatch, and event handlers
- Verbs with standard semantics (TAKE, DROP, OPEN, PUT) vs verbs with no standard semantics (LOWER, TURN, WAVE)
- Code examples for trait/behavior pattern
- Story grammar extension patterns
- Coal machine example showing correct approach

### 2. Coal Machine Puzzle Implementation

**Files created/modified:**
- `stories/dungeo/src/actions/turn-switch/types.ts` - Action ID and message IDs
- `stories/dungeo/src/actions/turn-switch/turn-switch-action.ts` - Full 4-phase action
- `stories/dungeo/src/actions/turn-switch/index.ts` - Module exports
- `stories/dungeo/src/actions/index.ts` - Added turn-switch to customActions
- `stories/dungeo/src/regions/coal-mine/objects/index.ts` - Updated machine with ContainerTrait + OpenableTrait
- `stories/dungeo/src/index.ts` - Grammar patterns and messages

**Puzzle flow:**
1. `put coal in machine` - stdlib putting action (machine is ContainerTrait)
2. `turn switch` - story action validates coal present, removes coal, creates diamond
3. Diamond treasure (16 pts: 10 take + 6 case) appears in machine

**Grammar patterns:** "turn switch", "turn the switch", "flip switch", "activate machine"

### 3. Implementation Plan Updates

- Basket: ✅ Done (was already working from previous session)
- Coal machine: ✅ Done
- Puzzles: 23/~25 (92%)

### 4. Test Results

- Coal machine transcript test: 16/16 passed
- All transcripts: 755 tests, 750 passed, 5 expected failures

## In Progress: Coffin Transport Puzzle

Started researching but interrupted. Key findings:
- Gold coffin CAN already be taken (no SceneryTrait)
- Puzzle is about **routing**, not portability
- "Drain reservoir, carry coffin across" - reservoir blocks a path until drained
- Need to verify reservoir state changes when dam drains

## Next Steps

1. **Coffin transport puzzle** - Verify reservoir walkability when drained, test full route
2. **Remaining puzzles:**
   - INFLATE/DEFLATE actions (boat)
   - Water current (river auto-movement)
   - Robot commands ("tell robot 'X'" syntax)

## Research Needed: Weight/Capacity System

**Important context for coffin puzzle:** All objects in Zork have an interwoven weight/capacity system. The PC can only carry so much based on numerical weight values.

Tasks for next session:
- Research how FORTRAN/MDL Zork implemented object weights
- Check current Sharpee weight/capacity implementation in ActorBehavior.canTakeItem()
- Verify coffin has appropriate weight (it's heavy - may affect route choices)
- Check if boat has weight capacity limits (can't carry coffin in boat?)
- The drained reservoir route may be the ONLY way to transport heavy items like the coffin

This may explain why "drain reservoir, carry coffin across" is a puzzle - it's not just about the route existing, but about the coffin being too heavy for alternative transport methods (boat).

## Test Commands

```bash
# Run coal machine test
node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/transcripts/coal-machine.transcript

# Run all transcripts
node packages/transcript-tester/dist/cli.js stories/dungeo --all
```

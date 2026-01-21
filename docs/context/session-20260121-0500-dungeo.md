# Session Summary: 2026-01-21 - dungeo

## Status: Completed

## Goals
- Implement grue death mechanics per FORTRAN verbs.f source
- Use correct event patterns (if.event.player.died, no action.success)

## Completed

### 1. Grue Death Mechanics Implementation

Implemented canonical grue death from Mainframe Zork FORTRAN source (verbs.f lines 1846-1897).

**Behavior per FORTRAN**:
- Grue check triggers when moving FROM a dark room (not entering)
- 25% survival roll (PROB(25,25)) - if passed, normal movement proceeds
- On 75% grue path:
  - Invalid exit → death (message 522)
  - Blocked exit (closed door) → death (message 523)
  - Dark destination → death (message 522)
  - Lit destination → survive
- GDT ND command (immortality) bypasses grue check

**Files Created**:
- `stories/dungeo/src/actions/grue-death/types.ts` - Action ID and message constants
- `stories/dungeo/src/actions/grue-death/grue-death-action.ts` - 4-phase death action
- `stories/dungeo/src/actions/grue-death/index.ts` - Exports
- `stories/dungeo/src/handlers/grue-handler.ts` - Command transformer

**Death Messages**:
- `dungeo.grue.walked_into`: "Oh, no! You have walked into the slavering fangs of a lurking grue!"
- `dungeo.grue.slithered_into`: "Oh, no! A lurking grue slithered into the room and devoured you!"

### 2. Event Pattern Correction

Updated death actions to use proper domain event pattern instead of `action.success`.

**Before** (incorrect - caused duplicate messages):
```typescript
return [
  context.event('action.success', { messageId: ... }),
  context.event('game.player_death', { messageId: ... })
];
```

**After** (correct):
```typescript
return [
  context.event('if.event.player.died', {
    messageId: GrueDeathMessages.WALKED_INTO_GRUE,
    cause: 'grue',
    deathType: 'walked_into'
  })
];
```

**Files Updated**:
- `stories/dungeo/src/actions/grue-death/grue-death-action.ts` - Uses if.event.player.died
- `stories/dungeo/src/actions/falls-death/falls-death-action.ts` - Updated to same pattern
- `stories/dungeo/src/index.ts` - Death penalty handler listens for if.event.player.died

### 3. Transcript Tests

Created two test files:
- `stories/dungeo/tests/transcripts/grue-mechanics.transcript` - Comprehensive test (29 passed, 3 expected failures, 1 skipped)
- `stories/dungeo/tests/transcripts/grue-death-simple.transcript` - Simple death verification (12 passed, 1 skipped)

## Key Decisions

### 1. Event Pattern for Deaths
Used `if.event.player.died` instead of `game.player_death` + `action.success`. This follows the ADR-097 pattern where domain events carry `messageId` directly for text service rendering, eliminating the need for separate action.success events.

### 2. GDT Integration
Grue handler checks GDT immortal flag via `getGDTFlags(world).immortal`. The ND (No Deaths) command prevents grue deaths, allowing safe testing and debugging in dark areas.

### 3. Test Strategy for Probabilistic Behavior
Since grue death has 25% survival chance, tests use:
- `[FAIL: contains "grue"]` to verify grue NOT present in lit rooms
- `[SKIP]` for actual dark-to-dark movement (probabilistic outcome)
- GDT ND to test immortality mode deterministically

## Files Modified

**Story - New Files (6)**:
- `stories/dungeo/src/actions/grue-death/types.ts`
- `stories/dungeo/src/actions/grue-death/grue-death-action.ts`
- `stories/dungeo/src/actions/grue-death/index.ts`
- `stories/dungeo/src/handlers/grue-handler.ts`
- `stories/dungeo/tests/transcripts/grue-mechanics.transcript`
- `stories/dungeo/tests/transcripts/grue-death-simple.transcript`

**Story - Modified Files (3)**:
- `stories/dungeo/src/actions/index.ts` - Added grue death exports
- `stories/dungeo/src/actions/falls-death/falls-death-action.ts` - Updated event pattern
- `stories/dungeo/src/index.ts` - Messages, transformer registration, death handler event type

**Documentation (1)**:
- `docs/work/issues/issues-list.md` - Added ISSUE-027 (grue implementation)

## Architectural Notes

### Domain Events with messageId
The text service processes domain events (like `if.event.player.died`) that carry a `messageId`. This replaces the legacy pattern of emitting `action.success` with a messageId. Benefits:
1. Single event instead of two
2. No duplicate message rendering
3. Cleaner semantic meaning

### Command Transformer Pattern
The grue handler uses `ParsedCommandTransformer` to intercept GO commands in dark rooms and conditionally redirect to the grue death action. This pattern is also used for:
- Falls death (any non-LOOK action at Aragain Falls)
- Rainbow blocking (GO WEST before waving sceptre)
- River entry (water rooms without boat)

## Testing Notes

Both grue tests pass:
```
grue-mechanics.transcript: 29 passed, 3 expected failures, 1 skipped
grue-death-simple.transcript: 12 passed, 1 skipped
```

The "expected failures" are `[FAIL: contains "grue"]` assertions that verify grue is NOT mentioned when moving in lit rooms.

## Notes

**Session duration**: ~2 hours

**Approach**: Implemented from FORTRAN source documentation in `docs/work/dungeo/grue-logic.md`. Initial implementation had duplicate death message bug due to both `action.success` and domain event rendering the messageId. Fixed by removing action.success and using only the domain event.

---

**Progressive update**: Session completed 2026-01-21 05:15

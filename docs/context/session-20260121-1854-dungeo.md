# Session Summary: 2026-01-21 - dungeo

## Status: Completed

## Goals
- Investigate meta-command turn counting bug
- Design architectural fix for meta-command execution

## Completed

### Bug Investigation

**Problem**: Meta-commands (VERSION, SCORE, etc.) incorrectly interact with turn counting:
1. When entering VERSION, turn count incorrectly increments
2. The next command (meta or regular) does not increment turn count

**Root Cause Identified**: Current architecture treats meta-commands as "regular commands with flags" using scattered `if (!isMeta)` checks throughout `executeTurn()`. This creates:
- Shared turn number issues (meta gets a turn number even though it operates outside turn cycle)
- turnEvents confusion (events stored/cleared by turn number, but meta-commands don't advance turn)
- Event accumulation edge cases when multiple meta-commands run
- Implicit coupling (turn machinery must explicitly exclude metas)

**Technical Analysis**: The bug occurs because `turn` is captured at the START of `executeTurn()`, but turn increment happens at the END. Meta-commands leave `turn` unchanged, so the next command reuses the same turn number.

### Design Solution: Early Divergence

Created comprehensive design document at `docs/work/platform/meta-commands.md` proposing a clean architectural separation.

**Core Concept**: Detect meta-commands after parsing and route them to a completely separate `executeMetaCommand()` path that doesn't interact with turn machinery.

**Key architectural decisions**:

1. **Detection Point**: After parsing, check if action ID is in MetaCommandRegistry, then route to separate execution path

2. **Separate Result Type**: New `MetaCommandResult` (type, input, success, events) vs existing `TurnResult` (includes turn number)

3. **Events Through Text Service**: Meta-commands still emit semantic events processed through text service for i18n, but events are NOT stored in turnEvents

4. **No Turn State Modification**: Meta-commands don't increment turn, trigger NPCs, create undo snapshots, or update command history

5. **Platform Operations**: SAVE, RESTORE, QUIT, AGAIN handled inline with completion events (not queued)

6. **AGAIN Special Case**: Recursively calls executeTurn() with previous command, which dispatches to meta or regular path as appropriate

## Key Decisions

### 1. Separate Execution Paths vs Unified Path with Flags

**Decision**: Use separate `executeMetaCommand()` method instead of continuing with `if (!isMeta)` checks throughout `executeTurn()`.

**Rationale**:
- Eliminates implicit coupling between meta and regular command flow
- Makes meta-command behavior explicit and intentional
- Prevents event accumulation bugs from shared turn numbers
- Clearer code structure with distinct responsibilities

### 2. Events Still Use Text Service (Language Layer Separation)

**Decision**: Meta-commands emit semantic events processed through text service, just not stored in turnEvents.

**Rationale**:
- Preserves language layer separation principle (no hardcoded English strings)
- Enables i18n for meta-command output
- Events processed immediately in same call rather than deferred
- text:output event still used for client communication

### 3. New Result Type vs Optional Turn Field

**Decision**: Create distinct `MetaCommandResult` type rather than making turn optional in `TurnResult`.

**Rationale**:
- Type system enforces that meta-commands don't have turns
- Callers must explicitly handle both cases
- Prevents accidental use of undefined turn values
- Makes the architectural separation clear in the type system

### 4. Platform Operations Handled Inline

**Decision**: Process platform operations (SAVE, QUIT, etc.) directly in `executeMetaCommand()` rather than queueing in `pendingPlatformOps`.

**Rationale**:
- Meta-commands complete immediately (not deferred to end of turn)
- Completion events added to event list for text rendering
- Simpler flow for operations that don't affect turn state

## Open Items

### Short Term (Implementation)

**Phase 1: Add executeMetaCommand Method**
- Add `MetaCommandResult` type to `packages/engine/src/types.ts`
- Add `executeMetaCommand()` method to `packages/engine/src/game-engine.ts`
- Add early detection check at start of `executeTurn()`
- Route meta-commands to new method

**Phase 2: Migrate Text Processing**
- Create `processMetaEvents()` helper to process events directly to text (without turnEvents)
- Use in `executeMetaCommand()`
- Ensure text output emits via `text:output` event

**Phase 3: Handle Platform Operations**
- Extract platform operation handling to separate method
- Call from `executeMetaCommand()` for SAVE/RESTORE/QUIT/AGAIN
- Ensure proper completion events are returned

**Phase 4: Clean Up**
- Remove `if (!isMeta)` checks from regular turn path
- Remove meta-command handling from turnEvents logic
- Update tests for new behavior

**Phase 5: Update Return Type**
- Change `executeTurn()` return type to `CommandResult` union
- Update all callers to handle both result types
- Update clients (CLI, browser) to handle `MetaCommandResult`

### Long Term

- Consider if other command categories need similar separation
- Evaluate if story-registered meta-commands work correctly with new architecture
- Document meta-command authoring guidelines for story writers

## Files Modified

**Platform Design** (1 file):
- `docs/work/platform/meta-commands.md` - Complete architectural design document

**Implementation Pending** (0 files committed):
- `packages/engine/src/types.ts` - Will add MetaCommandResult type
- `packages/engine/src/game-engine.ts` - Will add executeMetaCommand() method
- `packages/engine/tests/` - Will need test updates
- Client packages - May need updates to handle new result type

## Architectural Notes

### Language Layer Separation Preserved

The design maintains Sharpee's core principle that all text goes through the language layer. Meta-commands emit semantic events with message IDs (not English strings), and the text service resolves these to actual prose. The key difference is timing: meta events are processed immediately rather than stored in turnEvents.

### Explicit vs Implicit Exclusion

Current architecture requires every turn-related operation to check `if (!isMeta)` to exclude meta-commands. The new design makes exclusion implicit by separating the execution paths entirely. Meta-commands can't trigger NPCs or increment turns because they never enter that code path.

### Type Safety as Documentation

Using distinct result types (`MetaCommandResult` vs `TurnResult`) makes the architectural separation visible in the type system. Callers must explicitly handle both cases, making it impossible to accidentally assume a meta-command has a turn number.

### AGAIN Command Insight

AGAIN is architecturally interesting: it's a meta-command that invokes `executeTurn()` recursively with the previous command. The repeated command dispatches normally (meta path if it was meta, regular path if it was regular). This means AGAIN itself doesn't increment the turn, but the command it repeats might. Clean recursive design.

### Platform Operations Flow

Platform operations (SAVE, RESTORE, QUIT) currently queue completion events that are processed at end of turn. For meta-commands, these are handled inline because metas complete immediately. The completion events (e.g., `platform.save_completed`) are added to the event list and rendered through the text service like any other semantic event.

## Alternative Approaches Rejected

### Option 2: Meta-Command Phase
Add explicit phase concept where meta-commands run in "phase 0" before turn cycle.

**Rejected because**:
- More complex conceptually
- Still interacts with turn machinery
- Doesn't solve the "no turn number" problem cleanly

### Option 3: TurnResult with Optional Turn
Make turn number optional in TurnResult instead of separate type.

**Rejected because**:
- Doesn't fix event accumulation issues
- Still routes through same code path
- Callers must handle optional turn anyway (no type safety improvement)
- Less explicit about architectural separation

## Notes

**Session duration**: ~40 minutes

**Approach**: Bug reproduction, root cause analysis, architectural design

**Context**: This work is a **platform change** requiring user approval before implementation (per CLAUDE.md guidelines). The design is complete and ready for review, but no code has been written yet pending discussion.

**Related Work**:
- Previous session (2026-01-21 1838): Fixed text accumulation bug in transcript tester (related event handling issue)
- ADR-051: Four-phase action pattern (meta-commands follow this in new design)
- ADR-052: Event handlers (meta events still use semantic event system)

**Testing Strategy**: Will need tests to verify:
- VERSION/SCORE/DIAGNOSE/HELP don't increment turn
- Regular commands after meta-commands increment correctly
- Multiple meta-commands in a row work correctly
- Platform operations (SAVE, RESTORE, QUIT) still work
- AGAIN correctly dispatches repeated command
- Story-registered meta-commands work with new architecture

---

**Progressive update**: Session completed 2026-01-21 19:21

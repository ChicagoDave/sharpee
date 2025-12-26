# IF Logic Assessment: Quitting Action

## Action Summary
**Quitting** - Terminates the interactive fiction game session, with optional confirmation and unsaved progress warnings.

## What It Does in IF Terms
The quitting action handles player exit from the game world. In classic IF conventions, QUIT terminates the game session and returns control to the platform (OS or interpreter). The action collects game state context (score, moves, save status) and emits events for the engine to handle confirmation dialogs and cleanup.

## Core IF Validations
Basic IF expectations for QUIT:
1. **Always succeeds** - QUIT should never be blocked by game state (player can't be "prevented" from exiting)
2. **Confirmation handling** - Platform should confirm before terminating (prevents accidental quits)
3. **Unsaved progress warning** - Notify player if game progress hasn't been saved since last move
4. **Save score/stats** - Capture final game state (score, move count) before exit
5. **Clean termination** - Game should end gracefully without errors

## Implementation Coverage

**Strengths:**
- Correctly implements "always valid" - validate() returns success unconditionally ✓
- No world mutations in execute phase - proper separation of concerns ✓
- Captures essential game state (score, moves, unsaved progress) for reporting ✓
- Detects unsaved changes and includes in context ✓
- Supports force quit bypass (--force, --now, exit aliases) for scripting ✓
- Emits confirmation query event (client.query) for platform to handle ✓

**Gaps in Basic IF Logic:**
1. **No "goodbye" message** - Standard IF games typically output a farewell message before terminating. Currently no `if.event.goodbye` or similar.
2. **Silent success for force quit** - When forcing quit, no final_score or goodbye narrative is emitted. Player exits without closure.
3. **No final score event** - Traditional IF games show final score before quit. This action doesn't explicitly emit a score report event for normal (non-forced) quits.

## Assessment Verdict

**Basic IF expectations: 80% covered**

The implementation correctly handles the mechanical aspects (always valid, no mutations, state capture, confirmation query). However, it lacks narrative closure mechanics expected in IF - specifically the final score report and goodbye message that traditionally frame the game ending.

The action focuses on platform event emission and state tracking but delegates too much to the engine's quit hook, potentially missing the chance to provide player-facing closure within the action's reporting phase.

## Recommendation
Add if.event.goodbye and optionally if.event.final_score to the report phase for non-forced quits to provide complete IF narrative closure.

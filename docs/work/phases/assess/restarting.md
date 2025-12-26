# IF Logic Assessment: Restarting Action

## Action Name and Brief Description
**Restarting** - Meta-action that initiates a game restart, returning the player to the initial game state while optionally warning about loss of unsaved progress.

## What the Action Does in IF Terms
The restarting action allows players to command a restart of the game session. This is a **meta-action** (like quitting or saving) that doesn't mutate world state but instead emits a platform event signaling the engine to perform a full restart. The action:
1. Analyzes current game progress (score, moves, location)
2. Determines if confirmation is needed (based on unsaved progress or significant play)
3. Emits events for the engine to handle the actual restart mechanism

## Core IF Validations It Should Check
1. **Restart availability** - Is restart allowed in this game? (Some IF games may restrict it)
2. **Context for confirmation** - Has there been significant play (moves > threshold)?
3. **Unsaved progress detection** - Are there changes since the last save?
4. **Force vs. normal restart** - Is the player forcing immediate restart or requesting with confirmation?

## Does the Current Implementation Cover Basic IF Expectations?
**Partially, but with gaps.**

### What it does well:
- Correctly implements four-phase pattern (validate/execute/report)
- Analyzes game state (score, moves, location) appropriately
- Detects unsaved progress correctly using `moves > lastSaveMove`
- Distinguishes force vs. normal restart with sensible thresholds
- Emits appropriate events (platform event + game event + hint)
- Uses `context.sharedData` correctly to avoid context pollution
- Properly delegates to engine via platform event

### Potential IF expectations not addressed:
1. **No validation of restart restrictions** - Unlike `saving` and `restoring` actions which check for disabled states, restarting always succeeds. IF games might need to forbid restart at certain story points (boss fights, critical moments, etc.)
2. **No consideration of game state** - Doesn't check if the game is in a restartable state (e.g., not in an uninterruptible sequence)
3. **No confirmation handling** - Sets `confirmationRequired` flag but doesn't emit explicit confirmation query event (compare to quitting which emits `client.query`). The platform handles this, but it's implicit.
4. **Arbitrary move threshold (10)** - The threshold for "significant progress" (moves > 10) lacks justification and may not suit all IF games

## Obvious Gaps in Basic IF Logic

1. **Missing restart restriction checks** - Should validate if restart is allowed via game state flags similar to save/restore:
   ```typescript
   const restartRestrictions = sharedData.restartRestrictions || {};
   if (restartRestrictions.disabled) {
     return { valid: false, error: 'restart_not_allowed' };
   }
   ```

2. **No explicit confirmation query event** - While the platform handles this, compare to the `quitting` action which explicitly emits a `client.query` event. This would make the intent clearer to event handlers.

3. **Implicit confirmation requirement** - The logic for confirmation is encoded in `confirmationRequired` but not explicitly documented. If unsaved progress exists OR moves > 10, confirmation is required—but the "why" isn't captured in the event.

4. **Missing "already at restart" check** - No prevention of restarting when already at the game start (moves === 0, location === startingLocation). While not critical, it's a minor UX consideration.

5. **Assumption about sharedData structure** - Uses `sharedData.moves` and `sharedData.lastSaveMove` but doesn't validate these exist. Should have safer defaults.

## Summary
The restarting action correctly implements the four-phase pattern and handles the core IF mechanic of game restart. However, it lacks the safety checks and explicit confirmation mechanisms present in similar meta-actions (`saving`, `restoring`, `quitting`). Most significantly, it doesn't check if restart is restricted by story logic—a critical IF feature for controlling when players can escape from game-imposed situations.

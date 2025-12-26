# IF Logic Assessment: Scoring Action

## Action Name and Description
**Scoring** - A meta-action that displays the player's current score, moves taken, and game progress without changing game state.

## What the Action Does in IF Terms
The SCORE command is a standard Interactive Fiction meta-command that shows:
- Current numeric score (points earned)
- Maximum possible score (if game tracks one)
- Number of moves/turns taken
- Player's completion percentage and rank (if maxScore is defined)
- Achievements earned (if any)
- Current game progress phase (early/mid/late/complete)

This is informational only—players can check progress without side effects.

## Core IF Validations It Should Check

1. **Is scoring enabled in this game?**
   - Some IF games don't use scoring at all
   - Must have a scoring capability configured on the world

2. **Is the player in a valid state to receive score information?**
   - Standard IF: Usually always available (even during cutscenes)
   - Current implementation: Only checks if capability exists

3. **What constitutes a "valid" score?**
   - Minimum expectations: score and moves are non-negative integers
   - If maxScore is set, score should not exceed it (logic error if it does)
   - Achievement list should be populated (if claimed)

## Current Implementation Coverage

**What it does correctly:**
- Validates that scoring capability exists (prevents errors)
- Follows four-phase pattern properly (validate → execute → blocked → report)
- Computes percentage and rank safely (zero-division checks present)
- Emits appropriate events without direct mutations
- Uses shared data correctly between phases
- Handles case where no maxScore is set (only shows score and moves)
- Calculates progress phases based on completion percentage

**Four-phase structure:**
1. **Validate**: Checks if SCORING capability exists (simple, correct)
2. **Execute**: Analyzes score data, stores in shared data (pure computation, no mutations)
3. **Blocked**: Returns proper error event if validation failed
4. **Report**: Emits `if.event.score_displayed` plus contextual messages

## Gaps in Basic IF Logic

1. **No validation of score data integrity**
   - Doesn't check if scoreValue ≤ maxScore (could happen if scoring logic has bugs)
   - Doesn't validate that moves is a sensible number
   - No warning if achievements are listed but score is 0

2. **Rank calculation edge case**
   - Rank assignment uses thresholds (25%, 50%, 75%, 90%) but no documentation of what these represent
   - No handling if someone reaches 100% but maxScore is 0 (contradictory state)
   - Rank names are hardcoded English strings without localization hooks

3. **Progress messaging doesn't distinguish game states**
   - Progress phase (early_game, mid_game, etc.) is purely percentage-based
   - Doesn't account for actual game completion conditions
   - IF games may be "complete" without reaching 100% score

4. **Missing IF convention: Moves counter interaction**
   - Standard IF: "SCORE" often triggers a turn advancement or not (varies by game)
   - Current implementation doesn't explicitly state turn handling
   - Most IF interpreters: SCORE is typically "free" (doesn't cost a turn)

## Recommendation

The implementation covers **basic IF expectations** for a meta-command:
- Only runs if scoring is configured ✓
- Displays score, moves, percentage, achievements ✓
- No world state changes ✓
- Emits proper events for output ✓

**Minor improvements** would be defensive programming (validate score ≤ maxScore) and clarifying turn cost, but these are not essential for core functionality.

**Status: Functionally adequate for IF** - meets minimum expectations for a SCORE command implementation.

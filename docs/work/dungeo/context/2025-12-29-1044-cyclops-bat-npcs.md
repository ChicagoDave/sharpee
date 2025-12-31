# Work Summary: Cyclops NPC, Say Action, and Bat Handler Implementation

**Date**: 2025-12-29
**Duration**: ~2 hours
**Feature/Area**: Dungeo - NPC System (Phase 3 NPCs)

## Objective

Implement three more Mainframe Zork NPCs/puzzles:
1. Cyclops NPC with speech-based puzzle ("Odysseus"/"Ulysses" magic words)
2. Custom "say" action for speaking to NPCs
3. Vampire Bat daemon-based handler for Bat Room puzzle

This continues the NPC implementation work following ADR-070 (NPC System Architecture) and ADR-071 (Daemons and Fuses).

## What Was Accomplished

### 1. Cyclops NPC (Complete)

Created full Cyclops NPC following the established Thief/Troll patterns from ADR-070.

#### Files Created
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/npcs/cyclops/cyclops-messages.ts`
  - Message IDs: `CYCLOPS_FLEES`, `CYCLOPS_BLOCKS_EXIT`
  - No speech or death messages (silent death like Troll)

- `/mnt/c/repotemp/sharpee/stories/dungeo/src/npcs/cyclops/cyclops-entity.ts`
  - Entity creation with NpcTrait and CombatantTrait
  - Initial location: Cyclops Room
  - Combat stats: health=30, skill=60 (very tough opponent)
  - Death handler: unblocks north exit, awards 10 points

- `/mnt/c/repotemp/sharpee/stories/dungeo/src/npcs/cyclops/cyclops-behavior.ts`
  - Extends NpcBehavior with custom `onSpokenTo` hook
  - Listens for "odysseus" or "ulysses" (case-insensitive)
  - On magic word: cyclops flees to Somewhere-Else, unblocks north exit, awards 10 points
  - Blocks north passage (Cyclops Room → Living Room via Strange Passage)

- `/mnt/c/repotemp/sharpee/stories/dungeo/src/npcs/cyclops/index.ts`
  - Module exports and `registerCyclops()` function

#### Key Implementation Details
- **Blocking behavior**: Cyclops blocks north exit in Cyclops Room using `blockExit()` from CombatantTrait
- **Speech puzzle**: When player says "odysseus" or "ulysses", cyclops flees without fighting
- **Combat option**: Player can also defeat cyclops in combat (but very difficult)
- **Scoring**: Awards 10 points either way (magic word or death)
- **Silent death**: Like Troll, cyclops has no death message (uses empty string)

### 2. Custom "Say" Action (Complete)

Created story-specific action for speaking to NPCs, primarily for the Cyclops puzzle.

#### Files Created
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/actions/say/types.ts`
  - Action ID: `'DUNGEO_SAY'`
  - Message constants for action feedback

- `/mnt/c/repotemp/sharpee/stories/dungeo/src/actions/say/say-action.ts`
  - Grammar patterns: `say :arg`, `say odysseus`, `say ulysses`
  - Three-phase action: validate/execute/report
  - Validate: checks for NPCs in current room
  - Execute: finds NPCs with `onSpokenTo` behavior, calls their handlers
  - Special handling for Cyclops - triggers flee on magic words
  - Generic fallback for other NPCs or empty room

- `/mnt/c/repotemp/sharpee/stories/dungeo/src/actions/say/index.ts`
  - Module exports

#### Files Modified
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/actions/index.ts`
  - Added export for say action

#### Key Implementation Details
- **Pattern matching**: Supports both `say odysseus` (specific word) and `say :arg` (any word)
- **NPC detection**: Finds all entities with NpcTrait in current room
- **Behavior invocation**: Calls `onSpokenTo(word)` on NPC behaviors that implement it
- **Cyclops-specific logic**: Directly handles Cyclops case in action (bypasses NPC service for simplicity)
- **Fallback messages**: Different responses for NPCs that don't respond vs. empty room

### 3. Vampire Bat Handler (Complete)

Created daemon-based handler for the Bat Room puzzle using ADR-071 patterns.

#### Files Created
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/handlers/bat-handler.ts`
  - Daemon that runs every turn checking player location
  - Triggers when player enters Bat Room (id: `'bat-room'`)
  - Checks for garlic in player inventory
  - WITH garlic: bat cowers, player can stay
  - WITHOUT garlic: bat carries player to random underground room
  - Uses `SchedulerContext` for proper daemon integration

- `/mnt/c/repotemp/sharpee/stories/dungeo/src/handlers/index.ts`
  - Added export for bat handler

#### Key Implementation Details
- **Daemon pattern**: Uses SchedulerService to register recurring check
- **Location check**: Uses `PlayerLocationService` to detect Bat Room entry
- **Inventory check**: Searches player inventory for garlic entity
- **Random teleport**: Picks random room from underground region when bat attacks
- **Message system**: Uses message IDs for all output (BAT_COWERS, BAT_ATTACKS, etc.)
- **One-time per entry**: Clears daemon after triggering to avoid repeated teleports

### 4. Story Integration

#### Files Modified
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/index.ts`
  - Imported and registered Cyclops NPC
  - Imported and registered "say" action with grammar patterns
  - Imported and registered bat handler daemon
  - Added all language messages:
    - Cyclops messages (flees, blocks exit)
    - Say action messages (no response, nobody here)
    - Bat handler messages (cowers, attacks, random rooms)

## Key Decisions

### 1. Custom "Say" Action vs. Core Action
**Decision**: Implemented "say" as story-specific action rather than core stdlib action.

**Rationale**:
- Speech mechanics are game-specific (not all IF uses "say")
- Allows Dungeo to define exact behavior for Cyclops puzzle
- Cleaner than extending Talking action (which is for conversation)
- Can be promoted to stdlib later if pattern proves useful

### 2. Direct Cyclops Handling in Say Action
**Decision**: Say action directly handles Cyclops case rather than going through generic NPC behavior system.

**Rationale**:
- Simplicity - single special case doesn't justify complex abstraction
- Cyclops is only NPC in Dungeo that responds to spoken words
- Easier to understand and maintain for story-specific puzzle
- Future work could extract if more NPCs need speech handling

### 3. Bat as Daemon vs. Room Event Handler
**Decision**: Implemented bat as daemon checking location each turn rather than room-level event handler.

**Rationale**:
- Matches ADR-071 daemon pattern (similar to Bank Alarm)
- Allows checking inventory on each turn player is in room
- Easy to disable after first trigger
- Room event handlers not yet implemented in engine

## Challenges & Solutions

### Challenge: Cyclops Speech Detection
**Problem**: How to trigger Cyclops behavior when player says magic word?

**Solution**:
1. Created custom "say" action with pattern matching for "odysseus"/"ulysses"
2. Action finds NPCs in room with `onSpokenTo` behavior hook
3. Cyclops behavior implements `onSpokenTo()` checking for magic words
4. Clean separation: action owns command parsing, behavior owns NPC logic

### Challenge: Bat Random Teleportation
**Problem**: How to teleport player to random underground room when bat attacks?

**Solution**:
1. Defined list of valid underground room IDs in bat-handler
2. Used `Math.random()` to pick random room from list
3. Used `PlayerLocationService.setLocation()` to teleport
4. Added descriptive message explaining what happened
5. Cleared daemon after first trigger to prevent repeated attacks

## Code Quality

- Build status: In progress (interrupted mid-build)
- Tests: Not yet written
- TypeScript: Should compile (needs verification)
- Follows patterns:
  - ADR-070: NPC System Architecture (Cyclops)
  - ADR-071: Daemons and Fuses (Bat handler)
  - Three-phase action pattern (Say action)

## Testing Status

### Not Yet Tested
- Cyclops NPC behavior
  - Magic word triggering ("odysseus"/"ulysses")
  - Exit unblocking on flee/death
  - Combat stats (health 30, skill 60)
  - Scoring (10 points on defeat/flee)

- Say action
  - Pattern matching (say :arg vs say odysseus)
  - NPC detection in room
  - Cyclops-specific handling
  - Fallback messages

- Bat handler
  - Garlic protection
  - Random teleportation
  - One-time triggering
  - Message output

### Recommended Test Scenarios
1. **Cyclops magic word**:
   ```
   > go east
   Cyclops Room
   A formidable cyclops blocks the north passage.

   > say odysseus
   The cyclops, hearing the name Odysseus, flees in terror!
   Your score just went up by 10 points.

   > north
   Strange Passage
   ```

2. **Cyclops combat**:
   ```
   > attack cyclops with sword
   [Combat ensues - very difficult due to skill 60]
   The cyclops collapses!
   Your score just went up by 10 points.
   ```

3. **Bat with garlic**:
   ```
   > take garlic
   Taken.

   > go to bat room
   Bat Room
   A vampire bat cowers in the corner, afraid of your garlic.
   ```

4. **Bat without garlic**:
   ```
   > go to bat room
   The vampire bat grabs you and carries you away!
   [Player teleported to random underground room]
   ```

## Next Steps

### Immediate (Required for Completion)
1. [ ] Verify build completes successfully
   ```bash
   pnpm --filter '@sharpee/dungeo' build
   ```

2. [ ] Write transcript tests for all three implementations:
   - `cyclops-magic-word.transcript` - Say "odysseus" to flee cyclops
   - `cyclops-combat.transcript` - Defeat cyclops in combat
   - `bat-with-garlic.transcript` - Enter Bat Room with garlic
   - `bat-without-garlic.transcript` - Enter Bat Room without garlic

3. [ ] Run transcript tests:
   ```bash
   node packages/transcript-tester/dist/cli.js stories/dungeo --all
   ```

### Follow-up NPCs/Puzzles
4. [ ] Implement Spirits/Exorcism puzzle
   - Bell, book, and candles ritual
   - Event handlers for correct sequence
   - Room state changes (remove spirits)

5. [ ] Create "ring" custom action
   - For ringing the bell in exorcism ritual
   - Pattern: `ring bell`, `ring :target`

6. [ ] Review all Phase 3 NPCs (Thief, Troll, Cyclops, Bat, Spirits)
   - Ensure consistent patterns
   - Verify scoring integration
   - Check for edge cases

### Technical Debt
7. [ ] Consider extracting speech system
   - If more NPCs need `onSpokenTo` behavior
   - Could promote "say" to stdlib if pattern proves useful
   - Document speech behavior pattern in ADR-070 update

## References

- **ADR-070**: NPC System Architecture
  - `/mnt/c/repotemp/sharpee/docs/architecture/adrs/ADR-070-npc-system.md`
  - Cyclops follows established NPC patterns

- **ADR-071**: Daemons and Fuses (Timed Events)
  - `/mnt/c/repotemp/sharpee/docs/architecture/adrs/ADR-071-daemons-fuses.md`
  - Bat handler uses daemon pattern

- **Implementation Plan**: Phase 3 - NPCs
  - `/mnt/c/repotemp/sharpee/docs/work/dungeo/implementation-plan.md`
  - Section 3.4: NPCs (Thief, Troll, Cyclops, Bat, Spirits)

- **Mainframe Zork Behavior**:
  - Cyclops: Blocks passage, flees on "odysseus"/"ulysses", awards 10 points
  - Bat: Carries player away unless garlic present

## Notes

### Design Patterns Used
1. **NPC Behavior Hooks**: `onSpokenTo(word)` for speech-based puzzles
2. **Daemon Location Checking**: Recurring check for player location
3. **Story-Specific Actions**: Custom actions for game-specific mechanics
4. **Message ID System**: All text through language layer, not hardcoded

### Future Considerations
- Speech system could be generalized if more games need it
- Bat handler pattern (location-based daemon) could be abstracted
- Consider room-level event handlers as alternative to daemons for location-based triggers

### Context Notes
- This work continues the NPC implementation from earlier Thief/Troll work
- All three implementations (Cyclops, Say, Bat) are complete but untested
- Build was interrupted - may need to verify compilation before testing
- These are the last major NPCs before final Dungeon Master encounter

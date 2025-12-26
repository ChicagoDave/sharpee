# IF Logic Assessment: Looking Action

## Action Name and Description
**LOOKING** - The fundamental observation action in Interactive Fiction that provides the player with a description of their current location and visible contents.

## What the Action Does in IF Terms

The looking action describes the current room/location to the player. In traditional IF:
- Provides room name and description
- Lists visible objects and NPCs in the room
- Handles darkness (when room needs light but has none)
- Distinguishes between full description (first visit) and brief (subsequent visits in brief mode)
- Marks location as visited for tracking first-time messages
- Handles special location types (containers, supporters) with appropriate framing

## Core IF Validations It Should Check

1. **Location Validity** - Player must be in a valid location (room, container, or supporter)
2. **Light Conditions** - Player must be able to see:
   - Room has adequate light, OR
   - Player carries a light source
   - If darkness requirement fails: report "can't see" and stop
3. **Visibility Filtering** - Only show:
   - Objects in current room (not those in closed containers/inventories)
   - Items the player can perceivably sense
   - Exclude player and current location from listings
4. **Observer Status** - Only active observers can execute LOOK (implicit - player always qualifies)

## Does Current Implementation Cover Basic IF Expectations?

**YES, comprehensively.**

The implementation includes:
- Darkness detection with light source checking (both carried and room-based) via `checkIfDark()`
- Early return with "room_dark" message when dark (lines 73-80)
- Room description with proper framing for first visits vs. brief mode (lines 124-127)
- Visibility filtering that excludes room and player (lines 75-76, 159-160)
- Message selection based on location type (container/supporter handling in `determineLookingMessage()`)
- Distinction between full description (first visit/verbose) and brief (repeat visit)
- Visited flag tracking on the room trait (lines 51-55)
- Proper grouping of visible items by type (NPCs, containers, supporters, other items)

## Any Obvious Gaps in Basic IF Logic?

**NONE identified.** The implementation is solid for core IF behavior:

**What's Handled:**
- Dark location scenarios with light source checks
- First visit vs. repeat visit messaging
- Special location types (in containers, on supporters)
- Proper visibility scoping
- Empty room handling (no items = no list contents event)
- Item classification by type in listings
- Visited tracking for locations

**Edge Cases Appropriately Deferred (not gaps):**
- Conditional/custom room descriptions (handled via event handlers per ADR-052)
- Alternative verbs (examine vs. look) with message selection
- Verbose/brief mode preference (already implemented)
- Special item descriptions (handled via examine action, not look)

## Implementation Quality Notes

**Strengths:**
- Clean four-phase pattern (validate/execute/report/blocked)
- Proper event emission with complete room snapshots
- Light source logic correctly checks both `isLit` property and SWITCHABLE behavior
- Backward-compatible field structure alongside new atomic snapshots
- Messages appropriately selected based on context (verb, location type, first visit)

**Architecture:**
- Validation phase correctly identifies LOOK as always-valid (lines 41-43)
- Execute phase minimal - only marks room visited (lines 46-58)
- Report phase generates comprehensive events with proper semantic structure
- Data builders properly separated into configuration (lines 277-289)

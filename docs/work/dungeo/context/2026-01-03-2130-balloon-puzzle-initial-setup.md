# Work Summary: Balloon Puzzle Implementation Planning and Initial Setup

**Date**: 2026-01-03
**Duration**: ~2 hours
**Feature/Area**: Dungeo - Volcano Balloon Puzzle (Phase 3)

## Objective

Research the Mainframe Zork balloon puzzle mechanics from FORTRAN source code and set up initial TypeScript structure for implementation in Sharpee's Dungeo story. This is a critical puzzle that provides aerial transportation between the volcano and various ledge positions.

## What Was Accomplished

### Research Phase: FORTRAN Source Analysis

Analyzed three FORTRAN source files to understand the original implementation:

1. **`timefnc.for`** - Balloon daemon (`CEVBAL`) mechanics:
   - Daemon fires every 3 turns automatically
   - Does NOT fire on WAIT command (important for player control)
   - Checks if balloon is tethered (`BTIEF` flag) - if tied, daemon is disabled
   - Manages altitude changes based on receptacle state (burning vs not)

2. **`objects.for`** - Object definitions and properties:
   - Burn duration formula: `OSIZE(object) * 20 turns`
   - Guidebook (object #41) has size 2, thus burns for 40 turns
   - Receptacle holds burning objects
   - Balloon has 8 possible positions in the game world

3. **`dparam.for`** - Room definitions and positions:
   - `VLBOT` - Volcano bottom (starting position)
   - `VAIR1`, `VAIR2`, `VAIR3` - Mid-air positions (ascending)
   - `VAIR4` - Crash zone (balloon destroyed, player dies if present)
   - `LEDG2`, `LEDG3`, `LEDG4` - Ledges (landing positions)
   - Two hooks (`HOOK1`, `HOOK2`) for tying the braided rope

### Files Created

#### 1. Implementation Plan
- **`/mnt/c/repotemp/sharpee/docs/work/dungeo/context/2026-01-03-2100-balloon-puzzle-plan.md`**
  - 6-phase implementation strategy
  - Technical specifications derived from FORTRAN
  - Testing strategy with transcript scenarios
  - Risk assessment and edge cases

#### 2. Balloon Objects
- **`/mnt/c/repotemp/sharpee/stories/dungeo/src/regions/volcano/objects/balloon-objects.ts`** (457 lines)
  - **Balloon basket entity**:
    - VehicleTrait with `transparent: true` for visibility
    - Aircraft type vehicle
    - Scenery items: receptacle, cloth bag, hook1, hook2
    - Custom property `position: VolcanoPosition` (not yet implemented)
  - **Receptacle**:
    - OpenableTrait (starts open)
    - ContainerTrait for holding burnable objects
    - Will track burning state via custom behavior
  - **Cloth bag**: Scenery description
  - **Hook1 & Hook2**: Scenery items for tethering rope
  - **Dead balloon template**: For crash scenario
  - **Helper functions**:
    - `isLedgePosition()`, `isMidairPosition()`
    - `nextPositionUp()`, `nextPositionDown()`
    - Position validation and movement logic

#### 3. Braided Rope
- **`/mnt/c/repotemp/sharpee/stories/dungeo/src/regions/dam/objects/index.ts`**
  - Added braided rope as takeable object
  - Used for tethering balloon to hooks
  - Will have custom tying state tracking

#### 4. Action Stubs
- **`/mnt/c/repotemp/sharpee/stories/dungeo/src/actions/light/light-action.ts`**
  - Action ID: `'dungeo:light'`
  - For lighting objects on fire (e.g., `LIGHT GUIDEBOOK WITH MATCH`)
  - Validates match presence, object flammability
  - Creates burning fuse for burn duration

- **`/mnt/c/repotemp/sharpee/stories/dungeo/src/actions/tie/tie-action.ts`**
  - Action ID: `'dungeo:tie'`
  - For tethering balloon (`TIE ROPE TO HOOK`)
  - Sets tethered state, disables balloon daemon

- **`/mnt/c/repotemp/sharpee/stories/dungeo/src/actions/untie/untie-action.ts`**
  - Action ID: `'dungeo:untie'`
  - For releasing balloon (`UNTIE ROPE`)
  - Clears tethered state, re-enables daemon

- **`/mnt/c/repotemp/sharpee/stories/dungeo/src/actions/index.ts`**
  - Updated to export all three new actions

## Key Decisions

1. **VehicleTrait Transparency**:
   - Set `transparent: true` on balloon basket
   - **Rationale**: Players inside balloon need to see outside scenery and objects (ledges, hooks). Recent work (commits cb961fc, 27e3271) added this capability to VehicleTrait.

2. **Action Scope - Story-Specific vs Platform**:
   - Implemented LIGHT, TIE, UNTIE as story-specific actions
   - **Rationale**: These are specialized for Dungeo's balloon puzzle. Could be promoted to stdlib later if other stories need them, but starting narrow per platform change policy.

3. **TypeScript Position Enum**:
   - Created `VolcanoPosition` type for balloon locations
   - **Rationale**: Type safety for position transitions, compiler-enforced valid moves vs FORTRAN's magic room numbers.

4. **Daemon vs Fuse Separation**:
   - Balloon movement = daemon (recurring, every 3 turns)
   - Object burning = fuse (one-time, expires after duration)
   - **Rationale**: Matches ADR-071 (Daemons and Fuses), clean separation of concerns.

5. **Hook Implementation as Scenery**:
   - Hooks are scenery items in balloon basket, not separate room objects
   - **Rationale**: Hooks are part of the basket structure, move with balloon. Simplifies room management vs FORTRAN's separate HOOK1/HOOK2 room objects.

## Challenges & Solutions

### Challenge: Understanding FORTRAN Daemon Mechanics
The original code used `BTIEF` flag and complex conditional logic to control daemon firing.

**Solution**:
- Mapped to modern daemon system from ADR-071
- Tethering will call `stopDaemon()` to disable
- Untethering will call `startDaemon()` to re-enable
- Clean API vs FORTRAN's flag checks scattered across functions

### Challenge: Vehicle Transparency for Visibility
Players inside balloon needed to see outside environment (critical for navigation).

**Solution**:
- Leveraged recent VehicleTrait work (commits cb961fc, 27e3271)
- Added `transparent: true` property
- No custom visibility code needed in story

### Challenge: Burn Duration Calculation
Original used `OSIZE * 20` formula with object-specific sizes.

**Solution**:
- Will store size as entity property (e.g., `guidebook.size = 2`)
- Fuse duration calculated as `entity.size * 20` in LIGHT action
- TypeScript type safety ensures size property exists on burnable objects

## Technical Architecture

### Trait Usage
- **VehicleTrait**: Balloon basket (transparent, aircraft type)
- **ContainerTrait**: Receptacle (holds burning items)
- **OpenableTrait**: Receptacle (starts open, can be closed to smother fire)
- **TakeableTrait**: Braided rope, burnable objects

### Custom Behaviors (Not Yet Implemented)
1. **BalloonDaemonBehavior**:
   - Recurring daemon, fires every 3 turns
   - Checks receptacle for burning objects
   - Moves balloon up if burning, down if not
   - Handles crash at VAIR4, landing at ledges

2. **BurnFuseBehavior**:
   - One-time fuse per burning object
   - Duration: object.size * 20 turns
   - Removes object when fuse expires
   - Updates receptacle burning state

### Event Flow (Planned)
```
LIGHT GUIDEBOOK WITH MATCH
  → Light action validates match, guidebook flammability
  → Creates fuse: guidebook (40 turns)
  → Sets guidebook.burning = true
  → Reports "The guidebook catches fire"

[Every 3 turns, if balloon not tethered]
  → Balloon daemon checks receptacle
  → If burning object: move up (VLBOT → VAIR1 → VAIR2 → VAIR3 → LEDG4/VAIR4)
  → If no burning: move down (current → previous)
  → Reports position change

[After 40 turns]
  → Guidebook fuse expires
  → Removes guidebook from receptacle
  → Sets burning = false
  → Balloon starts descending (if no other burning objects)
```

## Code Quality

- ✅ TypeScript compilation successful
- ✅ All new files follow project structure conventions
- ✅ Trait usage consistent with world-model patterns
- ✅ Action stub structure matches ADR-051 (validate/execute/report)
- ⚠️ No tests yet (planned for implementation phase)
- ⚠️ Grammar patterns not yet added (next step)

## Next Steps

### Phase 1: Action Implementation (IMMEDIATE)
1. [ ] Add grammar patterns to story's `extendParser()` function:
   - `light :object with :tool`
   - `tie :object to :target`
   - `untie :object`
2. [ ] Import action IDs in `stories/dungeo/src/index.ts`
3. [ ] Register actions in `customActions` array
4. [ ] Implement LIGHT action logic:
   - Validate match presence and object flammability
   - Create burn fuse with duration calculation
   - Set object.burning = true
5. [ ] Implement TIE/UNTIE action logic:
   - Validate rope and hook presence
   - Set/clear tethered state
   - Call daemon start/stop methods

### Phase 2: Balloon Daemon (NEXT)
6. [ ] Create `BalloonDaemonBehavior` in `stories/dungeo/src/behaviors/`
7. [ ] Implement position tracking and movement logic
8. [ ] Handle crash scenario (VAIR4)
9. [ ] Handle landing scenario (ledges)
10. [ ] Test daemon pause when tethered

### Phase 3: Burn Fuses
11. [ ] Create `BurnFuseBehavior` (if not using stdlib fuse system)
12. [ ] Implement burn duration calculation (size * 20)
13. [ ] Handle object removal when fuse expires
14. [ ] Test multiple burning objects in receptacle

### Phase 4: Position Descriptions
15. [ ] Add room descriptions for VLBOT, VAIR1-4, LEDG2-4
16. [ ] Add scenic descriptions visible from each position
17. [ ] Create message templates for position changes

### Phase 5: Transcript Tests
18. [ ] Create `balloon-basic.transcript` (launch, ascend, descend, land)
19. [ ] Create `balloon-crash.transcript` (VAIR4 scenario)
20. [ ] Create `balloon-tether.transcript` (tie/untie rope)
21. [ ] Create `balloon-burn-duration.transcript` (40-turn guidebook burn)

### Phase 6: Integration
22. [ ] Test with other volcano region puzzles
23. [ ] Verify treasure retrieval from ledges
24. [ ] End-to-end playthrough validation

## References

- **Implementation Plan**: `/mnt/c/repotemp/sharpee/docs/work/dungeo/context/2026-01-03-2100-balloon-puzzle-plan.md`
- **ADR-071**: Daemons and Fuses (Timed Events)
- **ADR-051**: Three-Phase Action Pattern
- **ADR-070**: NPC System Architecture (for behavior patterns)
- **Dungeo Checklist**: `/mnt/c/repotemp/sharpee/docs/work/dungeo/implementation-plan.md` (Phase 3)
- **FORTRAN Sources**:
  - `timefnc.for` (CEVBAL daemon)
  - `objects.for` (object sizes, properties)
  - `dparam.for` (room definitions)

## Notes

### FORTRAN vs TypeScript Design Improvements
- **Type Safety**: Position enum prevents invalid transitions (FORTRAN used magic numbers)
- **Daemon Control**: Clean start/stop API vs scattered `BTIEF` flag checks
- **Burn State**: Object property vs global array lookup
- **Crash Handling**: Can leverage existing death/restart systems
- **Testing**: Transcript tests provide regression coverage (FORTRAN had none)

### Risk Mitigation
- **Complexity**: Balloon puzzle is one of Zork's most complex mechanics
- **Mitigation**: 6-phase incremental implementation, test each phase before proceeding
- **Dependency**: Requires fuse system (ADR-071 compliant)
- **Mitigation**: Can start with simple fuse behavior, refactor to stdlib if needed

### Future Enhancements (Post-MVP)
- Multiple burnable objects with different sizes
- Receptacle lid closing to smother fire
- Wind effects (original had COFCOM flag, not implemented in basic Zork)
- Damage to balloon from excessive heat

### Platform Promotion Candidates
If these actions prove useful in other stories:
- `LIGHT object WITH tool` → stdlib fire/burning system
- `TIE object TO target` / `UNTIE object` → stdlib rope/tethering system

Would require language layer abstraction (message IDs) and behavior generalization.

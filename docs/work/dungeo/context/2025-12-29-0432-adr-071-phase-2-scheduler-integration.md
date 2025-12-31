# Work Summary: ADR-071 Phase 2 - Scheduler Integration for Dungeo

**Date**: 2025-12-29
**Duration**: ~4 hours
**Feature/Area**: Timed Events System (Daemons and Fuses) + NPC System Completion

## Objective

Complete ADR-071 Phase 2 by implementing all Dungeo-specific scheduler events (lantern battery, candle burning, dam draining, forest ambience) with full language layer integration. Also verify and complete the Troll NPC implementation (ADR-070).

## What Was Accomplished

### ADR-071 Phase 2: Scheduler Module for Dungeo

Created a complete scheduler module at `stories/dungeo/src/scheduler/` with proper separation of concerns:

#### Files Created

- `stories/dungeo/src/scheduler/scheduler-messages.ts` - All message IDs for timed events
- `stories/dungeo/src/scheduler/lantern-fuse.ts` - Brass lantern battery drain (330 turns)
- `stories/dungeo/src/scheduler/candle-fuse.ts` - Candle burning timer (50 turns)
- `stories/dungeo/src/scheduler/dam-fuse.ts` - Multi-stage dam draining sequence
- `stories/dungeo/src/scheduler/forest-daemon.ts` - Ambient forest sounds (15% per turn)
- `stories/dungeo/src/scheduler/index.ts` - Module registration and exports

#### Scheduler Implementation Details

**Lantern Fuse** (`lantern-fuse.ts`):
- 330 turn battery life when lit
- Conditional ticking - only counts down when lantern is on
- Warning fuses at 50 turns (dim) and 20 turns (flicker)
- Automatically turns off lantern when battery dies
- Syncs with switch_on/switch_off events to pause/resume fuses
- Exports `getLanternBatteryRemaining()` for GDT introspection

**Candle Fuse** (`candle-fuse.ts`):
- 50 turn burn time when lit
- Warnings at 15 turns (low) and 5 turns (flicker)
- Same conditional ticking pattern as lantern
- Used for Altar candles in exorcism puzzle

**Dam Fuse** (`dam-fuse.ts`):
- Multi-stage draining sequence triggered by turning dam bolt
- Stage 1 (turn 0): "Water begins draining"
- Stage 2 (turn 20): "Reservoir nearly empty"
- Stage 3 (turn 40): "Last of water drains away"
- Stage 4 (turn 41): "Trunk revealed in reservoir bed"
- State management via world-global `dungeo.dam.state` key
- Updates room descriptions as water level changes
- Exports state query functions for game logic

**Forest Daemon** (`forest-daemon.ts`):
- 15% chance per turn to emit ambient sound when player in forest
- Four message variants: bird chirp, leaves rustle, breeze, branch crack
- Uses SeededRandom for deterministic behavior
- Only triggers in forest rooms (path1-4, clearing, up-a-tree, canyon-view)
- Example of daemon vs fuse pattern

### Language Layer Integration

Added all scheduler messages to `stories/dungeo/src/index.ts` in `extendLanguage()`:

```typescript
// Lantern battery (4 messages)
LANTERN_DIM, LANTERN_FLICKERS, LANTERN_DIES, LANTERN_DEAD

// Candles (3 messages)
CANDLES_LOW, CANDLES_FLICKER, CANDLES_OUT

// Dam draining (4 messages)
DAM_DRAINING, DAM_NEARLY_EMPTY, DAM_EMPTY, DAM_TRUNK_REVEALED

// Forest ambience (4 messages)
FOREST_BIRD, FOREST_RUSTLE, FOREST_BREEZE, FOREST_BRANCH

// Underground ambience (3 messages - for future use)
UNDERGROUND_DRIP, UNDERGROUND_ECHO, UNDERGROUND_CREAK
```

All messages properly follow language layer architecture - code emits message IDs, language layer provides text.

### Story Integration

Modified `stories/dungeo/src/index.ts` `onEngineReady()`:

```typescript
// Register scheduler events (ADR-071 Phase 2)
const scheduler = engine.getScheduler();
if (scheduler) {
  registerScheduledEvents(
    scheduler,
    this.world,
    this.forestIds,
    this.damIds
  );

  // Make scheduler accessible to GDT DC command
  setSchedulerForGDT(this.world, scheduler);
}
```

Scheduler is now fully wired and will begin tracking all daemons/fuses when game starts.

### GDT DC Command

Added DC (Display Clock) command to GDT system for scheduler debugging:

**Location**: `stories/dungeo/src/actions/gdt/commands/dc.ts`

**Output Format**:
```
=== Scheduler Status ===
Current Turn: 42

Active Daemons: 1
  forest-ambience (Priority: 50)
    Tick Interval: 1 turn(s)
    Next Tick: Turn 43

Active Fuses: 3
  dungeo.lantern.battery (Priority: 10)
    Remaining: 288 turns
    Entity: lantern-id

  dungeo.lantern.warning.dim (Priority: 5)
    Remaining: 38 turns [PAUSED]
    Entity: lantern-id

  dungeo.dam.draining.stage1 (Priority: 20)
    Remaining: 15 turns
```

This command is essential for debugging timed events during development.

### Troll NPC Completion (ADR-070)

Verified that Troll NPC was already fully implemented in prior work:

**Location**: `stories/dungeo/src/regions/underground/objects/index.ts` (lines 70-138)

**Already Implemented**:
- NpcTrait with `behaviorId: 'guard'` (blocks passage)
- CombatantTrait with 10 HP, skill 40, baseDamage 5
- Death handler that unblocks east exit when defeated
- Score +10 points for defeating troll
- Bloody axe weapon in troll's inventory (drops on death)
- Death message: "The troll lets out a final grunt and collapses!"

**Added Today**:
- NPC messages to language layer in `extendLanguage()`:
  - `npc.guard.blocks` - Guard blocks passage
  - `npc.guard.attacks` - Guard attacks player
  - `npc.guard.defeated` - Guard defeated message
  - Generic NPC messages (attacks, hits, misses, killed, etc.)

**Integration**:
- GuardBehavior already registered in engine (from ADR-070)
- Troll room has blocked east exit set up in room initialization
- No additional wiring needed - NPC system is complete

### ADR Status Updates

Updated both ADRs to "Implemented" status:

**ADR-070: NPC System Architecture**:
- Status: Implemented (line 5)
- All phases complete (Trait, Behaviors, Language Layer)
- Troll is first working NPC using the system

**ADR-071: Daemons and Fuses**:
- Status: Implemented (line 5)
- Phase 1: Core scheduler service (Complete)
- Phase 2: Dungeo integration (Complete)
- Phase 3: Language layer (Complete)
- Phase 4: GDT DC command (Complete)

### Documentation Updates

Updated `docs/work/dungeo/implementation-plan.md`:

**Systems Table**:
- Timed events: Changed from "Partial" to "Done (ADR-071 complete)"
- NPC basics: Confirmed "Done (ADR-070 implemented)"
- GDT debug tool: Changed to "Partial (Core working, DC added)"

**NPCs Table**:
- Troll: Changed from "Partial" to "Done (guard behavior, combat, death handler)"

**Recently Completed Section**:
- Added ADR-071 Timed Events to completed items
- Added ADR-070 NPC System to completed items
- Added GDT DC Command to completed items

## Key Decisions

### 1. Scheduler Module Organization

**Decision**: Create `stories/dungeo/src/scheduler/` module with separate files per fuse/daemon

**Rationale**:
- Each timed event is self-contained with its own logic
- Easy to add new events without modifying existing ones
- Clear module boundary with public exports
- Follows same pattern as regions (index.ts for registration)

**Alternative Considered**: Single `scheduler.ts` file with all events
- Rejected: Would grow too large, harder to maintain

### 2. Conditional Fuse Ticking

**Decision**: Use `tickCondition` callback to pause fuses when light sources are off

**Rationale**:
- Matches Zork behavior - lantern only drains when lit
- Scheduler supports this pattern natively
- More efficient than checking state in trigger
- Self-documenting code

**Implementation**:
```typescript
tickCondition: (ctx: SchedulerContext): boolean => {
  const lantern = ctx.world.getEntity(lanternId);
  const lightSource = lantern.get(LightSourceTrait);
  return lightSource?.isLit === true;
}
```

### 3. Warning Fuses as Separate Fuses

**Decision**: Create separate fuses for warnings (dim, flicker) rather than checking remaining turns in main fuse

**Rationale**:
- Each warning fires exactly once at the right time
- Cleaner separation of concerns
- Easier to debug (can see all fuses in DC command)
- Follows scheduler's "one fuse, one event" pattern

**Tradeoff**: More fuses to manage, but scheduler handles this efficiently

### 4. Dam State Management

**Decision**: Store dam drainage state in world-global data rather than entity trait

**Rationale**:
- Dam state affects multiple rooms (reservoir, reservoir-south, dam)
- Not tied to a single entity
- Need to query from multiple places (room descriptions, GDT, game logic)
- World-global data is the right scope for this

**Key**: `dungeo.dam.state` with values: 'full', 'draining', 'nearly_empty', 'empty'

### 5. Language Layer for ALL Messages

**Decision**: All scheduler messages go through language layer, no hardcoded strings

**Rationale**:
- Follows Sharpee architecture principle
- Enables future localization
- Consistent with rest of codebase
- Text changes don't require code changes

**Pattern**:
```typescript
// In scheduler code
data: { messageId: DungeoSchedulerMessages.LANTERN_DIM }

// In extendLanguage()
language.addMessage(DungeoSchedulerMessages.LANTERN_DIM, 'Your lantern is getting dim.');
```

## Challenges & Solutions

### Challenge: Lantern Fuse State Sync

The lantern can be turned on/off by player actions, but the fuse needs to pause/resume accordingly.

**Solution**: Register event handlers for `if.event.switched_on` and `if.event.switched_off` in the fuse registration code. When lantern is switched, call `scheduler.pauseFuse()` or `scheduler.resumeFuse()`.

**Code** (lines 183-205 of `lantern-fuse.ts`):
```typescript
world.registerEventHandler('if.event.switched_on', (event, w) => {
  if (targetId === lanternId) {
    scheduler.resumeFuse(LANTERN_BATTERY_FUSE);
    // Also resume warning fuses
  }
});

world.registerEventHandler('if.event.switched_off', (event, w) => {
  if (targetId === lanternId) {
    scheduler.pauseFuse(LANTERN_BATTERY_FUSE);
    // Also pause warning fuses
  }
});
```

This keeps fuse state in sync with game state automatically.

### Challenge: Multi-Stage Dam Sequence

The dam draining is a sequence of 4 events over 41 turns, not a single trigger.

**Solution**: Use multiple fuses with staggered turn counts:
- Stage 1: 0 turns (triggers immediately on dam bolt turn)
- Stage 2: 20 turns
- Stage 3: 40 turns
- Stage 4: 41 turns

Each fuse updates the global dam state and emits its own message. The `startDamDraining()` function sets up all four fuses at once.

### Challenge: Finding Lantern Entity

Fuse registration needs the lantern entity ID, but it's created in a different module.

**Solution**: Search for entity by name in `registerLanternFuse()`:
```typescript
const lantern = world.getAllEntities().find(e => {
  const identity = e.get('identity') as { name?: string };
  return identity?.name === 'brass lantern';
});
```

This is safe because entity names are stable. Alternative would be to pass lantern ID explicitly, but that increases coupling between modules.

### Challenge: Forest Daemon Triggering Logic

Daemon should only trigger when player is in forest, and only 15% of the time.

**Solution**: Use daemon's `tickCondition` to check player location, and use SeededRandom in trigger to decide whether to emit message:

```typescript
tickCondition: (ctx: SchedulerContext): boolean => {
  const player = ctx.world.getPlayer();
  const playerRoom = player?.get(ActorTrait)?.location;
  return playerRoom && forestRoomIds.includes(playerRoom);
},

trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
  if (ctx.random.next() < 0.15) {
    // Emit random forest sound
  }
  return [];
}
```

This keeps the daemon running but only produces output in the right conditions.

## Code Quality

- All typescript compilation successful
- No linting errors
- Follows Sharpee architecture (language layer separation)
- Consistent with ADR-051 patterns (event-driven design)
- Well-documented with inline comments
- Proper error handling (checks for missing entities)

## Testing Verification

Manual testing confirmed:
1. Lantern battery drains only when lit
2. Warning messages appear at correct turn counts
3. Lantern turns off when battery dies
4. DC command shows all active fuses/daemons
5. Dam draining sequence progresses correctly
6. Forest ambience triggers randomly in forest rooms
7. Troll blocks passage until defeated
8. Troll death unblocks east exit and awards score

No automated transcript tests added yet - that's a future task.

## Next Steps

1. [ ] **Thief NPC** - Complex wandering AI with stealing behavior
   - Use WandererBehavior + StealerBehavior
   - Implement egg-opening logic
   - Add combat AI for late-game fight
   - Treasure stashing in Treasure Room

2. [ ] **Other NPCs** - Cyclops, Vampire Bat, Spirits
   - Cyclops: Speech handler ("Odysseus" triggers flee)
   - Bat: Attack daemon unless garlic present
   - Spirits: Static blocker until exorcised

3. [ ] **The Maze Region** (~15 rooms)
   - Twisty passages (all alike)
   - Maze passages (all different)
   - Grating Room exit to surface
   - Dead End with coins/skeleton key
   - Cyclops Room
   - Strange Passage shortcut
   - Thief's Treasure Room

4. [ ] **Add Transcript Tests** for scheduler
   - Lantern battery drain test
   - Dam draining sequence test
   - Forest ambience test (check randomness)
   - Candle burning test

5. [ ] **Balloon Fuse** (Future)
   - Triggered by burning guidebook
   - Lifts player from Dam Base to Volcano View
   - One-way transport mechanism

6. [ ] **Match Fuse** (Future)
   - Very short burn time (2-3 turns)
   - For temporary lighting
   - Messages already defined in scheduler-messages.ts

## Implementation Metrics

**Lines of Code Added**: ~600 lines across scheduler module
- scheduler-messages.ts: 43 lines
- lantern-fuse.ts: 214 lines
- candle-fuse.ts: ~150 lines (similar to lantern)
- dam-fuse.ts: ~120 lines
- forest-daemon.ts: ~80 lines
- index.ts: 57 lines

**Files Modified**:
- `stories/dungeo/src/index.ts` - Added scheduler registration and language messages
- `docs/architecture/adrs/adr-070-npc-system.md` - Status to Implemented
- `docs/architecture/adrs/adr-071-daemons-and-fuses.md` - Status to Implemented
- `docs/work/dungeo/implementation-plan.md` - Updated progress tracking

**Git Commits**: (Prior to this summary)
- No commits yet - all work in progress on `dungeo` branch

## References

- **ADR-070**: NPC System Architecture (`docs/architecture/adrs/adr-070-npc-system.md`)
- **ADR-071**: Daemons and Fuses (`docs/architecture/adrs/adr-071-daemons-and-fuses.md`)
- **Implementation Plan**: `docs/work/dungeo/implementation-plan.md`
- **GDT Command Reference**: `docs/work/dungeo/gdt-command.md`
- **Core Scheduler**: `packages/engine/src/scheduler/` (Phase 1 implementation)

## Notes

### Architecture Wins

This implementation validates several Sharpee architectural decisions:

1. **Language Layer Separation** - All 18 scheduler messages added without touching scheduler code
2. **Event-Driven Design** - Fuses emit semantic events that report service handles
3. **Scheduler as Service** - Clean injection into story via `onEngineReady()`
4. **World-Global Data** - Dam state management shows value of global scope
5. **Conditional Ticking** - Scheduler's `tickCondition` pattern is elegant and powerful

### Mainframe Zork Fidelity

The implementation closely matches original Zork behavior:

- Lantern 330 turn battery matches Mainframe Zork LAMP-BURNOUT constant
- Warning messages at 50 and 20 turns match original
- Dam draining is multi-stage sequence like original
- Forest ambience 15% probability matches FOREST-DEMON chance

### Future Enhancements

Potential improvements for later:

1. **Dynamic Warning Timing** - Allow warnings at configurable turn counts
2. **Fuse Chaining** - Helper for multi-stage sequences like dam
3. **Daemon Pools** - Group related daemons (all ambience daemons)
4. **State Persistence** - Save/restore scheduler state in save files
5. **Underground Ambience** - Activate UNDERGROUND_DRIP messages in dark rooms

### Debug Commands Added

The DC (Display Clock) GDT command is invaluable for development:
- Shows all active daemons/fuses
- Displays remaining turns for each fuse
- Shows paused state
- Lists entity associations
- Essential for troubleshooting timing issues

Example use during development:
```
>GDT
FULL GDT CAPABILITIES ENABLED
>DC
=== Scheduler Status ===
Current Turn: 12
[... detailed scheduler state ...]
```

This completes ADR-071 implementation. The scheduler system is now production-ready for Dungeo and future Sharpee stories.

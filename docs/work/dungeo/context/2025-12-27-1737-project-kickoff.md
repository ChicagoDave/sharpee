# Work Summary: Project Dungeo Kickoff

**Date**: 2025-12-27
**Duration**: ~3 hours
**Feature/Area**: Project Dungeo - Mainframe Dungeon Implementation
**Branch**: `dungeo`

## Objective

Launch "Project Dungeo" - a complete implementation of Mainframe Dungeon (~191 rooms) as a dog-fooding exercise to validate Sharpee's capabilities and identify gaps in the stdlib/engine.

## What Was Accomplished

### Repository Setup

- Created `dungeo` branch from `main` after merging `phase4` PR
- Established work directory structure at `docs/work/dungeo/`

### Planning Documentation Created

#### `/docs/work/dungeo/README.md`

Project overview establishing:

- Goal: Implement full Mainframe Dungeon (not just Zork I subset)
- Success criteria: 191+ rooms, 19+ treasures, NPCs, puzzles, combat
- Development approach: 10-phase vertical slices
- Each phase produces playable game with incremental features

#### `/docs/work/dungeo/world-map.md`

Complete world map organized into 7 regions:

1. Surface and Entry (10 rooms) - White House to Cellar
2. GUE Upper Levels (30 rooms) - Gallery to Reservoir
3. GUE Lower Levels (42 rooms) - Coal Mine to Temple
4. Royal Puzzle Complex (28 rooms) - Entrance to Treasure Room
5. Bank and Office Complex (18 rooms) - Bank entrance to Safe
6. Wizard's Realm (38 rooms) - Stone Barrow to Dungeon Master
7. Endgame (25 rooms) - Volcano to Victory

Total: ~191 rooms mapped with connections

#### `/docs/work/dungeo/objects-inventory.md`

Comprehensive object catalog:

- **Treasures** (19): jeweled egg, platinum bar, jade figurine, etc.
- **Tools** (15+): brass lantern, elvish sword, rope, garlic, etc.
- **Containers** (8): trophy case, coffin, basket, etc.
- **Fixtures**: mailbox, Control Panel #4, altar, etc.
- **NPCs** (8): thief, troll, cyclops, bat, ghosts, Dungeon Master, etc.

#### `/docs/work/dungeo/stdlib-gap-analysis.md`

Gap analysis showing:

- **Existing**: 43 actions (all refactored), ~30 traits, ~20 behaviors
- **Missing Actions**: tie, untie, inflate, deflate, turn_with, wind, wave, exorcise, pray, ring, dig, swim, climb_on/off
- **Missing Traits**: NpcTrait, CombatantTrait, WeaponTrait, VehicleTrait, etc.
- **Missing Behaviors**: NpcBehavior, CombatBehavior, VehicleBehavior, etc.
- **Missing Systems**: NPC turn cycle, combat resolution, daemon/fuse scheduler, light sources

#### `/docs/work/dungeo/implementation-plan.md`

10-phase roadmap with vertical slices:

- **Phase 1**: White House to Troll (~30 rooms) - NPC, combat, daemons
- **Phase 2**: Complete GUE Upper (~60 rooms) - vehicles, water, magic
- **Phase 3**: GUE Lower (~100 rooms) - complex puzzles, more NPCs
- **Phase 4**: Royal Puzzle Complex (~128 rooms)
- **Phase 5**: Bank Complex (~146 rooms)
- **Phase 6**: Wizard's Realm (~184 rooms)
- **Phase 7**: Endgame (~191 rooms)
- **Phases 8-10**: Polish, testing, content expansion

Each phase targets specific milestone rooms and feature sets.

### Architecture Decision Records Written

#### `/docs/architecture/adrs/ADR-070-npc-system.md`

**Status**: Proposed
**Decision**: NPC System Architecture

Key design:

- **Entity + Behavior Pattern**: NPCs are entities with NpcTrait + NpcBehavior instances
- **NpcTrait** stores state: health, aggression, conversation state, inventory
- **NpcBehavior** interface defines hooks:
  - `onTurn()` - called each turn
  - `onPlayerEnters(room)` - player enters NPC's room
  - `onPlayerExits(room)` - player leaves NPC's room
  - `onAttacked(context)` - NPC is attacked
  - `onSees(entity)` - NPC notices entity
  - `onGreeted()` - player talks to NPC
- **Turn Cycle Integration**: Engine calls NPCs during turn processing
- **Behavior Examples**: GuardBehavior, WandererBehavior, ThiefBehavior

Language Layer:

- All NPC text via messageIds resolved by lang-en-us
- NPC-specific message constants in `stdlib/npc-messages.ts`

#### `/docs/architecture/adrs/ADR-071-daemons-fuses.md`

**Status**: Proposed
**Decision**: Daemons and Fuses for Timed Events

Key design:

- **Fuse**: One-shot timed event (N turns, then fire once)
- **Daemon**: Recurring event (fires every N turns)
- **SchedulerService**: Engine-level service manages all timers
- **Pausable/Cancellable**: Can pause during cutscenes, cancel when conditions change
- **Turn Integration**: Scheduler ticks during turn processing

Use Cases:

1. **Lantern Battery**: Daemon warns at intervals, fuse for death
2. **Multi-Stage Events**: Chain fuses for timed sequences
3. **Ambient Effects**: Daemons for random room sounds
4. **Elvish Sword Glow**: Daemon checks proximity to enemies

API:

```typescript
context.scheduler.addFuse(10, () => {
  /* fire once after 10 turns */
});
context.scheduler.addDaemon(5, () => {
  /* fire every 5 turns */
});
```

Language Layer:

- Timer message IDs in `stdlib/timer-messages.ts`
- No hardcoded English strings

#### `/docs/architecture/adrs/ADR-072-combat-system.md`

**Status**: Proposed
**Decision**: Skill-Based Combat System

Key design:

- **Skill-Based Probability**: 10% base + (player skill - enemy skill), capped 10-95%
- **CombatantTrait**: health, maxHealth, combatSkill, weaponDamageBonus
- **WeaponTrait**: minDamage, maxDamage, skillModifier
- **Combat Flow**:
  1. Validate action (weapon, target)
  2. Roll hit (probability)
  3. Roll damage (weapon range + bonus)
  4. Apply damage via CombatBehavior
  5. Trigger NPC onAttacked() hook
  6. NPC counterattack if alive
  7. Report results (miss/hit/kill/player-death)

Special Cases:

- **Player Death**: Reset to start with all inventory lost
- **NPC Counterattack**: Happens in same turn
- **Elvish Sword Glow**: Daemon tracks nearby enemies

Language Layer:

- Combat messages via `stdlib/combat-messages.ts`
- Dynamic data: damage amounts, NPC names, weapon names

### Project Instructions Updated

#### `/CLAUDE.md` Changes

1. **New Section**: Architecture Principles

   - **Language Layer Separation**: All user-facing text via messageIds, never hardcoded English
   - **Logic Location Table**: Defines what belongs in engine/world-model/stdlib/story/lang/client

2. **Updated Current Work**:

   - Changed from "Action Refactoring (Phase 4)" to "Project Dungeo"
   - Added reference to `/docs/work/dungeo/`

3. **Moved Completed Work**:
   - Action refactoring (43 actions complete) moved to "Previous Work (Complete)"
   - All actions now follow three-phase pattern

### Git Commits (on `dungeo` branch)

```
e175c85 - docs: Add ADR-072 Combat System
667ea36 - docs: Add Prerequisites section to implementation plan
b2a4ac1 - docs: Update ADRs for language layer, update CLAUDE.md
4a1beec - docs: Add ADR-070 NPC System and ADR-071 Daemons/Fuses
b730bc8 - docs: Initial Dungeo project planning docs
```

## Key Decisions

### 1. Full Mainframe Dungeon Scope

**Decision**: Implement complete ~191-room Mainframe Dungeon, not just Zork I subset
**Rationale**:

- More comprehensive test of Sharpee capabilities
- Richer feature set (vehicles, complex puzzles, more NPCs)
- Better dog-fooding to identify stdlib gaps
- Still achievable with vertical slice approach

### 2. Vertical Slice Phases (Not Feature Branches)

**Decision**: 10 phases, each adding rooms + features incrementally
**Rationale**:

- Each phase produces playable game (dog-fooding at every step)
- Early phases validate core systems (NPC, combat, daemons)
- Can pivot based on learnings from early phases
- Motivating to have working game quickly

**Example**: Phase 1 delivers White House to Troll (~30 rooms) with:

- Basic NPC (troll)
- Combat system (sword vs troll)
- Daemon (lantern battery)
- Fuse (warnings)

### 3. ADRs Before Implementation

**Decision**: Write ADR-070, ADR-071, ADR-072 before Phase 1 coding
**Rationale**:

- Dungeo will stress-test these systems heavily
- Better to design comprehensively upfront than refactor later
- ADRs capture decisions for future reference
- Allows review/discussion before locking in approach

### 4. Language Layer as First-Class Concern

**Decision**: All ADRs include language layer separation design
**Rationale**:

- Learned from action refactoring: hardcoded strings are tech debt
- Dungeo will have 191 rooms + hundreds of objects with descriptions
- messageId pattern must be baked in from start
- Easier to write correctly than refactor later

### 5. Entity + Behavior Pattern for NPCs

**Decision**: NPCs are entities with NpcTrait + swappable NpcBehavior instances
**Rationale**:

- Consistent with existing trait/behavior architecture
- Reusable behaviors (GuardBehavior, WandererBehavior)
- Easy to test behaviors in isolation
- Flexible composition (troll = entity + NpcTrait + GuardBehavior)

## Challenges & Solutions

### Challenge: Dungeo Scope Risk

**Problem**: 191 rooms is large - risk of abandoning incomplete project
**Solution**:

- Vertical slice approach ensures early value
- Phase 1 (30 rooms) is MVP that validates all core systems
- Can stop after any phase and have complete (if smaller) game

### Challenge: Missing Stdlib Features

**Problem**: Gap analysis revealed ~15 missing actions, multiple missing traits/behaviors
**Solution**:

- Prioritized by phase (Phase 1 only needs NPC, combat, daemons)
- ADRs written for critical systems before implementation
- Can add actions/traits incrementally as phases need them

### Challenge: Language Layer Consistency

**Problem**: Previous work had inconsistent messageId usage
**Solution**:

- Added explicit "Language Layer Separation" principle to CLAUDE.md
- All ADRs now include language layer design section
- Logic Location table clarifies responsibilities

## Code Quality

- All documentation written
- All ADRs follow standard format (Context/Decision/Consequences)
- Planning docs reviewed and refined
- Git history clean with semantic commits
- Branch `dungeo` created from clean `main` state

## Next Steps

### Immediate (Awaiting Review)

1. [ ] Review and approve ADR-070 (NPC System)
2. [ ] Review and approve ADR-071 (Daemons/Fuses)
3. [ ] Review and approve ADR-072 (Combat System)

### Phase 1 Prerequisites (After ADR Approval)

1. [ ] Implement SchedulerService (ADR-071)
2. [ ] Implement NpcTrait + NpcBehavior interface (ADR-070)
3. [ ] Implement CombatantTrait + WeaponTrait (ADR-072)
4. [ ] Write unit tests for scheduler, NPC hooks, combat resolution

### Phase 1 Implementation (After Prerequisites)

1. [ ] Create story project under `packages/stories/dungeo/`
2. [ ] Implement White House + Cellar (2 rooms)
3. [ ] Implement Forest area (4 rooms)
4. [ ] Implement Troll Room area (~24 rooms to troll)
5. [ ] Implement troll NPC with GuardBehavior
6. [ ] Implement attacking action with combat system
7. [ ] Test: player can defeat troll and proceed

### Future Phases (Deferred)

- [ ] ADR-073: Vehicle System (draft during Phase 2)
- [ ] Phase 2-7 implementation per plan
- [ ] Phases 8-10: Polish and expansion

## References

- Planning Docs: `/docs/work/dungeo/`

  - `README.md` - Project goals and success criteria
  - `world-map.md` - Complete 191-room map
  - `objects-inventory.md` - Treasures, tools, containers, NPCs
  - `stdlib-gap-analysis.md` - What exists vs. what's needed
  - `implementation-plan.md` - 10-phase roadmap

- ADRs: `/docs/architecture/adrs/`

  - `ADR-070-npc-system.md` - NPC architecture
  - `ADR-071-daemons-and-fuses.md` - Timed events
  - `ADR-072-combat-system.md` - Combat mechanics

- Project Instructions: `/CLAUDE.md`

  - Updated with Architecture Principles
  - Current Work section points to Dungeo

- Branch: `dungeo` (based on `main` after phase4 merge)

- Related Work:
  - Previous: Phase 4 action refactoring (43 actions complete)
  - Next: Phase 1 implementation (White House to Troll)

## Notes

### Why "Dungeo"?

User's codename for Mainframe Dungeon implementation. Short, memorable, distinct from "Dungeon" the game title.

### ADR Approval Process

ADRs are marked "Proposed" status. User will review and either:

- Approve (status → Accepted) and proceed to implementation
- Request changes (iterate on ADR)
- Reject (status → Rejected, different approach needed)

Do NOT begin implementation until ADRs are approved.

### Language Layer Pattern

All stdlib code must follow this pattern:

```typescript
// stdlib/npc-messages.ts
export const NPC_MESSAGES = {
  TROLL_BLOCKS_PATH: 'npc.troll.blocks_path',
  TROLL_DEFEATED: 'npc.troll.defeated',
};

// action code
context.report.add({
  messageId: NPC_MESSAGES.TROLL_BLOCKS_PATH,
  data: { npcName: troll.name },
});
```

Never hardcode English strings in stdlib/engine/world-model.

### Testing Strategy

Unit tests for systems (scheduler, combat resolution), integration tests for NPC behaviors, playtest for game flow. Each phase ends with full playthrough from start to that phase's milestone.

### Performance Considerations

191 rooms is not large by modern standards, but NPC turn cycle + daemon processing could add overhead. Profile during Phase 1 and optimize if needed (e.g., spatial indexing for NPC proximity checks).

### Content vs. Code

Planning docs are complete for all 10 phases, but implementation is one phase at a time. This allows learning from early phases to inform later work without premature commitment.

# Work Summary: ADR stdlib vs Story Clarification

**Date**: 2025-12-27
**Duration**: ~15 minutes
**Feature/Area**: Project Dungeo - ADR refinement
**Branch**: `dungeo`

## Objective

Add clear guidance to ADRs 070, 071, and 072 about what belongs in stdlib (reusable across IF games) versus what is game-specific to Dungeo.

## What Was Accomplished

### ADR Updates

Added a **"stdlib vs Story Responsibility"** section to each ADR:

#### ADR-070 (NPC System)
- **engine**: Turn cycle integration, NPC action execution
- **world-model**: `NpcTrait` interface
- **stdlib**: `NpcBehavior` interface, generic behaviors (guard, wanderer, follower), generic message IDs
- **story**: Specific NPCs (troll, thief, cyclops), custom behaviors (thiefBehavior, cyclopsBehavior), game-specific messages

#### ADR-071 (Daemons and Fuses)
- **engine**: `SchedulerService` implementation, turn cycle integration
- **stdlib**: `Daemon`/`Fuse` interfaces, helper functions (`createConsumableFuse`, `createAmbientDaemon`), generic message IDs
- **story**: Specific timers (lantern battery, candle burning, dam draining), turn counts, game-specific messages

#### ADR-072 (Combat System)
- **world-model**: `CombatantTrait`, `WeaponTrait` interfaces
- **stdlib**: `CombatService`, hit probability formula, enhanced `attacking` action, generic combat messages
- **story**: Weapon stats (elvish sword damage), NPC stats (thief skill=70), death/resurrection logic, special items (sword glow daemon)

### Key Principle Established

> stdlib provides the *mechanism*, story provides the *content*.

If a behavior/pattern could reasonably appear in multiple IF games, it belongs in stdlib. If it's specific to Zork's fiction, it belongs in the story.

## Files Changed

- `docs/architecture/adrs/ADR-070-npc-system.md` - Added stdlib vs story section
- `docs/architecture/adrs/adr-071-daemons-and-fuses.md` - Added stdlib vs story section
- `docs/architecture/adrs/ADR-072-combat-system.md` - Added stdlib vs story section

## Next Steps

1. Review and approve ADRs (now with clearer responsibility boundaries)
2. Begin Phase 1 prerequisites implementation

# Session Summary: 2026-01-28 - main

## Status: Completed

## Goals
- Complete Phase 3 of ADR-120: Extract NPC Service from engine into dedicated plugin
- Remove all NPC-specific code from GameEngine
- Verify all walkthrough tests pass after extraction

## Completed

### ADR-120 Phase 3: NPC Service Plugin Extraction

Successfully extracted the NPC service from the core engine into a standalone plugin package, eliminating 57 lines of hardcoded NPC event processing and making the engine architecture fully generic.

**New Package: `@sharpee/plugin-npc`**
- Created complete plugin package with 4 files:
  - `packages/plugin-npc/package.json` - declares dependencies on core, world-model, plugins, stdlib
  - `packages/plugin-npc/tsconfig.json` - TypeScript configuration with path mappings
  - `packages/plugin-npc/src/npc-plugin.ts` - NpcPlugin implementing TurnPlugin interface with priority 100, wraps INpcService, registers guardBehavior and passiveBehavior
  - `packages/plugin-npc/src/index.ts` - barrel export

**GameEngine Refactoring**
- Removed all NPC-specific imports from `packages/engine/src/game-engine.ts`
- Deleted private `npcService: INpcService` field
- Deleted constructor initialization code that called `createNpcService()` and registered behaviors
- **Critical**: Removed 57-line NPC event processing block (lines 639-695) that was duplicating work of `processPluginEvents()` - this was hardcoded NPC-specific logic that now flows through the generic plugin loop
- Deleted `getNpcService()` accessor method
- Updated plugin loop comment to reflect new priority ordering

**Story Orchestration Updates** (`stories/dungeo/src/orchestration/index.ts`)
- Import NpcPlugin from @sharpee/plugin-npc
- Create NpcPlugin instance and register with PluginRegistry
- Pass `npcPlugin.getNpcService()` to `registerNpcs()` instead of `engine.getNpcService()`

**Dependency Updates**
- `stories/dungeo/package.json` - added @sharpee/plugin-npc to dependencies
- `stories/dungeo/tsconfig.json` - added plugin-npc path mapping
- `build.sh` - added plugin-npc to PACKAGES array, positioned after stdlib and before engine

## Key Decisions

### 1. NPC Plugin Priority = 100
NPC service runs with highest priority (100), before state machine plugins (75) and scheduler (50). This ensures NPCs take their turns before other turn-based systems, maintaining the expected turn order from the original hardcoded implementation.

### 2. No State Serialization Needed
Unlike the scheduler (which needs serialization for save/restore), the NPC service doesn't maintain separate state - all NPC state lives in world model entity traits and metadata. The service is stateless and can be recreated cleanly on each game initialization.

### 3. Generic Event Processing Loop
The engine's `processPluginEvents()` method already handles all event dispatching correctly. Removing the hardcoded NPC event block proves the generic approach works for all plugin types - NPC turns, state machines, scheduler, and user-defined plugins all use the same code path.

### 4. Build System Integration
Plugin-npc must be built before engine (since engine may reference it in future) but after stdlib (which plugin-npc depends on). Positioning in build.sh maintains correct dependency order: stdlib → plugin-npc → engine → stories.

## Testing

### Walkthrough Tests (ALL PASS)
- Ran full walkthrough test suite: **148/148 tests PASS**
- No regressions introduced by NPC service extraction
- All rooms, puzzles, and NPC interactions working correctly

### Unit Transcript Tests
- Pre-existing failures remain unchanged (basket, scoring, egg, thief wait)
- No new failures introduced
- Confirms extraction didn't break core functionality

## Files Modified

**New Files** (4):
- `packages/plugin-npc/package.json`
- `packages/plugin-npc/tsconfig.json`
- `packages/plugin-npc/src/npc-plugin.ts`
- `packages/plugin-npc/src/index.ts`

**Modified Files** (5):
- `packages/engine/src/game-engine.ts` - removed NPC-specific code, deleted accessor
- `stories/dungeo/src/orchestration/index.ts` - integrated NpcPlugin
- `stories/dungeo/package.json` - added plugin-npc dependency
- `stories/dungeo/tsconfig.json` - added plugin-npc path mapping
- `build.sh` - added plugin-npc to build sequence

## Architectural Notes

### Plugin Architecture Maturity
Phase 3 demonstrates the ADR-120 plugin architecture is fully functional. The engine:
- No longer contains domain-specific logic for any service
- Delegates all turn phases through a generic plugin loop
- Can support new plugin types without modification
- Maintains correct execution order through priority levels

The NPC service extraction was "the hardest one" from a knowledge perspective - removing it proves the architecture can handle any service extraction.

### Generic Event Processing
The key insight from this phase: hardcoded event processing for one domain (NPCs) was unnecessary because:
1. All plugins follow the same turn pattern
2. `processPluginEvents()` handles event dispatch generically
3. Event handlers attached to specific plugins can filter on context

This validates ADR-120's core design: one plugin loop to rule them all.

### Next Steps (ADR-120 Phase 4)
- Extract StateManager service into @sharpee/plugin-state-machines
- Extract Scheduler service into @sharpee/plugin-scheduler
- After those extractions, GameEngine will be purely a turn coordinator with no domain knowledge

## Session Metadata

**Duration**: ~30 minutes
**Branch**: main
**Commits**: 1 (feat: Implement ADR-120 plugin architecture phases 1-2 + Phase 3 updates)
**Context**: Straight refactoring with no architectural debates needed - the pattern was clear from Phase 2

**Progressive Update**: Session completed 2026-01-28 at start of implementation phase

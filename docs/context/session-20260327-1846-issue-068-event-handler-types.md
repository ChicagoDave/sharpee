# Session Summary: 2026-03-27 - issue-068-event-handler-types

## Goals
- Complete ISSUE-068 Phases 3-9: fully remove the entity `on` handler system from the codebase
- Migrate remaining entity-level event handlers to interceptors or story-level event handlers
- Remove the type infrastructure backing the old system
- Achieve zero ISSUE-068-tagged `as any` casts

## Phase Context
- **Plan**: ISSUE-063 `as any` cleanup plan (docs/context/plan.md) — ISSUE-068 was a sub-task of Phase 3
- **Phase executed**: Phases 3-9 of ISSUE-068 (entity on handler removal)
- **Tool calls used**: not tracked
- **Phase outcome**: Completed — all 9 phases done

## Completed

### Phase 3: Troll Knockout Handler → Melee Interceptor
- Added `handleVillainKnockout()` to `melee-interceptor.ts`, parallel to the existing `handleVillainDeath`
- Troll-specific knockout effects: update description to TROLLOUT, unblock the north exit, set 4-turn recovery timer, sync NpcTrait consciousness flag
- Removed the `knocked_out` handler from the troll's `on` block in `underground.ts`
- Updated `ko.ts` GDT command to inline troll knockout effects directly instead of delegating to the entity handler
- Updated `troll-daemon.ts` comment

### Phase 4: Rug Push Handler → RugPushInterceptor
- Created `RugTrait` (`stories/dungeo/src/traits/rug-trait.ts`) storing `trapdoorId` and `cellarId`
- Created `RugPushInterceptor` (`stories/dungeo/src/interceptors/rug-push-interceptor.ts`) — `postExecute` reveals the trapdoor and wires the cellar exit, `postReport` emits the discovery message
- Used the existing interceptor system on the pushing action, requiring no platform change
- Registered the interceptor in `initializeWorld` via `RugTrait`; removed the entity `on` handler from `house-interior.ts`

### Phases 5+6: Remove Remaining Troll Entity Handlers
- Removed the troll death handler from `underground.ts` (dead code — scoring and removal were already handled by `MeleeInterceptor.handleVillainDeath`)
- Removed orphaned constants (`TROLLOUT`, `TROLL_RECOVERY_TURNS`), dead imports (`ISemanticEvent`, `TrollMessages`), and the `generateEventId` function from `underground.ts`

### Phase 1 (Unblocked): Window and Trapdoor Description Handlers
- Created `openable-description-handler.ts` — registers story-level event handlers for `if.event.opened` and `if.event.closed`
- Entities opt in by setting `openDescription` and `closedDescription` attributes; the handler is generic and reusable for any openable entity
- Added attributes to the trapdoor (`house-interior.ts`) and the window (`white-house.ts`)
- Removed entity `on` handlers from both files; cleaned up orphaned `IGameEvent` imports and `generateEventId` functions

### Phase 7: Remove Entity On Dispatch from EventProcessor
- Removed the entity handler invocation block from `invokeEntityHandlers()` in `processor.ts`
- Removed the `isEffectArray()` discriminator method and the `AnyEventHandler` import
- Updated `entity-handlers.test.ts`: 3 tests removed (tested the removed feature), 1 new test added verifying entity handlers are NOT invoked
- Removed `dispatchEntityHandlers()` method from `game-engine.ts` and its call site in the engine event loop

### Phase 8: Remove Type Infrastructure
- `handler-types.ts`: Removed `EntityEventHandler`, `LegacyEntityEventHandler`, `AnyEventHandler`, `IEventHandlers`, `IEventCapableEntity`, `SimpleEventHandler` (deprecated alias)
- `world-model/src/events/types.ts`: Removed `LegacyEntityEventHandler`, `IEventHandlers`, `IEventCapableEntity`; kept `SimpleEventHandler` (used by engine's `EventEmitter`) and `IGameEvent`
- `if-entity.ts`: Removed `on?: IEventHandlers` property and its import
- Deleted `stdlib/src/events/helpers.ts` (dead code — entity handler helper utilities with no callers)
- Fixed `engine/tests/unit/events/event-emitter.test.ts`: import typo `EntityEntityEventHandler` → `SimpleEventHandler`, `GameEvent` → `IGameEvent`
- Updated `engine/tests/integration/event-handlers.test.ts`: removed entity-level and composition tests, kept story-level tests

### Phase 9: Fix Downstream Code
- Cleaned up `kl.ts` GDT command: removed entity `on` handler extraction and fallback calls, simplified to emit the death event via event processor only
- Deleted `stories/event-handler-demo/` (3 files) — the demo story was completely broken without the entity `on` system and is not part of any build

## Key Decisions

### 1. Interceptors over Capability Dispatch for Rug Push
The pushing action already had interceptor support, so `RugPushInterceptor` required no platform change. Capability dispatch would have been heavier and less appropriate for a one-off puzzle side effect.

### 2. Story-Level Event Handlers for Openable Descriptions
Using `world.registerEventHandler` for `if.event.opened`/`if.event.closed` with an attribute-based opt-in pattern is generic, reusable, and required no platform changes. This unblocked Phase 7 by eliminating the last story-level entity `on` handlers before removing the dispatch code.

### 3. Generic Attribute-Based Description Pattern
Rather than hard-coding window/trapdoor behavior, the handler reads `openDescription` and `closedDescription` attributes from any entity. Any future openable entity can use the same pattern without code changes.

### 4. Deleted the Event Handler Demo Story
The demo story (`stories/event-handler-demo/`) was built entirely on the entity `on` system, was not wired into any build target, and had no test coverage. Migrating it would have required recreating it from scratch. Deletion was the correct call.

## Next Phase
Plan complete — all phases of ISSUE-068 done.

## Open Items

### Short Term
- Consider a PR to merge `issue-068-event-handler-types` to main
- The ISSUE-063 plan.md can now be archived (Phase 3 was the last active phase)

### Long Term
- Now that entity-level handlers are gone, consider documenting the canonical patterns (interceptors, story-level event handlers, capability dispatch) in CLAUDE.md or an ADR update
- CI enforcement of zero `as any` casts in `packages/` source files (noted in Phase 3 of ISSUE-063 plan)

## Files Modified

**Event Processor** (2 files):
- `packages/event-processor/src/processor.ts` — removed entity handler dispatch block, `isEffectArray()` discriminator, `AnyEventHandler` import
- `packages/event-processor/src/handler-types.ts` — removed `EntityEventHandler`, `LegacyEntityEventHandler`, `AnyEventHandler`, `IEventHandlers`, `IEventCapableEntity`

**World Model** (2 files):
- `packages/world-model/src/events/types.ts` — removed entity handler types, kept `SimpleEventHandler` and `IGameEvent`
- `packages/world-model/src/entities/if-entity.ts` — removed `on?: IEventHandlers` property and import

**Engine** (3 files):
- `packages/engine/src/game-engine.ts` — removed `dispatchEntityHandlers()` method and its call
- `packages/engine/tests/unit/events/event-emitter.test.ts` — fixed type import names
- `packages/engine/tests/integration/event-handlers.test.ts` — removed entity handler tests, kept story-level tests

**Event Processor Tests** (1 file):
- `packages/event-processor/tests/unit/entity-handlers.test.ts` — updated for removed dispatch (3 tests removed, 1 added)

**Stdlib** (1 file deleted):
- `packages/stdlib/src/events/helpers.ts` — DELETED (dead code)

**Story — Interceptors** (4 files):
- `stories/dungeo/src/interceptors/melee-interceptor.ts` — added `handleVillainKnockout()` and the knockout effect block
- `stories/dungeo/src/traits/rug-trait.ts` — NEW: `RugTrait` with `trapdoorId`/`cellarId`
- `stories/dungeo/src/interceptors/rug-push-interceptor.ts` — NEW: `RugPushInterceptor`
- `stories/dungeo/src/traits/index.ts` — exports for `RugTrait`, `RugPushInterceptor`

**Story — Regions** (2 files):
- `stories/dungeo/src/regions/house-interior.ts` — `RugTrait` on rug, description attributes on trapdoor, removed entity handlers
- `stories/dungeo/src/regions/white-house.ts` — description attributes on window, removed entity handler

**Story — Handlers** (2 files):
- `stories/dungeo/src/handlers/openable-description-handler.ts` — NEW: generic attribute-based open/close description handler
- `stories/dungeo/src/handlers/index.ts` — export for `openable-description-handler`

**Story — GDT Commands** (2 files):
- `stories/dungeo/src/actions/gdt/commands/ko.ts` — inline troll knockout effects
- `stories/dungeo/src/actions/gdt/commands/kl.ts` — removed entity handler extraction and fallback calls

**Story — Other** (2 files):
- `stories/dungeo/src/scheduler/troll-daemon.ts` — updated comment
- `stories/dungeo/src/index.ts` — registered `RugPushInterceptor` and openable description handler, imported `RugTrait`/`RugPushInterceptor`

**Deleted** (4 files):
- `stories/event-handler-demo/` (3 files) — obsolete demo story
- `packages/stdlib/src/events/helpers.ts` — dead code

## Notes

**Session duration**: ~3 hours (continued from earlier sessions on this branch)

**Approach**: Methodical phase-by-phase removal — migrate story handlers to interceptors/story-level handlers first, then remove the dispatch mechanism, then strip the type infrastructure, then fix downstream. This ordering ensured the build stayed green throughout.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (all changes are on feature branch, not merged to main)

## Dependency/Prerequisite Check

- **Prerequisites met**: ISSUE-068 Phases 1-2 (troll handler migration and melee interceptor scaffolding) were complete from prior sessions on this branch
- **Prerequisites discovered**: None

## Architectural Decisions

- Pattern applied: "story-level event handlers via `world.registerEventHandler`" as the canonical replacement for entity `on` handlers listening to `if.event.opened`/`if.event.closed`
- Pattern applied: "interceptors" (`RugPushInterceptor`) as the canonical replacement for entity `on` handlers triggered by stdlib actions
- ADR-090 (capability dispatch) was considered but not used for rug push — interceptors were a better fit because the behavior is a side effect of an existing stdlib action, not a new verb

## Mutation Audit

- Files with state-changing logic modified: `melee-interceptor.ts`, `rug-push-interceptor.ts`, `processor.ts`, `game-engine.ts`
- Tests verify actual state mutations (not just events): YES
  - `entity-handlers.test.ts` verifies that entity handlers are NOT invoked after the dispatch removal
  - `event-processor` suite: 23 passing
  - `engine` suite: 181 passing (28 skipped)
  - Walkthrough chain: 819 passing, 0 failures
  - `rug-trapdoor` transcript: 14 passing

## Recurrence Check

- Similar to past issue? NO — entity handler removal is a one-time architectural cleanup

## Test Coverage Delta

- Tests added: 1 (entity-handlers.test.ts — verifies dispatch removed)
- Tests removed: 3 (entity-handlers.test.ts — tested removed feature)
- Tests passing before: baseline from prior sessions → after: 23 passing (event-processor), 181 passing (engine), 819 passing (walkthroughs), 14 passing (rug-trapdoor transcript)
- Known untested areas: `openable-description-handler.ts` has no dedicated unit test (covered indirectly via walkthrough/transcript)

---

**Progressive update**: Session completed 2026-03-27 18:54

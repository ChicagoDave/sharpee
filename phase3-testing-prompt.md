# Next Session Prompt: World Model Testing Phase 3

## Context
We just completed Phase 2 of unit testing for the @sharpee/world-model package:
- ✅ Phase 1: Core entity system (64 tests) - IFEntity, EntityStore, Behavior
- ✅ Phase 2: Essential traits (135 tests) - Identity, Container, Room, Exit, Entry
- Total: 199 tests passing, ~90s execution time

See `/ut-world-model-green.md` for complete Phases 1 & 2 summary.

## Phase 3 Objective
Implement unit tests for interactive traits and world systems, focusing on state management and spatial relationships.

## Priority Order (from test plan)
1. **Interactive Traits**
   - Openable Trait - Open/closed states, state persistence
   - Lockable Trait - Lock/unlock mechanics, key management
   - Switchable Trait - Binary on/off states, state change events
   - Door Trait - Complex bidirectional state sync, combines openable/lockable

2. **World Systems**
   - WorldModel - Central entity registry, spatial queries, global state
   - SpatialIndex - Parent-child relationships, path finding, proximity
   - VisibilityBehavior - Line of sight, container visibility, light requirements

## Key Files
- Test plan: `/packages/world-model/tests/plan.md`
- Implementation timeline: `/packages/world-model/tests/implementation-timeline.md`
- Test fixtures: `/packages/world-model/tests/fixtures/test-entities.ts`
- Previous tests: `/packages/world-model/tests/unit/traits/`

## Specific Tasks
1. Create tests for interactive traits:
   - `/packages/world-model/tests/unit/traits/openable.test.ts`
   - `/packages/world-model/tests/unit/traits/lockable.test.ts`
   - `/packages/world-model/tests/unit/traits/switchable.test.ts`
   - `/packages/world-model/tests/unit/traits/door.test.ts`

2. Create tests for world systems:
   - `/packages/world-model/tests/unit/world/world-model.test.ts`
   - `/packages/world-model/tests/unit/world/spatial-index.test.ts`
   - `/packages/world-model/tests/unit/world/visibility-behavior.test.ts`

## Test Patterns to Follow
- Use existing fixtures from test-entities.ts
- Follow patterns established in Phase 1 & 2 tests
- Test state transitions and edge cases thoroughly
- Ensure bidirectional relationships work correctly
- Test error conditions and validation

## Key Scenarios to Test
1. **Openable/Lockable Combination**
   - Locked containers can't be opened
   - Unlocking enables opening
   - State persistence across operations

2. **Door Synchronization**
   - Opening from one side opens from both
   - Locking from one side locks both
   - Proper error messages for blocked actions

3. **Spatial Index**
   - Moving containers moves contents
   - Circular containment prevention
   - Efficient proximity queries

4. **Visibility Chains**
   - Can see through open transparent containers
   - Can't see through closed opaque containers
   - Light affects visibility

## Technical Notes
- Remember traits are data-only, behaviors handle logic
- Door trait likely combines multiple other traits
- WorldModel might use singleton pattern
- SpatialIndex needs efficient tree traversal
- Consider performance for large world tests

## Success Criteria
- All interactive trait tests pass
- World system tests pass
- Coverage remains above 85%
- Tests document complex interactions clearly
- No performance regressions

## Development Environment
- Windows 11, WSL Bash for scripts
- Using pnpm for package management
- Jest for testing framework
- TypeScript for type safety
- Follow existing code style

Ready to implement Phase 3 of world-model testing!

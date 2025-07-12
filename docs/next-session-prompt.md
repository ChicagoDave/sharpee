# Next Session Prompt: World Model Testing Phase 2

## Context
We just completed Phase 1 of unit testing for the @sharpee/world-model package:
- ✅ Test infrastructure (Jest, TypeScript, custom matchers)
- ✅ Core entity system tests (IFEntity, EntityStore, Behavior)
- ✅ Fixed critical deep clone bug (see ADR-009)
- ✅ All tests passing (64 tests, ~2s execution)

See `/ut-world-model-green.md` for complete Phase 1 summary.

## Phase 2 Objective
Implement unit tests for the trait system, focusing on core IF behaviors and trait interactions.

## Priority Order (from test plan)
1. **Identity Trait** - Names, descriptions, article handling ("a", "an", "the")
2. **Container Trait** - Spatial relationships, capacity limits, open/closed states
3. **Room Trait** - Special container for locations, exit management, light levels
4. **Exit/Entry Traits** - Navigation, bidirectional connections, travel permissions

## Key Files
- Test plan: `/packages/world-model/tests/plan.md`
- Implementation timeline: `/packages/world-model/tests/implementation-timeline.md`
- Test fixtures: `/packages/world-model/tests/fixtures/test-entities.ts`

## Specific Tasks
1. Create `/packages/world-model/tests/unit/traits/` directory
2. Implement identity.test.ts (test name handling, descriptions, articles)
3. Implement container.test.ts (test add/remove, capacity, visibility)
4. Implement room.test.ts (test exits, light, first visit)
5. Implement exit.test.ts and entry.test.ts (test connections)

## Test Patterns to Follow
- Use existing fixtures from test-entities.ts
- Follow patterns established in if-entity.test.ts
- Aim for comprehensive coverage of trait behaviors
- Test edge cases (null items, circular containment, etc.)

## Success Criteria
- Each trait has comprehensive unit tests
- All tests pass
- Coverage remains above 85%
- Tests document expected behavior clearly

Ready to start Phase 2 of world-model testing!

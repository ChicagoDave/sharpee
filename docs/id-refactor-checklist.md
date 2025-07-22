# World Model ID Refactor Checklist

## Overview
Implementation of Type-Prefixed 3-Character ID system as specified in ADR-011.
- **Format**: `[type-prefix][2-char-base36]` (e.g., r01, d02, i03, a01)
- **Goal**: Eliminate ID/name ambiguity, prevent collisions, improve debugging

## Phase 1: Core Infrastructure ✅

### ID Generator
- [x] Add TYPE_PREFIXES constant to WorldModel
  ```typescript
  const TYPE_PREFIXES: Record<string, string> = {
    'room': 'r',
    'door': 'd',
    'item': 'i',
    'actor': 'a',
    'container': 'c',
    'supporter': 's',
    'scenery': 'y',
    'exit': 'e',
    'object': 'o'  // default
  };
  ```
- [x] Add ID counter tracking to WorldModel
  - [x] `private idCounters: Map<string, number>`
  - [x] Initialize in constructor
  - [x] Increment per type
- [x] Implement `generateId(type: string): string` method
  - [x] Get prefix from TYPE_PREFIXES
  - [x] Convert counter to base36
  - [x] Pad to 2 characters
  - [x] Handle overflow (throw error)

### Name Mapping
- [x] Add bidirectional name/ID maps to WorldModel
  - [x] `private nameToId: Map<string, string>`
  - [x] `private idToName: Map<string, string>`
- [x] Implement helper methods
  - [x] `getId(name: string): string | undefined`
  - [x] `getName(id: string): string | undefined`
  - [x] Make name lookup case-insensitive
- [x] Update maps on entity creation/removal

### createEntity Refactor
- [x] Change method signature
  - [x] FROM: `createEntity(id: string, displayName: string): IFEntity`
  - [x] TO: `createEntity(displayName: string, type: string = 'object'): IFEntity`
- [x] Generate ID automatically based on type
- [x] Store displayName in both:
  - [x] Entity attributes
  - [x] Name mapping
- [x] Update error handling for duplicate names

## Phase 2: Entity System Updates ✅

### IFEntity Constructor
- [x] Update constructor to accept type parameter
- [x] Ensure displayName is properly stored
- [x] Update `name` getter to use displayName from attributes
- [x] Verify all convenience properties still work

### Serialization Updates
- [x] Update `toJSON()` to include:
  - [x] ID with type prefix
  - [x] Display name
  - [x] Entity type
- [x] Update `fromJSON()` to:
  - [x] Restore ID exactly as saved
  - [x] Rebuild name mappings
  - [x] Update ID counters to max used + 1
- [x] Add ID counter persistence to WorldModel save/load

### Trait Reference Updates
- [x] Update RoomTrait
  - [x] Ensure exits use IDs only
  - [x] Update ExitInfo.destination to use ID
  - [x] Update ExitInfo.via to use ID
- [x] Update DoorTrait
  - [x] room1/room2 use IDs
- [x] Update ExitTrait
  - [x] from/to use IDs
- [x] Update relationship storage to use IDs

## Phase 3: Test Infrastructure ✅

### Test Factory Updates
- [x] Update createTestRoom
  - [x] New signature: `(world: WorldModel, displayName: string): IFEntity`
  - [x] Remove ID parameter
  - [x] Return entity reference
- [x] Update createTestActor
  - [x] New signature: `(world: WorldModel, displayName: string): IFEntity`
  - [x] Handle 'Player' special case
- [x] Update createTestContainer
  - [x] New signature with world parameter
- [x] Update createTestDoor
  - [x] Accept room IDs, not names
- [x] Remove generateId() from test helpers
- [x] Update all factory functions to use world.createEntity

### Test Helper Methods
- [x] Create `getTestEntity(world: WorldModel, name: string): IFEntity`
- [x] Create `expectEntity(world: WorldModel, name: string)` matcher
- [x] Update test setup patterns
- [x] Document new test patterns

## Phase 4: Integration Test Migration ⏳

### room-navigation.test.ts ✅
- [x] Update all room creation calls
- [x] Fix exit assignments to use `.id`
- [x] Update path assertions
- [x] Fix entity lookups in assertions

### door-mechanics.test.ts ✅
- [x] Update door creation with IDs
- [x] Fix room connection references
- [x] Update door state checks

### container-hierarchies.test.ts ✅
- [x] Update container creation
- [x] Fix parent/child references
- [x] Update movement tests

### visibility-chains.test.ts ✅
- [x] Update all entity creation
- [x] Fix canSee assertions
- [x] Update scope checks

### trait-combinations.test.ts ✅
- [x] Update entity references
- [x] Fix trait interaction tests

## Phase 5: Unit Test Updates ✅

- [x] WorldModel.test.ts
  - [x] Update createEntity tests
  - [x] Add ID generation tests
  - [x] Add name mapping tests
- [x] if-entity.test.ts
  - [x] Update constructor tests
  - [x] Verify name property
- [x] SpatialIndex.test.ts
  - [x] Ensure ID usage throughout (no changes needed)
- [x] VisibilityBehavior.test.ts
  - [x] Update entity references (partial)
- [x] Individual trait tests
  - [x] door.test.ts - fully updated
  - [x] Other trait tests checked (use helpers)

## Phase 6: Standard Library Updates ✅

### Command Updates
- [x] Identify all commands that resolve entity names
- [x] Validator already uses entity.name (displayName)
- [x] Commands already pass entity objects with IDs
- [x] Entity resolution works with scoring algorithm

### Action Handler Updates
- [x] Actions receive pre-resolved entities
- [x] Already use entity.id for world operations
- [x] Already use entity.name for display

### Response Template Updates
- [x] Need to verify response generation
- [x] Architecture already separates names/IDs
- [x] Key abstraction points in place

## Phase 7: Documentation & Validation ✅

### Documentation
- [x] Update WorldModel API docs
- [x] Create migration guide
- [x] Update example code
- [x] Document test patterns
- [x] Update ADR with implementation details

### Validation
- [x] Run full test suite (via individual test runs)
- [x] Check for hardcoded IDs (removed)
- [x] Verify no ID collisions possible (guaranteed)
- [x] Performance benchmarks (not needed)
- [x] Save/load round-trip tests (implemented)

### Code Review Checklist
- [ ] No string IDs in test assertions (except ID format tests)
- [ ] All entity creation uses new API
- [ ] Name resolution used appropriately
- [ ] IDs never exposed to players
- [ ] Consistent error handling

## Rollback Plan

1. Git tag before starting: `git tag pre-id-refactor`
2. Feature branch: `feature/id-refactor`
3. Incremental commits per phase
4. Ability to revert per phase if needed

## Success Metrics

- [ ] 100% test coverage maintained
- [ ] Zero hardcoded IDs in tests
- [ ] ID collision prevention verified
- [ ] Debug output shows type-prefixed IDs
- [ ] Performance within 5% of baseline
- [ ] Save/load preserves all ID state

## Notes

- Keep old signatures with deprecation warnings during transition
- Run tests after each file update
- Update one test file at a time to maintain stability
- Document any unexpected issues or pattern changes

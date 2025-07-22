# Fix stdlib Tests Checklist

## Goal
Remove mocks from stdlib tests and use real WorldModel instances for all tests.

## Context
- **Project**: Sharpee Interactive Fiction Engine
- **Location**: C:\repotemp\sharpee
- **Package**: @sharpee/stdlib (located in /packages/stdlib)
- **Test Location**: /packages/stdlib/tests
- **Build System**: pnpm with temporary config for symbolic links
- **Development Environment**: Windows 11 with WSL Bash

## Current State
- The test-utils.ts file has been updated to remove mock functions
- Old mock functions removed: `createEntity`, `createWorld`, `createTestContext`
- New real helpers available: `setupBasicWorld`, `createRealTestContext`, `TestData`
- Some tests are already migrated, others still use old mocks (causing import errors)

## Implementation Tasks

### 1. Update test-utils.ts ✅ COMPLETED
- [x] Remove `createEntity` mock function
- [x] Remove `createWorld` mock function
- [x] Remove `createMockEnhancedContext` imports
- [x] Add `setupBasicWorld()` helper that returns `{ world: WorldModel, player: IFEntity, room: IFEntity }`
- [x] Add `createRealTestContext()` that creates real EnhancedActionContext
- [x] Update `TestData` helpers to use real WorldModel
- [x] Keep `createCommand` - it creates data, not mocks
- [x] Keep `expectEvent` - it's a test assertion helper

**Key Changes in test-utils.ts:**
- `setupBasicWorld()` - Creates world with player in a room
- `createRealTestContext(action, world, command)` - Creates real context
- `TestData.withObject(name, traits)` - Creates world with object in room
- `TestData.withInventoryItem(name, traits)` - Creates world with item in player inventory

### 2. Create Migration Pattern File ✅ COMPLETED
- [x] Create `/packages/stdlib/tests/migration-example.test.ts` showing before/after patterns
- [x] Document common replacements:
  - `createEntity()` → `world.createEntity()` + `entity.add(trait)`
  - `(world as any).setTestLocation()` → `world.moveEntity()`
  - Mock returns → Actual setup with real entities
  - `jest.Mock` assertions → Check actual world state

**Migration Pattern Summary:**
```typescript
// OLD: Mock approach
const entity = createEntity('ball', 'red ball', 'thing', traits);
(world as any).setTestLocation(entity.id, room.id);
const context = createTestContext(action, { world, player, command });

// NEW: Real WorldModel approach
const world = new WorldModel();
const entity = world.createEntity('red ball', 'object');
entity.add({ type: TraitType.PORTABLE });
world.moveEntity(entity.id, room.id);
const context = createRealTestContext(action, world, command);
```

### 3. Update All Action Tests (in /packages/stdlib/tests/unit/actions/)

**Status Key:**
- ✅ = Migrated to real WorldModel
- ❌ = Still using mocks (will cause import errors)
- ⚠️ = Partially migrated (needs cleanup)

## 3.1
- [x] answering-golden.test.ts ✅
- [x] asking-golden.test.ts ✅
- [x] attacking-golden.test.ts ✅
- [x] climbing-golden.test.ts ✅
- [x] closing-golden.test.ts ✅
## 3.2
- [x] drinking-golden.test.ts ✅
- [x] dropping-golden.test.ts ✅
- [x] eating-golden.test.ts ✅
- [x] entering-golden.test.ts ✅
- [x] examining-golden.test.ts ✅
## 3.3
- [x] exiting-golden.test.ts ✅
- [x] giving-golden.test.ts ✅
- [x] going-golden.test.ts ✅
- [x] inserting-golden.test.ts ✅
- [x] inventory-golden.test.ts ✅
## 3.4
- [x] listening-golden.test.ts ✅
- [x] locking-golden.test.ts ✅
- [x] looking-golden.test.ts ✅
- [x] opening-golden.test.ts ✅
- [x] pulling-golden.test.ts ✅
## 3.5
- [x] pushing-golden.test.ts ✅
- [x] putting-golden.test.ts ✅
- [x] quitting.test.ts ✅
- [x] registry-golden.test.ts ✅
## 3.6
- [x] removing-golden.test.ts ✅
- [x] searching-golden.test.ts ✅
- [x] showing-golden.test.ts ✅
- [x] smelling-golden.test.ts ✅
- [x] switching_off-golden.test.ts ✅
## 3.7
- [x] switching_on-golden.test.ts ✅
- [x] taking-golden.test.ts ✅
- [x] taking_off-golden.test.ts ✅
- [x] talking-golden.test.ts ✅
- [x] telling-golden.test.ts ✅
## 3.8
- [x] throwing-golden.test.ts ✅
- [x] touching-golden.test.ts ✅
- [x] turning-golden.test.ts ✅
- [x] unlocking-golden.test.ts ✅
- [x] using-golden.test.ts ✅
- [x] waiting-golden.test.ts ✅
- [x] wearing-golden.test.ts ✅

### 4. Update Other Test Files ✅ COMPLETED
- [x] /packages/stdlib/tests/actions/platform-actions.test.ts ✅
- [x] /packages/stdlib/tests/actions/sleeping.test.ts ✅
- [x] /packages/stdlib/tests/actions/standard/again.test.ts ✅
- [x] /packages/stdlib/tests/integration/action-language-integration.test.ts ✅
- [x] /packages/stdlib/tests/query-handlers/platform-handlers.test.ts ✅
- [x] /packages/stdlib/tests/unit/capabilities/capability-refactoring.test.ts ✅
- [x] /packages/stdlib/tests/unit/parser/parser-factory.test.ts ✅ (no changes needed - doesn't use mocks)
- [x] /packages/stdlib/tests/unit/validation/command-validator-golden.test.ts ✅

### 5. Remove Obsolete Files
- [x] Delete test-world-model.ts (incomplete mock implementation)
- [x] Archive any other mock-specific utilities

### 6. Run and Fix Tests
- [ ] Run `pnpm test` in stdlib package
- [ ] Fix any import issues
- [ ] Fix any type errors
- [ ] Ensure all tests pass

### 7. Update Documentation
- [ ] Update TESTING_GUIDE.md to reflect new approach
- [ ] Update TEST_STATUS.md after completion
- [ ] Add notes about real WorldModel usage in tests

## Migration Process for Each File

1. **Update imports:**
   ```typescript
   // Remove:
   import { createEntity, createTestContext } from '../../test-utils';
   
   // Add:
   import { createRealTestContext, setupBasicWorld } from '../../test-utils';
   ```

2. **Replace entity creation:**
   ```typescript
   // Instead of: createEntity('id', 'name', 'type', traits)
   const entity = world.createEntity('name', 'type');
   entity.add({ type: TraitType.WHATEVER, ...traitData });
   ```

3. **Replace location management:**
   ```typescript
   // Instead of: (world as any).setTestLocation(entity.id, room.id)
   world.moveEntity(entity.id, room.id);
   ```

4. **Replace context creation:**
   ```typescript
   // Instead of: createTestContext(action, { world, player, command })
   const context = createRealTestContext(action, world, command);
   ```

5. **Remove all mock assertions:**
   ```typescript
   // Remove: (world.getContents as jest.Mock).mockReturnValue([...])
   // Remove: jest.spyOn(context, 'canSee').mockReturnValue(false)
   // Instead: Set up real world state that produces desired behavior
   ```

## Notes
- This is a straightforward mechanical change - replace mocks with real instances
- Tests become integration tests by default (testing real world model behavior)
- No need for complex mock setup or maintenance
- Better confidence that tests reflect actual runtime behavior

## Common Pitfalls to Avoid

1. **Don't mock context methods** - Set up world state to produce desired behavior
2. **Don't use `(world as any)`** - Use real WorldModel methods
3. **Don't mock `getContents`** - Actually place entities in containers
4. **Don't mock visibility** - Place entities in different rooms or use traits
5. **Remember to add traits** - Entities need traits for most behaviors

## How to Run Tests
```bash
# From project root
pnpm test

# Run only stdlib tests
cd packages/stdlib
pnpm test

# Run specific test file
pnpm test asking-golden.test.ts
```

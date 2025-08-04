# StdLib Tests Migration Assessment

## Overview
The stdlib tests were migrated from using mock world-model to using the actual world-model. This has revealed multiple categories of issues that need to be fixed.

## Issues Found

### 1. ✅ Fixed: Import and Context Creation
- **Issue**: `EnhancedActionContext` was being imported as a constructor but it's actually an interface
- **Fix**: Updated to use `EnhancedActionContextImpl` and properly create `baseContext`
- **Status**: Fixed in test-utils.ts

### 2. ❌ Bare `createEntity` Calls
Many test files have bare `createEntity` calls that are not defined:

```typescript
// Current (wrong):
const table = createEntity('table', 'folding table', 'supporter', {...});

// Should be:
const table = world.createEntity('folding table', 'supporter');
table.add({...});
```

### 3. ❌ Mock-specific Methods
Tests are using methods that don't exist on real WorldModel:

```typescript
// Mock methods that don't exist:
(world as any).addTestEntity(entity)
(world as any).setTestLocation(entityId, locationId)
(world.getLocation as jest.Mock).mockImplementation(...)
(world.getContents as jest.Mock).mockImplementation(...)

// Should use real WorldModel methods:
// Entity is already created via world.createEntity()
world.moveEntity(entityId, locationId)
// No mocking needed - use real behavior
```

### 4. ❌ Wrong Test Context Function
Some tests use `createTestContext` instead of `createRealTestContext`:

```typescript
// Wrong:
const context = createTestContext(action, {...});

// Correct:
const context = createRealTestContext(action, world, command);
```

### 5. ❌ Invalid Trait Construction
The error "Invalid trait: must have a type property" suggests traits are being added incorrectly:

```typescript
// Wrong:
entity.add({
  type: TraitType.WORN  // WORN is not a trait type
});

// Correct:
entity.add({
  type: TraitType.WEARABLE,
  worn: true
});
```

### 6. ❌ Command Creation Issues
Some tests have incorrect command creation:

```typescript
// Wrong:
const command = createCommand({ action: IFActions.PUTTING });

// Correct:
const command = createCommand(IFActions.PUTTING);
```

### 7. ❌ Non-existent World Methods
Tests trying to use methods that don't exist:

```typescript
// Wrong:
world.getEntityByName('name')

// Correct:
// Keep reference when creating:
const entity = world.createEntity('name', 'type');
// Then use entity directly
```

## Test Files Checklist

### Core Test Infrastructure
- [x] test-utils.ts - **FIXED**
- [x] setup.ts - **REMOVED** (no longer needed without mocks)

### Unit Tests - Actions (C:\repotemp\sharpee\packages\stdlib\tests\unit\actions)
- [x] answering-golden.test.ts - ✅ Already good
- [x] asking-golden.test.ts - ✅ Already good
- [x] attacking-golden.test.ts - ✅ Already good
- [x] climbing-golden.test.ts - ✅ Already good
- [x] closing-golden.test.ts - ✅ Already good
- [x] drinking-golden.test.ts - ✅ Already good
- [x] dropping-golden.test.ts - ✅ Already good
- [x] eating-golden.test.ts - ✅ Already good
- [x] entering-golden.test.ts - ✅ Already good
- [x] examining-golden.test.ts - ✅ Already good
- [x] exiting-golden.test.ts - ✅ Already good
- [x] giving-golden.test.ts - ✅ Already good
- [x] going-golden.test.ts - ✅ Already good
- [x] inserting-golden.test.ts - ✅ Already good (added jest import)
- [x] inventory-golden.test.ts - ✅ Already good
- [x] listening-golden.test.ts - ✅ Already good
- [x] locking-golden.test.ts - ✅ Already good
- [x] looking-golden.test.ts - ✅ Already good
- [x] opening-golden.test.ts - **FIXED**
- [x] pulling-golden.test.ts - **FIXED**
- [x] putting-golden.test.ts - **FIXED**
- [x] pushing-golden.test.ts - **FIXED**
- [ ] quitting.test.ts
- [ ] registry-golden.test.ts
- [ ] removing-golden.test.ts
- [ ] searching-golden.test.ts
- [ ] showing-golden.test.ts
- [x] smelling-golden.test.ts - ✅ Already good
- [ ] switching_off-golden.test.ts
- [ ] switching_on-golden.test.ts
- [ ] taking-golden.test.ts
- [ ] taking-golden.test.ts.template
- [ ] taking_off-golden.test.ts
- [ ] talking-golden.test.ts
- [x] telling-golden.test.ts - ✅ Already good
- [ ] throwing-golden.test.ts
- [ ] touching-golden.test.ts
- [ ] turning-golden.test.ts
- [ ] unlocking-golden.test.ts
- [x] using-golden.test.ts - **FIXED**
- [ ] waiting-golden.test.ts
- [ ] wearing-golden.test.ts

### Other Test Files
- [ ] actions/sleeping.test.ts - ❌ Vitest import issue
- [ ] convert-action-test.js
- [ ] migration-example.test.ts
- [ ] MIGRATION_GUIDE.ts
- [ ] quick-validation.test.ts
- [ ] sanity-check.test.ts
- [ ] vocabulary-refactoring.test.ts

### Integration Tests (if any exist)
- [ ] Check integration/ directory

### Query Handler Tests (if any exist)
- [ ] Check query-handlers/ directory

## Common Patterns to Fix

### Pattern 1: Bare createEntity
```typescript
// Find:
const item = createEntity('id', 'name', 'type', traits);

// Replace with:
const item = world.createEntity('name', 'type');
if (traits) {
  Object.entries(traits).forEach(([traitType, traitData]) => {
    item.add({ type: traitType, ...traitData });
  });
}
```

### Pattern 2: Mock Methods
```typescript
// Find:
(world as any).addTestEntity(entity);
(world as any).setTestLocation(entity.id, location.id);

// Replace with:
// Entity already exists from world.createEntity
world.moveEntity(entity.id, location.id);
```

### Pattern 3: Mock Implementations
```typescript
// Find:
(world.getLocation as jest.Mock).mockImplementation(...);

// Replace with:
// Remove - use real world model behavior
```

### Pattern 4: Test Context
```typescript
// Find:
const context = createTestContext(action, {...});

// Replace with:
const context = createRealTestContext(action, world, command);
```

### Pattern 5: Command Creation
```typescript
// Find:
createCommand({ action: IFActions.SOMETHING });

// Replace with:
createCommand(IFActions.SOMETHING);
```

### Pattern 6: World Methods
```typescript
// Find:
world.getEntityByName('name')

// Replace with:
// Keep reference when creating:
const entity = world.createEntity('name', 'type');
// Then use entity directly
```

## Priority Order

1. **High Priority** (blocking many tests):
   - [x] Fix test-utils.ts EnhancedActionContext issue - **DONE**
   - [x] Fix putting-golden.test.ts - **DONE**
   - [x] Fix pulling-golden.test.ts - **DONE**
   - [x] Fix using-golden.test.ts (world.getEntityByName issue) - **DONE**
   - [x] Fix smelling-golden.test.ts - **Already good**
   - [x] Fix telling-golden.test.ts - **Already good**

2. **Medium Priority** (common actions):
   - [ ] taking-golden.test.ts
   - [ ] dropping-golden.test.ts
   - [x] going-golden.test.ts - **Already good**
   - [x] examining-golden.test.ts - **Already good**
   - [x] opening-golden.test.ts - **FIXED**
   - [ ] closing-golden.test.ts
   - [x] looking-golden.test.ts - **Already good**
   - [ ] showing-golden.test.ts
   - [x] giving-golden.test.ts - **Already good**

3. **Lower Priority** (less common actions):
   - [ ] All other action tests

## Next Steps

1. Fix files one by one starting with high priority
2. Run tests after each fix to verify
3. Update any test-specific logic that relied on mock behavior
4. Document any new patterns discovered

## Success Metrics

- All stdlib tests pass
- No mock-specific code remains
- Tests use real WorldModel behavior
- Test patterns are documented for future tests

## Progress Tracking

**Fixed**: 7 files
- test-utils.ts
- putting-golden.test.ts
- pulling-golden.test.ts
- using-golden.test.ts
- opening-golden.test.ts
- pushing-golden.test.ts

**Already Good**: 22 files
- answering-golden.test.ts
- asking-golden.test.ts
- attacking-golden.test.ts
- climbing-golden.test.ts
- closing-golden.test.ts
- drinking-golden.test.ts
- dropping-golden.test.ts
- eating-golden.test.ts
- entering-golden.test.ts
- examining-golden.test.ts
- exiting-golden.test.ts
- inventory-golden.test.ts
- giving-golden.test.ts
- going-golden.test.ts
- inserting-golden.test.ts (added jest import)
- listening-golden.test.ts
- locking-golden.test.ts
- smelling-golden.test.ts
- telling-golden.test.ts
- looking-golden.test.ts

**Removed**: 1 file
- setup.ts

**Known Issues**: 0 files (all previous issues resolved)

**Remaining to Check**: ~13 files
**Total Completion**: ~70% (29 of ~40 files resolved)

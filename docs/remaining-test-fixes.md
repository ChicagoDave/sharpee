# Summary of Test Fixes Needed

## Issues Remaining:

1. **Location entity still showing as actor ID** - Need to ensure `getContainingRoom` works properly
2. **Tests using non-existent `world.getEntityByName`** - Replace with object from TestData return
3. **Platform actions failing with "No player set"** - Tests not setting up world properly
4. **Inserting action context.world undefined** - Context delegation issue

## Fixes to Apply:

### 1. Update all unlocking tests to use returned object
Replace pattern:
```typescript
const { world, player, room } = TestData.withObject('name', {...});
const obj = findEntityByName(world, 'name')!;
```

With:
```typescript
const { world, player, room, object: obj } = TestData.withObject('name', {...});
```

### 2. Fix searching test to use actual not-reachable scenario
Instead of non-existent `TraitType.NOT_REACHABLE`, create an entity inside a closed container.

### 3. Fix platform action tests
These tests need to use `setupBasicWorld()` instead of creating empty world.

### 4. Check why currentLocation is still returning player
The `getContainingRoom` might still be returning null in some cases.

# stdlib Test Fixing Examples

## 1. Test Pattern Update Examples

### Problem: Using non-existent `world.getEntityByName()`

#### ❌ BEFORE (Broken Pattern)
```typescript
test('should fail when target is not lockable', () => {
  const { world, player, room } = TestData.withObject('wooden box', {
    [TraitType.OPENABLE]: { 
      type: TraitType.OPENABLE,
      isOpen: false
    }
  });
  
  const box = world.getEntityByName('wooden box')!;  // This method doesn't exist!
  const context = createRealTestContext(unlockingAction, world,
    createCommand(IFActions.UNLOCKING, {
      entity: box
    })
  );
  
  // ... rest of test
});
```

#### ✅ AFTER (Fixed Pattern)
```typescript
test('should fail when target is not lockable', () => {
  const { world, player, room, object: box } = TestData.withObject('wooden box', {
    [TraitType.OPENABLE]: { 
      type: TraitType.OPENABLE,
      isOpen: false
    }
  });
  
  // No need to find the box - it's returned by TestData.withObject!
  const context = createRealTestContext(unlockingAction, world,
    createCommand(IFActions.UNLOCKING, {
      entity: box
    })
  );
  
  // ... rest of test
});
```

### Alternative: When entity is created separately

#### ❌ BEFORE
```typescript
const chest = world.getEntityByName('treasure chest')!;
```

#### ✅ AFTER
```typescript
const chest = findEntityByName(world, 'treasure chest')!;
// OR if you just created it:
const chest = world.createEntity('treasure chest', 'object');
// ... add traits ...
// Use chest directly - no need to find it!
```

## 2. Platform Action Test Setup Examples

### Problem: No player set in world model

#### ❌ BEFORE (Missing Setup)
```typescript
test('should emit platform save requested event', () => {
  const world = new WorldModel();
  const saveName = 'test-save';
  
  const context = createRealTestContext(savingAction, world,
    createCommand(IFActions.SAVING, { extras: { saveName } })
  );
  // Error: No player set in world model!
});
```

#### ✅ AFTER (Proper Setup)
```typescript
test('should emit platform save requested event', () => {
  const { world, player, room } = setupBasicWorld();
  const saveName = 'test-save';
  
  const context = createRealTestContext(savingAction, world,
    createCommand(IFActions.SAVING, { extras: { saveName } })
  );
  // Now works because player is set!
});
```

## 3. Trait Addition Examples

### Problem: Duplicate type property

#### ❌ BEFORE (Causes "Invalid trait" error)
```typescript
const item = world.createEntity('sword', 'object');
item.add({
  weight: 5,
  damage: 10
}); // Error: Invalid trait: must have a type property
```

#### ✅ AFTER (Correct trait addition)
```typescript
const item = world.createEntity('sword', 'object');
item.add({
  type: TraitType.IDENTITY,
  weight: 5
});
item.add({
  type: TraitType.WEAPON,  // Assuming this exists
  damage: 10
});
```

## 4. Non-Existent Trait Type Examples

### Problem: Using trait types that don't exist

#### ❌ BEFORE
```typescript
shelf.add({ type: TraitType.NOT_REACHABLE }); // This trait type doesn't exist!
```

#### ✅ AFTER (Create unreachable scenario properly)
```typescript
// Put item in a closed container to make it unreachable
const closedBox = world.createEntity('closed box', 'object');
closedBox.add({ type: TraitType.CONTAINER });
closedBox.add({ type: TraitType.OPENABLE, isOpen: false });
world.moveEntity(closedBox.id, room.id);

const shelf = world.createEntity('high shelf', 'object');
world.moveEntity(shelf.id, closedBox.id); // Now shelf is unreachable!
```

## 5. Context Delegation Examples

### Problem: Modified context losing properties

#### ❌ BEFORE (Might lose world property)
```typescript
const modifiedContext = {
  ...context,
  command: modifiedCommand,
  action: puttingAction
} as EnhancedActionContext;
```

#### ✅ AFTER (Ensures all properties preserved)
```typescript
// Create new context with same base context
const modifiedContext = new EnhancedActionContextImpl(
  context as any, // Access base context
  puttingAction,
  modifiedCommand
);

// OR use the helper method if available
const modifiedContext = context.createSubContext(puttingAction);
```

## 6. Location Fix Examples

### Problem: Location showing as actor ID instead of room ID

#### Debugging Steps
```typescript
// Add to setupBasicWorld to debug:
const moved = world.moveEntity(player.id, room.id);
console.log('Move result:', moved);
console.log('Player location after move:', world.getLocation(player.id));
console.log('Containing room:', world.getContainingRoom(player.id));

// In test context creation:
const currentLocation = world.getContainingRoom(player.id);
console.log('Current location for context:', currentLocation?.id || 'undefined');
```

#### Potential Fix
```typescript
// If getContainingRoom is failing, might need to check:
// 1. Is the room properly marked with ROOM trait?
// 2. Is the spatial index updated?
// 3. Is there a depth limit being hit?

// Temporary workaround if needed:
const currentLocation = world.getContainingRoom(player.id) || room;
// This ensures we have the room even if getContainingRoom fails
```

## Script Template for Bulk Updates

### Safe Test Pattern Update Script
```bash
#!/bin/bash
# Example script structure - DO NOT RUN WITHOUT TESTING

# 1. Backup first
cp -r tests/ tests.backup/

# 2. Find all occurrences
grep -r "world\.getEntityByName" tests/ > occurrences.txt

# 3. For each file, apply sed replacement
# This is complex and needs careful regex to handle all cases

# 4. Verify changes
npm run test:compile

# 5. Report
echo "Updated X occurrences in Y files"
```

### Key Patterns to Match
1. `const X = world.getEntityByName('Y')!;`
2. `const { world, player, room } = TestData.withObject('Y', ...`
3. Match X and Y to update to: `const { world, player, room, object: X } = TestData.withObject('Y', ...`

## Common Pitfalls to Avoid

1. **Don't assume all getEntityByName calls relate to TestData.withObject**
   - Some might be for entities created with world.createEntity
   - These need findEntityByName instead

2. **Don't break multiline patterns**
   - TestData.withObject often spans multiple lines
   - Script must handle this correctly

3. **Don't miss variable name differences**
   - Sometimes the variable name doesn't match the entity name
   - Need to preserve the original variable name

4. **Don't forget imports**
   - If adding findEntityByName, must add to imports

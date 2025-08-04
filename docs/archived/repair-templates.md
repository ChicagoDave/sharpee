# Test Repair Templates

## 1. Fix world.getEntityByName() Pattern

### Pattern A: When using TestData.withObject
```typescript
// ❌ BROKEN
const { world, player, room } = TestData.withObject('small rock');
const rock = world.getEntityByName('small rock')!;

// ✅ FIXED
const { world, player, room, object: rock } = TestData.withObject('small rock');
```

### Pattern B: When creating entity separately
```typescript
// ❌ BROKEN
const lantern = world.getEntityByName('brass lantern')!;

// ✅ FIXED
const lantern = findEntityByName(world, 'brass lantern')!;
```

### Pattern C: When entity was just created
```typescript
// ❌ BROKEN
const box = world.createEntity('wooden box', 'object');
// ... add traits ...
const foundBox = world.getEntityByName('wooden box')!;

// ✅ FIXED
const box = world.createEntity('wooden box', 'object');
// ... add traits ...
// Just use `box` directly - no need to find it!
```

## 2. Fix Platform Action Tests

### Pattern: Add proper world setup
```typescript
// ❌ BROKEN
test('should emit platform save requested event', () => {
  const world = new WorldModel();
  const saveName = 'test-save';
  
  const context = createRealTestContext(savingAction, world,
    createCommand(IFActions.SAVING, { extras: { saveName } })
  );

// ✅ FIXED
test('should emit platform save requested event', () => {
  const { world, player, room } = setupBasicWorld();
  const saveName = 'test-save';
  
  const context = createRealTestContext(savingAction, world,
    createCommand(IFActions.SAVING, { extras: { saveName } })
  );
```

## 3. Fix Registry Tests

### Pattern: Set up language provider
```typescript
// ❌ BROKEN
const registry = new StandardActionRegistry();
registry.register(takingAction);
expect(registry.findByPattern('take')).toContainEqual(takingAction);

// ✅ FIXED
const registry = new StandardActionRegistry();
const mockLanguageProvider = {
  getActionPatterns: (actionId: string) => {
    const patterns: Record<string, string[]> = {
      'TAKING': ['take', 'get', 'grab', 'pick up'],
      'EXAMINING': ['examine', 'x', 'look at', 'inspect'],
      // ... add other actions
    };
    return patterns[actionId] || [];
  }
};
registry.setLanguageProvider(mockLanguageProvider);
registry.register(takingAction);
expect(registry.findByPattern('take')).toContainEqual(takingAction);
```

## 4. Fix Event Expectation Mismatches

### Pattern A: Wrong message ID format
```typescript
// ❌ BROKEN
expect(event.data).toMatchObject({
  messageId: expect.stringContaining('not_reachable')
});

// ✅ FIXED
expect(event.data).toMatchObject({
  messageId: 'if.action.searching.not_visible' // Use exact message ID
});
```

### Pattern B: Wrong event data structure
```typescript
// ❌ BROKEN
expect(event.data).toMatchObject({
  item: "o01",
  itemName: "wooden box"
});

// ✅ FIXED
expect(event.data).toMatchObject({
  item: "wooden box" // Just the name, not ID and name
});
```

## 5. Quick Fix Scripts

### Script to fix world.getEntityByName in a file
```bash
# For Pattern A (TestData.withObject)
sed -i 's/const { world, player, room } = TestData\.withObject(\(.*\));.*world\.getEntityByName(\1)/const { world, player, room, object } = TestData.withObject(\1)/g' FILE.ts

# For Pattern B (findEntityByName)
sed -i 's/world\.getEntityByName(/findEntityByName(world, /g' FILE.ts

# Add import if needed
grep -q "findEntityByName" FILE.ts || sed -i '/import.*test-utils/s/}/&, findEntityByName/' FILE.ts
```

### Script to add setupBasicWorld to platform tests
```bash
# Replace WorldModel creation with setupBasicWorld
sed -i 's/const world = new WorldModel();/const { world, player, room } = setupBasicWorld();/g' FILE.ts
```

## 6. Test Update Checklist

When updating a test file:

- [ ] Replace all `world.getEntityByName()` calls
- [ ] Add `findEntityByName` to imports if used
- [ ] Check if using `setupBasicWorld()` for platform actions
- [ ] Update event expectations to match actual output
- [ ] Verify command creation is correct
- [ ] Run the test to verify it passes
- [ ] Check for any console errors or warnings

## 7. Common Event Data Fixes

### Inventory Event
```typescript
// Event structure should be:
{
  actorId: player.id,
  locationId: room.id,
  isEmpty: boolean,
  items: Array<{ id, name, worn?, weight? }>,
  totalWeight?: number,
  maxWeight?: number,
  brief?: boolean
}
```

### Action Events
```typescript
// Most action events include:
{
  messageId: string,  // Full message ID like 'if.action.taking.taken'
  params: object,     // Parameters for the message
  // Action-specific fields
}
```

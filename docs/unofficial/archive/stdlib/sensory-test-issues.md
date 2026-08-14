# Sensory Extension Test Issues

## Current Problems

### 1. Door Setup is Incorrect

The tests create doors but don't properly connect them to rooms:

```typescript
// WRONG - Current test code:
const door = world.createEntity('door', 'door');
door.add({ type: TraitType.DOOR });
door.add({ type: TraitType.OPENABLE, isOpen: true });
world.moveEntity(door.id, room.id);  // Just placing door in room

// RIGHT - Should be:
const door = world.createEntity('door', 'door');
door.add({ 
  type: TraitType.DOOR,
  room1: room.id,
  room2: hallway.id
});
door.add({ type: TraitType.OPENABLE, isOpen: true });
```

### 2. Room Connection Missing

The rooms aren't connected with exits:

```typescript
// MISSING - Need to add:
room.add({ 
  type: TraitType.EXIT,
  direction: 'north',
  destination: hallway.id
});
hallway.add({
  type: TraitType.EXIT,
  direction: 'south',
  destination: room.id
});
```

### 3. Test Expectations May Be Wrong

- Test expects to hear through doors even without proper room connections
- Test expects `getAudible()` to return 4 entities including ones in unconnected rooms

## Design Questions

1. **Hearing Through Doors**: Should we hear through closed doors? The test expects yes.
2. **Hearing Range**: Should hearing work only in connected rooms or globally?
3. **Smell Through Doors**: Should smell travel through open doors? Closed doors?

## Recommendation

These tests are testing implementation details rather than behavior. We should:

1. **Option A**: Fix the tests to use proper door/room setup
2. **Option B**: Replace with behavior-focused tests like our container visibility test

### Proposed Behavior Tests

Instead of testing `canHear()` directly, test scenarios:

```typescript
test('player hears radio in same room', () => {
  // Setup radio making noise
  // Validate that "listen" command finds it
});

test('player hears conversation through open door', () => {
  // Setup NPCs talking in next room
  // Validate hearing through open door
  // Close door and validate muffled hearing
});

test('player smells bread baking in kitchen', () => {
  // Setup bread with scent
  // Validate smell command works
});
```

## Decision Needed

Should we:
1. Fix the existing unit tests with proper setup?
2. Replace with behavior-driven integration tests?
3. Both - fix critical unit tests, add behavior tests?
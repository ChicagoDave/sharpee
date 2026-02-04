# Sensory Test Analysis

## Current Test Scenarios

### Hearing Tests
1. ✅ **Hear in same room** - Valid scenario
2. ❌ **Hear through open doors** - Good scenario, bad setup (missing room connections)
3. ❌ **Hear through closed doors** - Good scenario, bad setup
4. ✅ **Can't hear in unconnected rooms** - Valid scenario
5. ❌ **Get all audible entities** - Expects to hear mouse in unconnected basement (wrong)

### Smell Tests
1. ✅ **Smell food in same room** - Valid (edible items have scent)
2. ✅ **Smell actors in same room** - Valid (actors have scent)
3. ❌ **Smell through open doors** - Good scenario, bad setup
4. ✅ **Can't smell through closed doors** - Valid scenario
5. ✅ **Can't smell non-scented items** - Valid scenario

### Darkness Tests
1. ❌ **Can't see in dark without light** - Valid scenario, questionable implementation
2. ✅ **Can see in dark with light source** - Valid scenario
3. ✅ **Actor providing light** - Valid scenario
4. ✅ **Can see in lit rooms** - Valid scenario
5. ❌ **Can't see in dark rooms** - Duplicate of test 1

### Scope Priority
1. ❌ **Complex mocking test** - Too implementation-focused

## Problems

1. **Door Setup**: Doors need `room1` and `room2` properties
2. **Room Connections**: Rooms need EXIT traits to be connected
3. **Darkness Implementation**: Using custom properties might not be the right approach
4. **Test Expectations**: Some tests expect wrong behavior (hearing in unconnected rooms)

## Proposed Fixes

### Pattern 1: Proper Room Connection
```typescript
// Connect two rooms with a door
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

const door = world.createEntity('door', 'door');
door.add({ 
  type: TraitType.DOOR,
  room1: room.id,
  room2: hallway.id
});
door.add({ type: TraitType.OPENABLE, isOpen: true });
```

### Pattern 2: Darkness (needs design decision)
```typescript
// Option A: Custom property (current)
room.add({
  type: TraitType.IDENTITY,
  customProperties: { isDark: true }
});

// Option B: New DARK trait?
room.add({ type: TraitType.DARK });

// Option C: LIGHTING trait with levels?
room.add({ 
  type: TraitType.LIGHTING,
  level: 0  // 0 = dark
});
```

## Recommended Approach

1. **Fix existing tests** with proper setup
2. **Remove** overly complex/mocking tests
3. **Add** more realistic scenario tests

## Realistic Scenarios to Test

### Hearing
- Radio playing in same room
- Conversation through open door
- Muffled sounds through closed door
- Loud alarm heard from far away
- Can't hear whisper in next room

### Smell
- Fresh bread in kitchen
- Flowers in garden
- Smoke from fireplace
- Can't smell through airtight container
- Strong perfume lingers after person leaves

### Darkness
- Stumbling in dark cave
- Torch illuminates surroundings
- Moonlight through window
- Glowing mushrooms provide dim light
- Can still hear/smell in darkness
# Scope-Dependent Tests

## Overview
These tests are currently skipped because they depend on scope logic that hasn't been implemented yet. Once the scope system is in place, these tests should be re-enabled.

## What is Scope Logic?
Scope logic determines:
- What the player can see/interact with based on their immediate container
- How actions resolve when the player is inside vehicles or other containers
- The difference between location (room) and immediate context (container/vehicle)

## Skipped Tests

### 1. Entering Action
- **Test**: "should fail when already inside target"
- **File**: `/packages/stdlib/tests/unit/actions/entering-golden.test.ts`
- **Issue**: `world.getLocation()` returns undefined for entities inside non-room containers
- **Needs**: Proper tracking of immediate container vs room location

### 2. Opening Action
- **Test**: "should reveal contents when opening container"
- **File**: `/packages/stdlib/tests/unit/actions/opening-golden.test.ts`
- **Issue**: `world.getContents()` returns empty array for closed containers
- **Needs**: Way to check what's inside closed containers for opening messages

## Known Issues Without Scope Logic

### 1. Vehicle/Container Context
- Players inside vehicles don't have proper location tracking
- `context.currentLocation` isn't properly set without scope logic
- Actions can't distinguish between room location and immediate container

### 2. Visibility and Reach
- Can't properly determine what's visible from inside a vehicle
- Reach calculations don't account for container boundaries
- Scope transitions (entering/exiting) aren't properly handled

## Design Decisions
- Vehicles are NOT rooms - they're objects that create a scope context
- Rooms = fixed locations in the game world
- Vehicles/Containers = movable objects that define interaction scope
- The scope system will handle what you can see/reach from your current context

## Position-Based Reachability Issues

### Overview
The test utilities include logic for position-based reachability (items with y > 3 are considered out of reach), but this is not working correctly in tests.

### Affected Tests
- **Pushing Action**: "should fail when target is not reachable"
  - File: `/packages/stdlib/tests/unit/actions/pushing-golden.test.ts`
  - Issue: `canReach()` returns true even when entity has position.y = 5
  
- **Switching Off Action**: "should fail when target is not reachable"  
  - File: `/packages/stdlib/tests/unit/actions/switching_off-golden.test.ts`
  - Issue: Same as above

### Technical Details
The test utilities' `canReach` function checks:
```javascript
if (entityIdentity && (entityIdentity as any).position) {
  const pos = (entityIdentity as any).position;
  // Items with y > 3 are considered out of reach
  if (pos.y && pos.y > 3) {
    return false;
  }
}
```

But entities with IDENTITY trait containing position data are not being correctly evaluated.

### 3. Showing Action
- **File**: `/packages/stdlib/tests/unit/actions/showing-golden.test.ts`
- **Issue**: All tests depend on scope logic for entity resolution and visibility checks
- **Skipped Tests**:
  - "should fail when not carrying item" - Needs scope to resolve entities
  - "should succeed when showing worn item" - Needs scope to resolve entities
  - "should fail when viewer not visible" - Uses context.canSee() which depends on scope
  - "should fail when viewer too far away" - Uses scope distance checking
  - "should fail when viewer is not an actor" - Needs scope to resolve entities
  - "should fail when showing to self" - Needs scope to resolve entities
  - All viewer reaction tests - Need scope to resolve entities
  - All successful showing tests - Need scope to resolve entities
  - All edge case tests - Need scope to resolve entities
  - All pattern example tests - Need scope to resolve entities

### 4. Attacking Action
- **File**: `/packages/stdlib/tests/unit/actions/attacking-golden.test.ts`
- **Issue**: Uses context.canSee() and context.canReach() which depend on scope logic
- **Skipped Tests**:
  - "should fail when target is not visible" - Uses context.canSee()
  - "should fail when target is not reachable" - Uses context.canReach()
  - "should require holding weapon" - Needs scope to resolve entities
  - "should perform basic unarmed attack" - Needs scope to resolve entities
  - "should attack with held weapon" - Needs scope to resolve entities
  - "should use hit_with for hit verb" - Needs scope to resolve entities
  - "should handle punch verb" - Needs scope to resolve entities
  - "should handle kick verb" - Needs scope to resolve entities
  - "should prevent attacking indestructible scenery" - Needs scope to resolve entities
  - "should break fragile glass objects" - Needs scope to resolve entities
  - "should use break verb with fragile objects" - Needs scope to resolve entities
  - "should handle fragile objects with custom break messages" - Needs scope to resolve entities
  - "should handle fragile objects that trigger events when broken" - Needs scope to resolve entities
  - "should reject breaking non-fragile/non-breakable objects" - Needs scope to resolve entities
  - "should require specific tool for breakable objects" - Needs scope to resolve entities
  - "should handle partial breaking with multiple hits" - Needs scope to resolve entities
  - "should break objects after enough hits" - Needs scope to resolve entities
  - "should attack non-fragile objects without breaking" - Needs scope to resolve entities
  - "should include proper entities in all events" - Needs scope to resolve entities

### 5. Throwing Action
- **File**: `/packages/stdlib/tests/unit/actions/throwing-golden.test.ts`
- **Issue**: Uses context.canSee() and location tracking, plus overly complex fragility logic
- **Skipped Tests**:
  - "should fail when target is not visible" - Uses context.canSee()
  - "should fail when target is in different room" - Uses location tracking
  - "should drop non-fragile item gently" - Needs scope logic
  - "should handle fragile items gently thrown" - Fragility logic needs redesign (too complex)
  - "should break fragile item when dropped carelessly" - Fragility logic needs redesign
  - "should hit stationary target" - Needs scope logic
  - "should miss moving actor" - Needs scope logic
  - "should allow NPC to catch thrown item" - Needs scope logic
  - "should land on supporter when hit" - Needs scope logic
  - "should land in open container" - Needs scope logic
  - "should bounce off closed container" - Needs scope logic
  - "should break fragile item on impact" - Fragility logic needs redesign
  - "should anger hit NPC" - Needs scope logic
  - "should throw through exit to next room" - Needs scope logic
  - "should break fragile item thrown in direction" - Fragility logic needs redesign
  - "should allow throwing light objects far" - Needs scope logic
  - "should detect various fragile materials" - Fragility logic needs redesign
  - "should include proper entities in all events" - Needs scope logic
- **Design Note**: The throwing action currently has overly complex fragility logic with random chances and "gentle" vs "hard" throwing. This should be simplified - it's "author stuff" that game developers should implement if they want that level of detail.

## Next Steps
1. Design scope logic system
2. Implement scope resolution for action contexts
3. Update action context to properly track immediate container
4. Fix position-based reachability in test utilities
5. Re-enable and fix skipped tests
# Foundation StdLib Work Checklist

This checklist covers the implementation of core IF systems based on the design documents. Work should be completed in order to maintain proper dependencies.

## Phase 1: Core World Model Traits

### Identity Trait Enhancement
- [x] Add physical properties to IdentityTrait
  - [x] weight?: number (in kg)
  - [x] volume?: number (in liters)  
  - [x] size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge'
- [x] Update IdentityBehavior with weight/volume getters
- [ ] Add tests for physical properties

### Container Trait
- [x] Create ContainerTrait with capacity constraints
  - [x] maxWeight, maxVolume, maxItems
  - [x] isTransparent flag
  - [x] enterable flag
  - [x] allowedTypes/excludedTypes arrays
- [x] Create ContainerBehavior with static methods
  - [x] canAccept(container, item, world)
  - [x] checkCapacity(container, item, world)
  - [x] getTotalWeight(container, world)
  - [x] getTotalVolume(container, world)
  - [x] getRemainingCapacity(container, world)
- [ ] Add comprehensive tests

### Supporter Trait
- [x] Create SupporterTrait with capacity constraints
  - [x] maxWeight, maxItems
  - [x] enterable flag
  - [x] allowedTypes/excludedTypes arrays
- [x] Create SupporterBehavior with static methods
  - [x] canAccept(supporter, item, world)
  - [x] checkCapacity(supporter, item, world)
  - [x] getTotalWeight(supporter, world)
- [ ] Add comprehensive tests

### Room Trait Enhancement
- [x] Add exits map to RoomTrait
  ```typescript
  exits: {
    [direction: string]: {
      destination: string;
      via?: string;
    }
  }
  ```
- [x] Add lighting properties
  - [x] baseLight?: number (0-10)
  - [x] isOutdoors?: boolean
  - [x] isUnderground?: boolean
- [x] Update RoomBehavior with exit methods
  - [x] getExit(room, direction)
  - [x] setExit(room, direction, destination, via?)
  - [x] removeExit(room, direction)
  - [x] getAllExits(room)
- [x] Add lighting methods to RoomBehavior
  - [x] getTotalLight(room, world)
  - [x] isDark(room, world)
  - [x] getLightFromSources(room, world)
  - [x] isLightBlocked(source, world)
- [ ] Add tests for exits and lighting

### Door Trait
- [x] Create DoorTrait
  - [x] room1: string
  - [x] room2: string
  - [x] bidirectional: boolean
- [x] Create DoorBehavior with static methods
  - [x] getRooms(door)
  - [x] getOtherRoom(door, currentRoom)
  - [x] isBidirectional(door)
  - [x] connects(door, room1, room2)
- [ ] Add tests for door functionality

### LightSource Trait
- [x] Create LightSourceTrait
  - [x] brightness: number (1-10)
  - [x] isLit: boolean
  - [x] fuelRemaining?: number
- [x] Create LightSourceBehavior
  - [x] light(source)
  - [x] extinguish(source)
  - [x] isLit(source)
  - [x] getBrightness(source)
  - [x] consumeFuel(source, amount)
- [ ] Add tests

## Phase 2: World Model Interface Implementation ✅

### IWorldModel Interface
- [x] Define IWorldModel interface with all methods from design
- [x] Define IWorldState interface
- [x] Define IWorldConfig interface

### WorldModel Implementation
- [x] Create WorldModel class implementing IWorldModel
- [x] Implement entity management methods
  - [x] createEntity with IFEntity return
  - [x] getEntity, hasEntity, removeEntity
  - [x] getAllEntities
- [x] Implement spatial management
  - [x] getLocation, getContents
  - [x] moveEntity with validation
  - [x] canMoveEntity
  - [x] getContainingRoom
  - [x] getAllContents with options
- [x] Implement world state management
  - [x] getState, setState
  - [x] getStateValue, setStateValue
- [x] Implement query operations
  - [x] findByTrait, findByType, findWhere
  - [x] getVisible, getInScope, canSee
- [x] Implement relationship queries
  - [x] getRelated, areRelated
  - [x] addRelationship, removeRelationship
- [x] Implement utility methods
  - [x] getTotalWeight
  - [x] wouldCreateLoop
  - [x] findPath (basic implementation)
  - [x] getPlayer, setPlayer
- [x] Implement persistence
  - [x] toJSON, loadJSON, clear

### Spatial Index
- [x] Create SpatialIndex class for performance
- [x] Track parent-child relationships efficiently
- [x] Support fast containment queries
- [x] Integrate with WorldModel

### Visibility System
- [x] Create VisibilityBehavior in world-model
  - [x] canSee(observer, target, world)
  - [x] getVisible(observer, world)
  - [x] Consider darkness, containers, transparency
- [ ] Add tests for all visibility scenarios (on hold)

## Phase 3: StdLib Updates ✅

### Service Updates
- [x] Update InventoryService to use IWorldModel
  - [x] Check container/supporter capacity
  - [x] Validate moves with canAccept
  - [x] Use world.moveEntity for transfers
- [x] Update or create VisibilityService
  - [x] Use world model visibility methods
  - [x] Handle darkness and light sources
- [x] Update or create ScopeService
  - [x] Determine what player can reference
  - [x] Consider visibility and previous knowledge

### Action Updates
- [x] Update GoingAction
  - [x] Use RoomBehavior.getExit
  - [x] Check for doors and their state
  - [x] Handle one-way passages
  - [x] Check darkness before moving
- [x] Update TakingAction
  - [x] Check if item is takeable (not scenery)
  - [x] Validate container capacity
  - [x] Use world.moveEntity
- [x] Create PuttingAction
  - [x] Distinguish PUT IN vs PUT ON
  - [x] Check container/supporter capacity
  - [x] Validate type restrictions
- [x] Update OpeningAction
  - [x] Update visibility when opening containers
  - [x] Handle doors between rooms
- [x] Update ClosingAction
  - [x] Update visibility when closing
  - [x] Handle transparent containers
- [x] Create LockingAction
  - [x] Work with doors and containers
- [x] Update UnlockingAction (already existed)
  - [x] Work with doors and containers
- [x] Create LightAction (LIGHT/EXTINGUISH)
  - [x] Handle light sources
  - [x] Update room lighting

### Parser Updates
- [x] Update scope resolution to use IWorldModel
- [x] Handle visibility in object resolution
- [x] Support "PUT X IN Y" vs "PUT X ON Y"

## Phase 4: Testing & Integration

### Integration Tests
- [ ] Test complete scenarios from designs
  - [ ] Kitchen-Living Room door scenario
  - [ ] Airlock with safety rules
  - [ ] Dark cave with lamp
  - [ ] Nested containers with weight limits
  - [ ] Bookshelf with multiple shelves
  - [ ] Enterable bathtub
- [ ] Test edge cases
  - [ ] Containment loops
  - [ ] Capacity violations
  - [ ] Light in closed containers
  - [ ] One-way doors

### Migration ✅
- [x] Update all stdlib code to use world-model package
- [x] Remove temporary interfaces (none found)
- [x] Update all imports
- [x] Ensure no stdlib imports in world-model

### Documentation
- [ ] Document new trait properties
- [ ] Document behavior methods
- [ ] Update action documentation
- [ ] Create usage examples

## Phase 5: Cleanup & Verification

### Remove Non-Core Features
- [ ] Move any domain-specific traits out of world-model
- [ ] Ensure only universal IF concepts remain in core
- [ ] Plan extension packages for removed features

### Performance Verification
- [ ] Profile spatial queries
- [ ] Optimize visibility calculations
- [ ] Cache frequently accessed data

### Final Build Verification
- [ ] All packages compile without errors
- [ ] No circular dependencies
- [ ] All tests pass
- [ ] Example game works correctly

## Success Criteria

- [ ] All core IF scenarios from designs work correctly
- [ ] Clean separation between layers maintained
- [ ] No hardcoded strings in actions/behaviors
- [ ] All behaviors use static methods
- [ ] Type-safe IFEntity with trait methods
- [ ] Efficient spatial queries
- [ ] Comprehensive test coverage

## Notes

- Complete phases in order to maintain dependencies
- Run tests after each major component
- Keep commits focused on single components
- Update the checklist as work progresses

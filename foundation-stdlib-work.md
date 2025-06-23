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

## Phase 2: World Model Interface Implementation

### IWorldModel Interface
- [ ] Define IWorldModel interface with all methods from design
- [ ] Define IWorldState interface
- [ ] Define IWorldConfig interface

### WorldModel Implementation
- [ ] Create WorldModel class implementing IWorldModel
- [ ] Implement entity management methods
  - [ ] createEntity with IFEntity return
  - [ ] getEntity, hasEntity, removeEntity
  - [ ] getAllEntities
- [ ] Implement spatial management
  - [ ] getLocation, getContents
  - [ ] moveEntity with validation
  - [ ] canMoveEntity
  - [ ] getContainingRoom
  - [ ] getAllContents with options
- [ ] Implement world state management
  - [ ] getState, setState
  - [ ] getStateValue, setStateValue
- [ ] Implement query operations
  - [ ] findByTrait, findByType, findWhere
  - [ ] getVisible, getInScope, canSee
- [ ] Implement relationship queries
  - [ ] getRelated, areRelated
  - [ ] addRelationship, removeRelationship
- [ ] Implement utility methods
  - [ ] getTotalWeight
  - [ ] wouldCreateLoop
  - [ ] findPath (basic implementation)
  - [ ] getPlayer, setPlayer
- [ ] Implement persistence
  - [ ] toJSON, loadJSON, clear

### Spatial Index
- [ ] Create SpatialIndex class for performance
- [ ] Track parent-child relationships efficiently
- [ ] Support fast containment queries
- [ ] Integrate with WorldModel

### Visibility System
- [ ] Create VisibilityBehavior in world-model
  - [ ] canSee(observer, target, world)
  - [ ] getVisible(observer, world)
  - [ ] Consider darkness, containers, transparency
- [ ] Add tests for all visibility scenarios

## Phase 3: StdLib Updates

### Service Updates
- [ ] Update InventoryService to use IWorldModel
  - [ ] Check container/supporter capacity
  - [ ] Validate moves with canAccept
  - [ ] Use world.moveEntity for transfers
- [ ] Update or create VisibilityService
  - [ ] Use world model visibility methods
  - [ ] Handle darkness and light sources
- [ ] Update or create ScopeService
  - [ ] Determine what player can reference
  - [ ] Consider visibility and previous knowledge

### Action Updates
- [ ] Update GoingAction
  - [ ] Use RoomBehavior.getExit
  - [ ] Check for doors and their state
  - [ ] Handle one-way passages
  - [ ] Check darkness before moving
- [ ] Update TakingAction
  - [ ] Check if item is takeable (not scenery)
  - [ ] Validate container capacity
  - [ ] Use world.moveEntity
- [ ] Update PuttingAction
  - [ ] Distinguish PUT IN vs PUT ON
  - [ ] Check container/supporter capacity
  - [ ] Validate type restrictions
- [ ] Update OpeningAction
  - [ ] Update visibility when opening containers
  - [ ] Handle doors between rooms
- [ ] Update ClosingAction
  - [ ] Update visibility when closing
  - [ ] Handle transparent containers
- [ ] Update LockingAction
  - [ ] Work with doors and containers
- [ ] Update UnlockingAction
  - [ ] Work with doors and containers
- [ ] Create LightAction (LIGHT/EXTINGUISH)
  - [ ] Handle light sources
  - [ ] Update room lighting

### Parser Updates
- [ ] Update scope resolution to use IWorldModel
- [ ] Handle visibility in object resolution
- [ ] Support "PUT X IN Y" vs "PUT X ON Y"

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

### Migration
- [ ] Update all stdlib code to use world-model package
- [ ] Remove temporary interfaces
- [ ] Update all imports
- [ ] Ensure no stdlib imports in world-model

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

# World Model Phase 2 Checklist - UPDATED

## Phase 2: World Model Interface Implementation

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

### Integration Tasks
- [x] Update IFEntity to work with new interfaces (added weight getter and hasTrait alias)
- [ ] Ensure all existing behaviors use IWorldModel interface
- [ ] Update action executors to use WorldModel instance
- [ ] Create factory methods for world creation

### Next Steps
- [ ] Implement missing core traits (DoorTrait, ActorTrait)
- [ ] Update actions that depend on world model
- [ ] Create basic test story to verify functionality
- [ ] Begin extension system design

## Completed Items Summary
- Created `/packages/world-model/src/world/` directory
- Implemented `IWorldModel.ts` with all interfaces
- Implemented `WorldModel.ts` with full functionality
- Implemented `SpatialIndex.ts` for efficient spatial queries
- Implemented `VisibilityBehavior.ts` with darkness/container logic
- Created `index.ts` to export all world model components
- Updated main package index to export world module
- Added `weight` getter and `hasTrait` alias to IFEntity

## What's Next
The core world model implementation is now complete. The next priority items are:
1. Update existing behaviors to use IWorldModel interface instead of direct entity access
2. Update action executors in stdlib to use WorldModel instance
3. Implement DoorTrait and ActorTrait (currently blocking going/opening actions)

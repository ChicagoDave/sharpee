# Implementation Checklist for ADR-014: Unrestricted World Model Access

## Overview
This checklist tracks the implementation of separate WorldModel and AuthorModel interfaces to solve the unrestricted world model access problem discovered during unit testing.

## Core Implementation Tasks

### 1. Create AuthorModel Class
- [x] Create `AuthorModel.ts` in `/packages/world-model/src/world/`
- [x] Share SpatialIndex and EntityStore with WorldModel
- [x] Implement constructor that accepts shared data stores
- [x] No event emission in any methods
- [x] No rule validation in any methods

### 2. Basic AuthorModel Methods
- [x] `moveEntity(entityId: string, targetId: string | null, recordEvent?: boolean): void`
- [x] `createEntity(name: string, type: string): IFEntity`
- [x] `removeEntity(entityId: string): void`
- [x] `setEntityProperty(entityId: string, property: string, value: any): void`
- [x] `addTrait(entityId: string, trait: Trait): void`
- [x] `removeTrait(entityId: string, traitType: TraitType): void`

### 3. Author Convenience Methods
- [x] `populate(containerId: string, entityIds: string[]): void`
- [x] `connect(room1Id: string, room2Id: string, direction: string): void`
- [x] `fillContainer(containerId: string, itemSpecs: ItemSpec[]): void`
- [x] `placeActor(actorId: string, locationId: string): void`
- [x] `setupContainer(containerId: string, isOpen?: boolean, isLocked?: boolean): void`

### 4. Event Recording Support (Boolean Flag)
- [x] Add optional `recordEvent` parameter to all modification methods
- [x] When `recordEvent` is true, emit events with `author:` prefix
- [x] Event structure: `author:entity:moved`, `author:entity:created`, etc.
- [x] No event emission when `recordEvent` is false (default)
- [x] Ensure author events are distinguishable from gameplay events

### 5. Shared Data Store Access
- [x] Create `DataStore` interface/type for shared state
- [x] Add `getDataStore()` method on WorldModel
- [x] Implement `getDataStore()` method on AuthorModel
- [x] Ensure both models can operate on same data instance
- [ ] Add factory method to create both models from same store

### 6. Update Existing Tests
- [x] Fix `container-hierarchies.test.ts` medicine cabinet test
- [ ] Update test helpers to use AuthorModel for setup
- [x] Remove workarounds for closed container population
- [ ] Ensure all existing tests still pass
- [x] Add tests specifically for AuthorModel behavior

### 7. New AuthorModel Tests
- [x] Test moving entities into closed containers
- [x] Test moving entities into locked containers
- [x] Test bypassing capacity limits
- [x] Test no event emission by default
- [x] Test event emission with `recordEvent: true`
- [x] Test author events have correct structure
- [x] Test shared state between AuthorModel and WorldModel

### 8. Module Exports and API
- [x] Update main index.ts to export AuthorModel
- [ ] Consider separate entry points: 
  - `@sharpee/world-model` (exports WorldModel)
  - `@sharpee/world-model/author` (exports AuthorModel)
- [ ] Update package.json if using separate entry points
- [x] Ensure TypeScript definitions are properly exported

### 9. Documentation
- [x] Add JSDoc comments to all AuthorModel methods
- [x] Create examples showing WorldModel vs AuthorModel usage
- [x] Document when to use which model
- [ ] Add migration guide for existing code
- [ ] Update README with new dual-model architecture

### 10. Integration Testing
- [ ] Create integration test with complex world setup using AuthorModel
- [ ] Test save/load scenarios using AuthorModel for restoration
- [ ] Test story file patterns using AuthorModel
- [ ] Verify no performance regression
- [ ] Test event filtering (game vs author events)

## Future Enhancements (Not Part of Initial Implementation)
- [ ] Rich metadata support (see ADR-016)
- [ ] Bulk operations optimization
- [ ] Transaction support for atomic updates
- [ ] Validation mode for development

## Acceptance Criteria
- [ ] Can populate closed containers without opening them first
- [ ] Can place items in locked containers without unlocking
- [ ] No gameplay events generated during world construction
- [ ] Optional author events can be recorded with `recordEvent` flag
- [ ] Existing WorldModel behavior unchanged
- [ ] All existing tests pass
- [ ] Clear separation between setup and gameplay code

## Notes
- Start with minimal implementation and add convenience methods as needed
- Focus on solving the immediate problem (closed container population)
- Keep the API surface small initially
- Ensure backward compatibility with existing WorldModel usage

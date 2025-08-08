# Action-Trait Migration Checklist

## Overview
Complete migration of the action system from attribute-based to trait-native design.

## Phase 1: Core Infrastructure ⏳

### 1.1 Define New Interfaces
- [x] Create `ActionContext` interface in `/actions/types/action-context.ts`
  - [x] Include `world: WorldModelService`
  - [x] Include `player: IFEntity`
  - [x] Include `currentLocation: IFEntity`
  - [x] Include `scope: ScopeService`
  - [x] Include `language: LanguageProvider`
  - [x] Add helper methods: `canSee()`, `canReach()`, `canTake()`
  - [x] Add trait helpers: `getName()`, `getDescription()`

- [x] Update `ActionDefinition` interface in `/actions/types/index.ts`
  - [x] Change `GameContext` to `ActionContext` in all signatures
  - [x] Update validate phase signature
  - [x] Update execute phase signature
  - [x] Update undo phase signature (if present)

### 1.2 Create Context Implementation
- [x] Create `ActionContextImpl` class in `/actions/action-context.ts`
  - [x] Implement all interface methods
  - [x] Add constructor that takes `WorldModelService`
  - [x] Implement visibility checks using `ScopeService`
  - [x] Implement reachability checks
  - [x] Implement trait-aware helpers

### 1.3 Create Validation Helpers
- [x] Create `/actions/validation.ts` with `ActionValidator` class
  - [x] `requiresPortable(entity): true | string`
  - [x] `requiresOpenable(entity): true | string`
  - [x] `requiresContainer(entity): true | string`
  - [x] `requiresLockable(entity): true | string`
  - [x] `requiresSwitchable(entity): true | string`
  - [x] `requiresWearable(entity): true | string`
  - [x] `requiresEdible(entity): true | string`
  - [x] `isOpen(entity): boolean`
  - [x] `isLocked(entity): boolean`
  - [x] `isWorn(entity): boolean`
  - [x] `isLit(entity): boolean`

### 1.4 Update Imports
- [x] Remove imports of `GameContext` from all action files
- [ ] Remove imports of `IFAttributes` constants
- [ ] Remove imports of attribute-based types
- [ ] Add imports for trait types and new interfaces

## Phase 2: Action Migration 📝

### 2.1 Observation Actions (Simple - Start Here)
- [x] **examining.ts**
  - [x] Update to use `ActionContext`
  - [x] Use `context.getName()` instead of `attributes.name`
  - [x] Check traits directly (e.g., `entity.has(TraitType.READABLE)`)
  - [x] Access trait data properly (e.g., `entity.get<ReadableTrait>()`)
  - [x] Include trait information in events
  - [x] Test with trait-based entities

- [ ] **looking.ts** (if separate from examining)
  - [ ] Similar updates as examining
  - [ ] Handle room descriptions via traits
  - [ ] List contents using trait checks

### 2.2 Basic Manipulation Actions
- [x] **taking.ts**
  - [x] Use `requiresPortable()` validation
  - [x] Check `FIXED` trait as exclusion
  - [x] Update `PORTABLE` trait data after taking
  - [x] Handle `WORN` items specially
  - [x] Check container capacity via traits

- [x] **dropping.ts**
  - [x] Validate item is held (via location)
  - [x] Check for `WORN` status
  - [x] Update `PORTABLE` trait data
  - [x] Handle floor/supporter placement

### 2.3 Container Actions
- [x] **opening.ts**
  - [x] Use `requiresOpenable()` validation
  - [x] Check `LOCKABLE` trait for locked status
  - [x] Update `OPENABLE` trait data
  - [x] Handle container contents reveal
  - [x] Support door opening

- [x] **closing.ts**
  - [x] Mirror of opening logic
  - [x] Update `OPENABLE` trait data
  - [x] Handle automatic locking if applicable

- [x] **putting.ts**
  - [x] Use `requiresContainer()` validation
  - [x] Check container vs supporter traits
  - [x] Validate capacity limits
  - [x] Handle open/closed containers
  - [x] Update location relationships

### 2.4 Locking Actions
- [x] **locking.ts**
  - [x] Use `requiresLockable()` validation
  - [x] Check for required key
  - [x] Update `LOCKABLE` trait data
  - [x] Require closed state first

- [x] **unlocking.ts**
  - [x] Mirror of locking logic
  - [x] Validate key ownership
  - [x] Update `LOCKABLE` trait data

### 2.5 Device Actions
- [x] **switching-on.ts**
  - [x] Use `requiresSwitchable()` validation
  - [x] Update `SWITCHABLE` trait data
  - [x] Handle `LIGHT_SOURCE` trait if present
  - [x] Trigger device-specific behaviors

- [x] **switching-off.ts**
  - [x] Mirror of switching-on logic
  - [x] Update trait states
  - [x] Handle side effects

### 2.6 Movement Actions
- [x] **going.ts**
  - [x] Find exits using trait-based search
  - [x] Check `DOOR` traits for blockage
  - [x] Validate door open/locked state
  - [x] Update player location
  - [x] Handle enter/exit scripts

### 2.7 Complex Actions
- [x] **giving.ts**
  - [x] Validate recipient is `NPC` or `PLAYER`
  - [x] Check recipient capacity
  - [x] Handle NPC acceptance logic
  - [x] Update ownership

- [x] **using.ts**
  - [x] Check for `USABLE` trait
  - [x] Execute trait-defined behaviors
  - [x] Handle tool/target combinations

### 2.8 Conversation Actions
- [x] **talking.ts**
  - [x] Require `NPC` trait on target
  - [x] Access `DIALOGUE` trait data
  - [x] Handle conversation state

- [x] **asking.ts**
  - [x] Similar to talking
  - [x] Topic-based dialogue via traits

- [x] **telling.ts**
  - [x] Information transfer via traits
  - [x] Update NPC knowledge state

## Phase 3: Integration & Testing 🧪

### 3.1 Update Execution Pipeline
- [x] Update `ActionExecutor` to create `ActionContext`
  - [x] Created `TraitAwareActionExecutor` that bridges old and new systems
  - [x] Supports both GameContext and ActionContext execution
  - [x] Automatically converts commands to use IFEntity references
  - [x] Handles "ALL" commands with trait-based context
- [x] Modify `Story` class to use new context
  - [x] Created `story-trait-aware.ts` with updated Story class
  - [x] Uses `TraitAwareActionExecutor` instead of base executor
  - [x] Registers trait-based actions separately
  - [x] Added config option to force trait-based execution
- [x] Ensure `WorldModelService` is available
  - [x] Story creates IFWorld which extends WorldModelService
  - [x] Context creation properly extracts world service
  - [x] All trait-based actions have access to world model
- [x] Test command pipeline end-to-end
  - [x] Created comprehensive test suite in `trait-aware-execution.test.ts`
  - [x] Tests basic action execution with trait context
  - [x] Tests container actions with trait validation
  - [x] Tests ALL command handling
  - [x] Tests error handling for parse and validation errors

### 3.2 Create Test Suite
- [ ] Unit tests for each migrated action
- [ ] Test trait combinations
- [ ] Test validation messages
- [ ] Test event generation
- [ ] Test undo functionality

### 3.3 Migration Validation
- [ ] Ensure no attribute access remains
- [ ] Verify all trait access is type-safe
- [ ] Check event data includes trait info
- [ ] Validate extensibility with custom traits

## Phase 4: Advanced Features 🚀

### 4.1 Trait-Based Features
- [ ] Implement action discovery system
- [ ] Create "what can I do?" helper
- [ ] Add command suggestions based on traits
- [ ] Implement trait prerequisite system

### 4.2 Performance Optimization
- [ ] Profile trait access patterns
- [ ] Optimize common trait queries
- [ ] Cache frequently accessed trait data
- [ ] Minimize entity lookups

### 4.3 Documentation
- [ ] Document trait requirements per action
- [ ] Create trait combination guide
- [ ] Write migration guide for authors
- [ ] Add inline code documentation

## Phase 5: Cleanup 🧹

### 5.1 Remove Old Code
- [ ] Delete `GameContext` interface
- [ ] Remove attribute-based helpers
- [ ] Clean up old imports
- [ ] Remove compatibility layers

### 5.2 Final Validation
- [ ] Run full test suite
- [ ] Test with example game
- [ ] Verify Forge integration
- [ ] Performance benchmarks

## Success Criteria ✅

- All actions use `ActionContext` interface
- No direct attribute access in any action
- All trait access is type-safe
- Events include relevant trait data
- Actions are extensible via new traits
- Performance is acceptable
- Tests pass at 100%

## Notes

- Start with `examining.ts` as reference implementation
- Establish patterns in Phase 2.1 before moving forward
- Keep traits as the single source of truth
- Document decisions and patterns as you go
- Consider author experience throughout

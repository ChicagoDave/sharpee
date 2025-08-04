# World Model Implementation Checklist

## Phase 1: Core Trait System
- [x] Create base `Trait` interface
- [x] Create `IFEntity` class with trait management
  - [x] `has(type)` - check for trait
  - [x] `get<T>(type)` - get typed trait
  - [x] `add(trait)` - add trait
  - [x] `remove(type)` - remove trait
  - [x] `hasAll(...types)` - check multiple traits
  - [x] `hasAny(...types)` - check any trait
- [x] Create `EntityStore` wrapper for IF entities
- [x] Create basic validation for trait data

## Phase 2: Standard Traits
- [x] **Identity & Description**
  - [x] `IdentityTrait` - name, description, aliases
- [x] **Spatial Traits**
  - [x] `LocationTrait` - where entity is located
  - [x] `ContainerTrait` - can contain other entities
  - [x] `SupporterTrait` - can support other entities
  - [x] `RoomTrait` - special container for game rooms
- [x] **Physical Traits**
  - [x] `PortableTrait` - can be carried
  - [x] `FixedTrait` - cannot be moved
  - [x] `WearableTrait` - can be worn
  - [x] `EdibleTrait` - can be eaten

## Phase 3: Interactive Traits
- [x] `OpenableTrait` - can be opened/closed
- [x] `LockableTrait` - can be locked/unlocked
- [x] `SwitchableTrait` - can be turned on/off
- [x] `ReadableTrait` - has readable text
- [x] `LightSourceTrait` - provides light
- [x] `LightSensitiveTrait` - requires light to interact
- [x] `ValuableTrait` - has monetary value

## Phase 4: Advanced Traits
- [x] `ScriptableTrait` - custom behavior hooks
- [x] `NPCTrait` - non-player character behaviors
- [x] `DialogueTrait` - conversation trees
- [x] `MerchantTrait` - buying/selling
- [x] `PlayerTrait` - player-specific data
- [x] `DoorTrait` - connects rooms

## Phase 5: World Model Service
- [x] `WorldModelService` implementation
  - [x] Entity CRUD operations
  - [x] Trait management helpers
  - [x] Spatial relationship management
  - [x] State serialization/deserialization
- [x] `QueryBuilder` implementation
  - [x] Filter by traits
  - [x] Filter by trait data
  - [x] Spatial queries (in/on/near)
  - [x] Visibility/reachability queries
- [x] `ScopeService` implementation
  - [x] Calculate visible entities
  - [x] Calculate reachable entities
  - [x] Pronoun resolution

## Phase 6: Integration
- [x] Update `CommandExecutor` to use world model
  - [x] Created `WorldModelContext` interface
  - [x] Created `ContextAdapter` for backward compatibility
  - [x] Extended `ActionExecutor` to handle both contexts
- [x] Create world model context for actions
  - [x] `WorldModelContextImpl` implementation
  - [x] Factory function for context creation
- [x] Update existing actions to use traits
  - [x] Created trait-based `takingAction` as example
  - [x] Shows pattern for other actions to follow
- [x] Create trait-based validation helpers
  - [x] Common validation functions (canBeTaken, isOpen, etc.)
  - [x] `ActionValidator` class for scoped validation
  - [x] Validation messages
- [x] Add world model to story initialization
  - [x] `initializeStory` function
  - [x] Helper functions for creating entities
  - [x] Example story setup

## Phase 7: Testing
- [x] Unit tests for each trait type
- [x] Integration tests for world model service
- [x] Query builder test suite
- [x] Scope calculation tests
- [x] Serialization/deserialization tests

## Phase 8: Type-based to Trait-based Migration
- [x] **Remove Type-based System**
  - [x] Delete `if-entities/types.ts` (old IFEntity interface)
  - [x] Remove `CoreIFEntityType` enum
  - [x] Remove type-specific interfaces (Room, Container, Door, etc.)
  - [x] Remove type guard functions (isRoom, isContainer, etc.)
- [x] **Update IFWorld Class**
  - [x] Change to use trait-based IFEntity
  - [x] Update entity validation to use traits
  - [x] Convert type checks to trait checks
  - [x] Update movement/containment logic for traits
- [x] **Update Scope Calculator**
  - [x] Convert from type-based to trait-based checks
  - [x] Update visibility calculations
  - [x] Update reachability logic
- [x] **Add Convenience Layers**
  - [x] Create `EntityTemplates` class with standard patterns
  - [x] Add type-safe trait accessors to IFEntity
  - [x] Add convenience properties (isRoom, canContain, etc.)
  - [x] Create builder pattern for common entities
- [x] **Create Trait Bundles**
  - [x] Define standard entity "recipes" (room, container, door)
  - [x] Create preset trait combinations
  - [x] Document common patterns
- [x] **Update Documentation**
  - [x] Migration guide from type-based thinking
  - [x] Trait composition best practices
  - [x] Common entity patterns cookbook
  - [ ] Extension developer guide


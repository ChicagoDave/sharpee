# Architecture Decisions - Stdlib Service Layer Implementation

## Date: 2025-06-22

## Context
Working on the Sharpee Interactive Fiction platform stdlib layer, focusing on implementing the service layer architecture as described in the design document.

## Key Decisions

### 1. Service Layer Architecture
**Decision**: Implement a service layer between world-model and Forge that handles orchestration and complex operations.

**Rationale**:
- Clear separation of concerns: pure data (world-model) vs orchestration (stdlib)
- Services can be reused by multiple actions and systems
- Each service can be tested independently
- Complex logic is centralized in services
- Easier to extend without changing core

**Implementation**:
- Created core services: InventoryService, VisibilityService, MovementService, RoomService, ParserService
- Each service takes an IFWorld instance and provides high-level operations

### 2. Enhanced Action Context
**Decision**: Create an ActionContext that includes all services and helper methods.

**Structure**:
```typescript
interface ActionContext {
  world: IFWorld;
  player: IFEntity;
  services: {
    room: RoomService;
    inventory: InventoryService;
    visibility: VisibilityService;
    movement: MovementService;
    parser: ParserService;
    text: TextService;
  };
  language: IFLanguageProvider;
  emit(event: SemanticEvent): void;
  fail(reason: ActionFailureReason, data?: any): SemanticEvent;
}
```

**Rationale**:
- Actions get easy access to all services
- Consistent interface for all actions
- Helper methods reduce boilerplate

### 3. Base Action Executor Pattern
**Decision**: Create BaseActionExecutor abstract class with standard execution flow.

**Flow**:
1. Validation phase
2. Execution phase  
3. Post-processing phase

**Rationale**:
- Consistent structure across all actions
- Error handling in one place
- Easy to extend with new phases
- Clear separation of validation and execution

### 4. Service-Based Actions
**Decision**: Refactor actions to use services instead of direct world/behavior manipulation.

**Example Migration**:
```typescript
// Old approach
if (ContainerBehavior.canAccept(container, item)) {
  world.moveEntity(item.id, container.id);
}

// New approach
const transferred = context.services.inventory.transfer(item, from, to);
```

**Rationale**:
- Actions focus on high-level flow
- Services handle all complexity
- Consistent error handling
- Side effects managed by services

### 5. Import Structure
**Decision**: Use explicit imports from @sharpee/core with aliases.

**Pattern**:
```typescript
import { Entity as IFEntity, World as IFWorld } from '@sharpee/core';
```

**Rationale**:
- Clear distinction between core types and IF-specific types
- Avoids naming conflicts
- Makes dependencies explicit

### 6. Service Responsibilities

**InventoryService**:
- Container operations (canContain, transfer)
- Weight/volume calculations
- Inventory queries (getInventory, getWornItems)
- Finding best containers

**VisibilityService**:
- Scope calculations (getVisibleEntities, getReachableEntities)
- Visibility checks (canSee, canReach)
- Light source management
- Path finding to objects

**MovementService**:
- Movement validation (canMove)
- Entity movement (moveEntity)
- Destination resolution
- Pathfinding between rooms

**RoomService**:
- Room connections (connect, disconnect)
- Lighting calculations
- Room descriptions
- Exit management

**ParserService**:
- World-aware parsing
- Entity disambiguation
- Scope-based resolution

### 7. Text Generation Separation
**Decision**: Keep text generation as a separate service, not embedded in actions.

**Rationale**:
- All text goes through events to event store
- Text service uses templates and language service after turn completion
- Separation of game logic from presentation
- Supports multiple languages/output formats

## Core Principles Followed

1. **Query-able world model** - Services query the world for state
2. **No virtual machine** - Direct execution, no bytecode
3. **Multiple language hooks** - Language provider abstraction
4. **Event-driven text** - All text through events and templates
5. **Fluent author layer** - Services provide high-level operations
6. **Standard library design** - Moderate complexity for modifications

## Benefits Achieved

1. **Clear Separation**: Pure data (world-model) vs orchestration (stdlib)
2. **Reusability**: Services used by multiple actions
3. **Testability**: Each service tested independently
4. **Consistency**: Business logic centralized
5. **Extensibility**: New features in services benefit all consumers

## Next Steps

1. Refactor remaining actions to use services
2. Add comprehensive tests for each service
3. Complete TextService implementation
4. Update Forge to use service layer
5. Add detailed API documentation

# StdLib Design Document - Orchestration & Services Layer

## Overview

The Standard Library (stdlib) serves as the **orchestration and service layer** between the pure data models in world-model and the author-facing API in Forge. It provides the standard Interactive Fiction implementation by coordinating behaviors, managing complex operations, and offering helpful services.

## Architectural Position

```
┌─────────────┐
│   Forge     │  Author-facing API (fluent, convenient)
├─────────────┤
│   StdLib    │  Orchestration, Services, Complex Logic ← WE ARE HERE
├─────────────┤
│ World-Model │  Pure IF concepts (traits, behaviors)
├─────────────┤
│    Core     │  Base entity system, events
└─────────────┘
```

## Key Responsibilities

### 1. Action Implementation
- Implement standard IF actions (take, drop, go, examine, etc.)
- Coordinate multiple behaviors to complete actions
- Handle action validation and error reporting
- Manage action side effects and event generation

### 2. Service Layer
- **RoomService**: Manage room connections, lighting, descriptions
- **InventoryService**: Handle complex container operations
- **MovementService**: Coordinate entity movement between locations
- **VisibilityService**: Calculate what's visible/reachable
- **ParserService**: Advanced parsing with world context
- **TextService**: Generate human-readable output from events

### 3. Complex Operations
- Multi-step operations that span multiple entities
- Transaction-like operations (e.g., swap items between containers)
- Bulk operations (e.g., "take all")
- Conditional operations based on world state

### 4. Parser Integration
- Command parsing with world awareness
- Disambiguation based on scope and context
- Grammar pattern management
- Verb-to-action mapping

### 5. Language Support
- Language provider abstraction
- Template-based text generation
- Pluralization and article handling
- Direction and relationship naming

## Core Services Design

### RoomService
```typescript
export class RoomService {
  constructor(private world: IFWorld) {}
  
  // Reciprocal exit management
  connect(room1: IFEntity, dir1: Direction, room2: IFEntity, dir2: Direction): void
  disconnect(room1: IFEntity, dir1: Direction): void
  
  // Lighting calculations
  getTotalLight(room: IFEntity): number
  isDark(room: IFEntity): boolean
  getLightSources(room: IFEntity): IFEntity[]
  
  // Room descriptions
  getFullDescription(room: IFEntity, observer: IFEntity): string
  listExits(room: IFEntity): ExitInfo[]
  listContents(room: IFEntity, observer: IFEntity): IFEntity[]
}
```

### InventoryService
```typescript
export class InventoryService {
  constructor(private world: IFWorld) {}
  
  // Complex container operations
  canContain(container: IFEntity, item: IFEntity): boolean | string
  transfer(item: IFEntity, from: IFEntity, to: IFEntity): boolean
  getTotalWeight(container: IFEntity): number
  getTotalVolume(container: IFEntity): number
  
  // Inventory queries
  getInventory(actor: IFEntity): IFEntity[]
  getWornItems(actor: IFEntity): IFEntity[]
  findBestContainer(actor: IFEntity, item: IFEntity): IFEntity | null
}
```

### VisibilityService
```typescript
export class VisibilityService {
  constructor(private world: IFWorld) {}
  
  // Scope calculations
  getVisibleEntities(observer: IFEntity): IFEntity[]
  getReachableEntities(observer: IFEntity): IFEntity[]
  canSee(observer: IFEntity, target: IFEntity): boolean
  canReach(observer: IFEntity, target: IFEntity): boolean
  
  // Advanced queries
  findPath(observer: IFEntity, target: IFEntity): IFEntity[] | null
  getObstructions(observer: IFEntity, target: IFEntity): IFEntity[]
}
```

### MovementService
```typescript
export class MovementService {
  constructor(private world: IFWorld) {}
  
  // Movement operations
  moveEntity(entity: IFEntity, destination: IFEntity): boolean
  canMove(entity: IFEntity, direction: Direction): boolean | string
  getDestination(from: IFEntity, direction: Direction): IFEntity | null
  
  // Pathfinding
  findRoute(from: IFEntity, to: IFEntity): Direction[] | null
  getConnectedRooms(start: IFEntity, maxDistance: number): IFEntity[]
}
```

## Action Architecture

### Action Context
```typescript
export interface ActionContext {
  world: IFWorld
  player: IFEntity
  services: {
    room: RoomService
    inventory: InventoryService
    visibility: VisibilityService
    movement: MovementService
    parser: ParserService
    text: TextService
  }
  language: IFLanguageProvider
  
  // Convenience methods
  emit(event: SemanticEvent): void
  fail(reason: ActionFailureReason, data?: any): void
}
```

### Action Executor Pattern
```typescript
export abstract class BaseActionExecutor implements ActionExecutor {
  abstract id: string
  abstract requiredTraits?: TraitType[]
  
  execute(command: ResolvedCommand, context: ActionContext): SemanticEvent[] {
    // Validation
    const validation = this.validate(command, context)
    if (validation !== true) {
      return [context.fail(validation)]
    }
    
    // Execution
    const events = this.doExecute(command, context)
    
    // Post-processing
    return this.postProcess(events, command, context)
  }
  
  protected abstract validate(command: ResolvedCommand, context: ActionContext): true | ActionFailureReason
  protected abstract doExecute(command: ResolvedCommand, context: ActionContext): SemanticEvent[]
  protected postProcess(events: SemanticEvent[], command: ResolvedCommand, context: ActionContext): SemanticEvent[]
}
```

### Example: Taking Action
```typescript
export class TakingActionExecutor extends BaseActionExecutor {
  id = IFActions.TAKING
  requiredTraits = [TraitType.IDENTITY]
  
  protected validate(command: ResolvedCommand, context: ActionContext): true | ActionFailureReason {
    const item = command.direct!
    
    // Check visibility
    if (!context.services.visibility.canSee(context.player, item)) {
      return ActionFailureReason.NOT_VISIBLE
    }
    
    // Check reachability
    if (!context.services.visibility.canReach(context.player, item)) {
      return ActionFailureReason.NOT_REACHABLE
    }
    
    // Check if already held
    if (context.world.getLocation(item.id) === context.player.id) {
      return ActionFailureReason.ALREADY_HELD
    }
    
    // Check if takeable
    if (item.has(TraitType.SCENERY) || item.has(TraitType.ROOM)) {
      return ActionFailureReason.NOT_TAKEABLE
    }
    
    return true
  }
  
  protected doExecute(command: ResolvedCommand, context: ActionContext): SemanticEvent[] {
    const item = command.direct!
    const events: SemanticEvent[] = []
    
    // Use inventory service for the transfer
    const transferred = context.services.inventory.transfer(
      item,
      context.world.getEntity(context.world.getLocation(item.id)!),
      context.player
    )
    
    if (transferred) {
      events.push(createEvent(
        IFEvents.ITEM_TAKEN,
        { actor: context.player.id, item: item.id }
      ))
    }
    
    return events
  }
}
```

## Parser Integration

### World-Aware Parser
```typescript
export class WorldAwareParser extends BaseParser {
  constructor(
    private world: IFWorld,
    private visibilityService: VisibilityService
  ) {
    super()
  }
  
  parse(input: string, context: ParserContext): ParsedCommand {
    // Get visible entities for disambiguation
    const scope = this.visibilityService.getVisibleEntities(context.actor)
    
    // Parse with scope awareness
    return this.parseWithScope(input, scope, context)
  }
}
```

## Text Generation

### Template-Based Text Service
```typescript
export class TemplateTextService implements TextService {
  constructor(
    private templates: Map<string, string>,
    private language: IFLanguageProvider
  ) {}
  
  renderEvent(event: SemanticEvent, context: TextContext): string {
    const template = this.templates.get(event.type)
    if (!template) return ''
    
    return this.interpolate(template, event.data, context)
  }
  
  private interpolate(template: string, data: any, context: TextContext): string {
    // Handle {actor}, {item}, etc. with proper articles and capitalization
  }
}
```

## Integration Points

### With World-Model
- Uses pure behaviors for single-entity operations
- Combines behaviors for complex operations
- Respects trait data structures
- Generates appropriate events

### With Forge
- Provides services that Forge can use directly
- Offers both low-level and high-level APIs
- Maintains clean, predictable interfaces
- Handles all the "messy" coordination logic

### With Core
- Uses entity system for all data storage
- Leverages event system for all changes
- Respects the immutability principles
- Works with channels for output

## Benefits of This Design

1. **Clear Separation**: Pure data (world-model) vs orchestration (stdlib)
2. **Reusability**: Services can be used by Forge or custom implementations
3. **Testability**: Each service can be tested independently
4. **Extensibility**: New services can be added without changing core
5. **Maintainability**: Complex logic is centralized in services

## Migration Path

1. **Phase 1**: Create service interfaces and basic implementations
2. **Phase 2**: Migrate actions to use services
3. **Phase 3**: Remove old world-model code from stdlib
4. **Phase 4**: Update Forge to use services
5. **Phase 5**: Add advanced features (pathfinding, etc.)

## Next Steps

1. Implement core services (Room, Inventory, Visibility, Movement)
2. Create ActionContext with service injection
3. Migrate one action (e.g., taking) as proof of concept
4. Update parser to be world-aware
5. Design text generation system
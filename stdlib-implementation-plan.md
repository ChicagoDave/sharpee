# StdLib Implementation Plan

## Current State Analysis

### What We Have
- Legacy code mixed with world-model concepts
- Actions that directly manipulate entities (should use services)
- Parser that's not properly integrated
- Duplicate/conflicting implementations

### What We Need
- Clean service layer for orchestration
- Actions that use services and behaviors
- World-aware parser
- Proper text generation system

## Phase 1: Core Services (Priority 1)

### 1.1 Create Service Interfaces
```typescript
// services/types.ts
export interface IFServices {
  room: IRoomService
  inventory: IInventoryService  
  visibility: IVisibilityService
  movement: IMovementService
}
```

### 1.2 RoomService Implementation
```typescript
// services/roomService.ts
export class RoomService implements IRoomService {
  constructor(private world: IFWorld) {}
  
  connect(room1: IFEntity, dir1: Direction, room2: IFEntity, dir2: Direction): void {
    RoomBehavior.setExit(room1, dir1, room2.id)
    RoomBehavior.setExit(room2, dir2, room1.id)
  }
  
  getTotalLight(room: IFEntity): number {
    let total = RoomBehavior.getLightLevel(room)
    
    // Add light from all sources in the room
    const contents = this.world.getContents(room.id)
    for (const entity of contents) {
      if (entity.has(TraitType.LIGHT_SOURCE)) {
        const lightTrait = entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait
        if (lightTrait.isOn) {
          total += lightTrait.lightOutput
        }
      }
    }
    
    return total
  }
}
```

### 1.3 InventoryService Implementation
- Handle weight/volume calculations
- Manage transfers between containers
- Check capacity constraints
- Find best container for items

### 1.4 VisibilityService Implementation  
- Calculate visible entities
- Check reachability
- Handle containers and supporters
- Respect darkness and concealment

### 1.5 MovementService Implementation
- Validate movement through exits
- Handle doors and locks
- Move entities between locations
- Track movement history

## Phase 2: Action Context (Priority 2)

### 2.1 Create ActionContext
```typescript
export function createActionContext(options: {
  world: IFWorld
  player: IFEntity
  language: IFLanguageProvider
}): ActionContext {
  // Create all services
  const services = {
    room: new RoomService(world),
    inventory: new InventoryService(world),
    visibility: new VisibilityService(world),
    movement: new MovementService(world)
  }
  
  return {
    world,
    player,
    services,
    language,
    
    // Helper methods
    emit(event: SemanticEvent): void {
      this.world.emit(event)
    },
    
    fail(reason: ActionFailureReason, data?: any): SemanticEvent {
      return createEvent(IFEvents.ACTION_FAILED, {
        action: this.currentAction,
        reason,
        ...data
      })
    }
  }
}
```

## Phase 3: Migrate Actions (Priority 3)

### 3.1 Start with TakingAction
- Use VisibilityService for scope checks
- Use InventoryService for transfers
- Generate proper events

### 3.2 Then GoingAction  
- Use MovementService for validation
- Handle doors with DoorBehavior
- Update room descriptions

### 3.3 Continue with others
- One action at a time
- Ensure tests pass
- Document patterns

## Phase 4: Parser Integration (Priority 4)

### 4.1 World-Aware Parser
- Get scope from VisibilityService
- Disambiguate based on context
- Handle pronouns ("it", "them")

### 4.2 Grammar Management
- Move grammar patterns to data
- Allow dynamic grammar registration
- Support multiple languages

## Phase 5: Text Generation (Priority 5)

### 5.1 Event-to-Text Mapping
- Template system with interpolation
- Proper article handling
- Pluralization support

### 5.2 Description Generation
- Room descriptions with contents
- Dynamic list formatting
- Context-aware text

## File Structure

```
packages/stdlib/src/
  services/
    types.ts              # Service interfaces
    roomService.ts        # Room orchestration
    inventoryService.ts   # Container management
    visibilityService.ts  # Scope calculations
    movementService.ts    # Entity movement
    index.ts             # Service exports
    
  actions/
    base/
      actionExecutor.ts   # Base class
      actionContext.ts    # Context creation
    implementations/
      taking.ts          # Individual actions
      going.ts
      ...
    index.ts            # Action exports
    
  parser/
    worldAwareParser.ts  # Main parser
    disambiguation.ts    # Disambiguation logic
    grammar/            # Grammar patterns
    
  text/
    textService.ts      # Text generation
    templates/          # Event templates
    formatting.ts       # Text formatting utilities
    
  integration/
    forge/             # Forge-specific helpers
    worldModel/        # World-model coordination
    
  index.ts            # Public API
```

## Success Criteria

1. **Clean Architecture**: Clear separation between data and orchestration
2. **Service-Oriented**: All complex operations go through services
3. **Testable**: Each service can be unit tested
4. **Extensible**: Easy to add new services or actions
5. **Documented**: Clear examples and patterns

## Next Immediate Steps

1. Create `services/types.ts` with interfaces
2. Implement `RoomService` as first service
3. Create `ActionContext` type and factory
4. Migrate `TakingAction` to use services
5. Write tests for RoomService

This gives us a clear path forward that:
- Builds on the clean world-model layer
- Provides useful services to Forge
- Maintains architectural boundaries
- Can be implemented incrementally

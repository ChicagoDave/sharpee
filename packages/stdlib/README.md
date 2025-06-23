# Sharpee Standard Library (stdlib)

The Standard Library provides the orchestration and service layer for the Sharpee Interactive Fiction platform. It sits between the pure data models in `@sharpee/world-model` and the author-facing API in `@sharpee/forge`.

## Architecture

```
┌─────────────┐
│   Forge     │  Author-facing API (fluent, convenient)
├─────────────┤
│   StdLib    │  Orchestration, Services, Complex Logic ← THIS PACKAGE
├─────────────┤
│ World-Model │  Pure IF concepts (traits, behaviors)
├─────────────┤
│    Core     │  Base entity system, events
└─────────────┘
```

## Core Services

The stdlib provides several key services that handle complex operations:

### InventoryService
- Complex container operations
- Weight and volume calculations
- Item transfer with validation
- Inventory queries and management

### VisibilityService
- Scope calculations (what can be seen/reached)
- Lighting awareness
- Container transparency
- Pathfinding to objects

### MovementService
- Entity movement between locations
- Navigation validation (doors, locks, etc.)
- Pathfinding between rooms
- Movement restrictions

### RoomService
- Room connections and exits
- Lighting calculations
- Room descriptions
- Spatial relationships

### ParserService
- World-aware command parsing
- Entity disambiguation
- Scope-based resolution
- Grammar pattern matching

## Service-Based Actions

Actions in stdlib use the service layer for all complex operations:

```typescript
export class TakingActionExecutor extends BaseActionExecutor {
  protected validate(command: ParsedCommand, context: ActionContext): true | ActionFailureReason {
    // Use visibility service for checks
    const reachable = this.checkReachability(command.noun, context);
    if (reachable !== true) return reachable;
    
    // Use inventory service for validation
    const canContain = context.services.inventory.canContain(context.player, command.noun);
    if (canContain !== true) return ActionFailureReason.CONTAINER_FULL;
    
    return true;
  }
  
  protected doExecute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    // Use inventory service for the transfer
    const transferred = context.services.inventory.transfer(
      command.noun,
      fromEntity,
      context.player
    );
    
    // Return appropriate events
  }
}
```

## Benefits

1. **Separation of Concerns**: Actions handle flow, services handle complexity
2. **Reusability**: Services can be used by multiple actions and systems
3. **Testability**: Each service can be tested independently
4. **Consistency**: Business logic centralized in services
5. **Extensibility**: New features added to services benefit all consumers

## Usage

```typescript
import { 
  createActionContext,
  InventoryService,
  VisibilityService,
  TakingActionExecutor 
} from '@sharpee/stdlib';

// Create context with services
const context = createActionContext({
  world,
  player,
  language
});

// Use services directly
const visible = context.services.visibility.getVisibleEntities(player);
const canTake = context.services.inventory.canContain(player, item);

// Or through actions
const action = new TakingActionExecutor();
const events = action.execute(command, context);
```

## Migration from Direct Behavior Usage

The stdlib is transitioning from direct behavior calls to service-based orchestration:

### Old Approach
```typescript
// Direct behavior calls
if (ContainerBehavior.canAccept(container, item)) {
  world.moveEntity(item.id, container.id);
}
```

### New Approach
```typescript
// Service orchestration
const transferred = context.services.inventory.transfer(item, from, to);
```

The service layer handles all the complexity: validation, side effects, events, etc.

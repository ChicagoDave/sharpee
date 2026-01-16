# Sharpee Core Concepts Quick Reference

## Overview
Sharpee is an interactive fiction (IF) engine that uses a trait-based entity system, event-driven architecture, and a four-phase action pattern (validate/execute/report/blocked) for handling player commands.

## Entity System

### Entity Creation
Entities are the fundamental building blocks representing everything in the game world.

```typescript
// Basic entity creation
const entity = world.createEntity(displayName: string, type?: string)

// Creation with traits
const room = world.createEntityWithTraits(EntityType.ROOM)
```

**Key Properties:**
- `id`: Unique identifier (auto-generated)
- `type`: Entity type (room, item, actor, etc.)
- `attributes`: Key-value pairs for entity data
- `relationships`: Entity relationships (e.g., parent-child)
- `traits`: Map of trait instances
- `on`: Event handlers for custom logic

**Location:** `/packages/world-model/src/entities/if-entity.ts`

### Entity Types
Common entity types with auto-generated ID prefixes:
- `room` (r_) - Game locations
- `door` (d_) - Connections between rooms
- `item` (i_) - Portable objects
- `actor` (a_) - NPCs and player
- `container` (c_) - Objects that can hold other objects
- `supporter` (s_) - Objects that can support other objects
- `scenery` (y_) - Fixed decorative objects
- `exit` (e_) - Room exits

## Trait System

Traits add behaviors and properties to entities through composition.

### Core Traits
Located in `/packages/world-model/src/traits/`:

- **Identity** - Basic entity properties (name, description)
- **Container** - Can hold other entities (inventory, boxes)
- **Room** - Represents a location
- **Openable** - Can be opened/closed (doors, containers)
- **Lockable** - Can be locked/unlocked
- **Wearable** - Can be worn by actors
- **Edible** - Can be eaten
- **Switchable** - Can be turned on/off
- **Pushable** - Can be pushed
- **Pullable** - Can be pulled
- **Supporter** - Can have objects placed on top
- **LightSource** - Provides illumination
- **Scenery** - Fixed in place, can't be taken
- **Actor** - Represents player or NPCs
- **Door** - Connects two rooms

### Using Traits
```typescript
// Check if entity has a trait
if (entity.has(TraitType.CONTAINER)) { }

// Get a typed trait
const container = entity.get(TraitType.CONTAINER)
if (container && container.capacity > 0) { }

// Add a trait
entity.add(new ContainerTrait({ capacity: 10 }))

// Remove a trait
entity.remove(TraitType.WEARABLE)
```

## Action System (Four-Phase Pattern)

Actions follow a strict four-phase pattern as defined in ADR-051/052:

### Phase 1: Validate
Check if the action can be performed.
```typescript
validate(context: ActionContext): ValidationResult {
  // Check preconditions
  // Return { valid: true } or { valid: false, error: 'error_code' }
}
```

### Phase 2: Execute
Perform the actual world mutations.
```typescript
execute(context: ActionContext): void {
  // IMPORTANT: Execute should be minimal - delegate to behaviors
  // Store data in context.sharedData for report phase
  // NO event emission here - that's for report phase
  
  const result = SomeBehavior.doThing(entity, world);
  context.sharedData.result = result;
}
```

**Key Principle**: The execute phase should be minimal. Complex logic belongs in behaviors (see Behaviors vs Actions section). Execute only coordinates behaviors and stores results.

### Phase 3: Report
Generate events for output and game logic.
```typescript
report(context: ActionContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  
  // Always emit world event first
  events.push(context.event('if.event.something_happened', { ... }));
  
  // Then add success/error messages
  events.push(context.event('action.success', { ... }));
  
  // Return all events together - no early returns
  return events;
}
```

### Action Structure
Each action lives in `/packages/stdlib/src/actions/standard/[action-name]/` with:
- `[action-name].ts` - Main action implementation
- `[action-name]-events.ts` - Event type definitions
- `[action-name]-data.ts` - Data builder configuration

### Action Categories

#### World-Mutating Actions
Actions that change game state:
- **taking/dropping** - Pick up/put down objects
- **opening/closing** - Open/close containers and doors
- **going** - Move between rooms
- **entering/exiting** - Enter/exit containers
- **putting/inserting** - Put objects in/on containers
- **giving** - Give objects to actors
- **wearing/removing** - Wear/remove clothing
- **eating/drinking** - Consume edibles
- **pushing/pulling** - Manipulate pushable/pullable objects
- **switching** - Turn devices on/off
- **locking/unlocking** - Lock/unlock lockable objects

#### Query Actions
Actions that only read state:
- **examining** - Look at objects
- **looking** - Examine current location
- **inventory** - List carried items

#### Meta-Actions (Signal Actions)
Actions that emit signals without world interaction:
- **about** - Display game information
- **help** - Show available commands
- **save/restore** - Game state management
- **quit** - Exit the game

Meta-actions typically have:
- `validate()` that always succeeds
- Empty `execute()` phase
- `report()` that emits a simple signal event

## ActionContext

The context object passed to all action phases, providing access to world state and utilities.

### Key Properties
- `world`: WorldModel instance for querying/mutating
- `player`: The player entity
- `currentLocation`: Player's current room
- `command`: Parsed and validated command
- `scopeResolver`: Determines what's perceivable
- `action`: The action being executed
- `sharedData`: Type-safe data storage for passing data between phases

### Using sharedData (Type-Safe Pattern)
```typescript
// Define typed interface for your action's shared data
interface AttackingSharedData {
  targetId?: string;
  weaponId?: string;
  wasBlindAttack?: boolean;
  attackResult?: AttackResult;  // Result from behavior
}

// In execute phase - minimal!
execute(context: ActionContext): void {
  const sharedData = context.sharedData as AttackingSharedData;
  const target = context.command.directObject!.entity!;
  
  // Just call behavior and store result
  const result = AttackBehavior.attack(player, target, weapon, world);
  sharedData.attackResult = result;
  sharedData.targetId = target.id;
}

// In report phase - all events
report(context: ActionContext): ISemanticEvent[] {
  const sharedData = context.sharedData as AttackingSharedData;
  const events: ISemanticEvent[] = [];
  
  // Generate events based on shared data
  events.push(context.event('if.event.attacked', { ... }));
  events.push(context.event('action.success', { ... }));
  
  return events;
}
```

**Important**: 
- Never use `(context as any)._*` patterns - this is context pollution
- Execute stores behavior results, report generates all events
- sharedData is the ONLY way to pass data between phases

### Helper Methods
- `canSee(entity)`: Check visibility
- `canReach(entity)`: Check reachability
- `canTake(entity)`: Check if takeable
- `isInScope(entity)`: Check if in scope
- `getVisible()`: Get all visible entities
- `getInScope()`: Get all entities in scope
- `event(type, data)`: Create semantic events

**Location:** `/packages/stdlib/src/actions/enhanced-types.ts`

## World Model

The central game state manager.

### Key Methods

**Entity Management:**
- `createEntity(displayName, type?)`: Create new entity
- `getEntity(id)`: Get entity by ID
- `removeEntity(id)`: Remove entity
- `getAllEntities()`: Get all entities

**Spatial Management:**
- `getLocation(entityId)`: Get entity's container
- `getContents(containerId)`: Get container contents
- `moveEntity(entityId, targetId)`: Move entity
- `getContainingRoom(entityId)`: Find containing room

**Queries:**
- `findByTrait(traitType)`: Find entities with trait
- `findByType(entityType)`: Find entities by type
- `getVisible(observerId)`: Get visible entities
- `canSee(observerId, targetId)`: Check visibility

**State:**
- `getState()`: Get world state dictionary
- `setState(state)`: Set world state
- `getPlayer()`: Get player entity
- `setPlayer(entityId)`: Set player entity

**Location:** `/packages/world-model/src/world/WorldModel.ts`

## Event System

Events drive the game's output and custom logic.

### Event Types
- **Action Events** (`action.*`): Command execution results
  - `action.success`: Action completed successfully
  - `action.error`: Action failed
  - `action.info`: Informational message
  
- **Game Events** (`if.event.*`): Game state changes
  - `if.event.taken`: Object picked up
  - `if.event.dropped`: Object dropped
  - `if.event.opened`: Container opened
  - `if.event.pushed`: Object pushed
  - etc.

### Text Output Pattern (Critical)

**Actions NEVER emit text directly.** The flow is:

1. Actions emit **semantic events** with `messageId` and `params`
2. Report service receives events after turn completes
3. Report service looks up `messageId` in language-specific message templates
4. Report service renders final text to player

```typescript
// CORRECT: Emit event with messageId
events.push(context.event('action.success', {
  actionId: IFActions.WAITING,
  messageId: 'time_passes'  // Report service looks this up
}));

// WRONG: Never emit text directly
events.push({ text: 'Time passes.' });  // DON'T DO THIS
```

This separation enables:
- Internationalization (different languages)
- Customizable prose styles
- Story-specific message overrides
- Consistent output formatting

### Event Handlers (ADR-052)

**Entity-level handlers:**
```typescript
const redBook = {
  on: {
    'if.event.pushed': (event) => {
      // Custom logic when this book is pushed
    }
  }
}
```

**Story-level handlers (daemons):**
```typescript
story.on('if.event.pushed', (event) => {
  // Global logic for any push event
})
```

## Perception System

The perception system filters events based on what the player can perceive, handling darkness, blindness, and other sensory restrictions.

### PerceptionService (ADR-069)

The PerceptionService sits between action execution and the text service, transforming events that describe things the player cannot perceive into appropriate alternative events.

**Location:**
- Interface: `/packages/if-services/src/perception-service.ts`
- Implementation: `/packages/stdlib/src/services/PerceptionService.ts`

### Basic Usage

```typescript
import { PerceptionService } from '@sharpee/stdlib';

// Create service
const perceptionService = new PerceptionService();

// Wire to engine
const engine = new GameEngine({
  world,
  player,
  parser,
  language,
  textService,
  perceptionService  // Enable perception filtering
});
```

### How It Works

1. Action generates events (room description, contents list, etc.)
2. PerceptionService filters events before they reach the text service
3. Visual events are blocked or transformed when player can't see
4. Non-visual events (action.failure, game.message) pass through unchanged

### Sense Types

```typescript
type Sense = 'sight' | 'hearing' | 'smell' | 'touch';
```

Currently only `sight` is fully implemented. Other senses are extension points for future features.

### Checking Perception

```typescript
// Check if actor can perceive
const canSee = perceptionService.canPerceive(actor, location, world, 'sight');

// Perception checks (for sight):
// 1. Is actor blind? (future)
// 2. Is actor blindfolded? (future)
// 3. Is location dark? (via VisibilityBehavior)
```

### Event Filtering

The service filters these visual event types when the player can't see:
- `if.event.room.description` → `if.event.perception.blocked`
- `if.event.contents.listed` → `if.event.perception.blocked`
- `action.success` with `messageId: 'contents_list'` → `if.event.perception.blocked`

The blocked event contains:
```typescript
interface PerceptionBlockedData {
  originalType: string;  // What was blocked
  reason: PerceptionBlockReason;  // Why (darkness, blindness, blindfolded)
  sense: Sense;  // Which sense was blocked
  originalData?: unknown;  // Original event data for debugging
}
```

### Story Integration Example

```typescript
// In story setup
const bar = world.createEntity('Dark Bar', EntityType.ROOM);
bar.add(new RoomTrait({ isDark: true }));  // Dark until lit

// When player enters while carrying cloak (absorbs light):
// - Room description is filtered to perception.blocked
// - "Blundering in dark" message still appears (game.message)
// - Action failures still appear

// When cloak is hung (bar becomes lit):
roomTrait.isDark = false;
// Now room description shows normally
```

### Text Service Handling

The text service handles blocked perception events:
```typescript
case 'if.event.perception.blocked':
  // Show "It's pitch dark, and you can't see a thing."
  return this.languageProvider.getMessage('perception.blocked.darkness');
```

## Command Processing Flow

1. **Parse**: Text → ParsedCommand (parser)
2. **Validate**: ParsedCommand → ValidatedCommand (validator)
3. **Execute**: ValidatedCommand → Events (action's three phases)
   - validate(): Check preconditions
   - execute(): Mutate world
   - report(): Generate events
4. **Process**: Events → Output (event processor)

## Behaviors vs Actions

- **Behaviors** (`/packages/world-model/src/behaviors/`): 
  - Pure game logic for manipulating traits and state
  - **Handle ALL world mutations** - behaviors own the state changes
  - Can call other behaviors (composition)
  - Return minimal data for reporting
  - Example: `BreakableBehavior.break(entity, world)`
  
- **Actions** (`/packages/stdlib/src/actions/`):
  - Handle player commands
  - **Coordinate behaviors** - actions don't mutate directly
  - Store results in sharedData between phases
  - Generate events for output in report phase

**Key Insight**: If your execute phase is complex, you're doing it wrong. Move the logic to a behavior.

## Capability Dispatch (ADR-090)

Capability dispatch allows entities to handle generic actions (like "lower" or "raise") with entity-specific behaviors. Instead of having fixed action semantics, these actions delegate to behaviors registered for specific traits.

### How It Works

1. **Trait declares capabilities**: A trait lists which action IDs it can handle
2. **Behavior implements 4-phase pattern**: validate/execute/report/blocked
3. **Story registers behaviors**: Connect trait+capability to behavior
4. **Stdlib action dispatches**: Finds trait, delegates to behavior

### Example: Basket Elevator

```typescript
// 1. Trait declares capabilities
class BasketElevatorTrait implements ITrait {
  static readonly type = 'dungeo.trait.basket_elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'];

  position: 'top' | 'bottom' = 'top';
  topRoomId: string;
  bottomRoomId: string;
}

// 2. Behavior implements the logic
const BasketLoweringBehavior: CapabilityBehavior = {
  validate(entity, world, actorId): CapabilityValidationResult {
    const trait = entity.get(BasketElevatorTrait);
    if (trait.position === 'bottom') {
      return { valid: false, error: 'if.lower.already_down' };
    }
    return { valid: true };
  },

  execute(entity, world, actorId): void {
    const trait = entity.get(BasketElevatorTrait);
    trait.position = 'bottom';
  },

  report(entity, world, actorId): CapabilityEffect[] {
    return [
      createEffect('if.event.lowered', { targetId: entity.id }),
      createEffect('action.success', {
        actionId: 'if.action.lowering',
        messageId: 'if.lower.lowered',
        params: { target: entity.name }
      })
    ];
  },

  blocked(entity, world, actorId, error): CapabilityEffect[] {
    return [
      createEffect('action.blocked', {
        actionId: 'if.action.lowering',
        messageId: error,
        params: { target: entity.name }
      })
    ];
  }
};

// 3. Register behavior at story initialization
import { registerCapabilityBehavior, hasCapabilityBehavior } from '@sharpee/world-model';

if (!hasCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering')) {
  registerCapabilityBehavior(
    BasketElevatorTrait.type,
    'if.action.lowering',
    BasketLoweringBehavior
  );
}
```

### Creating Capability-Dispatch Actions

The stdlib provides `createCapabilityDispatchAction()` for creating these actions:

```typescript
import { createCapabilityDispatchAction } from '@sharpee/stdlib';

export const loweringAction = createCapabilityDispatchAction({
  actionId: 'if.action.lowering',
  group: 'manipulation',
  noTargetError: 'if.lower.no_target',
  cantDoThatError: 'if.lower.cant_lower_that'
});
```

### When to Use Capability Dispatch

Use capability dispatch when:
- The same verb can mean different things for different objects (lower basket vs lower blinds)
- Story-specific objects need custom handling for generic verbs
- You want to avoid littering stdlib actions with special cases

Don't use when:
- The action has fixed, universal semantics (taking, dropping)
- All objects handle the verb the same way

### Key Files

- Registry: `/packages/world-model/src/capabilities/capability-registry.ts`
- Helpers: `/packages/world-model/src/capabilities/capability-helpers.ts`
- Dispatch factory: `/packages/stdlib/src/actions/capability-dispatch.ts`

## Scope System

Determines what entities are perceivable to the player.

### Scope Levels
- `VISIBLE`: Can be seen
- `REACHABLE`: Can be physically touched
- `AUDIBLE`: Can be heard
- `CARRIED`: In player's inventory
- `WORN`: Being worn by player
- `IN_ROOM`: In current room

### Parser Scope vs Action Validation
```typescript
// In parser grammar - be permissive
grammar
  .define('attack :target')
  .where('target', scope => scope.touchable())  // NOT visible()
  .mapsTo('if.action.attacking')
  
// In action validation - check specifics
validate(context: ActionContext): ValidationResult {
  if (!context.canReach(target)) {
    return { valid: false, error: 'not_reachable' };
  }
  // Allow blind attacks - don't check canSee()
}
```

**Key Principle**: Parser scope should be permissive (touchable, not visible) to allow actions like attacking in darkness. Let the action decide if visibility is truly required.

### Scope Resolution
The scope resolver determines which entities are available for commands based on the action's requirements and the player's current context.

## Testing Patterns

### Unit Tests
- Test individual action phases
- Mock ActionContext and entities
- Located in `packages/[package]/tests/unit/`

### Integration Tests
- Test complete action execution
- Use real world model
- Located in `packages/[package]/tests/integration/`

### Golden Tests
- Compare action output against expected results
- Files like `opening-golden.test.ts`
- Ensure consistent behavior

### World State Verification (CRITICAL)

**Actions must be tested for actual world state changes, not just events.**

The "dropping bug" revealed that actions can appear to work (good messages, correct events) while failing to actually change state. All mutation actions must include tests that verify the world state changed.

**Test Pattern:**
```typescript
test('should actually move item to player inventory', () => {
  const { world, player, room } = setupBasicWorld();
  const ball = world.createEntity('ball', 'object');
  world.moveEntity(ball.id, room.id);

  // PRECONDITION: Verify initial state
  expect(world.getLocation(ball.id)).toBe(room.id);

  const context = createRealTestContext(takingAction, world, command);
  takingAction.validate(context);
  takingAction.execute(context);

  // POSTCONDITION: Verify state actually changed
  expect(world.getLocation(ball.id)).toBe(player.id);
});
```

**Helper Utilities** (in `packages/stdlib/tests/test-utils/index.ts`):
```typescript
// Location verification
expectLocation(world, ball.id, player.id);
expectLocationChanged(world, ball.id, room.id, player.id);

// Trait property verification
expectTraitValue(door, TraitType.OPENABLE, 'isOpen', true);
expectTraitChanged(door, TraitType.OPENABLE, 'isOpen', false, true);

// State snapshots for debugging
const before = captureEntityState(world, item.id);
action.execute(context);
const after = captureEntityState(world, item.id);
```

**Required Tests by Action Type:**

| Action Type | Required Verification |
|-------------|----------------------|
| Movement (take, drop, put) | `world.getLocation()` changed |
| Property (open, lock, switch) | Trait property changed |
| Consumption (eat, drink) | Servings/amount decremented |
| Player movement (go, enter, exit) | Player location changed |

## Common Patterns

### Checking Entity Capabilities
```typescript
// Check single trait
if (entity.has(TraitType.CONTAINER)) { }

// Check multiple traits
if (entity.hasAll(TraitType.OPENABLE, TraitType.LOCKABLE)) { }

// Get trait and check property
const container = entity.get(TraitType.CONTAINER)
if (container?.open) { }
```

### World Queries
```typescript
// Find all doors
const doors = world.findByTrait(TraitType.DOOR)

// Get room contents
const items = world.getContents(room.id)

// Check visibility
if (world.canSee(player.id, target.id)) { }
```

### Creating Events
```typescript
// In report phase
return [
  context.event('if.event.taken', { item: noun.name }),
  context.event('action.success', { 
    actionId: IFActions.TAKING,
    messageId: 'taken' 
  })
]
```

## File Structure

```
packages/
  world-model/        # Core world representation
    src/
      entities/       # Entity system
      traits/         # Trait definitions
      behaviors/      # Pure game logic
      world/          # World model implementation
      
  stdlib/             # Standard library
    src/
      actions/        # Action implementations
        standard/     # Standard IF actions
        base/         # Base action types
      scope/          # Scope resolution
      validation/     # Command validation
      
  engine/             # Game engine
    src/
      command-executor.ts  # Orchestrates action execution
      action-context-factory.ts  # Creates ActionContext
      game-engine.ts       # Main game loop
```

## Key Interfaces

### ISemanticEvent
```typescript
interface ISemanticEvent {
  type: string          // Event type (e.g., 'if.event.taken')
  data: any            // Event-specific data
  timestamp?: number   // When event occurred
  turn?: number        // Game turn number
}
```

### ValidationResult  
```typescript
interface ValidationResult {
  valid: boolean       // Can action proceed?
  error?: string      // Error code if invalid
  params?: Record<string, any>  // Error parameters
}
```

### Action
```typescript
interface Action {
  id: string           // Action identifier
  validate(context: ActionContext): ValidationResult
  execute(context: ActionContext): void
  report(context: ActionContext): ISemanticEvent[]
}
```

## Extensibility Patterns

### Event Handler Override Pattern
Stories can override default behavior by handling events:

```typescript
// Default behavior in text service
textService.on('if.action.about', (event) => {
  // Standard about display from story config
})

// Story can override
story.on('if.action.about', (event) => {
  // Custom about display (ASCII art, menu, etc.)
  event.preventDefault() // Stop default handler
})
```

### Signal Action Pattern
For meta-actions that don't mutate world state:

```typescript
export const metaAction: Action = {
  validate(): ValidationResult {
    return { valid: true } // Usually always succeeds
  },
  execute(): void {
    // Empty - no world mutations
  },
  report(): ISemanticEvent[] {
    return [{ type: 'if.action.meta', data: {} }]
  }
}
```

This pattern enables maximum flexibility - the action just signals intent, allowing stories to handle it however they want.

## Development Workflow

1. **Adding a new trait**: Create in `/packages/world-model/src/traits/`
2. **Adding a new action**: Create in `/packages/stdlib/src/actions/standard/`
3. **Custom game logic**: Add event handlers to entities or story
4. **Testing**: Write unit and integration tests

## Important Notes

- Actions MUST follow the four-phase pattern (validate/execute/report/blocked)
- World mutations ONLY in execute phase
- Event generation ONLY in report phase
- Use `context.sharedData` to pass data between phases
- Never use `(context as any)._*` patterns (context pollution)
- Traits are data + behaviors, not just flags
- Events drive both output and game logic
- Not all actions need data builders - signal actions don't transform state
- Keep actions simple - complexity belongs in behaviors or event handlers
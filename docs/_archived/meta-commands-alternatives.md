# Non-Invasive Meta-Command Implementation Alternatives

## Problem Statement
Adding `isMeta` to the base Action interface is too invasive and requires modifying core types. We need a solution that:
- Doesn't modify existing interfaces
- Works with current ActionContext
- Is easy to identify and check
- Maintains backwards compatibility

## Alternative Approaches

### Option 1: Event-Based Signaling
**Use a special event type that signals meta behavior**

```typescript
// In author commands
execute(context: ActionContext): SemanticEvent[] {
  return [
    context.event('meta.signal', { suppressTurn: true }),
    context.event('author.parser_events', { ... }),
    // other events
  ];
}

// In game engine
const hasMetaSignal = result.events.some(e => e.type === 'meta.signal');
if (!hasMetaSignal) {
  this.updateContext(result);
  this.updateCommandHistory(result, input, turn);
}
```

**Pros:**
- No interface changes
- Uses existing event system
- Can add metadata to the signal

**Cons:**
- Requires scanning events
- Less explicit than a property

### Option 2: MetaAction Base Class
**Create a base class that meta-commands extend**

```typescript
// New base class in stdlib
export abstract class MetaAction implements Action {
  abstract id: string;
  abstract verbs: string[];
  
  // Mark this class as meta
  readonly __meta = true;
  
  abstract execute(context: ActionContext): SemanticEvent[];
}

// Author commands extend MetaAction
export class ParserEventsAction extends MetaAction {
  id = 'author.parser_events';
  verbs = ['parser'];
  
  execute(context: ActionContext): SemanticEvent[] {
    // implementation
  }
}

// In game engine
const action = this.actionRegistry.get(result.actionId);
const isMeta = action && '__meta' in action && action.__meta === true;
```

**Pros:**
- Type-safe inheritance
- Clear semantic meaning
- No core interface changes

**Cons:**
- Requires refactoring existing meta-commands
- Inheritance can be limiting

### Option 3: Meta Registry
**Maintain a registry of meta-command IDs**

```typescript
// In stdlib
export class MetaCommandRegistry {
  private static metaCommands = new Set<string>();
  
  static register(actionId: string): void {
    this.metaCommands.add(actionId);
  }
  
  static isMeta(actionId: string): boolean {
    return this.metaCommands.has(actionId);
  }
}

// Register author commands
MetaCommandRegistry.register('author.parser_events');
MetaCommandRegistry.register('author.validation_events');
MetaCommandRegistry.register('author.system_events');

// In game engine
import { MetaCommandRegistry } from '@sharpee/stdlib';

if (!MetaCommandRegistry.isMeta(result.actionId)) {
  this.updateContext(result);
  this.updateCommandHistory(result, input, turn);
}
```

**Pros:**
- Zero changes to existing types
- Centralized management
- Easy to add/remove meta status

**Cons:**
- Separate from action definition
- Requires registration step

### Option 4: Action ID Convention
**Use naming convention to identify meta-commands**

```typescript
// Meta-commands start with specific prefixes
const META_PREFIXES = ['author.', 'debug.', 'transcript.', 'meta.'];

// In game engine
const isMeta = META_PREFIXES.some(prefix => 
  result.actionId.startsWith(prefix)
);

if (!isMeta) {
  this.updateContext(result);
  this.updateCommandHistory(result, input, turn);
}
```

**Pros:**
- Zero code changes needed
- Self-documenting naming
- Works immediately

**Cons:**
- Convention-based (not enforced)
- Less flexible

### Option 5: MetaActionContext
**Create a specialized context for meta-commands**

```typescript
// New context type
export interface MetaActionContext extends ActionContext {
  readonly isMeta: true;
}

// Action optionally accepts MetaActionContext
export interface Action {
  execute(context: ActionContext | MetaActionContext): SemanticEvent[];
}

// In command executor
const context = isMetaCommand ? 
  createMetaActionContext(...) : 
  createActionContext(...);
```

**Pros:**
- Type-safe context differentiation
- Can add meta-specific helpers

**Cons:**
- Requires determining meta status before execution
- More complex context creation

### Option 6: Capability-Based
**Use the world capability system**

```typescript
// Register meta-command capability
world.registerCapability('meta-commands', {
  schema: {
    registeredCommands: { type: 'array', default: [] }
  }
});

// Add meta-commands to capability
world.updateCapability('meta-commands', {
  registeredCommands: [
    'author.parser_events',
    'author.validation_events',
    'author.system_events'
  ]
});

// Check in engine
const metaData = world.getCapability('meta-commands');
const isMeta = metaData?.registeredCommands.includes(result.actionId);
```

**Pros:**
- Uses existing systems
- Configurable per world/story
- Can be saved/restored

**Cons:**
- More setup required
- Runtime configuration

## Recommendation: Hybrid Approach

**Combine Option 2 (MetaAction base class) with Option 3 (Registry) for maximum flexibility:**

```typescript
// 1. Create MetaAction base class for new meta-commands
export abstract class MetaAction implements Action {
  abstract id: string;
  abstract verbs: string[];
  
  constructor() {
    // Auto-register on construction
    MetaCommandRegistry.register(this.id);
  }
  
  abstract execute(context: ActionContext): SemanticEvent[];
}

// 2. Use registry for existing commands or dynamic registration
export class MetaCommandRegistry {
  private static metaCommands = new Set<string>([
    // Pre-registered standard meta-commands
    'saving', 'restoring', 'quitting', 'restarting',
    'score', 'version', 'transcript'
  ]);
  
  static register(actionId: string): void {
    this.metaCommands.add(actionId);
  }
  
  static isMeta(actionId: string): boolean {
    return this.metaCommands.has(actionId);
  }
}

// 3. Check in engine (single point of truth)
if (!MetaCommandRegistry.isMeta(result.actionId)) {
  this.updateContext(result);
  this.updateCommandHistory(result, input, turn);
}
```

**Benefits:**
- Non-invasive (no core type changes)
- Flexible (supports both inheritance and registration)
- Backwards compatible (can register existing actions)
- Single source of truth (registry)
- Self-registering for new commands
- Minimal engine changes

## Implementation Steps

1. Create `MetaAction` base class in stdlib
2. Create `MetaCommandRegistry` in stdlib
3. Refactor author commands to extend `MetaAction`
4. Update game engine to check registry
5. Pre-register standard meta-commands
6. Test with existing and new meta-commands

This approach provides the benefits of type safety and explicit meta-command identification without requiring invasive changes to core interfaces.
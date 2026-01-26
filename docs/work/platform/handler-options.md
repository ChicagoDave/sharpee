# Handler Architecture Options

**Created**: 2026-01-26
**Status**: Analysis
**Context**: ADR-117 distinguishes handlers from behaviors, but handlers themselves lack structure

## Current State

Handlers are functions registered with the event system:

```typescript
world.registerEventHandler('if.event.put_in', (event: ISemanticEvent, world: IWorldModel) => {
  // arbitrary code
});
```

**Problems:**
- No categorization - all handlers look the same
- No introspection - can't list what handlers exist or what they do
- No lifecycle - handlers can't be disabled, prioritized, or replaced
- No documentation - purpose lives in comments only
- No testability - hard to test handlers in isolation

---

## Option 1: Formal Classification

Define named categories with specific purposes. Handlers declare which category they belong to.

### Design

```typescript
type HandlerCategory =
  | 'cascade'      // Triggers secondary effects (machine state after PUT)
  | 'observer'     // Passive observation (scoring, analytics)
  | 'coordinator'  // Multi-entity orchestration (river system)
  | 'guardian'     // Protects invariants (can't drop item in lava)
  | 'narrator'     // Adds flavor text (room atmosphere changes)
  ;

function registerHandler(
  eventType: string,
  category: HandlerCategory,
  handler: EventHandler
): void;
```

### Usage

```typescript
registerHandler('if.event.put_in', 'cascade', (event, world) => {
  // Coal in machine → update machine state
});

registerHandler('if.event.taken', 'observer', (event, world) => {
  // Track treasure for scoring
});
```

### Pros

| Benefit | Explanation |
|---------|-------------|
| **Self-documenting** | Category name conveys intent |
| **Minimal change** | Just adds a string parameter |
| **Groupable** | Can list/disable handlers by category |
| **Low learning curve** | Easy to understand and use |

### Cons

| Drawback | Explanation |
|----------|-------------|
| **Subjective** | "Is this cascade or coordinator?" - fuzzy boundaries |
| **No enforcement** | Category is advisory, code can do anything |
| **Limited introspection** | Still can't see what entities are affected |
| **Doesn't solve testability** | Still a closure, hard to unit test |

### Verdict

**Lightweight but weak.** Good for documentation, doesn't solve structural problems.

---

## Option 2: Declarative Metadata

Handlers declare what they listen to, what entities they affect, and their purpose.

### Design

```typescript
interface HandlerDeclaration {
  id: string;
  name: string;
  listensTo: string[];           // Event types
  affects?: string[];            // Entity IDs or patterns
  category: HandlerCategory;
  description: string;
  handler: EventHandler;
}

function declareHandler(declaration: HandlerDeclaration): void;
```

### Usage

```typescript
declareHandler({
  id: 'dungeo.handler.coal_machine',
  name: 'Coal Machine Cascade',
  listensTo: ['if.event.put_in'],
  affects: ['dungeo.entity.coal_machine'],
  category: 'cascade',
  description: 'Updates machine state when coal is inserted',
  handler: (event, world) => {
    // implementation
  }
});
```

### Pros

| Benefit | Explanation |
|---------|-------------|
| **Rich introspection** | Can query handlers by event, entity, category |
| **Self-documenting** | Metadata serves as documentation |
| **Debuggable** | "Why did X happen?" → list handlers that affect X |
| **Filterable** | Can disable handlers by pattern |
| **IDE support** | Structured object = autocomplete |

### Cons

| Drawback | Explanation |
|----------|-------------|
| **Boilerplate** | More code to write per handler |
| **Metadata drift** | `affects` might not match actual code |
| **Still a closure** | Handler function is still opaque |
| **Complexity** | More concepts for authors to learn |

### Verdict

**Good documentation, questionable enforcement.** The `affects` field is aspirational - nothing prevents the handler from affecting other entities. Could be useful for debugging tools.

---

## Option 3: Structured Interface

Handlers have explicit phases or return types, similar to actions/behaviors.

### Design

```typescript
interface StructuredHandler {
  id: string;
  eventTypes: string[];

  /** Should this handler run for this event? */
  condition(event: ISemanticEvent, world: IWorldModel): boolean;

  /** Perform the handler's work, return effects */
  execute(event: ISemanticEvent, world: IWorldModel): HandlerEffect[];
}

type HandlerEffect =
  | { type: 'mutate'; entityId: string; mutation: () => void }
  | { type: 'emit'; event: ISemanticEvent }
  | { type: 'message'; messageId: string }
  ;
```

### Usage

```typescript
const coalMachineHandler: StructuredHandler = {
  id: 'dungeo.handler.coal_machine',
  eventTypes: ['if.event.put_in'],

  condition(event, world) {
    return event.data?.targetId === 'dungeo.entity.coal_machine';
  },

  execute(event, world) {
    return [
      { type: 'mutate', entityId: 'dungeo.entity.coal_machine', mutation: () => {
        const machine = world.getEntity('dungeo.entity.coal_machine');
        machine.get(MachineTrait).hasCoal = true;
      }},
      { type: 'message', messageId: 'dungeo.machine.coal_inserted' }
    ];
  }
};
```

### Pros

| Benefit | Explanation |
|---------|-------------|
| **Explicit mutations** | Effects declare what they'll change |
| **Testable** | Can test condition/execute separately |
| **Composable** | Effects can be filtered, logged, replayed |
| **Consistent** | Matches action/behavior 4-phase pattern |
| **Traceable** | Mutation effects show exactly what changed |

### Cons

| Drawback | Explanation |
|----------|-------------|
| **Significant refactor** | All handlers need rewriting |
| **Verbose** | Simple handlers become complex |
| **Effect overhead** | Wrapping mutations in effects adds indirection |
| **Overkill?** | Handlers are meant to be simple reactions |

### Verdict

**Architecturally clean but heavy.** This essentially makes handlers into "mini-actions". Question: if handlers need this much structure, should they just be behaviors instead?

---

## Option 4: Handler Registry

Centralized registration with introspection, lifecycle management, and replacement.

### Design

```typescript
class HandlerRegistry {
  register(handler: RegisteredHandler): void;
  unregister(handlerId: string): void;
  replace(handlerId: string, newHandler: EventHandler): void;

  // Introspection
  getHandlersForEvent(eventType: string): RegisteredHandler[];
  getHandlerById(id: string): RegisteredHandler | undefined;
  getAllHandlers(): RegisteredHandler[];

  // Lifecycle
  enable(handlerId: string): void;
  disable(handlerId: string): void;
  isEnabled(handlerId: string): boolean;

  // Execution
  dispatch(event: ISemanticEvent, world: IWorldModel): void;
}

interface RegisteredHandler {
  id: string;
  eventTypes: string[];
  priority: number;
  enabled: boolean;
  handler: EventHandler;
}
```

### Usage

```typescript
// Registration
handlerRegistry.register({
  id: 'dungeo.handler.coal_machine',
  eventTypes: ['if.event.put_in'],
  priority: 100,
  enabled: true,
  handler: (event, world) => { /* ... */ }
});

// Introspection
const putHandlers = handlerRegistry.getHandlersForEvent('if.event.put_in');
console.log(`${putHandlers.length} handlers for put_in`);

// Lifecycle
handlerRegistry.disable('dungeo.handler.coal_machine');  // For testing
handlerRegistry.replace('dungeo.handler.coal_machine', newHandler);  // Hot swap

// Debugging
handlerRegistry.getAllHandlers().forEach(h => {
  console.log(`${h.id}: ${h.eventTypes.join(', ')} [${h.enabled ? 'ON' : 'OFF'}]`);
});
```

### Pros

| Benefit | Explanation |
|---------|-------------|
| **Full introspection** | List all handlers, query by event |
| **Lifecycle control** | Enable/disable without code changes |
| **Replaceable** | Swap handlers for testing or extension |
| **Priority ordering** | Control execution order |
| **Debuggable** | Tools can show what handlers exist |
| **Extensible** | Third parties can add/replace handlers |

### Cons

| Drawback | Explanation |
|----------|-------------|
| **Global state** | Registry is effectively a singleton |
| **Indirection** | One more layer between event and handler |
| **ID conflicts** | Need naming conventions |
| **Doesn't fix handler internals** | Handler function still opaque |

### Verdict

**Good infrastructure, orthogonal to handler structure.** Solves lifecycle/introspection but doesn't address what handlers *do*. Could be combined with other options.

---

## Analysis: What Problem Are We Solving?

Let me step back and identify the actual problems:

### Problem A: "What handlers exist and what do they do?"
- **Solved by**: Options 2, 4 (metadata, registry)
- **Not solved by**: Options 1, 3

### Problem B: "Why did this state change happen?"
- **Solved by**: Option 3 (explicit effects), partially by Option 2
- **Not solved by**: Options 1, 4

### Problem C: "How do I test this handler?"
- **Solved by**: Option 3 (condition/execute separation)
- **Partially by**: Option 4 (can disable other handlers)
- **Not solved by**: Options 1, 2

### Problem D: "How do I extend/replace a handler?"
- **Solved by**: Option 4 (registry with replace)
- **Not solved by**: Options 1, 2, 3

### Problem E: "Should this be a handler at all?"
- **This is ADR-117's question** - maybe the real answer is "fewer handlers, more behaviors"

---

## Recommendation: Hybrid Approach

Combine **Option 2 (Metadata)** + **Option 4 (Registry)**, but keep handlers simple.

### Rationale

1. **Most handlers should become behaviors** (ADR-117)
   - Reduces handler count from ~30 to ~10
   - Remaining handlers are truly cross-cutting

2. **Remaining handlers need introspection, not structure**
   - Scoring handler doesn't need phases
   - It needs to be listable, debuggable, replaceable

3. **Heavy structure is overkill for reactions**
   - If a handler needs 4-phase pattern, it should be a behavior
   - Handlers should be simple: "when X happens, do Y"

### Proposed Design

```typescript
interface HandlerDeclaration {
  id: string;
  name: string;
  description: string;
  eventTypes: string[];
  category: 'observer' | 'cascade' | 'coordinator';
  priority?: number;  // Default 100, higher runs first
  handler: (event: ISemanticEvent, world: IWorldModel) => void;
}

class HandlerRegistry {
  declare(declaration: HandlerDeclaration): void;

  // Introspection
  getAll(): HandlerDeclaration[];
  getForEvent(eventType: string): HandlerDeclaration[];
  getById(id: string): HandlerDeclaration | undefined;

  // Lifecycle
  enable(id: string): void;
  disable(id: string): void;

  // For testing
  replace(id: string, newHandler: EventHandler): () => void;  // Returns restore function
}
```

### Migration Path

1. **Phase 1**: Create registry, migrate existing handlers to declarations
2. **Phase 2**: Migrate entity-specific handlers to behaviors (ADR-117)
3. **Phase 3**: Remaining handlers are cross-cutting, well-documented

### What We Gain

- **Listable**: `registry.getAll()` shows all handlers
- **Debuggable**: "Why did score change?" → check observer handlers
- **Testable**: Disable handlers during tests, replace with mocks
- **Documented**: Metadata serves as documentation
- **Simple**: Handlers stay as simple functions

### What We Don't Do

- No effect system for handlers (too heavy)
- No condition/execute split (just use `if` in handler)
- No compile-time enforcement (metadata is advisory)

---

## Decision Needed

1. **Proceed with hybrid (Option 2 + 4)?**
2. **Just do Option 4 (registry only)?**
3. **Do nothing - ADR-117 is enough?**
4. **Something else?**

The key question: **How important is handler introspection vs. just migrating handlers to behaviors?**

If we migrate most handlers to behaviors, the remaining few might not need elaborate infrastructure.

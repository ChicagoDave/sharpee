# Capability Dispatch: A Pattern for Extensible Action Resolution

**White Paper**
**Sharpee Interactive Fiction Engine**
**January 2026**

---

## Abstract

Sharpee's Capability Dispatch system solves a fundamental problem in extensible software: how do you allow third-party code to modify the behavior of standard operations without subclassing, monkey-patching, or invasive hooks?

This paper describes a pattern combining **double dispatch**, **composition over inheritance**, and a **behavior registry** to create a system where:

- Standard actions have default semantics
- Entities can override or block actions via traits
- Behaviors are registered externally and resolved at runtime
- The system is extensible at three levels: platform, extensions, and applications

While developed for interactive fiction, this pattern applies broadly to any domain with entities, operations, and extensibility requirements.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Traditional Solutions and Their Limitations](#traditional-solutions-and-their-limitations)
3. [Capability Dispatch Architecture](#capability-dispatch-architecture)
4. [Design Patterns Employed](#design-patterns-employed)
5. [Implementation](#implementation)
6. [Real-World Analogies](#real-world-analogies)
7. [Benefits and Trade-offs](#benefits-and-trade-offs)
8. [Conclusion](#conclusion)

---

## The Problem

Consider a system where:

- **Entities** exist with varying compositions (a door, a troll, an axe)
- **Actions** can be performed on entities (take, open, attack)
- **Behaviors** vary based on both the action AND the entity's characteristics

The naive approach leads to a combinatorial explosion:

```
M entity types × N actions = M×N behavior implementations
```

With 50 entity types and 40 actions, you'd need 2,000 specialized handlers. Worse, adding a new action requires touching every entity type, and adding a new entity type requires implementing every action.

### The Interactive Fiction Example

In a text adventure game:

- Player types `TAKE AXE`
- Standard behavior: move axe to player's inventory
- But THIS axe belongs to a living troll
- Desired behavior: block with "The troll's axe seems white-hot. You can't hold on to it."

How do we let the axe (or more precisely, something about the axe) override the standard taking behavior?

### The General Form

This problem appears whenever you have:

```
Entity (with attributes) × Operation → Behavior
```

And you want the behavior to be:
1. Determined at runtime based on entity state
2. Extensible without modifying core code
3. Composable from multiple sources (platform, extensions, application)

---

## Traditional Solutions and Their Limitations

### Subclassing (Inheritance)

```typescript
class TrollAxe extends Axe {
  take(actor: Actor): Result {
    if (this.troll.isAlive) {
      return blocked("white_hot_message");
    }
    return super.take(actor);
  }
}
```

**Problems:**
- Rigid hierarchy; an item can't be both a TrollAxe and a MagicWeapon
- New actions require adding methods to base classes
- Diamond inheritance problems
- Can't add behaviors from external packages

### Event Hooks (Observer Pattern)

```typescript
world.on('before:take', (event) => {
  if (event.target.id === 'axe' && troll.isAlive) {
    event.cancel("white_hot_message");
  }
});
```

**Problems:**
- Global handlers; hard to trace which handler affects which entity
- Order-dependent; handlers fight for priority
- Weak typing; handlers receive generic events
- No structured way to register/unregister

### Visitor Pattern

```typescript
class TakeVisitor {
  visitAxe(axe: Axe): Result { /* standard */ }
  visitTrollAxe(axe: TrollAxe): Result { /* blocked */ }
  visitDoor(door: Door): Result { /* can't take */ }
}
```

**Problems:**
- Visitor must know all entity types upfront
- Adding new entity types requires modifying visitor
- Entity types leak into action code

### Strategy via Callbacks

```typescript
axe.onTake = (actor) => {
  if (troll.isAlive) return blocked();
  return defaultTake(actor);
};
```

**Problems:**
- Ad-hoc; no structure or discoverability
- Can only have one handler per action
- No composition or layering

---

## Capability Dispatch Architecture

Capability Dispatch separates the problem into four concerns:

### 1. Traits (Capabilities Declaration)

Traits are composable units of data and capability claims attached to entities:

```typescript
class TrollAxeTrait implements ITrait {
  static readonly type = 'dungeo.trait.troll_axe';
  static readonly capabilities = ['if.action.taking'] as const;

  guardianId: EntityId;  // Reference to the troll
}
```

Key properties:
- Traits declare which actions they can handle via `capabilities`
- Traits contain data, not behavior
- Entities can have multiple traits
- Traits are added/removed at runtime

### 2. Behaviors (Capability Implementation)

Behaviors implement the four-phase action pattern for a specific trait+action combination:

```typescript
const TrollAxeTakingBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    const trait = entity.get<TrollAxeTrait>('dungeo.trait.troll_axe');
    const guardian = world.getEntity(trait.guardianId);
    if (guardian && CombatBehavior.isAlive(guardian)) {
      return { valid: false, error: 'dungeo.axe.white_hot' };
    }
    return { valid: true };
  },

  execute(entity, world, actorId, sharedData) {
    // Not needed - standard taking handles it
  },

  report(entity, world, actorId, sharedData) {
    return [];
  },

  blocked(entity, world, actorId, error, sharedData) {
    return [{ type: 'action.blocked', payload: { messageId: error } }];
  }
};
```

### 3. Registry (Binding)

The registry connects trait types to behaviors for specific actions:

```typescript
registerCapabilityBehavior(
  TrollAxeTrait.type,        // 'dungeo.trait.troll_axe'
  'if.action.taking',        // Action ID
  TrollAxeTakingBehavior     // Behavior implementation
);
```

The registry is a simple map:
```
Key: "{traitType}:{actionId}"
Value: CapabilityBehavior
```

### 4. Dispatch (Resolution)

At runtime, when an action executes:

```typescript
// 1. Find trait on entity that claims this capability
const trait = findTraitWithCapability(entity, actionId);

// 2. If found, get the registered behavior
if (trait) {
  const behavior = getBehaviorForCapability(trait, actionId);

  // 3. Let behavior validate first (can block)
  const result = behavior.validate(entity, world, actorId, {});
  if (!result.valid) {
    return blocked(result.error);
  }
}

// 4. Proceed with standard action logic
return standardAction.validate(context);
```

### The Flow

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Action    │────▶│   Entity     │────▶│    Trait       │
│  (taking)   │     │   (axe)      │     │ (TrollAxeTrait)│
└─────────────┘     └──────────────┘     └────────────────┘
                                                  │
                                                  │ claims 'if.action.taking'
                                                  ▼
                    ┌──────────────┐     ┌────────────────┐
                    │   Registry   │────▶│   Behavior     │
                    │              │     │ (validate/exec)│
                    └──────────────┘     └────────────────┘
```

---

## Design Patterns Employed

Capability Dispatch combines several established patterns:

### Double Dispatch

Traditional single dispatch selects a method based on one type (the receiver):

```typescript
entity.take()  // Dispatch based on entity's class
```

Double dispatch selects based on TWO types:

```
Action Type × Trait Type → Behavior
```

This avoids the need for entity classes to know about all possible actions, and for actions to know about all possible entity types.

### Strategy Pattern

Behaviors are interchangeable strategies implementing a common interface:

```typescript
interface CapabilityBehavior {
  validate(entity, world, actorId, sharedData): ValidationResult;
  execute(entity, world, actorId, sharedData): void;
  report(entity, world, actorId, sharedData): Effect[];
  blocked(entity, world, actorId, error, sharedData): Effect[];
}
```

Different behaviors can be swapped in for the same trait+action combination (useful for testing or difficulty modes).

### Registry Pattern

A central registry holds bindings and provides lookup:

```typescript
const behaviorRegistry = new Map<string, TraitBehaviorBinding>();

function registerCapabilityBehavior(traitType, capability, behavior) {
  behaviorRegistry.set(`${traitType}:${capability}`, { ... });
}

function getBehaviorForCapability(trait, capability) {
  return behaviorRegistry.get(`${trait.type}:${capability}`)?.behavior;
}
```

### Composition Over Inheritance

Entities don't inherit from specialized classes. Instead, they're composed of traits:

```typescript
const axe = world.createEntity('axe', EntityType.ITEM);
axe.add(new IdentityTrait({ name: 'bloody axe', ... }));
axe.add(new TrollAxeTrait({ guardianId: troll.id }));
// axe.add(new MagicWeaponTrait({ ... }));  // Can add more!
```

An entity's behavior emerges from its trait composition, not its position in a class hierarchy.

### Extension Object Pattern

Traits act as extension objects - they extend an entity's capabilities without modifying its core class. The entity doesn't need to know what traits might be attached to it.

---

## Implementation

### Trait Definition

```typescript
// packages/world-model/src/traits/trait.ts
export interface ITrait {
  readonly type: string;
}

export interface ITraitConstructor {
  readonly type: string;
  readonly capabilities?: readonly string[];
  new(...args: any[]): ITrait;
}
```

### Capability Discovery

```typescript
// packages/world-model/src/capabilities/capability-discovery.ts
export function findTraitWithCapability(
  entity: IFEntity,
  capability: string
): ITrait | undefined {
  for (const trait of entity.traits) {
    const constructor = trait.constructor as ITraitConstructor;
    if (constructor.capabilities?.includes(capability)) {
      return trait;
    }
  }
  return undefined;
}
```

### Behavior Registration

```typescript
// packages/world-model/src/capabilities/capability-registry.ts
const behaviorRegistry = new Map<string, TraitBehaviorBinding>();

export function registerCapabilityBehavior(
  traitType: string,
  capability: string,
  behavior: CapabilityBehavior
): void {
  const key = `${traitType}:${capability}`;
  if (behaviorRegistry.has(key)) {
    throw new Error(`Behavior already registered for ${key}`);
  }
  behaviorRegistry.set(key, { traitType, capability, behavior });
}
```

### Engine Integration

```typescript
// packages/engine/src/action-executor.ts
private executeAction(action: Action, context: ActionContext): ActionResult {
  // Check for capability-based blocking BEFORE standard validation
  const blockResult = this.checkCapabilityBlocking(action, context);
  if (blockResult) {
    return this.handleBlocked(action, context, blockResult);
  }

  // Proceed with standard action flow
  const validationResult = action.validate(context);
  // ... rest of action execution
}

private checkCapabilityBlocking(
  action: Action,
  context: ActionContext
): ValidationResult | null {
  const target = context.command.directObject?.entity;
  if (!target) return null;

  const trait = findTraitWithCapability(target, action.id);
  if (!trait) return null;

  const behavior = getBehaviorForCapability(trait, action.id);
  if (!behavior) return null;

  const result = behavior.validate(target, context.world, context.player.id, {});
  return result.valid ? null : result;
}
```

---

## Real-World Analogies

This pattern appears in many domains beyond interactive fiction:

### Authorization / Policy Engines (ABAC)

```
Resource (attributes) × Action (operation) → Policy Decision
```

**Examples:** Open Policy Agent (OPA), AWS IAM, Azure RBAC

A request to `DELETE` a resource with `SensitiveData=true` attribute triggers a different policy than the same operation on a regular resource. The policy engine performs double dispatch based on resource attributes and requested operation.

**Mapping:**
| Sharpee | ABAC |
|---------|------|
| Entity | Resource |
| Trait | Resource Attribute |
| Action | Operation (read/write/delete) |
| Behavior | Policy Rule |
| Registry | Policy Store |

### HTTP Content Negotiation

```
Request (headers) × Route (endpoint) → Handler
```

**Examples:** Express.js middleware, ASP.NET Core, JAX-RS

A `POST /users` request with `Content-Type: application/json` routes to a different handler than the same endpoint with `Content-Type: application/xml`. The framework dispatches based on route AND request attributes.

**Mapping:**
| Sharpee | HTTP |
|---------|------|
| Entity | Request |
| Trait | Header (Content-Type, Accept-Language) |
| Action | Route/Method |
| Behavior | Handler |
| Registry | Route Table + Content Handlers |

### Business Rule Engines

```
Facts (entity state) × Event (trigger) → Rule Firing
```

**Examples:** Drools, IBM ODM, Azure Logic Apps

An insurance claim with `ClaimType=Medical` and `Amount>10000` triggers different processing rules than a small auto claim. The rule engine matches facts against conditions and fires appropriate rules.

**Mapping:**
| Sharpee | Rule Engine |
|---------|-------------|
| Entity | Fact/Working Memory Object |
| Trait | Fact Attributes |
| Action | Event/Trigger |
| Behavior | Rule Consequence |
| Registry | Rule Base |

### Plugin/Extension Systems

```
Context (host state) × Extension Point (hook) → Plugin Handler
```

**Examples:** VSCode extensions, WordPress hooks, Webpack plugins

A file with `.md` extension triggers the Markdown formatter plugin when the "format" command is invoked. The host dispatches based on context (file type) AND extension point (command).

**Mapping:**
| Sharpee | Plugin System |
|---------|---------------|
| Entity | Context/Document |
| Trait | Context Attributes (file type, mode) |
| Action | Extension Point/Hook |
| Behavior | Plugin Handler |
| Registry | Extension Registry |

### Medical Clinical Decision Support

```
Patient (conditions) × Order (medication) → CDS Alert
```

**Examples:** Epic CDS, Cerner Alerts, HL7 FHIR CDS Hooks

A patient with `Condition=Diabetes` receiving a prescription for a contraindicated medication triggers a clinical alert. The CDS system dispatches based on patient attributes AND the clinical action.

**Mapping:**
| Sharpee | Medical CDS |
|---------|-------------|
| Entity | Patient |
| Trait | Condition/Allergy/Lab Result |
| Action | Order/Prescription |
| Behavior | CDS Rule/Alert |
| Registry | Knowledge Base |

### The Common Thread

All these systems share the fundamental challenge:

> **How do you determine behavior based on BOTH what you're operating on AND what operation you're performing, in an extensible way?**

The solutions converge on similar architectures:
1. Entities/resources with composable attributes
2. Operations/actions as first-class concepts
3. External registration of handlers
4. Runtime dispatch based on attribute+operation matching

---

## Benefits and Trade-offs

### Benefits

**Extensibility Without Modification**
- Add new entity behaviors without changing entity classes
- Add new actions without changing trait definitions
- Three-tier extension: platform → extensions → application

**Composition Over Inheritance**
- Entities combine multiple traits freely
- No diamond inheritance problems
- Behaviors compose naturally

**Separation of Concerns**
- Traits define data and capability claims
- Behaviors implement logic
- Registry manages bindings
- Actions orchestrate flow

**Testability**
- Behaviors are pure functions (entity, world, actor → result)
- Registry can be cleared/mocked for testing
- No hidden global state in entities

**Discoverability**
- `getAllCapabilityBindings()` shows all registered behaviors
- Traits explicitly declare their capabilities
- Clear audit trail of what handles what

### Trade-offs

**Indirection**
- Behavior isn't on the entity; must trace through registry
- Debugging requires understanding the dispatch flow
- IDE "go to definition" doesn't work naturally

**Registration Timing**
- Behaviors must be registered before use
- Order of registration matters for initialization
- Missing registrations fail at runtime, not compile time

**Single Behavior Per Trait+Action**
- Can't have multiple behaviors for same combination
- Must compose within a single behavior if needed
- No built-in priority/ordering for multiple handlers

**Runtime Cost**
- Trait iteration and map lookup on every action
- Negligible for IF (tens of entities) but consider for high-frequency systems

### Mitigations

**For Indirection:**
- Consistent naming: `{Entity}{Action}Behavior`
- Logging/tracing in dispatch path
- Documentation of capability chains

**For Registration:**
- Fail-fast validation on startup
- Type-safe registration helpers
- Clear initialization order in stories

**For Single Behavior:**
- Behaviors can delegate to sub-behaviors
- Chain of responsibility within a behavior
- Explicit composition patterns

---

## Conclusion

Capability Dispatch provides a principled solution to the entity×operation combinatorial problem. By combining double dispatch, composition, and a behavior registry, it enables:

- **Platform code** to define standard action semantics
- **Extension packages** to add reusable mechanics
- **Application code** to customize per-entity behavior

The pattern appears across diverse domains—authorization systems, HTTP frameworks, rule engines, plugin architectures, and clinical decision support—suggesting it addresses a fundamental need in extensible software design.

For Sharpee, Capability Dispatch means a text adventure's troll can have a "white-hot axe" that blocks taking with a custom message, without modifying the taking action, without subclassing the axe, and without global event handlers. The troll story adds a trait, registers a behavior, and the engine handles the rest.

The axe doesn't know it's special. The taking action doesn't know about trolls. The magic happens in the space between them.

---

## References

- **ADR-090**: Entity-Centric Action Dispatch (Sharpee Architecture Decision Record)
- **Gamma et al.**: Design Patterns (Visitor, Strategy, Registry patterns)
- **Fowler**: Patterns of Enterprise Application Architecture (Plugin, Registry)
- **OASIS XACML**: Attribute-Based Access Control specification
- **HL7 FHIR CDS Hooks**: Clinical Decision Support specification

---

*Sharpee is an open-source interactive fiction engine. For more information, see the project repository.*

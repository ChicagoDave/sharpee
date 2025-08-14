# IF Platform Refactoring Plan: Circular Dependencies & Anti-Patterns

## Executive Summary
This plan addresses architectural issues in Sharpee from an Interactive Fiction platform perspective, focusing on the unique requirements of parser-based IF: world simulation, natural language understanding, narrative flow, and author extensibility.

---

## Core IF Architecture Principles

### What Makes IF Architecture Different
1. **World Model is Central** - Not a "God Object" but the essential simulation
2. **Everything is Bidirectional** - Objects know their containers, containers know contents
3. **Scope is Everything** - What player can see/reach/interact with drives all gameplay
4. **Language and World are Intertwined** - Parser needs world knowledge, world needs language
5. **Actions Transform World State** - Every command potentially changes everything

---

## Phase 1: Embrace IF's Circular Nature (Week 1-2)

### 1.1 Accept Essential Circularities

#### These Aren't Bugs, They're Features:
```
World ↔ Entity: Entities need world context, world contains entities
Container ↔ Contents: Both need to know about each other
Action ↔ World: Actions modify world, world validates actions
Parser ↔ World: Parser needs scope for disambiguation, world needs parser for commands
```

#### Solution: Managed Bidirectional References
```typescript
// Instead of breaking these relationships, manage them properly
interface IWorldContext {
  // Minimal interface for entities to query world
  getLocation(entity: EntityId): EntityId;
  getScope(actor: EntityId): Scope;
  isReachable(from: EntityId, to: EntityId): boolean;
}

interface IEntityContext {
  // Minimal interface for world to query entities
  readonly id: EntityId;
  readonly traits: ReadonlyMap<TraitType, Trait>;
  canContain(other: IEntityContext): boolean;
}
```

### 1.2 Create IF-Specific Dependency Rules

```
┌─────────────────────────────────────┐
│         Parser & Language            │
│    (Understands player intent)       │
└─────────────┬───────────────────────┘
              ↓ Interprets into
┌─────────────────────────────────────┐
│            Actions                   │
│    (Transforms world state)          │
└─────────────┬───────────────────────┘
              ↓ Operates on
┌─────────────────────────────────────┐
│          World Model                 │
│     (The simulation itself)          │
└─────────────┬───────────────────────┘
              ↓ Contains
┌─────────────────────────────────────┐
│      Entities & Traits               │
│    (Things in the world)             │
└─────────────────────────────────────┘
```

---

## Phase 2: World Model as Simulation Core (Week 3-4)

### 2.1 WorldModel Isn't a God Object - It's the Game State

#### Keep These in WorldModel (They Belong Together):
```typescript
class WorldModel {
  // Core simulation state - NOT separable
  private entities: Map<EntityId, Entity>;
  private locations: Map<EntityId, EntityId>;  // Where everything is
  private scope: ScopeCalculator;              // What's visible/reachable
  
  // These MUST be together for consistency
  moveEntity(id: EntityId, to: EntityId): Result {
    // Updates locations, checks capacity, maintains invariants
    // Fires movement events
  }
  
  getVisible(actor: EntityId): Entity[] {
    // Scope calculation needs locations + entity traits
    // Can't be separated without massive coupling
  }
}
```

#### Extract Only Non-Simulation Concerns:
```typescript
// These can be separate services
class SaveSystem {
  save(world: WorldModel): SaveData;
  restore(data: SaveData): WorldModel;
}

class TurnCounter {
  private turns: number = 0;
  increment(): void;
  get(): number;
}
```

### 2.2 The IF Trinity: Parser-World-Actions

```typescript
// These three MUST work together intimately
interface IFCore {
  parser: Parser;      // Understands input
  world: WorldModel;   // Maintains state  
  actions: ActionSet;  // Transforms state
}

// They're coupled because IF demands it
// "TAKE RED BOOK" requires:
// - Parser: identify verb TAKE, adjective RED, noun BOOK
// - World: find red books in scope
// - Action: validate taking, execute transfer
```

---

## Phase 3: Rich IF Entities (Week 5)

### 3.1 Entities as Simulation Objects (Not Anemic)

#### IF Entities Are Active Participants:
```typescript
class IFEntity {
  // State that matters for IF simulation
  private traits: Map<TraitType, Trait>;
  private world: IWorldContext; // Yes, entities know about world!
  
  // Rich IF behaviors
  isVisibleFrom(observer: EntityId): boolean {
    // Complex visibility: darkness, containers, opacity
    const room = this.world.getLocation(observer);
    if (room.isDark && !this.isLightSource) return false;
    if (this.isInClosedContainer()) return false;
    return true;
  }
  
  canBeTakenBy(actor: EntityId): boolean {
    // IF-specific rules
    if (this.isScenery) return false;
    if (this.isFixed) return false;
    if (this.isTooHeavy(actor)) return false;
    if (!this.world.isReachable(actor, this.id)) return false;
    return true;
  }
  
  describeFrom(observer: EntityId): string {
    // Context-aware descriptions
    if (this.world.getLocation(observer) === this.id) {
      return this.interiorDescription;
    }
    if (this.isWornBy(observer)) {
      return this.wornDescription;
    }
    return this.description;
  }
}
```

### 3.2 Traits as Behavioral Mixins

```typescript
// Traits aren't just data, they're IF behaviors
interface OpenableTrait extends Trait {
  isOpen: boolean;
  
  // Trait defines behavior contract
  onOpen(actor: EntityId): SemanticEvent[];
  onClose(actor: EntityId): SemanticEvent[];
  
  // Can affect other traits
  affectsVisibility(): boolean {
    return !this.isOpen; // Closed containers hide contents
  }
}
```

---

## Phase 4: Parser-World Integration (Week 6)

### 4.1 Parser and World Are Partners

```typescript
// Parser NEEDS world knowledge for IF to work
class IFParser {
  constructor(
    private world: IWorldContext, // Parser needs world!
    private language: Language
  ) {}
  
  parse(input: string, actor: EntityId): ParsedCommand {
    // "GET LAMP" - which lamp?
    const scope = this.world.getScope(actor);
    const candidates = this.findMatches('lamp', scope);
    
    if (candidates.length > 1) {
      // Need world knowledge to disambiguate
      return this.disambiguate(candidates, actor);
    }
    
    return this.createCommand(input, candidates);
  }
  
  disambiguate(items: Entity[], actor: EntityId): ParsedCommand {
    // Prefer reachable over visible
    // Prefer recently mentioned
    // Prefer items not held
    // All require world state!
  }
}
```

### 4.2 Bidirectional Action-World Relationship

```typescript
// Actions and World are intimately connected in IF
interface IFAction {
  id: string;
  
  // Action needs world for validation
  validate(
    command: ParsedCommand, 
    world: IWorldContext  // Actions need world!
  ): ValidationResult;
  
  // Action transforms world
  execute(
    command: ValidatedCommand,
    world: IWorldModel  // Full world access for state changes
  ): SemanticEvent[];
}

// This is CORRECT for IF, not a code smell!
```

---

## Phase 5: Event System for IF Narrative (Week 7)

### 5.1 Events as Story Beats

```typescript
// IF events aren't just state changes, they're narrative moments
interface StoryEvent extends SemanticEvent {
  // Narrative significance
  importance: 'minor' | 'normal' | 'major' | 'critical';
  
  // Can this be undone?
  reversible: boolean;
  
  // Does this affect the story?
  plotSignificant: boolean;
  
  // Custom author responses
  authorResponse?: (world: WorldModel) => string;
}

// Events need world context for proper responses
class IFEventProcessor {
  process(event: StoryEvent, world: WorldModel): Response {
    // "You take the lamp" vs "Taken" based on style
    // "The lamp is now lit" vs custom author message
    // Context-dependent responses need world state
  }
}
```

### 5.2 Rule-Based Event Handling

```typescript
// IF uses rules, not just handlers
class RuleBook {
  private rules: Rule[] = [];
  
  // Before rules (can prevent action)
  addBeforeRule(action: string, rule: Rule): void;
  
  // Instead rules (replace action)
  addInsteadRule(action: string, rule: Rule): void;
  
  // After rules (additional effects)
  addAfterRule(action: string, rule: Rule): void;
  
  // Check rules (validate state)
  addCheckRule(action: string, rule: Rule): void;
}

// Example: Inform-style rule
const rule: Rule = {
  name: "can't take scenery rule",
  applies: (action, world) => {
    return action.id === 'TAKE' && 
           action.target.hasTag('scenery');
  },
  execute: (action, world) => {
    return Result.failure("That's hardly portable.");
  }
};
```

---

## Phase 6: Scope as First-Class Concept (Week 8)

### 6.1 Scope Drives Everything in IF

```typescript
// Scope isn't a utility, it's core to IF
class Scope {
  private visible: Set<EntityId>;
  private reachable: Set<EntityId>;
  private accessible: Set<EntityId>;
  
  constructor(
    private actor: EntityId,
    private world: WorldModel  // Scope needs world!
  ) {
    this.calculate();
  }
  
  // Complex IF visibility rules
  private calculate(): void {
    // Start with room
    // Add contained items (unless in closed opaque containers)
    // Add carried items
    // Remove items in darkness (unless light sources)
    // Add items mentioned in room description
    // Consider transparent/opaque containers
    // Handle supporter visibility
    // Apply custom scope rules
  }
  
  // Scope affects everything
  canSee(entity: EntityId): boolean;
  canReach(entity: EntityId): boolean;
  canTake(entity: EntityId): boolean;
  disambiguate(matches: EntityId[]): EntityId;
}
```

### 6.2 Dynamic Scope Rules

```typescript
// Authors need to modify scope for puzzles
interface ScopeModifier {
  // "The painting conceals a safe"
  whenExamined(entity: EntityId): EntityId[];
  
  // "Through the window you can see the garden"  
  addRemoteVisibility(from: EntityId): EntityId[];
  
  // "In the mirror, you see items behind you"
  addReflection(mirror: EntityId): EntityId[];
  
  // "The darkness conceals everything but the glowing sword"
  overrideDarkness(room: EntityId): EntityId[];
}
```

---

## Phase 7: IF-Specific Patterns (Week 9-10)

### 7.1 Activity Pattern (from Inform 7)

```typescript
// Activities are customizable processes
class Activity<T> {
  private beforeRules: Rule[] = [];
  private duringRules: Rule[] = [];
  private afterRules: Rule[] = [];
  
  run(context: T, world: WorldModel): Result {
    // Before (can prevent)
    for (const rule of this.beforeRules) {
      if (rule.prevents) return Result.prevented();
    }
    
    // During (the actual activity)
    const result = this.runDuring(context, world);
    
    // After (additional effects)
    for (const rule of this.afterRules) {
      rule.apply(result, world);
    }
    
    return result;
  }
}

// Standard IF activities
const printing = new Activity<Entity>("printing name of");
const listing = new Activity<Entity[]>("listing contents");
const opening = new Activity<Entity>("opening");
```

### 7.2 Action Processing Pipeline

```typescript
// The Inform-inspired action pipeline
class ActionPipeline {
  process(action: Action, world: WorldModel): Result {
    // 1. Before rules (author overrides)
    const before = this.runBefore(action, world);
    if (before.prevented) return before;
    
    // 2. Instead rules (replacement actions)
    const instead = this.runInstead(action, world);
    if (instead.handled) return instead;
    
    // 3. Check rules (validate preconditions)
    const check = this.runCheck(action, world);
    if (check.failed) return check;
    
    // 4. Carry out rules (do the action)
    const carry = this.runCarryOut(action, world);
    
    // 5. After rules (additional effects)
    const after = this.runAfter(action, world);
    
    // 6. Report rules (describe what happened)
    return this.runReport(action, world);
  }
}
```

### 7.3 Relations System

```typescript
// IF needs rich relationships between entities
class Relation<T = EntityId> {
  private relations: Map<T, Set<T>>;
  
  // Define IF relationships
  static readonly Contains = new Relation("contains");
  static readonly Supports = new Relation("supports");
  static readonly Wears = new Relation("wears");
  static readonly Unlocks = new Relation("unlocks");
  static readonly Incorporates = new Relation("incorporates");
  
  // Custom author relations
  static readonly Loves = new Relation("loves");
  static readonly Guards = new Relation("guards");
}
```

---

## Testing Strategy for IF

### IF-Specific Test Patterns

```typescript
// Transcript testing (IF's gold standard)
class TranscriptTest {
  runTest(commands: string[], expected: string[]): void {
    const world = new WorldModel();
    const game = new Game(world);
    
    for (let i = 0; i < commands.length; i++) {
      const output = game.process(commands[i]);
      expect(output).toBe(expected[i]);
    }
  }
}

// World state testing
class WorldStateTest {
  assertPlayerLocation(room: string): void;
  assertEntityLocation(entity: string, container: string): void;
  assertTraitValue(entity: string, trait: string, value: any): void;
  assertScopeContains(entities: string[]): void;
}
```

---

## Success Metrics for IF Platform

### IF-Specific Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Scope calculation < 10ms | 95th percentile | Players expect instant response |
| Parse disambiguation accuracy | > 90% | Correct object selection |
| Action validation completeness | 100% | No invalid state changes |
| Save/restore fidelity | 100% | Perfect state preservation |
| Turn processing < 50ms | 99th percentile | Maintains immersion |
| Custom action integration | < 10 lines | Easy author extension |
| Rule precedence correctness | 100% | Predictable customization |

### Author Experience Metrics

- Time to implement a new verb: < 30 minutes
- Time to create a complex puzzle: < 2 hours
- Lines of code for basic game: < 500
- Documentation lookup frequency: Decreasing
- Forum questions about architecture: Minimal

---

## What We're NOT Doing

### Not Breaking These IF Patterns:
1. **World-Entity Bidirectionality** - Essential for IF
2. **Parser-World Coupling** - Required for disambiguation
3. **Action-World Integration** - Needed for validation
4. **Rich WorldModel** - It's the simulation core
5. **Trait Interactions** - Complex trait relationships are IF's strength

### Not Adopting These Business Patterns:
1. **Repository Pattern** - IF entities aren't database records
2. **Unit of Work** - IF commands are already transactional
3. **CQRS** - IF is inherently command-driven
4. **Microservices** - IF needs integrated world simulation
5. **Event Sourcing** - Save games are more efficient

---

## Conclusion

This refactoring plan respects IF's unique architectural requirements while addressing genuine problems:

1. **Managed Bidirectionality** instead of breaking circular dependencies
2. **Rich World Model** instead of artificial service separation  
3. **Integrated Parser-World** instead of isolated components
4. **Scope-Driven Architecture** as IF demands
5. **Rule-Based Customization** for author flexibility

The result will be a properly architected IF platform that:
- Embraces IF's inherent complexities
- Provides clean extension points for authors
- Maintains performance for real-time play
- Supports sophisticated world simulation
- Enables rich narrative experiences

**This is IF architecture, not business application architecture.**

---

*Plan Created: 2025-08-13*
*IF Architecture Perspective*
*Based on lessons from Inform 7, TADS 3, and Hugo*
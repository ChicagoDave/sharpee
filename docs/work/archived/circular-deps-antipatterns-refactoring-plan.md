# Refactoring Plan: Circular Dependencies & Anti-Patterns

## Executive Summary
This plan addresses the critical architectural issues identified in the Sharpee platform, focusing on breaking circular dependencies and eliminating anti-patterns. The refactoring will be executed in phases to maintain system stability while improving architecture.

---

## Phase 1: Break Circular Dependencies (Week 1-2)

### 1.1 Create Interface Layer

#### New Package: `@sharpee/interfaces`
```
packages/interfaces/
├── src/
│   ├── world/
│   │   ├── IWorldModel.ts
│   │   ├── IEntity.ts
│   │   └── ITrait.ts
│   ├── parser/
│   │   ├── IParser.ts
│   │   └── ICommand.ts
│   ├── actions/
│   │   ├── IAction.ts
│   │   └── IActionRegistry.ts
│   └── index.ts
```

**Key Principle**: Depend on abstractions, not implementations

#### Implementation Steps:
1. **Day 1-2**: Extract all interfaces from existing packages
2. **Day 3-4**: Create interface package with zero dependencies
3. **Day 5-6**: Update all packages to import from interfaces
4. **Day 7-8**: Remove direct cross-package imports
5. **Day 9-10**: Verify no circular dependencies remain

### 1.2 Dependency Inversion

#### Current Problem:
```
stdlib → world-model (concrete)
world-model → stdlib (concrete)
```

#### Solution:
```
stdlib → IWorldModel (interface)
world-model → IAction (interface)
```

#### Specific Changes:
- **stdlib**: Remove direct world-model imports, use IWorldModel interface
- **world-model**: Remove stdlib imports, use IAction interface
- **parser-en-us**: Depend only on interfaces, not world-model
- **Create adapters** for runtime wiring of implementations

---

## Phase 2: Eliminate God Object (Week 3-4)

### 2.1 Decompose WorldModel

#### Current WorldModel Responsibilities:
- Entity CRUD operations
- Trait management
- Scope/visibility calculations
- State persistence
- Event handling
- Relationship management
- Player management
- Location tracking

#### New Service Architecture:

```
WorldModel (Facade - coordinates services)
├── EntityRepository
│   ├── create()
│   ├── find()
│   ├── update()
│   └── delete()
├── TraitManager
│   ├── addTrait()
│   ├── removeTrait()
│   └── getTrait()
├── ScopeCalculator
│   ├── getVisible()
│   ├── getReachable()
│   └── getAccessible()
├── StateManager
│   ├── save()
│   ├── restore()
│   └── checkpoint()
├── RelationshipGraph
│   ├── setLocation()
│   ├── getLocation()
│   ├── getContents()
│   └── getConnections()
└── EventCoordinator
    ├── registerHandler()
    ├── emit()
    └── process()
```

#### Migration Strategy:
1. **Week 3, Day 1-2**: Create new service classes with interfaces
2. **Week 3, Day 3-4**: Move methods from WorldModel to services
3. **Week 3, Day 5**: WorldModel becomes thin facade
4. **Week 4, Day 1-2**: Update all consumers to use specific services
5. **Week 4, Day 3-4**: Add dependency injection container
6. **Week 4, Day 5**: Testing and validation

### 2.2 Benefits of Decomposition:
- Each service has single responsibility
- Easier to test in isolation
- Can mock individual services
- Parallel development possible
- Clear ownership boundaries

---

## Phase 3: Fix Anemic Domain Model (Week 5)

### 3.1 Move Logic into Entities

#### Current (Anemic):
```typescript
// Entity is just data
class IFEntity {
  attributes: Record<string, any>;
  traits: Map<TraitType, Trait>;
}

// Logic in external service
class ActionService {
  moveEntity(entity, location) { ... }
  takeEntity(entity, actor) { ... }
}
```

#### Target (Rich Domain):
```typescript
class IFEntity {
  // Data
  private attributes: Record<string, any>;
  private traits: Map<TraitType, Trait>;
  
  // Behavior
  moveTo(location: Location): Result<void> {
    if (!this.canMoveTo(location)) {
      return Result.error('Cannot move there');
    }
    // Emit event, update state
  }
  
  takeBy(actor: Actor): Result<void> {
    if (!this.canBeTakenBy(actor)) {
      return Result.error('Cannot take');
    }
    // Business logic here
  }
}
```

### 3.2 Domain Logic Distribution

| Logic Type | Current Location | Target Location |
|------------|-----------------|-----------------|
| Can be taken? | Action | Entity.canBeTaken() |
| Can contain? | Action | Container.canContain() |
| Is visible? | ScopeCalculator | Entity.isVisibleFrom() |
| Can be opened? | Action | Openable.canOpen() |
| Movement rules | Action | Entity.canMoveTo() |

---

## Phase 4: Eliminate Service Locator (Week 6)

### 4.1 Introduce Dependency Injection

#### Current (Service Locator Anti-pattern):
```typescript
execute(context: ActionContext) {
  const world = context.world; // Hidden dependency
  const parser = context.parser; // Hidden dependency
  // Hard to test, unclear dependencies
}
```

#### Target (Dependency Injection):
```typescript
class TakeAction {
  constructor(
    private world: IWorldModel,
    private validator: IValidator,
    private events: IEventBus
  ) {
    // Explicit dependencies
  }
  
  execute(command: ICommand): Result {
    // Use injected dependencies
  }
}
```

### 4.2 DI Container Setup

```typescript
// Central DI configuration
class DIContainer {
  register(): void {
    this.bind<IWorldModel>('IWorldModel').to(WorldModel);
    this.bind<IParser>('IParser').to(Parser);
    this.bind<IEventBus>('IEventBus').to(EventBus).asSingleton();
  }
}

// Usage
const container = new DIContainer();
const action = container.resolve(TakeAction);
```

---

## Phase 5: Implement Missing Patterns (Week 7-8)

### 5.1 Repository Pattern

```typescript
interface IEntityRepository {
  find(id: EntityId): Promise<IEntity>;
  findAll(spec: Specification): Promise<IEntity[]>;
  save(entity: IEntity): Promise<void>;
  delete(id: EntityId): Promise<void>;
}

class EntityRepository implements IEntityRepository {
  constructor(private storage: IStorage) {}
  
  async find(id: EntityId): Promise<IEntity> {
    const data = await this.storage.get(id);
    return this.hydrate(data);
  }
}
```

### 5.2 Unit of Work Pattern

```typescript
class UnitOfWork {
  private changes: ChangeSet[] = [];
  private entities: Map<EntityId, IEntity> = new Map();
  
  track(entity: IEntity): void {
    this.entities.set(entity.id, entity);
  }
  
  commit(): Promise<void> {
    // Apply all changes atomically
    return this.repository.saveAll(this.changes);
  }
  
  rollback(): void {
    this.changes = [];
    this.entities.clear();
  }
}
```

### 5.3 Specification Pattern

```typescript
abstract class Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  
  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }
  
  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }
}

// Usage
const visibleItems = new IsVisibleSpec()
  .and(new IsPortableSpec())
  .and(new InLocationSpec(currentRoom));

const items = repository.findAll(visibleItems);
```

---

## Phase 6: Consolidate Event Patterns (Week 9)

### 6.1 Single Event Bus

```typescript
class EventBus {
  private handlers = new Map<string, Handler[]>();
  private middleware: Middleware[] = [];
  
  emit<T extends GameEvent>(event: T): void {
    // Run through middleware
    for (const mw of this.middleware) {
      event = mw.process(event);
    }
    
    // Dispatch to handlers
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      handler(event);
    }
  }
}
```

### 6.2 Remove Mixed Patterns

**Eliminate**:
- Direct state manipulation in actions
- Behaviors that duplicate event handlers
- Multiple event processing paths

**Standardize on**:
- All state changes through events
- Single event processing pipeline
- Consistent handler registration

---

## Testing Strategy Throughout

### Unit Tests for Each Phase
```
Phase 1: Test interfaces compile and match implementations
Phase 2: Test each new service in isolation
Phase 3: Test entity behavior methods
Phase 4: Test DI container and injection
Phase 5: Test patterns with mocks
Phase 6: Test event flow end-to-end
```

### Integration Tests
- Run after each phase
- Ensure existing functionality preserved
- Performance benchmarks to catch regressions

### Regression Test Suite
- Maintain golden tests throughout
- Add tests for each refactoring
- Never break existing tests without review

---

## Risk Mitigation

### Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | High | High | Comprehensive test coverage, gradual migration |
| Performance degradation | Medium | Medium | Benchmark before/after, profile hot paths |
| Team resistance | Low | Medium | Clear documentation, training sessions |
| Scope creep | Medium | High | Strict phase boundaries, change control |
| Integration issues | Medium | High | Feature flags, rollback plan |

### Rollback Strategy
1. Each phase in separate branch
2. Feature flags for new code paths
3. Can run old and new in parallel
4. Database migrations reversible
5. Full backup before each phase

---

## Success Metrics

### Quantitative Metrics
- **Coupling**: Reduce coupling index by 50%
- **Cohesion**: Increase cohesion score by 40%
- **Complexity**: Reduce cyclomatic complexity by 30%
- **Test Coverage**: Achieve 90% coverage
- **Build Time**: Reduce by 25%
- **Memory Usage**: Reduce by 20%

### Qualitative Metrics
- Developer satisfaction survey
- Code review feedback
- Time to implement new features
- Bug report frequency
- Onboarding time for new developers

---

## Timeline Summary

```
Week 1-2:  Break Circular Dependencies
Week 3-4:  Eliminate God Object (WorldModel)
Week 5:    Fix Anemic Domain Model
Week 6:    Eliminate Service Locator
Week 7-8:  Implement Missing Patterns
Week 9:    Consolidate Event Patterns
Week 10:   Integration Testing & Documentation
```

**Total Duration**: 10 weeks
**Team Size**: 2-3 developers
**Review Points**: End of each phase

---

## Post-Refactoring Architecture

### Clean Architecture Layers
```
Presentation Layer (CLI, Web)
           ↓
Application Layer (Use Cases)
           ↓
Domain Layer (Entities, Value Objects)
           ↓
Infrastructure Layer (DB, File System)
```

### Dependency Rule
- Dependencies only point inward
- Domain has zero dependencies
- Infrastructure depends on domain
- Application orchestrates domain
- Presentation depends on application

---

## Conclusion

This refactoring plan addresses the critical architectural issues while maintaining system stability. The phased approach allows for continuous delivery and reduces risk. Each phase builds on the previous, creating a solid foundation for future development.

The end result will be:
- No circular dependencies
- Clear separation of concerns
- Rich domain model
- Testable architecture
- Maintainable codebase
- Scalable design

**Estimated ROI**: 
- 50% reduction in bug rate
- 40% faster feature development
- 60% reduction in onboarding time
- 70% improvement in test reliability

---

*Plan Created: 2025-08-13*
*Plan Owner: Architecture Team*
*Review Schedule: Weekly during implementation*
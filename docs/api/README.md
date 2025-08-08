# API Reference Documentation

This directory contains comprehensive API reference documentation for all Sharpee packages.

## Package APIs

### Core APIs
- **[Core API](./core/)** - Core utilities and types
  - Event system
  - Result types
  - System events
  - Error handling

- **[World Model API](./world-model/)** - Entity-Component System
  - Entity management
  - Trait system
  - Relationships
  - Queries

### Language Processing APIs
- **[Parser API](./parser/)** - Natural language parsing
  - Parser interface
  - Grammar patterns
  - Token types
  - Parse results

- **[Standard Library API](./stdlib/)** - Actions and capabilities
  - Action interfaces
  - Capability registration
  - Standard actions
  - Helper functions

## Common Interfaces

### Event System
```typescript
interface SystemEvent {
  id: string;
  type: string;
  timestamp: number;
  data?: any;
}
```

### Result Type
```typescript
type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };
```

### Entity System
```typescript
interface Entity {
  id: string;
  type: EntityType;
  traits: Map<string, Trait>;
}

interface Trait {
  name: string;
  data: any;
}
```

### Parser Types
```typescript
interface ParsedCommand {
  verb: VerbPhrase;
  objects: NounPhrase[];
  prepositions: PrepPhrase[];
}

interface Token {
  text: string;
  type: TokenType;
  position: number;
}
```

### Action System
```typescript
interface Action {
  id: string;
  execute(context: ActionContext): ActionResult;
}

interface ActionContext {
  world: WorldModel;
  player: Entity;
  command: ParsedCommand;
}
```

## API Conventions

### Naming
- **Classes**: PascalCase (e.g., `WorldModel`)
- **Interfaces**: PascalCase with 'I' prefix optional (e.g., `Entity` or `IEntity`)
- **Functions**: camelCase (e.g., `createEntity`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_HISTORY`)
- **Types**: PascalCase (e.g., `Result`)

### Method Patterns
- **Getters**: `getSomething()` or property access
- **Setters**: `setSomething(value)`
- **Boolean checks**: `isSomething()`, `hasSomething()`
- **Creators**: `createSomething()`
- **Converters**: `toSomething()`, `fromSomething()`

### Error Handling
- Use `Result<T, E>` for recoverable errors
- Throw exceptions for programming errors
- Provide descriptive error messages
- Include error codes when applicable

### Async Operations
- Return `Promise<T>` for async operations
- Support cancellation where appropriate
- Handle errors with Result or try/catch
- Document timeout behavior

## Type Safety

### Generics
```typescript
// Good: Constrained generics
function process<T extends Entity>(entity: T): T

// Bad: Unconstrained any
function process(entity: any): any
```

### Union Types
```typescript
// Good: Explicit union
type Direction = 'north' | 'south' | 'east' | 'west';

// Bad: Magic strings
function move(direction: string)
```

### Optional Properties
```typescript
// Good: Optional with defaults
interface Config {
  maxHistory?: number;  // defaults to 100
  debug?: boolean;      // defaults to false
}

// Document defaults in JSDoc
```

## Documentation Standards

### JSDoc Format
```typescript
/**
 * Brief description of the function.
 * 
 * Longer description with more details if needed.
 * Can span multiple lines.
 * 
 * @param {string} name - Parameter description
 * @param {ConfigOptions} [options] - Optional parameter
 * @returns {Result<Entity, Error>} What is returned
 * @throws {InvalidStateError} When this error occurs
 * 
 * @example
 * const entity = createEntity('room', EntityType.ROOM);
 * 
 * @since 0.1.0
 * @deprecated Use createEntityWithTraits instead
 */
```

### Interface Documentation
```typescript
/**
 * Represents a game entity in the world.
 * 
 * Entities are the fundamental objects in the game world,
 * including rooms, items, and actors.
 */
interface Entity {
  /** Unique identifier for the entity */
  id: string;
  
  /** The type of entity */
  type: EntityType;
  
  /** Collection of traits attached to this entity */
  traits: Map<string, Trait>;
}
```

## Version Compatibility

### Semantic Versioning
- **Major**: Breaking API changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, no API changes

### Deprecation Policy
1. Mark as `@deprecated` with alternative
2. Maintain for 2 minor versions
3. Remove in next major version

### Migration Guides
Provided for all breaking changes with:
- What changed
- Why it changed
- How to migrate
- Code examples

## Testing APIs

### Unit Testing
```typescript
describe('EntityManager', () => {
  it('should create entities with unique IDs', () => {
    const entity1 = createEntity('e1');
    const entity2 = createEntity('e2');
    expect(entity1.id).not.toBe(entity2.id);
  });
});
```

### Integration Testing
Test interactions between multiple APIs to ensure compatibility.

## Resources

- [Package Documentation](../packages/)
- [Architecture Documentation](../architecture/)
- [Development Guide](../development/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
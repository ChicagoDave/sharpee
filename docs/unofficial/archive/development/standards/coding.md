# Coding Standards

This document outlines the coding standards and conventions for the Sharpee project.

## Language and Framework

### TypeScript

All code must be written in TypeScript with strict type checking enabled.

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

## Type Definitions

### No Enums

Use const objects or union types instead of enums:

```typescript
// ❌ Bad - Using enum
enum Direction {
  North = 'north',
  South = 'south',
  East = 'east',
  West = 'west'
}

// ✅ Good - Using const object
export const Direction = {
  North: 'north',
  South: 'south', 
  East: 'east',
  West: 'west'
} as const;

export type Direction = typeof Direction[keyof typeof Direction];

// ✅ Also good - Using union type
export type Direction = 'north' | 'south' | 'east' | 'west';
```

### String Constants

Never use string literals directly in code. Always use constants:

```typescript
// ❌ Bad - String literals
if (action.type === 'take') {
  return 'You take the item.';
}

// ✅ Good - String constants
const ACTION_TYPES = {
  TAKE: 'take',
  DROP: 'drop',
  LOOK: 'look'
} as const;

const MESSAGES = {
  ITEM_TAKEN: 'You take the item.',
  ITEM_DROPPED: 'You drop the item.'
} as const;

if (action.type === ACTION_TYPES.TAKE) {
  return MESSAGES.ITEM_TAKEN;
}
```

### No Unicode

Avoid Unicode characters in source code. Use escape sequences or external resources:

```typescript
// ❌ Bad - Unicode in source
const arrow = '→';
const emoji = '😀';

// ✅ Good - Escape sequences or constants
const arrow = '\u2192';
const SYMBOLS = {
  ARROW_RIGHT: '\u2192',
  ARROW_LEFT: '\u2190'
} as const;
```

## Design Principles

### Domain-Driven Design

Functions and classes should have meaningful names that reflect the domain:

```typescript
// ❌ Bad - Generic names
function process(data: any): any {
  // ...
}

class Manager {
  handle(item: any): void {
    // ...
  }
}

// ✅ Good - Domain-specific names
function parseCommand(input: string): ParsedCommand {
  // ...
}

class InventoryManager {
  addItem(item: GameObject): void {
    // ...
  }
  
  removeItem(itemId: string): GameObject | undefined {
    // ...
  }
}
```

### Loose Coupling

Components should depend on abstractions, not concrete implementations:

```typescript
// ❌ Bad - Tight coupling
class GameEngine {
  private parser: EnglishParser; // Concrete class
  
  constructor() {
    this.parser = new EnglishParser(); // Direct instantiation
  }
}

// ✅ Good - Loose coupling
interface Parser {
  parse(input: string): ParsedCommand;
}

class GameEngine {
  private parser: Parser; // Interface
  
  constructor(parser: Parser) { // Dependency injection
    this.parser = parser;
  }
}
```

## Naming Conventions

### Variables and Functions

Use camelCase for variables and functions:

```typescript
// Variables
const playerName = 'Hero';
const maxHealth = 100;

// Functions
function calculateDamage(attack: number, defense: number): number {
  return Math.max(0, attack - defense);
}
```

### Classes and Interfaces

Use PascalCase for classes and interfaces:

```typescript
// Classes
class GameObject {
  // ...
}

// Interfaces
interface Saveable {
  save(): SaveData;
  load(data: SaveData): void;
}
```

### Constants

Use UPPER_SNAKE_CASE for constants:

```typescript
const MAX_INVENTORY_SIZE = 20;
const DEFAULT_ROOM_DESCRIPTION = 'An empty room.';
const API_TIMEOUT_MS = 30000;
```

### Private Members

Prefix private members with underscore (optional but recommended for clarity):

```typescript
class Entity {
  private _id: string;
  private _components: Map<string, Component>;
  
  get id(): string {
    return this._id;
  }
}
```

## Code Organization

### File Structure

One class or major component per file:

```typescript
// entity.ts - Single class
export class Entity {
  // ...
}

// entity-manager.ts - Related class
export class EntityManager {
  // ...
}

// types.ts - Shared types
export interface EntityConfig {
  // ...
}
```

### Import Order

Organize imports in groups:

```typescript
// 1. Node/external modules
import { EventEmitter } from 'events';
import * as path from 'path';

// 2. Framework/library modules
import { describe, it, expect } from 'vitest';

// 3. Internal absolute imports
import { Entity } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser';

// 4. Relative imports
import { utils } from './utils';
import type { Config } from './types';
```

### Export Style

Use named exports, avoid default exports:

```typescript
// ❌ Bad - Default export
export default class GameEngine {
  // ...
}

// ✅ Good - Named export
export class GameEngine {
  // ...
}

// ✅ Good - Re-export from index
export { GameEngine } from './game-engine';
export { Story } from './story';
export type { EngineConfig } from './types';
```

## Error Handling

### Use Result Types

Prefer Result types over exceptions for expected errors:

```typescript
// Result type
type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

// Usage
function parseInteger(input: string): Result<number, string> {
  const num = parseInt(input, 10);
  if (isNaN(num)) {
    return { ok: false, error: 'Invalid number format' };
  }
  return { ok: true, value: num };
}
```

### Meaningful Error Messages

Provide context in error messages:

```typescript
// ❌ Bad - Generic error
throw new Error('Invalid input');

// ✅ Good - Contextual error
throw new Error(`Invalid entity ID: ${id}. Expected format: 'entity_[number]'`);
```

## Documentation

### JSDoc Comments

Document all public APIs:

```typescript
/**
 * Parses a command string into a structured command object.
 * 
 * @param input - The raw command string from the user
 * @param context - The current game context for scope resolution
 * @returns A parsed command or an error result
 * 
 * @example
 * const result = parseCommand('take lamp', context);
 * if (result.ok) {
 *   console.log(result.value.verb); // 'take'
 * }
 */
export function parseCommand(
  input: string,
  context: GameContext
): Result<ParsedCommand, ParseError> {
  // ...
}
```

### Inline Comments

Use inline comments sparingly, only when the code isn't self-explanatory:

```typescript
// ✅ Good - Explains non-obvious behavior
// We need to check inventory first because items in inventory
// take precedence over items in the room during disambiguation
const inventoryItems = checkInventory(noun);

// ❌ Bad - States the obvious
// Increment counter by 1
counter++;
```

## Testing

### Test File Naming

Test files should be colocated with source files:

```
src/
  entity.ts
  entity.test.ts
  entity-manager.ts
  entity-manager.test.ts
```

### Test Structure

Use descriptive test names:

```typescript
describe('Entity', () => {
  describe('constructor', () => {
    it('should create entity with unique ID', () => {
      // ...
    });
    
    it('should throw error when ID is invalid', () => {
      // ...
    });
  });
  
  describe('addComponent', () => {
    it('should add component to entity', () => {
      // ...
    });
  });
});
```

## Performance

### Avoid Premature Optimization

Write clear, maintainable code first. Optimize only when necessary and after profiling.

### Use Appropriate Data Structures

```typescript
// Use Map for key-value pairs with frequent lookups
const entities = new Map<string, Entity>();

// Use Set for unique collections
const visitedRooms = new Set<string>();

// Use arrays for ordered collections
const commandHistory: Command[] = [];
```

## Security

### Input Validation

Always validate external input:

```typescript
function setPlayerName(name: string): void {
  // Validate length
  if (name.length < 1 || name.length > 50) {
    throw new Error('Name must be between 1 and 50 characters');
  }
  
  // Validate characters
  if (!/^[a-zA-Z0-9\s-]+$/.test(name)) {
    throw new Error('Name contains invalid characters');
  }
  
  this.playerName = name.trim();
}
```

### No Dynamic Code Execution

Never use `eval()` or `Function()` constructor:

```typescript
// ❌ Bad - Security risk
const result = eval(userInput);

// ✅ Good - Safe parsing
const result = parseCommand(userInput);
```

## Version Control

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
```
feat(parser): add support for compound nouns
fix(engine): resolve memory leak in event system
docs(api): update GameEngine documentation
test(world-model): add tests for entity relationships
refactor(stdlib): simplify action execution logic
```

### Branch Naming

Use descriptive branch names:

```
feature/add-inventory-system
fix/parser-timeout-issue
docs/update-api-reference
refactor/engine-event-system
```

## Review Checklist

Before submitting code:

- [ ] All tests pass
- [ ] Code follows naming conventions
- [ ] No string literals in code
- [ ] No enums used
- [ ] Public APIs are documented
- [ ] Error handling is appropriate
- [ ] No console.log statements
- [ ] Dependencies are injected, not hardcoded
- [ ] Code is formatted (run `pnpm format`)
- [ ] Linting passes (run `pnpm lint`)

---

*These standards are enforced through ESLint configuration and code review.*
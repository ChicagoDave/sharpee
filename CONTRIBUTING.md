# Contributing to Sharpee

Thank you for your interest in contributing to Sharpee! This guide covers everything you need to know to contribute effectively to the platform.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- pnpm 8.0 or higher
- Git
- TypeScript knowledge
- Understanding of event-driven architecture

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sharpee.git
   cd sharpee
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Build All Packages**
   ```bash
   pnpm build
   ```

4. **Run Tests**
   ```bash
   pnpm test
   ```

5. **Set Up Git Hooks** (optional but recommended)
   ```bash
   pnpm prepare
   ```

## Architecture Overview

Sharpee uses a monorepo structure with multiple packages:

```
packages/
├── core/           # Core types and events
├── world-model/    # Entity and world management
├── stdlib/         # Standard library (actions, traits)
├── engine/         # Game engine and runtime
├── parser-en-us/   # English language parser
├── lang-en-us/     # English language data
├── if-domain/      # Interactive fiction domain contracts
└── extensions/     # Extension packages
```

### Key Principles

1. **Event-Driven**: All state changes happen through events
2. **Type Safety**: Strict TypeScript with interface prefixes (I-)
3. **Modular**: Clear separation of concerns
4. **Extensible**: Plugin architecture for extensions
5. **Testable**: Comprehensive test coverage

## How to Contribute

### Finding Issues

Look for issues labeled:
- `good first issue` - Great for newcomers
- `help wanted` - Community help needed
- `bug` - Bug fixes
- `enhancement` - New features
- `documentation` - Documentation improvements

### Creating Issues

Before creating an issue:
1. Search existing issues
2. Check the documentation
3. Try to reproduce the problem

Include in your issue:
- Clear title and description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details
- Code samples if applicable

### Working on Issues

1. **Comment on the issue** to claim it
2. **Ask questions** if requirements are unclear
3. **Regular updates** on progress for long tasks
4. **Link your PR** when ready

## Pull Request Process

### Before You Start

1. **Create an issue** for significant changes
2. **Discuss the approach** in the issue
3. **Get approval** before major work

### Creating a Pull Request

1. **Branch Naming**
   ```
   feature/add-new-action
   fix/correct-parser-bug
   docs/update-readme
   refactor/improve-performance
   ```

2. **Commit Messages**
   Follow conventional commits:
   ```
   feat: add spell casting action
   fix: correct inventory display bug
   docs: update extension guide
   refactor: simplify event handling
   test: add parser edge cases
   chore: update dependencies
   ```

3. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] Tests added/updated
   - [ ] No breaking changes (or documented)
   
   Closes #123
   ```

### Review Process

1. **Automated Checks** must pass:
   - Tests
   - Type checking
   - Linting
   - Build

2. **Code Review** by maintainers:
   - Architecture compliance
   - Code quality
   - Test coverage
   - Documentation

3. **Approval and Merge**:
   - Requires approval from maintainer
   - Squash and merge preferred
   - Delete branch after merge

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types
function processEvent(event: ISemanticEvent): IEvent[] {
  // Not: function processEvent(event): any[]
}

// Use interface prefix convention
interface IEntity {  // Not: interface Entity
  id: string;
  name: string;
}

// Use const for constants
const MAX_INVENTORY_SIZE = 20;  // Not: let maxSize = 20

// Prefer functional style
const filtered = items.filter(item => item.visible);
// Not: for loop with push

// Handle errors explicitly
try {
  return processAction(action);
} catch (error) {
  if (error instanceof ValidationError) {
    return handleValidationError(error);
  }
  throw error;
}
```

### File Organization

```typescript
// 1. Imports (grouped and sorted)
import { IEvent, IEntity } from '@sharpee/core';
import { IWorldModel } from '@sharpee/world-model';

import { helperFunction } from './utils';
import type { LocalType } from './types';

// 2. Constants
const ACTION_ID = 'take';

// 3. Types/Interfaces
interface ActionState {
  // ...
}

// 4. Main implementation
export class TakeAction implements IAction {
  // ...
}

// 5. Helper functions
function validateTarget(entity: IEntity): boolean {
  // ...
}
```

### Event Patterns

```typescript
// Always return events, never mutate
execute(context: IActionContext): ISemanticEvent[] {
  // Good
  return [{
    type: 'ENTITY_MOVED',
    data: { entity: id, destination: room }
  }];
  
  // Bad - Never do this!
  // world.moveEntity(id, room);
}

// Use semantic event types
{
  type: 'DOOR_OPENED',     // Good
  // type: 'STATE_CHANGED'  // Too generic
}

// Include all necessary data
{
  type: 'ITEM_TAKEN',
  data: {
    item: itemId,
    actor: actorId,
    from: containerId,
    timestamp: Date.now()
  }
}
```

## Testing Requirements

### Test Coverage

- Minimum 80% coverage for new code
- 100% coverage for critical paths
- Both positive and negative test cases

### Test Structure

```typescript
describe('ComponentName', () => {
  // Setup
  let component: Component;
  let mockWorld: IWorldModel;
  
  beforeEach(() => {
    component = new Component();
    mockWorld = createMockWorld();
  });
  
  // Group related tests
  describe('validation', () => {
    it('should validate correct input', () => {
      // Arrange
      const input = createValidInput();
      
      // Act
      const result = component.validate(input);
      
      // Assert
      expect(result.valid).toBe(true);
    });
    
    it('should reject invalid input', () => {
      // Test edge cases
    });
  });
  
  describe('execution', () => {
    it('should generate correct events', () => {
      // Test event generation
    });
  });
});
```

### Testing Guidelines

1. **Unit Tests**: Test components in isolation
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user scenarios
4. **Performance Tests**: For critical paths
5. **Snapshot Tests**: For complex outputs

## Documentation

### Code Documentation

```typescript
/**
 * Processes a player action and returns resulting events.
 * 
 * @param command - The validated command to execute
 * @param context - The current action context
 * @returns Array of semantic events to apply
 * @throws {ValidationError} If command validation fails
 * 
 * @example
 * ```typescript
 * const events = action.execute(command, context);
 * world.applyEvents(events);
 * ```
 */
export function executeAction(
  command: IValidatedCommand,
  context: IActionContext
): ISemanticEvent[] {
  // Implementation
}
```

### Documentation Updates

When contributing:
1. Update inline documentation
2. Update README if needed
3. Add to API docs for public APIs
4. Create ADR for architectural decisions
5. Update examples if behavior changes

## Package-Specific Guidelines

### Core Package

Focus areas:
- Event system improvements
- Type definitions
- Core interfaces
- Error handling

Guidelines:
- Maintain backward compatibility
- Keep minimal dependencies
- Ensure type safety

### World Model Package

Focus areas:
- Entity management
- Trait system
- Spatial indexing
- Capability system

Guidelines:
- Optimize for performance
- Maintain data integrity
- Support serialization

### Standard Library Package

Focus areas:
- Action implementations
- Parser improvements
- Validation logic
- Common traits

Guidelines:
- Follow validate/execute pattern
- Comprehensive error messages
- Extensive testing

### Engine Package

Focus areas:
- Command processing
- Event sequencing
- Game loop
- Platform integration

Guidelines:
- Handle edge cases
- Maintain performance
- Clear error reporting

## Common Tasks

### Adding a New Action

1. Create action file in `packages/stdlib/src/actions/standard/`
2. Implement `IAction` interface
3. Add to action registry
4. Create comprehensive tests
5. Update documentation
6. Add vocabulary entries

### Adding a New Trait

1. Create trait in `packages/world-model/src/traits/`
2. Define trait interface
3. Implement behavior class
4. Register in trait system
5. Add tests
6. Document usage

### Fixing a Bug

1. Create failing test that reproduces bug
2. Fix the bug
3. Ensure test passes
4. Check for similar issues
5. Update documentation if needed
6. Add regression test

## Release Process

### Version Management

We follow semantic versioning (semver):
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features
- **Patch** (0.0.1): Bug fixes

### npm Publishing Setup (Maintainers)

To enable automated npm publishing:

1. **Create npm Access Token**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Automation"
   - Copy the token (starts with `npm_`)

2. **Add GitHub Secret**
   - Go to repo Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: paste your npm token

3. **Ensure @sharpee scope access**
   - You must be a member of the `@sharpee` npm organization
   - Or create it at https://www.npmjs.com/org/create

### Release Checklist

1. Update version numbers in all package.json files
2. Update CHANGELOG.md
3. Run full test suite
4. Build all packages: `./scripts/build-release.sh`
5. Create release PR
6. Tag release: `git tag v0.9.0-beta.2 && git push origin v0.9.0-beta.2`
7. GitHub Actions automatically publishes to npm
8. Verify packages at https://www.npmjs.com/org/sharpee

## Getting Help

### Resources

- [Documentation](./docs/)
- [Architecture Decision Records](./docs/architecture/adrs/)
- [Discord Server](#) (coming soon)
- [GitHub Discussions](https://github.com/your-org/sharpee/discussions)

### Contacts

- **Maintainers**: See [MAINTAINERS.md](MAINTAINERS.md)
- **Security Issues**: security@sharpee.dev
- **General Questions**: GitHub Discussions

## Recognition

Contributors are recognized in:
- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Release notes
- Documentation credits
- GitHub contributor graph

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

---

Thank you for contributing to Sharpee! Your efforts help make interactive fiction development better for everyone. 🎮
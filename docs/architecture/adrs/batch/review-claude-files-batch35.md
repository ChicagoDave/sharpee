# Batch 035: Review Claude Files
**Source:** claude/2025-05-27-17-10-29.json
**Date:** May 27-28, 2025
**Topic:** Core Game Mechanics Implementation - Test Fixes

## Key Architectural Decisions

### 1. Test Organization Structure
- **Decision**: Tests are organized within `__tests__` directories inside each module
- **Structure**:
  ```
  src/
    world-model/__tests__/
    parser/__tests__/
    parser/core/__tests__/
    parser/grammar/__tests__/
  ```
- **Rationale**: Keeps tests close to implementation code

### 2. Circular Dependency Issue Identified
- **Problem**: Stack overflow in scope calculator showing circular dependency
- **Call Pattern**: `calculateScope` → `calculateKnown` → `calculateScope` (infinite loop)
- **Impact**: Reveals architectural issue in scope calculation design

### 3. Import Path Requirements
- **Decision**: Test imports must use full relative paths
- **Example**: `import { IFWorld } from '../if-world/if-world'` not `'../if-world'`
- **Rationale**: TypeScript module resolution requirements

### 4. Test Strategy
- **Approach**: Fix imports and structure issues before implementation issues
- **Priority**: 
  1. Fix IFWorld test imports
  2. Fix parser test imports
  3. Address circular dependencies
  4. Implement missing methods

### 5. Language System Integration in Tests
- **Decision**: Tests should use the new language registry system
- **Change**: From `@sharpee/lang-en-us` package to internal `../../languages/registry`
- **Method**: Use `getLanguageInstance(US_EN)` instead of external providers

### 6. Scope Calculator Architecture Flaw
- **Issue**: Mutual recursion between scope calculation methods
- **Methods Involved**:
  - `calculateScope()` 
  - `calculateKnown()`
  - `calculateVisibility()`
  - `addVisibleInLocation()`
- **Architectural Concern**: Need to redesign to avoid circular dependencies

## Test Infrastructure Decisions

### 1. Test File Naming
- **Pattern**: `*.test.ts` files in `__tests__` directories
- **Not Used**: `*.spec.ts` pattern

### 2. Test Utilities
- **Decision**: Each test file includes its own entity creation utilities
- **Example**: `createRoom()`, `createThing()`, `createContainer()`
- **Rationale**: Self-contained tests without shared test utilities

### 3. Entity Test Data Structure
```typescript
const createRoom = (id: string, name = 'A Room'): Room => ({
  id,
  type: IFEntityType.ROOM,
  attributes: {
    name,
    description: 'A generic room',
    article: 'a',
  },
  relationships: {},
});
```

## Implementation Notes

### 1. IFWorld Test Coverage
- Entity management (add, update, delete)
- Relationships
- Container mechanics
- Scope and visibility
- Player mechanics

### 2. Parser Test Coverage
- Basic commands
- Disambiguation
- Two-object commands
- Movement commands
- Error handling
- Compound commands
- Pronouns

### 3. Missing Test Coverage
- Action system (not yet implemented)
- Event system integration
- Text emission system
- Rule system integration

## Status Updates
- Tests are broken due to import path issues
- Circular dependency in scope calculator needs architectural fix
- Parser tests need updating for new grammar system
- Action system not yet implemented

## Technical Debt Identified
1. Circular dependency in scope calculation
2. Test imports using wrong paths
3. External package dependencies in tests (@sharpee/lang-en-us)
4. Missing integration tests between components

## Next Actions (from conversation)
1. Fix test import paths
2. Resolve circular dependency in scope calculator
3. Update parser tests for new grammar system
4. Implement action system with proper test coverage

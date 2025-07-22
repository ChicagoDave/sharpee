# World Model ID Refactoring Analysis and Plan

## Context

We are working on the Sharpee Interactive Fiction platform. The world-model package currently uses a simple string-based ID system where tests and code use human-readable IDs like 'player', 'kitchen', 'door1'. 

During integration testing, we discovered issues with:
1. Entity reference ambiguity (IDs vs names)
2. Exit/door references in room connections
3. Potential ID collisions
4. Unclear separation between display names and internal IDs

## Current System

### Entity Creation
```typescript
const room = world.createEntity('kitchen', 'Kitchen');
// First param is ID, second is display name
```

### Method Signatures
```typescript
getEntity(id: string): IFEntity | undefined
moveEntity(entityId: string, targetId: string | null): boolean
canSee(observerId: string, targetId: string): boolean
```

### Room Exits
```typescript
// Direct room reference
exits: { north: 'hallway' }

// Or with ExitInfo
exits: { north: { destination: 'hallway' } }

// Or via door
exits: { north: { via: 'door1', destination: 'hallway' } }
```

## Problems to Solve

1. **Author Experience**: Forge authors won't want to manage IDs - they just want to use meaningful names
2. **Test Readability**: Tests should remain readable with meaningful identifiers  
3. **ID Uniqueness**: Need to guarantee no collisions
4. **Reference Resolution**: Need clear rules for resolving names to entities
5. **Debugging**: IDs should be short and indicate entity type

## Proposed Solutions to Evaluate

### Option 1: Auto-generated 3-character IDs
- Format: `[type-prefix][2-char-counter]` (e.g., r01, d01, i01, a01)
- Maintain name-to-ID mapping
- All methods use IDs only
- Provide `getId(name)` helper

### Option 2: Keep Current System
- Use meaningful strings as IDs
- Enforce uniqueness at creation time
- Let Forge layer handle name abstraction

### Option 3: Hybrid Approach
- Generate IDs but allow override
- Support both generated and custom IDs
- Methods accept IDs only

## Code Locations to Review

### Core Files
- `/packages/world-model/src/world/WorldModel.ts` - Core world model implementation
- `/packages/world-model/src/entities/if-entity.ts` - Entity class
- `/packages/world-model/src/traits/room/roomTrait.ts` - Room exits structure

### Test Files  
- `/packages/world-model/tests/integration/*.test.ts` - All integration tests
- `/packages/world-model/tests/fixtures/test-entities.ts` - Test factory functions

### Stdlib Impact
- `/packages/stdlib/src/commands/*` - Any commands that look up entities
- `/packages/stdlib/src/actions/*` - Action handlers that reference entities

## Questions to Answer

1. **Scope**: What's the full blast radius of changing the ID system?
2. **Migration**: Can we create a migration path that doesn't break everything at once?
3. **API Design**: Should methods accept only IDs, or support both IDs and names?
4. **Type Safety**: Can we use TypeScript to enforce ID usage vs name usage?
5. **Forge Integration**: How will this impact the future Forge authoring experience?

## Deliverables Needed

1. **Decision**: Which approach to take
2. **Implementation Plan**: Step-by-step refactoring approach
3. **API Design**: Final method signatures
4. **Migration Guide**: How to update existing code
5. **Test Strategy**: How to update tests systematically

## Additional Context

- This is an unreleased project, so breaking changes are acceptable
- The goal is to get it right now before we build more on top
- Need to consider both developer experience (tests) and author experience (Forge)
- Performance is not a primary concern - clarity and correctness are

Please analyze the current system, evaluate the options, and provide a comprehensive refactoring plan that addresses all concerns while minimizing disruption to the existing codebase.

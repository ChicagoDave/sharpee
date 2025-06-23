# Sharpee Architecture Refactoring Plan

## Current Issues

1. **Mixed Abstractions**: Core contains generic entity/relationship concepts, but StdLib imports them directly and extends them with IF-specific concepts
2. **Unclear Boundaries**: It's not clear what belongs in Core vs StdLib
3. **Direct Imports**: StdLib imports directly from `@sharpee/core` throughout, creating tight coupling
4. **Competing World Models**: Core has entity concepts but StdLib has its own IF-specific world model

## Proposed Architecture

### Layer 1: Core (Generic Data Store)
- **Purpose**: Generic event-sourced data store with NO domain knowledge
- **Contains**:
  - Event system (emit, listen, store events)
  - Channel system (text output channels)
  - Extension registry (plugin system)
  - Language provider interface (basic text formatting)
- **Does NOT contain**:
  - Entity concepts
  - Relationship concepts  
  - World model
  - Parser
  - Actions
  - Any IF-specific concepts

### Layer 2: StdLib (IF Implementation)
- **Purpose**: Complete IF implementation using Core as infrastructure
- **Contains**:
  - IF Entity system (Room, Thing, Person, etc.)
  - IF World model (locations, scope, visibility)
  - IF Parser (verb-noun parsing)
  - IF Actions (take, drop, go, etc.)
  - IF-specific language providers
  - Game context and execution
- **Imports from Core**:
  - ONLY through a controlled boundary (`core-imports.ts`)
  - Only infrastructure services (events, channels, extensions, base language)

### Layer 3: Forge (Author API)
- **Purpose**: Fluent API for game authors
- **Contains**:
  - Builder patterns for creating games
  - Simplified APIs over StdLib
  - Story/scene abstractions

## Refactoring Steps

### Step 1: Move Entity/Relationship concepts out of Core
Since entities and relationships are domain concepts (even if generic), they should not be in Core.

**Action**: 
- Remove `/packages/core/src/types/entity.ts`
- Remove `/packages/core/src/types/relationship.ts`
- Remove `/packages/core/src/types/attribute.ts`
- Update Core exports to not include these

### Step 2: Create StdLib's own Entity system
StdLib should define its own IF-specific entity system without depending on Core types.

**Action**:
- Create `/packages/stdlib/src/entities/base-types.ts` with IF-specific Entity interface
- Update all StdLib code to use these local types
- Remove imports of entity types from Core

### Step 3: Update core-imports.ts
This file should be the ONLY place StdLib imports from Core, and should only import infrastructure.

**Action**:
- Remove entity/relationship/attribute imports
- Keep only: events, channels, extensions, language provider interface
- Add clear comments about what can/cannot be imported

### Step 4: Fix World Model imports
The IF world model should use StdLib's entity types, not Core's.

**Action**:
- Update all files in `/packages/stdlib/src/world-model/` to use local entity types
- Remove any direct `@sharpee/core` imports (use core-imports.ts instead)

### Step 5: Clarify Rules System placement
The rules system seems IF-specific and should probably be in StdLib, not Core.

**Decision needed**: Is the rules system generic enough for Core, or is it IF-specific?

## Benefits of This Approach

1. **Clear Separation**: Core is purely infrastructure, StdLib is the IF engine
2. **No Domain Leakage**: Core has no knowledge of entities, rooms, or any game concepts
3. **Flexible**: Other narrative systems could be built on Core without IF concepts
4. **Maintainable**: Clear boundaries make it easier to evolve each layer independently
5. **Testable**: Each layer can be tested in isolation

## Migration Path

1. Start by updating imports to go through core-imports.ts (quick win)
2. Create StdLib's entity types alongside Core's (parallel implementation)
3. Gradually migrate StdLib code to use its own types
4. Once migration complete, remove entity types from Core
5. Update tests to reflect new structure

## Example Structure After Refactoring

```
packages/
  core/
    src/
      events/        # Event system
      channels/      # Output channels
      extensions/    # Plugin system
      language/      # Basic text formatting
      index.ts       # NO entity exports
      
  stdlib/
    src/
      core-imports.ts   # ONLY infrastructure imports from Core
      entities/         # IF-specific entity system
        types.ts        # Entity, Room, Thing, etc.
      world-model/      # IF world implementation
      parser/           # IF parser
      actions/          # IF actions
      language/         # IF-specific language providers
      
  forge/
    src/
      builders/         # Fluent API
      story/           # High-level abstractions
```

This architecture maintains the original vision while fixing the current design conflicts.

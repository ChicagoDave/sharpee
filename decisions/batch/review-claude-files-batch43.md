# Architecture Decisions - Batch 42

## Files Reviewed
- 2025-06-17-21-17-24.json - Stdlib Execution System Review
- 2025-06-17-21-31-36.json - World Model Implementation Phase 1
- 2025-06-17-22-04-38.json - World Model Implementation Phase 4

## Key Architecture Decisions

### 1. World Model Design - Trait-Based Entity System [MAJOR]
**Context**: Discussion of world model architecture and comparison with traditional IF inheritance models.

**Decision**: Implement a component-based (renamed to "trait-based") entity system instead of traditional inheritance.

**Rationale**:
- More flexible than inheritance - allows mixing behaviors
- Supports complex objects (e.g., a container that's also takeable)
- Better extensibility for authors
- Clean separation of concerns
- Aligns with modern game engine patterns

**Key Design Points**:
- Entities have composable "traits" (not "components" - using IF-friendly terminology)
- Standard traits include: identity, location, container, portable, etc.
- Query system allows complex entity searches
- All IF logic stays in StdLib, not Core

### 2. Terminology Decision - "Traits" not "Components" 
**Context**: Discussion about using technical ECS terminology vs IF-friendly terms.

**Decision**: Use "traits" instead of "components" throughout the system.

**Rationale**:
- More natural for IF authors
- Avoids confusion with technical game engine terms
- Better aligns with IF conventions (e.g., Inform 7 uses similar terminology)
- Makes error messages and documentation more accessible

### 3. Execution System Architecture
**Context**: Review of stdlib execution system and integration with world model.

**Decision**: Keep the CommandExecutor but enhance it with:
- Action registration system
- Error handling for missing actions
- Pre/post execution hooks
- Action aliasing support

**Execution Pipeline**:
```
Input → Parser → Resolver → Executor → Action → Events → Channels → Text
                                ↓
                           World Model
```

### 4. Forge API Design Philosophy
**Context**: How the fluent author API (Forge) should interact with the world model.

**Key Principles**:
1. Fluent and Intuitive - Natural language-like flow
2. Progressive Disclosure - Simple things simple, complex things possible
3. Type-Safe - Full TypeScript support with intellisense
4. Declarative - Describe what you want, not how to build it
5. Composable - Build complex objects from simple pieces
6. Scriptable - Easy hooks for custom behavior

**Example**:
```typescript
// Author writes:
thing("lamp", "brass lamp")
  .portable()
  .lightSource()
  .switchable();

// Forge creates trait-based entity underneath
```

### 5. Advanced Traits Implementation
**Context**: Phase 4 of world model implementation.

**Implemented Traits**:
- **ScriptableTrait**: Custom behavior hooks (before/after/instead)
- **NPCTrait**: State management, memory, scheduling, relationships
- **DialogueTrait**: Conversation trees with conditions and effects
- **MerchantTrait**: Trading system with inventory and pricing
- **PlayerTrait**: Stats, preferences, inventory constraints
- **DoorTrait**: Bidirectional room connections

**Design Pattern**: All traits:
- Extend `ValidatedTrait` for automatic validation
- Support serialization/deserialization
- Provide rich customization options
- Include helper methods for common operations

### 6. World Model Service Responsibilities
**Context**: How the world model service should integrate with the rest of the system.

**Responsibilities**:
- Entity CRUD operations
- Trait management helpers
- Spatial relationship management
- State serialization/deserialization
- Query builder for complex searches
- Scope service for visibility/reachability

### 7. No Unicode Policy
**Context**: Coding standards for the project.

**Decision**: NO Unicode in code - ASCII only.

**Rationale**: Compatibility and simplicity across different environments.

## Implementation Status
- Phase 1 (Core Trait System): ✅ Complete
- Phase 2 (Standard Traits): ✅ Complete  
- Phase 3 (Interactive Traits): ✅ Complete
- Phase 4 (Advanced Traits): ✅ Complete
- Phase 5 (World Model Service): 🔲 Pending
- Phase 6 (Integration): 🔲 Pending
- Phase 7 (Testing): 🔲 Pending

## Next Steps
The trait-based world model provides the foundation for Sharpee's entity system. Phase 5 will implement the World Model Service to provide high-level APIs for managing entities and their relationships.

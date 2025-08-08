# ADR-014 Assessment: Unrestricted World Model Access

## Executive Summary

The decision to separate WorldModel and AuthorModel represents a mature architectural choice that aligns with established patterns in interactive fiction engine design. This assessment examines the decision through multiple lenses: technical architecture, author experience, maintainability, and ecosystem implications.

## Strengths of the Design

### 1. Clear Separation of Concerns

The dual-model approach creates a clean conceptual boundary between "construction time" and "runtime" - a distinction that experienced IF authors intuitively understand. This mirrors successful patterns in engines like:

- **Inform 7**: Distinguishes between "setting up the world" and "when play begins"
- **TADS 3**: Separate initialization methods vs. action processing
- **Unity/Unreal**: Editor API vs. Runtime API

This separation is not just technically sound but pedagogically valuable - it helps authors understand when they're defining the world versus simulating it.

### 2. Event System Integrity

By keeping world construction events out of the event stream, the design preserves the narrative integrity of the event history. This is crucial for:

- **Debugging**: Event logs show actual gameplay, not setup noise
- **Save Systems**: Smaller, cleaner save files
- **Analytics**: Clear player action tracking
- **Undo/Redo**: Only meaningful actions are reversible

### 3. Author Empowerment

The AuthorModel's unrestricted access acknowledges a fundamental truth: authors need god-like powers during world construction. Fighting against this need (as the current implementation does) leads to:

- Verbose workarounds
- Fragile setup code  
- Author frustration
- Inconsistent world states

### 4. Type Safety and API Clarity

Having separate models allows each API to be optimized for its use case:

```typescript
// Clear, safe gameplay API
world.moveEntity(player, door); // Returns boolean, might fail

// Direct authorial API  
author.moveEntity(player, door); // Always succeeds, returns void
```

## Potential Concerns and Mitigations

### 1. Complexity and Learning Curve

**Concern**: Two APIs increase cognitive load for new developers.

**Mitigation**: This is addressable through:
- Clear naming conventions
- Comprehensive examples
- IDE support (autocomplete, hints)
- A getting-started guide that introduces AuthorModel first

**Reality Check**: Most IF authors already understand this distinction conceptually. The dual API makes their mental model explicit in code.

### 2. Synchronization Risks

**Concern**: Keeping two models in sync could lead to drift.

**Mitigation**: Since both models share the same DataStore, there's no synchronization needed. The only difference is the interface layer.

**Best Practice**: Use composition over inheritance:
```typescript
class AuthorModel {
  constructor(private dataStore: DataStore) {}
  
  moveEntity(entityId: string, targetId: string) {
    // Direct manipulation
    this.dataStore.spatialIndex.update(entityId, targetId);
  }
}

class WorldModel {
  constructor(private dataStore: DataStore) {}
  
  moveEntity(entityId: string, targetId: string): boolean {
    // Validation + events + manipulation
    if (!this.canMove(entityId, targetId)) return false;
    this.fireEvent('beforeMove', { entityId, targetId });
    this.dataStore.spatialIndex.update(entityId, targetId);
    this.fireEvent('afterMove', { entityId, targetId });
    return true;
  }
}
```

### 3. Feature Parity Maintenance

**Concern**: New features must be added to both models.

**Analysis**: Not all features belong in both models:
- Validation logic: WorldModel only
- Convenience builders: AuthorModel only  
- Core state queries: Both (shared implementation)

**Recommendation**: Create a shared base class for read operations:
```typescript
abstract class BaseModel {
  protected constructor(protected dataStore: DataStore) {}
  
  getEntity(id: string) { return this.dataStore.entities.get(id); }
  getLocation(id: string) { return this.dataStore.spatialIndex.getParent(id); }
  // ... other read operations
}
```

## Alternative Approaches Reconsidered

### The "Mode Flag" Alternative

The rejected "mode flag" approach (`world.setAuthorMode(true)`) seems simpler but has critical flaws:

1. **Statefulness**: Easy to forget to reset the mode
2. **Threading**: Problematic in async environments
3. **Testing**: Tests can pollute each other through mode leakage
4. **Clarity**: Not obvious from call site which mode is active

The dual-model approach makes the mode explicit at every call site.

### The "Force Parameter" Alternative

The `moveEntity(id, target, { force: true })` approach mixes concerns:

1. **API Bloat**: Every method needs force variants
2. **Event Confusion**: Does force skip events? Some events? 
3. **Validation Ambiguity**: Which validations are skipped?
4. **Discoverability**: Authors might not realize force exists

## Ecosystem Implications

### 1. Tooling Opportunities

The clean separation enables better tooling:

- **Visual World Builders**: Can use AuthorModel exclusively
- **Debug Consoles**: Can switch between models
- **Test Frameworks**: Can verify behavior differences
- **Linters**: Can warn about model misuse

### 2. Extension Pattern

Third-party extensions can follow the same pattern:
```typescript
class MagicAuthorExtension {
  constructor(private author: AuthorModel) {}
  
  createSpellbook(location: string, spells: Spell[]) {
    // Unrestricted creation
  }
}

class MagicWorldExtension {
  constructor(private world: WorldModel) {}
  
  castSpell(caster: string, spell: string) {
    // Rule-following magic
  }
}
```

### 3. Story File Format

The separation suggests story files should be explicit about their model usage:

```typescript
// story.ts
import { author } from '@sharpee/world-model';

// Build phase - using author model
author.createEntity('Kitchen', 'room');
author.createEntity('Fridge', 'container');
author.moveEntity('Fridge', 'Kitchen');
author.lockContainer('Fridge');

// Runtime phase - switch to world model
export function initGame(world: WorldModel) {
  world.registerHandler('game:start', () => {
    world.setPlayer('player');
  });
}
```

## Performance Considerations

### Memory Overhead

The dual-model approach has minimal memory overhead:
- Shared DataStore (no duplication)
- Two lightweight wrapper objects
- Method references (negligible)

### Runtime Performance

- **AuthorModel**: Faster (no validation)
- **WorldModel**: Same as current (unchanged)
- **Overall**: Potential performance gain during world building

### Development Performance

This is where the pattern shines:
- Faster world construction (no workarounds)
- Clearer code (explicit intent)
- Easier debugging (separated concerns)

## Recommendations

### 1. Implementation Priority

Phase implementation to deliver value quickly:

1. **MVP**: Core AuthorModel with basic methods
2. **Enhancement**: Convenience methods based on usage patterns
3. **Polish**: Advanced tooling integration

### 2. Documentation Strategy

- **Tutorial Path**: Start with AuthorModel (simpler)
- **Reference Split**: Separate sections for each model
- **Migration Guide**: For existing WorldModel users
- **Patterns Library**: Common world-building patterns

### 3. API Evolution

Reserve space for future growth:

```typescript
interface AuthorModel {
  entities: EntityAuthorAPI;
  rooms: RoomAuthorAPI;
  items: ItemAuthorAPI;
  actors: ActorAuthorAPI;
  // Namespace for organization
}
```

### 4. Validation Strategy

Consider optional validation in AuthorModel for development:

```typescript
author.enableValidation(); // Development mode
author.moveEntity(item, nonContainer); // Warns but succeeds
author.disableValidation(); // Production mode
```

## Conclusion

ADR-014 represents a mature architectural decision that:

1. **Solves real problems** that authors face
2. **Follows established patterns** in IF engine design
3. **Maintains system integrity** through clear boundaries
4. **Enables future growth** through clean separation

The dual-model approach is not just a technical solution but a conceptual framework that aligns with how IF authors think about their craft. It distinguishes between "arranging the stage" and "performing the play" - a distinction fundamental to interactive fiction.

The implementation complexity is manageable, the benefits are clear, and the pattern provides a solid foundation for the Sharpee engine's growth. This is a design decision that the platform can build on for years to come.

## Risk Assessment

- **Technical Risk**: Low (shared state, clear patterns)
- **Adoption Risk**: Low (aligns with author mental models)  
- **Maintenance Risk**: Medium (two APIs to maintain)
- **Evolution Risk**: Low (clean boundaries enable change)

Overall Assessment: **Strongly Recommended for Implementation**

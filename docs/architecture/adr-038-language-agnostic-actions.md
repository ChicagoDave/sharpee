# ADR-038: Language-Agnostic Action Implementation

Date: 2025-07-22
Status: Proposed
Author: Development Team

## Context

During the implementation of the pulling action (`pulling.ts`) in the stdlib package, we discovered that the action was detecting object behaviors by checking for English words in entity names and descriptions:

```typescript
// Current implementation checks English words
if (name.includes('lever') || name.includes('handle') || 
    description.includes('lever') || description.includes('handle')) {
  pullType = 'lever';
}
```

This approach violates our core principle that the world model and actions should be language-agnostic. The language provider exists at the game engine level and is not accessible to actions in the stdlib.

### Problems with Current Approach

1. **Language Coupling**: Actions are tightly coupled to English language patterns
2. **Internationalization**: Other languages cannot properly implement these actions without modification
3. **Architectural Violation**: Language-specific logic in the wrong layer
4. **Hidden Behavior**: Objects exhibit behaviors based on their names rather than explicit properties
5. **Unpredictable**: Authors may unknowingly trigger behaviors by using certain words

## Decision

We will refactor all actions to be truly language-agnostic by:

1. **Removing all language-specific string detection from actions**
2. **Using explicit traits to declare object behaviors**
3. **Making behavior declaration mandatory for special interactions**

### Implementation Pattern

Instead of detecting behavior from names/descriptions:

```typescript
// ❌ WRONG: Language-specific detection
if (name.includes('lever') || description.includes('handle')) {
  // Handle as lever
}
```

We will use explicit behavioral traits:

```typescript
// ✅ CORRECT: Trait-based behavior
if (target.has(TraitType.PULLABLE)) {
  const pullable = target.get(TraitType.PULLABLE);
  // Handle based on pullable properties
}
```

### Trait Design

Objects must explicitly declare their interactive behaviors through traits:

```typescript
// Example: Creating a pullable lever
const lever = world.createEntity('brass lever', 'object');
lever.add({
  type: TraitType.PULLABLE,
  pullEffect: 'toggle',
  linkedTo: 'gate'
});

// Example: Creating a pullable cord
const cord = world.createEntity('bell cord', 'object');
cord.add({
  type: TraitType.PULLABLE,
  pullEffect: 'activate',
  activates: 'bell'
});
```

## Consequences

### Positive

1. **True Language Independence**: Actions work identically regardless of language
2. **Explicit Behavior**: Objects must declare their behaviors, making them predictable
3. **Clear Separation**: Language concerns stay in the language layer
4. **Extensibility**: Games can create objects with any names without triggering unwanted behaviors
5. **Better Testing**: Tests explicitly declare behaviors, making them clearer
6. **Type Safety**: TypeScript can enforce behavior contracts

### Negative

1. **More Verbose**: Objects require explicit trait declarations
2. **No Magic**: Authors can't rely on naming conventions for behavior
3. **Migration Effort**: Existing actions need refactoring
4. **Learning Curve**: Authors must learn about behavioral traits

### Neutral

1. **Documentation Need**: Behavioral traits must be well-documented
2. **Trait Proliferation**: May need many trait types for different behaviors

## Alternatives Considered

### 1. Language Provider Detection at Parser Level
Have the parser/validator detect behaviors and add hints to commands.
- **Rejected**: Adds complexity to parser, mixes concerns

### 2. Required Messages for Patterns
Use required messages to store detection patterns.
- **Rejected**: Still couples actions to language patterns

### 3. Language Provider Methods in Actions
Give actions access to language provider.
- **Rejected**: Violates architectural boundaries

### 4. Hybrid Approach
Use traits primarily but fall back to name detection.
- **Rejected**: Maintains language coupling, unpredictable behavior

## Implementation Plan

1. **Define Behavioral Traits** in world-model:
   - `PULLABLE` - Can be pulled
   - `PUSHABLE` - Can be pushed  
   - `TURNABLE` - Can be turned/rotated
   - `PRESSABLE` - Can be pressed (buttons)
   - etc.

2. **Refactor Actions** starting with:
   - `pulling.ts` - Remove string detection
   - `pushing.ts` - Remove string detection
   - `turning.ts` - Remove string detection
   - Review all other actions for language dependencies

3. **Update Tests**:
   - Modify tests to explicitly add behavioral traits
   - Remove reliance on object naming

4. **Documentation**:
   - Document all behavioral traits
   - Provide examples for game authors
   - Update action documentation

## References

- Core Principle: "All text is sent through events to an event source data store"
- Design Goal: "No language-specific logic in world model or actions"
- Related ADR: ADR-001 (Command Validation Without Objects)

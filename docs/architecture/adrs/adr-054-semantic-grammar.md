# ADR-054: Semantic Grammar for Command Processing

## Status
Proposed

## Context

During the interface refactoring (ADR-053), we discovered that actions were tightly coupled to parser implementation details. Actions were accessing deep parser structures like:
- `context.command.parsed.extras?.direction`
- `context.command.parsed.structure.verb?.text`
- `context.command.parsed.structure.preposition?.text`

This coupling created several problems:
1. **Architectural violation** - Actions shouldn't know parser internals
2. **Interface pollution** - Clean interfaces impossible with parser dependencies
3. **Command modification hacks** - INSERTING action modifies parsed commands to add implicit prepositions
4. **Lost semantic information** - Actions manually interpret verb variations
5. **Scattered normalization** - Each action normalizes directions, prepositions independently

The core issue: the parser identifies syntactic structure but doesn't interpret meaning. Actions are forced to derive semantics from raw parse data.

## Decision

We will implement **Semantic Grammar** - grammar rules that embed semantic mappings, producing meaningful properties during parsing rather than requiring separate interpretation.

Grammar rules will include:
- **Verb mappings** - Map verb variations to semantic properties (e.g., "discard" → manner: "careless")
- **Preposition normalization** - Normalize variations (e.g., "into" → spatialRelation: "in")
- **Direction normalization** - Normalize abbreviations (e.g., "n" → direction: "north")
- **Implicit detection** - Flag when prepositions/directions are implicit
- **Default semantics** - Provide baseline semantic properties

Actions will receive a clean `CommandSemantics` interface instead of accessing parser internals.

## Consequences

### Positive

1. **Clean Architecture**
   - Parser handles all linguistic interpretation
   - Actions receive semantic properties, not parse trees
   - Clear separation of concerns

2. **Simplified Actions**
   ```typescript
   // Before: Check verb text
   if (context.command.parsed.structure.verb?.text === 'discard') { ... }
   
   // After: Use semantic property
   if (context.command.semantics?.manner === 'careless') { ... }
   ```

3. **No Command Modification**
   - INSERTING no longer needs to inject prepositions
   - Grammar knows "insert X Y" implicitly means "insert X into Y"

4. **Richer Gameplay**
   - Different behaviors for forceful/careful/stealthy actions
   - Consistent semantic interpretation across actions

5. **Interface Refactoring Enabled**
   - IActionContext doesn't need parser types
   - Clean contracts possible in if-domain package

6. **Declarative Semantics**
   - Semantics defined in grammar rules, not imperative code
   - Story authors can customize both syntax and semantics together

### Negative

1. **Grammar Complexity**
   - Rules become larger with semantic definitions
   - More to understand when defining grammar

2. **Parser Responsibility**
   - Parser does more work (but still single pass)
   - Harder to unit test parsing vs semantics separately

3. **Migration Effort**
   - All actions need updating to use semantic properties
   - Existing grammar rules need semantic mappings added

## Implementation

### 1. Semantic Properties Interface
```typescript
interface CommandSemantics {
  manner?: 'normal' | 'careful' | 'careless' | 'forceful' | 'stealthy';
  spatialRelation?: 'in' | 'on' | 'under' | 'behind' | 'beside';
  direction?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  implicitPreposition?: boolean;
  implicitDirection?: boolean;
  custom?: Record<string, any>;
}
```

### 2. Grammar Rule Enhancement
```typescript
grammar
  .define('insert :item :container')
  .mapsTo('if.action.inserting')
  .withSemanticVerbs({
    'insert': { manner: 'normal' },
    'jam': { manner: 'forceful' },
    'slip': { manner: 'stealthy' }
  })
  .withDefaultSemantics({
    spatialRelation: 'in',
    implicitPreposition: true
  })
  .build();
```

### 3. Action Usage
```typescript
validate(context: IActionContext): ValidationResult {
  const semantics = context.command.semantics || {};
  
  if (semantics.manner === 'forceful' && container.hasAttribute('fragile')) {
    return { valid: false, error: 'would_damage' };
  }
  
  // No need to check verb.text or modify commands
}
```

## Examples

### INSERTING: Eliminating Command Modification
**Problem**: INSERTING modifies parsed commands to add 'in' preposition for "insert X Y"

**Solution**: Grammar rule with implicit preposition semantics
```typescript
// Grammar knows "insert X Y" means "into"
.withDefaultSemantics({
  spatialRelation: 'in',
  implicitPreposition: true
})
```

### GOING: Direction Normalization
**Problem**: Actions check `extras?.direction` and normalize "n" to "north"

**Solution**: Grammar provides normalized directions
```typescript
.withSemanticDirections({
  'n': 'north',
  'north': 'north',
  's': 'south',
  'south': 'south'
})
```

### DROPPING: Verb Variations
**Problem**: Actions check verb.text to determine manner

**Solution**: Grammar maps verbs to manner
```typescript
.withSemanticVerbs({
  'drop': { manner: 'normal' },
  'discard': { manner: 'careless' },
  'throw': { manner: 'forceful' }
})
```

## Alternatives Considered

### 1. Semantic Interpretation Phase
Add a separate phase between parsing and validation that interprets semantics.
- **Rejected**: Adds complexity, another layer to maintain

### 2. Action-Level Interpretation
Keep semantic interpretation in actions with helper utilities.
- **Rejected**: Doesn't solve the coupling problem

### 3. Adapter Pattern
Create adapters that convert parsed commands to semantic commands.
- **Rejected**: Band-aid solution, doesn't address root cause

### 4. Flattening Parse Structure
Add flat properties to ValidatedCommand for easier access.
- **Rejected**: Still exposes parser details, just shallower

## Related

- **ADR-051**: Validate/Execute Pattern - Semantic properties used in both phases
- **ADR-052**: Event-Driven Actions - Semantic events can be richer
- **ADR-053**: Interface Naming Convention - Clean interfaces enabled by semantics
- **ADR-010**: No I-Prefix (superseded) - Part of larger interface refactoring

## Notes

The semantic grammar approach was discovered during the interface refactoring when we realized that the core problem wasn't just naming or organization, but that actions were doing linguistic interpretation that belonged in the parser.

The key insight: grammar rules should be a complete linguistic model that understands meaning, not just structure. This makes the grammar the single source of truth for both syntax and semantics.

Implementation validated with INSERTING action as the hardest case - it was modifying commands, which is now completely eliminated.
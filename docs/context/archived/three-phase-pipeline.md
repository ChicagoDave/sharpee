# Three-Phase Pipeline: Parse → Validate → Semantics

## Current Pipeline (2 phases)
```
Input Text → Parser → ParsedCommand → Validator → ValidatedCommand → Action
                         (syntax)                    (entities resolved)
```

## Proposed Pipeline (3 phases)
```
Input Text → Parser → ParsedCommand → Validator → ValidatedCommand → Interpreter → SemanticCommand → Action
                         (syntax)                    (entities resolved)                (meaning)
```

## Each Phase's Responsibility

### Phase 1: Parse (Syntax)
**Input**: Raw text  
**Output**: ParsedCommand  
**Responsibility**: Structure and grammar
- Identify verb, nouns, prepositions
- Determine sentence structure
- Extract tokens and patterns
- No world knowledge

```typescript
interface ParsedCommand {
  tokens: Token[];
  structure: {
    verb: VerbPhrase;
    directObject?: NounPhrase;
    preposition?: PrepPhrase;
    indirectObject?: NounPhrase;
  };
  extras?: Record<string, any>; // Parser-specific extras
}
```

### Phase 2: Validate (Resolution)
**Input**: ParsedCommand  
**Output**: ValidatedCommand  
**Responsibility**: Resolve references against world
- Find entities matching noun phrases
- Resolve pronouns
- Check scope/visibility
- Select action handler
- No semantic interpretation

```typescript
interface ValidatedCommand {
  parsed: ParsedCommand;
  actionId: string;
  directObject?: ResolvedEntity;
  indirectObject?: ResolvedEntity;
  // Still has parser details, just adds resolved entities
}
```

### Phase 3: Interpret (Semantics)
**Input**: ValidatedCommand  
**Output**: SemanticCommand  
**Responsibility**: Extract meaning
- Convert verb → manner (drop → normal, discard → careless)
- Normalize directions (n → north)
- Interpret spatial relations (onto → on)
- Extract typed parameters
- Remove parser details

```typescript
interface SemanticCommand {
  actionId: string;
  actor: Entity;
  directObject?: Entity;
  indirectObject?: Entity;
  
  // Semantic properties only
  manner?: ActionManner;
  direction?: Direction;
  spatialRelation?: SpatialRelation;
  
  // Typed parameters
  parameters: ActionParameters;
}
```

## Benefits of Separation

### 1. Single Responsibility
Each phase has one clear job:
- Parser: syntax
- Validator: resolution  
- Interpreter: semantics

### 2. Testability
Can test each phase independently:
- Parser tests: "Does 'go n' parse correctly?"
- Validator tests: "Does 'take ball' resolve to the red ball?"
- Interpreter tests: "Does 'discard' map to careless manner?"

### 3. Modularity
Can swap implementations:
- Different parsers (English, Spanish, etc.)
- Different validators (strict, fuzzy, etc.)
- Different interpreters (story-specific semantics)

### 4. Clean Interfaces
Each phase has appropriate data:
- Actions never see ParsedCommand
- Only Interpreter needs to understand parser extras
- Actions work with pure semantics

## Implementation Example

### SemanticInterpreter Class
```typescript
class SemanticInterpreter {
  private mannerMap = new Map([
    ['drop', 'normal'],
    ['discard', 'careless'],
    ['place', 'careful'],
    ['throw', 'forceful']
  ]);
  
  private directionMap = new Map([
    ['n', 'north'],
    ['north', 'north'],
    ['u', 'up'],
    ['up', 'up']
  ]);
  
  interpret(validated: ValidatedCommand): SemanticCommand {
    const parsed = validated.parsed;
    
    return {
      actionId: validated.actionId,
      actor: this.getActor(validated),
      directObject: validated.directObject?.entity,
      indirectObject: validated.indirectObject?.entity,
      
      // Semantic interpretation
      manner: this.interpretManner(parsed.structure.verb?.text),
      direction: this.interpretDirection(parsed.extras?.direction),
      spatialRelation: this.interpretSpatialRelation(
        parsed.structure.preposition?.text
      ),
      
      // Extract action-specific parameters
      parameters: this.extractParameters(validated)
    };
  }
  
  private interpretManner(verb?: string): ActionManner | undefined {
    if (!verb) return undefined;
    return this.mannerMap.get(verb.toLowerCase()) || 'normal';
  }
  
  private interpretDirection(dir?: string): Direction | undefined {
    if (!dir) return undefined;
    return this.directionMap.get(dir.toLowerCase());
  }
  
  private extractParameters(validated: ValidatedCommand): ActionParameters {
    // Action-specific parameter extraction
    switch (validated.actionId) {
      case 'saving':
        return {
          slot: validated.parsed.extras?.slot,
          quick: validated.parsed.extras?.quick || false,
          force: validated.parsed.extras?.force || false
        };
      case 'going':
        return {
          direction: this.interpretDirection(
            validated.parsed.extras?.direction
          )
        };
      default:
        return {};
    }
  }
}
```

## Comparison with Current Approach

### Current: Validator Does Everything
```typescript
class CommandValidator {
  validate(parsed: ParsedCommand): ValidatedCommand {
    // 1. Resolve entities
    // 2. Check scope
    // 3. Select action
    // 4. (Proposed) Extract semantic properties
    // Too many responsibilities!
  }
}
```

### New: Each Phase Focused
```typescript
class CommandValidator {
  validate(parsed: ParsedCommand): ValidatedCommand {
    // Just resolve entities and select action
  }
}

class SemanticInterpreter {
  interpret(validated: ValidatedCommand): SemanticCommand {
    // Just extract meaning
  }
}
```

## Migration Path

### Phase 1: Add Interpreter (Parallel)
- Add SemanticInterpreter class
- Creates SemanticCommand from ValidatedCommand
- Actions can opt-in to use SemanticCommand
- Old actions still work with ValidatedCommand

### Phase 2: Migrate Actions
- Update actions one by one to use SemanticCommand
- Remove parsed command access
- Use semantic properties

### Phase 3: Clean Up
- Mark ValidatedCommand.parsed as @internal
- Remove backward compatibility code
- Actions only see SemanticCommand

## Questions to Consider

### 1. Where does the interpreter live?
- **Option A**: In stdlib (near actions)
- **Option B**: In world-model (part of command processing)
- **Option C**: New package (@sharpee/semantics)

### 2. How configurable should interpretation be?
- Story-specific verb mappings?
- Custom semantic properties?
- Extensible interpretation rules?

### 3. Should we combine validation and interpretation?
- Keep as separate phases for clarity?
- Or combine for performance?

### 4. What about command execution?
Should we also separate execution into its own phase?
```
Parse → Validate → Interpret → Plan → Execute
```

## Recommendation

The three-phase pipeline (Parse → Validate → Semantics) provides:
1. **Clean separation of concerns**
2. **Type safety at action level**
3. **Parser independence**
4. **Testability**
5. **Extensibility**

This is more complex than flattening but solves the fundamental problem of actions being coupled to parser implementation.

The key insight: **Semantic interpretation is a distinct responsibility that deserves its own phase.**
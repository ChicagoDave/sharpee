# ADR-017: Disambiguation Strategy for Entity References

## Status
Proposed

## Context
With the removal of unique name constraints and the `getId()` lookup method (see ADR-016), we need a robust disambiguation system for resolving player commands that reference entities by name. When a player types "take torch" and there are multiple torches in scope, the system needs to determine which one they mean.

This is a fundamental problem in interactive fiction that most mature IF systems handle through a combination of:
- Contextual rules (proximity, recency, obviousness)
- Player interaction (asking "Which torch do you mean?")
- Smart defaults (the most likely choice)

## Decision
We will implement a multi-stage disambiguation system that:

1. **Identifies all matches** in the current scope
2. **Applies disambiguation rules** to narrow the choices
3. **Asks the player** if multiple candidates remain
4. **Learns from context** to improve future disambiguation

### Disambiguation Pipeline

```typescript
interface DisambiguationContext {
  playerInput: string;           // "take torch"
  entityName: string;           // "torch"
  action: string;               // "take"
  scope: IFEntity[];            // All entities in scope
  observer: IFEntity;           // The player/actor
  recentInteractions: string[]; // Recent entity IDs interacted with
}

interface DisambiguationResult {
  entity?: IFEntity;            // If successfully disambiguated
  candidates?: IFEntity[];      // If multiple remain
  needsClarification: boolean;  // If player input needed
  clarificationPrompt?: string; // "Which torch do you mean?"
}
```

### Disambiguation Rules (in priority order)

1. **Exact Match Rule**
   - If only one entity matches the name exactly, choose it

2. **Held Item Rule**
   - Prefer items the player is already holding for actions like "drop", "examine"

3. **Proximity Rule**
   - Prefer items in the same container as the player
   - Then items in the room
   - Then items in other actors/containers

4. **Visibility Rule**
   - Prefer items that are directly visible
   - Deprioritize items in closed containers

5. **Recent Interaction Rule**
   - Prefer items the player recently interacted with
   - Maintain a history of last N interactions

6. **Action Context Rule**
   - "take" prefers items not already held
   - "drop" prefers items being held
   - "open" prefers openable items
   - "unlock" prefers locked items

7. **Obviousness Rule**
   - Prefer items that are not concealed/hidden
   - Prefer items mentioned in room descriptions

### Clarification Strategies

When multiple candidates remain after applying rules:

```typescript
// Basic enumeration
"Which do you mean:
1. the brass torch (on the wall)
2. the wooden torch (in your backpack)
3. the lit torch (carried by the guard)"

// Contextual description
"Do you mean the torch on the wall or the one in your backpack?"

// Smart grouping
"There are several torches here. Do you mean one of the lit ones or an unlit one?"
```

### Implementation Architecture

```typescript
class DisambiguationService {
  private rules: DisambiguationRule[];
  private interactionHistory: CircularBuffer<string>;
  
  constructor() {
    this.rules = [
      new ExactMatchRule(),
      new HeldItemRule(),
      new ProximityRule(),
      new VisibilityRule(),
      new RecentInteractionRule(),
      new ActionContextRule(),
      new ObviousnessRule()
    ];
  }
  
  disambiguate(context: DisambiguationContext): DisambiguationResult {
    // Find all entities matching the name
    let candidates = this.findMatches(context.entityName, context.scope);
    
    if (candidates.length === 0) {
      return { needsClarification: false };
    }
    
    if (candidates.length === 1) {
      return { 
        entity: candidates[0], 
        needsClarification: false 
      };
    }
    
    // Apply rules to score and filter candidates
    candidates = this.applyRules(candidates, context);
    
    if (candidates.length === 1) {
      return { 
        entity: candidates[0], 
        needsClarification: false 
      };
    }
    
    // Multiple candidates remain
    return {
      candidates,
      needsClarification: true,
      clarificationPrompt: this.generatePrompt(candidates, context)
    };
  }
  
  recordInteraction(entityId: string): void {
    this.interactionHistory.push(entityId);
  }
}
```

### Parser Integration

The command parser will integrate with disambiguation:

```typescript
class CommandParser {
  private disambiguator: DisambiguationService;
  private pendingDisambiguation?: {
    action: string;
    candidates: IFEntity[];
  };
  
  parse(input: string, world: WorldModel): ParseResult {
    // If we're waiting for disambiguation
    if (this.pendingDisambiguation) {
      return this.handleDisambiguationResponse(input);
    }
    
    // Normal parsing
    const { action, objectName } = this.parseCommand(input);
    const scope = world.getInScope(world.getPlayer().id);
    
    const result = this.disambiguator.disambiguate({
      playerInput: input,
      entityName: objectName,
      action: action,
      scope: scope,
      observer: world.getPlayer(),
      recentInteractions: this.disambiguator.getRecentInteractions()
    });
    
    if (result.needsClarification) {
      this.pendingDisambiguation = {
        action: action,
        candidates: result.candidates
      };
      return {
        needsInput: true,
        message: result.clarificationPrompt
      };
    }
    
    // Execute the command with the disambiguated entity
    return this.executeCommand(action, result.entity);
  }
}
```

## Consequences

### Positive
- **Natural Interaction**: Players can use natural language without worrying about unique identifiers
- **Smart Defaults**: Most commands will "just work" without clarification
- **Contextual Awareness**: The system considers what makes sense for each action
- **Learning**: Recent interactions influence future disambiguation
- **Extensible**: New rules can be added without changing the core system

### Negative
- **Complexity**: More complex than simple ID-based lookup
- **State Management**: Need to track interaction history and context
- **Testing**: Many edge cases to test
- **Performance**: Multiple rules to evaluate (though typically on small sets)

### Neutral
- **Standard IF Pattern**: This approach aligns with established IF conventions
- **Player Expectations**: Experienced IF players expect this behavior

## Implementation Phases

### Phase 1: Core Disambiguation
- Basic rule engine
- Exact match and proximity rules
- Simple clarification prompts

### Phase 2: Smart Rules
- Action context awareness
- Recent interaction tracking
- Visibility and obviousness rules

### Phase 3: Enhanced Clarification
- Natural language generation for prompts
- Smart grouping of similar items
- Partial match handling ("rusty key" matches "rusty iron key")

### Phase 4: Advanced Features
- Learning from player preferences
- Pronouns ("take it", "examine them")
- Plural handling ("take all torches")

## Alternatives Considered

### 1. Always Ask
Always ask the player when multiple matches exist.
- **Pros**: Simple, unambiguous
- **Cons**: Annoying for obvious cases, breaks flow

### 2. Random Selection
Pick one at random or always pick the first.
- **Pros**: Never needs clarification
- **Cons**: Unpredictable, frustrating for players

### 3. Unique Identifiers
Require players to use unique IDs or numbers.
- **Pros**: Unambiguous
- **Cons**: Unnatural, breaks immersion

### 4. Descriptive Names Only
Force all entities to have unique descriptive names.
- **Pros**: Simple implementation
- **Cons**: Limits author flexibility, unrealistic

## References
- Inform 7's disambiguation system
- TADS 3 resolver and verification
- Infocom's parser disambiguation strategies
- "Crafting Interactive Fiction" by Chris Crawford (disambiguation chapter)

## Future Considerations

- **Natural Language Processing**: Could use NLP to better understand context
- **Machine Learning**: Could learn player preferences over time
- **Multiplayer**: Disambiguation in multi-actor scenarios
- **Accessibility**: Clear disambiguation for screen readers

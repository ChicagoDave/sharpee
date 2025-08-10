# ADR-050: Meta-Commands Implementation

## Status
Proposed

## Context
Meta-commands (also called out-of-world actions in IF terminology) are commands that interact with the game system rather than the game world. Examples include:
- Debug commands (PARSER EVENTS ON/OFF)
- System commands (SAVE, RESTORE, QUIT)
- Information commands (SCORE, VERSION)
- Transcript commands (TRANSCRIPT ON/OFF)

These commands should not:
- Increment the turn counter
- Trigger NPC actions or daemons
- Be recorded in command history for AGAIN
- Affect game world state

Currently, Sharpee has no mechanism to distinguish meta-commands from regular game commands. All successful commands increment the turn counter and are processed identically.

## Decision
We will implement a hybrid approach using both inheritance and registration:

1. **MetaAction Base Class**: A new abstract base class that meta-commands can extend
2. **MetaCommandRegistry**: A centralized registry to track all meta-command IDs
3. **Engine Check**: The game engine will check the registry to determine meta-command behavior

### Implementation Details

```typescript
// 1. Base class for type-safe meta-commands
export abstract class MetaAction implements Action {
  abstract id: string;
  abstract verbs: string[];
  
  constructor() {
    // Auto-register on construction
    MetaCommandRegistry.register(this.id);
  }
  
  abstract execute(context: ActionContext): SemanticEvent[];
}

// 2. Registry for all meta-commands
export class MetaCommandRegistry {
  private static metaCommands = new Set<string>([
    // Pre-registered standard meta-commands
    'saving', 'restoring', 'quitting', 'restarting',
    'score', 'version', 'transcript'
  ]);
  
  static register(actionId: string): void {
    this.metaCommands.add(actionId);
  }
  
  static isMeta(actionId: string): boolean {
    return this.metaCommands.has(actionId);
  }
  
  static getAll(): string[] {
    return Array.from(this.metaCommands);
  }
}

// 3. Engine modification (game-engine.ts)
if (result.success) {
  const isMeta = MetaCommandRegistry.isMeta(result.actionId);
  
  if (!isMeta) {
    this.updateCommandHistory(result, input, turn);
    this.updateContext(result);  // Increments turn
  } else {
    // Meta-commands only update vocabulary
    this.updateScopeVocabulary();
  }
}
```

## Consequences

### Positive
- **Non-invasive**: No changes to core Action interface
- **Backwards compatible**: Existing commands continue to work
- **Flexible**: Supports both inheritance (new commands) and registration (existing commands)
- **Type-safe**: MetaAction provides type safety for new meta-commands
- **Single source of truth**: Registry centralizes meta-command identification
- **Self-documenting**: MetaAction base class makes intent clear
- **Easy to test**: Can query registry to verify meta-command status

### Negative
- **Dual mechanism**: Two ways to create meta-commands (inheritance vs registration)
- **Runtime registration**: Commands registered at runtime, not compile-time checked
- **Manual registration**: Existing commands need explicit registration
- **Additional abstraction**: One more concept for developers to understand

### Neutral
- **Similar to TADS**: Registry approach mirrors TADS's actionTime checking
- **Different from Inform**: More explicit than Inform's declarative approach
- **Future extensibility**: Could add metadata to registry entries if needed

## Alternatives Considered

### 1. Add isMeta property to Action interface
- **Rejected**: Too invasive, requires modifying core interface

### 2. Event-based signaling
- **Rejected**: Too implicit, requires scanning events

### 3. Naming convention (author.*, debug.*)
- **Rejected**: Too fragile, convention-based rather than enforced

### 4. MetaActionContext
- **Rejected**: Requires determining meta status before command execution

### 5. Capability-based system
- **Rejected**: Over-engineered for this use case

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create MetaAction base class
2. Create MetaCommandRegistry
3. Pre-register standard meta-commands

### Phase 2: Engine Integration
1. Modify game-engine.ts to check registry
2. Skip turn increment for meta-commands
3. Skip command history for meta-commands

### Phase 3: Command Migration
1. Refactor author commands to extend MetaAction
2. Register existing system commands (SAVE, RESTORE, etc.)
3. Update tests

### Phase 4: Documentation
1. Document MetaAction usage
2. Document registry API
3. Add examples

## Examples

### Creating a new meta-command:
```typescript
export class ParserEventsAction extends MetaAction {
  id = 'author.parser_events';
  verbs = ['parser'];
  
  execute(context: ActionContext): SemanticEvent[] {
    // Implementation
  }
}
```

### Registering an existing command as meta:
```typescript
// In action registry initialization
MetaCommandRegistry.register('saving');
MetaCommandRegistry.register('restoring');
```

### Checking if a command is meta:
```typescript
const isMeta = MetaCommandRegistry.isMeta(actionId);
```

## References
- [Meta-Commands Assessment](../design/meta-commands-assessment.md)
- [Meta-Commands Comparison with TADS/Inform](../design/meta-commands-comparison.md)
- [Meta-Commands Alternatives Analysis](../design/meta-commands-alternatives.md)
- TADS 3 SystemAction documentation
- Inform 7 "out of world" actions documentation

## Related ADRs
- ADR-016: Event-Driven Architecture
- ADR-024: Action System Design
- ADR-037: Command Processing Pipeline
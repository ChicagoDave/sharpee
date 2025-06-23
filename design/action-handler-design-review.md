# Sharpee Action/Handler Design Review

## Executive Summary
The Sharpee IF platform currently has two different systems for processing player commands:
1. **Actions** - A declarative, phase-based system in the actions folder
2. **Handlers** - A class-based, imperative system in the handlers folder

These systems appear to serve different purposes but have overlapping functionality that needs clarification.

## Current State Analysis

### Actions System (actions/*.ts)
- **Pattern**: Declarative `ActionDefinition` interface
- **Structure**: 
  ```typescript
  {
    id: string,
    name: string,
    verbs: string[],
    metadata: { changesWorld, undoable, category },
    phases: { validate?, execute }
  }
  ```
- **Examples**: taking, dropping, examining, going, opening, closing, etc.
- **Total**: 16 action files covering core IF verbs

### Handlers System (handlers/*.ts)
- **Pattern**: Class-based extending `BaseCommandHandler` (missing)
- **Structure**:
  ```typescript
  class XHandler extends BaseCommandHandler {
    constructor() { super([verbs]) }
    execute(command, context): CommandResult
    validate?(command, context): { valid, error? }
  }
  ```
- **Examples**: take-handler, drop-handler, look-handler, movement-handler, etc.
- **Total**: 9 handler files with some verb overlap

## Key Differences

### 1. **Command Format**
- **Actions** use `IFCommand` (noun/verb with entity references)
- **Handlers** use `ParsedCommand` (directObject/verb with string references)

### 2. **Return Types**
- **Actions** return `SemanticEvent[]`
- **Handlers** return `CommandResult` with events, success, and metadata

### 3. **State Management**
- **Actions** rely on world model methods (moveEntity, updateEntity)
- **Handlers** use context.updateWorldState() with immutable updates

### 4. **Entity Resolution**
- **Actions** receive pre-resolved entities in the command
- **Handlers** must find entities using context.findEntityByName()

### 5. **Error Handling**
- **Actions** return validation strings or throw during execution
- **Handlers** use createFailureResult() with error codes

## Design Issues

### 1. **Duplication**
- Both systems handle "take" (takingAction vs TakeHandler)
- Both systems handle "drop" (droppingAction vs DropHandler)
- Unclear which system should be used when

### 2. **Missing Infrastructure**
- `BaseCommandHandler` is imported but doesn't exist
- `RelationshipType` enum referenced but not found
- Inconsistent imports between files

### 3. **Different Abstractions**
- Actions are data-driven (good for serialization, extensions)
- Handlers are code-driven (good for complex logic, special cases)

### 4. **Integration Unclear**
- How do these systems work together?
- Which one processes player input first?
- Are handlers meant to delegate to actions?

## Possible Design Intents

### Theory 1: **Evolution**
- Handlers might be the older system
- Actions might be the new architecture
- Migration incomplete

### Theory 2: **Layered Architecture**
- Handlers might be the parser-facing layer (handle raw commands)
- Actions might be the world-model layer (handle validated commands)
- Handlers parse and delegate to actions

### Theory 3: **Dual System**
- Handlers for system commands (look, inventory, wait)
- Actions for world-interaction commands (take, drop, use)
- Different command types need different processing

## Recommendations

### 1. **Clarify the Architecture**
Decide on ONE of these approaches:

**Option A: Unified Action System**
- Remove handlers entirely
- Extend ActionDefinition to handle all command types
- Create action-router that maps ParsedCommand → IFCommand → Action

**Option B: Handler → Action Pipeline**
- Handlers parse and validate user input
- Handlers resolve entities and create IFCommand
- Handlers delegate to Actions for execution
- Actions remain pure world-model operations

**Option C: Dual System with Clear Boundaries**
- Document which commands use which system
- Handlers for meta/system commands
- Actions for world-interaction commands

### 2. **Fix Missing Infrastructure**
```typescript
// Create BaseCommandHandler in stdlib
export abstract class BaseCommandHandler implements CommandHandler {
  constructor(public verbs: string[]) {}
  
  canHandle(command: ParsedCommand): boolean {
    return this.verbs.includes(command.verb || '');
  }
  
  abstract execute(command: ParsedCommand, context: GameContext): Promise<CommandResult> | CommandResult;
  
  // Helper methods
  protected createFailureResult(error: string, ...args: any[]): CommandResult {
    return {
      success: false,
      error,
      events: [/* error event */]
    };
  }
}
```

### 3. **Standardize Entity Resolution**
- If keeping both systems, create shared entity resolution
- Consider caching resolved entities in ParsedCommand
- Avoid duplicate entity lookups

### 4. **Document the Design**
Create clear documentation explaining:
- When to use Actions vs Handlers
- How commands flow through the system
- How to add new commands
- Integration points between systems

## Questions for the Team

1. **What is the intended relationship between Actions and Handlers?**
2. **Are we migrating from Handlers to Actions, or keeping both?**
3. **Should system commands (look, inventory) be Actions too?**
4. **How should complex commands with multiple phases work?**
5. **What's the plan for BaseCommandHandler and other missing pieces?**

## Conclusion

The current state shows two overlapping systems that need reconciliation. The Actions system appears more aligned with the event-sourced, declarative architecture goals, while Handlers provide useful imperative patterns for complex cases.

I recommend Option B (Handler → Action Pipeline) as it:
- Preserves the clean Action abstractions
- Allows complex parsing logic in Handlers
- Provides a clear separation of concerns
- Enables gradual migration if needed

The key is to establish clear boundaries and ensure both systems work together coherently rather than competing.

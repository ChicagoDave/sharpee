# Sharpee Command Flow Architecture Analysis

## Current State Analysis

Based on my investigation, here's what we currently have:

### What EXISTS:
1. **Parser** (`IFParser`) - Converts text → `IFCommand` with resolved entities
2. **Actions** (`ActionDefinition`) - Validate and execute commands, return `SemanticEvent[]`
3. **World Model** (`IFWorld`) - Manages game state
4. **Story** - High-level API that creates parser and world

### What's MISSING:
1. **Action Router/Executor** - Nothing connects `IFCommand` to `ActionDefinition`
2. **Handler System Integration** - Handlers exist but aren't connected
3. **Text Service** - Events are created but not processed into text
4. **Command Router** - Referenced in handler code but doesn't exist

## Current Flow vs Intended Flow

### Current (Broken) Flow:
```
User Input → Parser → IFCommand → ??? → Nothing happens
```

### What Should Happen:
```
User Input → Parser → IFCommand → Action Router → Action → Events → Text Service → Output
```

## Architecture Alignment with Core/StdLib/Forge

The current design mostly aligns with the layered architecture:

### Core (✓ Correct)
- Generic event system
- Basic entity/attribute types
- Language provider interface
- Text service interface

### StdLib (Mostly Correct)
- ✓ Parser (IF-specific)
- ✓ Actions (IF game logic)
- ✓ World model (IF concepts)
- ✓ Events (IF-specific events)
- ❌ Missing: Action execution layer

### Forge (Not implemented yet)
- Should provide fluent author API
- Build on top of StdLib

## The Handler Problem

The handlers appear to be a **parallel system** that doesn't fit cleanly:

1. **Different Command Type**: `ParsedCommand` vs `IFCommand`
2. **Different Pattern**: Class-based vs data-driven
3. **Unclear Purpose**: Why both handlers AND actions?

## Recommended Architecture

### Option 1: Pure Action-Based (Recommended)

Remove handlers entirely and create an **Action Execution System** in StdLib:

```typescript
// stdlib/src/execution/action-executor.ts
export class ActionExecutor {
  private actions = new Map<string, ActionDefinition>();
  
  registerAction(action: ActionDefinition) {
    this.actions.set(action.id, action);
    // Register verbs from language provider
  }
  
  execute(command: IFCommand, context: GameContext): SemanticEvent[] {
    const action = this.actions.get(command.action);
    if (!action) {
      return [createErrorEvent('Unknown action')];
    }
    
    // Validate
    const valid = action.phases.validate?.(command, context) ?? true;
    if (typeof valid === 'string') {
      return [createErrorEvent(valid)];
    }
    
    // Execute
    return action.phases.execute(command, context);
  }
}
```

### Option 2: Handlers as Pre-processors

Keep handlers but clarify their role as **command pre-processors**:

```typescript
// Handlers parse complex cases and create normalized IFCommands
Handler → Parser Helper → Creates IFCommand → Action Executor → Action

Examples:
- "take all" → Handler creates multiple IFCommands
- "inventory" → Handler creates special system command
- "go north" → Handler normalizes to standard going action
```

### Option 3: Dual System with Clear Boundaries

- **Handlers**: For system/meta commands (look, inventory, save, load)
- **Actions**: For world interaction (take, drop, open, use)

## Critical Missing Piece

The **Action Executor** is the critical missing component. Without it:
- Parser creates commands that go nowhere
- Actions exist but are never called
- Events are never generated
- No text output occurs

## Recommended Next Steps

1. **Implement ActionExecutor** in StdLib:
   ```typescript
   // Connects Parser → Actions
   // Manages action registration
   // Handles validation and execution
   // Returns events for text service
   ```

2. **Decision on Handlers**:
   - Remove them (Option 1)
   - Repurpose as pre-processors (Option 2)
   - Document clear boundaries (Option 3)

3. **Complete the Flow**:
   ```typescript
   story.parse(input) → IFCommand
   story.execute(command) → Events  // New method needed
   story.narrate(events) → Text     // New method needed
   ```

4. **Implement Text Service**:
   - Process events into narrative text
   - Handle language-specific formatting
   - Manage output channels

## Conclusion

The architecture is mostly correct but incomplete. The Actions are well-designed and properly placed in StdLib. The main issue is the missing execution layer that connects parsed commands to actions. The Handler system appears to be either legacy code or an incomplete parallel implementation that needs to be either removed or clearly integrated.

I recommend Option 1 (pure Action-based) as it's simpler, more maintainable, and aligns better with the event-sourced architecture goals.

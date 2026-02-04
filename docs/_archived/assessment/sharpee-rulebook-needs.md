# Sharpee Rulebook Needs Assessment

## Date: 2025-08-22

## Sharpee's Ways of Working

After analyzing the current CommandExecutor and architecture, Sharpee has distinct patterns that differ from Inform 7:

### 1. Event-Driven Architecture
- Everything flows through semantic events
- Events are sequenced and timestamped
- Text generation happens separately via text service
- Events carry all data needed for presentation

### 2. Explicit Action Pipeline
```
Parse → Validate → Execute → Report
```
- Actions have explicit validate/execute/report phases
- World model mutations happen in execute phase
- Events are generated in report phase
- Each phase has clear responsibilities

### 3. Separation of Concerns
- **Engine**: Command execution and event flow
- **Stdlib**: Actions and game mechanics
- **World Model**: State management
- **Text Service**: Presentation layer
- **Parser**: Language understanding

### 4. Immutable State Transitions
- World state changes are explicit
- Actions don't directly mutate, they return events
- Events describe what happened, not how to display it

## What Rulebooks Does Sharpee Actually Need?

Based on Sharpee's architecture, we need rulebooks that enhance the existing pipeline without breaking its clarity:

### 1. Action Control Rulebooks

```typescript
interface ActionControlRulebooks {
  before: Rulebook;    // Pre-validation modifications
  instead: Rulebook;   // Action replacement/cancellation  
  after: Rulebook;     // Post-execution effects
}
```

**Purpose**: Allow stories to customize action behavior without modifying action code.

**Why these three?**:
- `before` - Prepare world state, auto-take items, check story conditions
- `instead` - Complete replacement of action (e.g., special puzzle responses)
- `after` - Additional effects beyond the action's core behavior

**What we DON'T need**:
- `check` - That's what action.validate() is for
- `carry_out` - That's what action.execute() is for
- `report` - That's what action.report() is for

**Integration Points**:
- `before` - Runs before action.validate()
- `instead` - Can prevent entire action pipeline
- `after` - Runs after action.execute(), before action.report()

### 2. Turn Sequence Rulebooks

```typescript
interface TurnSequenceRulebooks {
  whenPlayBegins: Rulebook;  // Game initialization
  everyTurn: Rulebook;        // End of each turn
  whenPlayEnds: Rulebook;     // Game termination
}
```

**Purpose**: Manage game flow and turn-based mechanics.

**Integration Points**:
- `whenPlayBegins` - During GameEngine.start()
- `everyTurn` - After command execution completes
- `whenPlayEnds` - During GameEngine.end()

### 3. Scope and Accessibility Rulebooks

```typescript
interface AccessibilityRulebooks {
  deciding_scope: Rulebook;      // What's available for commands
  deciding_visibility: Rulebook;  // What can be seen
  deciding_reachability: Rulebook; // What can be touched
}
```

**Purpose**: Customize how the validator determines what's accessible.

**Integration Points**:
- Used by CommandValidator during validation phase
- Used by ScopeResolver when building scope

### 4. Query Handler Rulebooks

```typescript
interface QueryRulebooks {
  handling_query: Rulebook;  // Process non-action queries
  supplying_missing: Rulebook; // Provide missing command parts
}
```

**Purpose**: Handle special commands and incomplete input.

**Integration Points**:
- Query handlers for SAVE, LOAD, QUIT, etc.
- Supplying missing nouns for incomplete commands

## What We DON'T Need from Inform

### 1. Parser Rulebooks
Sharpee's parser is a separate concern with its own architecture. We don't need:
- "understanding" rules
- "does the player mean" rules  
- Token parsing rules

### 2. Text Generation Rulebooks
Text generation is handled by the text service consuming events. We don't need:
- "printing name of" rules
- "listing contents" rules
- "writing a paragraph about" rules

These belong in the text service, not the engine.

### 3. Complex Activity System
Inform's activity system (before/during/after for each activity) is overkill for Sharpee's cleaner pipeline.

## Recommended Implementation

### Phase 1: Core Action Control
Start with the three essential rulebooks that modify action behavior:
- `before` - Prepare world state, auto-take items, check preconditions
- `instead` - Complete action replacement for special cases
- `after` - Additional effects beyond core action behavior

These integrate cleanly with the existing action pipeline:
```
before → action.validate() → action.execute() → after → action.report()
         ↑
      instead (can skip entire pipeline)
```

### Phase 2: Turn Sequence
Add game flow control:
- `whenPlayBegins` - Initialize story state
- `everyTurn` - Time passage, NPC actions
- `whenPlayEnds` - Cleanup, final scoring

### Phase 3: Accessibility (if needed)
Only add these if the standard validator proves insufficient:
- `deciding_scope` - Dynamic scope modification
- `deciding_visibility` - Complex visibility rules
- `deciding_reachability` - Complex reachability rules

Note: Start with Phase 1 & 2. Phase 3 may not be needed if the validator's existing capabilities are sufficient.

## Key Differences from Inform

1. **Rules operate on events**, not text output
2. **Rules can't directly print** - they emit events
3. **Rulebooks are injected** into existing components, not replacing them
4. **Standard rules live in stdlib**, not engine
5. **Story rules are additive**, not overriding

## Example Rule Structure

```typescript
// In stdlib/src/rules/before/implicit-taking.ts
export const implicitTakingRule: Rule = {
  id: 'implicit-taking',
  order: 100,
  when: (ctx) => {
    // Only for actions that require holding
    const requiresHolding = ['eating', 'wearing', 'dropping'];
    if (!requiresHolding.includes(ctx.action)) return false;
    
    // Check if direct object is not held
    const item = ctx.command.directObject?.entity;
    if (!item) return false;
    
    return !ctx.world.isCarriedBy(item.id, ctx.actor.id);
  },
  run: (ctx) => {
    const item = ctx.command.directObject!.entity!;
    
    // Try to take the item first
    const takeAction = ctx.actionRegistry.get('taking');
    const takeContext = ctx.createSubContext('taking', item);
    const takeResult = takeAction.execute(takeContext);
    
    if (takeResult.success) {
      return {
        events: [
          {
            type: 'action.implicit',
            data: {
              action: 'taking',
              item: item.id,
              reason: 'needed_for_action'
            }
          }
        ]
      };
    } else {
      return {
        prevent: true,
        events: takeResult.events
      };
    }
  }
};
```

## Conclusion

Sharpee needs a focused set of rulebooks that enhance its event-driven architecture without compromising its clean separation of concerns. Start simple with action control and turn sequence, then expand based on actual story needs. Avoid copying Inform's text-generation and parser rulebooks since those are handled differently in Sharpee's architecture.
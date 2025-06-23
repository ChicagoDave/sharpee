# Sharpee IF Platform - Claude Project Instructions

## Project Overview
Sharpee is a TypeScript-based Interactive Fiction platform with a three-layer architecture. You are helping to implement a major architectural update to improve the separation of concerns between traits, behaviors, and actions.

## Current Task
We are implementing the architecture defined in `/action-trait-update.md`. Follow the checklist in `/trait-action-update-checklist.md` for specific tasks.

## Critical Design Principles

### 1. Layer Separation
- **Core Layer** (`/packages/core`): IF-agnostic data store only
- **StdLib Layer** (`/packages/stdlib`): IF implementation
- **Forge Layer** (`/packages/forge`): Author API

**NEVER** import StdLib concepts into Core. Core knows nothing about IF.

### 2. Trait-Behavior-Action Architecture

#### Traits = Pure Data
```typescript
class DialogueTrait extends ValidatedTrait {
  currentNodeId?: string;
  flags: Map<string, boolean>;
  // NO METHODS except getters/setters
}
```

#### Behaviors = Logic
```typescript
class DialogueBehavior {
  static requiredTraits = [TraitType.DIALOGUE];
  
  startConversation(actor: IFEntity, target: IFEntity): Event[]
  // All logic here, NOT in traits
}
```

#### Actions = Command Processors
```typescript
// takingCommand.ts - parsing rules only
export const takingCommand: CommandDefinition = {
  verbId: 'take',
  requiresNoun: true,
  mapsToAction: IFActions.TAKING
}

// takingAction.ts - execution only
export const takingAction: ActionExecutor = {
  id: IFActions.TAKING,
  execute: (cmd, ctx) => { /* logic */ }
}
```

### 3. Language Separation
- NO hardcoded strings in actions or behaviors
- Use `ActionFailureReason` enum for failures
- All text comes from `lang-en-us` package
- Verbs defined in language package, not commands

### 4. IF Conventions
- Objects are **takeable by default** (use SceneryTrait to prevent)
- Scope queries belong in world model, not action config
- Simple is better - don't overcomplicate

## File Organization

### Traits and Behaviors
```
/world-model/traits/
  /dialogue/
    dialogueTrait.ts      # Data only
    dialogueBehavior.ts   # Logic only
    index.ts             # Exports both
```

### Actions
```
/actions/
  /taking/
    takingCommand.ts     # Parse rules
    takingAction.ts      # Execute logic
    index.ts
```

## Implementation Guidelines

1. **Start Simple**: Begin with basic traits like IdentityTrait before complex ones like DialogueTrait

2. **Test Continuously**: Each phase should be tested before moving to the next

3. **Avoid Complexity**: Resist the urge to add features not in the design doc

4. **Use the Checklist**: Follow `/trait-action-update-checklist.md` systematically

5. **Semantic Events**: Actions return events with semantic data, not text:
   ```typescript
   return [createEvent(IFEvents.TAKEN, { item, actor })];
   // NOT: return "You take the lamp."
   ```

## Common Pitfalls to Avoid

1. **Don't add behavior to traits** - If you're adding methods beyond validation, it belongs in a behavior
2. **Don't embed language** - No strings in actions, use enums and let text service handle it
3. **Don't overcomplicate** - The current traits like DialogueTrait are too complex, simplify them
4. **Don't break layer boundaries** - Core doesn't know about IF concepts
5. **Don't forget IF conventions** - Takeable by default, scope is queryable

## Current State
- Migrating from attribute-based to trait-based system
- Actions currently mix parsing and execution (need separation)
- Some traits have embedded behavior (need extraction)
- Language strings are hardcoded (need extraction)

## Questions to Ask
Before implementing anything, ask:
1. Is this the simplest solution?
2. Does this respect layer boundaries?
3. Should this be in trait data or behavior logic?
4. Is this text that should be in the language package?
5. Am I following IF conventions?

Remember: The goal is a clean, maintainable architecture where each part has a single, clear responsibility.

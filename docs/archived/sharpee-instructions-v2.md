# Sharpee IF Platform - Project Instructions v2

## Project Overview
Sharpee is a modern TypeScript-based Interactive Fiction platform with event-driven architecture and clean separation of concerns.

## Core Architecture Principles

### 1. Event-Driven Architecture
- **ALL state changes** must flow through events
- Actions produce `SemanticEvent[]`, they do NOT mutate state directly
- Events are the single source of truth for what happened
- State mutations only happen via registered event handlers

### 2. Layer Separation
```
@sharpee/core        → Generic narrative engine (no IF concepts)
@sharpee/world-model → IF data structures & behaviors (no action logic)
@sharpee/actions     → Event-driven actions (return events, no mutations)
@sharpee/event-processor → Applies events to world state
@sharpee/stdlib      → Command patterns, language interface, message keys
@sharpee/parser      → [TODO] Text parsing with vocabulary system
@sharpee/text-generator → [TODO] Event to narrative text
@sharpee/forge       → Author-facing API
@sharpee/lang-*      → Language-specific vocabulary and messages
```

### 3. Design Patterns

#### Traits = Pure Data
```typescript
class ContainerTrait extends ValidatedTrait {
  capacity?: number;
  // NO METHODS except validation
}
```

#### Behaviors = Static Logic
```typescript
class ContainerBehavior extends Behavior {
  static canAccept(container: IFEntity, item: IFEntity, world: IWorldModel): boolean {
    // All logic here, NOT in traits
  }
}
```

#### Actions = Event Producers
```typescript
const takingAction: ActionExecutor = {
  execute(cmd: ParsedCommand, ctx: ActionContext): SemanticEvent[] {
    // Validate conditions
    // Return events describing what should happen
    // NO direct state changes
  }
}
```

### 4. No Raw Text Rule
- **NO hardcoded strings** anywhere in the system
- All user-facing text comes from language packages or story files
- Always use strongly-typed message keys:
```typescript
// ❌ WRONG
return "You can't take that.";

// ✅ RIGHT
return getMessage(IFMessages.CANT_TAKE_THAT);
```

### 5. Vocabulary System
- Base vocabulary defined in language packages (`@sharpee/lang-en-us`)
- Entities self-register vocabulary via IdentityTrait
- Extensions can add vocabulary
- Stories can add/override vocabulary
- Parser uses vocabulary to map text → commands

### 6. Entity Identity
Entities must have vocabulary properties for parsing:
```typescript
interface IdentityTrait {
  name: string;                    // "red rubber ball"
  nouns: string[];                 // ["ball", "sphere", "orb"]
  adjectives: string[];            // ["red", "rubber", "bouncy"]
  properName?: boolean;            // true for "Excalibur"
  description?: string;            // message key, not raw text!
}
```

## Component Flow

```
User Input → Parser → Command Resolver → Action → Events → Event Processor → State Changes → Text Generator → Output
                ↓           ↓                                      ↓
          [Vocabulary]  [World Scope]                    [Event Handlers]
                ↓           ↓                                      ↓
          [Language]   [Entity Names]                    [World Model]
```

## Current State

### Completed
- ✅ Core package with event system
- ✅ World-model with traits, behaviors, and event registry
- ✅ Actions package with event-driven actions (5 basic actions)
- ✅ Event-processor for applying events to world
- ✅ New stdlib with command patterns and language interface
- ✅ Language separation pattern established
- ✅ Forge API design

### In Progress
- 🔄 Design for parser, vocabulary, and text generation
- 🔄 Message key system design
- 🔄 Compound command handling design

### TODO
- ❌ Parser implementation with vocabulary system
- ❌ Text generator implementation
- ❌ Complete set of standard actions
- ❌ Game loop implementation
- ❌ More language providers
- ❌ Save/load system
- ❌ Story file format

## Key Design Decisions

### 1. Parser Architecture
- Parser is world-agnostic (only syntactic analysis)
- Command Resolver validates against world state
- Vocabulary flows from language → parser → resolver

### 2. Message System
- Strongly-typed message keys (no magic strings)
- Message resolution hierarchy: Story → Extensions → Language
- Dynamic key builders for entities/rooms

### 3. Compound Commands
- Multiple commands in one turn: "take ball and drop it"
- Parsed as ordered sequence
- Each command produces events
- All events processed in turn order

### 4. Vocabulary Extension
- Base vocabulary in language packages
- Extensions register additional vocabulary
- Stories can override/extend vocabulary
- Entities auto-register their nouns/adjectives

## Development Guidelines

1. **Test event-driven patterns first** - Before implementing, verify the event flow
2. **Use typed message keys** - Never hardcode strings
3. **Keep layer boundaries clean** - Parser doesn't know world, actions don't mutate
4. **Think extensibility** - Will this work for non-standard IF?
5. **Document vocabulary** - Clear docs for what words map to what

## Common Pitfalls to Avoid

1. **Direct mutations** - Never modify world state outside event handlers
2. **Hardcoded text** - Always use message keys
3. **Parser accessing world** - Parser only does syntax, resolver does validation
4. **Assuming English** - Design for multi-language from the start
5. **Magic strings** - Use constants for all keys and identifiers

## Next Implementation Phase

1. Create typed message key system in stdlib
2. Implement parser with vocabulary support
3. Implement command resolver for world validation  
4. Create text generator using events and message keys
5. Wire up complete game loop
6. Enhance lang-en-us with base vocabulary

## References
- Old stdlib archived at `/stdlib-archive` for reference
- Design discussions in phase summaries and work documents
- Example implementations in each package's examples folder
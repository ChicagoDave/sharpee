# Sharpee IF Platform - Development Guide

## Project Overview
Sharpee is a modern TypeScript-based Interactive Fiction platform with a three-layer architecture designed for extensibility and clean separation of concerns.

## Architecture

### Layer 1: Core (IF-agnostic)
- **Purpose**: Thin data store for entities, events, and channels
- **Key Concepts**: Entity store, event system, relationships
- **Location**: `/packages/core`
- **Rule**: NO Interactive Fiction concepts here

### Layer 2: StdLib (IF implementation)
- **Purpose**: Implements IF concepts using Core
- **Key Components**:
  - Parser system with language plugins
  - Trait-based world model
  - Event-driven action system
  - Text generation from events
- **Location**: `/packages/stdlib`

### Layer 3: Forge (Author API)
- **Purpose**: Fluent authoring interface
- **Location**: `/packages/forge`
- **Goal**: Make IF authoring intuitive for newcomers

## Current State (June 2025)

### ✅ Completed
1. **Core Layer**: Entity/event/channel system
2. **Parser**: Three-stage command processing (Parse → Resolve → Execute)
3. **World Model**: Trait-based entity system replacing inheritance
4. **Events**: Semantic events that drive text generation
5. **Language System**: Pluggable language providers

### 🚧 In Progress
1. **Action System Migration**: Converting from attribute-based to trait-native
2. **Text Service**: Event-to-text transformation
3. **Forge API**: Fluent authoring interface

### 📋 TODO
1. Complete action-trait migration (see `action-trait-migration.md`)
2. Implement text templates for all event types
3. Build out Forge API patterns
4. Create comprehensive test suite

## Key Design Decisions

### 1. Trait-Based Entities
```typescript
// Entities have composable traits, not inheritance
entity.add(new PortableTrait({ weight: 5 }));
entity.add(new ContainerTrait({ capacity: 10 }));
entity.add(new OpenableTrait({ isOpen: false }));
```

### 2. Event-Driven Actions
```typescript
// Actions return semantic events, not text
return [createEvent(IFEvents.TAKEN, { item: lamp, actor: player })];
// Text service converts events to prose later
```

### 3. Three-Stage Command Processing
```
"take lamp" → ParsedIFCommand → ResolvedIFCommand → SemanticEvent[]
              (Parser)           (Resolver)           (Executor)
```

## Development Guidelines

### Language Rules
- **NO Unicode** - ASCII only in all code
- Use meaningful IF terminology (traits not components)
- Prefer functions over classes where sensible
- Maintain strict layer boundaries

### Coding Patterns

#### Working with Traits
```typescript
// Check for trait
if (entity.has(TraitType.PORTABLE)) { }

// Get typed trait
const identity = entity.get<IdentityTrait>(TraitType.IDENTITY);
if (identity) {
  console.log(identity.name);
}

// Update trait data
world.updateTrait(entity.id, TraitType.OPENABLE, { isOpen: true });
```

#### Creating Actions
```typescript
export const takingAction: ActionDefinition = {
  id: IFActions.TAKING,
  phases: {
    validate: (cmd, ctx) => {
      // Use trait-based validation
      if (!cmd.noun) return 'What to take?';
      if (!ctx.canReach(cmd.noun)) return 'Can\'t reach that.';
      if (!cmd.noun.has(TraitType.PORTABLE)) return 'Can\'t take that.';
      return true;
    },
    execute: (cmd, ctx) => {
      // Return semantic events
      return [createEvent(IFEvents.TAKEN, {...})];
    }
  }
};
```

### Current Focus: Action-Trait Migration

We're migrating actions from attribute-based to trait-native design:

1. **Before**: `entity.attributes.name`, `entity.attributes.openable`
2. **After**: `entity.get<IdentityTrait>()?.name`, `entity.has(TraitType.OPENABLE)`

Follow the checklist in `action-trait-migration.md` for systematic migration.

## Testing

Run tests with:
```bash
npm test                 # All tests
npm test -- --watch     # Watch mode
npm run test:coverage   # Coverage report
```

## Project Structure

```
sharpee/
├── packages/
│   ├── core/          # Layer 1: Data store
│   ├── stdlib/        # Layer 2: IF implementation
│   │   ├── actions/   # Currently migrating to traits
│   │   ├── parser/    # Command parsing
│   │   ├── world-model/  # Trait-based entities
│   │   └── text/      # Event-to-text (TODO)
│   ├── forge/         # Layer 3: Author API
│   └── lang-en-us/    # English language plugin
├── stories/           # Example stories
└── scripts/          # Build tools
```

## Common Tasks

### Adding a New Trait
1. Define in `/stdlib/world-model/traits/`
2. Add to `TraitType` enum
3. Register in `registerAllTraits()`
4. Document usage patterns

### Adding a New Action
1. Create in `/stdlib/actions/`
2. Use `ActionContext` (not `GameContext`)
3. Think traits-first
4. Return semantic events
5. Add to action registry

### Adding Language Support
1. Implement `IFLanguageProvider`
2. Add verb mappings
3. Provide message templates
4. Register with language system

## Debugging Tips

1. **Layer Violations**: Check imports - Core shouldn't import from StdLib
2. **Trait Access**: Always check `has()` before `get()`
3. **Event Data**: Include all relevant info for text generation
4. **Type Safety**: Use typed trait getters: `get<IdentityTrait>()`

## Getting Help

- Check design docs in `/design/`
- Review test files for usage examples
- Look at completed actions for patterns
- Comments explain IF concepts throughout

Remember: We're building a platform where the code clearly expresses IF concepts through traits and events, making it approachable for both experienced IF authors and newcomers.

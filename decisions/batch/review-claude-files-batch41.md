# Sharpee Architecture Decisions - Batch 41

## Files Reviewed
1. `/chat-history/claude/2025-06-15-22-59-00.json` - "Post-Refactor Build Error Analysis"
2. `/chat-history/claude/2025-06-16-13-55-18.json` - "TypeScript Build Errors in Sharpee"
3. `/chat-history/claude/2025-06-16-14-11-12.json` - "TypeScript Build Module Import Error"

## Key Architectural Decisions Found

### 1. Parser, Grammar, and Language as StdLib Plugins
**Source**: 2025-06-15-22-59-00.json

**Decision**: Parser, grammar, and language components should be implemented as plugins within StdLib rather than as separate packages.

**Details**:
- `lang-en-us` should not be a separate package importing from Core/StdLib
- Language implementations should be plugins FOR StdLib
- Parser types (`POSType`, `TaggedWord`, `Phrase`, etc.) belong in StdLib, not Core

**Rationale**: This maintains clear layer boundaries and prevents circular dependencies between packages.

### 2. Layer Dependencies and Separation
**Source**: 2025-06-15-22-59-00.json

**Decision**: Strict layer hierarchy with clear responsibilities:
- **Core**: Generic data store, events, channels (no language/parser concepts)
- **StdLib**: IF implementation including parser/grammar/language as plugins
- **Forge**: Fluent author API
- **Story**: Actual game content

**Rationale**: Keeps Core IF-agnostic while providing IF-specific functionality in StdLib.

### 3. Language Provider Architecture
**Source**: 2025-06-16-13-55-18.json

**Decision**: Create `IFLanguageProvider` interface in StdLib that extends Core's `LanguageProvider`.

**Details**:
- Core provides basic `LanguageProvider` interface with generic text formatting
- StdLib's `IFLanguageProvider` adds IF-specific methods like `getActionVerbs()`
- Language plugins implement `IFLanguageProvider`, not Core's `LanguageProvider`

**Rationale**: Maintains separation between generic language support (Core) and IF-specific language features (StdLib).

### 4. Action System Belongs in StdLib
**Source**: 2025-06-16-14-11-12.json

**Decision**: `ActionDefinition` and related action concepts belong in StdLib, not Core.

**Details**:
- Actions are IF-specific concepts
- `ActionDefinition` interface created in `stdlib/src/actions/types/`
- Action helpers use StdLib's `IFLanguageProvider` instead of Core's `LanguageProvider`

**Rationale**: Actions are interactive fiction concepts that don't belong in the generic Core layer.

### 5. GameContext Extension Pattern
**Source**: 2025-06-16-14-11-12.json

**Decision**: `GameContext` in StdLib extends Core's `ExecutionContext`.

**Details**:
- Core provides generic `ExecutionContext`
- StdLib's `GameContext` adds IF-specific functionality (visibility, accessibility, scope, etc.)
- This pattern allows Core to remain generic while StdLib provides specialized functionality

**Rationale**: Enables Core to provide basic execution infrastructure without knowledge of IF concepts.

### 6. Import Path Strategy
**Source**: Multiple files

**Decision**: Use relative imports within StdLib instead of package imports from Core.

**Details**:
- StdLib components import from local paths (e.g., `./types`, `../parser/if-parser-types`)
- Avoid importing IF concepts from `@sharpee/core`
- Use `core-imports.ts` to re-export needed Core types

**Rationale**: Prevents build errors and maintains proper dependency direction.

## Architecture Principles Confirmed

1. **Core remains IF-agnostic**: Only contains generic systems (events, channels, extensions, rules, language, types)
2. **No upward dependencies**: StdLib can depend on Core, but Core cannot depend on StdLib
3. **Plugin architecture**: Languages and parsers are plugins within StdLib, not external dependencies
4. **Extension pattern**: StdLib interfaces extend Core interfaces to add IF-specific functionality
5. **Clear boundaries**: Each layer has well-defined responsibilities and doesn't leak concepts to other layers

## Implementation Notes

The chat histories revealed that the refactoring encountered several build errors due to:
- Attempts to import IF concepts from Core
- Missing methods on Core interfaces that were IF-specific
- Language packages trying to import from wrong locations

These were resolved by:
- Moving IF concepts to StdLib
- Creating extended interfaces in StdLib
- Updating import paths to use local StdLib paths
- Adding `IFLanguageProvider` with IF-specific methods

## Next Steps

Based on these decisions, future work should:
1. Complete migration of `lang-en-us` into StdLib as a plugin
2. Ensure all IF concepts are removed from Core
3. Document the plugin architecture for language implementations
4. Create examples showing how to add new language plugins to StdLib

# Parser-Validation-Execution Refactor Plan

## Overview

This document captures the architectural refactor to separate parsing, validation, and execution into distinct phases. This aligns with the existing entity handler pattern and resolves current circular dependencies.

## Architectural Decision Record

**Date:** June 28, 2025  
**Decision:** Separate parsing (syntax) from validation (semantics) from execution (events)  
**Context:** Current architecture conflates these concerns, causing circular dependencies and unclear responsibilities  
**Consequences:** Cleaner architecture, better error handling, resolved dependencies, consistent patterns
**Notes** Stdlib is not "settled" so where needed, replace logic instead of adapting to existing logic. Ask if decisions need to be made.  

## Core Principle

The system follows a consistent three-phase pattern at all levels:

1. **Parse/Prepare** - Structure data without world knowledge
2. **Validate** - Check against world state, resolve references
3. **Execute** - Perform business logic, generate events

This pattern applies to:
- Command processing (parse → validate → execute)
- Entity handlers (prepare → validate → execute)
- Event processing (receive → validate → apply)

## Detailed Architecture

### Phase 1: Parsing (Syntax Only)

**Responsibility:** Convert user input to potential command structures using grammar and vocabulary only.

**Key Constraints:**
- NO world model access
- NO entity resolution
- NO action validation
- Pure grammatical analysis

**Input/Output:**
```typescript
Input: "put the red ball in the wooden box"
Output: ParsedCommand {
  action: "PUT",
  directObject: { text: "red ball", candidates: ["ball", "red"] },
  preposition: "in",
  indirectObject: { text: "wooden box", candidates: ["box", "wooden"] },
  pattern: "VERB_OBJ_PREP_OBJ",
  confidence: 0.95
}
```

### Phase 2: Validation (World Semantics)

**Responsibility:** Validate parsed commands against world state and resolve references.

**Key Operations:**
- Resolve noun phrases to entities
- Check entity scope/visibility
- Find action handlers
- Generate helpful errors

**Input/Output:**
```typescript
Input: ParsedCommand (from Phase 1)
Output: ValidatedCommand {
  action: "PUT",
  actionHandler: PutAction,
  actor: Entity#player,
  directObject: Entity#ball-1,
  indirectObject: Entity#box-3,
  validationScore: 0.98,
  resolutions: [...]
}
```

### Phase 3: Execution (Business Logic)

**Responsibility:** Execute validated commands to produce events.

**Key Constraints:**
- Assumes validation passed
- Pure functions (no direct mutations)
- Returns semantic events only

**Input/Output:**
```typescript
Input: ValidatedCommand (from Phase 2)
Output: SemanticEvent[] [
  { type: "PUT_IN", entities: { actor: "player", item: "ball-1", container: "box-3" } }
]
```

## Implementation Checklist

### Phase 1: Type Definitions ✅

✅ Create new IF types directory in `@sharpee/core`:
  - Create `core/src/if-types/` directory
  - Add index.ts to export all IF-specific types

✅ Define ParsedCommand and related types:
```typescript
// core/src/if-types/parsed-command.ts
export interface ParsedCommand {
  action: string;
  pattern: string;
  confidence: number;
  directObject?: ParsedReference;
  indirectObject?: ParsedReference;
  preposition?: string;
  direction?: string;
  tokens: Token[];
  originalInput: string;
}

export interface ParsedReference {
  text: string;              // "red ball"
  candidates: string[];      // ["ball", "red"] from vocabulary
  position: number;          // position in original input
}

export interface Token {
  word: string;
  normalized: string;
  position: number;
  candidates: TokenCandidate[];
}

export interface TokenCandidate {
  partOfSpeech: PartOfSpeech;
  mapsTo: string;
  priority: number;
  metadata?: Record<string, unknown>;
}
```

✅ Define ValidatedCommand types:
```typescript
// core/src/if-types/validated-command.ts
export interface ValidatedCommand {
  action: string;
  actionHandler: ActionExecutor;
  actor: IFEntity;
  directObject?: IFEntity;
  indirectObject?: IFEntity;
  preposition?: string;
  direction?: string;
  originalInput: string;
  validationScore: number;
  resolutions: Resolution[];
}

export interface Resolution {
  type: 'directObject' | 'indirectObject' | 'action';
  text: string;
  chosen: string;
  alternatives: string[];
  method: 'only_in_scope' | 'best_match' | 'recent' | 'default';
}
```

✅ Define validation types:
```typescript
// core/src/if-types/validation.ts
export interface ValidationContext {
  world: IWorldModel;
  player: IFEntity;
  location: IFEntity;
  actionRegistry: ActionRegistry;
  scopeService: ScopeService;
  recentEntities?: string[];
}

export interface ValidationError {
  type: 'no_such_object' | 'not_in_scope' | 'ambiguous' | 'no_handler';
  message: string;
  details?: any;
}

export interface CommandValidator {
  validate(
    command: ParsedCommand,
    context: ValidationContext
  ): ValidatedCommand | ValidationError[];
}
```

✅ Move action constants from stdlib to core:
```typescript
// core/src/if-types/action-constants.ts
export const IFActions = {
  // Movement
  GO: 'GO',
  ENTER: 'ENTER',
  EXIT: 'EXIT',
  
  // Object manipulation
  TAKE: 'TAKE',
  DROP: 'DROP',
  PUT: 'PUT',
  
  // Examination
  LOOK: 'LOOK',
  EXAMINE: 'EXAMINE',
  
  // Container operations
  OPEN: 'OPEN',
  CLOSE: 'CLOSE',
  LOCK: 'LOCK',
  UNLOCK: 'UNLOCK',
  
  // Meta
  INVENTORY: 'INVENTORY',
  SAVE: 'SAVE',
  RESTORE: 'RESTORE',
  QUIT: 'QUIT'
} as const;
```

### Phase 2: Update Parser ✅

✅ Remove entity resolution from `BasicParser`:
  - Remove `ResolverContext` usage
  - Remove entity lookup logic
  - Keep only grammar pattern matching

✅ Update parser interfaces:
  - Import `ParsedCommand` from `@sharpee/core/if-types`
  - Remove old `ParsedCommand` definition from stdlib
  - Update `CandidateCommand` to match new structure

✅ Simplify parser to grammar-only:
  - Remove world model imports
  - Remove entity resolution methods
  - Focus on tokenization and pattern matching

✅ Update vocabulary system:
  - Keep vocabulary registry world-agnostic
  - Vocabulary should map words to concepts, not entities
  - Example: "ball" → noun concept "ball", not Entity#ball-1

✅ Fix parser tests:
  - Remove world model from test setup
  - Test only grammar patterns
  - Verify parser works without entity knowledge

### Phase 3: Create Command Validator ✅

✅ Decide validator location:
  - Option A: New package `@sharpee/validator`
  - Option B: Add to `@sharpee/engine` as `engine/src/validator/`
  - Option C: Add to `@sharpee/stdlib` as `stdlib/src/validator/` ← **CHOSEN**

✅ Implement `CommandValidator`:
```typescript
// stdlib/src/validation/command-validator.ts
export class CommandValidator implements ICommandValidator {
  constructor(
    private world: IWorldModel,
    private actionRegistry: ActionRegistry
  ) {}

  validate(
    command: ParsedCommand
  ): CommandResult<ValidatedCommand, ValidationError> {
    // 1. Find action handler
    // 2. Get entities in scope
    // 3. Resolve direct object
    // 4. Resolve indirect object
    // 5. Build validated command
  }
}
```

✅ Implement entity resolution:
  - Sophisticated scoring system (10+ factors)
  - Adjective matching for disambiguation
  - Scope rules (visible, reachable, touchable)
  - Pronoun resolution ("it", "them", "him", "her")
  - Synonym and type matching

✅ Implement error generation:
  - "I don't understand the word '{action}'."
  - "What do you want to {action}?"
  - "You can't see any {text} here."
  - "Which {text} do you mean? (I can see {count} of them)"
  - "You can't reach the {text}."
  - "You can't {action} something {preposition} that."

✅ Implement ambiguity resolution:
  - Score threshold (top score 50% higher than second)
  - Perfect modifier match (all adjectives match)
  - Only reachable (single entity visible and reachable)
  - Recent interaction bonus
  - Inventory preference

✅ Create validation helpers:
  - `getEntitiesInScope(scope)`
  - `scoreEntities(entities, reference)`
  - `resolveAmbiguity(matches, reference)`
  - `isEntityVisible/Reachable/Touchable(entity)`
  - `getEntityName/Description/Adjectives/Synonyms(entity)`

✅ Add debug event support:
  - `entity_resolution`: How entities were matched
  - `scope_check`: What entities were considered
  - `ambiguity_resolution`: How conflicts were resolved
  - `validation_error`: Details about failures

✅ Create IActionMetadata interface:
```typescript
export interface IActionMetadata {
  requiresDirectObject: boolean;
  requiresIndirectObject: boolean;
  directObjectScope?: 'visible' | 'reachable' | 'touchable';
  indirectObjectScope?: 'visible' | 'reachable' | 'touchable';
  validPrepositions?: string[];
}
```

✅ Comprehensive test suite:
  - 20+ test cases covering all features
  - Mock implementations for isolation
  - Edge cases and complex scenarios

### Phase 3.5: Fix Build and Design Flaws ✅

**Added:** June 30, 2025  
**Reason:** Discovered design issues while implementing debug events that need addressing before proceeding

#### Interface Naming Convention ✅

✅ Remove `I` prefix from all interfaces for consistency with modern TypeScript:
  - `IEntity` → `Entity`
  - `IAction` → `Action`
  - `IParser` → `Parser`
  - `ICommandValidator` → `CommandValidator`
  - `ICommandExecutor` → `CommandExecutor`
  - `ICommandProcessor` → `CommandProcessor`
  - Keep interfaces without prefix as-is: `SemanticEvent`, `ParsedCommand`, `ValidatedCommand`, etc.
  - Document this convention in architecture docs
  - Removed backwards compatibility aliases

#### Debug Event Architecture ✅

✅ Redesign debug events as separate from semantic events:
```typescript
// Debug events are NOT semantic events
interface DebugEvent {
  id: string;
  timestamp: number;
  subsystem: 'parser' | 'validator' | 'executor' | 'world-model' | 'text-service';
  type: string;
  data: any;
}

// Optional callback pattern for debug events
type DebugEventCallback = (event: DebugEvent) => void;

// Debug context passed to subsystems
interface DebugContext {
  emit?: DebugEventCallback;
  enabled: boolean;
}
```

✅ Decide where debug infrastructure lives:
  - Option A: Minimal types in core, implementation elsewhere ← **CHOSEN**
  - Option B: Separate @sharpee/diagnostics package
  - Option C: Optional feature in each package

**Decision:** Keep core minimal with just type definitions. Debug collection implementation lives in engine.

✅ Update parser and validator debug implementation:
  - Updated `BasicParser` to use `DebugEventCallback` instead of `EventSource`
  - Changed `setDebugEventSource()` to `setDebugCallback()`
  - Updated `CommandValidator` to use `DebugEventCallback`
  - Removed `ValidatorDebugEvent` interface
  - Debug events now created inline with proper structure

#### Core Module Independence ✅

✅ Review all core imports:
  - Ensure zero imports from other @sharpee packages
  - Move any dependent types to core
  - Document what belongs in core vs other packages

✅ Fix type duplication:
  - Single source of truth for each type
  - Remove legacy definitions
  - Update all imports

#### Build System Fixes ✅

✅ Fix remaining circular dependencies:
  - Removed `I` prefix eliminating backwards compatibility issues
  - Removed duplicate type definitions
  - Core package has zero imports from other packages
  - Removed old `debug-events.ts` file
  - Updated core exports to remove debug-events

✅ Update tsconfig.json files:
  - Each package has proper configuration
  - No cross-package imports
  - Clean dependency hierarchy

#### Documentation ✅

✅ Document architectural decisions:
  - Why interfaces DON'T use `I` prefix (modern TypeScript convention)
  - Debug event design rationale (separation from semantic events)
  - Core module boundaries (types only, no implementations)
  - Type ownership by package

### Phase 3.6: Remaining Interface Updates ✅

**Completed:** Interface cleanup finished

✅ World Model Interface Updates:
  - WorldModel interface already exists (no `I` prefix needed)
  - IFEntity correctly extends Entity from core
  - All interfaces follow modern TypeScript conventions

✅ Actions Package Updates:
  - Actions already use ActionExecutor interface
  - All imports are correct
  - Actions live in stdlib/src/actions/

✅ Build System Verification:
  - Fixed CommandValidator class/interface naming
  - All packages compile successfully
  - No circular dependencies

### Phase 3.7: Core Refactoring - True Separation 🚧

**Added:** January 12, 2025
**Reason:** Realized that @sharpee/core contains IF-specific types that should be moved

#### Problem Analysis
- `ParsedCommand`, `ValidatedCommand`, `Parser`, `CommandValidator` interfaces are IF-specific
- These belong with the IF domain model, not in a generic core
- Debug events using callbacks instead of proper event sources
- No clear separation between story events (SemanticEvent) and system events (debug)

#### Proposed Changes

☐ **Create Two Event Sources in Core**:
```typescript
// Generic event source
export interface EventSource<T> {
  emit(event: T): void;
  subscribe(handler: (event: T) => void): () => void;
}

// Keep SemanticEvent for story
export interface SemanticEvent { ... }

// Add SystemEvent for debug/monitoring  
export interface SystemEvent {
  id: string;
  timestamp: number;
  subsystem: string;
  type: string;
  data: unknown;
}
```

☐ **Move IF-Specific Types to World-Model**:
  - Move `ParsedCommand`, `ValidatedCommand` from core to world-model
  - Move `Parser`, `CommandValidator`, `Action` interfaces to world-model
  - World-model becomes the "IF framework" package
  - Core becomes truly generic event/entity system

☐ **Update Parser and Validator**:
  - Remove DebugEventCallback usage
  - Inject `EventSource<SystemEvent>` via constructor
  - Change from `this.onDebugEvent?.(...)` to `this.systemEvents?.emit(...)`

☐ **Update All Imports**:
  - Stdlib: Import command types from world-model instead of core
  - Engine: Import IF types from world-model, event types from core
  - ~50+ files need import updates

☐ **New Package Structure**:
```
@sharpee/core (generic narrative engine)
├── events/
│   ├── event-source.ts
│   ├── semantic-event.ts
│   └── system-event.ts
└── types/
    ├── entity.ts
    ├── result.ts
    └── extension.ts

@sharpee/world-model (IF domain + interfaces)
├── commands/
│   ├── parsed-command.ts
│   ├── validated-command.ts
│   ├── parser.ts (interface)
│   └── command-validator.ts (interface)
├── actions/
│   └── action.ts (interface)
├── entities/
├── world/
└── events/ (IF-specific like TAKEN, DROPPED)

@sharpee/stdlib (IF implementations)
├── parser/ (implements Parser from world-model)
├── validation/ (implements CommandValidator from world-model)
├── actions/ (implement Action from world-model)
└── language/
```

#### Benefits
- Core is truly reusable for visual novels, RPGs, etc.
- Clear separation: story events vs system events
- IF-specific interfaces live with IF domain model
- Honest architecture that admits we're building an IF system

### Phase 4: Update Actions ✅

**Note:** Actions have been moved to stdlib as part of Phase 6 to resolve circular dependencies

☐ Update ActionExecutor interface:
```typescript
// In @sharpee/core/if-types/action-types.ts
export interface ActionExecutor {
  id: string;
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[];
  // Remove canExecute - validation happens earlier
}
```

☐ Update each action implementation:
  - `takingAction`: Remove visibility/reachability checks
  - `droppingAction`: Remove "already dropped" checks  
  - `goingAction`: Remove "no exit" validation
  - `openingAction`: Keep only business logic (is it locked?)
  - `examiningAction`: Assume entity exists and is visible

☐ Remove validation imports:
  - Remove `ParsedCommand` import from actions
  - Import `ValidatedCommand` from `@sharpee/core`
  - Remove scope checking code

☐ Simplify action logic:
  - Trust that validator provided valid entities
  - Focus only on business rules
  - Return appropriate events

☐ Update action tests:
  - Create `ValidatedCommand` objects for tests
  - Remove tests for "not in scope" scenarios
  - Focus on business logic tests

### Phase 5: Update Engine ☐

☐ Update `CommandExecutor` class:
```typescript
// engine/src/command-executor.ts
export class CommandExecutor {
  constructor(
    private parser: Parser,
    private validator: CommandValidator,
    private eventProcessor: EventProcessor
  ) {}

  async executeTurn(input: string, context: GameContext): Promise<TurnResult> {
    // Phase 1: Parse
    const parsed = this.parser.parse(input);
    if (parsed.length === 0) {
      return this.handleParseError(input);
    }
    
    // Phase 2: Validate
    const validationContext = this.createValidationContext(context);
    const validated = this.validator.validate(parsed[0], validationContext);
    
    if (Array.isArray(validated)) {
      return this.handleValidationErrors(validated);
    }
    
    // Phase 3: Execute
    const actionContext = this.createActionContext(context);
    const events = validated.actionHandler.execute(validated, actionContext);
    
    // Phase 4: Apply
    const result = await this.eventProcessor.processEvents(events);
    
    return {
      success: true,
      command: validated,
      events: result.applied,
      changes: result.changes
    };
  }
}
```

☐ Implement error handlers:
  - `handleParseError`: "I don't understand that."
  - `handleValidationErrors`: Format specific errors
  - Add error event generation

☐ Update context creation:
  - `createValidationContext`: Includes world, player, scope service
  - `createActionContext`: Read-only world access
  - Remove old resolver context

☐ Update TurnResult type:
  - Change `command` to be `ValidatedCommand`
  - Add `validationInfo` field
  - Include phase where error occurred

### Phase 6: Fix Circular Dependencies ✅

**Completed:** Actions moved to stdlib to eliminate circular dependency

**Key Decision:** Rather than trying to maintain actions as a separate package, we moved all actions into stdlib. This makes architectural sense because:
- Actions are part of the standard library of IF functionality
- They work closely with the parser and validator
- It eliminates the circular dependency entirely
- Better cohesion - all IF-specific standard functionality in one place

✅ Moved Actions to Stdlib:
  - Created `packages/stdlib/src/actions/` directory
  - Moved all action implementations from `@sharpee/actions` to `@sharpee/stdlib/actions`
  - Moved IFActions constants to stdlib
  - Moved action types, registry, and context to stdlib

✅ Updated imports:
  - Fixed command-patterns.ts to use local IFActions
  - Fixed command-syntax.ts to use local IFActions
  - Fixed command-validator.ts to use local ActionRegistry
  - Removed stdlib dependency from actions package.json

✅ New Architecture:
```
@sharpee/core
├── Basic types (Entity, SemanticEvent, ParsedCommand, ValidatedCommand)
└── No IF-specific content

@sharpee/world-model  
├── IFEntity
├── IFEvents constants
├── Traits
└── WorldModel implementation

@sharpee/stdlib
├── actions/
│   ├── standard/ (taking, dropping, examining, etc.)
│   ├── types.ts (ActionExecutor, ActionContext)
│   ├── registry.ts
│   └── constants.ts (IFActions)
├── parser/
├── validation/
├── commands/
└── language/

Dependencies:
- stdlib → world-model, core
- world-model → core
- No circular dependencies!
```

✅ Build order updated:
  - @sharpee/core builds first
  - Then world-model
  - Then stdlib (contains actions)
  - Then engine

### Phase 7: Testing & Validation ☐

☐ Create parser tests:
```typescript
// No world model needed!
test('parses TAKE command', () => {
  const result = parser.parse('take red ball');
  expect(result[0]).toEqual({
    action: 'TAKE',
    directObject: { text: 'red ball', candidates: ['ball', 'red'] },
    pattern: 'VERB_NOUN'
  });
});
```

☐ Create validator tests:
```typescript
test('resolves entities in scope', () => {
  const mockWorld = createMockWorld([
    { id: 'ball-1', name: 'red ball', location: 'room-1' }
  ]);
  const parsed = { action: 'TAKE', directObject: { text: 'ball' } };
  const result = validator.validate(parsed, { world: mockWorld, ... });
  expect(result.directObject.id).toBe('ball-1');
});
```

☐ Create integration tests:
  - Full pipeline: input → events
  - Error at each phase
  - Ambiguity resolution

☐ Verify build works:
  - Run `npm run build` at root
  - Check no TypeScript errors
  - Verify package dependencies

☐ Check for circular dependencies:
  - Use madge or similar tool
  - Ensure no cycles in dependency graph
  - Document the clean dependency flow

### Phase 8: Documentation ☐

☐ Update architecture documentation:
  - Add parse → validate → execute flow diagram
  - Update package dependency diagram
  - Document the three-phase pattern

☐ Create error handling guide:
```markdown
## Error Handling by Phase

### Parse Errors
- Occur when: Input doesn't match grammar
- Examples: "I don't understand that", "Unknown word: xyzzy"
- Recovery: Suggest similar commands

### Validation Errors  
- Occur when: Entities not found or ambiguous
- Examples: "I don't see a ball here", "Which box?"
- Recovery: List visible objects

### Execution Errors
- Occur when: Business rules violated
- Examples: "The box is locked", "That's too heavy"
- Recovery: Suggest solutions
```

☐ Document new APIs:
  - ParsedCommand structure
  - ValidatedCommand structure
  - CommandValidator interface
  - Migration guide for actions

☐ Create examples:
  - Simple parser usage
  - Validator with mock world
  - Full pipeline example
  - Custom validator implementation

☐ Update README files:
  - @sharpee/actions README
  - @sharpee/stdlib README
  - @sharpee/engine README
  - Root README with new architecture

## Migration Notes

### Breaking Changes

1. **Action signature change** - Actions now receive `ValidatedCommand` instead of `ParsedCommand`
2. **Parser output change** - Parser returns unresolved references
3. **New validation phase** - Must add validator to engine

### Compatibility Path

1. Create adapter to convert old ParsedCommand to ValidatedCommand
2. Deprecate old interfaces with warnings
3. Provide migration guide for custom actions

## Error Handling Strategy

Each phase has distinct error types:

### Parser Errors
- "I don't understand that sentence structure"
- "Unknown word: 'xyzzy'"
- "Incomplete command"

### Validation Errors  
- "I don't see a red ball here"
- "Which box do you mean?"
- "You can't reach that"

### Execution Errors
- "The box is locked"
- "That's too heavy to carry"
- "The container is full"

## Benefits Summary

1. **Clear Separation** - Each phase has one responsibility
2. **Better Errors** - Phase-specific error messages
3. **Testability** - Each phase can be tested independently
4. **No Circular Deps** - Clean dependency graph
5. **Consistent Pattern** - Same validate/execute throughout
6. **Performance** - Can cache validation results

## Critical Decision Points

### Why Separate Validation?

Current architecture mixes parsing with validation, making it impossible to:
- Test parser without world model
- Provide clear error messages
- Reuse parser for different validation strategies

### Why ValidatedCommand Knows Handler?

Prevents double lookup and ensures validation and execution use same handler.

### Why Three Phases Instead of Two?

Could combine validation + execution, but separating allows:
- Different error handling strategies
- Validation caching
- Alternative execution strategies

## Next Steps

1. **Immediate:** Complete Phase 3.6 - Remaining Interface Updates
   - Update `IWorldModel` → `WorldModel` in world-model package
   - Update action implementations to use `Action` interface
   - Run full build and fix any TypeScript errors

2. **Phase 5:** Update Engine (~10% of work remaining)
   - Implement new CommandExecutor with three-phase flow
   - Update context creation methods
   - Add phase-specific error handling
   - Update TurnResult type

3. **Phase 7:** Testing & Validation
   - Create comprehensive test suites
   - Verify no circular dependencies with madge
   - Integration tests for full pipeline
   - Test with simple game scenario

4. **Phase 8:** Documentation
   - Update all package READMEs
   - Create migration guide
   - Document new architecture with diagrams
   - Add examples for common use cases

5. **Cleanup:**
   - Remove the now-unused @sharpee/actions package directory
   - Update root package.json to remove actions from workspaces
   - Archive any obsolete documentation

## Progress Summary

**Completed:** Phases 1-3, 3.5, 3.6, 3.7 (Steps 1-8.5), 4, 6 (~90% of refactor)
- All type definitions created
- Parser fully refactored to be world-agnostic  
- Complete CommandValidator with all features
- Comprehensive test coverage
- Interface naming convention updated (no `I` prefix)
- Debug event architecture redesigned with event sources
- Core module independence achieved
- Actions moved to stdlib (Phase 6 done early to fix circular deps)
- No more circular dependencies!
- All interfaces cleaned up and following conventions
- Core refactoring complete - IF types moved to world-model
- Action interface location fixed - ValidatedCommand uses actionId
- Const objects pattern enforced throughout

**In Progress:** Phase 3.7 - Core Refactoring (Final Steps)
- ✅ Created new event infrastructure (GenericEventSource, SystemEvent, SemanticEventSource)
- ✅ Moved IF-specific types to world-model (commands, interfaces)
- ✅ Updated all packages to use new imports (Steps 1-8)
- ✅ Fixed Action interface location (Step 8.5)
- ☐ Next: Build and test everything (Step 9)
- ☐ Then: Migration and cleanup (Step 10)

**Next:** 
1. Complete Phase 3.7 - Core refactoring
2. Phase 5 - Update engine to use new command flow
3. Phase 7 - Testing & validation
4. Phase 8 - Documentation

**Benefits Already Realized:**
- Cleaner architecture with actions in stdlib
- No circular dependencies
- Better cohesion - parser, validator, and actions in one package
- Debug events properly separated from semantic events
- ValidatedCommand is a pure data structure (stores actionId)
- Const objects pattern provides better developer experience
- Clear separation: world-model = state, stdlib = execution

## Appendix: Conversation Context

This refactor emerged from recognizing that:
1. Parser currently does too much (syntax + semantics)
2. Circular dependencies between actions and stdlib
3. Pattern matches entity validation/execution model
4. Need explicit validation phase for better errors

Key insight: "we need to think through, in general, what the ins and outs for the parser are... here we need to validate the ParsedCommand vs the World Model. This isn't parser-ish and it's not World Model-ish....we need a new thing"

# @sharpee/stdlib

Standard library for the Sharpee IF Platform - 57 standard IF actions with four-phase pattern (validate/execute/report/blocked).

## Installation

```bash
npm install @sharpee/stdlib
```

## Overview

The `@sharpee/stdlib` package provides the core IF functionality:
- **Parser** - Converts user input to ParsedCommand structures (syntax only)
- **Validator** - Resolves entities and validates commands against world state
- **Actions** - Standard IF actions (take, drop, examine, go, etc.)
- **Language System** - Message keys and formatting
- **Vocabulary** - Standard English vocabulary for IF

## Architecture

The stdlib implements Sharpee's command processing pipeline:

```
Input Text
    ↓
[Parser] - Grammar analysis only        (@sharpee/parser-en-us)
    ↓
ParsedCommand - Structured but unresolved
    ↓
[Validator] - Entity resolution & validation
    ↓
ValidatedCommand - Ready for execution
    ↓
[Actions] - Four-phase: validate/execute/report/blocked
    ↓
SemanticEvents - What happened
```

## Parser Contracts

The concrete parser implementation lives in the language package
(`@sharpee/parser-en-us`). stdlib re-exports the parser and vocabulary
contracts (from `@sharpee/if-domain`) plus the `ParserFactory` used to register
and create parsers:

```typescript
import { ParserFactory } from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

ParserFactory.registerParser('en-US', EnglishParser);
const parser = ParserFactory.createParser('en-US', new EnglishLanguageProvider());

const result = parser.parse('take the red ball');
```

## Validator

The validator resolves entities and checks preconditions:

```typescript
import { CommandValidator } from '@sharpee/stdlib';

const validator = new CommandValidator(world, actionRegistry);

// world, action registry, and scope resolver come from the constructor
const result = validator.validate(parsedCommand);

// Returns Result<ValidatedCommand, IValidationError>. On success, the
// ValidatedCommand carries:
// - Resolved entities
// - Action handler reference
// - Scope info for each resolved object
```

### Entity Resolution Features

- Adjective matching ("red ball" vs "blue ball")
- Scope checking (visible, reachable, touchable)
- Pronoun resolution ("it", "them") 
- Synonym matching
- Container contents ("ball in box")
- Recent interaction bonus
- Ambiguity resolution

## Actions

Standard IF actions are included:

```typescript
import {
  takingAction,
  droppingAction,
  examiningAction,
  goingAction,
  openingAction
} from '@sharpee/stdlib';

// Actions implement the four-phase Action interface (ADR-051):
interface Action {
  id: string;
  validate(context: ActionContext): ValidationResult;  // checks, no mutations
  execute(context: ActionContext): void;               // mutations only
  report(context: ActionContext): ISemanticEvent[];    // events from final state
  blocked?(context: ActionContext, result: ValidationResult): ISemanticEvent[];
}
```

> See `packages/stdlib/CLAUDE.md` for capability dispatch (ADR-090) — how
> entity-specific verbs (LOWER, TURN, WAVE) are handled via traits + behaviors
> rather than per-action branching.

### Available Actions (57 Total)

**Movement**: going, entering, exiting, climbing
**Manipulation**: taking, dropping, putting, inserting, removing, giving, throwing, cutting, digging, hiding, revealing
**Containers/Doors**: opening, closing, locking, unlocking
**Examination**: looking, examining, searching, reading
**Interaction**: talking, asking, telling, showing, attacking
**Devices**: switching on/off, pushing, pulling, turning, raising, lowering
**Wearables**: wearing, taking off
**Consumables**: eating, drinking
**Senses**: touching, smelling, listening
**Meta**: inventory, score, help, save, restore, restart, quit, undo, again, wait, about, version, sleep

Two internal/author actions (deadly-room death handling and the trace debug
action) round out the 57.

## Language System

stdlib does not contain English prose. Actions emit semantic events carrying
**message IDs** (defined in each action's `*-messages.ts`); the language package
(`@sharpee/lang-en-us`) maps those IDs to text via its formatter chain
(ADR-095/ADR-158). This keeps all user-facing text in the language layer.

## Vocabulary Contracts

stdlib re-exports the vocabulary contracts and registry (from
`@sharpee/if-domain`) — `VocabularyEntry`, `PartOfSpeech`, `VocabularyProvider`,
`vocabularyRegistry`, etc. The actual English word lists live in
`@sharpee/lang-en-us`.

## Integration Example

```typescript
import {
  ParserFactory,
  CommandValidator,
  StandardActionRegistry,
  standardActions
} from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// Set up parser
ParserFactory.registerParser('en-US', EnglishParser);
const parser = ParserFactory.createParser('en-US', new EnglishLanguageProvider());

// Set up actions
const actionRegistry = new StandardActionRegistry();
standardActions.forEach(action => actionRegistry.register(action));

// Set up validator
const validator = new CommandValidator(world, actionRegistry);
```

> In practice you rarely wire these by hand — `@sharpee/engine` and the build
> toolchain assemble the parser, validator, action registry, and language
> provider for you from the story's config.

## Design Philosophy

The stdlib follows Sharpee's core principles:

1. **Separation of Concerns** - Parser doesn't know about world, validator doesn't execute
2. **Phase Discipline** - validate is pure, execute mutates via behaviors, report emits events
3. **Extensible** - Easy to add new actions, vocabulary, messages
4. **Type-Safe** - Full TypeScript support with proper types
5. **Event-Driven** - All changes happen through semantic events

## Testing

The stdlib package has comprehensive test coverage:

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Test Structure

```
tests/
├── unit/           # Unit tests for individual components
│   ├── actions/    # Action tests
│   ├── capabilities/
│   ├── chains/
│   ├── npc/
│   ├── parser/     # Parser tests
│   ├── scope/
│   ├── services/
│   ├── utils/
│   └── validation/ # Validator tests
├── validation/     # Validation tests
└── integration/    # Integration tests
```

### Coverage Goals

- Unit tests: >90% coverage
- Integration tests: >80% coverage
- All public APIs tested
- All error paths tested
- Debug events verified

## License

MIT
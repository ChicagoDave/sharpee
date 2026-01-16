# @sharpee/stdlib

Standard library for the Sharpee IF Platform - 43 standard IF actions with four-phase pattern (validate/execute/report/blocked).

## Overview

The `@sharpee/stdlib` package provides the core IF functionality:
- **Parser** - Converts user input to ParsedCommand structures (syntax only)
- **Validator** - Resolves entities and validates commands against world state
- **Actions** - Standard IF actions (take, drop, examine, go, etc.)
- **Language System** - Message keys and formatting
- **Vocabulary** - Standard English vocabulary for IF

## Architecture

The stdlib implements Sharpee's three-phase command processing:

```
Input Text
    ↓
[Parser] - Grammar analysis only
    ↓
ParsedCommand - Structured but unresolved
    ↓
[Validator] - Entity resolution & validation
    ↓
ValidatedCommand - Ready for execution
    ↓
[Actions] - Business logic
    ↓
SemanticEvents - What happened
```

## Parser

The parser performs purely grammatical analysis without world knowledge:

```typescript
import { BasicParser } from '@sharpee/stdlib/parser';

const parser = new BasicParser();
parser.registerVocabulary(standardVocabulary);

const result = parser.parse("take the red ball");
// Returns ParsedCommand with:
// - action: "TAKE"
// - directObject: { text: "red ball", candidates: ["ball", "red"] }
// - pattern: "VERB_OBJ"
```

## Validator

The validator resolves entities and checks preconditions:

```typescript
import { CommandValidator } from '@sharpee/stdlib/validation';

const validator = new CommandValidator(world, actionRegistry);

const validated = validator.validate(parsedCommand, {
  world,
  player,
  location: currentRoom,
  scopeService
});

// Returns ValidatedCommand with:
// - Resolved entities
// - Action handler reference
// - Validation score
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
} from '@sharpee/stdlib/actions';

// Actions implement the Action interface:
interface Action {
  id: string;
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[];
}
```

### Available Actions (43 Total)

**Movement**: going, entering, exiting
**Manipulation**: taking, dropping, putting, inserting, removing, giving, throwing
**Containers/Doors**: opening, closing, locking, unlocking
**Examination**: looking, examining, searching, reading
**Interaction**: talking, showing, attacking
**Devices**: switching on/off, pushing, pulling, raising, lowering
**Wearables**: wearing, taking off
**Consumables**: eating, drinking
**Senses**: touching, smelling, listening
**Meta**: inventory, score, help, save, restore, restart, quit, undo, wait, about, sleep

## Language System

Message formatting and resolution:

```typescript
import { IFMessageResolver } from '@sharpee/stdlib/messages';

const resolver = new IFMessageResolver();
resolver.registerBundle('en-US', enUSBundle);

// Format messages with parameters
const message = resolver.resolve('item_taken', {
  item: 'golden key'
});
// "You take the golden key."
```

## Vocabulary

Standard English vocabulary for IF:

```typescript
import { standardVocabulary } from '@sharpee/stdlib/vocabulary';

// Includes common IF words:
// - Verbs: take, drop, examine, go, etc.
// - Prepositions: in, on, under, with, etc.
// - Articles: the, a, an
// - Common nouns and adjectives
```

## Integration Example

```typescript
import { 
  BasicParser,
  CommandValidator,
  ActionRegistry,
  standardActions,
  standardVocabulary 
} from '@sharpee/stdlib';

// Set up parser
const parser = new BasicParser();
parser.registerVocabulary(standardVocabulary);

// Set up actions
const actionRegistry = new ActionRegistry();
standardActions.forEach(action => actionRegistry.register(action));

// Set up validator
const validator = new CommandValidator(world, actionRegistry);

// Process a command
const parsed = parser.parse("take brass key");
if (parsed.success) {
  const validated = validator.validate(parsed.value, validationContext);
  if (validated.success) {
    const events = validated.value.actionHandler.execute(
      validated.value,
      actionContext
    );
    // Process events...
  }
}
```

## Design Philosophy

The stdlib follows Sharpee's core principles:

1. **Separation of Concerns** - Parser doesn't know about world, validator doesn't execute
2. **Pure Functions** - Actions return events, don't mutate state
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

# View coverage report
pnpm coverage:view

# Update coverage badge
pnpm coverage:badge
```

### Test Structure

```
tests/
├── unit/           # Unit tests for individual components
│   ├── actions/    # Action tests
│   ├── parser/     # Parser tests
│   ├── validation/ # Validator tests
│   └── language/   # Language system tests
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
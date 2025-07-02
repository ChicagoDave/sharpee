# Enhanced CommandValidator Documentation

## Overview

The CommandValidator is responsible for the second phase of command processing in the Sharpee Interactive Fiction Platform. It takes a world-agnostic ParsedCommand from the parser and validates it against the current world state, resolving entity references and checking preconditions.

## Key Features

### 1. Advanced Entity Resolution

The validator implements sophisticated entity matching with a scoring system:

- **Exact name match**: 10 points
- **Name contains word**: 5 points
- **Type match**: 4 points
- **Adjective match**: 3 points
- **Synonym match**: 2 points
- **Visibility bonus**: 1 point
- **Reachability bonus**: 1 point
- **Recent interaction bonus**: 3 points
- **In inventory bonus**: 2 points

### 2. Adjective Matching

Distinguishes between similar objects using adjectives:

```typescript
// Input: "take red ball"
// Resolves to the ball with adjective "red", not "blue"
```

### 3. Scope Rules

Three levels of scope enforcement:

- **visible**: Entity must be visible to the player
- **reachable**: Entity must be reachable (visible + not blocked)
- **touchable**: Entity must be touchable (reachable + not intangible)

### 4. Pronoun Resolution

Tracks recent interactions for pronoun resolution:

- "it", "that" → last single entity interacted with
- "them", "these", "those" → last group of entities
- "him", "her" → gendered pronouns for NPCs

### 5. Ambiguity Resolution

Automatic resolution strategies:

1. **Score threshold**: If top match scores 50% higher than second
2. **Perfect modifier match**: All adjectives match exactly
3. **Only reachable**: Single entity is both visible and reachable

### 6. Debug Event Support

Emits detailed debug events for troubleshooting:

- `entity_resolution`: How entities were matched
- `scope_check`: Which entities were considered
- `ambiguity_resolution`: How conflicts were resolved
- `validation_error`: Why validation failed

## Usage

```typescript
import { CommandValidator } from '@sharpee/stdlib/validation';
import { WorldModel } from '@sharpee/world-model';
import { ActionRegistry } from '@sharpee/stdlib/actions';

// Create validator
const validator = new CommandValidator(world, actionRegistry);

// Enable debug events (optional)
validator.setSystemEventSource(systemEventSource);

// Validate a parsed command
const parsed: ParsedCommand = {
  rawInput: 'take red ball',
  action: 'TAKE',
  directObject: {
    text: 'red ball',
    candidates: ['red', 'ball'],
    modifiers: ['red']
  }
};

const result = validator.validate(parsed);

if (result.success) {
  const validated = result.value;
  // validated.actionHandler - the action to execute
  // validated.directObject.entity - the resolved red ball entity
} else {
  const error = result.error;
  // error.code - type of error
  // error.message - human-readable message
}
```

## Action Metadata

Actions can declare their requirements via metadata:

```typescript
interface ActionMetadata {
  requiresDirectObject: boolean;
  requiresIndirectObject: boolean;
  directObjectScope?: 'visible' | 'reachable' | 'touchable';
  indirectObjectScope?: 'visible' | 'reachable' | 'touchable';
  validPrepositions?: string[];
}

// Example action with metadata
const takeAction: Action = {
  id: 'TAKE',
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: 'reachable'
  },
  execute: (command) => { /* ... */ }
};
```

## Error Messages

The validator generates user-friendly error messages:

- "I don't understand the word 'frobnicate'."
- "What do you want to take?"
- "You can't see any green ball here."
- "Which ball do you mean? (I can see 2 of them)"
- "You can't reach the ball."
- "You can't put something beside that."

## Integration with Parser

The validator expects ParsedCommand objects with:

```typescript
interface ParsedCommand {
  rawInput: string;
  action: string;
  directObject?: {
    text: string;
    candidates: string[];
    modifiers?: string[];
  };
  indirectObject?: {
    text: string;
    candidates: string[];
    modifiers?: string[];
  };
  preposition?: string;
}
```

## Testing

The validator includes comprehensive tests covering:

- Basic validation scenarios
- Adjective matching
- Scope rules enforcement
- Ambiguity resolution
- Synonym resolution
- Preposition validation
- Pronoun resolution
- Debug event emission

## Future Enhancements

- Support for "all" commands (take all, drop all)
- Multiple object selection (take the sword and the shield)
- More sophisticated pronoun tracking
- Custom disambiguation strategies
- Internationalization support

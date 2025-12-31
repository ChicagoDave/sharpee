# ADR-080: Raw Text Grammar Slots

**Status**: Proposed
**Date**: 2025-12-31
**Context**: Dungeo INCANT command implementation

## Problem

Story authors need to define grammar patterns that capture arbitrary text input without entity resolution. Currently, all grammar slots (`:target`, `:item`, `:arg`, etc.) are treated as noun phrases that the validator attempts to resolve to game entities.

### Example: INCANT Command

```typescript
// Story defines pattern
grammar.define('incant :arg1 :arg2')
  .mapsTo('dungeo:incant')
  .build();
```

When player types `incant mhoram dfnobo`:
1. Parser matches pattern, sets `directObject="mhoram"`, `indirectObject="dfnobo"`
2. Validator tries to resolve "mhoram" as an entity
3. Validation fails: `ENTITY_NOT_FOUND`
4. Command never reaches the action's validate/execute phases

The action needs the raw text "mhoram" and "dfnobo" to perform challenge-response authentication, but the platform assumes all slots refer to entities.

### Current Workarounds

1. **Specific literal patterns** (used by SAY):
   ```typescript
   grammar.define('say odysseus').mapsTo(SAY_ACTION_ID);  // Works
   grammar.define('say ulysses').mapsTo(SAY_ACTION_ID);   // Works
   grammar.define('say :arg').mapsTo(SAY_ACTION_ID);      // Fails for non-entities
   ```
   This doesn't scale for commands with many valid inputs.

2. **ParsedCommandTransformer** (attempted for GDT/INCANT):
   Clear entity slots after parsing but before validation. This works for GDT (which has a mode flag) but doesn't work reliably for standalone commands.

## Use Cases

1. **Magic words**: `incant <challenge> <response>`, `say <magic-word>`, `xyzzy`
2. **Conversation topics**: `ask guard about <topic>`, `tell wizard about <subject>`
3. **Password entry**: `type <password>`, `enter code <digits>`
4. **Custom verbs with text**: `write <message> on paper`, `name sword <name>`

## Decision

Add a new slot type `:text` (or `:raw`) that:
1. Captures input text without entity resolution
2. Passes raw string to the action via `parsed.structure` or a new `textSlots` map
3. Skips validation for that slot

### Proposed Grammar API

```typescript
// Single text argument
grammar.define('incant :challenge(text) :response(text)')
  .mapsTo('dungeo:incant')
  .build();

// Or with explicit type annotation
grammar.define('say :word')
  .where('word', { type: 'text' })  // Skip entity resolution
  .mapsTo(SAY_ACTION_ID)
  .build();
```

### Proposed Access Pattern

```typescript
// In action's validate/execute:
const challenge = context.command.textSlots?.get('challenge');
const response = context.command.textSlots?.get('response');

// Or via rawInput parsing (current workaround)
const rawInput = context.command.parsed?.rawInput;
```

## Alternatives Considered

### 1. Universal Raw Input Access
Always provide `rawInput` and let actions parse it themselves.

**Pros**: Simple, no parser changes
**Cons**: Duplicates parsing logic in every action, error-prone

### 2. Slot Type in Pattern Syntax
Use syntax like `:name(text)` or `$name` for text slots.

**Pros**: Concise, clear intent
**Cons**: Parser syntax changes, potential conflicts

### 3. Constraint-Based Type
Use `.where()` with a type constraint: `.where('word', { type: 'text' })`

**Pros**: Consistent with existing constraint API
**Cons**: Verbose for common case

### 4. Separate Pattern Method
New method for text-only patterns: `grammar.defineText('incant :a :b')`

**Pros**: Clear separation
**Cons**: API proliferation

## Recommendation

**Option 3: Constraint-Based Type** with shorthand support.

```typescript
// Verbose form (explicit)
grammar.define('incant :challenge :response')
  .where('challenge', { type: 'text' })
  .where('response', { type: 'text' })
  .mapsTo('dungeo:incant')
  .build();

// Shorthand form (convention: slots starting with $ are text)
grammar.define('incant $challenge $response')
  .mapsTo('dungeo:incant')
  .build();
```

## Implementation Notes

### Parser Changes (packages/parser-en-us)

1. Add `SlotType` enum: `ENTITY | TEXT | DIRECTION`
2. Modify slot consumption to check type
3. Skip entity resolution for TEXT slots
4. Store text values in dedicated map

### Validator Changes (packages/stdlib)

1. Skip entity resolution for TEXT-typed slots
2. Pass text values through to action context

### Action Context Changes (packages/engine)

1. Add `textSlots: Map<string, string>` to ActionContext
2. Or extend `parsed.structure` with text slot values

## Consequences

**Positive:**
- Story authors can capture arbitrary text input
- Enables magic word systems, conversation topics, passwords
- Clean separation between entity refs and raw text

**Negative:**
- Parser complexity increase
- New API surface to document and maintain
- Migration needed for existing workarounds

## Related

- ADR-054: Semantic Grammar
- ADR-036: Parser Contracts (if-domain)
- ADR-043: Scope and Implied Indirect Objects

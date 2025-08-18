# Command Interface Requirements Analysis

## What Actions Actually Use from Parsed Commands

After auditing the codebase, here's what actions actually access:

### 1. Preposition (5 uses)
- `context.command.parsed.structure.preposition?.text`
- Used by: putting, inserting, using, telling, asking
- Purpose: Determine spatial relationships (on/in/under)

### 2. Extras (9 uses)
Common extras fields:
- `direction` - for going, climbing
- `topic` - for asking, telling
- `name`/`slot` - for saving/restoring
- `mode` - for about/help commands
- `response`/`text` - for answering

### 3. Verb Text (1 use)
- `context.command.parsed.structure.verb?.text`
- Used by: dropping (to distinguish "drop" vs "discard")

### 4. Raw Access (2 uses)
- Full parsed object passed through in inserting action
- Used for creating modified commands

## Proposed Solution

Instead of exposing the entire parsed structure, we should:

### 1. Add flat properties to ValidatedCommand:
```typescript
interface ValidatedCommand {
  // Core properties (already have these)
  actionId: string;
  directObject?: ValidatedObjectReference;
  indirectObject?: ValidatedObjectReference;
  
  // Add these flat properties
  preposition?: string;        // from structure.preposition.text
  verb?: string;               // from structure.verb.text
  extras?: Record<string, any>; // from parsed.extras
  rawText: string;             // from parsed.rawText
  
  // Keep parsed but mark as internal/deprecated
  /** @internal */
  parsed?: ParsedCommand;
}
```

### 2. Update actions gradually:
- Change `context.command.parsed.structure.preposition?.text` 
  to `context.command.preposition`
- Change `context.command.parsed.extras?.direction`
  to `context.command.extras?.direction`

### 3. Benefits:
- No adapters needed
- Backward compatible (parsed still available)
- Actions get simpler interface
- Can deprecate parsed access over time

## Implementation Plan

1. **Phase 1**: Add flat properties to ValidatedCommand
   - Add preposition, verb, extras, rawText
   - Keep parsed for backward compatibility

2. **Phase 2**: Update actions to use flat properties
   - One action at a time
   - Test each change

3. **Phase 3**: Mark parsed as @internal
   - After all actions updated
   - Prevents new code from using it

This is much simpler than creating adapters and new interfaces!
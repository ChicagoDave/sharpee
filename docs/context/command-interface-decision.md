# Command Interface Decision

## The Current Data Flow

1. **Parser** produces `IParsedCommand` with:
   - `structure.verb.text` - the actual verb used
   - `structure.preposition.text` - spatial relationship 
   - `extras` - additional semantic info (direction, topic, etc.)
   - `action` - identified action ID
   - Full token arrays and grammar patterns

2. **Validator** produces `IValidatedCommand` with:
   - `parsed` - the full IParsedCommand
   - `actionId` - which action will handle it
   - `directObject/indirectObject` - resolved entities
   - No flattening of commonly used fields

3. **Actions** access:
   - `context.command.parsed.extras.direction` (most common)
   - `context.command.parsed.structure.verb.text` 
   - `context.command.parsed.structure.preposition.text`
   - Various other extras fields

## The Core Problem

Actions are reaching deep into parser internals:
- `context.command.parsed.structure.verb.text` - 3 levels deep!
- `context.command.parsed.extras.direction` - also 3 levels deep
- This creates tight coupling to parser implementation

## Proposed Solution: Minimal Flattening

Instead of creating new interfaces or adapters, just flatten the commonly used fields in ValidatedCommand:

```typescript
// In world-model/src/commands/validated-command.ts
export interface IValidatedCommand {
  /** Original parsed command */
  parsed: IParsedCommand;
  
  /** ID of the action that will handle this command */
  actionId: string;
  
  /** Resolved direct object if present */
  directObject?: IValidatedObjectReference;
  
  /** Resolved indirect object if present */  
  indirectObject?: IValidatedObjectReference;
  
  // ADD THESE FLATTENED FIELDS:
  /** The actual verb used (from parsed.structure.verb.text) */
  verb?: string;
  
  /** Preposition if present (from parsed.structure.preposition.text) */
  preposition?: string;
  
  /** Original input text (from parsed.rawInput) */
  rawText: string;
  
  /** Additional semantic info (from parsed.extras) */
  extras?: Record<string, any>;
  
  /** Validation metadata */
  metadata?: {
    validationTime?: number;
    warnings?: string[];
  };
}
```

## Implementation Steps

### Step 1: Update IValidatedCommand in world-model
Add the flat fields without removing parsed (backward compatible)

### Step 2: Update command-validator.ts to populate flat fields
```typescript
const validatedCommand: ValidatedCommand = {
  parsed: command,
  actionId: actionHandler.id,
  directObject,
  indirectObject,
  // Add these:
  verb: command.structure?.verb?.text,
  preposition: command.structure?.preposition?.text,
  rawText: command.rawText || command.rawInput,
  extras: command.extras,
  metadata: { ... }
};
```

### Step 3: Update actions one by one
Change from:
```typescript
const direction = context.command.parsed.extras?.direction
const verb = context.command.parsed.structure.verb?.text
```

To:
```typescript
const direction = context.command.extras?.direction
const verb = context.command.verb
```

## Benefits

1. **Backward Compatible** - parsed still available
2. **Simple** - No new interfaces or adapters
3. **Gradual Migration** - Update actions one at a time
4. **Type Safety** - Can add types to specific extras later
5. **Cleaner** - Actions don't reach into parser internals

## Why Not Other Approaches?

### Why not if-domain contracts?
- Would require adapters and conversions
- More complex than necessary
- We already have working code

### Why not remove parsed entirely?
- Some actions might legitimately need full parse info
- Breaking change would affect extensions
- Can deprecate it later after migration

### Why not typed extras?
- Can add this later as enhancement
- For now, keeping Record<string, any> is flexible
- Most extras fields are used by single actions

## Recommendation

Go with the minimal flattening approach:
1. It solves the immediate problem (actions accessing parser internals)
2. It's backward compatible
3. It's simple to implement
4. It sets us up for future improvements

This is a pragmatic solution that improves the code without over-engineering.
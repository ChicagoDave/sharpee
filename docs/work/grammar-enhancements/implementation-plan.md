# ADR-080 Implementation Plan: Grammar Enhancements

**Branch**: `adr-080-grammar-enhancements`
**Start Date**: 2025-12-31
**Status**: Phase 1 Complete (Text Slots & Instruments)

## Overview

Implementing the four grammar enhancement areas from ADR-080:
1. **Text Slots** - Capture raw text without entity resolution ✅ COMPLETE
2. **Multi-Object Parsing** - Handle "all", "but", "and" (future phase)
3. **Command Chaining** - Split on periods (future phase)
4. **Instrument Clauses** - Mark slots as instruments ✅ COMPLETE

## Implementation Summary (2025-12-31)

### What Was Implemented

1. **SlotType enum** (`if-domain/grammar-builder.ts`):
   - `ENTITY` (default) - resolve to entity via vocabulary
   - `TEXT` - single-token raw text capture
   - `TEXT_GREEDY` - multi-token text until delimiter
   - `INSTRUMENT` - entity marked as instrument

2. **Pattern syntax** (`:slot...`):
   - Greedy slots consume until next pattern element
   - Compiled to TEXT_GREEDY type automatically

3. **Builder methods**:
   - `.text(slot)` - marks slot as TEXT type
   - `.instrument(slot)` - marks slot as INSTRUMENT type

4. **Grammar engine changes**:
   - `consumeSlot()` dispatches by slot type
   - `consumeTextSlot()` - single token, no entity resolution
   - `consumeGreedyTextSlot()` - multiple tokens until delimiter
   - `consumeEntitySlot()` - existing behavior, now with slotType

5. **IParsedCommand updates**:
   - `textSlots?: Map<string, string>` - raw text values
   - `instrument?: INounPhrase` - instrument entity

### Test Results

All 148 parser tests pass (13 new ADR-080 tests + 135 existing).

## Implementation Phases

### Phase 1: Grammar Builder Interfaces (if-domain)

**File**: `packages/if-domain/src/grammar/grammar-builder.ts`

**Changes**:
1. Add `SlotType` enum:
   ```typescript
   export enum SlotType {
     ENTITY = 'entity',        // Default: resolve to entity
     TEXT = 'text',            // Single-token raw text
     TEXT_GREEDY = 'text_greedy', // Multi-token raw text until delimiter
     INSTRUMENT = 'instrument' // Entity marked as instrument
   }
   ```

2. Update `PatternToken` interface:
   ```typescript
   export interface PatternToken {
     type: 'literal' | 'slot' | 'alternates';
     value: string;
     alternates?: string[];
     optional?: boolean;
     slotType?: SlotType;    // NEW: slot type for slot tokens
     greedy?: boolean;       // NEW: for :slot... syntax
   }
   ```

3. Add methods to `PatternBuilder` interface:
   ```typescript
   interface PatternBuilder {
     // ... existing methods ...
     text(slot: string): PatternBuilder;
     instrument(slot: string): PatternBuilder;
   }
   ```

4. Update `SlotConstraint` interface:
   ```typescript
   export interface SlotConstraint {
     name: string;
     constraints: Constraint[];
     slotType: SlotType;  // NEW
   }
   ```

### Phase 2: Pattern Compiler (parser-en-us)

**File**: `packages/parser-en-us/src/english-pattern-compiler.ts`

**Changes**:
1. Parse `:slot...` syntax - detect `...` suffix and set greedy flag
2. Track slot types in compiled pattern
3. Validation: greedy + `.where()` should warn/error

**Pattern Syntax**:
- `:name` → entity slot (default)
- `:name...` → greedy text slot (ellipsis implies text)

### Phase 3: Grammar Engine (parser-en-us)

**File**: `packages/parser-en-us/src/english-grammar-engine.ts`

**Changes to `consumeSlot()`**:

```typescript
private consumeSlot(
  slotName: string,
  tokens: Token[],
  startIndex: number,
  pattern: CompiledPattern,
  rule: any,
  context: GrammarContext
): { tokens: number[]; text: string; confidence?: number; slotType?: SlotType } | null {

  const slotConstraints = rule.slots.get(slotName);
  const slotType = slotConstraints?.slotType || SlotType.ENTITY;

  switch (slotType) {
    case SlotType.TEXT:
      // Consume exactly one token, no entity resolution
      return this.consumeTextSlot(tokens, startIndex);

    case SlotType.TEXT_GREEDY:
      // Consume until next pattern element or end
      return this.consumeGreedyTextSlot(tokens, startIndex, pattern, slotTokenIndex);

    case SlotType.INSTRUMENT:
      // Resolve entity but mark as instrument
      const result = this.consumeEntitySlot(...);
      if (result) result.isInstrument = true;
      return result;

    case SlotType.ENTITY:
    default:
      // Existing entity resolution behavior
      return this.consumeEntitySlot(tokens, startIndex, ...);
  }
}
```

### Phase 4: Parsed Command Structure (world-model)

**File**: `packages/world-model/src/commands/parsed-command.ts`

**Updates to `INounPhrase`**:
```typescript
export interface INounPhrase {
  // ... existing fields ...
  isAll?: boolean;        // NEW: for "take all"
  isList?: boolean;       // NEW: for "take knife and lamp"
  items?: INounPhrase[];  // NEW: list items
}
```

**Updates to `IParsedCommand`**:
```typescript
export interface IParsedCommand {
  // ... existing fields ...
  textSlots?: Map<string, string>;  // NEW: raw text slot values
  excluded?: INounPhrase[];         // NEW: for "all but X"
  instrument?: INounPhrase;         // NEW: instrument entity
}
```

### Phase 5: Semantic Parser Integration

**File**: `packages/parser-en-us/src/semantic-parser-engine.ts`

Wire up the new slot types to populate the new `IParsedCommand` fields.

### Phase 6: Story Grammar Builder Implementation

**File**: `packages/parser-en-us/src/story-grammar-impl.ts`

Implement the `.text()` and `.instrument()` methods on the pattern builder.

---

## Implementation Order

1. **Types first**: Add SlotType enum and update interfaces (grammar-builder.ts)
2. **Pattern parsing**: Update pattern compiler to parse :slot... syntax
3. **Command structure**: Update IParsedCommand interfaces
4. **Engine logic**: Update grammar engine consumeSlot
5. **Builder implementation**: Implement .text() and .instrument() methods
6. **Tests**: Write comprehensive tests

## Test Cases

### Text Slots
```typescript
// Single-word text
grammar.define('incant :challenge :response')
  .text('challenge')
  .text('response')
  .mapsTo('dungeo:incant')

// Input: "incant mhoram dfnobo"
// Result: textSlots = { challenge: "mhoram", response: "dfnobo" }
```

### Greedy Text Slots
```typescript
grammar.define('say :message...')
  .mapsTo('if.action.saying')

// Input: "say hello there friend"
// Result: textSlots = { message: "hello there friend" }
```

### Bounded Greedy
```typescript
grammar.define('write :content... on :surface')
  .text('content')
  .mapsTo('if.action.writing')

// Input: "write hello world on paper"
// Result: textSlots = { content: "hello world" }, directObject = paper entity
```

### Instrument Slots
```typescript
grammar.define('attack :target with :weapon')
  .instrument('weapon')
  .mapsTo('if.action.attacking')

// Input: "attack troll with sword"
// Result: directObject = troll, instrument = sword
```

## Files to Modify

| Package | File | Changes |
|---------|------|---------|
| if-domain | grammar-builder.ts | SlotType enum, PatternToken, PatternBuilder, SlotConstraint |
| parser-en-us | english-pattern-compiler.ts | Parse :slot... syntax |
| parser-en-us | english-grammar-engine.ts | consumeSlot for different slot types |
| parser-en-us | story-grammar-impl.ts | .text() and .instrument() methods |
| world-model | parsed-command.ts | IParsedCommand, INounPhrase updates |

## Deferred to Future Phases

The following are documented in ADR-080 but will be implemented later:

- **Multi-object "all"**: `take all`, `take all but sword`
- **Object lists**: `take knife and lamp`
- **Command chaining**: `take sword. go north.`
- **Comma handling**: `take knife, lamp` vs `take knife, drop lamp`

These require more extensive changes to action execution (looping over multiple objects) and are better done as a separate PR after the core slot types are working.

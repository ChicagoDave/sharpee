# ADR-080: Grammar Enhancements for Classic IF Patterns

**Status**: Complete
**Date**: 2025-12-31
**Context**: Dungeo implementation revealing gaps in grammar coverage

## Problem

The current grammar system handles single-object commands well but lacks support for common IF patterns that players expect:

| Pattern | Example | Current Support |
|---------|---------|-----------------|
| Text slots | `incant mhoram dfnobo` | Not supported |
| Multi-object "all" | `take all` | Not supported |
| Exclusion | `take all but sword` | Not supported |
| Object lists | `take knife and lamp` | Not supported |
| Command chaining | `take sword. drop knife.` | Not supported |
| Instruments | `read cake through flask` | Partial (pattern exists, no special handling) |

These are well-established patterns from Infocom games that authors and players expect.

## Decision

Expand the grammar system to support all classic IF input patterns through a combination of:

1. **Text slots** - Capture raw text without entity resolution
2. **Multi-object parsing** - Handle "all", "but", and "and" in noun phrases
3. **Command chaining** - Split input on periods into multiple commands
4. **Instrument clauses** - First-class support for "with/through/using" tools

---

## Part 1: Text Slots

### Problem
Story authors need grammar patterns that capture arbitrary text input without entity resolution.

```typescript
grammar.define('incant :challenge :response')
  .mapsTo('dungeo:incant')
```

When player types `incant mhoram dfnobo`, the validator tries to resolve "mhoram" as an entity and fails.

### Solution

Add `.text()` method to mark slots as raw text capture:

```typescript
// Single-word text slots
grammar.define('incant :challenge :response')
  .text('challenge')
  .text('response')
  .mapsTo('dungeo:incant')

// Greedy text (captures rest of input) - ellipsis in pattern
grammar.define('say :message...')
  .mapsTo(SAY_ACTION_ID)

// Greedy bounded (stops at 'on')
grammar.define('write :content... on :surface')
  .text('content')  // implied by ... but explicit is fine
  .mapsTo('if.action.writing')

// Mixed - text and entity slots
grammar.define('name :item :newname...')
  .where('item', scope => scope.carried())
  .text('newname')
  .mapsTo('story:naming')
```

### Rules

| Pattern | Method | Behavior |
|---------|--------|----------|
| `:slot` | none | Entity resolution (default) |
| `:slot` | `.text()` | Single-token text capture |
| `:slot` | `.where()` | Entity with scope constraint |
| `:slot...` | none | Greedy text (implied by `...`) |
| `:slot...` | `.text()` | Greedy text (explicit, redundant) |
| `:slot...` | `.where()` | **Build error** - nonsensical |

### Quoted Strings

Quoted strings are already tokenized as single tokens. They work naturally:

```
> say "hello everyone"
→ message = "hello everyone" (single token)

> say hello everyone
→ With :message... pattern, captures "hello everyone"
```

### Access in Actions

```typescript
// Text slots stored in textSlots map
const challenge = context.command.textSlots?.get('challenge');
const message = context.command.textSlots?.get('message');
```

---

## Part 2: Multi-Object Parsing

### The "all" Keyword

```typescript
// Grammar patterns
grammar.define('take all').mapsTo('if.action.taking')
grammar.define('drop all').mapsTo('if.action.dropping')
grammar.define('put all in :container').mapsTo('if.action.inserting')
```

When the action receives "all":
- `directObject.text` = "all"
- `directObject.isAll` = true
- Action iterates over entities matching its scope constraints

### Exclusion with "but/except"

```typescript
grammar.define('take all but :excluded').mapsTo('if.action.taking')
grammar.define('take all except :excluded').mapsTo('if.action.taking')
grammar.define('drop all but :excluded').mapsTo('if.action.dropping')
```

Parser structure:
```typescript
{
  directObject: { text: "all", isAll: true },
  excluded: [{ text: "sword", entity: swordEntity }]
}
```

### Object Lists with "and"

```typescript
// No special grammar needed - parser recognizes "and" in noun phrases
> take knife and lamp

// Parsed as:
{
  directObject: {
    text: "knife and lamp",
    isList: true,
    items: [
      { text: "knife", entity: knifeEntity },
      { text: "lamp", entity: lampEntity }
    ]
  }
}
```

The action receives a list and processes each item:

```typescript
// In taking action
if (directObject.isList) {
  for (const item of directObject.items) {
    // Validate and execute for each
  }
}
```

### Combined: "all but X and Y"

```
> take all but sword and shield

{
  directObject: { isAll: true },
  excluded: [
    { text: "sword", entity: swordEntity },
    { text: "shield", entity: shieldEntity }
  ]
}
```

---

## Part 3: Command Chaining

### Period as Command Separator

```
> take sword. drop knife. go north.
```

**Pre-processing phase** (before grammar matching):

1. Split input on `.` (except within quotes)
2. Parse each segment as independent command
3. Execute sequentially, accumulating results
4. Stop on first failure (optional: configurable)

```typescript
// Input: "take sword. drop knife."
// Splits into: ["take sword", "drop knife"]
// Each parsed and executed independently
```

### Comma Disambiguation

Commas are ambiguous:
- `take knife, lamp` → list (same verb implied)
- `take knife, drop lamp` → chain (different verbs)

**Heuristic**: If segment after comma starts with a known verb, treat as chain. Otherwise, treat as list continuation.

```
> take knife, lamp, sword
→ List: take [knife, lamp, sword]

> take knife, drop it
→ Chain: take knife; drop it
```

---

## Part 4: Instrument Clauses

### Current State

Patterns like `attack :target with :weapon` exist but `:weapon` is just another entity slot. There's no semantic distinction.

### Enhancement

Mark instrument slots explicitly for semantic clarity:

```typescript
grammar.define('read :target through :instrument')
  .where('target', scope => scope.visible())
  .instrument('instrument')  // NEW: marks as instrument
  .mapsTo('if.action.reading')

grammar.define('attack :target with :weapon')
  .where('target', scope => scope.visible())
  .instrument('weapon')
  .mapsTo('if.action.attacking')
```

Instrument is stored distinctly in parsed command:

```typescript
{
  directObject: { text: "cake", entity: cakeEntity },
  instrument: { text: "flask", entity: flaskEntity }
}
```

Actions can check for instrument presence:

```typescript
const instrument = context.command.instrument;
if (instrument) {
  // Use tool to perform action
}
```

---

## Implementation Plan

### Phase 1: Grammar Builder Changes (if-domain)

1. Add `SlotType` enum: `ENTITY | TEXT | TEXT_GREEDY | INSTRUMENT`
2. Update `PatternToken` to include slot type and greedy flag
3. Add `.text(slotName)` method to `PatternBuilder`
4. Add `.instrument(slotName)` method to `PatternBuilder`
5. Detect `...` suffix in pattern compilation

### Phase 2: Pattern Compiler Changes (parser-en-us)

1. Parse `:slot...` syntax, set greedy flag
2. Validate: greedy + `.where()` = build error
3. Track slot types in compiled pattern

### Phase 3: Grammar Engine Changes (parser-en-us)

1. `consumeSlot` checks slot type:
   - TEXT: consume one token, no entity resolution
   - TEXT_GREEDY: consume until delimiter or end
   - INSTRUMENT: resolve entity, mark as instrument
2. Recognize "all" keyword in noun phrases
3. Recognize "but/except" as exclusion modifier
4. Recognize "and" as list connector
5. **Consecutive slots handling**: When next pattern token is a slot (not a literal delimiter), use constraint-aware consumption to find entity boundaries

### Phase 4: Pre-processing Layer (parser-en-us)

1. Command chaining: split on `.` before parsing
2. Comma handling: detect verb after comma → chain vs list
3. Return array of parsed commands

### Phase 5: Parsed Command Structure (world-model)

Update `IParsedCommand`:

```typescript
interface INounPhrase {
  // ... existing fields ...
  isAll?: boolean;
  isList?: boolean;
  items?: INounPhrase[];  // For lists
}

interface IParsedCommand {
  // ... existing fields ...
  textSlots?: Map<string, string>;
  excluded?: INounPhrase[];  // For "all but X"
  instrument?: INounPhrase;
}
```

### Phase 6: Action Updates (stdlib)

1. Taking/Dropping: handle `isAll` and `excluded`
2. Actions with instruments: check `instrument` field
3. Multi-item iteration for lists

### Phase 7: Core Grammar Updates (parser-en-us)

Add patterns for:
- `take all`, `drop all`, `put all in :container`
- `take all but :excluded`, `drop all except :excluded`
- Instrument variants for existing actions

---

## Examples

### Text Slots

```typescript
// Magic words
grammar.define('incant :a :b').text('a').text('b').mapsTo('dungeo:incant')
// Input: incant mhoram dfnobo → textSlots: {a: "mhoram", b: "dfnobo"}

// Greedy message
grammar.define('say :message...').mapsTo('if.action.saying')
// Input: say hello there → textSlots: {message: "hello there"}

// Bounded greedy
grammar.define('write :content... on :surface').text('content').mapsTo('if.action.writing')
// Input: write hello world on paper → textSlots: {content: "hello world"}, directObject: paper
```

### Multi-Object

```
> take all
→ Action iterates all portable visible items

> take all but lamp
→ Action iterates all except lamp

> take sword and shield
→ Action processes sword, then shield

> drop all except knife and fork
→ Drop everything except knife and fork
```

### Command Chaining

```
> take sword. go north. drop sword.
→ Three commands executed in sequence

> take sword, shield, lamp
→ Single command, three items

> take sword, drop it
→ Two commands (verb detected after comma)
```

### Instruments

```
> read scroll through magnifying glass
→ Reading action receives instrument: magnifying glass

> attack troll with elvish sword
→ Attacking action receives instrument: elvish sword

> unlock door with brass key
→ Unlocking action receives instrument: brass key
```

---

## Consequences

**Positive:**
- Authors can implement classic IF mechanics naturally
- Players get expected input patterns
- Clean separation of text vs entity slots
- Multi-object handling reduces tedious repetition

**Negative:**
- Significant parser complexity increase
- Actions need updates to handle lists/all
- More edge cases in disambiguation
- Testing burden increases

**Migration:**
- Existing patterns continue to work unchanged
- New features are opt-in via `.text()`, `.instrument()`, and new patterns

---

## Implementation Notes

### Phase 3: Command Chaining

Implemented via `parseChain()` method on `EnglishParser`:

```typescript
// Returns array of parsed commands
parser.parseChain('take sword. go north. drop sword')
// → [Result<taking>, Result<going>, Result<dropping>]
```

**Period splitting**: Input is split on `.` (preserving quoted strings). Empty segments are filtered out.

**Comma disambiguation**: Segments are further split on commas ONLY when the word after the comma is a known verb:

```
"take sword, drop it"     → ["take sword", "drop it"]  (verb after comma)
"take knife, lamp"        → ["take knife, lamp"]       (noun after comma = list)
```

Vocabulary lookup via `vocabularyRegistry.hasWord(word, PartOfSpeech.VERB)` determines whether to split.

**Error handling**: Each segment is parsed independently. Errors in one segment don't stop parsing of subsequent segments. Callers receive an array of Results and can handle failures individually.

### Consecutive Slots and Entity Boundary Detection

Patterns with consecutive entity slots (e.g., `give :recipient :item`) require special handling in multi-object parsing. Without a literal delimiter between slots, the parser cannot use simple token matching to determine where one entity ends and another begins.

**Problem**: For `give guard sword`, greedy consumption would assign both words to `:recipient`, leaving nothing for `:item`.

**Solution**: When `nextPatternToken.type === 'slot'`, use constraint-aware consumption:

1. Try progressively longer phrases (1 word, 2 words, etc.)
2. Check each candidate against slot constraints
3. Stop at the first match (greedy: shortest match wins)
4. If no constraints defined, take only the first word (safe default)

This preserves support for multi-word entities like "brass lantern" when constraints can identify them, while preventing over-consumption in consecutive slot patterns.

| Pattern Type | Example | Next Token | Strategy |
|-------------|---------|------------|----------|
| Literal delimiter | `put :item in :container` | `in` (literal) | Greedy until delimiter |
| Consecutive slots | `give :recipient :item` | `:item` (slot) | Constraint-aware, shortest match |

---

## Related ADRs

- ADR-054: Semantic Grammar
- ADR-036: Parser Contracts (if-domain)
- ADR-043: Scope and Implied Indirect Objects

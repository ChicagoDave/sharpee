# ADR-095: Message Templates with Formatters

## Status: ACCEPTED

## Date: 2026-01-12 (Draft), 2026-01-13 (Accepted)

## Context

The language layer needs to render game events and messages as natural prose. Currently, `getMessage()` does simple `{placeholder}` string substitution, but this is insufficient for:

1. **Lists with articles**: "a sword, a key, and a map"
2. **Proper article selection**: "a sword" vs "an apple" vs "the sword"
3. **Proper nouns**: "Chicago" (no article) vs "a city"
4. **Mass nouns**: "some water" (not "a water")
5. **Pluralization**: "1 coin" vs "5 coins"
6. **First mention vs subsequent**: "a sword" → later "the sword"

This is a prerequisite for ADR-094 (Event Chaining), which needs to render events like `if.event.revealed` as "Inside the chest you see a brass lantern and a sword."

## Decision Drivers

1. **Language layer separation** - All text formatting must happen in lang-{locale}, not in engine/stdlib
2. **Author ergonomics** - Templates should be readable and writable by story authors
3. **Extensibility** - Stories can register custom templates and formatters
4. **I18n ready** - Pattern must work for non-English languages with different grammar rules

## Decision

**Modifier Prefix Syntax** with colon separators for formatters.

Format: `{modifier:modifier:...:placeholder}`

```
"Inside the {container} you see {a:items:list}."
"{You:cap} {take} {the:item}."
```

Rationale:
- Reads left-to-right in application order
- Familiar syntax (similar to Python format specs)
- Clear separation between modifiers and placeholder name
- `{a:item}` reads naturally as "a item" → "a sword"

### Relationship to ADR-091 (Text Decorations)

**Formatters transform, decorations annotate.**

| Syntax | Purpose | ADR |
|--------|---------|-----|
| `{formatter:placeholder}` | Transform values | ADR-095 (this) |
| `[type:content]` | Semantic decoration | ADR-091 |
| `*text*` / `**text**` | Emphasis decoration | ADR-091 |

Formatters and decorations can combine:

```
"You take [item:{the:item}]."
// 1. {the:item} → "the sword" (formatter)
// 2. [item:...] → decoration wrapper (annotation)
```

## Noun Types

Entities need metadata about their noun type to enable proper article selection:

| Type | Description | Examples | Indefinite | Definite |
|------|-------------|----------|------------|----------|
| `common` | Regular countable nouns | sword, apple, chest | a/an | the |
| `proper` | Names, places | Bob, Chicago, Excalibur | (none) | (none) |
| `mass` | Uncountable substances | water, sand, gold | some | the |
| `unique` | One-of-a-kind things | sun, moon, sky | (none) | the |
| `plural` | Always plural | scissors, pants | (none) | the |

### Entity Definition

```typescript
// In world-model IdentityTrait
interface IdentityTrait {
  name: string;
  nounType?: 'common' | 'proper' | 'mass' | 'unique' | 'plural';
  // For common nouns, first letter determines a/an automatically
  // Stories can override with explicit article if needed
  article?: string;  // Override: "an" for "an heir" (silent h)
}
```

Default is `common` if not specified.

## Built-in Formatters

| Formatter | Description | Example |
|-----------|-------------|---------|
| `a` | Indefinite article | `{a:item}` → "a sword" / "an apple" |
| `the` | Definite article | `{the:item}` → "the sword" |
| `some` | Mass noun article | `{some:item}` → "some water" |
| `list` | Join with ", " and "and" | `{items:list}` → "x, y, and z" |
| `or-list` | Join with ", " and "or" | `{items:or-list}` → "x, y, or z" |
| `cap` | Capitalize first letter | `{name:cap}` → "Sword" |
| `upper` | All uppercase | `{name:upper}` → "SWORD" |
| `plural` | Pluralize noun | `{item:plural}` → "swords" |
| `count` | Number + noun | `{items:count}` → "3 swords" |

### Formatter Chaining

Formatters apply left-to-right:

```
{a:items:list}
  1. items = [{name: 'sword'}, {name: 'apple'}]
  2. a: → ['a sword', 'an apple']
  3. list: → 'a sword and an apple'

{the:items:list:cap}
  1. items = [{name: 'sword'}, {name: 'key'}]
  2. the: → ['the sword', 'the key']
  3. list: → 'the sword and the key'
  4. cap: → 'The sword and the key'
```

### Respecting Noun Types

The `a` and `the` formatters check noun type:

```typescript
// For common nouns
{a:item} where item.nounType === 'common'
→ "a sword" / "an apple"

// For proper nouns - no article
{a:item} where item.nounType === 'proper'
→ "Excalibur"

// For mass nouns
{a:item} where item.nounType === 'mass'
→ "some water"

// For unique nouns
{a:item} where item.nounType === 'unique'
→ "the sun"  // unique always uses 'the'
```

## Template API

### Template Registration

```typescript
// In lang-en-us
languageProvider.registerTemplate('stdlib.revealed',
  'Inside the {container} you see {a:items:list}.'
);

languageProvider.registerTemplate('stdlib.taking.taken',
  '{You:cap} {take} {the:item}.'
);

// Conditional templates based on count
languageProvider.registerTemplate('stdlib.revealed', {
  zero: 'The {container} is empty.',
  one: 'Inside the {container} you see {a:item}.',
  other: 'Inside the {container} you see {a:items:list}.'
});
```

### Template Resolution

```typescript
const text = languageProvider.formatMessage('stdlib.revealed', {
  container: 'wooden chest',
  items: [
    { name: 'brass lantern', nounType: 'common' },
    { name: 'sword', nounType: 'common' },
    { name: 'Excalibur', nounType: 'proper' }
  ]
});
// → "Inside the wooden chest you see a brass lantern, a sword, and Excalibur."
```

### Custom Formatters

Stories can register custom formatters:

```typescript
languageProvider.registerFormatter('glowing', (value, context) => {
  return `glowing ${value}`;
});

// Template
'{item:glowing}'
// → "glowing sword"
```

## Standard Templates

Stdlib registers default templates in lang-en-us. See ADR-096 for how these map to TextBlocks.

### Action Templates

```typescript
// Taking
'if.action.taking.taken': 'Taken.'
'if.action.taking.taken.verbose': '{You:cap} {take} {the:item}.'

// Opening
'if.action.opening.opened': '{You:cap} {open} {the:item}.'

// Looking
'if.action.looking.dark': 'It is pitch dark. You are likely to be eaten by a grue.'
```

### Event Templates

```typescript
// Revealed (ADR-094 chain event)
'if.event.revealed': {
  zero: '',
  one: 'Inside the {container} you see {a:item}.',
  other: 'Inside the {container} you see {a:items:list}.'
}
```

### Error Templates

```typescript
'stdlib.error.not_here': '{You:cap} can\'t see any such thing.'
'stdlib.error.ambiguous': 'Which do you mean, {items:or-list}?'
```

## Integration with ADR-089

### Perspective Placeholders

From ADR-089, these resolve based on NarrativeSettings:

| Placeholder | 2nd Person | 1st Person | 3rd Person (she/her) |
|-------------|------------|------------|---------------------|
| `{You}` | You | I | She |
| `{your}` | your | my | her |
| `{take}` | take | take | takes |
| `{have}` | have | have | has |
| `{are}` | are | am | is |

## Output Model

Templates produce text that is parsed into structured `ITextBlock` output (see ADR-096).

**Key flow**:
1. Template contains `{formatters}` and `[decorations]`
2. Formatters are resolved first (value transformations)
3. Decoration markers remain in text
4. Text service parses decorations into `IDecoration` tree
5. Output is `ITextBlock[]` with structured content

```typescript
// Template
'You take [item:{the:item}].'

// After formatter resolution
'You take [item:the sword].'

// After decoration parsing → ITextBlock
{
  key: 'action.result',
  content: [
    'You take ',
    { type: 'item', content: ['the sword'] },
    '.'
  ]
}
```

See ADR-096 for full TextBlock specification.

## Related ADRs

| ADR | Topic | Relationship |
|-----|-------|--------------|
| **ADR-089** | Pronoun and Identity System | Foundation - noun types, perspective placeholders |
| **ADR-091** | Text Decorations | Sibling - decoration syntax `[type:content]`, `*emphasis*` |
| **ADR-094** | Event Chaining | Consumer - needs templates to render revealed events |
| **ADR-095** | Message Templates (this) | Core - formatter syntax `{formatter:placeholder}` |
| **ADR-096** | Text Service | Consumer - uses templates to produce TextBlocks |
| **ADR-097** | React Client | Consumer - renders TextBlocks |

## References

- ADR-089: Pronoun and Identity System (noun types, perspective placeholders)
- ADR-091: Text Decorations (decoration syntax)
- ADR-094: Event Chaining (depends on this for revealed event rendering)
- FyreVM Channel I/O (2009) - inspiration for structured output model
- Inform 7's article handling for prior art

# ADR-095: Message Templates with Formatters

## Status: Draft

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
// In world-model
interface IdentityTrait {
  name: string;
  nounType?: 'common' | 'proper' | 'mass' | 'unique' | 'plural';
  // For common nouns, first letter determines a/an automatically
  // Stories can override with explicit article if needed
  article?: string;  // Override: "an" for "an heir" (silent h)
}
```

Default is `common` if not specified.

## Template Syntax

### Option A: Modifier Prefixes

```
"Inside the {container} you see {a:items:list}."
"You take {the:item}."
"{Name} is here."  // Capitalized
```

Format: `{modifier:modifier:...:placeholder}`

Modifiers:
- `a` / `an` - indefinite article (auto-selects a/an)
- `the` - definite article
- `some` - for mass nouns
- `list` - format array with commas and "and"
- `List` - capitalized list
- `cap` - capitalize first letter

### Option B: Pipe Formatters

```
"Inside the {container} you see {items|a|list}."
"You take {item|the}."
"{name|cap} is here."
```

Format: `{placeholder|formatter|formatter}`

### Option C: Named Format Strings

```
"Inside the {container} you see {items:indefinite-list}."
"You take {item:definite}."
"{name:capitalized} is here."
```

Predefined format names that combine operations.

## Decision

**Option A: Modifier Prefixes** with colon separators.

Rationale:
- Reads left-to-right in application order
- Familiar syntax (similar to Python format specs)
- Clear separation between modifiers and placeholder name
- `{a:item}` reads naturally as "a item" → "a sword"

## Proposed API

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
// In text service or wherever messages are resolved
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

### Built-in Formatters

| Formatter | Description | Example |
|-----------|-------------|---------|
| `a` | Indefinite article | `{a:item}` → "a sword" / "an apple" |
| `the` | Definite article | `{the:item}` → "the sword" |
| `some` | Mass noun article | `{some:item}` → "some water" |
| `list` | Join with ", " and "and" | `{items:list}` → "x, y, and z" |
| `or-list` | Join with ", " and "or" | `{items:or-list}` → "x, y, or z" |
| `cap` | Capitalize first letter | `{name:cap}` → "Sword" |
| `Cap` | Capitalize (alias) | Same as `cap` |
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

### Definite Article Logic

The `the` formatter also respects noun type:

```typescript
{the:item} where item.nounType === 'proper'
→ "Chicago"  // no article for proper nouns

{the:item} where item.nounType === 'common'
→ "the sword"
```

## Implementation

### Phase 1: Core Formatter System

1. Add `nounType` to IdentityTrait in world-model
2. Create formatter registry in lang-en-us
3. Implement `formatMessage()` with modifier parsing
4. Implement core formatters: `a`, `the`, `list`, `cap`

### Phase 2: Conditional Templates

1. Support object templates with `zero`, `one`, `other` variants
2. Count detection based on array length or explicit count param

### Phase 3: Integration

1. Migrate existing messages to new template format
2. Update text service to use `formatMessage()`
3. Add revealed event template for ADR-094

## Examples

### Revealed Event (ADR-094)

```typescript
// Registration in lang-en-us
registerTemplate('if.event.revealed', {
  zero: 'The {container} is empty.',
  one: 'Inside the {container} you see {a:item}.',
  other: 'Inside the {container} you see {a:items:list}.'
});

// Usage
formatMessage('if.event.revealed', {
  container: 'chest',
  items: [
    { name: 'brass lantern', nounType: 'common' },
    { name: 'sword', nounType: 'common' }
  ]
});
// → "Inside the chest you see a brass lantern and a sword."
```

### Taking Action

```typescript
registerTemplate('if.action.taking.taken', '{You:cap} {take} {the:item}.');

formatMessage('if.action.taking.taken', {
  item: { name: 'brass lantern', nounType: 'common' }
});
// → "You take the brass lantern."
```

### Room Contents

```typescript
registerTemplate('stdlib.room.contents', {
  zero: '',
  one: '{a:item:cap} is here.',
  other: '{You:cap} can see {a:items:list} here.'
});

formatMessage('stdlib.room.contents', {
  items: [
    { name: 'table', nounType: 'common' },
    { name: 'Bob', nounType: 'proper' }
  ]
});
// → "You can see a table and Bob here."
```

## Custom Formatters

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

Stdlib registers a suite of default templates in lang-en-us. These cover common IF interactions and can be overridden by stories.

### Entity Identity Templates

From ADR-089, entities carry identity metadata. Templates use this for proper rendering:

```typescript
// Object descriptions in room
'stdlib.entity.here.singular': '{a:item:cap} is here.'
'stdlib.entity.here.plural': '{a:items:list:cap} are here.'
'stdlib.entity.here.proper': '{item} is here.'

// Container contents
'stdlib.container.contents': 'The {container} contains {a:items:list}.'
'stdlib.container.empty': 'The {container} is empty.'
'stdlib.container.on': 'On the {supporter} {is} {a:items:list}.'

// NPC presence
'stdlib.npc.here': '{name} is here.'
'stdlib.npc.here.brief': '{name} ({brief}) is here.'
```

### Action Templates

Standard action messages using perspective placeholders from ADR-089:

```typescript
// Taking
'if.action.taking.taken': 'Taken.'
'if.action.taking.taken.verbose': '{You:cap} {take} {the:item}.'
'if.action.taking.already': '{You:cap} already {have} that.'
'if.action.taking.fixed': 'That's fixed in place.'

// Dropping
'if.action.dropping.dropped': 'Dropped.'
'if.action.dropping.dropped.verbose': '{You:cap} {drop} {the:item}.'
'if.action.dropping.not_held': '{You:cap} {aren't} holding that.'

// Opening/Closing
'if.action.opening.opened': '{You:cap} {open} {the:item}.'
'if.action.opening.locked': 'It seems to be locked.'
'if.action.opening.already': 'It's already open.'
'if.action.closing.closed': '{You:cap} {close} {the:item}.'

// Looking/Examining
'if.action.looking.dark': 'It is pitch dark. You are likely to be eaten by a grue.'
'if.action.examining.default': '{You:cap} see nothing special about {the:item}.'

// Movement
'if.action.going.blocked': '{You:cap} can't go that way.'
'if.action.going.door.closed': 'The {door} is closed.'

// Giving/Showing
'if.action.giving.given': '{You:cap} {give} {the:item} to {the:recipient}.'
'if.action.showing.shown': '{You:cap} {show} {the:item} to {the:recipient}.'
```

### Event Templates

For semantic events rendered by text service:

```typescript
// Revealed (ADR-094 chain event)
'if.event.revealed': {
  zero: '',  // Empty container - no message (opening message suffices)
  one: 'Inside the {container} you see {a:item}.',
  other: 'Inside the {container} you see {a:items:list}.'
}

// Score changes
'if.event.score.increased': '[Your score has just gone up by {points} {points:plural:point}.]'

// NPC actions
'if.event.npc.arrives': '{name:cap} arrives from the {direction}.'
'if.event.npc.leaves': '{name:cap} leaves to the {direction}.'
'if.event.npc.takes': '{name:cap} takes {the:item}.'
```

### Error Templates

Standard error/failure messages:

```typescript
'stdlib.error.not_here': '{You:cap} can't see any such thing.'
'stdlib.error.ambiguous': 'Which do you mean, {items:or-list}?'
'stdlib.error.cant_do': '{You:cap} can't do that.'
'stdlib.error.not_holding': '{You:cap} {aren't} holding that.'
'stdlib.error.not_openable': 'That's not something {you} can open.'
'stdlib.error.not_container': 'That's not a container.'
'stdlib.error.locked': 'It seems to be locked.'
```

## Story Form Templates

Different story forms may use different template suites. The base suite works for traditional parser IF, but stories can register alternatives.

### Parser IF (Default)

Traditional Zork-style messages with terse confirmations:

```typescript
'if.action.taking.taken': 'Taken.'
'if.action.dropping.dropped': 'Dropped.'
```

### Verbose Parser IF

More descriptive responses:

```typescript
'if.action.taking.taken': '{You:cap} pick up {the:item}.'
'if.action.dropping.dropped': '{You:cap} set down {the:item}.'
```

### Story Configuration

Stories specify their preferred form:

```typescript
// In story config
export const storyConfig: StoryConfig = {
  id: 'my-story',
  title: 'My Story',

  // Template form - affects which stdlib templates are registered
  templateForm: 'verbose',  // or 'terse' (default), 'custom'
};
```

## Integration with ADR-089

ADR-089 defines the identity and pronoun system. This ADR builds on it:

### From IdentityTrait

```typescript
interface IdentityTrait {
  name: string;
  nounType?: 'common' | 'proper' | 'mass' | 'unique' | 'plural';
  grammaticalNumber?: 'singular' | 'plural';
  article?: string;  // Override for edge cases
}
```

### From ActorTrait

For NPCs, pronouns come from ActorTrait:

```typescript
// Template with pronoun placeholder
'{name:cap} picks up {possessiveAdj} sword.'
// → "Alice picks up her sword."
// → "Sam picks up their sword."
```

### Perspective Placeholders

From ADR-089, these resolve based on NarrativeSettings:

| Placeholder | 1st Person | 2nd Person | 3rd Person (she/her) |
|-------------|------------|------------|---------------------|
| `{You}` | I | You | She |
| `{you}` | i | you | she |
| `{Your}` | My | Your | Her |
| `{your}` | my | your | her |
| `{Yourself}` | Myself | Yourself | Herself |
| `{take}` | take | take | takes |
| `{have}` | have | have | has |
| `{are}` | am | are | is |

## Text Service Output Model

**Key insight**: The text service doesn't produce final prose - it produces structured output that clients render.

### Structured Output

```typescript
// Text service returns structured blocks
interface TextBlock {
  key: string;      // Semantic identifier
  text: string;     // Resolved template text
  priority?: number; // Ordering hint
}

// Example turn output
[
  { key: 'room.name', text: 'Dark Cave' },
  { key: 'room.description', text: 'You are in a dark cave.' },
  { key: 'room.contents', text: 'You can see a torch and a rusty key here.' },
  { key: 'action.result', text: 'Taken.' }
]
```

### Client Rendering

Different clients render these blocks according to their capabilities:

| Client | Rendering |
|--------|-----------|
| **Web** | Separate divs, CSS classes for styling |
| **CLI** | Newlines between blocks, possible indentation |
| **GLK** | Standard IF window system, styled text |
| **Screen reader** | Pacing, emphasis, navigation |

### Author Control

Authors control the semantic structure:

1. **Which blocks exist** - embedded contents in description vs separate block
2. **Block content** - templates with formatters
3. **Intra-block composition** - how phrases join within a block (punctuation)

Clients control presentation:
- Whitespace between blocks
- Typography and styling
- Layout and flow

### Composition Within Blocks

Authors can compose phrases into sentences within a single block:

```typescript
// Phrase composition
'room.full': '{description:sentence} {contents:sentence}'

// With conditional joining
'action.open': '{You:cap} {open} {the:item}{revealed:comma-phrase}.'
// → "You open the chest, revealing a key."
// → "You open the chest." (if empty)
```

Composition modifiers:
- `sentence` - capitalize, ensure period
- `phrase` - lowercase, no terminal punctuation
- `comma-phrase` - prefix with ", " if non-empty

### Open for Discussion

This output model needs further design:
- Exact structure of TextBlock
- Standard block keys
- How clients negotiate capabilities
- GLK compatibility layer

## Open Questions

1. How to handle "first mention" vs "subsequent mention" (a → the)?
2. Should formatters have access to world state for context-sensitive rendering?
3. How to handle gendered pronouns for NPCs in templates?
4. Should we support nested placeholders?
5. How does story form affect template registration timing?
6. What's the exact TextBlock structure for client rendering?
7. How do we handle client capability negotiation?

## Related ADRs

This ADR is part of a larger text rendering architecture:

| ADR | Topic | Relationship |
|-----|-------|--------------|
| **ADR-089** | Pronoun and Identity System | Foundation - noun types, perspective placeholders |
| **ADR-094** | Event Chaining | Consumer - needs templates to render revealed events |
| **ADR-095** | Message Templates (this) | Core - template registration and formatting |
| **ADR-096** | Text Service | Consumer - uses templates to produce TextBlocks |
| **ADR-097** | Web/React Client | Consumer - renders TextBlocks as HTML/React |
| **ADR-098** | CLI Client | Consumer - renders TextBlocks as terminal text |
| **ADR-099** | GLK Client | Consumer - renders TextBlocks via GLK API |
| **ADR-100** | Screen Reader (JAWS) | Consumer - renders TextBlocks with accessibility |

### Design Constraints from Future ADRs

**ADR-096 (Text Service)** will define:
- How events map to template lookups
- TextBlock structure and standard keys
- Ordering and grouping of blocks
- Context passed to template resolution

**ADR-097-100 (Clients)** will define:
- How TextBlocks render in each environment
- Client capability negotiation
- Styling and formatting options
- Interactive elements (if any)

This ADR must ensure templates produce output that all clients can consume meaningfully.

### Client-Agnostic Requirements

Templates should not assume:
- Specific whitespace or line breaks (client decides)
- Color or styling (client capability)
- Fixed-width fonts (varies by client)
- Visual layout (screen readers are linear)

Templates should provide:
- Semantic block keys for styling hooks
- Clean text that works in all contexts
- Enough structure for clients to make good decisions

## References

- ADR-089: Pronoun and Identity System (noun types, perspective placeholders)
- ADR-094: Event Chaining (depends on this for revealed event rendering)
- Inform 7's article handling for prior art
- GLK specification: https://www.eblong.com/zarf/glk/

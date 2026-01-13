# ADR-091: Text Decorations in Message Templates

## Status: ACCEPTED

## Date: 2026-01-06 (Proposed), 2026-01-13 (Accepted)

## Context

Message templates in the language layer need to support text decorations for rich output. Currently, templates use simple `{param}` substitution, but authors need:

1. **Semantic formatting**: emphasis, strong emphasis, item names, room names
2. **Capitalization**: sentence-start capitalization of interpolated values
3. **Client-agnostic markup**: decoration intent that renders appropriately per client

### Current State

Templates support:
- `{param}` - simple substitution
- `{You}`, `{your}`, etc. - perspective placeholders (ADR-089)
- `{verb}` - verb conjugation

An attempt was made to use `{target:cap}` for capitalization, but this was never implemented and showed literally in output.

### Requirements

1. **Author control**: Authors specify decoration intent in templates
2. **Client rendering**: CLI renders as ANSI, web as HTML/CSS, screen readers as semantic cues
3. **Graceful degradation**: Plain text fallback when decorations unsupported
4. **No collision**: Decoration syntax must not conflict with existing `{param}` substitution
5. **Extensibility**: Authors can define story-specific decoration types (e.g., Photopia colors)

### Use Cases

```
// Emphasis on important words
"You *can't* go that direction."

// Item/room names distinguished
"You take the [item:brass lantern]."

// Combined: decoration wrapping a placeholder
"You take [item:{the:item}]."

// Story-defined colors (Photopia pattern)
"[photopia.red:The light was red, like always.]"
```

## Decision

**Option D: Hybrid Approach** - Use distinct syntaxes for distinct purposes.

### Syntax Specification

| Syntax | Purpose | Example |
|--------|---------|---------|
| `{formatter:placeholder}` | Transformations | `{a:item}` → "a sword" |
| `[type:content]` | Semantic decorations | `[item:sword]` |
| `*text*` | Emphasis | `*brightly*` |
| `**text**` | Strong emphasis | `**WARNING**` |

### Key Design Principles

1. **Formatters transform, decorations annotate** - Different operations, different syntax
2. **Decoration types are open strings** - Not an enum, supports story extensions
3. **Decorations can wrap placeholders** - `[item:{a:item}]` resolves then decorates
4. **Client-agnostic** - Templates specify intent, clients decide rendering

### Decoration Types

#### Core Types (Platform-defined)

| Type | Purpose | CLI Rendering | Web Rendering |
|------|---------|---------------|---------------|
| `em` | Emphasis | ANSI italic | `<em>` |
| `strong` | Strong emphasis | ANSI bold | `<strong>` |
| `item` | Item name | ANSI cyan | `<span class="item">` |
| `room` | Room name | ANSI yellow | `<span class="room">` |
| `npc` | Character name | ANSI magenta | `<span class="npc">` |
| `command` | Suggested command | ANSI green | `<span class="command">` |
| `direction` | Exit direction | ANSI white | `<span class="direction">` |

#### Presentational Types

| Type | Purpose |
|------|---------|
| `underline` | Underlined text |
| `strikethrough` | Struck-through text |
| `super` | Superscript |
| `sub` | Subscript |

#### Story-defined Types (Photopia Pattern)

Authors define custom decoration types in story configuration:

```typescript
// stories/photopia/src/config.ts
export const storyColors = {
  'photopia.red': '#cc0000',     // Alley's scenes
  'photopia.blue': '#0066cc',    // Fantasy scenes
  'photopia.purple': '#660099',  // Transition
  'photopia.gold': '#ccaa00',    // Memory
};
```

Templates use story-defined types:

```
'[photopia.red:The light was red, like always.]'
```

Clients look up the mapping and render appropriately:
- Web: CSS color
- CLI: ANSI approximation
- Screen reader: Announces "red text" or ignores

### Examples

```
// Simple emphasis
'You *cannot* do that.'

// Semantic item decoration
'You take the [item:brass lantern].'

// Decoration wrapping placeholder with formatter
'Inside the chest you see [item:{a:items:list}].'

// Story-defined color
'[photopia.blue:You are flying through clouds.]'

// Nested decorations
'[item:*glowing* lantern]'

// Multiple decorations
'The [npc:thief] takes the [item:jeweled egg] and runs [direction:north].'
```

## Implementation

### Data Structure

Decorations are parsed into a structured tree (see ADR-096):

```typescript
interface IDecoration {
  type: string;              // Open - 'em', 'item', 'photopia.red'
  content: TextContent[];    // Can nest
}

type TextContent = string | IDecoration;
```

### Processing Pipeline

1. **Template definition** (lang-en-us): Author writes decorated templates
2. **Placeholder resolution** (LanguageProvider): Substitutes `{params}`, preserves decoration markers
3. **Decoration parsing** (TextService): Converts markers to `IDecoration` tree
4. **Client rendering**: Maps decoration types to platform-specific output

### Escaping

To include literal `*`, `[`, or `]` in output:

```
'The price is \*50 gold\*.'     → "The price is *50 gold*."
'Use \[brackets\] carefully.'   → "Use [brackets] carefully."
```

### Edge Cases

| Case | Handling |
|------|----------|
| Unclosed `*` | Treat as literal asterisk |
| Unclosed `[` | Treat as literal bracket |
| Unknown decoration type | Render content without decoration |
| Empty decoration `[item:]` | Render nothing |

## Consequences

### Positive

- Clear separation: formatters transform, decorations annotate
- Extensible: stories can define custom decoration types
- Client-agnostic: same templates work for CLI, web, screen reader
- Familiar: Markdown-style `*emphasis*` is intuitive

### Negative

- Three syntaxes to learn (`{}`, `[]`, `*`)
- Escaping needed for literal brackets/asterisks
- More complex parsing than plain templates

### Neutral

- Requires text service refactoring to support decoration parsing
- Clients need decoration type → rendering mappings

## References

- ADR-089: Pronoun and Identity System (perspective placeholders)
- ADR-095: Message Templates with Formatters (placeholder syntax)
- ADR-096: Text Service Architecture (parsing, TextBlocks)
- FyreVM Channel I/O (2009) - inspiration for semantic output model

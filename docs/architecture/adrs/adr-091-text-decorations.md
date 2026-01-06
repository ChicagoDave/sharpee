# ADR-091: Text Decorations in Message Templates

## Status: PROPOSED

## Date: 2026-01-06

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

### Use Cases

```
// Emphasis on important words
"You can't go that direction."  →  "You *can't* go that direction."

// Item/room names distinguished
"You take the brass lantern."  →  "You take the [item:brass lantern]."

// Capitalization at sentence start
"{target} is locked."  →  "[cap:{target}] is locked."  →  "The door is locked."

// Combined
"The {item} glows brightly."  →  "The [item:{item}] glows *brightly*."
```

## Options Considered

### Option A: Markdown-style Inline

Use familiar Markdown syntax:

```
*emphasis* **strong** `code/item` _underline_
```

**Pros**: Familiar, readable, well-understood
**Cons**: Conflicts with prose ("I can't *believe* it"), ambiguous asterisks

### Option B: Custom Tag Syntax

Use square brackets with type prefixes:

```
[em:text] [strong:text] [item:name] [room:name] [cap:text]
```

**Pros**: Unambiguous, extensible, semantic
**Cons**: Verbose, less readable in templates

### Option C: Modifier Syntax on Placeholders

Extend `{param}` with modifiers:

```
{target:cap} {item:em} {room:strong}
```

**Pros**: Compact, extends existing syntax
**Cons**: Only works on placeholders, not literal text

### Option D: Hybrid Approach

- Markdown for inline prose decorations (`*emphasis*`, `**strong**`)
- Modifiers for placeholder transformations (`{target:cap}`)
- Semantic tags for special types (`[item:brass lantern]`)

## Decision

TBD - Awaiting discussion.

## Considerations

### Client Rendering

| Decoration | CLI (ANSI) | Web (HTML) | Plain Text |
|------------|------------|------------|------------|
| emphasis | italic | `<em>` | *text* |
| strong | bold | `<strong>` | **text** |
| item | cyan | `<span class="item">` | text |
| room | yellow | `<span class="room">` | text |
| cap | capitalize | capitalize | capitalize |

### Implementation Layers

1. **Template definition** (lang-en-us): Author writes decorated templates
2. **Message resolution** (LanguageProvider): Substitutes params, preserves decoration markers
3. **Text service**: Converts decoration markers to client-specific format
4. **Client rendering**: Displays formatted output

### Edge Cases

- Nested decorations: `[item:*glowing* lantern]`
- Decorations spanning placeholders: `*the {item}*`
- Escaping: How to show literal `*` or `[`

## References

- ADR-089: Pronoun and Identity System (perspective placeholders)
- lang-en-us message templates
- Text service architecture

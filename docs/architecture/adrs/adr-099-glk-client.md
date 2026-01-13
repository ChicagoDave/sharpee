# ADR-099: GLK Client

## Status: IDENTIFIED

## Date: 2026-01-13

## Context

GLK (Generic Library for Interactive Fiction) is a standard I/O API used by many IF interpreters. Supporting GLK would allow Sharpee games to run in traditional IF environments like:

- Gargoyle
- Lectrote
- Spatterlight
- Various Glulx interpreters

## Scope

This ADR acknowledges GLK support as a future goal but does not design the implementation.

## Key Considerations

### GLK Concepts

- **Windows**: GLK uses a windowing system (main, status, graphics)
- **Styles**: Predefined text styles (normal, emphasized, preformatted, etc.)
- **Input**: Line input, character input, mouse input
- **Sound**: Optional sound channel support
- **Graphics**: Optional graphics window support

### Mapping from TextBlocks

| TextBlock Key | GLK Target |
|---------------|------------|
| `status.*` | Status window |
| `room.*`, `action.*` | Main window |
| `prompt` | Input prompt |

### Decoration Mapping

| Decoration Type | GLK Style |
|-----------------|-----------|
| `em` | style_Emphasized |
| `strong` | style_Header (or bold hint) |
| `item`, `room`, `npc` | Custom styles via stylehints |

### Open Questions

1. How to handle story-defined colors in GLK's limited style system?
2. Should we target Glk or GlkOte (web-based GLK)?
3. How does windowing map to our single-stream model?
4. What's the minimum GLK version to target?

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-096 | Defines ITextBlock this client consumes |
| ADR-091 | Defines decoration types to map to GLK styles |

## References

- GLK Specification: https://www.eblong.com/zarf/glk/
- GlkOte: https://github.com/erkyrath/glkote
- Quixe (Glulx interpreter): https://github.com/erkyrath/quixe

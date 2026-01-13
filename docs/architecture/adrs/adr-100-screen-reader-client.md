# ADR-100: Screen Reader Client (Accessibility)

## Status: IDENTIFIED

## Date: 2026-01-13

## Context

Interactive Fiction has a strong tradition of accessibility for blind players - text-based games are inherently more accessible than graphical ones. Sharpee should make it easy for authors to create games that work well with screen readers like:

- JAWS (Windows)
- NVDA (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)
- Orca (Linux)

This is a priority, not an afterthought.

## Scope

This ADR acknowledges screen reader support as a priority goal but does not design the full implementation.

## Key Considerations

### Accessibility Principles

1. **Semantic structure** - Output should have clear, navigable structure
2. **Announcements** - New content should be announced appropriately
3. **No visual-only info** - Colors, styling should have text alternatives
4. **Keyboard navigation** - Full keyboard support
5. **Linear flow** - Screen readers process content linearly

### TextBlock Advantages

Our `ITextBlock` architecture supports accessibility:

- **Semantic keys** allow screen readers to announce context ("Room: West of House")
- **Structured content** provides clear boundaries between blocks
- **Decoration types** can map to speech emphasis or announcements

### Decoration Handling

| Decoration Type | Screen Reader Handling |
|-----------------|----------------------|
| `em` | Speech emphasis (prosody) |
| `strong` | Stronger emphasis |
| `item` | "Item: sword" or just "sword" |
| `room` | "Location: West of House" |
| Story colors | Announce "red text" or ignore |

### ARIA Integration

React client (ADR-097) should use ARIA:

```html
<div role="log" aria-live="polite">
  <!-- New content announced -->
</div>

<div role="status" aria-live="polite">
  <!-- Status bar changes announced -->
</div>
```

### Open Questions

1. Should decoration types be announced? ("Item: brass lantern" vs "brass lantern")
2. How to handle story colors? Announce or ignore?
3. Should there be a dedicated "screen reader mode" with different output?
4. How to handle spatial puzzles that assume visual mapping?
5. What's the testing strategy for screen reader compatibility?

## Author Guidance

Authors should:

1. Avoid puzzles that require color perception without text alternatives
2. Provide text descriptions for any spatial relationships
3. Test with actual screen readers (not just ARIA validators)
4. Use semantic decoration types rather than presentational ones

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-096 | Defines ITextBlock with semantic keys |
| ADR-097 | React client implements ARIA support |
| ADR-091 | Decoration types need accessible mapping |

## References

- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- WebAIM Screen Reader Survey: https://webaim.org/projects/screenreadersurvey/
- IF accessibility discussions in the community

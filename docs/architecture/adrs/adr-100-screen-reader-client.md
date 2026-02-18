# ADR-100: Screen Reader Accessibility

## Status: ACCEPTED

## Date: 2026-01-13 (identified), 2026-02-18 (accepted with implementation plan)

## Context

Interactive Fiction has a strong tradition of accessibility for blind players - text-based games are inherently more accessible than graphical ones. Sharpee should make it easy for authors to create games that work well with screen readers like:

- JAWS (Windows)
- NVDA (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)
- Orca (Linux)

This is a priority, not an afterthought.

## Current State (February 2026 Audit)

### Platform Foundations (Good)

The `ITextBlock` architecture provides strong accessibility foundations:

- **Semantic keys** on every text block (room descriptions, inventory, errors, etc.)
- **Structured content** with clear boundaries between blocks
- **Decoration types** (`em`, `strong`, `item`, `room`) that can map to ARIA semantics
- **Illustration alt text** passed through from story data to `<img alt="">`

### Zifmia Client (Critical Gaps)

The Zifmia React client is the primary web client. An audit of all components found:

**What exists:**
- 3 dialogs (Save, Restore, Restart) have `role="dialog"` + `aria-label`
- Illustrations render with `alt` text
- Basic keyboard support: command history (Up/Down), Escape to close dialogs, Enter to submit
- `tabIndex={0}` on save/restore slot list items

**What's missing:**

| Component | File | Gap |
|-----------|------|-----|
| Transcript output | `Transcript.tsx` | No `role="log"`, no `aria-live` — new game text never announced |
| Command input | `CommandInput.tsx` | No `<label>` or `aria-label` — input purpose unknown to screen readers |
| Status line | `StatusLine.tsx` | No `role="status"`, no `aria-live` — score/turn changes silent |
| Menu bar | `MenuBar.tsx` | Custom `<div>` menu items, no `aria-haspopup`, `aria-expanded`, or menu roles |
| Dialogs | SaveDialog/RestoreDialog | Missing `aria-modal="true"`, no focus trap |
| Layout | All components | No semantic HTML5 (`<main>`, `<nav>`, `<header>`) — everything is `<div>` |

**Severity: The core game loop (read output, type command) is invisible to screen readers.**

### Platform-Browser Client

The vanilla browser client (`packages/platform-browser/`) has the same gaps — no ARIA attributes on the transcript area, input, or status line.

## Decision

Accessibility will be implemented in the Zifmia client first (it's the primary web client), then backported to platform-browser. The work is divided into three tiers by impact.

## Implementation Plan

### Tier 1: Core Game Loop (High Impact, Low Effort)

These fixes make the fundamental play experience work with screen readers.

**1. Transcript live region** — `Transcript.tsx`
```tsx
<div
  className={`transcript ${className}`}
  ref={containerRef}
  role="log"
  aria-live="polite"
  aria-atomic="false"
  aria-label="Game transcript"
>
```

**2. Command input label** — `CommandInput.tsx`
```tsx
<label htmlFor="command-input" className="visually-hidden">
  Enter command
</label>
<input
  id="command-input"
  aria-label="Enter command"
  ...
/>
```

**3. Status line** — `StatusLine.tsx`
```tsx
<div
  className={`status-line ${className}`}
  role="status"
  aria-live="polite"
  aria-label="Game status"
>
```

### Tier 2: Navigation and Dialogs (Medium Impact, Medium Effort)

**4. Semantic layout** — `ZifmiaRunner.tsx` (or equivalent top-level)
- Wrap menu in `<nav aria-label="Game menu">`
- Wrap transcript + input in `<main>`
- Wrap status line in `<header>`

**5. Dialog improvements** — `SaveDialog.tsx`, `RestoreDialog.tsx`
- Add `aria-modal="true"`
- Implement focus trap (focus stays inside dialog while open)
- Add `aria-describedby` linking to dialog content
- Return focus to triggering element on close

**6. Menu bar** — `MenuBar.tsx`
- Add `aria-haspopup="menu"` and `aria-expanded` to menu buttons
- Add `role="menu"` on dropdown containers
- Add `role="menuitem"` on items (replace `<div>` click handlers)
- Add keyboard navigation: arrow keys between items, Escape to close

### Tier 3: Polish (Lower Impact)

**7. Decorative elements** — Add `aria-hidden="true"` to prompt symbols (`>`), separators, borders

**8. Visible focus indicators** — Ensure custom CSS includes `:focus-visible` styles on all interactive elements

**9. Visually-hidden utility class** — Add to theme CSS:
```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## Resolved Questions

Questions from the original ADR, now answered:

1. **Should decoration types be announced?** No. Decorations map to visual emphasis only. Screen readers handle `<em>` and `<strong>` natively via prosody. Item/room decorations render as styled `<span>` elements — no prefix announcements needed.

2. **How to handle story colors?** Ignore for screen readers. Colors are purely decorative in Sharpee's current usage. If a story uses color as the sole indicator of meaning, that's an author bug (see Author Guidance).

3. **Should there be a dedicated "screen reader mode"?** No. The standard client should be accessible by default. A separate mode creates a maintenance burden and risks being forgotten. ARIA attributes and semantic HTML work for all users.

4. **How to handle spatial puzzles?** Author responsibility. The platform provides text descriptions for everything. Authors must ensure puzzles don't require visual/spatial reasoning that can't be expressed in text. Dungeo's mazes use directional text ("You can go north, east, or west") which works well.

5. **Testing strategy?** Manual testing with NVDA (free, Windows) as the primary screen reader. Automated checks with axe-core or Lighthouse for regression. Real-user testing with the IF community's accessibility advocates.

## Author Guidance

Authors should:

1. Avoid puzzles that require color perception without text alternatives
2. Provide text descriptions for all spatial relationships
3. Always provide meaningful `alt` text for illustrations
4. Use semantic decoration types rather than presentational ones
5. Test with at least one screen reader (NVDA is free)

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-096 | Defines ITextBlock with semantic keys — the accessibility foundation |
| ADR-097 | React client (Zifmia) — primary target for ARIA implementation |
| ADR-091 | Decoration types map to HTML emphasis elements |
| ADR-124 | Illustrations include alt text support |

## References

- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- WebAIM Screen Reader Survey: https://webaim.org/projects/screenreadersurvey/
- NVDA Screen Reader (free): https://www.nvaccess.org/
- axe-core accessibility testing: https://github.com/dequelabs/axe-core

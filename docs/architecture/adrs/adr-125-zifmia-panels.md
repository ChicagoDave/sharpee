# ADR-125: Zifmia Panel and Windowing System

## Status: PROPOSED

## Date: 2026-01-30

## Context

### The Need

Sharpee stories may need more than a single transcript pane. Examples:

- **Status bar** — already implemented as a fixed header (room name, score, turns)
- **Sidebar panels** — map, NPC portraits, inventory, notes
- **Multi-actor transcripts** — parallel columns for different PCs (Reflections story)
- **Graphics panels** — full illustration panes, not just inline images
- **Text grid** — fixed-width character display (Zork status line formatting, ASCII art puzzles)

The Glk specification (Andrew Plotkin) defines a binary-tree split model with four window types: text buffer, text grid, graphics, and blank. Glk's model was designed for C programs rendering to native OS windows. Zifmia is a web client — we should lean into CSS/HTML layout rather than reimplementing Glk's pixel-level split tree.

### Glk Concepts Worth Keeping

| Glk Concept | Sharpee Equivalent | Notes |
|-------------|-------------------|-------|
| Text buffer window | Transcript panel (default) | Scrollable prose output |
| Text grid window | Grid panel | Fixed-width, cursor-addressable (status lines, maps) |
| Graphics window | Image panel | Rendered via `<canvas>` or `<img>` |
| Pair window | CSS layout (grid/flex) | No binary tree — CSS handles arrangement |
| Proportional sizing | CSS `fr` units / `%` | Natural in CSS Grid |
| Fixed sizing | CSS `px` / `ch` / `rem` | Natural in CSS |
| Split direction | CSS `grid-template-areas` | Named areas instead of binary splits |

### Glk Concepts We Skip

| Glk Concept | Why Skip |
|-------------|----------|
| Binary split tree | CSS Grid/Flexbox is more expressive and author-friendly |
| Key window (measurement source) | CSS handles unit conversion natively |
| Rock values (window identity) | Panel IDs serve this purpose |
| Window iteration API | React component tree handles this |
| Pixel-level redraw events | DOM handles repaints |

### Current Zifmia State

The client already has:
- CSS variables for `--sharpee-sidebar-width` (set to 50%)
- Placeholder CSS for `.game-shell__sidebar`, `.tab-panel__*`
- Prepared but unused CSS for map, notes, commentary, progress panels
- Theme system with CSS variables (4 themes)
- Event-driven state via `GameContext` reducer

## Decision

### Panel Model

Stories declare **named panels** with layout hints. The client arranges them using CSS Grid. No binary tree — authors describe what panels they want, CSS handles spatial arrangement.

```typescript
interface PanelDeclaration {
  id: string;                    // unique panel identifier
  type: 'transcript' | 'grid' | 'image' | 'status';
  region: 'main' | 'sidebar' | 'header' | 'footer';
  label?: string;                // tab label if region has multiple panels
  size?: string;                 // CSS size hint: '300px', '30%', '1fr'
  options?: Record<string, unknown>;  // type-specific (cols/rows for grid, etc.)
}
```

**Panel types:**

| Type | Renders As | Capabilities |
|------|-----------|-------------|
| `transcript` | Scrollable text buffer | Append-only prose, command input (if primary) |
| `grid` | Fixed-width character grid | Cursor-addressable, monospace |
| `image` | `<img>` or `<canvas>` | Static images or dynamic drawing |
| `status` | Fixed header/footer bar | Key-value display, compact |

### Default Layout

If the story declares no panels, Zifmia uses the current layout:

```
┌─────────────────────────────┐
│ MenuBar                     │
├─────────────────────────────┤
│ StatusLine (header)         │
├─────────────────────────────┤
│ Transcript (main)           │
│                             │
│                             │
├─────────────────────────────┤
│ CommandInput (footer)       │
└─────────────────────────────┘
```

### Sidebar Layout

When sidebar panels are declared:

```
┌─────────────────────────────────────┐
│ MenuBar                             │
├─────────────────────────────────────┤
│ StatusLine                          │
├────────────────────┬────────────────┤
│ Transcript (main)  │ Sidebar        │
│                    │ ┌────────────┐ │
│                    │ │ Map        │ │
│                    │ ├────────────┤ │
│                    │ │ Portrait   │ │
│                    │ └────────────┘ │
├────────────────────┴────────────────┤
│ CommandInput                        │
└─────────────────────────────────────┘
```

Multiple sidebar panels stack vertically or use tabs (client decides based on space).

### Multi-Actor Layout

For stories with parallel actor transcripts:

```
┌─────────────────────────────────────┐
│ MenuBar                             │
├─────────────────────────────────────┤
│ StatusLine                          │
├───────────┬───────────┬─────────────┤
│ Alice     │ Bob       │ Carol       │
│ transcript│ transcript│ transcript  │
│           │           │             │
├───────────┴───────────┴─────────────┤
│ CommandInput                        │
└─────────────────────────────────────┘
```

Each actor's `voice` annotation controls font color/styling. The `panel` annotation routes events to the correct transcript column.

### How Panels Connect to Annotations

Panels are **declared** by the story during initialization. Annotations **route content** to panels.

| Annotation Kind | Panel Connection |
|----------------|-----------------|
| `illustration` | Inline in transcript panel (ADR-124), OR routed to a dedicated `image` panel |
| `portrait` | Routed to a sidebar `image` panel |
| `voice` | Styles text within a `transcript` panel (CSS class, color) |
| `panel` | Routes an actor's events to a specific `transcript` panel |
| `map-icon` | Rendered within a sidebar map panel (future) |

The `panel` annotation on an actor entity specifies which transcript panel receives that actor's text:

```typescript
alice.annotate('panel', {
  id: 'alice-routing',
  data: { targetPanel: 'alice-transcript' },
});
```

### Story Declaration API

Stories declare panels in `initializeWorld()` or a new `initializeUI()` hook:

```typescript
initializeUI(ui: UIBuilder): void {
  // Sidebar with portrait and map
  ui.panel('npc-portrait', {
    type: 'image',
    region: 'sidebar',
    size: '200px',
  });

  ui.panel('auto-map', {
    type: 'grid',
    region: 'sidebar',
    size: '1fr',
    options: { cols: 20, rows: 15 },
  });
}
```

If no `initializeUI` is defined, the default single-transcript layout applies.

### Event Routing

Panel declarations are metadata — they don't change the engine or action system. Event routing works via:

1. Engine emits semantic events as today
2. Client's `GameContext` checks `panel` annotations on the event's actor
3. Routes the event to the correct transcript panel component
4. Falls back to the main transcript if no routing is specified

No engine or stdlib changes required for basic panel support.

### Grid Panel Operations

For text grid panels (status lines, ASCII art), the story emits grid events:

```typescript
context.event('if.event.grid.update', {
  panelId: 'status-grid',
  operations: [
    { type: 'clear' },
    { type: 'moveTo', col: 0, row: 0 },
    { type: 'print', text: 'Forest Path' },
    { type: 'moveTo', col: 60, row: 0 },
    { type: 'print', text: 'Score: 42' },
  ],
});
```

This maps to Glk's text grid window without needing Glk's C API. The client renders operations onto a `<pre>` element or grid of `<span>`s.

### Responsive Behavior

- Sidebar collapses to a bottom sheet or tabs on narrow screens (≤768px)
- Multi-actor transcripts collapse to a single tabbed transcript
- Grid panels scale font size to fit available width
- Client handles all responsive logic — stories don't need to know

## Consequences

### Positive

- **CSS-native** — leverages CSS Grid/Flexbox instead of reimplementing Glk's binary tree
- **Backwards compatible** — no panels declared = current layout unchanged
- **Annotation integration** — `panel` and `portrait` annotations route naturally to declared panels
- **Multi-actor ready** — parallel transcript panels with voice styling
- **No engine changes** — panels are client-side layout, events route via annotations

### Negative

- **Less precise than Glk** — authors can't control pixel-level split ratios (CSS Grid is close enough)
- **Client complexity** — Zifmia needs a panel layout engine (CSS Grid template generation)
- **New concept** — `initializeUI()` is a new story hook alongside `initializeWorld()` and `extendParser()`

### Neutral

- CLI clients ignore panel declarations entirely (single output stream)
- Grid panel events (`if.event.grid.update`) are a new event type but follow existing patterns
- Does not preclude a future Glk compatibility layer if someone wants to run Inform games in Zifmia

## Impact on ADR-124 (Annotations)

The annotation system as designed in ADR-124 **already supports** panel routing:

- `panel` annotation kind → routes actor text to a named panel
- `portrait` annotation kind → routes images to a sidebar panel
- `illustration` with `data.targetPanel` → routes to a specific image panel instead of inline

**No changes needed to ADR-124.** The `data: Record<string, unknown>` payload is flexible enough to carry panel routing info. The annotation condition system works for panels too (e.g., show portrait only when NPC is present).

One consideration: `emitIllustrations()` (Phase 2 of the annotation plan) should pass through any `targetPanel` field from the annotation data to the illustration event, so the client can route it. This is just including the field in the event — no architectural change.

## References

- [Glk Specification 0.7.5](https://www.eblong.com/zarf/glk/Glk-Spec-075.html) — Andrew Plotkin's portable IF interface standard
- ADR-124: Entity Annotations — presentation metadata system (illustrations, portraits, voice, panel routing)
- ADR-122: Rich Media and Story Styling — rendering, CSS scoping, themes

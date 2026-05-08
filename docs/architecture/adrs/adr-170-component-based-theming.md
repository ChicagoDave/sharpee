# ADR-170: Component-Based Theming for the Browser Client

## Status: PROPOSED

## Date: 2026-05-07

## Builds on

- **ADR-163** (Channel-Service Platform) — establishes the principle that
  the platform exposes UI surfaces; authors customize per story. ADR-163
  governs *data flow* (channels → renderers); ADR-170 governs *visual
  chrome* expressed by those renderers. The two are orthogonal.
- The 2026-04-29 author-enabled-client-architecture blog post on
  `sharpee.plover.net` — articulates the long-running design intent for
  author-customizable client surfaces.
- The persistent direction recorded in
  `feedback_web_client_author_customizable`: "platform ships UI defaults
  for every channel/surface; authors override per-story; wire is data-only,
  never assume locked-in client choices."

## Context

The browser client (`templates/browser/index.html` +
`packages/platform-browser/`) ships four themes today: **DOS Classic**,
**Modern Dark**, **Retro Terminal**, **Paper**. They live in
`templates/browser/infocom.css` (700 lines) as a single block of
structural rules consuming a CSS variable palette. Each theme is a
`[data-theme="..."]` block that overrides ~12 variables — `--theme-bg`,
`--theme-text`, `--theme-font`, etc. Theme switching is one attribute
flip on `<html>`.

```css
[data-theme="dos-classic"] {
  --theme-bg: #0000aa;
  --theme-text: #ffffff;
  --theme-font: "Perfect DOS VGA 437", "Consolas", monospace;
  /* ... */
}
```

The model has a hard ceiling: **all themes share one DOM and identical
structural rules; only palette and font vary.** Structurally distinct
kits cannot be expressed.

The catalyst was a request to add `system.css` (a Macintosh System 6
recreation) as a fifth theme. System 6 has its own window chrome — a
dotted-pattern titlebar with a close box, square button corners,
1px borders, Chicago-bold dialog titles. None of that is a CSS variable
swap; it is a different structural design language. The same is true
for several plausible future themes:

- **Retro Terminal** would naturally have CRT scanlines and a bezel
  overlay, neither expressible in the current palette.
- **DOS Classic** would naturally have ASCII box-drawing borders around
  panels, not flat rectangles.
- **Author-shipped story themes** (per `feedback_web_client_author_customizable`)
  cannot reasonably be constrained to "you can change colors but not
  chrome."

Three implementation paths were considered:

- **A — Add `system.css` as a sixth `[data-theme]` block.** Either
  restructure the DOM to match `system.css` markup (breaks the four
  legacy themes that don't expect it) or write a wrapper that adapts
  `system.css` to the current flat DOM (fights the kit's natural
  patterns, doesn't generalize, leaves structural distinction
  inexpressible for any future theme).
- **B — Component vocabulary + per-theme CSS kits.** Define a small,
  stable set of named component classes (`.sharpee-window`,
  `.sharpee-menu-bar`, `.sharpee-prose-pane`, etc.) that the DOM
  commits to. Each theme is a complete CSS file styling every component
  end-to-end. Themes can adopt different structural language, decoration
  slots, and pseudo-element chrome — they share only the class
  contract, not the visual rules.
- **C — Per-theme HTML templates.** Each theme owns its own DOM
  fragment; switch templates at runtime. Maximum flexibility, but
  multiplies the JS coupling surface — `MenuManager` and `DialogManager`
  selectors fork by theme — and breaks the principle that the platform
  client is a single shipping artifact.

Option B is the cleanest fit for the long-running direction: the
component contract is the platform's commitment, theme CSS files are
the author surface, and the DOM is stable across all themes including
author-shipped ones.

## Decision

### Adopt a component vocabulary (Option B)

The browser client publishes a **component contract** of named CSS
classes. The DOM uses these classes; theme CSS targets them. Every
theme styles every component end-to-end. CSS variables remain available
inside a theme as an internal convenience but are not part of the
contract.

### Component vocabulary (22 classes)

| Component | Class | Purpose |
|-----------|-------|---------|
| Window shell | `.sharpee-window` | Whole-game outer container |
| Window title bar | `.sharpee-window-title-bar` | Title strip at top of shell |
| Window title bar controls | `.sharpee-window-title-bar-controls` | Decoration slot inside title bar (close box, version stamp) |
| Menu bar | `.sharpee-menu-bar` | Horizontal menu bar |
| Menu bar item | `.sharpee-menu-bar-item` | Top-level entry (File, Settings, Help) |
| Menu bar trigger | `.sharpee-menu-bar-trigger` | Clickable button inside an item |
| Menu dropdown | `.sharpee-menu-dropdown` | Popup panel that appears on click |
| Menu option | `.sharpee-menu-option` | Row in a dropdown |
| Menu separator | `.sharpee-menu-separator` | Horizontal rule between groups |
| Menu submenu indicator | `.sharpee-menu-submenu-indicator` | Caret marker for nested submenus |
| Status bar | `.sharpee-status-bar` | Location/score row |
| Prose pane | `.sharpee-prose-pane` | Main scrolling text region |
| Prose overlay | `.sharpee-prose-overlay` | Decoration slot above prose (CRT scanlines, paper grain) |
| Input bar | `.sharpee-input-bar` | Bottom command line |
| Input prompt | `.sharpee-input-prompt` | The `>` glyph |
| Input field | `.sharpee-input-field` | The actual `<input>` |
| Dialog overlay | `.sharpee-dialog-overlay` | Modal backdrop |
| Dialog | `.sharpee-dialog` | Modal frame itself |
| Dialog title | `.sharpee-dialog-title` | Header strip of a dialog |
| Dialog body | `.sharpee-dialog-body` | Scrollable content region |
| Dialog buttons | `.sharpee-dialog-buttons` | Row of action buttons |
| Dialog button | `.sharpee-dialog-button` | Individual button |

### Naming convention: no abbreviations

Identifiers are fully spelled out: `title-bar` not `titlebar`, `menu-bar`
not `menubar`, `prose-pane` not `prose`. The token set stays minimal but
no token is compressed. (Per `feedback_no_abbreviations`.)

### State modifiers (BEM-style suffix)

| Modifier | Applies to | Meaning |
|----------|-----------|---------|
| `--open` | `.sharpee-menu-bar-item` | Submenu is showing |
| `--checked` | `.sharpee-menu-option` | Has a leading checkmark |
| `--disabled` | `.sharpee-menu-option` | Non-interactive |
| `--hidden` | `.sharpee-dialog-overlay`, `.sharpee-dialog` | Visibility |
| `--system-message` | `.sharpee-input-bar` | Echoed system text styling |

State modifiers are part of the contract. JS toggles them; theme CSS
must style each documented modifier.

### Decoration slots

Two slots are first-class members of the contract:

- **`.sharpee-window-title-bar-controls`** — element inside
  `.sharpee-window-title-bar`. Themes that want a close box, version
  stamp, or other title-bar chrome populate this slot via CSS
  pseudo-elements or DOM. Themes that don't, leave it empty.
- **`.sharpee-prose-overlay`** — element layered over
  `.sharpee-prose-pane`. Themes that want CRT scanlines, paper grain,
  or similar layer-on effects style this slot. The slot is
  `pointer-events: none` so it never intercepts text selection or
  scroll.

Other decoration is theme-private (use any pseudo-elements you like on
any class you own).

### Semantic HTML adoption

Phase 1 of the implementation plan rewrites the DOM to use:

- **`<menu role="menubar">`** containing `<li role="menuitem">` for the
  menu bar.
- **`<dialog>`** (HTML5 native) for modal dialogs. `DialogManager`
  rewires open/close to `dialog.showModal()` / `dialog.close()`. ESC-to-
  close, focus management, and inert-background behavior come from the
  browser. The `--hidden` modifier on `.sharpee-dialog` becomes
  redundant for visibility (replaced by the `<dialog>` open state) but
  is kept in the contract for theme-side use (e.g., transition
  animations).

### Base CSS layer

The platform ships **`templates/browser/base.css`** with structural
rules that don't belong to any theme: flexbox layout for the menu bar,
scrolling behavior for the prose pane, `pointer-events: none` on the
prose overlay, focus-ring resets, screen-reader-only utility classes.
Themes layer over base.

Loading order in `index.html`:

```html
<link rel="stylesheet" href="base.css">
<link rel="stylesheet" href="themes.css">
```

`base.css` is theme-agnostic; `themes.css` (or per-theme files in the
follow-up dynamic-loading work — see Forecloses below) is where
visual design lives.

### Theme authoring contract

A theme is:

```ts
{
  id: string;          // 'dos-classic' | 'modern-dark' | 'system-6' | ...
  name: string;        // 'DOS Classic'
  cssPath: string;     // 'themes/dos-classic.css'
  fontAssets?: string[]; // optional, copied at build time
}
```

A theme CSS file **must**:

1. Provide visual styling for every component class in the contract. A
   theme that omits styling for `.sharpee-dialog` is incomplete.
2. Be scoped under `[data-theme="<id>"]` at top level — switching
   themes remains one attribute flip on `<html>`.
3. Either define its own typography or `@import` the platform's
   typography defaults.

A theme CSS file **may**:

- Use CSS variables internally. The contract is the component classes,
  not the variables.
- Bundle font assets via `@font-face` referencing files in its
  `fontAssets[]`.
- Style decoration slots, state modifiers, and any pseudo-elements on
  classes it owns.

A theme CSS file **may not**:

- Add new top-level classes outside the `.sharpee-*` namespace and
  expect JS to query them.
- Rely on DOM structure beyond the class contract (e.g., assume a
  specific element nesting depth).

### Migration commitment: ported, not redesigned

The four existing themes (DOS Classic, Modern Dark, Retro Terminal,
Paper) are **ported, not redesigned** in the implementation work that
follows this ADR. Same look, expressed against the new contract.
Visual evolution of any theme — CRT scanlines for Retro Terminal,
ASCII borders for DOS Classic — is explicitly **out of scope** for the
migration and would be follow-up work.

This isolates architectural change from visual change. If a theme
looks the same after the migration, the migration is correct.

## Consequences

### Constrains future sessions

- The 22-class contract becomes a **stable platform commitment**. Once
  any theme is authored against it, breaking the contract cascades.
  Adding a class is safe (existing themes leave it unstyled);
  removing or renaming a class is a breaking change requiring an ADR
  amendment.
- Every theme must style every component end-to-end. Theme files grow
  larger than the current variable-swap blocks. The `system.css`
  reference suggests ~200–400 lines per theme is realistic.
- Authors of story-shipped themes (a future affordance) target this
  same contract. Per-story themes inherit the platform's chrome
  decisions; they don't rewrite the DOM.
- Decoration slots (`.sharpee-window-title-bar-controls`,
  `.sharpee-prose-overlay`) are the documented extension points for
  per-theme chrome. Other extension routes — class additions outside
  the namespace, DOM-structure assumptions, JS hooks — are not
  supported.
- `MenuManager` and `DialogManager` query DOM by **id** for individual
  controls (`#menu-save`, `#file-menu-btn`, etc.) and by **class** for
  generic affordances (`.sharpee-menu-dropdown`, `.sharpee-menu-bar-trigger`).
  Ids are JS-platform owned and stable. Class queries against
  `.sharpee-*` are stable for the lifetime of the contract.
- `<dialog>` adoption is one-way. Themes rely on the native modal
  behavior; reverting to `<div>` modals would break theme assumptions
  and accessibility behavior.

### Forecloses

- Returning to "themes are CSS variable swaps" as the model. Themes
  are full component kits; the variable swap is now an internal
  convenience, not the contract.
- Per-theme HTML templates (option C). The DOM is single, stable,
  shared.
- `MenuManager` reaching into theme-private DOM. JS interacts only
  with documented contract classes and stable ids.
- Bundling future structurally-distinct kits as `[data-theme]` blocks
  in a single CSS file — the migration path is one CSS file per theme,
  loaded as a whole.

### Doesn't touch

- ADR-163's channel-service architecture or `media.*` event vocabulary.
  Component theming is the *visual chrome* of the renderers ADR-163
  produces; the data flow is unchanged.
- ADR-165's renderer architecture. Channels still flow into renderers;
  renderers still produce DOM. The contract narrows what classes that
  DOM uses.
- ADR-156's multi-user browser client model. Per-user renderer over
  the same DOM template; theme contract is per-page (one user, one
  selected theme).
- The Zifmia React client. Zifmia has its own theme system and is
  out of scope (and may be shelved per session 2026-05-06 notes).
- The CLI / TUI client. Not affected.
- Story content, action handlers, world model, parser. Pure UI change.

### Future affordance: dynamic per-theme CSS loading

A follow-up plan
(`docs/work/theme-architecture/plan-20260507-dynamic-theme-loading.md`)
proposes ADR-171: each theme becomes a standalone CSS file loaded at
selection time rather than a block in a monolithic `themes.css`. That
work depends on this ADR's contract being stable. It is intentionally
deferred — the contract must prove itself across five themes before
the loading mechanism changes.

The implication of dynamic loading is that author-shipped per-story
themes become viable as drop-in artifacts. ADR-170 makes the contract;
ADR-171 makes it shippable.

## Acceptance Criteria

### Contract

- All 22 component classes documented above appear in
  `templates/browser/index.html` after Phase 1 of the implementation
  plan.
- Every documented state modifier (`--open`, `--checked`, `--disabled`,
  `--hidden`, `--system-message`) is applied by JS where appropriate
  and styled by every theme.
- Both decoration slots (`.sharpee-window-title-bar-controls`,
  `.sharpee-prose-overlay`) exist in the DOM regardless of whether
  the active theme uses them.
- `<menu role="menubar">` and `<dialog>` are used in place of generic
  `<div>` for the menu bar and modal dialogs.

### Base layer

- `templates/browser/base.css` exists and contains structural-only
  rules.
- `index.html` `<link>`s `base.css` before any theme CSS.
- `base.css` does not declare any colors, fonts, or theme-specific
  visual properties.

### Theme migration (validated by Phase 2 of the plan)

- All four existing themes (`dos-classic`, `modern-dark`,
  `retro-terminal`, `paper`) target only `.sharpee-*` selectors after
  the migration.
- No `[data-theme]` block references the old class names
  (`.menu-bar`, `.menu-dropdown`, `.modal-dialog`, etc.) anywhere.
- Each theme's idle, menu-open, and save-dialog states match its
  pre-migration baseline screenshot within tolerance (subpixel font
  rendering acceptable; layout shift and color drift are not).

### JS-side stability

- `BrowserClient.initialize()` accepts the same `BrowserClientElements`
  shape it does today. Every property resolves to a non-null DOM node
  after Phase 1.
- The walkthrough regression chain
  (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`)
  passes after each phase commit.
- All menu and dialog interactions (open, click options, ESC, click
  outside) work in real-browser smoke test under every theme.

### Failure modes

- A theme that omits styling for a contract class produces a visible
  defect (unstyled element with default browser appearance). This is
  acceptable — the contract is "every theme must style every class";
  the platform does not paper over incomplete themes with a fallback
  cascade.
- A theme that adds rules outside the `.sharpee-*` namespace and
  collides with another theme's rules produces visible bleed. Themes
  scope their rules under `[data-theme="<id>"]`; rules outside that
  scope are theme-author's responsibility.

### Smoke test

- Browser human smoke-test (Phase 4 of the plan): for each of the
  five themes (four legacy + System 6), verify status bar, menu bar,
  prose pane, input bar, window chrome render correctly; open File →
  Save Game and File → Restore Game; switch themes via Settings →
  Theme; refresh the page and confirm theme persists.

## Session

Produced in session `2026-05-07 20:31` (branch `main`). Follows the
component-themes plan
(`docs/work/theme-architecture/plan-20260507-component-themes.md`)
whose seven open questions David resolved on 2026-05-07. ADR-170 is
Phase 0 deliverable of that plan; Phase 1 (DOM and platform-manager
refactor) starts after this ADR reaches READY FOR IMPLEMENTATION.

## References

- `docs/work/theme-architecture/plan-20260507-component-themes.md` —
  implementation plan; contains the four-phase migration sequence.
- `docs/work/theme-architecture/plan-20260507-dynamic-theme-loading.md`
  — follow-up plan for ADR-171 (dynamic per-theme CSS loading); gated
  on this ADR's contract landing.
- ADR-163 — Channel-Service Platform — establishes the
  author-customizable-UI direction this ADR builds on.
- ADR-156 — Multi-User Browser Client — the per-user renderer model
  is unaffected; component contract is per-page.
- `templates/browser/index.html` — current DOM (114 lines); refactor
  target for Phase 1.
- `templates/browser/infocom.css` — current variable-swap themes (700
  lines); rewrite target for Phase 2.
- `packages/platform-browser/src/managers/MenuManager.ts` — selector
  audit target for Phase 1.
- `packages/platform-browser/src/managers/DialogManager.ts` — `<dialog>`
  rewire target for Phase 1.
- `feedback_web_client_author_customizable` (memory) — long-running
  direction this ADR realizes for theme chrome.
- `feedback_no_abbreviations` (memory) — naming rule applied to the
  vocabulary.
- 2026-04-29 blog post on `sharpee.plover.net` — author-enabled-client
  architecture, referenced as design intent.
- `system.css` upstream demo (sakofchit on GitHub) — reference
  aesthetic for the System 6 theme planned for Phase 3.

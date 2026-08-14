# Zifmia Renderer Spike — Outcome

**Spike target**: framework choice for the Zifmia v1 web client (ADR-175 Open Question OQ-4).

**Outcome**: framework question is moot. Zifmia matches the existing `packages/platform-browser/` pattern. **No framework, no third-party UI library.**

---

## What the platform already commits to

ADR-170 (Component-Based Theming) and the existing `packages/platform-browser/` implementation answer every concern the spike was set up to compare:

| Concern | Platform answer |
|---|---|
| Modal | Native `<dialog>` + `.sharpee-dialog`. Browser handles focus trap, ESC, backdrop click. |
| Menu / dropdown | `<menu role="menubar">` + `<ul role="menu">` + `.sharpee-menu-bar` class + `--open` state modifier. Themes react to the class. |
| Tabs / sections | Same component-class + state-modifier pattern. |
| Focus management | Native elements + manual `tabIndex` for list rows. |
| ARIA | Authored into static HTML markup, not assembled at render time. |
| Theming | 22-class component vocabulary, `[data-theme="..."]` attribute flip. Five themes ship today, including System 6 (the structurally distinct Macintosh chrome that motivated ADR-170). |
| State management | CSS state modifiers (`--open`, `--checked`, `--disabled`, `--hidden`) flipped by plain-TS managers (`DialogManager`, `MenuManager`, etc.). |
| Dependency longevity | Zero third-party UI dependencies. No Shoelace-archive risk; no React major-version churn. |

The "framework" is a four-layer contract:

1. **`templates/browser/index.html`** — static DOM with the 22 component classes and native semantic elements.
2. **`templates/browser/base.css`** — structural rules shared by every theme (layout, scroll, focus reset).
3. **`templates/browser/themes/<theme>/`** — per-theme visual CSS scoped under `[data-theme="<id>"]`. Five exist; System 6 is one.
4. **`packages/platform-browser/src/managers/*.ts`** — plain TypeScript classes (`DialogManager`, `MenuManager`, `InputManager`, `SaveManager`, `ThemeManager`) that query the DOM by stable id + `.sharpee-*` class and toggle state modifiers.

`DialogManager` drives native `<dialog>.showModal()` and resolves a Promise on the dialog's `close` event. `MenuManager` toggles `.sharpee-menu-bar-item--open` on click and ARIA `aria-expanded` for screen readers. `ThemeManager` switches all five themes by mutating `document.documentElement.dataset.theme`. None of it needs React, Lit, or any framework.

---

## What Zifmia inherits for free

- All five themes (DOS Classic, Modern Dark, Retro Terminal, Paper, System 6) work the moment Zifmia's DOM uses the existing `.sharpee-*` classes.
- The author-override surface is already a CSS-class contract — any author who produces DOM with the same classes gets every theme without writing theme CSS themselves.
- Native browser primitives (`<dialog>`, `<menu role="menubar">`) cover the accessibility hard cases.

## What Zifmia adds in Phase 6

The pattern extends additively:

1. **Vocabulary addendum** — a small ADR (call it ADR-176) extending ADR-170's 22-class set with multi-user-specific classes:
   - `.sharpee-chat-panel`, `.sharpee-chat-message`, `.sharpee-chat-input`
   - `.sharpee-presence-roster`, `.sharpee-presence-participant`
   - `.sharpee-lock-indicator`, `.sharpee-input-bar--locked` (state modifier)
   - `.sharpee-room-list`, `.sharpee-room-card`
   - `.sharpee-admin-section`, `.sharpee-audit-row`
2. **Manager classes** mirroring the existing ones — `RoomLobbyManager`, `ChatPanelManager`, `PresenceManager`, `LockManager`, `RoomViewManager`. Same shape, different DOM targets and WS event sources.
3. **Theme files** — one pass per existing theme to add styling for the new classes (~half-day per theme).
4. **`templates/zifmia/index.html`** — Zifmia's HTML template mirroring `templates/browser/index.html` but with multi-user surfaces.
5. **`ChannelRenderer` adapters** for `main` / `chat` / `presence` / `command_echo` — thin shims that hand data to the relevant manager. Same pattern as `platform-browser`'s existing channel renderers.

---

## Why the React-vs-WC framing was wrong

I drafted a comparison between React and vanilla web components (and later considered Lit + Shoelace, then Lit + own primitives). Every option assumed Zifmia needed to **pick a framework**.

It doesn't. The platform-browser proves a framework-free path works for the kind of UI Sharpee ships — a static DOM, semantic primitives, class-based theming, plain-TS managers. The Shoelace archive that surfaced during this spike is the kind of risk the platform-browser pattern eliminates by construction.

If a future Sharpee surface genuinely needs a reactive framework (e.g., a data-heavy admin dashboard outside the IF play surface), that decision lives with that surface — not propagated to the v1 Zifmia client.

---

## OQ-4 resolution

OQ-4 is closed. **No framework.** Match `packages/platform-browser/`.

Phase 6 entry depends on:
- ADR-176 (vocabulary addendum) drafted and accepted — recommend drafting this at Phase 5 exit so Phase 6 starts with the contract pinned.
- The five theme files audited to confirm they can absorb the new classes additively.

Neither blocks Phases 3, 4, 5 (server-side work).

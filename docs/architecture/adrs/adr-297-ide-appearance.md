# ADR-297: IDE Appearance — Dual-Palette Dynamic Tokens + User Override

**Status**: ACCEPTED (2026-08-02, session 7dd736) — records a decision already
partially shipped (dynamic tokens, 2026-07) and completes it (override menu,
this session). Closes GH #129.

**Parent**: ADR-258 (IDE authoring environment), ADR-279 D1 (app identity).
**Explicitly NOT covered by**: ADR-171 / ADR-188 — those govern browser-client
/ story themes (the `.sharpee-*` CSS vocabulary, theme packages, Chord's
`theme:` header). This ADR is about the IDE's own AppKit chrome only.

## Context

The IDE originally painted a fixed dark palette and forced
`NSApp.appearance = .darkAqua` (commit 3074b078, a workaround for
system-control inconsistency). GH #129 asked for real light/dark support. The
palette half shipped without an ADR: `Theme.swift` became fully dynamic —
every token is a `dynamic(light:dark:)` pair (dark: the Catppuccin-Mocha-ish
palette from `mock-v1.html`; light: its Latte counterpart), resolving per the
effective appearance via `NSColor(name:dynamicProvider:)`, with layer-backed
surfaces re-resolving through `updateLayer` (`ThemedPane`) and text at draw
time. What remained was the user-visible gap: an author on a light-mode Mac
could not choose the dark IDE, or vice versa.

## Decision

1. **Dual-palette dynamic tokens are the mechanism** (ratified as shipped):
   one `Theme` token namespace, each token carrying a light and a dark value;
   no second theme file, no per-view branching, no CSS-style theme plugins for
   the IDE chrome. New chrome colors MUST be added as `dynamic(light:dark:)`
   pairs — a single-appearance hex literal in view code is a defect.
2. **The IDE follows the system appearance by default**, and the author may
   pin it: **View → Appearance → System / Light / Dark**. The choice persists
   in `UserDefaults` (`SharpeeAppearance`) and applies immediately
   (`AppearancePreference`, `NSApp.appearance` — `nil` releases the pin).
   Applied at launch before the window builds, so startup renders in the
   chosen appearance rather than flashing the system one.
3. **Appearance is app-wide, not per-surface.** Individual panes do not get
   their own light/dark toggles; the Play pane renders the story in the same
   appearance as the chrome. (Story/browser theming remains ADR-171/188
   territory and is unaffected.)

## Consequences

- The `.darkAqua` force is gone for good; the only `.darkAqua` reference in
  the IDE is the `bestMatch` read inside `Theme.swift`.
- Menu additions follow the existing preference idiom (enum + rawValue in
  `representedObject`, radio state in `validateMenuItem`, `UserDefaults`
  persistence) — the same shape as `FontPreference`.
- GH #129 item 4 (toning panels toward white-on-black in both palettes) is a
  palette-value tuning pass inside the existing tokens, not new machinery; it
  needs eyes on the running app and stays open until David reviews both looks.
- Tests assert on the two real mutations (`UserDefaults` key,
  `NSApp.appearance`) — `AppearancePreferenceTests`.

## Session

7dd736 (2026-08-02): wrote `AppearancePreference`, the View → Appearance
submenu, launch-time apply, and this ADR. Palette work predates this session
(triaged in GH #129's 2026-07-29 comment).

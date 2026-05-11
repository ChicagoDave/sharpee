# ADR-176: Multi-User Component Vocabulary (Addendum to ADR-170)

## Status: PROPOSED

## Date: 2026-05-11

## Builds on

- **ADR-170** — Component-Based Theming for the Browser Client. Defines
  the 22-class component vocabulary, base CSS layer, state-modifier
  convention, decoration-slot pattern, and the "every theme styles every
  contract class end-to-end" rule. This ADR extends that vocabulary
  additively; it does not modify any existing class.
- **ADR-175** — Zifmia Multi-User Product Surface and Rebuild. Defines
  the v1 product surface — public lobby, room creation, room
  participation, chat, presence, lock-on-typing, save management,
  admin pages — that requires UI vocabulary beyond what ADR-170
  covers for single-user IF play.
- **ADR-164** — Stateless Multi-User Server. Defines the server-sourced
  channels (`chat`, `presence`, `command_echo`) whose rendered output
  these new vocabulary classes house.
- **ADR-163** — Channel-Service Platform. The data path from engine to
  renderer; this ADR only concerns the *visual chrome* of the renderers
  that ADR-163 produces.

## Corrects (forward-looking)

ADR-170 §"Doesn't touch" says:

> The Zifmia React client. Zifmia has its own theme system and is out
> of scope.

That carve-out is obsolete. ADR-175 settled that Zifmia is the
multi-user web product (not a React client), and the 2026-05-11 Phase 2
spike (`spikes/zifmia-renderer/findings.md`) settled that Zifmia
matches `packages/platform-browser/`'s framework-free pattern. Zifmia
therefore reuses ADR-170's component vocabulary and theme files, with
this ADR's additions covering the multi-user surfaces.

## Context

ADR-170's 22 classes cover: window shell, title bar, menu bar + dropdowns,
status bar, prose pane, input bar, native `<dialog>` modals. That set is
complete for single-user IF play.

Zifmia's v1 product surface introduces UI that has no analog in the
existing vocabulary:

- A **chat panel** with appended messages — append-mode like the prose
  pane but a separate region, distinct typography, distinct scroll
  behavior in some themes (System 6 may want a chiseled panel border;
  Modern Dark a flat card; Retro Terminal a separate phosphor
  channel).
- A **presence roster** — list of participants currently in the room.
  Conceptually parallel to the status bar but multi-row and identity-
  attributed.
- A **lock-on-typing indicator** — "Alice is typing…" affordance per
  ADR-175 §9 lock-on-typing semantics. Universal multi-user concern.
- A **locked input state** — when someone else holds the command-line
  lock, the local input bar is read-only with a visual treatment per
  theme. This is a new state modifier on the existing
  `.sharpee-input-bar` class.

These four surfaces are universal multi-user concerns. Any future
Sharpee multi-user web client would want them. They belong in the
shared contract.

The remaining Zifmia surfaces (lobby room list, room cards, admin
sections, audit log rows) are Zifmia-app-specific — a future
multi-user product with a different participant model would not
necessarily want them. Following the `packages/platform-browser/`
precedent (`.save-slot`, `.save-slot-name`, `.no-saves-message` are
feature-private and outside the vocabulary), those classes stay
feature-private and are not part of this ADR.

## Decision

Extend ADR-170's component vocabulary additively with **six new
component classes** and **one new state modifier**.

### New component classes (6)

| Component | Class | Purpose |
|---|---|---|
| Chat panel | `.sharpee-chat-panel` | Container for the room chat region |
| Chat message | `.sharpee-chat-message` | Single chat row (handle + text + timestamp) |
| Chat input | `.sharpee-chat-input` | Chat composition input field |
| Presence roster | `.sharpee-presence-roster` | Container for the participant list |
| Presence participant | `.sharpee-presence-participant` | Single participant entry (handle, optional avatar/badge) |
| Lock indicator | `.sharpee-lock-indicator` | "<handle> is typing…" affordance |

### New state modifier (1)

| Modifier | Applies to | Meaning |
|---|---|---|
| `--locked` | `.sharpee-input-bar` | Local input is read-only because another participant holds the command-line lock per ADR-175 §9. Theme CSS styles the locked appearance (dimmed, disabled cursor, etc.). |

### Naming and contract rules

All ADR-170 rules apply unchanged:

- Identifiers are fully spelled out — no abbreviations (`chat-panel`
  not `chatpanel`, `presence-participant` not `presence-p`).
- State modifiers are part of the contract — JS toggles them; theme
  CSS must style them.
- Themes that don't know about a new class leave it unstyled — ADR-170
  §"Constrains future sessions" explicitly permits additive class
  introduction.
- Themes layer over `base.css`; structural rules for the new classes
  (layout, scroll behavior, overflow handling) live in `base.css`.

### Decoration slots

No new decoration slots. The existing `.sharpee-prose-overlay` pattern
(decoration layer with `pointer-events: none`) is available to themes
that want to layer effects over the chat panel; if Phase 6 finds we
need a chat-specific overlay, it can be added in a follow-up amendment.

### Theme commitment

Every theme that ships when Zifmia v1 lands must style all six new
classes and the `--locked` modifier end-to-end. This is the same
commitment ADR-170 §"Migration commitment: ported, not redesigned"
applies to the original 22 classes. Themes that ship before Zifmia v1
(the existing five — DOS Classic, Modern Dark, Retro Terminal, Paper,
System 6) leave these classes unstyled and get base-layer defaults;
when Phase 6 of the ADR-175 plan runs, each theme is updated to cover
them.

## Invariants

- **Additive only.** Nothing in ADR-170's 22-class vocabulary is
  modified, renamed, or removed.
- **No framework.** New classes are queried by `.sharpee-*` selectors
  and styled by CSS; manager classes (`ChatPanelManager`,
  `PresenceManager`, `LockManager`) toggle state via class
  modifiers. No React, Lit, or third-party UI library is introduced.
  Per `project_web_ui_framework_free` memory and the Phase 2 spike.
- **No shadow DOM.** Light DOM only; theme CSS must penetrate. Same
  rule as ADR-170.
- **Native primitives where they exist.** No new affordance introduces
  a custom-element substitute for a native HTML5 element.
- **Stable contract.** Once any theme styles one of these new classes,
  removing or renaming the class is a breaking change requiring an
  ADR amendment.

## Acceptance Criteria

1. **AC-1 — Vocabulary present in markup.** The Zifmia client's HTML
   template (introduced in Phase 6 of the ADR-175 implementation plan)
   uses every new class. The chat panel is `.sharpee-chat-panel`
   containing one or more `.sharpee-chat-message`; the presence
   roster is `.sharpee-presence-roster` containing one
   `.sharpee-presence-participant` per occupant; the lock indicator
   is `.sharpee-lock-indicator`; the locked-input state is the
   `--locked` modifier on `.sharpee-input-bar`.

2. **AC-2 — Manager classes own state toggling.** New manager classes
   in the Zifmia client (`ChatPanelManager`, `PresenceManager`,
   `LockManager`) query the DOM by stable id (for unique controls)
   and `.sharpee-*` class (for generic affordances), and toggle
   `.sharpee-input-bar--locked` per lock-state WS events. No JS
   reaches into theme-private DOM.

3. **AC-3 — Base layer covers structural rules.** `base.css` (or a
   Zifmia-only base extension, if Phase 6 finds the split useful) is
   updated with the layout, scroll, overflow, and `pointer-events`
   rules for the new classes. No colors, fonts, or theme-specific
   visual rules in the base layer.

4. **AC-4 — Every existing theme styled.** When Phase 6 of the
   ADR-175 plan ships, each of the five existing themes (DOS Classic,
   Modern Dark, Retro Terminal, Paper, System 6) has been updated to
   style every new class and the `--locked` modifier end-to-end. A
   theme that omits one is incomplete and blocks the Phase 6 release.

5. **AC-5 — System 6 newline-doubling bug not regressed.** GitHub
   issue [#111](https://github.com/ChicagoDave/sharpee/issues/111)
   identified that System 6 currently doubles newlines in the prose
   pane; the chat panel must not inherit the same bug. Whichever fix
   lands for #111 must be verified to also produce single-spaced
   output in `.sharpee-chat-panel` and `.sharpee-chat-message`.

6. **AC-6 — No framework dependency added.** `package.json` for the
   Zifmia client adds no React, Lit, Preact, Shoelace, or any other
   UI framework / component library. The manager classes are plain
   TypeScript. Per `feedback_check_dep_health_before_recommending`
   memory and the Phase 2 spike outcome.

## Consequences

### Positive

- **Zifmia inherits all five themes for free.** Once Phase 6 updates
  each theme file to cover the new classes, every Zifmia user gets
  System 6, DOS Classic, Modern Dark, Retro Terminal, and Paper as
  drop-in selections — same `[data-theme="<id>"]` attribute flip,
  same `ThemeManager` mechanism.
- **Zero new dependency surface.** No library to age out; no
  framework version to chase; no Shoelace-archive class of risk.
- **Author-override path unchanged.** Authors who want to ship a
  custom chat panel can re-register a `ChannelRenderer` for the
  `chat` channel that produces DOM with `.sharpee-chat-panel` /
  `.sharpee-chat-message` — themes style it without per-author CSS
  work. Authors who want a structurally different surface invent
  their own non-`sharpee-*` classes and theme them per-story (same
  as platform-browser's `.save-slot` pattern).

### Negative

- **Five theme files need updates** before Zifmia v1 can ship. Each
  theme owner (currently a single repo author) does one pass per
  theme — roughly half a day each per ADR-170's tuning estimate.
- **Vocabulary grew by ~25%.** From 22 to 28 classes. Still
  small. Future additions face the same "is this a universal
  contract concern?" filter — lobby/admin classes did not pass and
  stayed feature-private.

### Constrains future sessions

- **Multi-user UI joins the contract.** A future Sharpee surface that
  exposes chat or presence MUST use these classes; rolling its own
  vocabulary divides the theme work and is an anti-pattern.
- **Lock semantics in CSS.** `.sharpee-input-bar--locked` is the
  expected representation of "another participant holds the lock."
  A future product that wants a different lock model (e.g.,
  per-participant locks) extends or adds modifiers but does not
  redefine `--locked`.
- **Lobby/admin remain feature-private.** A future ADR may promote
  lobby/admin classes to the contract if a second multi-user product
  surfaces. Until then, Zifmia's lobby/admin CSS lives in
  `templates/zifmia/` (or wherever Phase 6 lands them) and themes
  are not required to style them.

### Forecloses

- **Per-theme markup for chat / presence.** The DOM is single and
  stable; themes vary only in CSS. Same constraint ADR-170 §"Option
  C foreclosed."
- **Shadow-DOM custom elements for the new classes.** Theme CSS must
  penetrate; light DOM only.

### Doesn't touch

- ADR-163's channel definitions or ADR-164's wire shapes. This is
  visual chrome over the data flow they already define.
- ADR-165's renderer contract. `ChannelRenderer` instances feed the
  manager classes; the manager classes own the DOM. Same pattern
  ADR-170 uses for `MainChannelRenderer` ↔ `InputManager` /
  `DialogManager`.
- The single-user platform-browser client. ADR-170's 22 classes are
  unchanged.
- Stories, action handlers, world model, parser. Pure UI vocabulary.

## References

- ADR-170 — Component-Based Theming for the Browser Client.
- ADR-175 — Zifmia Multi-User Product Surface and Rebuild (the
  product surface this vocabulary supports).
- ADR-163 — Channel-Service Platform (the `chat`, `presence`,
  `command_echo` channel definitions).
- ADR-164 — Stateless Multi-User Server (server-sourced channel
  semantics).
- `packages/platform-browser/src/managers/` — pattern for the
  Zifmia manager classes that will toggle the new state modifier.
- `spikes/zifmia-renderer/findings.md` — Phase 2 outcome that
  established Zifmia matches the platform-browser pattern.
- GitHub issue [#111](https://github.com/ChicagoDave/sharpee/issues/111)
  — System 6 newline-doubling bug; AC-5 ensures the fix covers the
  new chat surfaces.

## Session

2026-05-11 main — Phase 2 of the ADR-175 implementation plan closed
with the Zifmia client matching `packages/platform-browser/`'s
framework-free pattern. David surfaced that ADR-170's 22-class
vocabulary doesn't cover chat / presence / lock state, and asked for
a follow-up ADR before any client code in Phase 6 begins. This ADR
fills that gap additively — six classes, one state modifier. The
remaining Zifmia surfaces (lobby, admin, audit log) stay
feature-private per the existing platform-browser precedent.

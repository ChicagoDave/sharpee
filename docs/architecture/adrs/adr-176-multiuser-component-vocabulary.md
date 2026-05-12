# ADR-176: Multi-User Component Vocabulary Addendum to ADR-170

## Status: ACCEPTED

## Date: 2026-05-12 (drafted, reviewed, accepted same day)

## Builds on

- **ADR-170** (Component-Based Theming) — establishes the 22-class
  `.sharpee-*` component contract for the single-player browser chrome
  (window shell, menu bar, prose pane, input bar, dialog). ADR-176
  *extends* that vocabulary; it does not modify or reorganize the
  existing 22 classes.
- **ADR-175** (Zifmia Multi-User Product) — defines the wire shapes
  (`presence:update`, `chat:send/message`, `lock:acquire/release/state`,
  `turn:broadcast`, `room:restored`) and the v1 product surface
  (lobby, room participation, named saves) that the new components
  render.
- **ADR-163** (Channel-Service Platform) — the underlying principle
  that the platform exposes UI surfaces and authors customize per
  story; the multi-user surfaces inherit the same author-customizable
  contract as the single-player ones.
- The persistent direction recorded in
  `feedback_web_client_author_customizable`: "platform ships UI
  defaults for every channel/surface; authors override per-story; wire
  is data-only, never assume locked-in client choices."

## Context

Phase 6 of the ADR-175 implementation plan ships the Zifmia web
client. ADR-175 §4 enumerates surfaces the client must render that
have **no representation in ADR-170's 22-class vocabulary**:

- **Presence roster** — list of identities currently subscribed to a
  room; updated by `presence:update` WS broadcasts.
- **Chat panel** — separate from the prose pane; carries
  `chat:message` rows attributed to a sender handle. Has its own
  input distinct from the command line.
- **Lock-on-typing indicator** — when another participant holds
  `lock:acquire`, our command input must be visibly read-only with
  an explanatory affordance ("Alice is typing…").
- **Public lobby** — `GET /rooms` rendered as a joinable room list
  on the entry page, separate from any in-room chrome.
- **Named saves panel** — list of `named_saves` rows the participant
  can name, restore, and inspect in-room.
- **Identity entry** — login/register form on the unauthenticated
  entry page.
- **Room-restored notice** — transient banner when `room:restored`
  fires (a participant rolled the room back to a named save; the
  transcript window was rewound).

Three implementation paths exist:

- **A — Each new surface invents its own classes.** Phase 6 ships
  whatever the first author of the page picked: `.user-list`,
  `.chat-box`, `.lobby-card`. Themes have no contract to target.
  Future themes either reverse-engineer the chosen classes or rewrite
  the DOM. This is the failure mode ADR-170 was written to prevent.
- **B — Reuse existing ADR-170 classes for everything.** Try to
  cram chat into `.sharpee-prose-pane`, presence into a menu, lock
  state into the input bar's existing modifiers. The semantics
  collide (chat ≠ prose; presence ≠ menu) and theming becomes
  ambiguous (an `.sharpee-prose-pane` rule that styles game text now
  also styles chat). Themes that want the two surfaces visually
  distinct have no purchase.
- **C — Extend the vocabulary.** Add a small, focused set of
  multi-user-specific classes alongside the existing 22, with the
  same naming discipline, the same per-theme styling expectation,
  and the same JS-attaches-by-id-or-class convention. Themes opt in
  per-class; a single-player theme that targets only the original 22
  classes continues to work in the single-player client, and the
  multi-user surfaces appear unstyled (acceptable failure mode).

Option C is the only one that preserves ADR-170's contract model
under the new product surface.

## Decision

### Add 14 multi-user component classes

The vocabulary is grouped by surface. Every class is in the same
`.sharpee-*` namespace as ADR-170; no abbreviations
(per `feedback_no_abbreviations`); the JS layer queries by id for
individual controls and by class for generic affordances.

#### Presence (3 classes)

| Class | Purpose |
|-------|---------|
| `.sharpee-presence-panel` | Container holding the connected-identity roster. Theme owns position (sidebar / corner / top strip), border, and background. |
| `.sharpee-presence-list` | Semantic list element (`<ul>`) inside the panel. Theme owns row spacing and dividers. |
| `.sharpee-presence-item` | One identity row. Theme owns hover state, the leading avatar slot (decoration), and the handle typography. |

#### Chat (4 classes)

| Class | Purpose |
|-------|---------|
| `.sharpee-chat-panel` | Container for the per-room chat area. Theme owns position and chrome. |
| `.sharpee-chat-history` | Scrollable region holding the message rows. Base CSS owns the `overflow-y: auto` + scroll-pin-to-bottom behavior; theme owns visual treatment. |
| `.sharpee-chat-message` | One `chat:message` row. Theme owns row layout, attribution typography, and timestamp formatting. |
| `.sharpee-chat-input` | The input element used to send chat (`chat:send`). Distinct from `.sharpee-input-bar` so the two never collide visually or behaviorally. |

#### Lock-on-typing (1 class)

| Class | Purpose |
|-------|---------|
| `.sharpee-lock-banner` | Element rendered above or below `.sharpee-input-bar` when another participant holds the lock; surfaces "Alice is typing…" or equivalent. Hidden in default state via the `--hidden` modifier. |

The lock state on the participant's *own* input bar is conveyed via
state modifiers on the existing `.sharpee-input-bar` (see below) —
not via a new class.

#### Lobby (3 classes)

| Class | Purpose |
|-------|---------|
| `.sharpee-lobby` | Page-level container for the unauthenticated / between-rooms entry view. Theme owns whole-page layout. |
| `.sharpee-lobby-list` | List of joinable rooms returned by `GET /rooms`. |
| `.sharpee-lobby-item` | One room row (title, story, participant count). |

#### Named saves (2 classes)

| Class | Purpose |
|-------|---------|
| `.sharpee-saves-panel` | Container holding the named-save list and the create-save affordance. Surfaced from a menu or as a side panel — theme owns placement. |
| `.sharpee-saves-item` | One named-save row (label, atTurn, createdBy). |

#### Identity (1 class)

| Class | Purpose |
|-------|---------|
| `.sharpee-identity-form` | The login/register form scaffold. Theme owns field layout, button placement, and error-state visuals. |

### State modifiers (additive to ADR-170's set)

| Modifier | Applies to | Meaning |
|----------|------------|---------|
| `--locked` | `.sharpee-input-bar` | Another participant holds `lock:acquire`; this participant's input is read-only. |
| `--locked-by-me` | `.sharpee-input-bar` | This participant holds the lock; theme may signal active typing visually (e.g., focus-tinted border). |
| `--self` | `.sharpee-presence-item`, `.sharpee-chat-message` | Row represents this participant — theme may bold or accent. |
| `--admin` | `.sharpee-presence-item` | Identity has the `is_admin` bit (per ADR-175 OQ-3); theme may add a marker. |
| `--system` | `.sharpee-chat-message` | Server-emitted system message (e.g., "Alice joined") rather than a participant message. |
| `--hidden` | `.sharpee-lock-banner`, `.sharpee-lobby`, `.sharpee-saves-panel`, `.sharpee-presence-panel`, `.sharpee-chat-panel` | Visibility (default state for transient surfaces). The `--hidden` modifier from ADR-170 is reused — same semantics. |

State modifiers are part of the contract. JS toggles them; every
theme must style each documented modifier.

### Decoration slots (additive to ADR-170's set)

Two new slots are first-class members of the contract:

- **`.sharpee-presence-avatar`** — element inside
  `.sharpee-presence-item`. Themes that want a custom avatar (initial
  glyph, generated emoji, image) populate this slot via CSS
  pseudo-elements or DOM. Themes that don't, leave it empty.
- **`.sharpee-chat-message-author`** + **`.sharpee-chat-message-text`**
  — child elements inside `.sharpee-chat-message`. The split is
  exposed so themes can style the attribution differently from the
  message body without depending on tag-name selectors. The slot
  contract is *the elements exist*; themes choose typography and
  arrangement.

Other decoration is theme-private (use any pseudo-elements you like
on any class you own).

### Semantic HTML adoption

Following ADR-170's pattern of preferring native HTML5 over generic
`<div>`s:

- **`<ul>` / `<li>`** for `.sharpee-presence-list`,
  `.sharpee-lobby-list`, `.sharpee-saves-list` (list semantics for
  screen readers and keyboard navigation).
- **`<form>`** for `.sharpee-identity-form` (native validation,
  Enter-to-submit).
- **`<output>`** is *not* prescribed for chat history — chat is a
  log, not a single-value output; `<ol>` is acceptable for the
  history if a theme wants ordered semantics.
- **`<dialog>`** is reused for the named-save creation modal (same
  pattern as ADR-170 Save/Restore dialogs).

### Naming convention reaffirmed

Identifiers are fully spelled out: `presence-list` not `presences`,
`chat-history` not `chat-log`, `saves-panel` not `save-panel-pane`.
Per `feedback_no_abbreviations` and consistent with ADR-170.

### Theme authoring expectation

A theme **must** style every multi-user component class once it ships
in the multi-user client. The same end-to-end commitment ADR-170
makes for the original 22 classes applies here.

A theme **may** ship without multi-user styling if it is intended
only for the single-player client. The Zifmia web client's bundled
themes (DOS Classic, Modern Dark, etc., re-skinned for multi-user)
must include the new classes; author-shipped themes intended only
for single-player Sharpee may omit them, in which case the
multi-user surfaces render with default browser appearance — the
same failure mode as an incomplete single-player theme.

### What stays in ADR-170, unchanged

- All 22 single-player classes keep their contract status,
  modifiers, decoration slots, and JS-attachment conventions.
- The `--system-message` modifier on `.sharpee-input-bar` (used for
  echoed system text in the single-player client) is **distinct from**
  the new `--locked` / `--locked-by-me` modifiers — they describe
  different orthogonal states and may co-occur.
- The base CSS (`base.css`) layer continues to own structural rules
  that don't belong to any theme; the multi-user additions extend it
  with `pointer-events: none` for `.sharpee-lock-banner--hidden`,
  scrolling behavior for `.sharpee-chat-history`, etc.

### Implementation location

The 14 new classes land in the Zifmia web client built in Phase 6 of
the ADR-175 plan. The exact package home is a Phase 6 implementation
choice between:

- **Extending `packages/platform-browser/`** with multi-user managers
  (`PresenceManager`, `ChatManager`, `LockManager`) alongside the
  existing `MenuManager` / `DialogManager`. Keeps one platform-UI
  package; relies on `@sharpee/zifmia` consuming it.
- **A dedicated `tools/zifmia/web/`** that owns the multi-user DOM
  and managers, importing only the contract classes + base CSS from
  `packages/platform-browser/`. Keeps Zifmia's surface scoped to its
  own tool tree.

Either path satisfies ADR-176's contract — the contract is the class
vocabulary, not the package layout. Both paths are framework-free
per `project_web_ui_framework_free` and ADR-170's
component-contract-over-templates posture.

The base CSS additions (scroll behavior, `pointer-events: none`,
focus-ring resets for the new classes) extend
`templates/browser/base.css` regardless of which package owns the
DOM, since `base.css` is the platform's structural-rules artifact.

## Consequences

### Constrains future sessions

- The vocabulary expands from 22 to **36 classes** (22 + 14). Every
  multi-user theme styles every class end-to-end.
- The combined contract is a **stable platform commitment**. Adding a
  class is safe (existing themes leave it unstyled); removing or
  renaming a class is a breaking change requiring an ADR amendment.
- The lock-on-typing UX is split across **two surfaces**: the
  observer's `.sharpee-input-bar--locked` (their own input goes
  read-only) and the `.sharpee-lock-banner` (textual affordance).
  Themes own visual coherence between the two.
- Chat is a **first-class surface separate from prose**. Themes that
  want them visually unified (e.g., chat woven into the prose stream
  like a MUD) must do so by styling — the DOM keeps them separate.
- **Author-shipped multi-user themes** (a future affordance via
  ADR-171's dynamic theme loading) target the combined 36-class
  contract. Per-story chat theming is supported because the chat
  vocabulary is part of the platform contract, not a per-story
  invention.

### Forecloses

- Embedding chat into `.sharpee-prose-pane`. The two surfaces are
  separately classed; mixing them was option B, explicitly rejected.
- Per-surface JS reaching into theme-private DOM. The same
  query-by-id-or-contract-class rule from ADR-170 applies; new managers
  (a `PresenceManager`, `ChatManager`, `LockManager` if those land in
  Phase 6) target the documented classes.
- Communicating lock state via a presence-panel modifier alone
  (e.g., `.sharpee-presence-item--typing`). The lock-on-typing UX
  needs a banner element so the affordance is visible without
  requiring the participant to look at the roster; the modifier
  alone is insufficient.
- Bundling per-story multi-user UI overrides as a separate file
  format. Authors override via the same theme CSS file — single
  contract, single artifact type.

### Doesn't touch

- ADR-170's 22 classes, modifiers, decoration slots, or JS conventions.
- ADR-163's channel-service architecture or `media.*` event vocabulary.
- ADR-165's renderer architecture. Multi-user surfaces still flow
  through renderers; the contract narrows what classes that DOM uses.
- ADR-175's wire shapes. The vocabulary renders the wire; the wire
  itself is unchanged.
- Story content, action handlers, world model, parser. Pure UI
  contract change.
- The CLI / TUI client. Multi-user UI is a browser concern.

### Future affordance: per-story chat theming

ADR-171 (dynamic per-theme CSS loading, deferred) plus this
addendum together unlock author-shipped per-story multi-user themes.
A story can ship a complete kit including chat panel chrome, presence
roster styling, and lock affordance — without rewriting the DOM and
without depending on platform-private classes. ADR-176 makes the
contract; ADR-171 makes it shippable.

## Acceptance Criteria

### Contract

- All 14 new component classes documented above appear in the Zifmia
  web client's DOM after Phase 6 of the ADR-175 implementation plan.
- Every documented state modifier (`--locked`, `--locked-by-me`,
  `--self`, `--admin`, `--system`, plus the reused `--hidden`) is
  applied by JS where appropriate and styled by every multi-user
  theme.
- Both new decoration slots (`.sharpee-presence-avatar`,
  `.sharpee-chat-message-author` / `.sharpee-chat-message-text`)
  exist in the DOM regardless of whether the active theme uses them.
- `<ul>` / `<li>` is used for presence, lobby, and saves lists.
- `<form>` is used for `.sharpee-identity-form`.

### Base layer

- `base.css` extends with structural-only rules for the new classes:
  scroll behavior for `.sharpee-chat-history`, `pointer-events: none`
  for `.sharpee-lock-banner--hidden`, focus-ring resets on
  `.sharpee-chat-input`.
- No colors, fonts, or theme-specific visuals declared in `base.css`
  for any new class.

### Theme migration

- Zifmia's bundled themes (whichever ADR-170 themes ship in the
  Zifmia client) target only `.sharpee-*` selectors after multi-user
  styling is added.
- A theme that omits styling for a multi-user contract class
  produces a visible defect in the multi-user client. This is
  acceptable — the contract is "every multi-user theme styles every
  multi-user class."

### JS-side stability

- The Phase 6 web client's `MultiUserClient` (or equivalent
  manager) accepts a stable elements shape. Every property resolves
  to a non-null DOM node after the page renders.
- Lock state transitions (`lock:state` WS messages) toggle
  `.sharpee-input-bar--locked` and `.sharpee-input-bar--locked-by-me`
  exactly per ADR-175 §AC-10.
- Presence updates (`presence:update`) re-render
  `.sharpee-presence-list` items.
- Chat messages (`chat:message`) append to `.sharpee-chat-history`;
  the `--self` modifier is applied when `from.identityId` matches
  the local participant.

### Rendering edge cases

The renderer must produce a defined output for these wire conditions
even though they're inside the contract rather than a hard
"rejection":

- A `chat:message` from an `identityId` not present in the local
  participant set still renders a `.sharpee-chat-message` row; the
  `--self` modifier evaluates to false (no special styling).
- A `presence:update` with an empty roster renders
  `.sharpee-presence-list` as an empty list (not `--hidden`); panel
  chrome remains visible so observers see "no one connected" rather
  than the panel disappearing.
- On `lock:state {holder: null}` the `.sharpee-input-bar--locked`
  modifier is removed and `.sharpee-lock-banner--hidden` is added in
  the same render frame, so the input never appears unlocked while
  the banner still shows the prior lock holder.
- A `room:restored` event renders its notice via the surface chosen
  in OQ-1 (see Open Questions below); until that question resolves,
  the notice may be deferred to a console log without breaking the
  contract.

### Smoke test

- Browser human smoke-test (Phase 6 of the ADR-175 plan): two
  browsers join the same room. Each sees the other in the presence
  roster (`.sharpee-presence-item`); chat messages cross-render
  (`.sharpee-chat-message`); when one focuses the input, the other
  sees `.sharpee-input-bar--locked` + `.sharpee-lock-banner`
  visible; on submit, the input unlocks for both.

### Failure modes

- A theme that adds rules outside the `.sharpee-*` namespace and
  collides with another theme's rules produces visible bleed. Themes
  scope their rules under `[data-theme="<id>"]`; rules outside that
  scope are theme-author's responsibility — same posture as
  ADR-170.
- A theme that styles `.sharpee-presence-item` without a `--self`
  rule produces "all participants look identical" — usable but
  unhelpful. The contract requires the modifier be styled, not that
  it be styled distinctively; the latter is a theme-quality concern.

## Open Questions for Implementation

These do not block ACCEPTED status — the contract for the 14 named
classes is decidable today — but each needs a resolution before the
relevant Phase 6 surface ships.

### OQ-1 — `room:restored` notice surface

**Question:** When `room:restored` fires (a participant rolled the
room back to a named save; the transcript window was rewound), where
does the notice render?

**Options:**
- Reuse `.sharpee-lock-banner` shape (transient overlay, banner
  styling) with a dedicated state modifier such as
  `.sharpee-lock-banner--restored`. Lower vocabulary cost; couples
  two unrelated UX events to the same surface.
- Dedicated `.sharpee-room-restored-banner` class with its own
  `--hidden` modifier. Cleaner separation of concerns; +1 class on
  the contract.

**Resolves before:** Phase 6 restore-from-named-save UI.

### OQ-2 — `--joined` modifier on `.sharpee-lobby-item`

**Question:** Does a participant ever observe more than one room
simultaneously, requiring a "joined" visual marker on lobby rows?

**Default:** No. ADR-175 §4 v1 product surface is single-room-at-a-
time; the lobby is the entry view, not a live multi-room dashboard.

**Resolves before:** Any feature that lets a participant observe a
room without being its current focus (multi-room sidebar, room
switcher).

### OQ-3 — Avatar wire surface

**Question:** Do identities have avatars, and if so, does
`presence:update` carry them?

**Default:** No avatars in v1. The `.sharpee-presence-avatar`
decoration slot exists so themes can synthesize visual treatment
(initial glyph, generated emoji) from the handle alone.

**Resolves before:** Any feature that ships per-identity avatar
images. The wire decision (whether `presence:update` carries an
avatar URL or asset reference) is upstream of any class decision.

## Session

Produced in session `2026-05-12 00:38` (branch `main`, after Phase 5
of the ADR-175 implementation plan landed). Drafted at Phase 5 exit
per the plan's recommendation: pin the multi-user vocabulary before
Phase 6 begins so the web client implementation has a stable contract
to target rather than inventing one mid-build.

Three rounds of review applied 2026-05-12: added Implementation
location subsection (clarifying that package layout is a Phase 6
choice, not an ADR-176 commitment); added Rendering edge cases under
Acceptance Criteria (covering wire conditions inside the contract);
added Open Questions section enumerating OQ-1 through OQ-3 (none
blocking ACCEPTED status, each gated to a future Phase 6 surface).

## References

- **ADR-170** — Component-Based Theming for the Browser Client; the
  contract this addendum extends.
- **ADR-175** — Zifmia Multi-User Product; the wire shapes
  (`presence:update`, `chat:send/message`, `lock:acquire/release/state`,
  `turn:broadcast`, `room:restored`) the multi-user vocabulary
  renders.
- **ADR-163** — Channel-Service Platform; the underlying
  author-customizable-UI direction.
- `docs/work/zifmia/plan-20260511-adr-175.md` — Phase 6 entry-state
  expects this ADR to be ready before the web client begins.
- `feedback_web_client_author_customizable` (memory) — the
  long-running direction extending platform UI defaults to every
  channel and surface.
- `feedback_no_abbreviations` (memory) — naming rule applied to the
  new vocabulary.
- `project_channels_universal_ui_surface` (memory) — channels carry
  ALL story→UI signals; the multi-user surfaces are channel
  consumers, not exceptions to that rule.
- `feedback_multiuser_vs_multiplayer` (memory) — terminology
  ("multi-user" throughout, never "multi-player").

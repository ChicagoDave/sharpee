# ADR-176: Multi-User Component Vocabulary (Addendum to ADR-170)

## Status: ACCEPTED

## Date

- 2026-05-11 — initial draft (PROPOSED)
- 2026-05-12 — expanded draft, reviewed, ACCEPTED
- 2026-05-12 — consolidated into a single canonical document

## Consolidates

This file supersedes two earlier drafts that briefly coexisted in the
ADR directory: an initial PROPOSED draft from 2026-05-11 (six classes
+ one modifier; lobby/admin held out as feature-private) and an
expanded ACCEPTED draft from 2026-05-12 (fourteen classes + six
modifiers + decoration slots; lobby/saves/identity promoted into the
contract). The expanded scope is correct — Zifmia v1 ships those
surfaces, and the author-override principle in
`feedback_web_client_author_customizable` requires the whole
multi-user surface to be theme-customizable, not just chat and
presence. This file carries the expanded scope forward while
preserving the invariants and acceptance criteria from the earlier
draft that were not represented in the v2 text (Invariants section;
AC-5 System 6 #111 regression guard; AC-6 no-framework guarantee;
explicit AC for manager-class ownership of state toggling).

## Builds on

- **ADR-170** — Component-Based Theming for the Browser Client.
  Establishes the 22-class `.sharpee-*` component contract for the
  single-player browser chrome (window shell, menu bar, prose pane,
  input bar, dialog). ADR-176 *extends* that vocabulary additively;
  it does not modify or reorganize the existing 22 classes.
- **ADR-175** — Zifmia Multi-User Product Surface and Rebuild.
  Defines the wire shapes (`presence:update`, `chat:send/message`,
  `lock:acquire/release/state`, `turn:broadcast`, `room:restored`)
  and the v1 product surface (lobby, room participation, chat,
  presence, lock-on-typing, named saves, admin pages) that the new
  components render.
- **ADR-164** — Stateless Multi-User Server. Defines the
  server-sourced channels (`chat`, `presence`, `command_echo`) whose
  rendered output these new vocabulary classes house.
- **ADR-163** — Channel-Service Platform. The data path from engine
  to renderer; the multi-user surfaces inherit the same
  author-customizable contract as the single-player ones.
- `feedback_web_client_author_customizable` — "platform ships UI
  defaults for every channel/surface; authors override per-story;
  wire is data-only, never assume locked-in client choices."
- `feedback_no_abbreviations` — naming rule applied to the new
  vocabulary.
- `feedback_multiuser_vs_multiplayer` — terminology ("multi-user"
  throughout, never "multi-player").
- `project_channels_universal_ui_surface` — channels carry ALL
  story→UI signals; the multi-user surfaces are channel consumers,
  not exceptions to that rule.

## Corrects

ADR-170 §"Doesn't touch" said:

> The Zifmia React client. Zifmia has its own theme system and is out
> of scope.

That carve-out is obsolete. ADR-175 settled that Zifmia is the
multi-user web product (not a React client), and the 2026-05-11
Phase 2 spike (`spikes/zifmia-renderer/findings.md`) settled that
Zifmia matches `packages/platform-browser/`'s framework-free pattern.
Zifmia therefore reuses ADR-170's component vocabulary and theme
files, with this ADR's additions covering the multi-user surfaces.

## Context

ADR-170's 22 classes cover: window shell, title bar, menu bar +
dropdowns, status bar, prose pane, input bar, native `<dialog>`
modals. That set is complete for single-user IF play.

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

Three implementation paths existed:

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

The initial draft scoped option C to only the universal multi-user
concerns (chat, presence, lock) and kept lobby/saves/identity
feature-private — matching the `packages/platform-browser/`
precedent where `.save-slot` and `.no-saves-message` are
feature-private. That scoping was reconsidered: per
`feedback_web_client_author_customizable`, the **whole** Zifmia
surface — lobby, named saves, identity form — must be
author-customizable per story, and the only way to honor that is
to promote those surfaces into the contract too. The expanded scope
below is the final shape.

## Decision

Extend ADR-170's component vocabulary additively with **14 new
component classes**, **six new state modifiers**, and **three new
decoration slot elements**.

### Component classes (14)

The vocabulary is grouped by surface. Every class is in the same
`.sharpee-*` namespace as ADR-170; no abbreviations
(per `feedback_no_abbreviations`); the JS layer queries by id for
individual controls and by class for generic affordances.

#### Presence (3 classes)

| Class | Purpose |
|---|---|
| `.sharpee-presence-panel` | Container holding the connected-identity roster. Theme owns position (sidebar / corner / top strip), border, and background. |
| `.sharpee-presence-list` | Semantic list element (`<ul>`) inside the panel. Theme owns row spacing and dividers. |
| `.sharpee-presence-item` | One identity row. Theme owns hover state, the leading avatar slot (decoration), and the handle typography. |

#### Chat (4 classes)

| Class | Purpose |
|---|---|
| `.sharpee-chat-panel` | Container for the per-room chat area. Theme owns position and chrome. |
| `.sharpee-chat-history` | Scrollable region holding the message rows. Base CSS owns the `overflow-y: auto` + scroll-pin-to-bottom behavior; theme owns visual treatment. |
| `.sharpee-chat-message` | One `chat:message` row. Theme owns row layout, attribution typography, and timestamp formatting. |
| `.sharpee-chat-input` | The input element used to send chat (`chat:send`). Distinct from `.sharpee-input-bar` so the two never collide visually or behaviorally. |

#### Lock-on-typing (1 class)

| Class | Purpose |
|---|---|
| `.sharpee-lock-banner` | Element rendered above or below `.sharpee-input-bar` when another participant holds the lock; surfaces "Alice is typing…" or equivalent. Hidden in default state via the `--hidden` modifier. |

The lock state on the participant's *own* input bar is conveyed via
state modifiers on the existing `.sharpee-input-bar` (see below) —
not via a new class.

#### Lobby (3 classes)

| Class | Purpose |
|---|---|
| `.sharpee-lobby` | Page-level container for the unauthenticated / between-rooms entry view. Theme owns whole-page layout. |
| `.sharpee-lobby-list` | List of joinable rooms returned by `GET /rooms`. |
| `.sharpee-lobby-item` | One room row (title, story, participant count). |

#### Named saves (2 classes)

| Class | Purpose |
|---|---|
| `.sharpee-saves-panel` | Container holding the named-save list and the create-save affordance. Surfaced from a menu or as a side panel — theme owns placement. |
| `.sharpee-saves-item` | One named-save row (label, atTurn, createdBy). |

Note: a `.sharpee-saves-list` element (the `<ul>` between panel and
item rows) is implicit from the semantic-HTML guidance below;
themes that want to style row spacing target it under the same
contract.

#### Identity (1 class)

| Class | Purpose |
|---|---|
| `.sharpee-identity-form` | The login/register form scaffold. Theme owns field layout, button placement, and error-state visuals. |

### State modifiers (additive to ADR-170's set)

| Modifier | Applies to | Meaning |
|---|---|---|
| `--locked` | `.sharpee-input-bar` | Another participant holds `lock:acquire`; this participant's input is read-only. |
| `--locked-by-me` | `.sharpee-input-bar` | This participant holds the lock; theme may signal active typing visually (e.g., focus-tinted border). |
| `--self` | `.sharpee-presence-item`, `.sharpee-chat-message` | Row represents this participant — theme may bold or accent. |
| `--admin` | `.sharpee-presence-item` | Identity has the `is_admin` bit (per ADR-175 OQ-3); theme may add a marker. |
| `--system` | `.sharpee-chat-message` | Server-emitted system message (e.g., "Alice joined") rather than a participant message. |
| `--hidden` | `.sharpee-lock-banner`, `.sharpee-lobby`, `.sharpee-saves-panel`, `.sharpee-presence-panel`, `.sharpee-chat-panel` | Visibility (default state for transient surfaces). The `--hidden` modifier from ADR-170 is reused — same semantics. |

State modifiers are part of the contract. JS toggles them; every
theme must style each documented modifier.

### Decoration slots (additive to ADR-170's set)

Three slot elements are first-class members of the contract:

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
  `.sharpee-lobby-list`, and the implicit saves list inside
  `.sharpee-saves-panel` (list semantics for screen readers and
  keyboard navigation).
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

Phase 6a (2026-05-12) settled this choice in favor of the dedicated
`tools/zifmia/web/` carve-out; both options remain valid under the
ADR.

## Invariants

These hold across every multi-user surface this vocabulary covers.

- **Additive only.** Nothing in ADR-170's 22-class vocabulary is
  modified, renamed, or removed. The combined contract is
  22 + 14 = **36 classes**.
- **No framework.** New classes are queried by `.sharpee-*`
  selectors and styled by CSS; manager classes
  (`ChatManager`, `PresenceManager`, `LockManager`, `LobbyManager`,
  `SavesManager`, `IdentityManager`) toggle state via class modifiers.
  No React, Lit, Preact, Shoelace, or any other UI framework /
  component library is introduced. Per `project_web_ui_framework_free`
  and the Phase 2 spike outcome.
- **No shadow DOM.** Light DOM only; theme CSS must penetrate. Same
  rule as ADR-170.
- **Native primitives where they exist.** No new affordance
  introduces a custom-element substitute for a native HTML5 element.
  `<ul>`, `<li>`, `<form>`, `<dialog>` are mandated where applicable
  (see Semantic HTML adoption).
- **Stable contract.** Once any theme styles one of these new
  classes, removing or renaming the class is a breaking change
  requiring an ADR amendment. Adding a class is safe (existing
  themes leave it unstyled).
- **JS owns state toggling.** Manager classes own DOM mutation and
  modifier toggling. Themes never read or write DOM state; theme
  CSS only reacts to the state the managers express.

## Acceptance Criteria

### Contract

- All 14 new component classes documented above appear in the Zifmia
  web client's DOM after Phase 6 of the ADR-175 implementation plan.
- Every documented state modifier (`--locked`, `--locked-by-me`,
  `--self`, `--admin`, `--system`, plus the reused `--hidden`) is
  applied by JS where appropriate and styled by every multi-user
  theme.
- Both new decoration slot families (`.sharpee-presence-avatar`,
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

### Manager-class ownership

- New manager classes in the Zifmia client own DOM construction and
  modifier toggling for their surface. Each manager:
  - Queries the DOM by stable id (for unique controls) and `.sharpee-*`
    class (for generic affordances). No JS reaches into theme-private
    DOM.
  - Owns the toggling of every state modifier listed for its surface.
  - Does not introduce inline CSS, computed styles, or
    framework-imposed wrappers around the contract classes.

### Theme migration

- Zifmia's bundled themes (whichever ADR-170 themes ship in the
  Zifmia client) target only `.sharpee-*` selectors after multi-user
  styling is added.
- A theme that omits styling for a multi-user contract class
  produces a visible defect in the multi-user client. This is
  acceptable — the contract is "every multi-user theme styles every
  multi-user class."

### JS-side stability

- The Phase 6 web client's manager surface accepts a stable elements
  shape. Every property resolves to a non-null DOM node after the
  page renders.
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

### System 6 newline regression guard (from v1 AC-5)

- GitHub issue [#111](https://github.com/ChicagoDave/sharpee/issues/111)
  identified that System 6 currently doubles newlines in the prose
  pane. The chat panel must not inherit the same bug. Whichever fix
  lands for #111 must be verified to also produce single-spaced
  output in `.sharpee-chat-panel` and `.sharpee-chat-message`.

### No framework dependency (from v1 AC-6)

- `package.json` for the Zifmia client adds no React, Lit, Preact,
  Shoelace, or any other UI framework / component library. The
  manager classes are plain TypeScript. Per
  `feedback_check_dep_health_before_recommending` and the Phase 2
  spike outcome.

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

**Default:** No. ADR-175 §4 v1 product surface is
single-room-at-a-time; the lobby is the entry view, not a live
multi-room dashboard.

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

## Consequences

### Positive

- **Zifmia inherits all five themes for free.** Once Phase 6 updates
  each theme file to cover the new classes, every Zifmia user gets
  System 6, DOS Classic, Modern Dark, Retro Terminal, and Paper as
  drop-in selections — same `[data-theme="<id>"]` attribute flip,
  same `ThemeManager` mechanism.
- **Zero new dependency surface.** No library to age out; no
  framework version to chase; no Shoelace-archive class of risk.
- **Author-override path covers the whole multi-user surface.**
  Authors can re-skin chat, presence, lobby, saves, and identity for
  their story by shipping a theme that targets the contract classes
  — no per-author DOM rewriting, no fork of the platform shell.

### Negative

- **Five theme files need updates** before Zifmia v1 can ship. Each
  theme owner (currently a single repo author) does one pass per
  theme — roughly half a day each per ADR-170's tuning estimate.
- **Vocabulary grew by ~64%.** From 22 to 36 classes. Still
  modest. Future additions face the same "is this a universal
  contract concern?" filter.

### Constrains future sessions

- **The combined contract is a stable platform commitment.** Adding
  a class is safe (existing themes leave it unstyled); removing or
  renaming a class is a breaking change requiring an ADR amendment.
- **Multi-user UI joins the contract.** A future Sharpee surface
  that exposes chat or presence MUST use these classes; rolling its
  own vocabulary divides the theme work and is an anti-pattern.
- **Lock semantics in CSS.** `.sharpee-input-bar--locked` is the
  expected representation of "another participant holds the lock."
  A future product that wants a different lock model (e.g.,
  per-participant locks) extends or adds modifiers but does not
  redefine `--locked`.
- **The lock-on-typing UX is split across two surfaces**: the
  observer's `.sharpee-input-bar--locked` (their own input goes
  read-only) and the `.sharpee-lock-banner` (textual affordance).
  Themes own visual coherence between the two.
- **Chat is a first-class surface separate from prose.** Themes that
  want them visually unified (e.g., chat woven into the prose stream
  like a MUD) must do so by styling — the DOM keeps them separate.
- **Author-shipped multi-user themes** (a future affordance via
  ADR-171's dynamic theme loading) target the combined 36-class
  contract.

### Forecloses

- **Per-theme markup for chat / presence / lobby / saves / identity.**
  The DOM is single and stable; themes vary only in CSS. Same
  constraint as ADR-170 §"Option C foreclosed."
- **Shadow-DOM custom elements for the new classes.** Theme CSS must
  penetrate; light DOM only.
- **Embedding chat into `.sharpee-prose-pane`.** The two surfaces
  are separately classed; mixing them was option B, explicitly
  rejected.
- **Per-surface JS reaching into theme-private DOM.** The same
  query-by-id-or-contract-class rule from ADR-170 applies.
- **Communicating lock state via a presence-panel modifier alone**
  (e.g., `.sharpee-presence-item--typing`). The lock-on-typing UX
  needs a banner element so the affordance is visible without
  requiring the participant to look at the roster; the modifier
  alone is insufficient.
- **Bundling per-story multi-user UI overrides as a separate file
  format.** Authors override via the same theme CSS file — single
  contract, single artifact type.

### Doesn't touch

- ADR-170's 22 classes, modifiers, decoration slots, or JS
  conventions.
- ADR-163's channel-service architecture or `media.*` event
  vocabulary. This is visual chrome over the data flow ADR-163
  defines.
- ADR-165's renderer architecture. Multi-user surfaces still flow
  through renderers; the contract narrows what classes that DOM
  uses. `ChannelRenderer` instances feed the manager classes; the
  manager classes own the DOM.
- ADR-175's wire shapes. The vocabulary renders the wire; the wire
  itself is unchanged.
- The single-user platform-browser client. ADR-170's 22 classes are
  unchanged.
- Story content, action handlers, world model, parser. Pure UI
  contract change.
- The CLI / TUI client. Multi-user UI is a browser concern.

### Future affordance: per-story chat theming

ADR-171 (dynamic per-theme CSS loading, deferred) plus this addendum
together unlock author-shipped per-story multi-user themes. A story
can ship a complete kit including chat panel chrome, presence roster
styling, and lock affordance — without rewriting the DOM and without
depending on platform-private classes. ADR-176 makes the contract;
ADR-171 makes it shippable.

## Session

- **2026-05-11 (Phase 2 exit)** — David surfaced that ADR-170's
  22-class vocabulary doesn't cover chat / presence / lock state and
  asked for a follow-up ADR before any client code in Phase 6
  begins. Initial draft (PROPOSED) committed as `384bba22`, sized to
  six classes + one modifier and held lobby/saves/identity as
  feature-private.
- **2026-05-12 (Phase 5 exit)** — Expanded draft committed as
  `dd4775c0` and accepted same day after a single-ADR `/adr-review`
  pass. Expanded scope promoted lobby/saves/identity into the
  contract (matching `feedback_web_client_author_customizable`),
  added decoration slots, semantic HTML guidance, an implementation
  location subsection, rendering edge cases, and OQ-1/2/3.
- **2026-05-12 (Phase 6a entry)** — Audit found the two drafts
  living side-by-side under near-identical filenames. This file
  consolidates them under the correct hyphenated filename per
  `feedback_no_abbreviations`, carrying the expanded scope forward
  and re-incorporating the Invariants section, System 6 #111
  regression guard (AC-5 in v1), no-framework guarantee (AC-6 in
  v1), and explicit manager-class ownership AC that were present in
  the earlier draft but missing from the expanded one.

## References

- **ADR-170** — Component-Based Theming for the Browser Client; the
  contract this addendum extends.
- **ADR-175** — Zifmia Multi-User Product; the wire shapes
  (`presence:update`, `chat:send/message`, `lock:acquire/release/state`,
  `turn:broadcast`, `room:restored`) the multi-user vocabulary
  renders.
- **ADR-164** — Stateless Multi-User Server; server-sourced
  channels.
- **ADR-163** — Channel-Service Platform; the underlying
  author-customizable-UI direction.
- **ADR-171** — Dynamic per-theme CSS loading (deferred); the
  future affordance for author-shipped multi-user themes.
- `packages/platform-browser/src/managers/` — pattern for the
  Zifmia manager classes that toggle the new state modifiers.
- `spikes/zifmia-renderer/findings.md` — Phase 2 outcome that
  established Zifmia matches the platform-browser pattern.
- `docs/work/zifmia/plan-20260511-adr-175.md` — Phase 6 entry-state
  expects this ADR to be ready before the web client begins.
- `docs/work/zifmia/plan-20260512-phase-6.md` — Phase 6 sub-phase
  plan; 6a (web scaffold + identity flow) ships the first contract
  class (`.sharpee-identity-form`).
- `feedback_web_client_author_customizable` — long-running direction
  extending platform UI defaults to every channel and surface.
- `feedback_no_abbreviations` — naming rule applied to the new
  vocabulary; also the reason this file uses the hyphenated
  filename.
- `feedback_multiuser_vs_multiplayer` — terminology ("multi-user"
  throughout, never "multi-player").
- `project_channels_universal_ui_surface` — channels carry ALL
  story→UI signals; the multi-user surfaces are channel consumers,
  not exceptions to that rule.
- `project_web_ui_framework_free` — framework-free posture
  reaffirmed.
- GitHub issue [#111](https://github.com/ChicagoDave/sharpee/issues/111)
  — System 6 newline-doubling bug; the System-6 regression guard AC
  ensures the fix covers the new chat surfaces.

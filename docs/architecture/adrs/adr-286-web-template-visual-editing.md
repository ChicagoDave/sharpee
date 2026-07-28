# ADR-286: The Web Template — a simple layout syntax, transformed into the page

## Status: ACCEPTED (2026-07-28, session fda0f0 — David's accept-all after the full-family review; Q-5 label delivery deferred as non-blocking, ruled at implementation)

*(Filename note: `adr-286-web-template-visual-editing.md` predates the reshape — kept for link stability; the visual-editing concern dissolved into the DSL.)*

## Date: 2026-07-27

## Parent: ADR-280 (project model — names the Web Template artifact), ADR-253 (D3: story-local `browser/index.html` override — becomes the escape hatch), ADR-163 (channels — the boxes bind to them), ADR-170/platform-browser (the framework-free client being laid out), ADR-284 (publishing — runs the transform). Platform change: the transform lands in the devkit browser build.

## Context — verified, not assumed

- **The override mechanism exists** (conventionally cited as ADR-253 D3
  — the code's own citation; ADR-253's *written* D3 described the
  package path this ADR supersedes, see Consequences): a story-local
  `browser/index.html` is used by the build when present
  (`browser-core.ts:693-699`), validated warning-only by
  `validateCustomPage` (engine.css link + one element per story-declared
  **data** channel); `browser/<id>.css` is the styling override surface.
- **Raw HTML makes the common case hard and the failure silent**: the
  client self-heals missing mount points into hidden elements
  (`ensureHidden`, `BrowserClient.ts:402-452`), so deleting a slot
  silently breaks media/status for readers; the build applies token
  substitution and theme-link injection authors can't see; and adding a
  box for a **custom channel** — the thing authors most legitimately
  want (ADR-163: channels carry all story→UI signals) — requires
  hand-rolling HTML that keeps all of the above intact.
- **The earlier draft of this ADR** answered raw HTML's dangers with
  protected-region markings + validation. David's ruling (2026-07-27):
  make the common case a **layout syntax** instead — invalid pages become
  inexpressible, and the contract machinery is only needed at the escape
  hatch.

## Decision

### D1 — The Web Template's primary form is a layout file

A small, declarative layout syntax describes the page as **boxes**.
Arrangement is rows and side-by-side splits: line order is vertical
order, `|` splits a row. The default template is expressible in it — so
the ADR-280 seed is a layout file, not HTML.

**The authoritative spec is David's design doc**
(`docs/design/template-dsl/design.md`) — a **work in progress**: syntax
details are its to evolve and freeze at implementation time, not this
ADR's. Current sketch (2026-07-27):

    template standard

        declare
            font "Baskerville"
            font-size 18

        game-title
        < room-name > score | turn

        main-column scrolling 75% :: info-column fixed 25%

        main-column
            main-text
            right-embedded-image floating right wrap 30%
            left-embedded-image floating left nowrap 20%

        info-column
            compass top

        command-line

    end template

Scope-level rulings this ADR does fix:

- **Templates are named blocks** (`template <name> … end template`) in
  **one story-level file: `<storyId>.templates`**, beside the `.story`
  file (Q-2 resolved 2026-07-27) — plural extension because one file
  holds all of a story's templates; "standard" is the conventional
  default. `browser/` retains exactly two meanings: the css styling
  escape and the raw-HTML page escape (D3). Named templates make
  mid-story presentation switching *expressible* (the ADR-163 layout
  channel is the natural wire); switching ships in v1 (D4).
- **A `declare` section** carries font and font-size. The color axis
  stays with the theme system (reader-controlled light/dark); the css
  override remains the styling escape hatch beyond declarations.
- **Identifiers are hyphenated, spelled-out names** (`room-name`,
  `command-line`) — the standing naming convention.
- **Rows** are top-level lines in vertical order; `::` separates
  columns; `|` separates items in a group; `<`/`>` are left/right
  adjustment markers.
- **Named containers** carry explicit **`scrolling`/`fixed`** behavior
  and percentage widths; contents defined by indented blocks.
- **Named image slots** embed in a column with float side,
  **`wrap`/`nowrap`**, and size (`right-embedded-image floating right
  wrap 30%`) — a story may declare several. They realize ADR-216's
  existing `show image <asset> [in <layer>]` clause: the template's
  image slots are the layer names, so stories target them with syntax
  that already ships. Layers without a template box fall back to the
  z-stacked media mount (today's behavior), and a bare `show image`
  targets the `main` layer as today — no image ever has nowhere to go.
- **Slots carry their own labeling** (David's ruling): `score` renders
  as "Score: 100" — the layout file contains **no literal text**, pure
  structure. Labels move from today's hardcoded renderer strings
  (`channels/status.ts`) into lang-layer messages delivered to the
  client; story-overridable through the message mechanism, so
  localization needs no layout changes. **The delivery mechanism is
  Q-5** — an honest open question, not an implementation detail.
- **No slot manifest**: usage is the declaration. Unknown names are
  compile errors against the known set — standard slots, the story's
  declared channels, and names the template itself introduces
  (containers by their indented block, image slots by their `floating`
  clause); a mount for every channel the story uses is owed by the
  transform, not the author. An owed mount for a channel the template
  never places renders via the **generic-panel fallback (ADR-253 D4) —
  visible, never hidden** — with a transform warning naming the unplaced
  channel (absorbing ADR-252's warn semantics, not just its error). The
  transform likewise **warns when a template image slot matches no layer
  the story declares** (the z-stack fallback is for deliberate omission,
  not typos), and diagnoses **orphan containers** (a container named in
  a row with no indented block, or a block whose name appears in no
  row — the typo'd-container case).
- The standard slot vocabulary (e.g. `room-name`, `command-line`) is
  **owned by the design doc** — the ADR deliberately does not carry a
  second copy of the list.

Several standard boxes (room-name, score, turn) are finer-grained than
today's composite status slot; the transform's mapping onto
platform-browser's mounts — including any sub-slot mounts the client
must newly expose — is verified at implementation and is part of this
ADR's platform change. (Whether `time` joins the standard set is the
design doc's call — it appears in neither the doc's slots list nor any
existing mount.)

### D2 — The build transforms layout → page; correctness is by construction

The devkit browser build compiles the layout file into `index.html`:
every bound channel gets its mount element, **following the client's
existing id conventions** (`sharpee-*` ids for standard slots,
unprefixed `#<channel>` + `data-channel` for story channels per ADR-253
D2 — the transform invents no new convention); engine.css and theme
links are emitted, token substitution happens inside the transform —
none of it author-visible, none of it author-breakable. **The transform
always emits the standard window chrome** — title bar, menu bar
(save/restore/restart, theme picker), and dialogs — around the described
layout: the layout file describes the content region only, chrome is not
a slot and not the template's business (the raw-HTML escape remains the
path for chrome changes). Layout errors are ordinary compile
diagnostics in the existing gate/Problems surfaces (Chord's mental
model, inherited). Styling is **not** this language's business:
`browser/<id>.css` remains the styling surface, now with stable,
generated structure to style against.

### D3 — The story block declares the output target (Q-3 resolved 2026-07-27, session fda0f0)

The story block declares which presentation source the build uses —
working forms: **`use templates`** (the `<storyId>.templates` file) or
**`use html`** (the raw `browser/index.html` escape hatch, ADR-253 D3,
warning-level `validateCustomPage` as today). **File presence decides
nothing** — no precedence rules, no both-present ambiguity: the
declaration is the single selector. Undeclared defaults to `use
templates`; with no `.templates` file either, the platform's default
template applies (today's behavior). **Either declaration naming a
missing source is a compile error** — explicit `use html` with no
`browser/index.html`, explicit `use templates` with no `.templates`
file — as is a malformed `.templates` file. The presence check runs in the
devkit browser build (chord is filesystem-free); headless `sharpee test`
never fails on a missing presentation source.

### D4 — Template switching ships in v1 (Q-4 resolved 2026-07-27, session fda0f0)

A story switches templates mid-game with a Chord sugar statement
(working form: `use template <name>`), lowering onto a layout-channel
emit — the ADR-216 pattern (`play sound` → `media.*`), on a signal kind
ADR-163 already defines. All templates compile at build time; switching
never compiles at runtime. The client swaps the active structure and
**re-parents live channel content** into the new template's mounts —
prose scrollback, status values, and mounted images are story state, not
template state, and survive the swap. The switch is an emitted event, so
event-sourced saves replay it (a save made in `dream` restores into
`dream`). A replayed switch naming a since-removed template is ignored —
the active template stands. Boot uses `standard`, and a `.templates`
file **must** contain
a `standard` block — its absence is a compile error. `use template`
naming an unknown block is a compile error listing the file's templates
(the same typo-checking declared assets get). The switch signal is not
capability-gated (unlike ADR-163's `splitPane`-gated layout configure);
non-browser clients realize a switch within their own capabilities, down
to ignoring it.

## Acceptance

1. A story with a layout file declaring a custom channel box builds; the
   page mounts the custom channel where declared; publish (ADR-284) ships
   it working — end to end, no hand-written HTML.
2. The default layout file produces a page functionally identical to
   today's default template (a test pins the mount-point set).
3. A layout naming an unknown channel fails the build with a diagnostic
   naming the known channels; a story using a channel with no box gets
   its mount point placed by the transform anyway (correct by
   construction, pinned by test).
4. Output-target declaration honored: `use html` renders through
   `browser/index.html` (warnings intact) even when a `.templates` file
   exists, and vice versa; `use html` with the file missing fails the
   build with a named error.
5. A story with `template standard` and `template dream` switches
   mid-game via the Chord statement: the page restructures, the prose
   scrollback and mounted images survive the swap, and a save made under
   `dream` restores under `dream` (switching pinned end-to-end).
6. `use template` naming an unknown template fails the build with a
   diagnostic listing the `.templates` file's blocks.

## Consequences

- **ADR-252's `template:` header field** (the template half of its
  2026-07-22 amendment) **and ADR-253's written D3** (package-placement
  path) are **superseded for layout by this ADR** — retired
  unimplemented; their channel-validation semantics are absorbed by the
  transform's diagnostics (D2). `theme:` is unaffected. If template
  *packages* are ever revived, they enter through D3's declaration
  surface (plausibly as distributed `.templates` files — a future ADR's
  problem, anchored here). Pointer notes go on 252/253 at acceptance.
- The platform change spans: the devkit browser build (the transform),
  `platform-browser` (template swap + content re-parenting, any new
  granular mounts — `game-title`, `time`, `compass` have no mount or
  channel today), `chord` (the `use templates`/`use html` declarations
  and `use template <name>` sugar), and `lang-en-us` + client label
  delivery (D1's labeling ruling).
- The devkit browser build grows a small compiler (parse layout → emit
  page). The seeded Web Template becomes a friendly five-line file.
- The GrapesJS/external-editor question from the earlier draft dissolves
  for the primary tier — visual editing, if ever wanted, targets the
  layout syntax in-app; external HTML editors remain relevant only at the
  escape hatch.
- ADR-280's Web Template artifact description updates to "layout file
  (+ optional raw-HTML escape)"; ADR-284's publish validation reduces to
  the transform's own diagnostics plus the escape hatch's warnings.
- The syntax joins the book/reference docs; its vocabulary starts minimal
  and earns additions (the Chord grammar discipline).
- Migration: fernhill declares `use html` (the repo's sole
  `browser/index.html`). The build warns when `browser/index.html`
  exists but the effective target is templates — a present-but-unused
  page is almost always a missing declaration.

## Deferred questions (non-blocking, ruled at implementation)

### Q-5: How do slot labels reach the client?
- **Why it matters**: D1 rules that slots carry their own labeling from
  lang-layer messages, but channel payloads are data-only and no
  mechanism today carries lang-layer text to client-side channel
  renderers. Candidates: a boot-time label packet emitted by the build
  from lang-layer messages, or labels riding channel registration. The
  choice touches lang-en-us, the wire, and platform-browser.
- **Blocks**: D2's status-row emission; the labeling half of D1.

## Session

Drafted, reviewed, and reshaped 2026-07-27, session fda0f0; layout-syntax
ruling replaced the protected-region contract after David's "simple
layout syntax" direction (`docs/context/session-20260727-2100-main.md`).

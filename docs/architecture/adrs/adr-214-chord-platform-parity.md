# ADR-214: Chord Authoring Parity with the Sharpee Platform (100% Sharpee == 100% Chord)

## Status: ACCEPTED (2026-07-14 — all six open questions resolved via interview; accepted by David)

> Drafted 2026-07-14 from the standard-library reference work (session
> 95d692). Starting an author-facing stdlib reference surfaced that Chord
> v1's composable vocabulary is a small closed set and most of the
> platform's standard library is not reachable from a `.story` file.
> David's response set the north star recorded here: **100% Sharpee ==
> 100% Chord** — every standard action, daemon, plugin, and
> platform-browser emit must be authorable in Chord. This ADR follows
> David's standing instruction (ADR-213 precedent): Sharpee API gaps
> surfaced by Chord get raised as ADRs. Backed by a code investigation —
> the action portion (Part 1) is a complete `validate()`-grounded audit;
> daemons/plugins/emits (Parts 2–4) are audited at the capability level.
> Full audit: `docs/work/stdlib-reference/chord-availability-audit.md`.

## Date: 2026-07-14

## Terminology

- **Composable vocabulary** — the closed set of words a Chord author may
  write in a `create` block: the v1 **kind nouns** (`room`, `door`,
  `person`, `container`, `supporter`) and **trait adjectives** (`scenery`,
  `wearable`, `readable`, `openable`, `lockable`, `switchable`, `edible`,
  `pushable`, `pullable`, `light-source`, `plural`, `dark`), enumerated in
  `packages/chord/src/catalog.ts`. Anything else is a load error.
- **Reachable** — a platform capability is *reachable* from Chord when a
  `.story` file with no TypeScript hatch can produce it.
- **Parity gap** — a platform capability that is not reachable.
- **Grammar ratchet** — the one-way governance log
  `docs/architecture/chord-grammar-changes.md` (ADR-210): every change to
  the composable vocabulary or Chord syntax is a dated, owner-approved
  entry.

## Context

ADR-210 introduced Chord as Sharpee's story language, with the explicit
aim that an author writes `.story` files instead of TypeScript against the
platform API. The escape hatches (`define text|action|behavior … from`)
exist for genuine gaps, and hatch count is meant to be a *language-gap
metric* (design.md §5.6) — the pure-IR profile is the scoreboard.

The standard-library reference work audited how much of the platform Chord
actually reaches. The finding: the composable vocabulary is 17 words, and
large parts of the standard library sit behind traits and subsystems that
word set cannot name. Concretely (Part 1, from each action's `validate()`):

- **42 of 49 standard actions are reachable today**; 1 is partial
  (climbing); **6 are gaps**; and the `door` kind noun does not load.
- Beyond actions, the daemon/fuse scheduler, the plugin/extension system,
  and the platform-browser emit surface are only partially reachable.

David's direction resolves the tension ADR-210 left implicit: the hatch is
a temporary bridge, not a permanent boundary. The goal is **complete**
authoring parity — every platform capability expressible in Chord — with
the hatch reserved for genuinely story-specific computation, not for
reaching standard platform features.

## Decision

### 1. Parity is an architectural goal (the invariant)

**100% Sharpee == 100% Chord.** Any capability the platform offers a
TypeScript story — a standard action, a trait an entity can carry, a
daemon/fuse, a plugin/extension, an emit to the browser client — must have
a Chord authoring surface. A capability reachable only via a TypeScript
hatch is a **parity gap to close**, tracked against this ADR, not an
accepted boundary. New platform capabilities are not "done" until they
have a Chord surface (or an explicit, ADR-recorded reason they cannot).

**Accepted boundary (David, 2026-07-14) — parity is full *access*, not
full *implementation*.** Big or complex capabilities — a combat engine,
pathfinding, procedural/physics systems — are built in **Sharpee + TypeScript
as platform extensions** and *exposed* to Chord through the extension surface
(`use <extension>`, §5) and its published vocabulary. Chord authors get full
*access* to every such capability; they do not reimplement complex logic in
the declarative language. Accordingly, a capability is a **parity gap only
when it is reachable neither as core Chord nor through a platform extension's
exposed surface** — i.e. reachable only via a one-off story hatch
(`define … from "./mine.ts"`). The obligation is that every capability has an
*exposure path* (core vocabulary or a platform extension), never that every
capability's *implementation* is authored in Chord. This is why the extension
surface (OQ2) and the trusted pure-IR extension registry (OQ6) are load-
bearing: they are how complex TS capability reaches 100% Chord access.

### 2. The gap taxonomy (how gaps are closed)

Every gap falls into one of these kinds, which determines how it is closed:

- **(a) Missing composable trait** — the action/behavior exists but its
  enabling trait is not in the catalog. Closed by adding a kind noun or
  trait adjective to `catalog.ts` + `story-loader`, as a grammar-ratchet
  entry. *Low-risk, mechanical.*
- **(b) Missing trait property** — the trait is composable but a needed
  property is not settable from Chord (e.g. `edible.liquid`). Closed by a
  new adjective or composition config, as a ratchet entry.
- **(c) Half-wired construct** — the construct exists in the catalog but
  the loader does not build it (e.g. `a door`). Closed by finishing the
  loader path.
- **(d) Design-new surface** — no existing Chord shape fits; the capability
  needs a genuinely new authoring surface (capability-dispatch verbs, an
  extension-use surface, a browser-emit surface, daemon/fuse controls).
  Each gets its **own ADR** before implementation.

### 3. The action gaps (Part 1 — audited, final)

| Gap | Kind | Fix |
|---|---|---|
| `entering` needs `enterable` | (a) | add `enterable` trait adjective |
| object-`climbing` needs `climbable` | (a) | add `climbable` trait adjective |
| `hiding` needs concealment + a position | (a) | add a concealment adjective + wire the position |
| `drinking` needs `edible.liquid` / `container.containsLiquid` | (b) | a `drinkable` adjective or `edible` liquid config |
| `a door` does not load | (c) | implement door loading with `between` two-room placement |
| `lowering`/`raising` (capability-dispatch verbs) | (d) | **resolved (OQ1)**: `on <verb> it` on the entity *is* the behavior; the dispatch action routes to the entity's on-clause |
| `attacking`/NPC combat (COMBATANT + interceptor) | (d) | **resolved (OQ2)**: `use combat` enables the extension + its vocabulary; details in ADR-215 (see §5) |

**OQ1 resolved (David, 2026-07-14) — `on <verb> it` is the seam.** A
capability-dispatch verb's per-entity meaning is expressed by the entity's
own `on <verb> it` clause (e.g. the basket's `on lowering it`), not a new
construct. This keeps behavior on its owner (ADR-210 given 9) and reuses
Chord's existing clause grammar (dispatch-action gerunds already parse in
`on <verb> it`). The platform work: the stdlib capability-dispatch actions
(`lowering`/`raising`, and any future `turn`/`wave`/`wind`) fall back to the
entity's compiled on-clause when no TypeScript `CapabilityBehavior` is
registered — the loader registers the on-clause as the dispatch target. No
new Chord keyword; a loader/analyzer change + a ratchet note. (Was slated
for its own ADR; folded here as resolved — implementation may still get an
implementation-level ADR if the dispatch-fallback wiring proves non-trivial.)

### 4. Daemons & fuses (Part 2 — audited)

The scheduler (`packages/plugin-scheduler`) offers two constructs:
**daemons** (recurring, run every eligible turn, with an optional
`condition` gate and `runOnce`) and **fuses** (one-shot countdown timers
with `turns`, `trigger`, optional `repeat`, `tickCondition`, `onCancel`,
`entityId` binding, and runtime `adjustFuse`). Chord's IR already names its
two temporal surfaces after these: `define sequence` is a "chained-fuse
timeline" and `on every turn` is "daemon-shaped."

**Reachable today**: fixed scripted timelines (`define sequence` with
`at turn N` / `N turns later` / `when <owner> becomes <state>` anchors),
recurring background processes (`on every turn`), conditional recurrence
(`on every turn while …`), and one-lifetime fire (`, once`).

**Gaps** — the entire *imperative timer-management* surface has no Chord
form (kind (d), plus some (b)-shaped literal relaxations):
- **Cancel/abort a running sequence** — no `cancel`/`stop`; a started
  timeline can't be called off. → a `cancel sequence <name>` statement.
- **One-shot local delay from a body** — "in 3 turns do X" as fire-and-
  forget from an action body; today the only delay is a story-owned
  `define sequence`. → an inline `in N turns: <statement>` construct.
- **Data-driven delays** — `at turn`/`turns later` take a literal NUMBER
  only. → allow a `value-expr` so delays read world state.
- **Repeating period timer** — no "every N turns"; `on every turn` is
  period-1, and manual counters are awkward in the closed statement set. →
  `on every N turns …`.
- **Runtime reschedule / pause / resume** (`adjustFuse`, `pauseFuse`,
  `pauseDaemon`) — no latching pause distinct from `while`'s re-evaluation.
- **Entity-bound timers with auto-cleanup** (`entityId` + `cleanupEntity`)
  and **explicit priority/ordering** across daemons/fuses.

**OQ4 resolved (David, 2026-07-14) — full scheduler parity, every control.**
*All* of these get a Chord surface; none are deferred. The scheduler's entire
imperative API becomes authorable: `cancel sequence <name>`; an inline one-shot
delay from a body (`in N turns: <statement>`); `on every N turns`; data-driven
delays (`at turn <value-expr>` / `<value-expr> turns later`); runtime reschedule
(`reschedule <name> by <delta>`); pause/resume of a sequence or clause; entity-
bound timers with auto-cleanup on removal; and explicit priority/ordering across
timers. These are additive Chord surfaces over the existing subsystem — no
platform-side scheduler change, only compiler + loader work, each a ratchet
entry (grouped under the timer-controls design note / ADR-217).

### 5. Plugins & extensions (Part 3 — audited)

The platform runs three turn plugins (once per *successful* player action,
priority-ordered: NPC 100, state-machine 75, scheduler 50) plus opt-in
extensions like basic combat. All are engine-/TypeScript-registered.

**Reachable today (scripting *within* the pre-registered plugins)**: NPC
behavior is *partly* reachable — `on every turn` on a `person` compiles to
a daemon, so an NPC can act each turn, but there is no pathfinding, goals,
schedules, `guard`/`passive` behavior library, or the movement-driven
`onPlayerEnters`/`onPlayerLeaves` hooks (engine-only; Chord's only room
event verb is `entering`). State machines are *partly* reachable — entity
`states:` + `select on` + `change` model a single machine's current-state
dispatch, but not `onEnter`/`onExit` effects, `terminal` states, or a named
persistent machine with role bindings (ADR-119).

**The load-bearing gap (kind (d))**: **Chord has no surface to register,
configure, or opt into a plugin or extension.** The top-level declaration
list is closed (`create` / the `define …` family), with no `use` /
`enable` / `register` construct. The one cross-boundary form — the
`define … from` hatch — imports a *single* Action or Behavior symbol; it
cannot register a `TurnPlugin` or call an extension's `register*(world)`,
and any hatch disqualifies the pure-IR profile (AC-4). Consequences:
- **Combat is entirely unreachable** — no `combatant`/`weapon`/`health` in
  the catalog and no way to enable the combat extension. `attacking` real
  combat cannot be expressed at all.
- Authors inherit exactly the pre-registered plugin set and can only script
  inside it.

**OQ2 resolved (David, 2026-07-14) — a top-level `use <extension>`
declaration.** A `.story` opts into a shipped extension with `use
<extension>` (e.g. `use combat`), which the loader maps to the extension's
`register*(world)` call. An extension **publishes the Chord vocabulary it
contributes** — traits (`combatant`, `weapon`), verbs (`attack`), any state
adjectives — and those enter the composable catalog **only when the
extension is used**. Chord's catalog is thus "core + enabled extensions,"
which keeps the core language lean and scales to third-party extensions.
This makes combat (and every future extension) reachable.

Full extension depth is in scope (100% parity): NPC behavior (pathfinding,
goals, `guard`/`passive` libraries, room enter/leave event verbs) and
state-machine depth (`onEnter`/`onExit`, `terminal`, named machines) all get
a Chord surface — the dedicated **extension ADR (ADR-215)** designs the
vocabulary-contribution mechanism and the exact spellings, not *whether*
they are reachable.

**OQ6 resolved (David, 2026-07-14) — trusted platform extensions keep a
story pure-IR.** Platform-shipped extensions (`combat`, and future ones)
ship *with the runtime*; `use <extension>` merely enables one. No
author-supplied TypeScript crosses the boundary, so a story that only
`use`s platform extensions **stays pure IR** and runs in the browser
playground and hosted multi-user like any other — which is what parity
requires (extensions reachable in the *primary* execution path, not only
the devkit). This cleanly separates `use <platform-extension>` (trusted,
runtime-bundled, pure) from `define … from "./mine.ts"` (author code, a
hatch, impure per AC-4). Platform extensions therefore live in a trusted,
pre-loadable registry the pure-IR runtime knows about. Author-supplied
extensions, if ever added, would be a separate (hatch-like) question.

> **Refines ADR-210 AC-4.** ADR-210's pure-IR/interpreter-primary profile
> refuses *any* hatch (`hasHatches` ⇒ rejected). This decision narrows that
> to author-code hatches only: a `use <platform-extension>` does **not** set
> the hatch flag and does **not** disqualify the pure-IR profile, because no
> author TypeScript crosses the boundary. ADR-215 must honor this — the
> `use` construct is an IR-declarative enablement of trusted, runtime-bundled
> code, categorically distinct from `define … from`.

### 6. Platform-browser emits (Part 4 — audited)

The browser render path is the channel system (ADR-163/165): the engine
builds a turn packet by walking registered `IOChannel`s, each of whose
`produce` scans the turn's semantic events. "Emitting to the browser" =
firing an event a channel recognizes. Standard channels are text/status;
**media channels** (`image:*`, `sound`, `music`, `ambient:*`, `animation`,
`transition`, `layout`) consume `media.*` events and are capability-gated.

- **Reachable today (all text)**: `main` prose (`phrase`/descriptions), the
  status line (auto), `endgame`/`death` (`win`/`lose`), and the pulled
  scene-narration channels.
- **The gap**: **every media/audio/image channel is unreachable.** Chord's
  `emit <word>` produces an event whose `data` is always empty `{}` — there
  is no payload syntax — and Chord cannot register a channel/renderer. So
  even `emit media.sound.play` cannot drive the `sound` channel (which needs
  `event.data.src`).

**OQ3 resolved (David, 2026-07-14) — payload plus typed media sugar.**
Two additive changes: (1) extend `emit` to carry a data payload — `emit
<type> with <field> = <value> …` — which generically unblocks every media
channel and any custom channel; and (2) add ergonomic statements for the
common cases: `play sound <asset>`, `play music <asset>` / `stop music`,
`show image <asset> [in <layer>]` / `hide image`.

The payloaded `emit` already provides **full access to every channel** —
sound, music, ambient, image (all layers + hotspots + preload), animation,
transition, layout, clear, and any custom channel — generically. The typed
sugar (`play sound`/`play music`/`show image` and equivalents for the other
media kinds) is additive ergonomics layered on top; it covers the media
surface, not just "common" cases. Emitting to *existing* channels is bare
Chord; custom-channel **registration** (a new channel + renderer) rides the
extension surface (§5, OQ2). Its own ADR (ADR-216).

### 7. Governance

Closing any gap is platform work under CLAUDE.md's discussion gate.
Vocabulary/syntax changes are grammar-ratchet entries (ADR-210); the
design-new surfaces (kind (d)) each get their own ADR (proposed
ADR-215+). This ADR is the umbrella that the child ADRs and ratchet
entries trace back to; it does not itself change any `packages/` code.

### 8. Roadmap — foundations first (OQ5 resolved)

Full parity is the goal: **every** audited gap is in scope, none deferred
or subsetted. Implementation order (David, 2026-07-14 — "foundations
first") lands the independent, lower-risk workstreams as grammar-ratchet
entries before the two design-heavy ADRs:

1. **Catalog adjectives** — `enterable`, `climbable`, `drinkable` (closes
   entering, object-climbing, drinking).
2. **Door loading** — `between` two-room placement (closes the `a door`
   construct).
3. **Capability-dispatch fallback** (OQ1) — `on <verb> it` as the dispatch
   target for `lowering`/`raising`.
4. **Timer controls** (OQ4) — the full scheduler surface, as ratchet
   entries / a design note (ADR-217).
5. **ADR-215 — extensions & combat** (OQ2/OQ6) — the `use` surface,
   vocabulary contribution, NPC/state-machine depth, trusted pure-IR
   registry. The largest.
6. **ADR-216 — emit payload & media** (OQ3).

Steps 1–4 bank the action and daemon parity quickly; the design-heavy
extension and media surfaces (5–6) get dedicated ADRs but are equally
in-scope, not optional.

## Acceptance criteria

This umbrella ADR's own "done" is the roadmap being enacted; concrete,
testable ACs for each surface live in its ratchet entry or child ADR. The
uniform bar for every roadmap item:

- **AC-1 — each closed gap ships with a fixture story.** A `.story` that
  exercises the newly-reachable capability compiles and runs against the
  real `@sharpee/chord` / loader (the pattern the chord-language reference
  used), and its row in `docs/work/stdlib-reference/chord-availability-audit.md`
  flips to reachable. The audit's parity scoreboard is the running measure.
- **AC-2 — pure-IR preserved.** A story that uses only core Chord + `use
  <platform-extension>` produces `hasHatches: false` and loads in the
  browser/hosted profile (guards the §5 / OQ6 refinement of ADR-210 AC-4).
- **AC-3 — additive-only.** Every ratchet entry is purely additive; the
  existing shipping stories (cloak, zoo) still compile unchanged.
- **AC-4 — governance.** Each vocabulary/syntax change lands as a dated
  `chord-grammar-changes.md` entry (ADR-210), and each kind-(d) surface as
  its own ACCEPTED child ADR, before implementation.

## Consequences

- Chord gains a definition of "done" for platform features: a capability
  ships with a Chord surface, or an ADR says why not. The hatch count
  becomes a true parity scoreboard (design.md §5.6).
- The stdlib author reference (`docs/reference/stdlib-reference.md`) is
  **paused** until the composable surface matches what the reference would
  claim authors can do — documenting the current gap set as permanent
  would contradict this ADR.
- A backlog of ratchet entries and child ADRs follows from the audit;
  quick wins (trait-adjective adds) are separable from the design-heavy
  surfaces and can land first.
- Every future platform ADR inherits a parity obligation: it must state
  its Chord surface or record a parity gap against this ADR.

## Session

Session 95d692 (2026-07-14) — audit + ADR authoring. Supersedes nothing;
establishes the parity obligation that constrains future Chord and platform
ADRs. Related: ADR-210 (Chord language), ADR-213 (Chord-surfaced gaps →
ADRs, the precedent for this one), ADR-090 (capability dispatch — the
mechanism behind OQ1).

# Chord Availability Audit — Sharpee → Chord parity

**North star** (David, 2026-07-14): **100% Sharpee == 100% Chord.** Every
standard action, daemon, plugin, and platform-browser emit must be expressible
from a `.story` file — not just reachable in TypeScript. Chord is meant to be a
complete authoring surface for the platform, not a subset.

**Taxonomy (adopted 2026-07-15, ADR-214 §1a).** Parity is bidirectional between
two first-class Ways — the **Sharpee Way** (TS) and the **Chord Way** (`.story`),
neither made crude to match the other. Every capability is classified: **CAN**
(both Ways idiomatic), **CHORD-GAP** (Sharpee Way can, Chord Way can't → build
the Chord surface), **SHARPEE-GAP** (platform hole → fix the platform, then both
Ways), **HATCH** (non-IF, `define … from` by design — the parity boundary, not a
gap). This audit (Parts 1–4, friendly-zoo scope) and the Dungeo-scope **capability
matrix** (`docs/work/schism/sharpee-chord-capability-matrix.md`) are the two feeds
of one parity instrument; both use these four classes. The Dungeo primitive
backlog (ADR-222 DZ-1…11) is superseded by the capability matrix.

**This document, Part 1 — Actions**: maps, for each of the 49 standard actions,
the trait an entity needs to be *eligible* for it, whether that trait is
composable in Chord v1 today, and — where it isn't — exactly what's missing. It
is the spec for the platform work to close the action gaps.

**Parts 2–4 (scoped, not yet audited — see "The rest of the parity surface")**:
daemons/fuses (the scheduler), plugins (turn plugins, NPC, state machine,
extensions like combat), and platform-browser emits (the presentation/channel
layer — media, audio, custom channels). Each needs its own audit pass to reach
the 100% goal.

**Method**: enabling traits read from each action's `validate()` in
`packages/stdlib/src/actions/standard/<name>/<name>.ts`; composability checked
against `packages/chord/src/catalog.ts` and the `packages/story-loader` kind-noun
/ trait-adjective handling. Docs-only analysis — no platform code changed.

## Chord v1's composable vocabulary (the yardstick)

An entity in a `.story` `create` block can only be composed from these words
(anything else is a load error, "not a v1 adjective"):

**Kind nouns** (take an article): `room`, `door`, `person`, `container`,
`supporter`.
**Trait adjectives** (bare): `scenery`, `wearable`, `readable`, `openable`,
`lockable`, `switchable`, `edible`, `pushable`, `pullable`, `light-source`,
`plural`, `dark`.

What each maps to in the world model (from the story-loader):

| Chord word | World-model trait | Notes |
|---|---|---|
| `a room` | RoomTrait | + `dark` sets the dark property; exits are room data |
| `a container` | ContainerTrait | `+ openable/lockable` compose on |
| `a supporter` | SupporterTrait | capacity via `with` |
| `a person` | **ActorTrait only** | **no NPCTrait / combatant / character-model** |
| `a door` | — | **does not load in v1** — loader throws ("needs `between` placement") |
| `scenery` | SceneryTrait | blocks taking |
| `wearable` | WearableTrait | |
| `readable` | ReadableTrait | `with text …` |
| `openable` | OpenableTrait | |
| `lockable` | LockableTrait | `with key <entity>` sets keyId |
| `switchable` | SwitchableTrait | |
| `edible` | EdibleTrait | |
| `light-source` | LightSourceTrait | |
| `pushable` | PushableTrait | data-only trait |
| `pullable` | PullableTrait | data-only trait |
| `plural` | IdentityTrait.grammaticalNumber | |
| `dark` | RoomTrait property | rooms only |
| `enterable` | EnterableTrait | ADR-218 §1a (ratchet F1); always explicit |
| `climbable` | ClimbableTrait | ADR-218 §1a (ratchet F2) |

Notably **absent** from the composable set: `vehicle`,
`exit` (as a trait), `npc`, `character-model`, `combatant`, `weapon`, `acoustic`,
`listener`, `button`, `breakable`, `destructible`, `concealment`,
`moveable-scenery`, `attached`, `equipped`, `open-inventory`, `clothing`,
`region`, `scene`, `story-info`, `identity` (composed implicitly).

## Verdict legend
- **✅ reachable** — usable in Chord today with composable vocabulary (or needs no trait).
- **⚠️ partial** — the basic path works, but a dimension of the action needs a non-composable trait.
- **❌ gap** — the action's enabling trait is not composable in Chord v1; unreachable without platform work.

## Manipulation (§2)

| Action | Enabling trait | Composable? | Verdict | To close the gap |
|---|---|---|---|---|
| taking | none (portable by default; `scenery` blocks) | — | ✅ reachable | — |
| dropping | none (held item) | — | ✅ reachable | — |
| putting | destination `SUPPORTER` | `a supporter` | ✅ reachable | — |
| inserting | destination `CONTAINER` | `a container` | ✅ reachable | — |
| removing | source `CONTAINER`/`SUPPORTER` | composable | ✅ reachable | — |
| giving | recipient `ACTOR` | `a person` | ✅ reachable | — |
| showing | viewer `ACTOR` | `a person` | ✅ reachable | — |
| throwing | none required on target | — | ✅ reachable | — |
| pushing | `PUSHABLE` | `pushable` | ✅ reachable | — |
| pulling | `PULLABLE` | `pullable` | ✅ reachable | — |
| touching | none | — | ✅ reachable | — |
| lowering | capability behavior for `if.action.lowering` (ADR-090) | not composable | ❌ gap | needs a Chord surface to bind per-entity behavior to the verb (see §"Capability-dispatch verbs") |
| raising | capability behavior for `if.action.raising` (ADR-090) | not composable | ❌ gap | same as lowering |

## Movement (§3)

| Action | Enabling trait | Composable? | Verdict | To close the gap |
|---|---|---|---|---|
| going | source `ROOM` + exit data (door via `openable`/`lockable`) | `a room` / exits | ✅ reachable | — |
| exiting | none (containment state; not a room) | — | ✅ reachable | — |
| entering | target `ENTERABLE` | `enterable` adjective | ✅ reachable | closed by ADR-218 §1a (ratchet F1); fixture `docs/work/chord-foundations/fixtures/enterable.{story,transcript}` |
| climbing | directional (up/down): `ROOM` exit ✅; object: `CLIMBABLE` | `climbable` adjective + parser grammar | ✅ reachable | object path closed by ADR-218 §1a (ratchet F2): `climbable` added to catalog + loader, **plus** a new `climb :target` grammar family in parser-en-us (object-climbing had no grammar at all — the stdlib climbing action was unreachable). Fixture `docs/work/chord-foundations/fixtures/climbable.{story,transcript}` |

## Senses & examination (§6)

| Action | Enabling trait | Composable? | Verdict | To close the gap |
|---|---|---|---|---|
| examining | none | — | ✅ reachable | — |
| looking | none (room) | — | ✅ reachable | — |
| searching | none (closed `container`+`openable` blocks) | — | ✅ reachable | — |
| reading | `READABLE` | `readable` | ✅ reachable | — |
| listening | none (generic; reads switchable/container to vary text) | — | ✅ reachable | — |
| smelling | none (generic, same-room; reads edible/light-source to vary text) | — | ✅ reachable | — |

## Containers & openables (§4)

| Action | Enabling trait | Composable? | Verdict | To close the gap |
|---|---|---|---|---|
| opening | `OPENABLE` | `openable` | ✅ reachable | — |
| closing | `OPENABLE` | `openable` | ✅ reachable | — |
| locking | `LOCKABLE` (+ optional key entity via `keyId`) | `lockable` (`with key …`) | ✅ reachable | keyed variant needs `lockable with key <entity>`; keyless works too |
| unlocking | `LOCKABLE` (+ optional key) | `lockable` | ✅ reachable | — |

## Wearing (§5)

| Action | Enabling trait | Composable? | Verdict | To close the gap |
|---|---|---|---|---|
| wearing | `WEARABLE` | `wearable` | ✅ reachable | — |
| taking_off | `WEARABLE` | `wearable` | ✅ reachable | — |

## Devices (§7)

| Action | Enabling trait | Composable? | Verdict | To close the gap |
|---|---|---|---|---|
| switching_on | `SWITCHABLE` | `switchable` | ✅ reachable | — |
| switching_off | `SWITCHABLE` | `switchable` | ✅ reachable | — |

## NPCs, conversation & combat (§8)

| Action | Enabling trait | Composable? | Verdict | To close the gap |
|---|---|---|---|---|
| talking | `ACTOR` (only — no NPC trait needed) | `a person` | ✅ reachable | conversation tree is optional `customProperties` — richer trees need a Chord surface |
| eating | `EDIBLE` | `edible` | ✅ reachable | — |
| drinking | `EDIBLE` with `liquid: true`, OR `CONTAINER` with `containsLiquid` | property, not an adjective | ❌ gap | Chord's `edible` can't set the `liquid` flag; plain `edible` routes to eating. Needs a Chord way to mark a liquid (e.g. `drinkable`, or `edible` config). |
| attacking | none to enter; NPC combat needs `COMBATANT` **+ a registered combat interceptor** | not composable | ❌ gap | on a plain `person` it hits the object-destruction path, not combat; real combat is an interceptor/extension (`ext-basic-combat`), unreachable from Chord |
| hiding | `ConcealmentTrait` (+ a grammar `position`) | not composable | ❌ gap | implemented (ADR-148) but `ConcealmentTrait` isn't a Chord adjective and it needs a position extra |

## Meta & system actions (§9)

All 13 require no enabling trait — they are system/meta actions on the player or
the story, always reachable in Chord:

| Action | Reachable | Note |
|---|---|---|
| about, help, inventory, scoring, version | ✅ | read story-level text/score config |
| saving, restoring, restarting, quitting | ✅ | platform lifecycle |
| waiting, sleeping, again, undoing | ✅ | turn/meta |

## Part 1 result: action reachability

**44 of 49 actions are fully reachable** from Chord's composable vocabulary
today; **0 are partial**; **5 are gaps**; and one core *construct*
(`a door`) doesn't load. Every meta action and every manipulation/senses/
container/wearing/device action works. The gaps cluster into five kinds:

1. **Missing composable trait — add adjective + loader support.**
   - ~~`entering` needs `ENTERABLE`~~ — **closed** by ADR-218 §1a (ratchet F1):
     `enterable` adjective added to catalog + loader. ✅
   - ~~object-`climbing` needs `CLIMBABLE`~~ — **closed** by ADR-218 §1a
     (ratchet F2): `climbable` adjective added to catalog + loader, plus a new
     `climb :target` grammar family in parser-en-us (object-climbing had no
     player grammar at all). ✅
   - `hiding` needs `ConcealmentTrait` + a grammar `position` (❌).
   *Fix*: a concealment adjective in `catalog.ts` + `story-loader`; wire the
   position for hiding.

2. **Property, not adjective.** `drinking` needs `EDIBLE.liquid` (or
   `CONTAINER.containsLiquid`) — a trait *property* Chord's bare `edible`
   adjective can't set, so a plain `edible` item routes to eating. *Fix*: a
   Chord way to mark a liquid (a `drinkable` adjective, or `edible` config).

3. **`a door` doesn't load.** A core IF construct; the Phase A loader throws
   ("needs `between` placement"). *Fix*: implement door loading + two-room
   placement. Affects going/entering *through* doors, not just the door itself.

4. **Capability-dispatch verbs.** `lowering`/`raising` (and the un-bound
   `turn`/`wave`/`wind`) have no single behavior by design (ADR-090); today they
   need a TypeScript-registered capability behavior. *Fix*: a Chord surface to
   bind per-entity behavior to a verb — a **design question**, not a catalog add.
   (Chord's `define action` + `on <verb> it` may already be the seam — needs a
   design pass.)

5. **Combat / NPC depth.** `attacking` real combat needs `COMBATANT` + a
   registered combat interceptor (the `ext-basic-combat` extension); on a plain
   `person` it silently routes to object-destruction. NPC combat and deep
   conversation trees are interceptor/extension territory, unreachable from
   Chord. *Fix*: the largest item — likely a Chord surface for extensions
   (Part 3), not a single trait.

## The rest of the parity surface (Parts 2–4 — not yet audited)

The "100% Sharpee == 100% Chord" goal extends past actions.

### Part 2 — Daemons & fuses (`packages/plugin-scheduler`) — AUDITED

The scheduler offers **daemons** (recurring, optional `condition`, `runOnce`)
and **fuses** (one-shot countdown; `repeat`, `tickCondition`, `onCancel`,
`entityId`, runtime `adjustFuse`). Chord's IR already names its surfaces after
them (`define sequence` = "chained-fuse timeline"; `on every turn` =
"daemon-shaped").

- **Reachable**: fixed timelines (`define sequence` + `at turn N` / `N turns
  later` / `when <owner> becomes <state>`), recurring (`on every turn`),
  conditional (`… while`), one-shot lifetime (`, once`).
- **Gaps** (imperative timer management has no Chord form): cancel/abort a
  running sequence; one-shot local delay from a body ("in 3 turns do X");
  data-driven delays (anchors are NUMBER-only); repeating period timer ("every
  N turns"); runtime reschedule / pause / resume; entity-bound auto-cleanup;
  explicit priority. → additive Chord surfaces over the existing subsystem;
  highest-value are a `cancel sequence` and an inline `in N turns:` construct.

### Part 3 — Plugins & extensions (`plugins`, `plugin-npc`, `plugin-state-machine`, `extensions/basic-combat`) — AUDITED

Three turn plugins run priority-ordered (NPC 100, state-machine 75, scheduler
50) plus opt-in extensions; **all are engine-/TS-registered**.

- **Partly reachable (scripting inside pre-registered plugins)**: NPC behavior
  via `on every turn` on a `person` (no pathfinding/goals/schedules/guard-passive
  library/enter-leave hooks); single state machines via `states:` + `select on` +
  `change` (no `onEnter`/`onExit`/`terminal`/named multi-machine registry).
- **The load-bearing gap**: **Chord has no surface to register/opt into a plugin
  or extension.** The top-level declaration list is closed; there is no
  `use`/`enable`/`register`. The `define … from` hatch imports a single
  Action/Behavior symbol only (and disqualifies the pure-IR profile). Therefore
  **combat is entirely unreachable** — no `combatant`/`weapon`/`health` in the
  catalog, no way to enable the combat extension, `attacking` combat inexpressible.
  → an extension-use surface (`use <extension>`) that admits the extension's
  traits/verbs into the composable vocabulary; its own ADR.

### Part 4 — Platform-browser emits (channel system, ADR-163/165) — AUDITED

"Emitting to the browser" = firing a semantic event whose `type`+`data` a
registered `IOChannel.produce` recognizes. Standard channels: `main` (prose),
`prompt`, status (`location`/`score`/`turn`), `info`/`ifid`, `death`/`endgame`/
`score_notify`, `lifecycle`. **Media channels** (capability-gated) consume
`media.*` events: `image:*` (show/hide/preload + hotspots), `sound`, `music`,
`ambient:*`, `animation`/`transition`/`layout`/`clear`; plus a legacy
`@sharpee/media` `audio.*` vocabulary.

- **Reachable from Chord (all text)**: `main` prose (via `phrase`/descriptions),
  the status line (auto, via player moves + `award`), `endgame`/`death` (via
  `win`/`lose`), and the pulled scene-narration channels (`present`/`entered`/
  `exited`/`disappeared`/`detail`).
- **The gap**: **every media/audio/image channel is unreachable.** Chord's
  `emit <word>` produces an event whose `data` is always empty `{}` (no payload
  syntax), and Chord cannot register a channel/renderer. So even `emit
  media.sound.play` can't work — the `sound` channel needs `event.data.src`,
  which `emit` can't attach. → **highest-leverage fix: give `emit` a payload**
  (`emit <type> with <field> = <value> …`); then ergonomic sugar `play sound
  <asset>` / `play music <asset>` / `show image <asset> [in <layer>]`. Its own
  ADR (and depends partly on the extension/channel-registration surface, Part 3).

## Parity scoreboard (all four parts)

| Surface | Reachable today | Gap |
|---|---|---|
| **Actions** | 42/49 full + 1 partial | 6 action gaps + `a door` doesn't load |
| **Daemons/fuses** | fixed timelines + recurring (`define sequence`, `on every turn`) | imperative timer management (cancel, local delay, reschedule, period, priority) |
| **Plugins/extensions** | scripting *inside* pre-registered plugins only | **no registration/opt-in surface at all**; combat fully unreachable |
| **Browser emits** | text only (prose, status, endgame, scene narration) | all audio/image/media channels; `emit` has no payload |

The two load-bearing, design-heavy gaps are the **extension-use surface**
(Part 3) and the **`emit` payload + media surface** (Part 4); the rest are
additive catalog/statement adds. See ADR-214 for the decision and roadmap.

## How the gaps get closed (process)

Closing any of these is **platform work** — `packages/chord/src/catalog.ts`,
`packages/story-loader`, possibly `packages/parser-en-us` grammar, and (for
Parts 2–4) the plugin/presentation packages. It is governed by the ADR-210
grammar ratchet (`docs/architecture/chord-grammar-changes.md`) and requires
David's explicit sign-off; grammar additions each need a ratchet entry, and the
larger design questions (capability-dispatch verbs, an extension surface) likely
warrant their own ADRs. This audit is the **input** to that work, not the change.

## Suggested next steps
1. Confirm this Part 1 action audit and prioritize the six action gaps.
2. Run the Part 2–4 audits (daemons, plugins, browser emits) to complete the
   parity map.
3. From the full gap list, scope the platform work into ratchet entries / ADRs —
   the mechanical trait-adjective adds (`enterable`, `climbable`, `drinkable`)
   are quick wins; door loading, capability-dispatch verbs, and the extension
   surface are the design-heavy ones.

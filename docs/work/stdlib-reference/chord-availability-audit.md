# Chord Availability Audit — Sharpee → Chord parity

**North star** (David, 2026-07-14): **100% Sharpee == 100% Chord.** Every
standard action, daemon, plugin, and platform-browser emit must be expressible
from a `.story` file — not just reachable in TypeScript. Chord is meant to be a
complete authoring surface for the platform, not a subset.

**Update 2026-07-17 (session 615882, go-live plan Phase 3)**: the mechanical
shortlist closed — all 5 ❌ action gaps and 3 ⚠️ fixed (ratchet G1–G4 + D1/D3
defect fixes + bare cut/dig grammar + turning lifecycle row). Part 1 now reads
**50 ✅ / 4 ⚠️ / 0 ❌**; rows updated in place.

**This revision**: full re-run 2026-07-17 (session f5c22c, ADR-233 go-live plan
Phase 2). Seven parallel code-grounded investigators re-verified every Part 1
verdict and re-audited Parts 2–4 against current code (post ADR-230/231, the
exit-form fixes, and the `.hasTrait()` deletion). Supersedes the 2026-07-15
version, which had drifted in both directions: 4 verdicts flipped ✅→broken,
2 flipped ❌→✅, 5 player actions were missing rows entirely, and a set of
platform defects surfaced that no prior audit had seen. Method: verdicts formed
from `validate()` + catalog + loader + grammar code first, docs never trusted
alone; every claim carries file:line evidence in the investigator transcripts.

**Taxonomy (ADR-214 §1a).** Parity is bidirectional between two first-class
Ways — the **Sharpee Way** (TS) and the **Chord Way** (`.story`), neither made
crude to match the other. Every capability is classified: **CAN** (both Ways
idiomatic), **CHORD-GAP** (Sharpee Way can, Chord Way can't → build the Chord
surface), **SHARPEE-GAP** (platform hole → fix the platform, then both Ways),
**HATCH** (non-IF, `define … from` by design — the parity boundary, not a gap).
This audit and the Dungeo-scope capability matrix
(`docs/work/schism/sharpee-chord-capability-matrix.md`) are the two feeds of one
parity instrument.

## Chord v1's composable vocabulary (the yardstick)

**Kind nouns** (take an article): `room`, `door`†, `person`, `container`,
`supporter`.
**Trait adjectives** (bare or with config): `scenery`, `wearable`, `readable`
(`with text …`), `openable` (`with tool <entity>`, ratchet G4), `lockable`
(`with key <entity>`), `switchable`, `edible`, `drinkable` (ratchet G1),
`concealed` (ratchet G2), `hiding-spot` (`with position <word>`, ratchet G3),
`light-source`, `plural`, `dark`, `enterable` (ratchet F1),
`climbable` (ratchet F2), `cuttable` (`with tool <entity>`), `diggable`
(`with tool <entity>`), `pushable`, `pullable` (both live since the Defect D1
fix, 2026-07-17).
**State initializers**: `starts open/closed/locked/unlocked/on/off` +
generic `starts <state-adjective>` (ADR-231 D5).

† `a door` **throws a LoadError** (`loader.ts:750-751` — "doors need `between`
placement") — the door child ADR (ADR-233 G1, Q-1 ruled) closes this.

Notably **absent**: `combatant`, `weapon`, `health`, `breakable`,
`destructible`, any sound/listener trait, `npc`, `vehicle`, `region`.

## Verdict legend
- **✅ reachable** — usable in Chord today with composable vocabulary (or needs no trait).
- **⚠️ partial** — the basic path works; a real dimension of the action has no Chord surface.
- **❌ gap** — unreachable from Chord without platform work.

## Manipulation (§2) — 13 ✅

| Action | Requirement | Chord path | Verdict | Class | To close |
|---|---|---|---|---|---|
| taking | none (scenery blocks) | plain thing; `scenery` | ✅ | CAN | — |
| dropping | held item | runtime state | ✅ | CAN | — |
| putting | dest CONTAINER/SUPPORTER | `a container`/`a supporter` | ✅ | CAN | — |
| inserting | delegates to putting (`in`) | same | ✅ | CAN | — |
| removing | item located in/on source; open if openable container | composable | ✅ | CAN | — |
| giving | recipient ACTOR | `a person`; `on giving it` refusals | ✅ | CAN | — |
| showing | viewer ACTOR, same room | `a person`; `on showing it` | ✅ | CAN | — |
| throwing | none; bare + at/to forms | grammar complete (incl. bare `throw :item`, 9202e462) | ✅ | CAN | — |
| pushing | PUSHABLE (`pushing.ts:133`) | `pushable` — loader case added (Defect D1 fixed 2026-07-17, default button-style config) | ✅ | CAN | — |
| pulling | PULLABLE (`pulling.ts:112`) | `pullable` — same fix (default lever-style config) | ✅ | CAN | — |
| touching | REACHABLE scope only | grammar complete | ✅ | CAN | — |
| lowering | ADR-090 capability dispatch | **`define action lowering`** + `define trait … on lowering it` → CapabilityBehavior dispatch; story grammar @150 shadows core verb; the loader's dead-gerund diagnostic recommends exactly this path (`runtime.ts:261-266`) | ✅ | CAN | — (verdict FLIPPED from ❌: the binding surface exists now) |
| raising | same | same; author must declare both `raise` and `lift` patterns to cover core aliases | ✅ | CAN | doc note only |

## Movement (§3) & Senses (§6) — 10 ✅, 1 ⚠️

| Action | Requirement | Chord path | Verdict | Class | To close |
|---|---|---|---|---|---|
| going | ROOM + exit config; door via `exit.via` (`going.ts:273-301`) | exits + static/conditional blocked exits ✅; **door-gated exits unreachable** — `a door` LoadError, `connectRooms` never sets `via`, so going's door_closed/door_locked branches are dead from Chord | ⚠️ | CAN (plain/blocked) / CHORD-GAP (doors) | door child ADR (ADR-233 Q-1 ruled: `between` on door + `through` exit sugar) |
| exiting | containment state; target-aware (ADR-231 P5) | `enterable` + full exit grammar incl. `get/climb out of :container` | ✅ | CAN | — |
| entering | ENTERABLE, open if openable | `enterable` (ratchet F1) | ✅ | CAN | — |
| climbing | CLIMBABLE or enterable supporter; directional via exits | `climbable` (ratchet F2) + `climb :target` family. (No bare `climb up/down` core rule — `go up` covers it; observation, not a gap) | ✅ | CAN | — |
| examining | visible object | any entity + description | ✅ | CAN | — |
| looking | always valid | any room | ✅ | CAN | — |
| searching | closed container blocks; payoff = revealing `IdentityTrait.concealed` items | base search + `concealed` marker adjective (ratchet G2, 2026-07-17) | ✅ | CAN | — |
| reading | READABLE | `readable with text …` | ✅ | CAN | — |
| listening | always valid | text-varying traits composable | ✅ | CAN | — |
| smelling | same-room target | composable | ✅ | CAN | — |
| hiding | ConcealmentTrait + position extra | `hiding-spot [with position <word>]` (ratchet G3, 2026-07-17) + the existing `hide behind/under/in :target` grammar | ✅ | CAN | — |

## Containers, wearing, devices, tools (§4/§5/§7) — 11 ✅

| Action | Requirement | Chord path | Verdict | Class | To close |
|---|---|---|---|---|---|
| opening | OPENABLE; optional tool gate (`OpenableBehavior.requiresTool`) | `openable [with tool <entity>]`; D5b closed-default confirmed in code; tool config wired (Defect D3 fixed 2026-07-17, ratchet G4) | ✅ | CAN | — |
| closing | OPENABLE, open | `openable` | ✅ | CAN | — |
| locking | LOCKABLE, closed, key if required | `lockable with key <entity>` (ADR-230 P9a) + `starts locked/unlocked` — old "keyed variant" caveat CLOSED | ✅ | CAN | — |
| unlocking | LOCKABLE, locked | same | ✅ | CAN | — |
| wearing | WEARABLE, carried | `wearable` (bodyPart/layer config not composable — inert, harmless) | ✅ | CAN | — |
| taking_off | worn by actor | same | ✅ | CAN | — |
| switching_on | SWITCHABLE; power gate | `switchable` + `starts on/off` (requiresPower not composable — default trait only) | ✅ | CAN | — |
| switching_off | SWITCHABLE, on | same | ✅ | CAN | — |
| turning (NEW) | dual surface (behavior XOR interceptor) since 2026-07-17; grammar `turn/rotate/twist :target` | `on turning it` — turning rewrote cutting-style with a `turningLifecycle` registry row, so the dead-gerund gate now passes (real-path test in quickwin-adjectives.test.ts) | ✅ | CAN | — |
| cutting (NEW) | CUTTABLE + exactly-one implementation (behavior XOR interceptor) | `cuttable [with tool …]` + `on cutting it`; bare `cut/slice/chop :target` grammar added 2026-07-17 (untooled cuttables now reachable for TS and Chord alike) | ✅ | CAN | — |
| digging (NEW) | DIGGABLE, same structure | `diggable [with tool …]` + `on digging it`; bare `dig :target` grammar added 2026-07-17 | ✅ | CAN | — |

`deadly-room-death` is an internal system action (no grammar by design; redirect
target of the engine's deadly-room transformer). Its authoring surface —
`deadly:` rooms and `<dir> is deadly:` exits — IS Chord-composable. Excluded
from player-action counts. (`is deadly while <cond>` parses but is explicitly
not wired — pre-existing, documented.)

## NPCs, conversation & consumption (§8) — 3 ✅, 3 ⚠️

| Action | Requirement | Chord path | Verdict | Class | To close |
|---|---|---|---|---|---|
| talking | ACTOR | `a person`; `on talking it` overrides the response | ✅ | CAN | richer conversation trees remain surface-less (see Part 3) |
| asking (NEW) | ACTOR; reads `command.topic` (ADR-231 D4) | eligibility + `:topic` grammar ✅; `on asking it` gives ONE blanket answer; **Chord has zero topic surface** (no `topic` anywhere in chord/story-loader) — no per-topic branching | ⚠️ | CHORD-GAP | expose topic to on-clauses, e.g. `on asking it about "sword"` or a `the topic is …` condition (one surface serves asking+telling) |
| telling (NEW) | same shape | same | ⚠️ | CHORD-GAP | same |
| eating | EDIBLE, not liquid, servings | `edible` | ✅ | CAN | — |
| drinking | EDIBLE.liquid OR CONTAINER.containsLiquid (`drinking.ts:236-246`) | `drinkable` adjective → `EdibleTrait({ liquid: true })` (ratchet G1, 2026-07-17; order-independent with `edible`) | ✅ | CAN | — |
| attacking | any target validates; plain target → inert "no effect"; COMBATANT combat needs a registered combat interceptor | verb + scripted combat ✅ (`on attacking it`); **systemic combat ✅ (2026-07-18)**: `use combat` + `combatant with health/skill/…` + `weapon with damage/…` reach `registerBasicCombat` for real resolution (ADR-215 Phase 1; REAL-PATH attack test) | ✅ | CAN | — |

## Meta & system (§9) — 13 ✅

about, help, inventory, scoring, version, saving, restoring, restarting,
quitting, waiting, sleeping, again, undoing — all validate unconditionally or
on runtime capability state (save restrictions, command history), never on a
trait. All parse. All CAN.

## Part 1 result — 54 player-facing actions

**50 ✅ full · 4 ⚠️ partial · 0 ❌ gaps** (updated 2026-07-17, session 615882:
the go-live plan Phase 3 mechanical shortlist closed all 5 ❌ gaps and 3 of the
7 ⚠️ — every item individually signed off by David).

| Bucket | Actions |
|---|---|
| ⚠️ partial (4) | going (doors → child ADR, Phase 4), asking, telling (topic surface), attacking (systemic combat → extension surface, Phase 5) |

Shortlist closures 2026-07-17 (session 615882): pushing, pulling (D1 loader
fix), drinking (`drinkable`, G1), searching (`concealed`, G2), hiding
(`hiding-spot`, G3), opening tool config (D3/G4), cutting, digging (bare-verb
grammar, SHARPEE-GAP closed), turning (lifecycle row + cutting-style rewrite).

Changes vs the 2026-07-15 audit (recorded by the f5c22c re-run): pushing/pulling
✅→❌ (were never actually loadable); lowering/raising ❌→✅ (`define action`
shadowing path is live and recommended by the loader's own diagnostic);
going/searching ✅→⚠️; attacking ❌→⚠️; hiding's gap narrowed (grammar half
already done); locking's caveat closed; 5 new rows.

## Part 2 — Daemons & fuses (re-verified 2026-07-17)

Reachable (CAN): fixed timelines (`define sequence` + `at turn N` / `N turns
later` / `when <owner> becomes <state>`), presence-gated recurring
(`on every turn` on entity/trait), `while` condition gates on every-turn
clauses, `, once`, the full statement kit in sequence steps, seeded chance
(`one chance in N`, Chord's own persisted-cursor RNG), save/restore by
construction (world-state progression).

All seven previously-claimed gaps **still hold** (verified against parser/EBNF/
runtime; no ratchet entry adds scheduler surface): sequence cancel/abort,
inline "in N turns" delay, data-driven delays (anchors NUMBER-only,
parser.ts:1738-1743), repeating period timer (`every N turns` removed
2026-07-11), runtime reschedule/pause/resume, entity-bound auto-cleanup,
explicit priority.

**New findings this pass:**
- **Presence gating** (missed before): every Chord `on every turn` is entity/
  trait-owned and fires only with the player present at the owner
  (runtime.ts:852, 884-886). There is NO story-global recurring daemon surface —
  off-stage simulation (weather, background clocks) is inexpressible.
- Sequences cannot even be declaratively suspended: `define sequence` takes no
  `while`; per-statement `when` no-ops the body while the pointer still
  advances. State anchors are level-triggered and fire once per story (pointer
  never resets) — no re-armable timer by composition.
- Semantic delta: TS `runOnce` consumes only when the run produced events;
  Chord `, once` consumes on condition+presence pass regardless.
- TS-side latent: `Fuse.entityId` "automatic cleanup" has **zero callers** of
  `cleanupEntity` platform-wide (Defect D6); daemon pause/resume + introspection
  APIs exist in TS with no Chord analog (low value for Chord's scheme).
- Stale comment: runtime.ts:784 still advertises removed `once`/`every N turns`
  top-level forms.

## Part 3 — Plugins & extensions (re-verified 2026-07-17)

- **The old "scripting inside pre-registered plugins" framing was wrong for 2
  of 3 plugins**: the Chord loader registers ONLY `SchedulerPlugin` (and only
  when daemons exist, loader.ts:522-528). **NpcPlugin and StateMachinePlugin
  are never registered for a Chord story** (zero imports in chord/story-loader);
  `a person` gets ActorTrait only, no NpcTrait — the NPC subsystem is bypassed
  entirely.
- **No registration/opt-in surface — confirmed**: no `use`/`enable`/`register`
  token in EBNF/lexer/parser; hatches import a single symbol and disqualify the
  pure-IR profile.
- **Behavior hatch is dead code** (Defect D2, confirmed by two independent
  investigators): `define behavior X from` is bound + shape-validated into
  `boundBehaviors` (loader.ts:295-305), which **nothing ever registers or
  reads**. A behavior hatch can never fire. This is the root of the turning gap
  and blocks the capability-behavior arm of cuttable/diggable for pure-Chord
  authors.
- **"Combat inexpressible" was too strong**: `on attacking it` compiles to a
  live consulted interceptor — scripted fights (refuse, phrase, change, kill
  the player, lose) are fully authorable. What's unreachable is *systemic*
  combat: combatant/weapon/health traits and `registerBasicCombat` (needs a
  load-time world call no Chord surface can make).
- TS-side reality check: plugin-npc has **no pathfinding** (follower/patrol
  need a direct exit; "simplified" by its own comment); NPC goals are inert
  data. Real TS-only deltas: behavior library (guard/wanderer/follower/patrol),
  enter/leave/speak/attacked/observe hooks (Chord has only `after entering` on
  rooms + role-forms + `on attacking it`), NpcAction vocabulary, movement
  announcements, `registerTickPhase`, `registerNpcCombatResolver`.
- State machines: Chord's per-owner `states:` sets + `change`/conditions cover
  transitions/guards/effects near-1:1 for simple machines; missing = named
  multi-machine registry with history, per-transition priority,
  `onEnter`/`onExit` bundles (effects hang on statement sites — same-state
  entry from two clauses duplicates code), TS custom guards/effects.
  Irreversible state order is a weak `terminal` analog.
- In-language `define trait` / `define action` (pure-IR-safe) remain the
  strong CAN story — full behavior bundles without hatches.

## Part 4 — Platform-browser emits (re-verified 2026-07-17)

Reachable (CAN): `main` prose, `prompt`, status (`location`/`score` via
`award`/`turn`), `info`/`ifid` (header metadata), endgame via `win`/`lose`,
death via `kill the player` (ADR-227 D4 — new since last audit), scene-narration
channels (`present`/`entered`/`exited`/`disappeared`/`detail`).

Unreachable (CHORD-GAP): **every media/audio/image channel** — `image:*`
(+preload, hotspots), `sound`, `music`, `ambient:*`, `animation`, `animate`
(distinct channel the old audit didn't name), `transition`, `layout`, `clear`,
legacy `audio.*`, and the `audibility` spatial-sound channel (ADR-172 — missed
entirely by the old audit; no Chord sound-emission statement or trait). Channel/
renderer registration has no Chord surface.

**Sharper root cause than "no payload"**: Chord's lexer cannot even tokenize a
dotted event type — `emit media.sound.play` lexes `.` as punct and produces the
event type `"media . sound . play"` (lexer.ts:54, analyzer.ts:1204). Even the
payload-free `clear` channel is unreachable. `emit`'s data is hard-coded `{}`
(runtime.ts:1051, 1534-1542) — confirmed.

**Design already exists**: ADR-216 (emit payload + media sugar + custom-channel
declaration) and ADR-215 (renderer pairing) are both **ACCEPTED with zero
implementation landed** — the old audit's "needs its own ADR" items are done at
the design level; the work is implementation.

**SHARPEE-side wire findings** (not Chord gaps): the `death` channel wants
`data.message` but `killPlayer` emits `messageId`/`cause` only — no producer
anywhere feeds the channel (death prose rides `main`; Defect D4).
`score_notify` has no production emitter platform-wide (dormant by
documentation). Flagged-not-asserted: `game.won`/`game.lost` are emitted in
`stop()` after the turn's channel packet is built and turn events cleared —
from code read, the `endgame` channel may never see them in a packet; needs a
runtime check before recording as a defect (Defect D5).

## Defects & latent findings (cross-cutting — surfaced per the no-silent-gaps policy)

| # | Finding | Nature |
|---|---|---|
| D1 | ~~`pushable`/`pullable`: catalog accepts, loader throws misleading "not a v1 adjective" — compile/load contract break~~ **FIXED 2026-07-17** (session 615882): loader cases added + fixtures | fixed |
| D2 | `define behavior … from` hatch: bound, validated, never consumed (`boundBehaviors` has no reader) — can never fire; ~~root of turning gap~~ (turning re-routed via its lifecycle row 2026-07-17; hatch itself still dead — Phase 5 extension-surface ADR resolves or subsumes it) | defect (dead feature) |
| D3 | ~~`openable with tool X` compiles and is silently ignored~~ **FIXED 2026-07-17** (session 615882): loader reads the tool config (resolved world id). The broader gap — no per-adjective config-key validation in the analyzer, so unknown config keys on any adjective still drop silently — remains open | fixed (narrow); analyzer validation open |
| D4 | `death` channel: `data.message` vs `messageId` producer/consumer mismatch — channel is never fed by anything | SHARPEE wire gap |
| D5 | `endgame` channel: `game.won/lost` emitted after packet build + turn-event clear — channel delivery doubtful (UNVERIFIED at runtime) | needs runtime check |
| D6 | `Fuse.entityId` auto-cleanup: `cleanupEntity` has zero callers platform-wide; Chord's `remove <entity>` doesn't invoke it either | TS latent gap |
| D7 | runtime.ts:784 comment advertises grammar forms removed 2026-07-11 | stale comment |

## Extension-surface closure (2026-07-18, session 501cac — ADR-215/216 SHIPPED)

The full S3 slice landed (docs/work/chord-extension-surface/plan.md, all 7
phases). Rows above/below that read "unreachable / no opt-in surface" are
superseded as follows:

- **Opt-in surface**: `use <extension>` header line + static vocabulary
  manifests + trusted runtime registry. `combatant`/`weapon` (systemic
  combat via `registerBasicCombat`) are live; the "notably absent"
  adjectives list is closed for combat (health/max-health route to
  HealthTrait per ADR-226).
- **NPC plugin**: auto-wires for every Chord story (CORE, no `use npcs`);
  guard/passive/wanderer/follower/patrol are composable vocabulary with
  params (incl. `patrol route [ … ]` lists).
- **State-machine plugin**: `use state-machines` gates the full ADR-119
  depth via `define machine` (roles, onEnter/onExit, terminal, triggers);
  existing `states:`/`select`/`change` untouched.
- **Media/browser emits**: payloaded `emit` (dotted event types FIXED —
  the lexer mangle is gone), full media sugar + declared assets, custom
  `define channel` projections, `client has <capability>` degradation.
  Every `media.*` channel and `clear` are now reachable; channel
  DECLARATION has a Chord surface (novel renderers ship via the trusted
  registry's `registerChannels` slot — live, unexercised by bundled
  extensions today). Story-global daemons landed separately (ADR-236 D7).
- Still open (unchanged): imperative timer management (ADR-235 D4
  non-goal), topic surface (asking/telling), `audibility` spatial-sound
  channel, legacy `audio.*` (reachable via raw emit only), third-party
  extensions (deferred ADR).

## Parity scoreboard (all four parts, 2026-07-17; superseded in part by the 2026-07-18 closure above)

| Surface | Reachable today | Gap |
|---|---|---|
| **Actions** | 51/54 full + 3 partial (attacking ✅ 2026-07-18) | 0 hard gaps; door construct still doesn't load (child ADR ruled, Q-1) |
| **Daemons/fuses** | fixed timelines + presence/region-gated recurring + story-global (ADR-236) | imperative timer management (cancel, inline delay, period, reschedule, priority) |
| **Plugins/extensions** | scheduler + NPC (auto-wired) + state-machines (`use`) + combat (`use`); in-language define trait/action strong | third-party extensions (deferred ADR); behavior hatch REMOVED (D2, by design) |
| **Browser emits** | all text surfaces + all media/audio channels (payloaded emit, sugar, assets, custom channels, `client has`) | `audibility` spatial channel; legacy `audio.*` via raw emit only |

**The load-bearing design-heavy gaps** (unchanged in kind, sharper in detail):
1. **Door loading** — child ADR ruled (ADR-233 Q-1): `between` + `through`, both in-gate.
2. **Extension/plugin opt-in surface** — gates systemic combat, NPC library, ambient channels. (ADR-233 Q-2, deferred to this audit's numbers.)
3. **Emit payload + media** — ADR-215/216 accepted, unimplemented.
4. **Topic surface for asking/telling** — new since last audit (the actions grew topics; Chord can't see them).

**The mechanical shortlist — CLOSED 2026-07-17** (session 615882, plan Phase 3;
each item signed off by David, ratchet entries G1–G4 + recorded closures): D1
pushable/pullable loader cases ✅; `drinkable` ✅; `concealed` ✅; `hiding-spot`
✅; bare `cut`/`dig` grammar ✅; openable tool config (D3) ✅; turning lifecycle
row ✅.

## Process

Closing any gap is **platform work** governed by the ADR-210 grammar ratchet
(`docs/architecture/chord-grammar-changes.md`) and David's explicit sign-off;
larger design questions (extension surface, capability-verb exposure) carry
their own ADRs. This audit is the **input** to that work, not the change.

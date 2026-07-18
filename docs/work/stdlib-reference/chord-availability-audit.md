# Chord Availability Audit — Sharpee → Chord parity

**North star** (David, 2026-07-14): **100% Sharpee == 100% Chord.** Every
standard action, daemon, plugin, and platform-browser emit must be expressible
from a `.story` file — not just reachable in TypeScript. Chord is meant to be a
complete authoring surface for the platform, not a subset.

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
(`with text …`), `openable`, `lockable` (`with key <entity>`), `switchable`,
`edible`, `light-source`, `plural`, `dark`, `enterable` (ratchet F1),
`climbable` (ratchet F2), `cuttable` (`with tool <entity>`), `diggable`
(`with tool <entity>`), `pushable`‡, `pullable`‡.
**State initializers**: `starts open/closed/locked/unlocked/on/off` +
generic `starts <state-adjective>` (ADR-231 D5).

† `a door` **throws a LoadError** (`loader.ts:750-751` — "doors need `between`
placement") — the door child ADR (ADR-233 G1, Q-1 ruled) closes this.
‡ `pushable`/`pullable` are **catalog-listed but broken**: the loader's
`applyTraitAdjectives` switch has no case for either, so they compile and then
fail at load with a misleading "not a v1 adjective" error. See Defects.

Notably **absent**: `drinkable`/liquid marking, `concealed`, a concealment
("hiding-spot") adjective, `combatant`, `weapon`, `health`, `breakable`,
`destructible`, any sound/listener trait, `npc`, `vehicle`, `region`.

## Verdict legend
- **✅ reachable** — usable in Chord today with composable vocabulary (or needs no trait).
- **⚠️ partial** — the basic path works; a real dimension of the action has no Chord surface.
- **❌ gap** — unreachable from Chord without platform work.

## Manipulation (§2) — 11 ✅, 2 ❌

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
| pushing | PUSHABLE (`pushing.ts:133`) | **catalog has `pushable` (catalog.ts:35) but loader has no case → LoadError** | ❌ | CHORD-GAP | 1-line loader case `new PushableTrait({})` + fixture (Defect D1) |
| pulling | PULLABLE (`pulling.ts:112`) | same break (catalog.ts:36) | ❌ | CHORD-GAP | same (Defect D1) |
| touching | REACHABLE scope only | grammar complete | ✅ | CAN | — |
| lowering | ADR-090 capability dispatch | **`define action lowering`** + `define trait … on lowering it` → CapabilityBehavior dispatch; story grammar @150 shadows core verb; the loader's dead-gerund diagnostic recommends exactly this path (`runtime.ts:261-266`) | ✅ | CAN | — (verdict FLIPPED from ❌: the binding surface exists now) |
| raising | same | same; author must declare both `raise` and `lift` patterns to cover core aliases | ✅ | CAN | doc note only |

## Movement (§3) & Senses (§6) — 8 ✅, 2 ⚠️, 1 ❌

| Action | Requirement | Chord path | Verdict | Class | To close |
|---|---|---|---|---|---|
| going | ROOM + exit config; door via `exit.via` (`going.ts:273-301`) | exits + static/conditional blocked exits ✅; **door-gated exits unreachable** — `a door` LoadError, `connectRooms` never sets `via`, so going's door_closed/door_locked branches are dead from Chord | ⚠️ | CAN (plain/blocked) / CHORD-GAP (doors) | door child ADR (ADR-233 Q-1 ruled: `between` on door + `through` exit sugar) |
| exiting | containment state; target-aware (ADR-231 P5) | `enterable` + full exit grammar incl. `get/climb out of :container` | ✅ | CAN | — |
| entering | ENTERABLE, open if openable | `enterable` (ratchet F1) | ✅ | CAN | — |
| climbing | CLIMBABLE or enterable supporter; directional via exits | `climbable` (ratchet F2) + `climb :target` family. (No bare `climb up/down` core rule — `go up` covers it; observation, not a gap) | ✅ | CAN | — |
| examining | visible object | any entity + description | ✅ | CAN | — |
| looking | always valid | any room | ✅ | CAN | — |
| searching | closed container blocks; payoff = revealing `IdentityTrait.concealed` items | base search ✅; **no Chord surface sets `concealed`** (zero hits in chord/story-loader) | ⚠️ | CAN (base) / CHORD-GAP (reveal) | `concealed` marker adjective → `IdentityTrait.concealed = true`; searching then works with zero further platform work |
| reading | READABLE | `readable with text …` | ✅ | CAN | — |
| listening | always valid | text-varying traits composable | ✅ | CAN | — |
| smelling | same-room target | composable | ✅ | CAN | — |
| hiding | ConcealmentTrait + position extra | grammar DONE (`hide behind/under/in :target` supplies position via semantics, grammar.ts:1082-1098); **no adjective maps to ConcealmentTrait** | ❌ | CHORD-GAP | single missing piece: catalog adjective (e.g. `hiding-spot`) + loader case with positions config (cuttable-style) |

## Containers, wearing, devices, tools (§4/§5/§7) — 8 ✅, 2 ⚠️, 1 ❌

| Action | Requirement | Chord path | Verdict | Class | To close |
|---|---|---|---|---|---|
| opening | OPENABLE; optional tool gate (`OpenableBehavior.requiresTool`) | `openable`; D5b closed-default confirmed in code; **`with tool` config silently ignored by loader** (Defect D3) | ✅ | CAN | read tool config in loader `openable` case (pendingEntityRefs, cuttable precedent) |
| closing | OPENABLE, open | `openable` | ✅ | CAN | — |
| locking | LOCKABLE, closed, key if required | `lockable with key <entity>` (ADR-230 P9a) + `starts locked/unlocked` — old "keyed variant" caveat CLOSED | ✅ | CAN | — |
| unlocking | LOCKABLE, locked | same | ✅ | CAN | — |
| wearing | WEARABLE, carried | `wearable` (bodyPart/layer config not composable — inert, harmless) | ✅ | CAN | — |
| taking_off | worn by actor | same | ✅ | CAN | — |
| switching_on | SWITCHABLE; power gate | `switchable` + `starts on/off` (requiresPower not composable — default trait only) | ✅ | CAN | — |
| switching_off | SWITCHABLE, on | same | ✅ | CAN | — |
| turning (NEW) | pure ADR-090 dispatch; grammar `turn/rotate/twist :target` exists | **no route**: `on turning it` = load-time dead-gerund error (no `turningLifecycle` in registry.ts:70-108); trait-clause behaviors register `chord.action.*` only; behavior hatch dead (Defect D2) | ❌ | CHORD-GAP | add `turningLifecycle` descriptor + registry row (cutting-style dual surface) — platform change, needs discussion |
| cutting (NEW) | CUTTABLE + exactly-one implementation (behavior XOR interceptor) | `cuttable [with tool …]` + `on cutting it` both compose; **but grammar has ONLY `cut :object with :tool` — no bare `cut :target` anywhere** | ⚠️ | SHARPEE-GAP | bare `cut/slice/chop :target` grammar family — an untooled cuttable is unreachable for TS and Chord alike |
| digging (NEW) | DIGGABLE, same structure | `diggable [with tool …]` + `on digging it`; same bare-grammar hole (`dig :location with :tool` only) | ⚠️ | SHARPEE-GAP | bare `dig :target` grammar |

`deadly-room-death` is an internal system action (no grammar by design; redirect
target of the engine's deadly-room transformer). Its authoring surface —
`deadly:` rooms and `<dir> is deadly:` exits — IS Chord-composable. Excluded
from player-action counts. (`is deadly while <cond>` parses but is explicitly
not wired — pre-existing, documented.)

## NPCs, conversation & consumption (§8) — 2 ✅, 3 ⚠️, 1 ❌

| Action | Requirement | Chord path | Verdict | Class | To close |
|---|---|---|---|---|---|
| talking | ACTOR | `a person`; `on talking it` overrides the response | ✅ | CAN | richer conversation trees remain surface-less (see Part 3) |
| asking (NEW) | ACTOR; reads `command.topic` (ADR-231 D4) | eligibility + `:topic` grammar ✅; `on asking it` gives ONE blanket answer; **Chord has zero topic surface** (no `topic` anywhere in chord/story-loader) — no per-topic branching | ⚠️ | CHORD-GAP | expose topic to on-clauses, e.g. `on asking it about "sword"` or a `the topic is …` condition (one surface serves asking+telling) |
| telling (NEW) | same shape | same | ⚠️ | CHORD-GAP | same |
| eating | EDIBLE, not liquid, servings | `edible` | ✅ | CAN | — |
| drinking | EDIBLE.liquid OR CONTAINER.containsLiquid (`drinking.ts:236-246`) | **no path**: no `drinkable` adjective, loader's `edible` never sets `liquid`, `containsLiquid` unreachable, custom traits are `chord.trait.*` not EDIBLE, interceptors can't force validity | ❌ | CHORD-GAP | `drinkable` adjective → `EdibleTrait({ liquid: true })` (or `edible with liquid`) — plan Phase 3 quick win |
| attacking | any target validates; plain target → inert "no effect"; COMBATANT combat needs a registered combat interceptor | verb + **scripted combat ✅**: `on attacking it` refuses/overrides freely (kill the player, change, remove, lose). Systemic combat ❌: no combatant/weapon/health adjectives, no extension opt-in surface | ⚠️ | CAN (narrative) / CHORD-GAP (systemic) | extension-use surface (Part 3); narrative fights need nothing |

## Meta & system (§9) — 13 ✅

about, help, inventory, scoring, version, saving, restoring, restarting,
quitting, waiting, sleeping, again, undoing — all validate unconditionally or
on runtime capability state (save restrictions, command history), never on a
trait. All parse. All CAN.

## Part 1 result — 54 player-facing actions

**42 ✅ full · 7 ⚠️ partial · 5 ❌ gaps** (the set grew from 49 to 54:
asking, telling, turning, cutting, digging now have rows; deadly-room-death
excluded as internal).

| Bucket | Actions |
|---|---|
| ❌ gaps (5) | pushing, pulling (Defect D1 — loader cases missing), hiding (adjective add), turning (lifecycle row — discuss), drinking (quick win, plan Phase 3) |
| ⚠️ partial (7) | going (doors → child ADR), searching (`concealed` adjective), cutting, digging (bare-verb grammar, SHARPEE-GAP), asking, telling (topic surface), attacking (systemic combat → extension surface) |

Changes vs the 2026-07-15 audit: pushing/pulling ✅→❌ (were never actually
loadable); lowering/raising ❌→✅ (`define action` shadowing path is live and
recommended by the loader's own diagnostic); going/searching ✅→⚠️; attacking
❌→⚠️; hiding's gap narrowed (grammar half already done); locking's caveat
closed; 5 new rows.

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
| D1 | `pushable`/`pullable`: catalog accepts, loader throws misleading "not a v1 adjective" — compile/load contract break (`--check` passes a story that load rejects) | defect; ~6-line fix + fixtures |
| D2 | `define behavior … from` hatch: bound, validated, never consumed (`boundBehaviors` has no reader) — can never fire; root of turning gap | defect (dead feature) |
| D3 | `openable with tool X` compiles and is silently ignored (no per-adjective config-key validation in analyzer) | defect (silent drop) |
| D4 | `death` channel: `data.message` vs `messageId` producer/consumer mismatch — channel is never fed by anything | SHARPEE wire gap |
| D5 | `endgame` channel: `game.won/lost` emitted after packet build + turn-event clear — channel delivery doubtful (UNVERIFIED at runtime) | needs runtime check |
| D6 | `Fuse.entityId` auto-cleanup: `cleanupEntity` has zero callers platform-wide; Chord's `remove <entity>` doesn't invoke it either | TS latent gap |
| D7 | runtime.ts:784 comment advertises grammar forms removed 2026-07-11 | stale comment |

## Parity scoreboard (all four parts, 2026-07-17)

| Surface | Reachable today | Gap |
|---|---|---|
| **Actions** | 42/54 full + 7 partial | 5 gaps; door construct still doesn't load (child ADR ruled, Q-1) |
| **Daemons/fuses** | fixed timelines + presence-gated recurring | imperative timer management (cancel, inline delay, period, reschedule, priority) + **no story-global daemon** |
| **Plugins/extensions** | scheduler only; in-language define trait/action strong | NPC + state-machine plugins never registered for Chord; no opt-in surface; systemic combat unreachable; behavior hatch dead (D2) |
| **Browser emits** | all text surfaces (incl. `kill the player`) | all media/audio channels; dotted event types unlexable; no payload; no channel registration (ADR-215/216 ACCEPTED, unimplemented) |

**The load-bearing design-heavy gaps** (unchanged in kind, sharper in detail):
1. **Door loading** — child ADR ruled (ADR-233 Q-1): `between` + `through`, both in-gate.
2. **Extension/plugin opt-in surface** — gates systemic combat, NPC library, ambient channels. (ADR-233 Q-2, deferred to this audit's numbers.)
3. **Emit payload + media** — ADR-215/216 accepted, unimplemented.
4. **Topic surface for asking/telling** — new since last audit (the actions grew topics; Chord can't see them).

**The mechanical shortlist** (small, high-value): D1 pushable/pullable loader
cases; `drinkable` (plan Phase 3); `concealed` adjective; hiding-spot adjective;
bare `cut`/`dig` grammar (SHARPEE-GAP); openable tool config (D3); turning
lifecycle row.

## Process

Closing any gap is **platform work** governed by the ADR-210 grammar ratchet
(`docs/architecture/chord-grammar-changes.md`) and David's explicit sign-off;
larger design questions (extension surface, capability-verb exposure) carry
their own ADRs. This audit is the **input** to that work, not the change.

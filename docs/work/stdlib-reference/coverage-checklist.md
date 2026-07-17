# Standard Library Reference — Coverage Checklist

Every one of the 50 standard action directories
(`packages/stdlib/src/actions/standard/`), 40 traits
(`packages/world-model/src/traits/`), and the runtime plugin/daemon services
mapped to exactly one section of `docs/reference/stdlib-reference.md`. This is
the acceptance check for "the whole standard library is cataloged": no row may
be left unchecked when the plan closes. Check a row (`[x]`) only when its
section has final prose.

**Refreshed 2026-07-16** (post ADR-218/224/226/227/228/229): counts re-trued
(50 action dirs — the new one, `deadly-room-death`, is internal, never
player-typed; 40 traits — new: `health`, `deadly-room`); a Death chapter added
as §9 (Meta → §10, Traits catalog → §11, Plugins → §12); death constructs and
interceptor-surface notes added below.

**Harness decision (Phase 1): DROPPED** — owner chose "prose only, no harness"
(2026-07-14). Examples are hand-written real Chord syntax, ad-hoc sanity-checked
against `@sharpee/chord` during drafting; there is no committed
`verify-examples.mjs`, no `fixtures/`, and no Phase 9 sweep.

**Verb grounding sources** (read Phase 1): `packages/parser-en-us/src/grammar.ts`
(parse patterns + multi-slot forms) and `packages/lang-en-us/src/data/verbs.ts`
(per-action verb vocabulary). Verbs below are the union; content phases confirm
per-action detail from the action's own `*-messages.ts` / `*-data.ts`.

**Classification** (ADR-090 / `packages/stdlib/CLAUDE.md`): *standard* = one
canonical behavior stdlib implements; *dispatch* = no single behavior, meaning
is per-entity/story-defined (documented as such, never given an invented
default). In the 50 dirs, only `lowering` and `raising` are dispatch verbs
(TURN/WAVE/WIND have no action directory), and `deadly-room-death` is
*internal* — a redirect target with no grammar (see §9 rows).

## Actions — Manipulation (§2)

- [x] `taking` — take, get, grab, pick up, take up — *standard* — §2 (portable by default; SceneryTrait blocks)
- [x] `dropping` — drop, discard, put down — *standard* — §2
- [x] `putting` — put on/onto (supporter), hang on — *standard* — §2
- [x] `inserting` — put/insert in/into/inside (container) — *standard* — §2
- [x] `removing` — remove/take X from container/surface — *standard* — §2 (take-from; distinct from `taking_off`)
- [x] `giving` — give/offer/hand … to recipient — *standard* (NPC) — §2
- [x] `showing` — show/display/present … to recipient — *standard* (NPC) — §2
- [x] `throwing` — throw/toss/hurl … at/to — *standard* — §2
- [x] `pushing` — push, press, shove, move — *standard* (per-entity extensible) — §2
- [x] `pulling` — pull, tug, drag, yank — *standard* (per-entity extensible) — §2
- [x] `touching` — touch, feel, rub, pat, stroke, poke, prod — *standard* (report) — §2
- [x] `lowering` — lower :target — **dispatch** (per-entity; Chord-authorable: `define action` + trait `on lowering it`, see cross-cutting note) — §2
- [x] `raising` — raise|lift :target — **dispatch** (same treatment as lowering) — §2

## Actions — Movement (§3)

- [x] `going` — go/move/walk/run/travel + 10 directions (n/s/e/w/ne/nw/se/sw/up/down) — *standard* — §3
- [x] `entering` — enter, go in/into, get in, climb in, board (vehicle) — *standard* — §3
- [x] `exiting` — exit, leave, get out, climb out, disembark, alight, get off — *standard* — §3
- [x] `climbing` — climb [up|down], scale, ascend, descend :target (ADR-218 §1a; gated on CLIMBABLE; climb in/into → entering, climb out → exiting) — *standard* — §3

## Actions — Containers & openables (§4)

- [x] `opening` — open (unwrap/uncover in verbs.ts do NOT parse — grammar-rule-driven) — *standard* — §4
- [x] `closing` — close (shut/cover do NOT parse) — *standard* — §4
- [x] `locking` — **NO core grammar (CLI-verified 2026-07-16)** — action complete but player-unreachable without story grammar; key slot (ADR-229 R2) documented — §4
- [x] `unlocking` — unlock :door with|using :key ONLY (keyless `unlock X` does not parse; CLI-verified) — *standard* — §4

## Actions — Wearing (§5)

- [x] `wearing` — wear, put on, don, equip — *standard* — §5 (ADR-229 R1: conflict refusal folded into validate)
- [x] `taking_off` — remove, take off, doff, unequip — *standard* — §5 (ADR-229 R1: layering/cursed refusals folded into validate)

## Actions — Senses & examination (§6)

- [x] `examining` — examine, x, inspect, look at (check/view/observe do NOT parse; `look carefully at` → orphan if.action.examining_carefully) — *standard* — §6
- [x] `looking` — look, l, look around — *standard* — §6 (structural interceptor exemption — no entity slot; brief mode unimplemented)
- [x] `searching` — search, look in/inside/through, rummage (find/locate do NOT parse) — *standard* — §6 (reveals IdentityTrait.concealed items)
- [x] `reading` — read, peruse, study — *standard* — §6
- [x] `listening` — **NO core grammar (CLI-verified 2026-07-16)** — wired-but-unreachable; documented for when grammar lands — §6
- [x] `smelling` — **NO core grammar (CLI-verified 2026-07-16)** — wired-but-unreachable — §6

## Actions — Devices (§7)

- [x] `switching_on` — turn|switch|flip on :device, turn :device on (switch/flip reversed forms + activate/start do NOT parse) — *standard* — §7
- [x] `switching_off` — turn|switch|flip off :device, turn :device off (deactivate/stop do NOT parse) — *standard* — §7

## Actions — NPCs & conversation (§8)

- [x] `talking` — talk/speak to|with, chat/converse with — *standard* (NPC) — §8 (ADR-229 R3; not_actor deliberately hook-visible)
- [x] `attacking` — attack/hit/strike/kill/fight/slay/murder; weapon form skips fight/slay/murder; break/smash/destroy do NOT parse — *standard* (combat) — §8
- [x] `eating` — eat, consume, devour — *standard* — §8 (item never removed from play — caveat documented)
- [x] `drinking` — drink, sip, quaff (swallow does NOT parse — `gulped` dead) — *standard* — §8
- [x] `hiding` — hide/duck/crouch + position (bare `hide` does not parse); reveal = if.action.revealing (stand up/come out/unhide) — §8

## Actions & constructs — Death (§9) — added in refresh (ADR-224/226/227)

- [x] `deadly-room-death` — **internal**, no grammar, never player-typed — the generic redirect target: deadly-exit/deadly-room command transformers rewrite the lethal verb to it pre-validate; it calls `killPlayer` (ADR-224 sink) and reports — §9
- [x] `kill the player <phrase-key> [when <cond>]` — Chord statement (peer to win/lose) usable in on/after clauses and `on every turn [while <cond>]` — §9
- [x] `<direction> is deadly: <phrase>` — deadly exit clause (mirrors `is blocked:`); `is deadly while <cond>:` parses but is NOT wired (post-scope load error) — document the limitation — §9
- [x] `deadly: <phrase>` — room marker → DeadlyRoomTrait (safeVerbs default look/examine) — §9

## Actions — Meta/system (§10)

- [x] `about` — about, info, credits — §10
- [x] `help` — help (? and commands do NOT parse; topic form dormant — no slot) — §10
- [x] `inventory` — inventory, i, inv — §10
- [x] `scoring` — score (points does NOT parse) — §10
- [x] `saving` — save (save game does NOT parse; named saves dormant) — §10
- [x] `restoring` — restore (load/load game do NOT parse) — §10
- [x] `quitting` — quit, q (auto-confirms without client hook) — §10
- [x] `restarting` — restart — §10 (NO lang-en-us file — message keys unbacked, flagged)
- [x] `version` — version — §10
- [x] `again` — again, g (re-parses raw text; meta commands excluded) — §10
- [x] `undoing` — undo (depth 10 default; no story veto; no undo-after-death) — §10
- [x] `waiting` — wait, z — §10 (single message; 12 lang variants dead)
- [x] `sleeping` — **NO core grammar (runtime-verified 2026-07-16)** — sleep/nap/doze/rest/slumber all fail to parse; flavor-only if reached — §10

## Traits (§11 — catalog; each also introduced in its owning action chapter)

### Manipulation traits (introduced §2)
- [x] `container` — holds things inside — §2 / §11
- [x] `supporter` — holds things on top (capacity) — §2 / §11
- [x] `pushable` — §2 / §11
- [x] `pullable` — §2 / §11
- [x] `moveable-scenery` — §2 / §11
- [x] `attached` — §2 / §11

### Movement / containers traits (introduced §3–§4)
- [x] `room` — §3 / §11
- [x] `exit` — §3 / §11
- [x] `door` — composes openable + lockable — §4 / §11
- [x] `enterable` — §3 / §11
- [x] `climbable` — §3 / §11
- [x] `vehicle` — §3 / §11
- [x] `openable` — §4 / §11
- [x] `lockable` — §4 / §11

### Wearing / senses traits (introduced §5–§6)
- [x] `wearable` — §5 / §11
- [x] `clothing` — §5 / §11
- [x] `equipped` — §5 / §11
- [x] `open-inventory` — §5 / §11
- [x] `readable` — §6 / §11
- [x] `scenery` — fixed in place, blocks taking — §6 / §11
- [x] `concealment` — §6 / §11
- [x] `acoustic` — §6 / §11
- [x] `listener` — §6 / §11

### Devices / NPC traits (introduced §7–§8)
- [x] `switchable` — §7 / §11
- [x] `light-source` — §7 / §11
- [x] `button` — §7 / §11
- [x] `breakable` — §8 / §11
- [x] `destructible` — §8 / §11
- [x] `edible` — §8 / §11
- [x] `actor` — §8 / §11
- [x] `npc` — §8 / §11
- [x] `character-model` — §8 / §11
- [x] `combatant` — §8 / §11
- [x] `weapon` — §8 / §11

### Death traits (introduced §9) — added in refresh
- [x] `deadly-room` — room where any verb outside `safeVerbs` (default look/examine) is fatal; fields cause, messageId, safeVerbs, chance (probabilistic hazard, seeded engine RNG) — Chord-authorable via `deadly:` clause, NOT a catalog adjective — §9 / §11
- [x] `health` — ADR-226 life-state model (health/maxHealth, consciousness threshold, asleep, dead/causeOfDeath; behavior owns takeDamage/heal/kill) — **engine-only today: no Chord adjective or config**; attached programmatically (e.g. killPlayer) — document as platform internals with a "no Chord surface yet" note — §9 / §11

### Structural / authoring traits (no 1:1 verb — introduced §11)
- [x] `identity` — name/description/aliases — §11
- [x] `region` — §11
- [x] `scene` — §11
- [x] `story-info` — §11

## Plugins & daemons (§12)

- [x] Turn-plugin concept + `plugins`/`plugin-registry` (priority order: NPC 100, state machines 75, scheduler 50) — §12
- [x] `plugin-scheduler` — daemons/fuses; what a `define sequence` step-anchor runs on — §12
- [x] `plugin-npc` — NPC turn plugin — §12
- [x] `plugin-state-machine` — state-machine plugin — §12
- [x] `extensions/basic-combat` — worked "plugin built on the standard layers" example — §12

## Cross-cutting notes for content phases
- Every action's "message keys" section shows the **message ID** stdlib
  emits, never invented English as if it were the platform default
  (`lang-en-us` owns text). Confirm each action's keys from its
  `*-messages.ts` (several actions carry them in `requiredMessages` instead —
  no separate messages file). **Verified 2026-07-16 (Phase 2)**: Chord has NO
  story-wide override of a dotted platform ID — the `define phrases` block
  rejects dotted keys (`parse.phrase-entry`) and `define phrase` silently
  truncates at the first dot (registers key `if`!). Document per-entity
  `on`/`after`-clause customization as the Chord Way; ID-level override is
  TypeScript-only today. Both facts flagged to owner (the silent truncation
  is a bug candidate).
- **Interceptor surface (ADR-228, added in refresh)**: the ground truth for
  which actions an author can intercept with `on <gerund> it` / `after
  <gerund> it` clauses is the D5 registry
  (`packages/stdlib/src/actions/lifecycle/registry.ts`,
  `interceptorConsultingActionIds` — derived union over the 33-descriptor
  table; 34 distinct ids incl. `if.action.entering_room` on going's
  destination slot, ADR-126). Slot detail for content phases: attacking
  (target, weapon — explicit only; postExecuteReplacesCore), giving
  (item, recipient), going (source, destination→entering_room, door),
  inserting (item, container; delegates into putting, D6-B), locking/unlocking
  (target → key, ADR-229 R2), putting (item, container), removing (item
  consults removing THEN taking, D6; source), showing (item, viewer),
  throwing (item, target). Unknown gerunds are a load error (D5 fail-fast).
  Syntax itself (on/after, while/once, refuse/must, before/after ordering) is
  chord-language.md §3 — cross-link, don't re-explain; this doc adds the
  gerund/slot enumeration chord-language.md deliberately lacks.
- **Dispatch verbs (`lowering`, `raising`) — refreshed framing (ADR-229 R5)**:
  still no canonical behavior (ADR-090), but the Chord Way is now real and
  documented as the primary path: `define action <verb>` + a `define trait`
  carrying `on <verb>ing it`, composed onto the entity (capability behavior
  route; fall-through on false `while` gate / consumed `once` → body → next
  trait → `otherwise refuse`). Entity-level `on lowering it` is a pointed
  load error (full-delegation capability actions never consult interceptors —
  ADR-118). Worked exemplar: `stories/friendly-zoo/zoo.story` (petting/
  feeding/photographing). Cross-link chord-language.md §5.6–§5.8. Core grammar
  binds `lower :target` / `raise|lift :target`; TURN/WAVE/WIND remain unbound
  (no grammar, no action dir) — say so, don't invent them.
- Combat (`attacking`) non-determinism: document the observable outcome range;
  never propose seeding/disabling RNG (project policy).
- Cross-link to `chord-language.md` §5 (`define trait`/`define action`/hatches)
  for "extend it yourself" rather than re-explaining the `define` mechanism.
- **Death constructs are NOT in chord-language.md** (only win/lose endings,
  §4.6). Until that doc gains a death section (separate work — it is outside
  this plan's write surface), §9 here must teach the ADR-227 syntax itself,
  not cross-link. Gap flagged to owner 2026-07-16.
- genai-api footnote: `genai-api/stdlib.md` still says "43 standard actions";
  the disk has 50 dirs today (49 player-facing + 1 internal). Not this plan's
  to fix (owned by `packages/sharpee/CLAUDE.md`).

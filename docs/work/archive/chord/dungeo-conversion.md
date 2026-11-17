# Dungeo → Chord: Conversion Assessment

**Date:** 2026-07-10 · **Basis:** full sweep of `stories/dungeo/src` (43,045
lines of TS) mapped against the Chord grammar as implemented (Phase A,
`docs/work/chord/grammar.md`) and as designed (Phase B, design.md §5.11).
Method: five parallel inventory passes (world content; actions+grammar;
NPCs+combat; scheduler/state-machines/handlers; interceptors/wiring/messages).

## Executive summary

Dungeo is ~43k lines of story TS. Roughly:

| Bucket | ~LOC | Share |
|---|---|---|
| **Converts under Phase A today** (world, prose, phrases, entry rules, glue the loader subsumes) | ~10,500 | ~24% |
| **Converts under Phase B as designed** (`define action`/`trait`, `every`/`after N turns`, `define sequence`, doors) | ~9,000 | ~21% |
| **Stays TS behind hatches** (`define action/behavior from` — NPC brains, melee, complex puzzles/daemons) | ~14,000 | ~33% |
| **Out of conversion scope** (GDT debug console, room-info/diagnose meta, audio/channels/browser glue) | ~6,000 | ~14% |
| **Blocked on genuine language gaps** (see §5 — dynamic exits, event verbs, movement gates, entity lifecycle) | ~3,500 | ~8% |

So: **~45% of Dungeo becomes declarative** with Phase A + Phase B as already
designed, **a third stays TS by design** (the hatch seam working as intended),
and **~8% needs language decisions** — a concrete, enumerable gap list (§5)
rather than an open-ended problem. Dungeo would make a demanding but fair
"Phase C-era" gate; nothing found contradicts the Chord design's shape.

## 1. What converts TODAY (Phase A)

- **The world.** 193 entities: 45 rooms (~30 pure name+prose+exits), 176
  exit connections, ~148 objects of which the large majority are
  Identity + standard traits (scenery 69, openable 20, container 20,
  readable 10, …). **Zero computed descriptions** — every description in the
  game is a static string, ideal prose blocks. Aliases everywhere → `aka`.
  Underground darkness → `dark`. ~8 enum-state traits → `states:`.
- **All 492 message templates** are static `addMessage(id, template)` calls
  with `{param}`/`{verbatim:x}` placeholders — 1:1 `define phrases` entries
  (1,394 lines vanish into declarations).
- **Treasure/scoring data.** All 29 treasures are pure data
  (`IdentityTrait.points` + `TreasureTrait.trophyCaseValue`); Chord's
  `award [..., once]` statement plus first-time ordinals cover take-scoring
  and the RVAL room-visit map (13 rooms / 215 pts = `when the player enters
  X` + `first time` + `award`).
- **Room-entry rules.** ~6–7 handlers are textbook `when the player enters X
  [while <cond>]` (treasure-room thief summon, bat room, endgame scoring —
  the last exercising ordinals directly).
- **Boat vocabulary.** Exactly 4 of 150 grammar patterns alias existing
  standard actions (board/disembark → entering/exiting) — Phase A
  `define verb`.
- **Blocked-exit stubs.** 8 pseudo-actions exist solely to print a refusal
  on movement (door-blocked, river-blocked, chimney-blocked,
  rainbow-blocked, + death variants). The *static* subset is Chord
  `<dir> is blocked: <phrase>` — and notably the platform now renders
  blocked-only directions correctly (going.ts fix, 2026-07-10). The
  *conditional* subset needs §5.2.
- **Orchestration glue** (~1,005 lines of registration plumbing) is exactly
  what the compiler+loader subsume — it has no user-facing logic.
- **Regions/scenes: nothing to convert.** Zero RegionTrait/SceneTrait usage;
  the 15 "region" files are code organization only.

## 2. What converts under Phase B as designed

- **~30 of 50 custom actions** are thin single-verb validate→execute→report
  shapes (light, ring, pray, dig, tie, pour, …) — the `define action` target,
  averaging ~150 lines each (~5.5k total). The **146 remaining grammar
  patterns** all map to these new action IDs, so grammar conversion tracks
  `define action`'s pattern support (two-slot prepositional forms,
  `:slots`, literal synonyms — all shapes already in design.md).
- **All 5 state machines** (444 lines) are already declaratively shaped:
  `states` + transition-on-event + guard + effects = `states:` + `when` rules
  with `change X to Y`. Cleanest conversions in the whole story.
- **Scheduler constructs:** 1 clean `every N turns` (cure), ~6 countdown
  fuses (`after N turns`: cage-poison, troll recovery, incense, brochure,
  and the basic lantern/candle shape) — the exorcism bell/book/candle ritual
  is `define sequence` with location guards (borderline).
- **Doors.** 1 real DOOR + 3 openable-scenery barriers (trapdoor, grating,
  kitchen window) → Phase B `between` placement.
- **Simple interceptors.** 3 of 11 (safe rusted-shut refusals, trophy-case
  award, ~gas-room entry) fit `on <action> it` clauses as they stand.
- **NPC shells.** Entity creation, prose, and simple archetypes: the troll
  is a thin extension of stdlib's guardBehavior (mostly declarative +
  small hatch); cyclops and robot are declarative shells with one narrow
  TS effect each; the dungeon master's trivia table is data.

## 3. What stays TS behind hatches (by design — and cleanly)

- **The melee engine** (~2k lines: melee.ts + interceptor + npc-resolver):
  hand-rolled canonical MDL combat, already seeded (`SeededRandom`
  throughout), zero ext-basic-combat dependency, self-contained — a
  textbook single `define behavior combat from "./combat"` boundary. Its
  outcome tables and 411 lines of per-weapon/villain message tables are
  flat data that could migrate to declarations later.
- **The thief brain** (1,069 lines, 7-state machine, treasure valuation,
  lair logic, combat AI coupled to melee) — pure hatch.
- **Complex puzzle subsystems** (~4k): royal-puzzle grid, tiny-room
  key/mat/screwdriver chain, inside-mirror rotating box, balloon
  daemon+receptacle pair, basket elevator.
- **Branching/stateful daemons** (~1.6k): explosion cascade (3 chained
  fuses + brick-location branches), maintenance-room flooding escalation,
  sword-glow proximity (the one `getRunnerState` user — Chord's
  state-is-world-state design makes that plumbing moot), bank alarm.
- **~10 complex custom actions** (~2.5k): NPC command routing
  (commanding/say), scheduler-armed burn, royal-puzzle movement, bank
  walk-through, ritual answer/incant.

## 4. Out of conversion scope

GDT debug console (3,529 lines, 26 subcommands, own parser + input mode),
room-info/diagnose meta commands, ambient audio (ADR-138), custom channels
(GDT + `ambient:*`, ADR-163), browser entry. These are host/tooling
features of the story *package*, not story content — a converted Dungeo
would keep them as the TS shell around the `.story` (or drop GDT for the
Chord edition).

## 5. Genuine language gaps (the interesting output)

> **Modernized 2026-07-12** to the Phase C ownership grammar (ratchet log:
> `docs/architecture/chord-grammar-changes.md`). Examples rewritten in the
> shipped syntax; conclusions unchanged (Finding 9).

Enumerated, smallest-first — each would be a grammar-log/design decision:

1. **Event-verb vocabulary.** Handlers are now owner-attached `on <verb>ing
   it` / `after <verb>ing it` clauses (ratchet D3); action verbs ride the
   gerund register, so most of the original wish-list (**takes, drops, eats,
   throws, pushes, reads, switches on**) is `after taking it`, `on reading
   it`, etc. — the shipped Zoo shapes. The curated non-action event-verb set
   (`EVENT_VERBS` in the chord catalog) still ships `entering` only. Dungeo
   still needs: **leaving** (`after leaving it` on the room — ownership
   makes the old fromRoom filter implicit), plus system events **dies** and
   **score-displayed** (no owning verb clause). Each is one row in the
   curated event-verb set + a governance-log entry; the machinery (D3
   clause binding) exists.
2. **Conditional blocked exits.** ~10 subsystems gate movement with
   command transformers (river without boat, rainbow until solid, chimney
   carry-limit, bank alarm by inventory, grue in darkness). The natural
   Chord form already rhymes with the grammar:
   `north is blocked while <condition>: <phrase>` — a declarative,
   load-checkable form that would eliminate most transformer uses AND the
   8 blocked pseudo-actions. **Highest-leverage single addition found by
   this sweep.**
3. **Dynamic exit mutation.** Glacier-melt opens a west exit; cyclops flees
   and opens the living-room wall; the rug/trapdoor rewires DOWN. A
   `connect X <direction> to Y` / `unblock` statement pair — or modelling
   these as pre-declared exits with `blocked while` conditions (which
   covers rug and cyclops; glacier genuinely adds an exit).
4. **Runtime entity lifecycle.** Ghost ritual consumes a frame piece and
   spawns the canvas; thief death spawns loot. Chord has no
   `create`-at-runtime; options: pre-created entities in limbo + `move`
   (works today), or a spawn statement (grammar change).
5. **Runtime trait mutation.** The punctured boat loses ENTERABLE/VEHICLE.
   Already flagged as design.md §8 item 2 (conditional composition); the
   boat is the concrete test case.
6. **Vehicles.** Boat + balloon (enter-and-ride). No Chord concept; kind
   noun candidate for a later catalog rev (`a vehicle`), else hatch.
7. **Conditional prose fragments.** 10 `{snippet:...}` room-description
   injections — wants a conditional-phrase form (`phrase X while <cond>`
   or per-entity override machinery), aligned with the ADR-209 snippet
   contract.
8. **Capabilities/channels/audio seam.** SCORING capability, 6 capability
   behaviors, custom channels, audio — the story-package shell (§4) or a
   Phase C host contract.
9. **Randomness stays** (policy, David 2026-07-11): dungeo's RNG (combat,
   thief, carousel, trivia) is game design, never seeded or disabled.
   Test-side flakiness is handled with transcript logic gates (WHILE/IF/
   NAVIGATE-TO, `[ENSURES]`) — cf. the walkthrough-flakiness assessment,
   `docs/work/dungeo/assessments/full-sweep-20260710.md`. A Chord-converted
   Dungeo would carry the same behavior through Chord's own `randomly` /
   `one chance in <n>` constructs.

## 6. Recommended shape of a conversion (if/when attempted)

1. **Don't start with Dungeo.** Zoo remains the right Phase B gate; Dungeo
   is the Phase C-era stress test. But the gap list (§5) should feed Phase
   B design *now* — especially conditional blocked exits (#2), which is
   cheap, high-leverage, and Cloak-adjacent in spirit.
2. When attempted, convert inside-out: world + phrases first (pure IR,
   compiles against today's loader), then `define action` batch (~30),
   then state machines/fuses, keeping melee/thief/royal-puzzle/GDT behind
   hatches permanently. The hatch boundary this sweep found is stable and
   clean — combat and the thief were *already built* as self-contained
   modules.
3. Success metric exists already: the 107-transcript unit suite + 17
   walkthroughs are behavior-parity proofs, same as the Cloak golden gate
   — with the §5.9 caveat that the chain needs the determinism fixes first.

## Appendix: line-count inventory

| Directory | Files | LOC | Disposition |
|---|---|---|---|
| regions/ | 15 | 7,175 | → declarations (bulk) |
| actions/ (excl. gdt) | 50 dirs | 9,705 | ~30 → `define action`, ~10 hatch, 8 → blocked exits, 2 meta |
| actions/gdt/ | 34 | 3,529 | out of scope (debug console) |
| grammar/ | 8 | 1,248 | 4 patterns Phase A, 146 track `define action` |
| npcs/ | 5 NPCs | 3,089 | shells declarative; brains hatch (thief biggest) |
| combat/ + melee-interceptor | 6+1 | 1,982 | single behavior hatch; tables/messages are data |
| scheduler/ | 16 | 2,876 | 1 `every`, ~6 `after N`, rest hatch |
| state-machines/ | 5 | 444 | all → `states:` + `when`/`change` |
| handlers/ | 27 | 5,660 | 13 entry/movement, 5 need event verbs, 7 hatch |
| interceptors/ (excl. melee) | 9 | 1,147 | 3 fit `on` clauses; rest §5.3–5.5 gaps |
| orchestration/ | 6 | 1,005 | subsumed by loader |
| messages/ | 6 | 1,394 | 492 phrases, 1:1 |
| traits/ | 28 | 2,332 | data traits → composition/`states:`; behavior traits follow their systems |
| objects/, index.ts, audio/channels/browser, misc | — | ~2,700 | entity factories declarative; shell stays TS |
| **Total** | | **43,045** | |

# Sharpee / Chord Capability Matrix — Can the Platform Express Full MDL Dungeon?

**Date:** 2026-07-15 · **Session:** 5c4f8a · Third pass over the MDL gap analysis.
**Goal (David, 2026-07-15):** *not* to finish the Dungeo port. Dungeo was the probe that
tested Sharpee's capabilities (successfully). The question now: for each mechanic MDL Dungeon
*should* support, **can Sharpee + Chord express it** — and where they can't, **what Sharpee
change is required**, which then cascades to a Chord update.

## Method

Seven capability verifiers, each reading the **real platform code AND the real Chord
loader/grammar** — never asserting "can/can't" from one side (the risk here is inverted from
the gap audit: a false **CAN** would hide platform work). Verdict per family:

- **CAN** — Sharpee has it AND Chord reaches it. Capability proven; Dungeo just didn't use it.
- **CHORD-GAP** — Sharpee can; the `.story` language can't reach it → Chord-surface ratchet only.
- **SHARPEE-GAP** — the platform itself lacks it → a Sharpee change, which then cascades to Chord.
- **HATCH** — non-IF, correctly offloaded.

## Headline

**The platform is broadly capable; the recurring deficit is the Chord surface, not Sharpee.**
Only **two true platform holes** exist (player-death model; creature-state), plus **two
wiring-sized fixes** and a **parser/meta-verb layer**. Everything else is either already
possible or pure Chord ratchet work.

---

## The matrix

| # | Capability (MDL family) | Sharpee | Chord | Verdict | Evidence (both sides) |
|---|---|---|---|---|---|
| 1 | **Entity transform / spawn** (coal→diamond) | CAN | CAN | **CAN** | `move`+`removeEntity` SWAP; Chord `remove … when` + `move … to here when`. P23 is a naming label. |
| 2 | **Teleport actor** (pray/bank/bat) | CAN | CAN | **CAN** | `moveEntity(player…)`; Chord `move you to <room> when`; random via `select-strategy`. |
| 3 | **Conceal / reveal** (pot-of-gold) | CAN | CAN | **CAN** | `ConcealedStateTrait` + relocation; Chord via `move … to off-stage`. RC-8 `conceal`/`reveal` = ergonomic sugar. |
| 4 | **Computed darkness + entity-lit room** (stove/gallery) | CAN | CAN | **CAN** | `VisibilityBehavior.isDark` = `isDark && !hasLightSource` (recursive); Chord `dark` / `dark while`. |
| 5 | **Custom content verbs** (COUNT/PLAY/SHAKE/SWIM) | CAN | CAN | **CAN** | Chord `define action` ships. Story-authorable. |
| 6 | **Verb-veto — other-entity-state** (white-hot axe) | CAN | CAN | **CAN** | ADR-090/118 `preValidate`; shipped axe reads guardian's alive-state; Chord `on taking → refuse when`. |
| 7 | **Named-object exit gate** (coffin) | CAN | CAN | **CAN** | `blockedExits` + recompute on take/drop; Chord `up is blocked while player holds the coffin`. **The port's TODO is expressible today.** |
| 8 | **Timed window** (vault alarm, mirror door, match) | CAN* | GAP | **CHORD-GAP** | Fuse has turns/adjust/pause/onCancel; *no declarative cancel-condition (optional convenience). Chord has no `unless`/`until`/re-arm. → DZ-12 |
| 9 | **Runtime exit mutation** (rug→trapdoor, mung, mirror/dam rewrite) | CAN | GAP | **CHORD-GAP** | `RoomBehavior.setExit/removeExit/blockExit/unblockExit` all runtime + exercised; Chord has no `reveal/remove/connect` statement. → P25/DZ-3 |
| 10 | **Weight / count / empty-handed exit gate** (cliffs, coal-mine) | CAN | GAP | **CHORD-GAP** | Platform can gate; Chord condition-grammar has `holds/has` but no weight/count/empty-handed predicate. |
| 11 | **Vehicle: ride + state-gated egress** (balloon/mirror-box) | CAN | GAP | **CHORD-GAP** | `VehicleTrait` full + live; Chord has `enterable`/`climbable`, no `vehicle` adj, no state→exit binding. → P33/DZ-10 |
| 12 | **Verb-veto — actor identity on standard verbs** (egg: NPC-only) | CAN | GAP* | **CHORD-GAP** | Egg works in TS; Chord standard-interceptor path **drops `actorId`** (`runtime.ts:331`) → *~1-line Sharpee fix* + Chord surface. |
| 13 | **Liquids** (dam/well/boat fill/pour/level) | — | GAP | **CHORD-GAP** | Not re-verified this pass; ADR-219 roadmap. Chord surface pending. |
| 14 | **Capability-dispatch verbs** (wave/turn/rub/lower/tie) | CAN | GAP | **CHORD-GAP** | ADR-090/221 roadmap; RC-4/RC-6 Chord surface. |
| 15 | **Scoring variants + rank tables** | CAN | GAP | **CHORD-GAP** | FZ-G3 dual-mode scoring; rank ladders = data. Chord surface pending. |
| 16 | **★ Conditional / hazard death** (grue, gas, falls, vault, provoked) | **GAP** | GAP | **SHARPEE-GAP** | **No death/kill primitive** — `killPlayer`/`die`/`jigsup` = 0 hits; `if.event.player.died` is an unenforced convention no engine code consumes; every Dungeo death hand-rolled. Chord `lose` = terminal defeat, not death. |
| 17 | **★ Light-source fuel burn-down + staged warnings** (lantern/candle/match) | **GAP** | GAP | **SHARPEE-GAP (wiring)** | `LightSourceTrait` HAS `fuelRemaining`/`consumeFuel()` but **`consumeFuel` is never called** — no turn-cycle driver; Dungeo hand-rolls 3 fuses. Chord composes a bare `LightSourceTrait()` (no fuel param). |
| 18 | **★ Creature-state / invulnerable creature** (cyclops) | **GAP** | GAP | **SHARPEE-GAP** | Objects have `DestructibleTrait.invulnerable`; **creatures don't**. Cyclops = killable `CombatantTrait{health:30}`. = **ADR-223** `HealthTrait` refactor (DRAFT) + live NpcTrait/CombatantTrait sync bug. |
| 19 | **★ NPC autonomy** (thief initiates, patrol, DM catch-up) | **GAP** | GAP | **SHARPEE-GAP** | Chord `person` near-zero; no NPC-initiated actions. = **ADR-223** automation layer (the FZ-P1/FZ-G1 cluster). |
| 20 | **Parser/meta-verb layer** (VERBOSE/OOPS/FIND/particles/comma-address/take-all/orphaning) | **GAP** | n/a | **SHARPEE (platform)** | 7 items in stdlib/parser-en-us/engine; benefit every story. `take everything` is an outright BUG (declared `allWords` unread). See below. |
| 21 | **Royal Puzzle solver; INCANT cipher** | HATCH | HATCH | **HATCH** | Non-IF (spatial algorithm / crypto). Correctly `define … from`. |

\* = a small optional Sharpee convenience improves ergonomics but isn't a blocker.

---

## What actually needs to change in Sharpee (the point of this exercise)

Ordered by leverage. Each is an ADR candidate (ADR-first workflow); each cascades to a Chord
surface.

### PLATFORM-1 — A first-class death / hazard model  *(new ADR)*
The single biggest platform hole. No reusable player-death capability exists; every death is
hand-rolled and they don't even agree on the event name (`if.event.player.died` vs the
stdlib channel's `combat.player_died`). **Build:** a canonical typed `player.died` event the
**engine** consumes; a `killPlayer(world,{cause,messageId,terminal?})` helper; a
`DeadlyRoomTrait` carrying a verb-allowlist (folds the falls transformer); a
probabilistic-death helper (folds grue). Death-penalty/reincarnation/N-deaths stays a story
state-machine but keys off the canonical event. **Absorbs** the grue/gas/falls/vault/provoked
cases (#16 + the death half of #17's darkness). **Chord cascade:** `kill the player when
<cond>` and/or a `deadly` room marker with `safe: look, examine` + optional `chance`.

### PLATFORM-2 — ADR-223 (creature-state + NPC autonomy)  *(exists, DRAFT — resolve Q1–Q5)*
Two of the SHARPEE-GAPs (#18, #19) are already this one DRAFT ADR. The audit **over-determines
it**: the cyclops mis-model (killable when it must be invulnerable-with-flavor) is the clean
creature-state proof, and the NpcTrait/CombatantTrait `isAlive` sync bug is a live defect the
`HealthTrait` unification fixes. **Blocked on:** the ADR's open questions (must not be ACCEPTED
until resolved, rule 11a). This is the largest blast radius (~13 modules, 85+ files) but it's
already scoped. **Chord cascade:** `use combat` extension + `on attacking → refuse` once
combat is a Chord concept; the automation/patrol surface (RC-4).

### PLATFORM-3 — Wire light-source fuel into the turn cycle  *(small)*
`LightSourceTrait.fuelRemaining` + `LightSourceBehavior.consumeFuel()` already exist; nothing
calls `consumeFuel`. **Build:** a per-turn "burn while lit" driver that decrements only when
`isLit` (pausability falls out for free), emits staged warnings at author thresholds, and
auto-extinguishes + darkens at zero — replacing Dungeo's three hand-rolled fuses. **Chord
cascade:** `light-source with fuel 330` + warning thresholds.

### PLATFORM-4 — Thread `actorId` into the standard-verb interceptor context  *(~1 line + test)*
`runtime.ts:331-335`/`:466-467` drop `actorId` when building the standard-semantics
`preValidate` context, so Chord `refuse when the actor is the player` can't bind an actor on
`on taking`/`on opening` (the egg's player-vs-thief half, #12). Thread it through and the
capability is reachable. Pairs with the **`take everything` bug** (PLATFORM-5).

### PLATFORM-5 — The parser/meta-verb layer  *(one ADR, several small items)*
All platform, all benefit every story — none are Chord-language questions:
- **BUG:** `take everything` — `lang-en-us` declares `allWords:['all','everything','every']`
  but the parser consumer hardcodes `'all'`. Thread the list. *(small)*
- **postposed particles** `pick mat up`/`put mat down` — grammar-only *(small)*
- **FIND / WHERE IS** — new locate meta-action *(small-med)*
- **OOPS** — retain last-rejected token, splice + re-dispatch *(med)*
- **missing-object orphaning** ("Take what?" → answer) — engine *(med)*
- **VERBOSE / BRIEF / SUPERBRIEF** — IDs reserved, unwired; real cost = visited-tracking +
  description suppression *(med-large)*
- **comma-address** `ROBOT, GO EAST` — grammar-engine slot-initial patterns; ties to NPC
  commanding *(med-large)*

---

## What does NOT need Sharpee changes

- **CAN today (7 families, #1–7):** transform, teleport, conceal, darkness, custom verbs,
  other-entity-state veto, named-object exit gate. Capability proven — the port simply didn't
  exercise them (the coffin gate the port left as a TODO is expressible in Chord *right now*).
- **CHORD-GAP (8 families, #8–15):** timed window, runtime exit mutation, weight/count exit
  gates, vehicle egress, actor-identity veto, liquids, capability-dispatch verbs, scoring —
  all are Chord-surface ratchet entries (ADR-210), no platform hole. Several already
  roadmapped (ADR-219/220/221/FZ-G3).
- **HATCH (#21):** royal puzzle, INCANT — by design.

## Grounding caveats
Rows #1–12 and #16–20 were verified end-to-end against real platform + Chord code this pass
(high confidence). Rows #13–15 (liquids, capability-verbs, scoring) were **not** re-verified
here — carried from the completeness matrix / roadmap ADRs; confirm before scoping. No live
`.story` compile was run — verifications are source-read, not executed transcripts; a
1-line `move you to <room>` / SWAP compile would raise teleport/transform from high-confidence-
read to proven.

## Bottom line
To make full MDL Dungeon expressible in Sharpee+Chord, the platform needs **one new subsystem
(a death/hazard model), the already-DRAFTed ADR-223 (creature-state + NPC autonomy), one
wiring fix (light fuel), one ~1-line fix (actor threading), and the parser/meta-verb layer.**
Everything else is Chord-surface ratchet work or already possible. Dungeo did its job: it
proved the world-model/scheduler/dispatch spine is sound and surfaced exactly where the
authoring surfaces — mostly Chord, occasionally the platform — still need to reach.

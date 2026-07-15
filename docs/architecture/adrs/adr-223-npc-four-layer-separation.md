# ADR-223: The Four-Layer NPC Separation — Agent / Automation / Creature-State / Personhood

## Status: DRAFT (2026-07-15 — umbrella model + approach + child roadmap; open questions unresolved, must not be marked ACCEPTED per rule 11a)

> Child of ADR-214 (Chord ⇄ Sharpee parity) and graduation of ADR-222 seam
> **FZ-P1**. Surfaced 2026-07-15 while auditing the friendly-zoo story for
> canon-vs-Chord parity: the Chord `person` kind and Sharpee's `NpcTrait` **fuse
> several orthogonal concepts into one**, the same category error ADR-222 fixed for
> animals/scenery, a level up. A five-slice read-only audit mapped the blast radius
> (`docs/work/chord-parity/person-automation-blast-radius.md`); this ADR sets the
> model, the approach, and the child roadmap. It authorizes **no code** — each child
> graduates to its own ADR + plan under CLAUDE.md's platform-change gate.

## Date: 2026-07-15

## Terminology

- **AGENT** — an actor: takes turns, has inventory/pronouns, `isPlayer`
  (`ActorTrait`). The substrate the other layers attach to; the **player is an
  agent**. Physical sight/scope is an AGENT capability (already observer-agnostic).
- **DAEMON** — system-driven behavior over time (Q-1 resolved 2026-07-15: the
  layer is named for the *mechanism*, not the thing's nature). **Subject-agnostic**:
  a **person, animal, machine, or the environment** can each have a daemon — which
  is why no creature/agent word (automaton, autonomous, animate) fit. IF-native and
  already in Sharpee's scheduler (`daemon` runs each turn; `fuse` fires once after N;
  `sequence`). **Merge decision** (David, 2026-07-15): the per-entity NPC behavior
  system (`NpcService`/`NpcBehavior`) and the world `SchedulerPlugin` are the *same
  concept on different subjects* and **merge into one daemon model** — an entity
  "has a daemon"; the world has story daemons/fuses/sequences.
- **HEALTH** — the single mortality/health model (`HealthTrait`, Q-2 resolved
  2026-07-15). alive/dead **derive from health** (health > 0 = alive, 0 = dead);
  **combat and destruction bend to operate on it** (`CombatantTrait` keeps only
  combat *stats* and *requires* `HealthTrait`; `DestructibleTrait.hitPoints` collapses
  in too). Replaces the "creature-state" grab-bag: this layer is *just health* —
  **hostility decomposes out to disposition** (personhood's `CharacterModel`). Because
  there is now one health source, the live combat/turn **sync bug vanishes by
  construction** (nothing to sync).
- **PERSONHOOD** — character depth: personality, mood, **disposition (incl.
  hostility)**, knowledge, beliefs, goals-state, conversation, memory, relationships
  (`CharacterModelTrait` + `@sharpee/character`, ADRs 141/142/144/145/146). Currently
  **The Alderman's in-progress implementation**.
- **Fusion artifact** — `NpcTrait`, whose fields span all four layers
  (`npcTrait.ts:14-62`); the cut lines run through the middle of one trait.

## Context

`NpcTrait` today is a grab-bag: turn-participation + movement policy (`canMove`,
`allowed/forbiddenRooms`, `behaviorId`) **and** creature-state (`isAlive`,
`isConscious`, `isHostile`) **and** personhood (`knowledge`, `goals`,
`conversationState`). Authors reach for the Chord `person` kind — or add
`NpcTrait` in TS — whenever they want *any* of these, conflating "is an
agent/character" with "is automated" with "is alive" with "has personhood."

The audit (five slices, `person-automation-blast-radius.md`) established:

1. **It is four layers, not three.** CREATURE-STATE deserves its own home:
   `isAlive`/`isConscious`/`isHostile` are **duplicated** across `NpcTrait` and
   `CombatantTrait` with lossy hand-sync — a **live bug** (a `basic-combat` kill
   sets `CombatantTrait.isAlive=false` but not `NpcTrait.isAlive`, so the "dead"
   NPC still takes turns, `npc-service.ts:410-417`). The player carries
   creature-state without being an NPC. `NpcTrait.isHostile` is vestigial (written
   by 7 stories, read by no game logic; real hostility lives on
   `CombatantTrait.hostile`).
2. **Combat is safe.** It is anchored entirely to `CombatantTrait` and **never
   reads `NpcTrait`**. The automation behavior contract (`NpcContext`) is
   personhood-free. The pieces want to come apart.
3. **The personhood layer already exists — as in-progress work.** The
   `@sharpee/character` stack is built and tested but not yet wired at story
   runtime because **The Alderman** (its driving story) is unfinished. This is
   realization-in-progress, not abandoned cruft; The Alderman is the personhood
   layer's reference story.
4. **Duplications & orphaned plumbing.** knowledge (2×), goals (3×), `NpcTrait`'s
   creature-state; and orphaned mechanisms (the witness system, `observeEvent`,
   the never-called reactive hooks `onSpokenTo`/`onAttacked`, behavior
   `getState/setState`, the unregistered ADR-102 `DialogueExtension` seam).
5. **Chord surface is near-zero.** `person` composes only `ActorTrait` +
   `IdentityTrait`; autonomy/hostility/conversation/character-model are
   unauthorable from `.story`.

Grounding: `NpcTrait` (`world-model/.../npc/npcTrait.ts`), `NpcService`
(`stdlib/src/npc/`), combat (`extensions/basic-combat`, `traits/combatant`),
personhood (`world-model/.../character-model`, `packages/character`), Chord person
(`story-loader/src/loader.ts:587`). Full itemization in the blast-radius doc.

## Decision

### 1. Separate `NpcTrait` into four orthogonal, composable layers

| Layer | Home (target) | Holds |
|---|---|---|
| **AGENT** | `ActorTrait` (existing) | turn-participation substrate, inventory, pronouns, `isPlayer`; sight/scope is an AGENT capability |
| **DAEMON** | one merged daemon model (`NpcService`/`NpcBehavior` **+** `SchedulerPlugin`) + a per-subject daemon binding | `behaviorId`/routine, `canMove`, movement policy, typed per-entity daemon state; attaches to a **person, animal, machine, or the world** (subject-agnostic) |
| **HEALTH** | a new `HealthTrait` (combat + destruction bend to it) | `health`; **alive/dead derive** from it (>0 alive, 0 dead); combat *stats* stay on `CombatantTrait` (which now *requires* `HealthTrait`); `DestructibleTrait.hitPoints` collapses in |
| **PERSONHOOD** | `CharacterModelTrait` re-homed under **AGENT** (not NPC) | personality, mood, **disposition (incl. hostility)**, knowledge, beliefs, goals-state, conversation, memory, relationships; `'player'`-hardcoded predicates become observer-relative |

The duplicated `NpcTrait` copies of knowledge/goals are deleted (their single home
is the character model); creature-state collapses into `HealthTrait` and hostility
into disposition. Because there is **one** health source, the live combat/turn
**sync bug vanishes by construction**. Traits are **data-only** (no logic-bearing
methods — the `canAct`/`canEnterRoom` "doesn't survive `loadJSON`" footgun is not
carried forward).

### 2. Approach — platform-primary, Chord-validated, Dungeo-regression-secondary

This is a **Sharpee platform change** (primary framing). Two gates ride alongside
(David, 2026-07-15):

- **Explicit Chord validation** — a first-class acceptance gate. Each layer gets a
  Chord authoring surface **and** a Chord fixture/validation proving an author can
  express it from a `.story` file. Per ADR-222's elegance-oracle principle: if
  Chord expresses a layer cleanly, the platform shape is right; if it can't, the
  shape is wrong.
- **Dungeo regression — secondary.** The canon TS story (thief, combat, roaming
  NPCs) is the safety net, regression-tested after each change; it is **not** the
  design driver. We build the clean four-layer platform + Chord surface, then
  migrate Dungeo's `NpcTrait`/`customProperties` usage to pass — we do **not** let
  Dungeo's current fused/hacked usage dictate the design.

The dungeo **thief** is the automation reference; **The Alderman** is the
personhood reference (finishing it validates the personhood layer);
**friendly-zoo** is a light automation regression + the AnimalTrait consumer
(FZ-X1).

### 3. Child roadmap (each its own ADR + plan; sequence recommended, not strict)

- **A — `HealthTrait`.** Unify the three health models (`CombatantTrait.health`,
  `DestructibleTrait.hitPoints`, the NPC alive/dead flag) into one `HealthTrait`;
  alive/dead derive from it; combat and destruction bend to operate on it
  (`CombatantTrait` keeps stats, requires `HealthTrait`). **Fixes the live sync bug
  by construction** (one source). Hostility is *not* here — it moves to disposition
  (child C). Good first cut.
- **B — Agent / Daemon split + scheduler merge.** Extract the daemon binding
  (`behaviorId`/routine + movement policy) off `NpcTrait`; **merge `NpcService`/
  `NpcBehavior` with the `SchedulerPlugin` into one daemon model** (subject-agnostic:
  entity daemons + world daemons/fuses/sequences); re-point turn eligibility (gated
  by `HealthTrait`); give the daemon a real serializable, **typed** per-entity state
  slot; resolve the stale plumbing (reactive hooks, behavior save-state); migrate the
  thief off `customProperties`. **Ships the reusable platform primitives** — movement
  behaviors (wander [room-filter] / patrol / pursue / flee / path-to / cadence), the
  bulk "all it carries" statement, `conceal`/`reveal` (via the scope layer), the
  melee-plugin Chord surface, `on giving`/`on throwing`/`on dying` hooks, and the
  `sacred`/`valuable` markers. Concrete spec: `docs/work/schism/thief-primitive-
  decomposition.md` (**P1–P22**, validated against the canonical MDL thief in
  `thief-mdl-validation.md`).
- **C — Personhood re-homing + realization.** `CharacterModel` under AGENT,
  `'player'` de-hardcoded, duplicated knowledge/goals deleted, **hostility folded into
  disposition**; wire the ADR-102 DialogueExtension + the observation pipeline;
  **validated by finishing The Alderman.**
- **D — Chord authoring surface** for all four layers (the FZ-P1 → `.story` side):
  compose agent / daemon / health / personhood from Chord, each with a validation
  fixture. Its concrete Chord verbs/conditions are the **ratchet candidates RC-1–RC-8**
  (`docs/work/schism/ratchet-candidates.md`): bare owner-state, `chance <p>`, the
  movement verbs, bulk `drop everything`/`empty`, `on giving`/`on throwing`/`on dying`,
  `sacred`/`valuable` markers, `conceal`/`reveal`. **Acceptance = the canonical thief
  authored purely in Chord from these (AC-7)** — no bespoke TS.

Each child's acceptance = *authors cleanly from Chord* **and** *Dungeo still green*.

### 4. Governance

Platform work under CLAUDE.md's discussion gate; this ADR is design-only. Each
child graduates to its own ADR + implementation plan and needs a separate
go-ahead before any `packages/` code. Reconcile — not re-invent — the existing
ADR-070 (NPC), ADR-072 (combat, currently stale/Proposed), and ADRs
141/142/144/145/146 (character) against this layering.

## Acceptance criteria (umbrella)

- **AC-1 — clean homes.** No entity trait spans more than one of {agent, daemon,
  health, personhood}; `NpcTrait`'s cross-layer fields are relocated or deleted.
  `HealthTrait` is opt-in (combat/damage), not carried by every creature — a plain
  actor is alive by default.
- **AC-2 — bug fixed.** A `basic-combat` kill takes the entity out of the turn loop
  (the sync bug cannot recur — one `HealthTrait` source).
- **AC-3 — Chord-validated.** Each layer is authorable from a `.story` and has a
  passing Chord validation fixture (the explicit gate).
- **AC-4 — Dungeo green.** The full Dungeo transcript suite passes after migration
  (regression, secondary).
- **AC-5 — personhood realized.** The Alderman's character models run at runtime
  (validates layer C).
- **AC-6 — no duplication.** knowledge and goals have a single home each.
- **AC-7 — the thief is pure Chord** (the daemon layer's elegance-oracle test). The
  dungeo thief is authorable end-to-end from a `.story`: its state machine in Chord
  `states` + `on every turn while <state>` + `change`, its movement via platform
  **daemon movement primitives** (wander / patrol / pursue / flee / path-to), its
  combat via `use combat` — **no hand-coded TS behavior**. If the thief needs a
  bespoke TS `onTurn`, the daemon layer has failed.

## Consequences

- **Re-anchors ADR-214's roadmap.** This is foundational — most of the seven
  ADR-214 child workstreams touch NPCs and would build on the wrong model
  otherwise; this sequences ahead of them.
- **Fixes a live latent bug** (creature-state sync) as a side effect of layer A.
- **Realizes in-progress work** (The Alderman's personhood) rather than leaving it
  stranded; unblocks that story.
- **Large migration** — ~13 modules, 85+ files (dungeo 40 heaviest); the thief's
  `customProperties` state machine is the hardest single migration.
- **Names the mechanism.** "NPC" retires as the automation concept name in favor of
  a mechanism-honest term (open question below).
- **Gives Chord its first NPC-authoring surface** — today `person` can do nothing
  autonomous.

## Open Questions

### Q-1: Fate of the orphaned daemon plumbing (reactive hooks `onSpokenTo`/`onAttacked`, behavior `getState/setState`, the witness system) — finish, fold, or remove?
- **Why it matters**: authors write hooks believing they fire (a correctness trap);
  patrol state is silently lost on save/restore.
- **Blocks**: layer B (daemon save-state) and the observation-pipeline decision.

### Q-2: The observation pipeline — unify the witness system (DAEMON accumulation) with `observeEvent` (PERSONHOOD interpretation), or keep them as distinct tiers over the AGENT sight capability?
- **Why it matters**: both are currently dead; the split should formalize one design.
- **Blocks**: layers B/C observation work.

### Q-3: Per-entity daemon state — the thief's state machine gets a **typed** slot on the daemon binding (the working assumption in the code examples), replacing the untyped `customProperties` bag. Confirm the shape (per-daemon typed state vs a generic serializable slot).
- **Why it matters**: the thief's whole 7-state machine lives in `customProperties` today.
- **Blocks**: layer B and the thief migration.

### Q-4: Child sequencing — A (`HealthTrait`) → B (agent/daemon split + scheduler merge) → C (personhood) → D (Chord surface) as written, or interleave (C in parallel, since it's independent of health/daemon)?
- **Why it matters**: The Alderman (C) is in-flight and may want priority.
- **Blocks**: which child ADR to draft first.

### Q-5: Consciousness — does conscious/unconscious derive from a `HealthTrait` threshold (combat knocks out at ≤20% health), and is **asleep** (full health, not acting) a separate small flag, or is consciousness its own field?
- **Why it matters**: decides whether `HealthTrait` is *just* health or health+consciousness.
- **Blocks**: layer A's `HealthTrait` shape.

## Session

Session 7442d0 (2026-07-15). Child of ADR-214; graduates ADR-222 seam FZ-P1.
Grounded in the five-slice audit (`docs/work/chord-parity/person-automation-blast-radius.md`)
and the model/notes (`person-npc-character-notes.md`). Related: ADR-070 (NPC),
ADR-072 (combat — stale, to reconcile), ADR-102 (DialogueExtension seam),
ADR-141/142/144/145/146 (character/conversation/propagation/goals/influence),
ADR-222 (elegance parity + seam catalog). Memory: `chord-as-elegance-oracle`,
`sharpee-chord-parity-goal`, `no-get-it-done-assumptions`.

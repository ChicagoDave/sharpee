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
- **AUTOMATION** — autonomous per-turn behavior: `behaviorId` + `NpcBehavior` +
  the turn tick + movement/patrol. A capability attached to an agent **or an
  animal** (ADR-222 FZ-X1) — not synonymous with personhood. The current name
  "NPC" fuses a role claim with this mechanism; the mechanism gets a
  mechanism-honest name.
- **CREATURE-STATE** — mortality & disposition: alive / conscious / hostile
  (and a health reference). A **fourth** layer the audit forced out.
- **PERSONHOOD** — character depth: personality, mood, disposition, knowledge,
  beliefs, goals-state, conversation, memory, relationships (`CharacterModelTrait`
  + `@sharpee/character`, ADRs 141/142/144/145/146). Currently **The Alderman's
  in-progress implementation**.
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
| **AUTOMATION** | a new automation trait (renamed off "NPC") | `behaviorId`, `canMove`, `allowed/forbiddenRooms`, movement announcements, per-entity automation state; attaches to an agent **or** an animal |
| **CREATURE-STATE** | a new standalone `CreatureStateTrait` | `isAlive`, `isConscious`, `isHostile`, health-ref; read by combat, the turn loop, and daemons — one source of truth |
| **PERSONHOOD** | `CharacterModelTrait` re-homed under **AGENT** (not NPC) | personality, mood, disposition, knowledge, beliefs, goals-state, conversation, memory, relationships; `'player'`-hardcoded predicates become observer-relative |

The duplicated `NpcTrait` copies of knowledge/goals/creature-state are deleted;
their single homes are the character model and the creature-state trait. Traits
are **data-only** (no logic-bearing methods — the `canAct`/`canEnterRoom`
"doesn't survive `loadJSON`" footgun is not carried forward).

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

- **A — `CreatureStateTrait`.** Unify alive/conscious/hostile(+health-ref) into one
  standalone trait read by combat, the turn loop, and the sword-glow daemon.
  Collapses the duplication and **fixes the live kill/turn sync bug**. Lowest risk
  (combat already keyed to `CombatantTrait`); a good first cut.
- **B — Agent / Automation split.** Extract the automation trait (`behaviorId` +
  movement policy) off `NpcTrait`; re-point turn eligibility to it (gated by
  CreatureState); give automation a real serializable state slot; resolve the
  stale plumbing (reactive hooks, behavior save-state); migrate the thief off
  `customProperties`.
- **C — Personhood re-homing + realization.** `CharacterModel` under AGENT,
  `'player'` de-hardcoded, duplicated knowledge/goals deleted; wire the ADR-102
  DialogueExtension + the observation pipeline; **validated by finishing The
  Alderman.**
- **D — Chord authoring surface** for all four layers (the FZ-P1 → `.story` side):
  compose agent/automation/creature-state/personhood from Chord, each with a
  validation fixture.

Each child's acceptance = *authors cleanly from Chord* **and** *Dungeo still green*.

### 4. Governance

Platform work under CLAUDE.md's discussion gate; this ADR is design-only. Each
child graduates to its own ADR + implementation plan and needs a separate
go-ahead before any `packages/` code. Reconcile — not re-invent — the existing
ADR-070 (NPC), ADR-072 (combat, currently stale/Proposed), and ADRs
141/142/144/145/146 (character) against this layering.

## Acceptance criteria (umbrella)

- **AC-1 — four homes.** No entity trait spans more than one of {agent, automation,
  creature-state, personhood}; `NpcTrait`'s cross-layer fields are relocated or
  deleted.
- **AC-2 — bug fixed.** A `basic-combat` kill takes the NPC out of the turn loop
  (the sync bug cannot recur — single creature-state source).
- **AC-3 — Chord-validated.** Each layer is authorable from a `.story` and has a
  passing Chord validation fixture (the explicit gate).
- **AC-4 — Dungeo green.** The full Dungeo transcript suite passes after migration
  (regression, secondary).
- **AC-5 — personhood realized.** The Alderman's character models run at runtime
  (validates layer C).
- **AC-6 — no duplication.** knowledge and goals have a single home each.

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

### Q-1: What replaces "NPC" as the automation-layer name?
- **Why it matters**: the rename threads through world-model, stdlib, plugin-npc,
  and every story; picking it early avoids churn.
- **Blocks**: layer B's trait/plugin naming.

### Q-2: `CreatureStateTrait` standalone, or fold creature-state into `CombatantTrait`?
- **Why it matters**: the audit shows non-combatant NPCs (zoo) carry creature-state
  with no `CombatantTrait`, arguing standalone; but a merge would remove a trait.
- **Blocks**: layer A's shape.

### Q-3: Fate of the orphaned automation plumbing (reactive hooks `onSpokenTo`/`onAttacked`, behavior `getState/setState`, the witness system) — finish, fold, or remove?
- **Why it matters**: authors write hooks believing they fire (a correctness trap);
  patrol state is silently lost on save/restore.
- **Blocks**: layer B (save-state) and the observation-pipeline decision.

### Q-4: The observation pipeline — unify the witness system (AUTOMATION accumulation) with `observeEvent` (PERSONHOOD interpretation), or keep them as distinct tiers over the AGENT sight capability?
- **Why it matters**: both are currently dead; the split should formalize one design.
- **Blocks**: layers B/C observation work.

### Q-5: Where does per-entity automation state live — keep the untyped `customProperties` bag, or type it?
- **Why it matters**: the thief's whole 7-state machine lives in `customProperties`.
- **Blocks**: layer B and the thief migration.

### Q-6: Child sequencing — A→B→C→D as written, or interleave (e.g. C in parallel since combat/automation are independent of personhood)?
- **Why it matters**: The Alderman (C) is in-flight and may want priority.
- **Blocks**: which child ADR to draft first.

## Session

Session 7442d0 (2026-07-15). Child of ADR-214; graduates ADR-222 seam FZ-P1.
Grounded in the five-slice audit (`docs/work/chord-parity/person-automation-blast-radius.md`)
and the model/notes (`person-npc-character-notes.md`). Related: ADR-070 (NPC),
ADR-072 (combat — stale, to reconcile), ADR-102 (DialogueExtension seam),
ADR-141/142/144/145/146 (character/conversation/propagation/goals/influence),
ADR-222 (elegance parity + seam catalog). Memory: `chord-as-elegance-oracle`,
`sharpee-chord-parity-goal`, `no-get-it-done-assumptions`.

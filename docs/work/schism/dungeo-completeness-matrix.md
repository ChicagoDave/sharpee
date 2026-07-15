# Dungeo → Chord completeness matrix

> **SUPERSEDED (2026-07-15) as a primitive backlog.** The P23–P33 / DZ-1…11
> "new primitive" enumeration here was port-derived and over-counted. It is
> superseded by the grounded **capability matrix**
> (`sharpee-chord-capability-matrix.md`), which verified each need against real
> platform *and* Chord code and reclassified them as CAN / CHORD-GAP /
> SHARPEE-GAP / HATCH — most are already owned by ACCEPTED ADRs (215/217/219/
> 220/221) or possible today. Plan from the capability matrix, not this table.
> Retained for provenance and for its **fidelity findings** section (the MDL↔port
> divergences), which fed the gap analysis.

Can Chord (as a composition of generic Sharpee+TS primitives) implement **every** Dungeo
puzzle? Audited across all 15 regions, 5 NPCs, ~90 actions, 28 handlers
(`stories/dungeo/src/`), cross-checked against the 1981 MDL (`docs/internal/dungeon-81/`).
Extends the thief primitive set (P1–P22, `thief-primitive-decomposition.md`).

## Verdict

**No — the thief covered ~1/3 of the vocabulary.** Dungeo needs **~11 more primitive
families**. But the honest breakdown is encouraging:

- **~half of the new families are already on the ADR-214 roadmap** (liquids ADR-219, doors/
  exits ADR-220, capability-dispatch verbs ADR-090/221, daemon+scheduler ADR-223, scoring
  FZ-G3, the melee plugin). Dungeo just *exercises* them harder.
- **~5 are genuinely new generic primitives** (P23–P32 below) — bounded and reusable.
- **Exactly one is a true outlier**: the **Royal Puzzle** (a private mutable 8×8 grid inside
  one room) — likely a dedicated `grid`/tile-map primitive or a hatch.

So the *method* holds (decompose → generic primitives → Chord composition); the primitive
catalog roughly doubles.

## Status legend
**EXISTS** (Chord today) · **P#** (a thief primitive already catalogued) · **ROADMAP** (an
accepted ADR/seam) · **NEW** (a new generic primitive, below) · **HATCH** (likely needs the
`define … from` escape hatch).

---

## The matrix (by capability family)

| Capability | Dungeo examples | Status |
|---|---|---|
| Containers / openable / lockable+key | mailbox, trophy case, grating+skeleton-key, buoy, safe | **EXISTS** |
| Static / one-way / self-loop exits | maze (self-loops), slides, corridors | **EXISTS** |
| Door/window/rope-gated exit | kitchen window, grating, rope→Torch Room, slide | **EXISTS** / ROADMAP (ADR-220) |
| Custom verbs (`define action`) | pray, dig, wind, launch, walk-through, push-* | **EXISTS** |
| Per-turn / room-scoped daemon | forest ambience, PA-style beats | **EXISTS** (ADR-223 daemon) |
| Treasure **take**-scoring | every treasure's `points` | FZ-G3 |
| Movement behaviors (wander/patrol/pursue/flee) | troll/thief/cyclops/DM/bat/robot | **P4–P9** (+ ADR-223) |
| Conceal/reveal on condition | thief hoard, spirits, pot-of-gold | **P22** |
| Give/throw/dying hooks; sacred/valuable markers | troll eats gifts, thief | **P18/P19/P1/P2** |
| **Capability-dispatch verbs** (wave/turn/rub/lower/raise/tie) | rainbow WAVE, dam bolt TURN, mirror RUB, basket LOWER, rope TIE | ROADMAP (ADR-090/221) |
| **Liquids** (level, fill, pour) | dam/reservoir, well counterweight, bucket, boat inflate | ROADMAP (ADR-219) |
| **Ordered / unordered multi-step ritual** | exorcism (unordered co-location conjunction!), tiny-room key-and-mat, dig×4 | **EXISTS-composable** (states + conditions + daemon; `define sequence` D10 for ordered) |
| **Vehicles** (ride-with-player, internal-state-gated exit) | basket, bucket, boat, balloon, mirror-box | ROADMAP → **NEW Chord surface** (P33) |
| **Scoring variants** (deposit-award, milestone, negative/death-penalty, hidden max-change, game-over) | trophy case OTVAL, endgame milestones, −10/death, thief 616→650, 2-deaths | FZ-G3 → **P32** (extend) |
| — **entity transform / spawn** — | coal→diamond, dig→statue, canary→bauble, inflate→boat | **P23 (NEW)** — reinforces FZ-G2 |
| — **teleport actor on trigger** — | pray→forest, bank walls, mirror rooms, endgame, bat(random), lair-summon | **P24 (NEW)** — ±computed ±random |
| — **runtime exit mutation** (add/delete/rewrite edges) | rug→trapdoor exit, trapdoor bars UP, mirror/dam rewrites, explosion "mung" | **P25 (NEW)** — beyond ADR-220's *conditional* exits |
| — **light fuel / burn-down** — | lantern (330), candles (50, no-relight), torch (∞) | **P26 (NEW)** |
| — **darkness + grue-death** — | any dark move without light (25% live) | **P27 (NEW)** — needs P26 |
| — **conditional death** (location/verb-allowlist/timed/probabilistic) | grue, gas explosion, falls (all-but-LOOK fatal), glacier melt, balloon crash, flooding | **P28 (NEW)** |
| — **commandable NPC** (orders → actions; remote actuator) | Dungeon Master (follow/stay/set-dial/push-button), robot | **P29 (NEW)** |
| — **actor/other-entity-conditioned verb** | egg opens only by NPC, unarmed-attack veto, white-hot axe (take-veto keyed to troll's life) | **P30 (NEW)** |
| **non-IF puzzle** (spatial algorithm) | Royal Puzzle (8×8 sliding-block grid) | **HATCH** (TS + `define…from`; P31 — *not* a Chord primitive) |
| **non-IF** (cryptographic) | INCANT cipher | **HATCH** (`define … from` — a legit one-off) |
| Full stateful combat resolver | troll/thief/cyclops melee, wounds, cure daemon | the **melee plugin** (access) |

---

## Extended primitives (continue the thief's P1–P22)

- **P23 — entity transform / spawn.** Consume an input entity and materialize a distinct
  output (coal→diamond), or reveal/spawn a pre-declared entity into scope (dig→statue,
  canary→bauble). Generic (a 3D printer, a caterpillar→butterfly). *Subsumes FZ-G2's swap.*
- **P24 — teleport actor.** Move the player (or an NPC) to a non-adjacent room on a trigger
  — unconditional (pray), computed (bank curtain = f(room,noun,flag)), or random (bat,
  carousel). Generic (a transporter pad, a portal).
- **P25 — runtime exit mutation.** Add / delete / rewrite a room's exits at play time (not
  just gate an existing one). rug reveals a *new* DOWN exit; the trapdoor *bars* UP; the
  mirror/dam *rewrite* a room's whole exit set; an explosion *deletes* exits. Broader than
  ADR-220's conditional/computed-destination — this is editing the graph. Generic (a secret
  door, a collapsing tunnel).
- **P26 — light fuel / burn-down.** A light source consumes fuel *while lit* (pausable,
  warned, terminal), then darkens its room. Generic (a torch, a phone battery).
- **P27 — darkness + grue-death.** Computed room darkness (dark flag minus any lit source in
  scope) + a probabilistic death when moving in the dark. Needs P26. Generic (any
  light-or-die zone).
- **P28 — conditional death.** Kill the player on a condition, with variants: **location+verb
  allow-list** ("every verb but LOOK is fatal here" — the falls), **timed/escalating**
  (flooding), **probabilistic** (grue), **item×state×room** (gas/glacier). Generic (a
  minefield, a vacuum airlock).
- **P29 — commandable NPC.** Parse natural-language orders to an NPC (follow / stay /
  "set dial to 4" / "push button") and let it act — including operating a device the player
  can't reach. Generic (a servant, a trained dog, a drone).
- **P30 — actor/entity-conditioned verb.** A verb interceptor whose success depends on *who*
  acts or on *another entity's* state (egg: NPC-only; unarmed-attack veto; white-hot axe:
  un-takeable while the troll lives). Generic (a retina-scanner door, a guarded relic).
- **P31 — NOT a Chord primitive: a *non-IF* puzzle → TS + hatch.** The Royal Puzzle (a
  private mutable 8×8 sliding-block grid with push-slide-follow and a state-predicate exit)
  is a *non-IF* puzzle — a spatial algorithm, not a rooms/objects/verbs mechanic. Per the
  IF/non-IF rule below it is **implemented in Sharpee+TS and hatched to Chord** via
  `define … from`, not expressed as a Chord primitive. This is the impure hatch doing its
  designed job — neither a Chord primitive nor a parity gap. (Same category as INCANT's
  cipher.)
- **P32 — scoring variants.** Extend FZ-G3: deposit-award (trophy case), first-visit
  milestone, negative award / death penalty, hidden max-score change, game-over after N
  deaths. Generic scoring model, not Zork-specific.
- **P33 — vehicle (ride-with-player + state-gated egress).** `VehicleTrait` exists; the new
  work is the Chord surface + "the vehicle's real-world exit depends on its internal state/
  position" (mirror-box orientation, balloon altitude, basket/bucket position). Generic
  (an elevator, a boat, a mech).

New Chord-surface ratchet candidates follow from P23–P33 (RC-9…, to be logged when a child
ADR takes them) — mirroring how RC-1–RC-8 fell out of the thief.

---

## The IF / non-IF boundary = the primitive / hatch boundary  (David, 2026-07-15)

The Royal Puzzle clarifies *where* the Chord-primitive line falls. **IF mechanics** — rooms,
objects, verbs, states, exits, containers, NPCs, scoring, light, liquids — are Chord
primitives (or shared `use` extensions). **Non-IF puzzles** — a bespoke spatial algorithm
(the sliding-block grid), a cryptographic cipher (INCANT) — are **built in Sharpee+TS and
hatched to Chord** via the story-local `define … from` impure hatch. They are neither Chord
primitives nor parity gaps; the hatch is their *correct home*.

This sharpens "access, not implementation" into a test: **if it isn't an IF mechanic, it's
TS + hatch.** A story is "pure Chord" when its **IF** is pure Chord — its non-IF corners are
legitimately hatched, and that counts as parity, not a shortfall. (The trusted/shared vs
story-local hatch split still applies: reusable engines like combat are pure-IR `use`
extensions; one-off non-IF puzzles are impure `define … from`.)

## Fidelity findings (the TS port itself diverges from the MDL canon)

**Canon = the MDL in `docs/internal/dungeon-81/` (a single finite corpus), MINUS the gnome
logic** — the gnome is David's one *intentional* drop (out of scope, do not reproduce).
**Every other divergence below is a real gap to account for** — a canon feature the port
hasn't finished, not a design change.

> **Consequence for this matrix (why it under-counts):** because these gaps are *not
> implemented in the port*, the port-derived audit never saw their primitives — the
> feed→thirst→sleep path (a ritual/state machine), auto-drift (a timed daemon that carries
> the player), the basket weight-gate (an over-encumbrance passage veto) are all primitives
> **missing from P23–P33**. The trustworthy set requires a **direct MDL audit** of
> dungeon-81 (minus gnome), with the port as secondary reference.

Real gaps to account for (reproduce the MDL canon):
- **Cyclops lunch/water (feed→thirst→sleep) alternate solution is unimplemented** — only the
  "Ulysses/Odysseus" flee word works (items exist, unwired). MDL `act1.mud:927-1008`.
- **Coal-mine basket has no weight/narrow-passage gate** — the canonical "can't carry the
  coal through the crawl, must use the basket" constraint is absent (the chimney *does* have
  its empty-hands rule).
- **Frigid River auto-drift is not a timed daemon** — river travel is manual `DOWN` per room
  (MDL sweeps you downstream).
- **Mirror "teleport" collapsed to a single-room exit-toggle** — MDL `MIRROR-MIRROR` did a
  real `<GOTO>` + content swap between two mirror rooms.
- **Exorcism is an *unordered* co-location conjunction**, not an ordered ritual (order is
  only book flavor text).
- Endgame entry & victory are **condition/completion-gated, never score-threshold** (a data
  point for the FZ-G3 scoring-vs-victory design).

## Bottom line

The Chord **IF** vocabulary for a full Dungeo is **P1–P30, P32, P33 + the melee plugin + the
roadmap ADRs** (219/220/090/221/223/FZ-G3) — a closed, bounded set of *generic* primitives.
The **non-IF** puzzles (the Royal Puzzle's grid, INCANT's cipher) are TS + `define … from`
hatch, by design (P31). So Chord covers **all of Dungeo's IF**; the hatch covers the non-IF —
the parity model working exactly as intended. We do **not** have all the elements built
today, but we now know **precisely** what the complete set is, and where the primitive/hatch
line falls.

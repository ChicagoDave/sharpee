# ADR-222: Elegance Parity — Chord as the Elegance Oracle for the Sharpee API

## Status: ACCEPTED (2026-07-15 — principle + seam taxonomy + friendly-zoo catalog; all open questions resolved via interview, accepted by David) · AMENDED 2026-07-15 (DZ-1…11 Dungeo backlog table superseded by the capability matrix; §Decision 1–4 unchanged and authoritative)

> Child/companion of ADR-214 (Chord ⇄ Sharpee parity). ADR-214 set the north
> star **100% Sharpee == 100% Chord** as *capability* parity — every platform
> capability must be reachable from a `.story` file. This ADR was surfaced
> 2026-07-15 while building a canon-vs-Chord divergence inventory for the
> friendly-zoo story (`docs/work/chord-parity/friendly-zoo-canon-divergence.md`):
> several behaviors are expressed **more elegantly in Chord than in the
> hand-written TypeScript canon**. David's framing — "making Chord cruder is not
> an option; that means something is inelegant in Sharpee, exposing a seam in the
> Sharpee API" — generalizes ADR-214 from capability parity to **elegance
> parity**, and reframes the divergence audit as a Sharpee platform-quality audit.

## Date: 2026-07-15

## Terminology

- **Canon** — the *story* and its intended behavior/feel (e.g. the original
  Sharpee friendly-zoo), NOT the specific code that implements it today. The
  original **TypeScript** Sharpee stories are canon (David, 2026-07-14); the Chord
  port and the transcripts must reproduce the canon.
- **Elegance parity** — the two authoring surfaces (the Sharpee TS API and Chord)
  must express the same intended canon behavior with *equal cleanliness*, not just
  both be *capable* of it.
- **Seam** — a place where one authoring surface is forced into a cruder
  expression of a behavior the other renders cleanly. A defect in the cruder
  surface, exposed by the divergence.
- **Elegance oracle** — Chord's role: because Chord compiles down to the platform,
  wherever Chord is cleaner than direct TS, it *proves* the platform can do the
  behavior elegantly, and thus that direct TS has a seam.

## Context

ADR-214 established capability parity and an audited gap list of things Chord
*cannot yet do* that TS can (the `.story` file can't reach them). Building the
friendly-zoo canon-vs-Chord inventory surfaced the **mirror image**: behaviors the
hand-written TS canon does *crudely* that Chord does *cleanly*. Two examples:

- **Goat hunger (FZ-D1).** Canon uses a `feeding_time_active` flag + a
  `bleat_turns_remaining` counter + a manual player-location check to bleat for a
  3-turn window after each feeding bell (`events.ts:107-133`). Chord models it as
  what it actually is: a reversible `hungry`/`content` entity state with
  `on every turn while it is hungry → bleat`, presence-gated for free by D11
  (`zoo.story:476-519`).
- **Keeper departure (FZ-D2).** Canon fires an unconditional removal daemon once
  after-hours begins, with only the score co-location-gated (`events.ts:179-214`).
  Chord's `on every turn while after-hours, once` is D11-presence-gated, so the
  keeper departs *when witnessed* and the `,once` is not consumed off-stage
  (`zoo.story:572`).

The tension: canon-first says reproduce the canon, but reproducing these *specific
implementations* would make Chord cruder — which is unacceptable. The resolution
turns on a structural fact.

**The compile-down argument.** Chord compiles *down* to the Sharpee platform — the
story-loader turns `.story` constructs into ordinary platform API calls. Therefore
anything Chord expresses is, by construction, achievable through Sharpee; and when
Chord expresses something *elegantly*, that is proof the platform can do it
elegantly (the loader is literally making the calls that achieve it). So a *crude*
TS implementation of the same behavior is **not** a capability limit — it is that
the direct TS authoring surface did not make the elegant path ergonomic, so the
author reached for a shortcut. That gap is a **seam in the Sharpee API**, and Chord
is the oracle that exposes it.

## Decision

### 1. Parity is elegance parity, in both directions

The parity invariant (ADR-214) is extended: Chord and the Sharpee TS API are two
renderings of the same canon and must express the same intended behavior with equal
cleanliness. A divergence in elegance for the same intended behavior is a **seam**
to close — never a difference in canon and never a reason to degrade either
surface. Seams run both ways:

| Divergence shape | Seam kind | Close it by |
|---|---|---|
| **Chord cleaner than TS** | **Sharpee TS-API seam** | Promote the pattern Chord's loader uses into a first-class, ergonomic TS primitive; then rewrite the canon TS onto it. |
| **TS can, Chord can't** (or cruder) | **Chord expressiveness gap** (the ADR-214 direction) | Expose the platform capability to `.story` (vocabulary / `use` extension / new construct via the ADR-210 ratchet). |

### 2. "Canon" is the story, not the crude code

Fidelity to canon means fidelity to the *intended behavior*, implemented as
elegantly as the platform allows — not preservation of whatever shortcut the
original code took. Resolving a **Chord-cleaner-than-TS** divergence:

1. Confirm the intended behavior (almost always the elegant one).
2. Ensure Sharpee exposes that pattern as a first-class primitive — **close the
   seam** if it doesn't.
3. Rewrite the canon TS onto that primitive.
4. Chord already uses it.

All three renderings (intended behavior, canon TS, Chord) converge *upward*. Chord
is never made cruder; the crude TS is never enshrined as the target.

### 3. Real-seam diagnostic (don't over-call)

Not every Chord-cleaner divergence is platform work. If the elegant primitive
**already exists** in the TS API and the author merely skipped it → no platform
work, just rewrite the canon TS (Chord still did its job surfacing it). The tell:
does Chord's loader call a **reusable platform helper** (→ if not ergonomic in TS,
promote it) or **hand-wire it internally** (→ that internal wiring should become a
shared primitive)? Only the "genuinely missing / not first-class" case is a seam.

**No deferral — solve for both surfaces** (David, 2026-07-15). This diagnostic
decides *how* to solve a seam (use an existing TS primitive vs. add a new one), not
*whether* to. Every confirmed divergence is solved so the elegant expression is
first-class in **both** Sharpee and Chord — the canon TS is rewritten onto the
elegant primitive (existing or new) and Chord already uses it. Neither surface is
left as a known-cruder rendering, and no seam is parked as "decide later." Each
graduates to its own ADR as the *realization* vehicle (the ADR-214-children
pattern), which is not a deferral.

### 4. The seam catalog

The friendly-zoo divergence audit is re-read as a **Sharpee platform-quality
audit**. Each divergence becomes a catalog entry: `{ id, divergence, direction,
seam-kind, named-primitive-needed, status }`.

**Catalog home** (Q6, resolved 2026-07-15): the catalog's canonical form is the
seeded table below, with per-seam design detail under `docs/work/chord-parity/`
(`friendly-zoo-canon-divergence.md`, `animaltrait-design-notes.md`,
`person-npc-character-notes.md`, `person-automation-blast-radius.md`). Future canon
stories (→ a Chord Mainframe Zork) append entries there.

**Graduation rule** (Q6, resolved 2026-07-15): every **confirmed platform seam**
graduates to its own ADR — **no severity threshold** (the no-dormancy rule);
**related seams group** into one ADR (e.g. the person / automation / creature-state /
personhood cluster → **ADR-223**). **Port-only** items (Chord already expresses it,
e.g. FZ-S2) carry no ADR — they land in the relevant story's canon-port plan.
Precedent: ADR-213/214 (Chord-surfaced Sharpee gaps become ADRs).

## The seam catalog (initial entries — friendly-zoo)

Source: `docs/work/chord-parity/friendly-zoo-canon-divergence.md`. Status legend:
**verify** = confirm the capability/expressiveness against the current platform
before calling it work; **decide** = needs David's behavioral/direction call;
**port** = Chord can already express it, rewrite `zoo.story`.

| ID | Divergence | Direction | Seam kind | Named primitive needed | Status |
|----|-----------|-----------|-----------|------------------------|--------|
| FZ-D1 | Goat hunger — persistent reversible state vs a 3-turn post-bell window | Chord cleaner | Sharpee TS-API seam | **Elegant = canon** (persistent `hungry`/`content` state, bleat while hungry). Solve in both: promote a first-class "reversible entity state + presence-gated per-turn narration" primitive in the Sharpee TS API and rewrite the canon TS onto it; Chord keeps its `states, reversible` + `on every turn while it is hungry` form. | **CONFIRMED → own ADR** (David, 2026-07-15) |
| FZ-D2 | Keeper departure — witnessed-once vs unconditional removal | Chord cleaner | Sharpee TS-API seam | **Elegant = canon** (witnessed-once: fires when the player is co-present, `once` not consumed off-stage). Solve in both: promote a first-class "witnessed-once" behavior primitive in the Sharpee TS API and rewrite the canon TS onto it; Chord keeps its D11-gated `on every turn while after-hours, once` form. | **CONFIRMED → own ADR** (David, 2026-07-15) |
| FZ-G1 | Zookeeper **patrol / automated NPC movement** | TS cleaner (Chord can't) | Chord expressiveness gap | Expose autonomous NPC movement/patrol (route, loop, wait) to Chord — a `use`-style extension. Verified 2026-07-15: Chord has only a generic single-shot `move`; an entity `on every turn` loop is D11 presence-gated (won't patrol unwatched); no automation surface exists. **Subsumed by FZ-P1** — movement is one behavior in the automation layer. | **CONFIRMED → folds into FZ-P1** (David, 2026-07-15) |
| FZ-P1 | `person` **fuses orthogonal concepts** — agent (`ActorTrait`), autonomous behavior (`NpcTrait`, ADR-070 — pure automation, misnamed), and personhood (`CharacterModelTrait`, ADR-141) | modeling seam, both surfaces | **major platform refactor** | **Disentangle into composable layers.** *(Refined 2026-07-15: the five-slice audit forced out a FOURTH layer — CREATURE-STATE (alive/conscious/hostile), duplicated across `NpcTrait`/`CombatantTrait` with a live sync bug. The full model is **AGENT / AUTOMATION / CREATURE-STATE / PERSONHOOD** — see **ADR-223**.)* Base kind `person` (character-agent) / `animal` (FZ-X1); an **automation** layer (rename off "NPC"; attach to a `person` OR `animal`; subsumes FZ-G1); a **character-model** personhood layer (re-homed under AGENT). Zoo consequence: the parrot is `animal`+automation (mis-kinded `person` today); zookeeper is `person`+automation. **Large blast radius — grounded 2026-07-15: ~13 modules, 85+ files (dungeo 40, world-model 18, stdlib 6, plugin-npc, + every NPC story).** Notes: `person-npc-character-notes.md`, `person-automation-blast-radius.md`. | **CONFIRMED → ADR-223** (David, 2026-07-15) |
| FZ-G2 | Penny-press — react to *put-in* (item put into a container) | TS cleaner (Chord can't) | Chord expressiveness gap | **container-insertion reaction clause with item binding** (e.g. `after putting <item> in it` / `on receiving <item>`). Verified 2026-07-15: Chord clauses bind only the owner as `it`, exposing no put-in payload; canon TS uses reusable `chainEvent` + `createEntity`. **No runtime create added** — the penny→pressed-penny transform uses the off-stage-declare + `move`/`remove` **swap pattern** (David, 2026-07-15). | **CONFIRMED → own ADR** (David, 2026-07-15) |
| FZ-G3 | Scoring & victory model | author chooses | Chord expressiveness gap → **dual-mode scoring** | **Dual-mode scoring** (David, 2026-07-15 — *revokes* the earlier "named levels only" answer). The author picks per story: **(a) numeric** — point values, a numeric total, and numeric thresholds (`win when score reaches <N>`); this **lifts Given 5's no-numeric-comparison fence for scoring** so real thresholds exist. **(b) goal-based** — each scoring event is a named **goal**; progress counts goals; **named ranks** sit at goal-count thresholds (e.g. four goals → "physician's assistant"), surfaced in the score report ("You have completed four goals so far, making you a physician's assistant") and usable in victory. Friendly-zoo canon uses **numeric** mode (max 100), so the port stays faithful; goal mode is the new semantic option. Ties in FZ-S1 (a shared "pet an animal" score/goal). | **CONFIRMED → own ADR** (David, 2026-07-15) |
| FZ-S1 | Pet scoring (+5, once, for petting *any* animal) | Chord port incomplete | port (verify) | Chord owner-scoped scores make "5 once for anything" awkward — verify a shared/global score is expressible | port |
| FZ-S2 | Drop-feed → goats-react flavor line | Chord port incomplete | port (verify) | verify a drop/room-reaction clause exists | port |
| FZ-X1 | Zoo animals modeled as `scenery` — no first-class "creature" concept (Chord's snake is a scenery object; canon's snake is a phantom room-line; goats/rabbits are `scenery` in both) | modeling seam, both surfaces | **new trait**, solve in both | **`AnimalTrait`** (world-model) marking an entity as an animal, with an allow/disallow **carry/hold** control (a small animal can be carryable, a goat not — without abusing `scenery` for non-portability). Chord surface: an `animal` adjective mapping to it (+ carry config). Goats, rabbits, and the snake become animals; canon TS gains the trait and a real snake entity. | **CONFIRMED → own ADR** (David, 2026-07-15) |

Scoring reconciles once FZ-S1 + FZ-G2 land: canon `MAX_SCORE = 100` = Chord's
current 85 + pet 5 + pressed-penny 10.

## The seam catalog — Dungeo primitive backlog (P23–P33)

> **SUPERSEDED (2026-07-15) — the DZ-1…11 table below is superseded by the
> grounded capability matrix, `docs/work/schism/sharpee-chord-capability-matrix.md`.**
> This table was port-derived and over-counted "NEW primitives": the 2026-07-15
> capability audit verified each need against real platform *and* Chord code and
> reclassified them as CAN / CHORD-GAP / SHARPEE-GAP / HATCH — most are already
> owned by ACCEPTED ADRs (215/217/219/220/221) or already possible today. The
> table is retained below for provenance only; do not plan from it. **This ADR's
> §Decision 1–4 (the elegance principle, the real-seam diagnostic, and the
> graduation rule) are NOT superseded and remain authoritative** — they are the
> source of the two-Ways framing now folded into ADR-214 §1a.

Full audit + matrix: `docs/work/schism/dungeo-completeness-matrix.md`. The canonical Dungeo (path to a
Chord Mainframe Zork) needs a **closed, bounded** set of generic IF primitives beyond
the thief's P1–P22. **~6 are already roadmapped** (extend existing ADRs); **~5 are
new-but-generic** (need their own ADR/child); **the 2 non-IF puzzles are HATCH by
design** (the IF/non-IF line = the primitive/hatch line — §3 diagnostic, David
2026-07-15). "Named-primitive" ids continue the decomposition's P-numbering.

| ID | Primitive (generic) | Home | Status |
|----|---------------------|------|--------|
| DZ-1 (P23) | **entity transform / spawn** — consume input → materialize distinct output (coal→diamond, dig→statue, canary→bauble) | extends **FZ-G2** (container-insertion + off-stage swap) → likely one ADR | NEW → own ADR |
| DZ-2 (P24) | **teleport actor on trigger** — move player/NPC to a non-adjacent room (pray, bank, mirrors, bat-random, lair-summon); ±computed ±random | new; touches **ADR-220** (computed destination) but trigger is a verb/event, not an exit | NEW → own ADR |
| DZ-3 (P25) | **runtime exit mutation** — add/delete/rewrite a room's edges at play time (rug→trapdoor, mung, mirror/dam rewrite) | **extends ADR-220** (beyond *conditional* to *editing the graph*) | ROADMAP-extend |
| DZ-4 (P26) | **light fuel / burn-down** — a source burns fuel while lit (pausable, warned, terminal) → darkens room | new light-source-fuel primitive | NEW → own ADR |
| DZ-5 (P27) | **darkness + grue-death** — computed darkness + probabilistic move-death in the dark | new; depends on DZ-4 + DZ-6 | NEW (with DZ-4/DZ-6) |
| DZ-6 (P28) | **conditional death** — kill on a condition: location+verb-allowlist ("all but LOOK fatal"), timed/escalating, probabilistic, item×state×room | new death/kill primitive | NEW → own ADR |
| DZ-7 (P29) | **commandable NPC** — parse orders → NPC actions (follow/stay/"set dial to 4"/remote actuator) | **extends ADR-223** (daemon/NPC) | ROADMAP-extend (ADR-223) |
| DZ-8 (P30) | **actor/entity-conditioned verb** — verb success depends on *who* acts or another entity's state (egg opens only by NPC; unarmed-attack veto; white-hot axe) | **extends ADR-090/118** (capability dispatch / interceptors) | ROADMAP-extend |
| DZ-9 (P32) | **scoring variants** — deposit-award, first-visit milestone, negative/death-penalty, hidden max-change, game-over-after-N | **extends FZ-G3** (dual-mode scoring) | ROADMAP-extend (FZ-G3) |
| DZ-10 (P33) | **vehicle (ride + state-gated egress)** — player occupies a vehicle whose real exits depend on its internal state (basket/boat/balloon/mirror-box) | `VehicleTrait` exists → **new Chord surface** | ROADMAP-extend + Chord surface |
| DZ-11 (P31) | **Royal-Puzzle grid + INCANT cipher** — *non-IF* puzzles (spatial algorithm / cryptography) | **HATCH** (`define … from`) — not a Chord primitive, not a gap | HATCH (by design) |

Combat is the **melee plugin** (access), not a catalog entry. Liquids (dam/well/boat)
= **ADR-219**; capability-dispatch verbs (wave/turn/rub/lower/tie) = **ADR-090/221** —
both already roadmapped, exercised harder by Dungeo. Fidelity backlog (the TS port ↔
MDL divergences) is tracked in the matrix, separate from these primitives.

## Consequences

- **ADR-214's roadmap is re-anchored.** Parity work is driven by *reproducing the
  canon TS stories in Chord* (friendly-zoo first, Mainframe Zork long-term), and the
  divergence audit per story yields seam entries in both directions. The seven
  ADR-214 child workstreams (`docs/work/chord-parity/roadmap.md`) remain valid as
  capability work but are now fed by, and prioritized against, the seam catalog.
- **The audit improves the platform, not just the port.** Closing a Sharpee TS-API
  seam (FZ-D1/D2) makes *every* future direct-TS author's code cleaner — the payoff
  compounds beyond Chord.
- **Transcripts must be re-baselined to canon.** The frozen friendly-zoo
  transcripts encode the *Chord* build (scoring 85; witnessed keeper; persistent
  hunger), not canon. After each divergence resolves, its transcript is re-cut to
  the agreed canon behavior. This reverses a prior David sign-off (Phase C P5,
  scoring 100→85) and so is an explicit, owner-approved step, never a silent edit.
- **Two prior mistakes this ADR guards against** (2026-07-14, reverted): dropping
  the TS canon scoring 100→85 to match a Chord-era transcript, and preparing to
  strip the zookeeper's patrol to green a transcript. Both degraded the canon to
  pass a test — the anti-pattern this ADR (and rule "no get-it-done assumptions")
  forbids.
- **No code is authorized by this ADR.** It is a principle + taxonomy + audit
  reframing. Each seam graduates to its own platform ADR / plan before
  implementation, under CLAUDE.md's platform-change gate.

## Session

Session 7442d0 (2026-07-15). Extends ADR-214 (parity umbrella). Surfaced by the
friendly-zoo canon-vs-Chord divergence inventory
(`docs/work/chord-parity/friendly-zoo-canon-divergence.md`). Related: ADR-210
(Chord language + grammar ratchet, incl. D11 owner-scoped narration that gives
Chord FZ-D1/FZ-D2's elegance for free), ADR-070/071 (NPC/daemons — the platform
systems FZ-G1 must expose), ADR-213 (precedent: Chord-surfaced Sharpee gaps become
ADRs). Memory: `chord-as-elegance-oracle`, `sharpee-chord-parity-goal`,
`no-get-it-done-assumptions`.

# Dungeo Gap Analysis — Secondary Pass: Missing Artifacts, Not Style

**Date:** 2026-07-15 · **Session:** 5c4f8a · Companion/filter over
`mdl-port-gap-analysis.md`. David's instruction: the port followed **The Sharpee Way**, so
the MDL implementation will never 100% match the Sharpee build. We want **missing logic /
game artifacts** (player-observable absences), **not differing implementation styles**.

## The test

A finding is a **REAL GAP** iff a player can observe the absence: an object you can't find or
interact with, a death you can't trigger, a puzzle you can solve that you shouldn't (or can't
that you should), a state/message you'd see. It is **THE SHARPEE WAY** (drop it) iff every
player-observable outcome is identical and only the code structure or data representation
differs.

## The port's charter makes this sharp

`stories/dungeo/CLAUDE.md`: *"We are adhering to all timers, counters, and randomization logic
unless it's not feasible."* The port's **stated intent is MDL fidelity**. So an incomplete or
absent behavior is a gap against the port's own charter — The Sharpee Way governs *how* a
behavior is built, never *whether* it exists. Corroborated: the port's own
`map-connections.md` spec includes the MDL forest self-loops and West/South-of-House→forest
exits; the implementation (`forest.ts`, `white-house.ts`) omits them — i.e. the map divergences
are unfinished implementation, **not** a redesign.

## What the filter REMOVES (pure Sharpee Way — not gaps)

Small list, shown for transparency so the filtering can be audited. In each case the
player-observable outcome is identical; only internals differ. **Where a representation change
also dropped observable behavior, that behavior stays a gap — only the representation is
removed here.**

| Filtered-out (style only) | Why it's not a gap | Observable behavior that STAYS a gap (tracked separately) |
|---|---|---|
| Basket modeled as one moving entity vs MDL's two-ends pair | Auditor confirmed functionally equivalent; player rides/loads identically | — (none) |
| Actor layer: bespoke per-NPC behaviors vs MDL's single VILLAINS/ACTORBIT table | Table-vs-bespoke is pure structure | The **behaviors** the structure dropped (generic HELLO, give/destroy-robot, cyclops model) remain gaps §1F |
| Bank curtain: SCOL "rotating cube" driven by an index table vs a deterministic wall state-machine | The data representation of the rotation | **Entry-direction-sets-destination logic** + **vault-alarm death** remain gaps §1G/§1B |
| Mirror-box: position-int inside one room vs MDL's slide-between-segment-rooms topology | The topology representation | **Guardians of Zork** + **timed door windows** remain gaps §1A/§1B (they're why the box matters) |
| Prison cells: single room + visibility toggle vs 8 physical rotating cells | The cell representation | **Co-op requirement** (solvable-solo in port) remains a gap §1G |

That is the whole style-only drop list. **Everything else in the primary doc survives** — the
auditors reported observable absences, not code aesthetics.

## What SURVIVES — the confirmed missing-artifacts catalog

All of primary-doc Sections 1A–1J **except** the five representation items above. Restated as
a player-facing severity ranking (what a player would notice, worst first). Cites live in the
primary doc.

### Tier 1 — Puzzle integrity: things a player can do that they shouldn't (or vice-versa)
These change what the game *is* — a solver reaches treasure/victory by a path MDL forbids.
- **Cyclops is killable** (MDL: invulnerable; kill him and the intended feed/Ulysses puzzle is moot).
- **Pot of gold visible + reachable overland** — the entire rainbow puzzle is bypassable.
- **Guardians of Zork absent** — the endgame's central hazard; the mirror-box is optional, you stroll south past them.
- **Prison-cell solvable solo** — the DM co-op puzzle isn't required.
- **Bank entry-direction logic gone** — vault reachable by a route that shouldn't exist; no vault-alarm death.
- **Machine puzzle: 3 of 4 rules gone** (no screwdriver, no lid-closed, no gunk-transform; one-shot).
- **Coffin transport gate absent** — carry the coffin through passages MDL blocks (routing puzzle removed).
- **Round-room steel box / library decoy books / alice-cake magnifier** — search/gating puzzles handed to the player pre-solved.
- **Boat puncture consequence-free**; **white-cliffs deflate gate absent**; **slide rope-grip gate absent**.

### Tier 2 — Missing deaths & timed pressure (Zork's texture)
Player-observable: a death you can't trigger, or dawdling that should kill you but doesn't.
- Death traps: rusty knife, black-book burn, bodies desecration→head-on-pole, brush-teeth, flask poison, wave-on-rainbow, barrel/GERONIMO, 5th-dig, leaf-burn-while-carried, machine electrocution, cyclops-wrath-eaten, kick-bucket/kill-self/play-villain, attack-self suicide.
- Treasure-ruin: painting mung, play-violin-worthless.
- Timed windows (the ★ candidate primitive): vault alarm, mirror-door 7-turn, pine-door 5-turn, exorcism windows + **hot bell object**, match 5-count + 2-turn burn (and match isn't a light source — you light candles off a cold match).

### Tier 3 — Missing objects, verbs & mechanics (present-but-thin or absent)
- Objects: tube-of-gunk+leak (flood is unstoppable), sooty-room stove (room is wrongly dark), gallery wrongly dark, flask, poled heads/Coke-bottles/listings, pile of bodies, burned-out lantern, newspaper, tool chests, parapet numbers.
- Mechanics: skeleton curse (banish valuables), palantir (look-in-sphere→see next room), wishing well, up-a-tree drop physics + broken egg/canary, cave2 windy candle-blowout, royal-puzzle steel-door branch, TEMPLE/TREASURE teleport verbs.
- NPC behaviors: generic HELLO (villain-bow, hello-sailor), give-to-robot, destroy-robot (strands carousel), robot eat/drink/read flavor, thief sacred-room avoidance (surface treasure isn't safe), spirits attack-response, DM catch-up-follow/death-on-attack/cell-refusal, bat drops span whole map (should be coal-mine-local).
- Content verbs: COUNT (69,105 gag), PLAY, SHAKE (spoils buoy hint), SWIM, joke verbs.
- Messages/state (thin but observable): kitchen-window prose static, custom blocked-exit one-liners, torch-turnoff burn-hand line, bank-teller alarm bag-the-bills exploit + blocks-S divergence, quiz re-ask cadence.

### Tier 4 — Scoring artifacts
- Rank tables (Beginner→Wizard; endgame Cheater→Dungeon Master) → generic stdlib ranks.
- Score-gated endgame entry + wraith herald absent.
- FDOOR/BDOOR label check (data, not style).

## Held separate — David-decision (NOT auto-classified as gaps)

- **FORTRAN-lineage (§1I):** death model (−10/2-death vs walking-dead spirit + resurrect),
  lamp fuel 330 vs 464 + staged warnings, crypt trigger + geometry + epitaph, trivia 8 vs 15,
  INCANT ENCRYP vs username cipher. These are deliberate *different-game-behavior* choices,
  not unfinished MDL logic. Per-subsystem keep-or-restore call.
- **Map redesign?** Now answered: the map spec matches MDL, so forest self-loops and
  house→forest exits are **unfinished implementation (gaps)**, not a redesign. Moved OUT of
  this bucket into Tier 1/3.

## Non-IF (hatch) — unchanged from primary doc
Royal-Puzzle solver + INCANT cipher remain HATCH by design; only the royal-puzzle steel-door
*branch* (Tier 3) is missing content.

## Incidental port bugs (not canon gaps; fix regardless)
gas-room `console.error` every command · troll-wake stale-melee-state · bat-drop endgame-room
leak · balloon-crash died-event when not aboard · stagger false-disarm vs cyclops.

## Bottom line for the secondary pass
The Sharpee-Way filter removes **five representation-only items** and reclassifies the
FORTRAN-lineage set as a keep-or-restore decision. **The missing-artifacts catalog is
otherwise intact** — the port is a faithful-but-unfinished MDL implementation (its own
charter), strong on the puzzle spine and thin on deaths, timed pressure, secondary
objects/verbs, and generic actor interactions. Tier 1 (puzzle-integrity bypasses) is where a
player most feels the difference and is the recommended first target.

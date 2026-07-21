# Session Summary: 2026-07-15 — chord-foundations

## Goals
- Begin ADR-218 Phase 1 (W1: `enterable`/`climbable` catalog adjectives).
- (Emergent) Reconcile the friendly-zoo Chord port to its TS canon.
- (Pivot) Design the person/automation platform separation surfaced by that work.

## Completed

### ADR-218 Phase 1 — enterable/climbable (committed `ed4f51b8`, prior turn)
- Added `enterable`/`climbable` to the Chord catalog + loader; ratchet entries F1/F2; two fixtures (2/2 each). Flipped the `entering`/object-`climbing` audit rows.
- **Two platform gaps surfaced + fixed:** the world-model **root barrel** never exported `EnterableTrait` (+8 other trait subdirs) — all nine now exported; and **parser-en-us had no object-climbing grammar** — added the `climb/scale/ascend/descend :target` family. cloak 81/81.
- Adopted the Chord `first time`/initialDescription (Z1) in `zoo.story` → chord friendly-zoo 71/71.

### Reverted a wrong-direction commit (`9d71dbcf`)
- Had dropped the TS canon scoring 100→85 to match a Chord-era transcript — **backwards** under canon-first. `git reset --hard ed4f51b8` restored canon (MAX_SCORE=100, pet/penny scores).

### Elegance-parity principle + seam catalog — **ADR-222 ACCEPTED**
- `docs/architecture/adrs/adr-222-elegance-parity-seam-catalog.md`. **Chord is an elegance oracle for the Sharpee API**: because Chord compiles down to the platform, a Chord form cleaner than hand-written TS proves the platform can be elegant → the crude TS is a *seam*. Elegance parity, both directions. Seam taxonomy + friendly-zoo seam catalog (FZ-D1/D2/G1/G2/G3/S1/S2/X1/P1). Interview resolved all open questions.
- `docs/work/chord-parity/friendly-zoo-canon-divergence.md` — the canon-vs-Chord divergence audit that seeded the catalog.

### Person/daemon separation — **ADR-223 DRAFT** (model LOCKED)
- `docs/architecture/adrs/adr-223-npc-four-layer-separation.md`. `NpcTrait`/`person` fuses four orthogonal concepts. **Locked names (2026-07-15): AGENT / DAEMON / HEALTH / PERSONHOOD.** Umbrella model + approach (platform-primary, **explicit Chord validation** gate, **Dungeo regression secondary**) + child roadmap A/B/C/D + AC-1..AC-7.
  - **DAEMON** = system-driven behavior over time, subject-agnostic (person/animal/machine/**environment**); **merge decision** — `NpcService`/`NpcBehavior` + `SchedulerPlugin` become one daemon model.
  - **HEALTH** = one `HealthTrait` (alive/dead derive); **opt-in, required by combat/damage** (alive is the actor default); combat + destruction bend to it → three health models collapse and the **live sync bug vanishes by construction**. Hostility → disposition (personhood).
  - **AC-7 — the thief is pure Chord**: the daemon layer's elegance-oracle test.
- **Five-slice audit** → `person-automation-blast-radius.md`: ~13 modules/85+ files; the live sync bug; combat safe (keyed to `CombatantTrait`); the `@sharpee/character` personhood stack is **The Alderman's in-progress work**.

### Thief decomposition (the daemon layer's concrete spec) — `docs/work/schism/`
- Validated the Chord thief against the **canonical 1981 MDL** (`docs/internal/dungeon-81/`): `thief-mdl-validation.md`. Combat = the **existing melee plugin** (access); the daemon needs a bounded capability set.
- **`thief-primitive-decomposition.md`** — the thief broken into **22 generic Sharpee+TS primitives (P1–P22)**, none thief-specific; the whole robber is a valid Chord composition of them (states + `each` + conditions + phrases + daemon movement + concealment). Gap list is fully generic.
- **`ratchet-candidates.md`** — grammar candidates **RC-1–RC-8** (bare owner-state `while prowling`; `chance <p>`; movement verbs; bulk `drop everything`; `on giving`/`on throwing`/`on dying`; `sacred`/`valuable` markers; `conceal`/`reveal`). NOT approved — separate from the ratchet log.
- **`code-examples.md`** — four entities (zookeeper/parrot/thief/Ross) in TS + Chord across the layers; alive-is-default, opt-in health, pure-Chord thief.
- ADR-223 children **B** (platform primitives P1–P22) and **D** (Chord surface RC-1–RC-8) now cite these as their concrete deliverable spec.
- Earlier notes: `animaltrait-design-notes.md`, `person-npc-character-notes.md`.

## Key Decisions
1. **Canon = the original TS Sharpee stories** (not the crude code); Chord + transcripts reproduce it; where Chord can't, that's a platform gap. TS stories are canon; long-term goal a Chord Mainframe Zork. (Memory: `sharpee-chord-parity-goal`.)
2. **Chord is an elegance oracle** — Chord-cleaner-than-TS ⇒ a Sharpee API seam; never dumb down Chord (ADR-222). (Memory: `chord-as-elegance-oracle`.)
3. **No deferral, no "get it done"** — solve the elegant form in *both* Sharpee and Chord; never strip a feature/reduce canon to pass a test. (Memory: `no-get-it-done-assumptions`.)
4. **Dual-mode scoring** — numeric OR goal-based (named ranks); Given-5 numeric fence lifted for scoring (revokes the earlier "named levels only").
5. **Four-layer NPC separation** as a platform change, Chord-validated, Dungeo-regression-secondary (ADR-223).

## Next
- **ADR-223 open-questions interview** (Q-1..Q-6: automation-layer name; CreatureState standalone-vs-fold; orphaned-plumbing fate; observation pipeline; per-NPC state home; child sequencing).
- Then draft child ADR A (`CreatureStateTrait` — unify + fix the live bug) first.
- Parked: friendly-zoo canon-port resumes after the person/automation model settles.

## Open Items
- ADR-223 is DRAFT (6 OQs) — must not be ACCEPTED until resolved.
- The live creature-state sync bug (rides child A).
- Branch `chord-foundations` is ahead of origin (unpushed): `ed4f51b8` + this design commit.

## Files (this commit)
- `docs/architecture/adrs/adr-222-*.md` (ACCEPTED), `adr-223-*.md` (DRAFT)
- `docs/work/chord-parity/{friendly-zoo-canon-divergence,animaltrait-design-notes,person-npc-character-notes,person-automation-blast-radius}.md`

## Metadata
- **Status**: COMPLETE (design/planning; no code beyond the earlier `ed4f51b8`)
- **Rollback safety**: docs-only this commit; safe to revert.

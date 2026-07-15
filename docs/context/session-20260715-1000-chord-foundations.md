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

### Person / automation four-layer separation — **ADR-223 DRAFT**
- `docs/architecture/adrs/adr-223-npc-four-layer-separation.md`. `NpcTrait`/`person` fuses four orthogonal concepts: **AGENT / AUTOMATION / CREATURE-STATE / PERSONHOOD**. Umbrella model + approach (platform-primary, **explicit Chord validation** gate, **Dungeo regression secondary**) + child roadmap A/B/C/D + AC-1..AC-6 + 6 open questions.
- **Five-slice read-only audit** → `docs/work/chord-parity/person-automation-blast-radius.md`: ~13 modules, 85+ files. Key findings: it's four layers (CREATURE-STATE forced out); a **live bug** (basic-combat kill leaves `NpcTrait.isAlive=true` → dead NPC still takes turns); combat is safe (anchored to `CombatantTrait`, never reads `NpcTrait`); the personhood stack (`@sharpee/character`) is **The Alderman's in-progress work**, not dead cruft; knowledge/goals duplicated 2–3×; a graveyard of orphaned plumbing (witness system, `observeEvent`, reactive hooks, behavior save-state, ADR-102 DialogueExtension).
- `animaltrait-design-notes.md` (FZ-X1 — `AnimalTrait` + carry/weight/before-take; portability resolved in `taking`) and `person-npc-character-notes.md` (the model + approach).

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

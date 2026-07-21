# AnimalTrait — design notes

Working notes for the graduating **AnimalTrait** ADR (ADR-222 seam **FZ-X1**,
Creatures & NPCs cluster). Gathered with David 2026-07-15 — not yet an ADR, no
code. Principle: AnimalTrait sets a lean **baseline**; blocks and aliveness are
**compositional** on top via existing mechanisms.

## Notes

### N1 — carry + weight + before-taking response
- An animal may be **carryable** (cat): Portable, with a **weight** that counts
  against the carrier's capacity / encumbrance.
- It may carry a **`before taking` response** (`cat-claws-you`) that reacts and/or
  blocks the take — this **reuses the existing intercept mechanism**, not a new one:
  TS taking action interceptor (`preValidate`, ADR-118, `taking.ts:47`) / Chord
  `on taking it → refuse …` (`taking` is a bound clause verb, `analyzer.ts:152`).
- **Open:** confirm weight-based **encumbrance is actually enforced on take** —
  entities carry weight and container/actor `capacity` supports `maxWeight`
  (`container-utils.ts:14`), but the zoo player sets only `maxItems: 10`, so the
  take-time weight check may not be wired.

### N2 — portability is a three-case model
- **Intrinsically portable** (cat): carryable = true, has weight.
- **Intrinsically non-portable** (elephant): carryable = false — **without abusing
  `scenery`** (AnimalTrait carries its own non-portability; removing that hack is
  the whole point of FZ-X1).
- **Portable-but-blocked**: carryable = true, but the author layers a **logical
  block** (conditional or unconditional) via the existing `on taking it` intercept /
  `refuse` — orthogonal to the intrinsic setting.
- So the trait provides the baseline carryability (+ weight when carryable); logical
  blocks are composed, not baked in.

### N3 — Dead/Alive is optional author state, not built in
- Aliveness is **not** a mandatory AnimalTrait field. The author adds **Dead/Alive
  as reversible states** (D8) only when the story needs it (a killable/huntable
  creature). AnimalTrait presumes no life/death semantics — stays lean.

### N4 — portability is resolved in the taking action; traits stay semantic
- **Traits stay semantically accurate.** `scenery` means *background décor*, not the
  catch-all for "non-portable" (other IF systems overload scenery; Sharpee won't).
  `animal` = creature; `weight` = mass. Each trait says what a thing *is*.
- **The `taking` action is the single portability arbiter.** "Can this be taken
  right now?" is a question taking asks, resolving it from the semantic signals:
  `scenery` (fixed) → no; `animal` → consult `carryable` + `weight` vs the carrier's
  capacity; a logical block (`on taking it` / interceptor) → refuse. This is already
  Sharpee's stated stance (world-model CLAUDE.md) — made the primary path.
- **AnimalTrait owns its `carryable` + `weight`**; it never borrows `scenery` for
  non-portability. Un-hacking scenery needs no scenery change — just the taking
  resolver consulting the right signals.
- **Refinement (open):** make it a **shared takeability resolver** — an
  `isPortable(entity, actor)` query the world-model owns — so `taking` *and* every
  other item-moving action (put-in, give, throw) agree, rather than the logic living
  only inside `taking` (the §3 reusable-helper tell).

## Open threads (not yet placed)
- **`animal` vs `person` boundary.** Parrot and zookeeper are `person` (NPCs);
  snake/goats/cat would be `animal`. Where's the line — what makes something an
  animal vs a person-NPC? (Movement/automation? dialogue? — ties to FZ-G1.)

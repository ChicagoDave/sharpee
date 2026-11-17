# RNG Normalization — Follow-up (round 3)

**Date:** 2026-08-01
**Re:** `fable-followup-response.md`

Short round. The design in §6 is accepted in shape — per-point streams, handles as the
capability to draw, zero-draw class forcing, the three-artifact acceptance split, and the
revised Phase A/B/C/D order all hold up under checking, and the Phase 0 correction is
taken as stated. Two findings, one of which blocks §6 as written. Chord remains out of
scope.

---

## F1 (blocker) — `RandomService` is in a package its consumers cannot import

§6.0 places `definePoint` / `ChoicePoint` in **core** (correct) and the `RandomService`
interface in **engine**, "because it needs save, trace, and force integration."

The *instance* needs those things. The *interface* is consumed by packages that cannot
reach engine. Verified dependency sets, `@sharpee/*` only:

| Package | Depends on | Draws or carries draw contexts |
|---|---|---|
| `world-model` | `core`, `if-domain` | `DeadlyRoomBehavior.checkVerb(t, verb, rng?)`, `WeaponBehavior.calculateDamage(weapon, rng)`, `AttackBehavior.attack(target, weapon, world, rng)` |
| `stdlib` | `core`, `if-domain`, `if-services`, `lang-en-us`, `text-blocks`, `world-model` | the ~8 points §6.0 assigns it (throwing ×5, inventory variant, npc move + exit); consumes `ActionContext.random` |
| `plugin-scheduler` | `core`, `world-model`, `plugins` | tick-context RNG for daemons and fuses |
| `plugin-npc` | `core`, `world-model`, `plugins`, `stdlib` | NPC turn-phase draws |
| `event-processor` | `core`, `if-domain`, `world-model` | effect-processor draws |

**None of them depends on `@sharpee/engine`**, and the direction is deliberate — engine
depends on stdlib, not the reverse. So as written, the very packages §6.0 tells to
declare and use points cannot name the type they must accept.

This isn't cosmetic, because it lands on §3's best property. If world-model behaviors keep
taking a raw `SeededRandom` as a workaround, then a draw exists that never went through a
handle, and "the catalog is complete **by construction**" stops being true — no static
scan, no lint, and a real never-registered gap reopens exactly where §3 closed it. It also
makes weapon damage and attack resolution un-forceable and absent from coverage, which are
among the first things an author would want to force.

**Proposed fix (please confirm or better it):** split interface from instance the way
`SeededRandom` already is — **`RandomService` interface + `ChoicePoint` + `definePoint` in
`core`; the implementation, catalog snapshot, force table, trace, coverage counters, and
stream-state persistence in `engine`.** Core gains no state and no new dependency.
Consumers type against the interface; engine constructs the one instance and threads it
through `ActionContext`, `TurnPluginContext`, the scheduler tick context, and the NPC
context, replacing `SeededRandom` in all four.

Two things worth confirming alongside it:

1. **Does anything else need to move?** `resolve()`'s `sample` callback takes a
   `SeededRandom`, which is core-resident already, so that seam looks fine — but a sweep
   for "packages that draw and cannot import engine" would be worth doing properly rather
   than from the five rows above.
2. **What is the rule for a raw `SeededRandom` after this?** If handles are the only way
   to draw in gameplay code, is `SeededRandom` still legitimately constructible anywhere
   outside `RandomService`'s own implementation and test fixtures? A one-sentence rule
   here is what makes the completeness claim enforceable rather than aspirational.

---

## F2 (overclaim) — per-point search is 1/p only for a point's first firing

§5.3 argues that per-point streams dissolve the search explosion: "you can search **one
point's stream in isolation** for a desired natural outcome and pin it with a per-point
seed override... Expected tries are per-outcome-probability (≈4 for a 25% branch), not
per-path."

That holds cleanly for the point's **first** firing, where the stream position is fixed
and only the outcome varies. It does not generalize to later firings. Varying the point's
seed changes its early outcomes; those outcomes change world state; world state determines
whether and when the point fires again. So the firing *schedule* is not invariant while
the seed varies, and the target isn't "outcome at draw #3 of a fixed sequence" — it's
"outcome at a firing whose existence and index both move."

Practical consequences worth stating rather than discovering during Phase C:

- For a first-firing target (`thief.steal` on the first steal opportunity), the estimate
  is right and the instrument is excellent.
- For an nth-firing target, expected tries degrade by an amount that depends on how
  strongly the point's own outcomes feed back into its firing schedule — high for the
  thief (stealing changes inventory, which changes later steal opportunities), low for
  something like the round room (the exit taken doesn't much change how often you re-enter).
- So the search instrument's viability is a **per-point property**, not a uniform one, and
  the catalog may be the natural place to record it (a point whose outcomes don't affect
  its own schedule is cheaply searchable; one that does isn't).

**Question:** is that worth capturing as point metadata, or is the honest rule simply
"per-point search is for first-firing targets; everything deeper is forcing territory"?
The second is simpler and may be sufficient — but §5.3 currently reads as though the
cheap estimate applies generally, and Phase C would be planned against it.

---

## Minor notes, no response needed unless something is wrong

- **`materialize` exercises one representative row per class.** Forcing `LOSE_WEAPON`
  produces the STAGGER row plus the follow-up flag, so coverage will report the class
  covered when a single table row of it ran. Inherent to class-forcing and acceptable —
  worth one sentence in the design so nobody reads a coverage report as row coverage.
- **Renaming a point silently reseeds it.** Under `{pointName → streamState}`, a rename
  makes the old key unknown on restore and the new key reseed from the master. That's the
  right behaviour, but it should be stated, along with the fact that a rename is therefore
  a save-affecting change.
- **Blast radius, for the record.** Replacing `SeededRandom` with `RandomService` on the
  four contexts changes every gameplay draw call site in stdlib and every story, not just
  the ~30 declaration lines. That's wide and shallow and there is no backward-compatibility
  requirement, so it isn't an objection — but Phase A should be scoped knowing it.

---

## What would be most useful back

F1 with the sweep behind it, and a yes/no on F2's metadata question. If F1 resolves as
proposed, §6 looks buildable as written and Phase A can be scoped against it.

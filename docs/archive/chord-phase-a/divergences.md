# Golden Cloak Transcript Suite — Provenance and Divergences

Companion to `docs/work/chord-phase-a/plan.md` (Phase 1 deliverable).
Suite location: `stories/cloak-of-darkness/tests/transcripts/*.transcript`
(six files: foyer-traversal, cloak-and-hook, bar-darkness, message-win,
message-trampled, message-obliterated, re-darkening).

## Authored fresh, not derived

No `.transcript` suite existed for cloak-of-darkness before Phase A — only a
Vitest unit suite (`tests/cloak-of-darkness.test.ts`) asserting against
`WorldModel` internals. This golden suite was authored 2026-07-10 from the
**canonical `cloak.story` text** (design.md §3.1) plus Firth's original Cloak
of Darkness behavior, **not** from the current hand-written `src/index.ts` —
that implementation predates the two accepted divergences (it still has a
permanent-lit bar semantics and an Outside room). ADR-210 AC-1 was amended
the same day to record this. The suite is now **frozen**: it is the Phase A
gate, and later phases fix the implementation until the suite passes, never
the reverse (grammar/behavior changes would need David's approval via
`docs/architecture/chord-grammar-changes.md`).

## The two accepted divergences from Firth's original

1. **Blocked north exit replaces the Outside room.** `north is blocked:
   cant-leave` on the Foyer; the cant-leave phrase carries the original's
   refusal prose. (`foyer-traversal.transcript`)
2. **Re-darkening.** `dark while the player has the velvet cloak` is a
   derived property recomputed at turn end, so the bar re-darkens whenever
   the player regains the cloak — including in place inside the bar — and
   re-lights when they shed it. Firth's original lights the bar permanently
   once the cloak is hung. (`re-darkening.transcript`)

## Derived-from-.story behaviors worth flagging

These follow from the normative `cloak.story` semantics rather than Firth's
original, and the transcripts encode them deliberately:

- **Stumbling is an entry event.** The stumble rule is `when the player
  enters the Foyer Bar while in-darkness` with `first time`/`third time`
  ordinals — message state advances on dark *entries* (1st → trampled,
  3rd → obliterated), not on arbitrary commands performed in the dark as in
  some traditional ports. The second dark entry stumbles without a state
  change. (`message-obliterated.transcript`)
- **Dropping the cloak in the dark bar is allowed** and lights the bar at
  turn end (no rule in `cloak.story` forbids it; Firth's original chides
  you for dropping it in the sawdust). This doubles as the in-place
  derived-property test. (`re-darkening.transcript`)
- **Ending events.** `win`/`lose` are asserted as `story.victory` /
  `story.defeat` semantic events — the one if-domain wire-type addition
  approved in `docs/work/story-language/prereqs.md` §3 (Phase 4 implements
  it). The visible "You have won!"/"You have lost!" text lives in the
  story's own phrases.
- **Standard-action texts** are asserted against current `lang-en-us`
  templates ("Taken.", "Dropped.", "You put on the velvet cloak.",
  "You put the velvet cloak on the brass hook.", "It's pitch dark, and you
  can't see a thing."). If platform text changes, the gate legitimately
  breaks — that is the gate doing its job (behavior parity includes prose).

## Runner notes

- Run standalone (no `--chain`): each file assumes a fresh game start
  (player in the Foyer, wearing the cloak, message intact).
- The bundle does not derive the story from the transcript path — pass it
  explicitly: `node dist/cli/sharpee.js --test --story stories/cloak-of-darkness
  stories/cloak-of-darkness/tests/transcripts/*.transcript`
  (exact wiring is the Phase 6 checkpoint).
- The suite is expected to FAIL until Phase 6 — nothing interprets
  `cloak.story` yet. It exists first so every phase is graded against a
  fixed target.

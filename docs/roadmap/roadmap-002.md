# 002 — The character model in Chord

**Status**: SHIPPED — the Chord surface landed in Sharpee 5.1.0 / Chord 3.3.0, 2026-08-18
**Built?**: yes — the zero-consumer state that prompted ADR-310 is over. `@sharpee/character` is consumed by `chord` (`ast.ts`, `ir.ts`), `stdlib` (`npc/npc-service.ts`), the umbrella, and six `story-loader` modules (`loader`, `evaluator`, `runtime/statements`, `runtime/dialogue`, `runtime/topic-tables`, `runtime/conversation-threads`); the Chord surface is `define manner`, `define greetings`, `define exchange`, `define initiative` and `define conversation`, and four stories use it (verified 2026-09-11)
**Created**: 2026-08-11
**Target date**: shipped 2026-08-18
**Target Sharpee version**: 5.1.0 (shipped)
**Target Chord version**: 3.3.0 (shipped)
**Traces to**: ADR-310 (amended 2026-08-14, ACCEPTED 2026-08-15) · ADR-318 (the normative layer) · ADR-320 (conversation, eleven phases) · ADR-329 (the acting statement, which gave goal steps a real execution path) · builds on ADR-141, ADR-142, ADR-144, ADR-145, ADR-146, ADR-210, ADR-222, ADR-239 · prior art in [`docs/work/archive/adr-310/prior-art.md`](../work/archive/adr-310/prior-art.md) · consumed by [003](./roadmap-003.md)

---

## What it is

Giving Chord authors a way to write characters — words the author writes, numbers the
runtime owns. `@sharpee/character` was designed and built across four days in April 2026
(ADRs 141–146) and works, but an audit found it shipping with **zero consumers**. ADR-310 is
the response: what the Chord surface over it should be.

The scope widened on David's ruling that goals, influence, and information propagation are
the point rather than the deferrable part.

## Where it stands

**Shipped.** ADR-310 was accepted on 2026-08-15 with all eight open questions resolved — 6 by
D12 and 8 by D5 in the original session, then 2 by D14, 4 by D15 and 7 by D16 in the
2026-08-14 amendment, which folded in a prior-art review covering Emily Short's *IF Theory
Reader* chapter, Ryan & Mateas on *Talk of the Town*, McCoy et al. on Comme il Faut, Eve on
TADS 3 conversation, and Versu via Short's own account; then 1 by D18, naming thealderman as
the smallest story that proves it. That story exists in Chord.

ADR-318 added the normative layer — what a character will *not* do — and ADR-320 built
conversation on top across eleven phases: manner and greetings, exchanges and initiative,
conversation threads, NPC-to-NPC scenes with earshot derived from spatial sound, player
intrusion into a scene in progress, trait-level conversation memory, and mid-scene
save/restore. All three shipped in **Sharpee 5.1.0 / Chord 3.3.0** on 2026-08-18. ADR-329's
acting statement followed in 5.3.0, giving a goal step a real validated action to perform
rather than a bespoke mutation.

The scope that widened on David's ruling — goals, influence and information propagation as
the point rather than the deferrable part — landed with the rest.

**What this entry does not claim.** The 2026-09-11 pass that marked this SHIPPED verified the
surface, its consumers and its use in the corpus; it did not audit ADR-310 decision by
decision against the code. A decision-level reconciliation is worth doing before anything
downstream treats every clause of the ADR as built.

ADR-319 (storylines) remains DRAFT and is a separate item, not a remainder of this one.

## Why it matters beyond itself

Item [003](./roadmap-003.md) consumes it and is not implementable ahead of it. The argument
there is that a visual novel's entire visual grammar is a character's interior state made
visible — so the character model is the thing the visual novel client renders.

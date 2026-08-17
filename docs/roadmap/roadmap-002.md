# 002 — The character model in Chord

**Status**: DRAFT
**Built?**: partial — `@sharpee/character` exists and passes 301 tests across 19 files, but had zero consumers when ADR-310 was written; the Chord surface over it does not exist
**Created**: 2026-08-11
**Target date**: TBD
**Target Sharpee version**: TBD
**Target Chord version**: TBD
**Traces to**: ADR-310 (amended 2026-08-14) · builds on ADR-141, ADR-142, ADR-144, ADR-145, ADR-146, ADR-210, ADR-222, ADR-239 · prior art in [`docs/work/archive/adr-310/prior-art.md`](../work/archive/adr-310/prior-art.md) · consumed by [003](./roadmap-003.md)

---

## What it is

Giving Chord authors a way to write characters — words the author writes, numbers the
runtime owns. `@sharpee/character` was designed and built across four days in April 2026
(ADRs 141–146) and works, but an audit found it shipping with **zero consumers**. ADR-310 is
the response: what the Chord surface over it should be.

The scope widened on David's ruling that goals, influence, and information propagation are
the point rather than the deferrable part.

## Where it stands

DRAFT with three open questions remaining (1, 3, and 5). Five have been resolved — 6 by D12
and 8 by D5 in the original session, then 2 by D14, 4 by D15, and 7 by D16 in the 2026-08-14
amendment, which folded in a prior-art review covering Emily Short's *IF Theory Reader*
chapter, Ryan & Mateas on *Talk of the Town*, McCoy et al. on Comme il Faut, Eve on TADS 3
conversation, and Versu via Short's own account.

**No implementation is authorized by the ADR.** A D14 precedence gap was also flagged as
blocking implementation.

## Why it matters beyond itself

Item [003](./roadmap-003.md) consumes it and is not implementable ahead of it. The argument
there is that a visual novel's entire visual grammar is a character's interior state made
visible — so the character model is the thing the visual novel client renders.

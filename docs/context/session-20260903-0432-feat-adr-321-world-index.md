# Session Summary: 2026-09-03 - feat/adr-321-world-index

## Status: In Progress

## Goals
- Work through `docs/work/publish-readiness/plan.md` phase by phase, committing between phases (David, 2026-09-03 04:30 CDT: "you can work through phases and commit in between - I'm going to bed").
- Phase 1: draft the three gating ADR amendments and record the three design rulings.

## Completed
- Session start: recap presented, pre-session-audit relayed verbatim, core concepts read, profile fresh (2026-08-30), gate cleared.
- **Phase 1 DONE (drafted; acceptance is David's)**:
  - ADR-118 Amendment 1 — every binding consulted, own block first then composed traits in composition order; gated-out clauses fall through. Open question: own-block-first vs traits-first.
  - ADR-267 Amendment 1 — `only while <condition>` scoped grammar lines; refusal fall-through rejected. ADR-087 and ADR-231 amended by reference. Open question: spelling.
  - ADR-320 Amendment D2a — entity topics unscoped; validator's quiet resolution widens to the world. No open questions.
  - Rulings for #312 (actor in parse-time bases, grammar-scope-resolver), #313 (`open-inventory` trait adjective), #314 (two tool-less shapes; re-wear is the worn invariant in `moveEntity`, landed under P-10) recorded in the plan's Phase 1 outcome and folded into Phases 2, 5, 7 entry states.

## Key Decisions
- Refusal fall-through rejected for P-21: every `refuse when` is an authored refusal, so fall-through needs a "does not apply" marker, and a marker evaluated before the parse chooses the action is a scoped grammar line.
- Entity topics are subjects, not objects: scope is irrelevant to whether a topic row serves.
- Worn is an invariant of location: an item is worn only while directly in its wearer; enforced at `WorldModel.moveEntity`.

## Open Items
- David: accept or amend the three DRAFT amendments (ADR-118 A1, ADR-267 A1, ADR-320 D2a); two carry one open question each — rule 11a asks whether to start the interview.
- Carried: the every-turn `while <npc> knows <topic>` tick-order audit (Phase 6).

## Files Modified
- `docs/architecture/adrs/adr-118-stdlib-action-interceptors.md` — Amendment 1 (DRAFT)
- `docs/architecture/adrs/adr-267-chord-grammar-pattern-constructs.md` — Amendment 1 (DRAFT)
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` — Amendment D2a (DRAFT)
- `docs/architecture/adrs/adr-087-action-centric-grammar.md` — amendment note by reference
- `docs/architecture/adrs/adr-231-player-surface-contract-rulings.md` — Amendment 2 by reference
- `docs/work/publish-readiness/plan.md` — Phase 1 outcome + DONE; Phase 2 CURRENT; Phases 2/5/7 entry states carry the rulings
- `docs/context/session-20260903-0432-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-09-03 04:32 CDT (session effb6f)

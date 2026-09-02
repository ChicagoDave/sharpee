# Session Summary: 2026-08-31 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Continue the Secret Letter port (David: play-testing and TODOs wait).
- Phase 7 (P-6a): study the source's quip-tree machinery and Chapter 1's
  built conversations, then draft the quip-tree → beat-thread rewrite
  pattern including per-NPC perception.

## Completed
- Phase 7 started (plan.md status flipped; Phase 6 stays CURRENT for its
  David-paced tail). The written half of the deliverable is drafted:
  `docs/work/secret-letter-port/rewrite-pattern.md` — mapping rules M1-M10,
  the two-layer perception mechanism (P1/P2/P3), the per-tree disposition
  discipline. Grounded in the Quips extension source, full reads of the
  DS/BO/TE/CB trees, and `ides-of-march.story`'s shipped
  `define conversation`/`define exchange` syntax.

## Key Decisions
- David (2026-08-31): the rewrite is capability-first — "one of the core
  reasons for porting SL was to enable the more complex capabilities of the
  new conversation system." The first draft's topics-as-default was wrong:
  the change document's Teisha ruling is the occasion split only; the
  menus→topics sentence was a build comment, not a ruling.
- David (2026-08-31), RULED port-wide, recorded as the change document's
  first standing ruling: "every topic-based interaction with an NPC needs
  to be remapped to open dialogue" — scope "every NPC." No `define topics`
  on NPCs anywhere in this story; subject threads + hub exchanges carry the
  order-free residue; Teisha's topics block and the ST stallkeeper tree are
  rebuild scope.

## Open Items
- David's answers to OQ-1..OQ-5 in `rewrite-pattern.md` §7 (demonstration
  tree — recommendation Sandler + Bobby together; Chapter 2 change-document
  gate; perception confirmation; Chapter 1 rebuild timing; the answer input
  surface); the demonstration conversion follows them.
- Two platform seams reported in `rewrite-pattern.md` §6, discuss before
  filing: no bare-answer input surface for open exchanges (`ask kemp about
  yes` is the only path today; GH #317 adjacent), and whether the
  unclaimed-input fallback inside a scene is authorable per-NPC.

## Files Modified
- `docs/work/secret-letter-port/rewrite-pattern.md` — new (Phase 7 draft,
  reworked twice on David's corrections)
- `docs/work/secret-letter-port/change-document.md` — new "Standing rulings
  (port-wide)" section: conversation is open dialogue, never topic tables
- `docs/work/secret-letter-port/plan.md` — Phase 7 CURRENT + progress notes
- `docs/context/session-20260831-2110-feat-adr-321-world-index.md` (this file)

## Notes
- Session started: 2026-08-31 ~21:10 (session bfb2ce). Docs-only session —
  no `.chord`/`.ts` touched, no tests to run; rule 15 out of scope.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: OQ-1..OQ-5 answers are David-paced; then the
  Chapter 2 change-document pass and the demonstration conversion
- **Rollback Safety**: safe to revert — documentation only

## Dependency/Prerequisite Check

- **Prerequisites met**: the landed corpus (Quips extension, story.ni), the
  shipped ADR-320 surface (verified in character API + dialogue-selector),
  ides-of-march as the syntax existence proof.
- **Prerequisites discovered**: the answer input surface and the
  unclaimed-input fallback (pattern doc §6) — platform discussion before
  the demonstration ships its player surface.

## Architectural Decisions

- None platform-side. Story-side standing ruling recorded (change document):
  conversation is open dialogue, never topic tables — every NPC.

## Mutation Audit

- Files with state-changing logic modified: none — documentation only.
- Tests verify actual state mutations: N/A (no code changed; tree last
  green at 562/953, 2026-08-31, unchanged).

## Recurrence Check

- Similar to past issue? YES, deliberately caught this time: generalizing a
  pragmatic interim into design intent (the topics-as-default draft) — the
  standing "pragmatic interims aren't the design intent" feedback applied;
  corrected in-session by David before any build work ran.

## Test Coverage Delta

- Tests added: none (no code).
- Tests passing before/after: 562 cards / 953 assertions, unchanged.

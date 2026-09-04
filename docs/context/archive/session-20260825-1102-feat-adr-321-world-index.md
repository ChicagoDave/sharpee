# Session Summary: 2026-08-25 - feat/adr-321-world-index

## Status: In Progress

## Goals
- Plan the ADR-327 "Explicit references" full reform (session-planner → `docs/work/adr-327-explicit-references/plan.md`)

## Completed
- Session Start: recap of session 8ae644 presented; pre-session-audit relayed (type check clean; Phase 3 `**Status**` field stale; two plans lack `**Plan Status**`; 7 stranded event logs — ignorable); profile fresh (2026-08-23); gate cleared; `docs/core-concepts/README.md` read in full.
- Housekeeping: `docs/work/backlog-tier1-2-platform/plan.md:62` Phase 3 `**Status**` PENDING → DONE (matches its Status note, commit `f9e8fe3a`, closed #311).
- Scoped the ADR-327 migration surface for the planner (grep 2026-08-25): 45 files / 172 `on|after <gerund> it` heads; 18 bare heads to classify; 218 syntactic `it`/`its`; 61 files with `create the player` (17 in stories, rest package fixtures); 83 package test files with `it` heads; 10 docs/book + docs/reference files; IDE tests in `tools/ide/web/testing-surface/tests/` and `tools/ide/SharpeeIDETests/`.
- Verified ADR-328 D2's programmatic `(action, actorId)` execution entry does not exist in `packages/engine` yet — ADR-327 D7's non-player firing (Acceptance 2) is sequenced behind ADR-328's own plan.

- session-planner wrote `docs/work/adr-327-explicit-references/plan.md` — 6 phases (chord grammar → loader player-path match → D9/D10 player role → corpus sweep → paper trail → D7 non-player firing, blocked on ADR-328's own plan). Pointer left untouched by the planner pending rule 18b.
- Rule 18b: David ruled the backlog plan **still live** — stamped `**Superseded by**` on `docs/work/backlog-tier1-2-platform/plan.md` (Phases 4–8 untouched, resumable at Phase 4); `.current-plan` → `docs/work/adr-327-explicit-references/plan.md`.
- Phase 1 design pass (no `packages/chord` edits): read `parseOnClause` (`parser.ts:5322-5411`), `OnClause`/`IROnClause` binding enum (`ast.ts:1251`, `ir.ts:854`), `when … moves` mover precedent (`parser.ts:1375`, `analyzer.ts:6754`), `resolveRefValue` `it` lowering (`analyzer.ts:6605`), `buildTrait` scope (`analyzer.ts:2504`), `checkGoingBinding` (`analyzer.ts:5583`), scene-head parse paths (D4 untouched by construction), version pin (`tests/language-version.test.ts:58-60`). Shape doc written: `docs/work/adr-327-explicit-references/phase-1-grammar-shape.md`.

## Key Decisions
- Backlog plan disposition: still live (David, 2026-08-25).
- D7 tradeoff: plan recommends (a) gate Phase 6 behind a separate ADR-328 plan — awaiting David's ruling.
- Phase 1 shape has four open questions for David (bare head beyond `going`; role-head tail; analyzer vs parser for body-`it` errors; `'it'`→`'object'` IR rename) plus one flag (no "anyone" spelling under ADR-328).

## Open Items
- David's rulings on the Phase 1 shape doc questions Q1–Q4, then "go" to edit `packages/chord`.
- Stray `1` file at repo root — David's call to delete.

## Files Modified
- `docs/work/backlog-tier1-2-platform/plan.md` — Phase 3 Status field flipped to DONE; `**Superseded by**` stamp
- `docs/context/.current-plan` — now names the ADR-327 plan
- `docs/work/adr-327-explicit-references/plan.md` — new (session-planner)
- `docs/work/adr-327-explicit-references/phase-1-grammar-shape.md` — new
- `docs/context/session-20260825-1102-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-08-25 11:02 CDT (session e4250f)

# Session Summary: 2026-08-29 - feat/adr-321-world-index

## Status: In Progress (Phase 9c DONE, uncommitted; 9d CURRENT)

## Goals
- ADR-328 Phase 9c: goal steps (`acquire`/`give`/`drop`/`move to`) execute through the engine's execution entry as the NPC; `applyStepMutation` retires (ADR-329 D6); ADR-310 D8 amendment stamp.

## Completed
- Session start: recap, pre-session audit (clean; 9a/9b already committed as 728db25f), core-concepts read, gate cleared.
- Child artifact presented and approved by David ("sounds good"): step→action mapping (move→going by exit direction, take→taking, give→giving, drop→dropping); refusal = failed mutation (no advance, no announce, retry next tick, each witnessed refusal narrates); real path in story-loader on a real engine; character harnesses get a declared scaffolding entry.
- **Phase 9c DONE** (03:04 CDT): `packages/character/src/tick-phases.ts` — `TickContext.act: ExecutionEntry` (required; the engine always supplies it via `NpcTickContext`), `performStep`/`stepAction`/`exitDirectionTo` replace the deleted `applyStepMutation` (no `moveEntity` left in the file). Tests: real path `story-loader/tests/adr-329-goal-steps.test.ts` 5 passing on `GameEngine.executeTurn`; scaffolding `character/tests/tick-phases/goal-world-mutations.test.ts` 11 (new `scaffold-entry.ts`; 11 other harnesses get `unexpectedAct`/`scaffoldEntry`). Counts: character 574 passing (49 files); story-loader 986 passing (93 files); root tsc clean; `./repokit build dungeo --skip character`; corpus identical to baseline — ides 39 cards, fernhill 36, secret-letter 131 passing / 29 failing (pre-existing), Dungeo chain 952 passing / 17. mutation-verification: clean.
- Paper trail: ADR-329 D6 landing note; ADR-310 D8 amendment stamp; plan.md 9c DONE / 9d CURRENT; GH #321 filed for the generalized goal step.

## Key Decisions
- Refused goal-step act retries next tick and narrates each witnessed refusal (loud, not hidden) — David approved.
- Generalized goal step (any acting-statement shape as a step; story verbs like `conjure the key into the Vault`) is a follow-on under ADR-329 (GH #321), NOT folded into 9c. David's prompt: an actor with a magical ability to place an item in a known location. Today: `define action` + acting statement in a `when` body; not expressible in a `goal` block.

## Open Items
- Phase 9d (CURRENT): corpus already green here; remaining are the paper trail — EBNF row, `chord-grammar-changes.md` entry, `CHORD_LANGUAGE_VERSION` 4.0.0 → 4.1.0, reference surfaces, ADR-329/328 Acceptance stamps.
- Observed, unchanged: `refuse <phrase>` fixture phrase renders blank in the 9b and 9c suites (stderr only, pre-existing); `drop <item> in <place>` — `DropStep.location` is ignored by the evaluator.
- Carried: ADR-327 AC-5 real-path test; `@sharpee/plugin-npc` npm deprecation (David); tutorials/familyzoo re-sync (#224).

## Files Modified
- `packages/character/src/tick-phases.ts` — D6 landing
- `packages/character/tests/tick-phases/scaffold-entry.ts` — new (scaffolding entry)
- `packages/character/tests/tick-phases/*.test.ts`, `tests/act-detection/witness-statement.test.ts` — `act` on every harness context
- `packages/story-loader/tests/adr-329-goal-steps.test.ts` — new (real path)
- `docs/architecture/adrs/adr-329-chord-acting-statement.md` — D6 landing note
- `docs/architecture/adrs/adr-310-character-model-in-chord.md` — D8 amendment
- `docs/work/adr-328-actors-platform-concept/plan.md` — 9c DONE, 9d CURRENT
- `packages/sharpee/docs/genai-api/{character,index}.md`, `stories/dungeo/src/version.ts` — build regeneration/stamp
- `docs/context/session-20260829-0234-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-08-29 02:34 CDT

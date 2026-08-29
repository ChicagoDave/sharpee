# Session Summary: 2026-08-28 - feat/adr-321-world-index

## Status: COMPLETE (Phase 6c)

## Goals
- ADR-328 Phase 6c: rewrite the book's chapter 20 (v2.0.0) and its code snippets onto the NPC pipeline (`context.act`/`narrate`, `engine.getNpcService()`); resolve what the phase owes for the v1.5.0 edition and `tutorials/familyzoo`.

## Completed
- Session start: recap, pre-session audit (clean), core-concepts read, gate cleared.
- Survey: chapter 20 + 3 snippets per edition; `tutorials/familyzoo/v2.0.0` has 163 pre-existing type errors against the 5.1.1 workspace (`isDark`, `withPriority`, `author`, `isAlive`, `chance(0.5)`), ~15 of them NPC-surface — it is a 2.0-pinned snapshot, not a lagging copy of the live book.
- Live-platform check (bundle, `stories/family-zoo-tutorial`, `--seed 7`): "The zookeeper leaves to the east." and "The parrot ruffles its feathers and eyes you with interest." print verbatim, so the chapter's quoted output and `npcs.transcript` assertions hold.
- Rewrote `docs/book/v2.0.0/parts/part-6/20-non-player-characters.md`: three parts (trait / behavior / engine-owned actor phase), void hooks, `narrate`/`act` table, `ActSlots`, an Under-the-Hood box quoting the patrol's real `context.act(IFActions.GOING, …)`, `engine.getNpcService()` registration; dropped `isAlive`/`isConscious` (not on `INpcData` since ADR-226).

## Key Decisions
- Book v1.5.0 stays frozen: it pins published `^1.5.0` packages that ship `plugin-npc` and lack `definePoint`; rewriting it would break the book's own "compiles against what the reader installs" rule (`docs/book/CLAUDE.md`). Deviates from the plan's 6c addendum, recorded in plan.md.
- `tutorials/familyzoo/{v1.5.0,v2.0.0}` untouched for the same reason (pinned `^1.5.0`/`^2.0.0`, still published with `plugin-npc`); an NPC-only patch would leave v2.0.0 consistent with neither version. Whole-edition re-sync against 5.x is its own item.

- Evidence (23:35–23:38 CDT): `code-snippets/` regenerated (164 snippets; ch20 01–08 incl. `05-createpatrolbehavior.reference.ts`); ch20 author snippets assembled and `tsc --noEmit` against the workspace `@sharpee/*` — exit 0; `./scripts/build-book.sh v2.0.0 html` clean; em-dash grep on the chapter empty; exit-state grep zero hits under `parts`/`code-snippets`.
- Prose corrected against source before finalizing: `canMove` is enforced by `getAvailableExits()` (`npc-service.ts:422`), not by `going`; `taking`'s message is a bare "Taken." with no actor slot, so the chapter describes `act`'s witnessing by analogy to the verified patrol rather than quoting a rendering.
- plan.md: Phase 6c DONE with evidence and the scope ruling; issue #224 commented with the plugin-npc delta for the tutorial editions.

## Open Items
- Phases 8/9 (Chord acting-surface ADR-329 and its implementation) remain PENDING on David's availability for the interview.
- Carried forward: ADR-327 AC-5 real-path test; `@sharpee/plugin-npc` npm deprecation (David's manual step); tutorials/familyzoo whole-edition re-sync (#224).
- Observed, not acted on: book v2.0.0 ch13 still uses `isDark: false` and ch14/ch17 use `withPriority(150)`, both absent at HEAD (same drift class as #224, outside this phase).

## Files Modified
- `docs/book/v2.0.0/parts/part-6/20-non-player-characters.md` — rewritten
- `docs/book/v2.0.0/code-snippets/CATALOG.md`, `code-snippets/ch20-non-player-characters/*` — regenerated (05–07 old files replaced by 05–08)
- `docs/work/adr-328-actors-platform-concept/plan.md` — Phase 6c DONE + scope ruling
- `docs/context/session-20260828-2334-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-08-28 23:34 CDT

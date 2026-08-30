# Session Summary: 2026-08-28 - feat/adr-321-world-index

## Status: In Progress (Phase 6c COMPLETE, committed c31ab561; Phase 8 DONE — ADR-329 ACCEPTED; Phase 9a + 9b DONE — the acting statement compiles and executes; all uncommitted)

## Goals
- ADR-328 Phase 6c: rewrite the book's chapter 20 (v2.0.0) and its code snippets onto the NPC pipeline (`context.act`/`narrate`, `engine.getNpcService()`); resolve what the phase owes for the v1.5.0 edition and `tutorials/familyzoo`.

## Completed
- Session start: recap, pre-session audit (clean), core-concepts read, gate cleared.
- Survey: chapter 20 + 3 snippets per edition; `tutorials/familyzoo/v2.0.0` has 163 pre-existing type errors against the 5.1.1 workspace (`isDark`, `withPriority`, `author`, `isAlive`, `chance(0.5)`), ~15 of them NPC-surface — it is a 2.0-pinned snapshot, not a lagging copy of the live book.
- Live-platform check (bundle, `stories/family-zoo-tutorial`, `--seed 7`): "The zookeeper leaves to the east." and "The parrot ruffles its feathers and eyes you with interest." print verbatim, so the chapter's quoted output and `npcs.transcript` assertions hold.
- Rewrote `docs/book/v2.0.0/parts/part-6/20-non-player-characters.md`: three parts (trait / behavior / engine-owned actor phase), void hooks, `narrate`/`act` table, `ActSlots`, an Under-the-Hood box quoting the patrol's real `context.act(IFActions.GOING, …)`, `engine.getNpcService()` registration; dropped `isAlive`/`isConscious` (not on `INpcData` since ADR-226).

## Key Decisions
- **ADR-329 drafted** (`docs/architecture/adrs/adr-329-chord-acting-statement.md`, DRAFT): the Chord acting statement `<actor> <verb> <object>` — one action, now, as that character, through `executeAsActor`; verb matched against the manifest's grammar shapes (D2); legal in `after`/`when`/`on every turn`/conversation rows, not in `on` intercept bodies (D3); nested acts splice after the trigger's report, re-entry capped at 8 (D4); refused act performs nothing (D5); goal steps lower onto the same entry and `applyStepMutation` retires (D6, Q-4); `move` unchanged — *move puts; acting does* (D7). Interview 2026-08-28/29: Q-1 a (both inflections), Q-2 a (pipeline refusal narrates; "likely to evolve"), Q-3 b (`the player` excluded — David asked for the adversarial case; the forced-going eject as a second spelling of ADR-326's `move` scene decided it), Q-4 a (goal-step lowering lands here). `adr-review` 19/19 after two folds; **ACCEPTED** by David 2026-08-29. ADR-328 D7 stamped with the child; ADR-328 Acceptance item 2 stamped satisfied from the plan's Phase 6a/6b evidence.
- Book v1.5.0 stays frozen: it pins published `^1.5.0` packages that ship `plugin-npc` and lack `definePoint`; rewriting it would break the book's own "compiles against what the reader installs" rule (`docs/book/CLAUDE.md`). Deviates from the plan's 6c addendum, recorded in plan.md.
- `tutorials/familyzoo/{v1.5.0,v2.0.0}` untouched for the same reason (pinned `^1.5.0`/`^2.0.0`, still published with `plugin-npc`); an NPC-only patch would leave v2.0.0 consistent with neither version. Whole-edition re-sync against 5.x is its own item.

- Evidence (23:35–23:38 CDT): `code-snippets/` regenerated (164 snippets; ch20 01–08 incl. `05-createpatrolbehavior.reference.ts`); ch20 author snippets assembled and `tsc --noEmit` against the workspace `@sharpee/*` — exit 0; `./scripts/build-book.sh v2.0.0 html` clean; em-dash grep on the chapter empty; exit-state grep zero hits under `parts`/`code-snippets`.
- Prose corrected against source before finalizing: `canMove` is enforced by `getAvailableExits()` (`npc-service.ts:422`), not by `going`; `taking`'s message is a bare "Taken." with no actor slot, so the chapter describes `act`'s witnessing by analogy to the verified patrol rather than quoting a rendering.
- plan.md: Phase 6c DONE with evidence and the scope ruling; issue #224 commented with the plugin-npc delta for the tutorial editions.

- **Phase 9 re-planned** (session-planner, plan-review TENSIONS ONLY): 9a compile / 9b execute / 9c goal steps / 9d corpus + paper trail.
- **Phase 9a DONE** (00:47 CDT): `ast.ts` `ActStmt`, `ir.ts` `act` kind, `parser.ts` admission (`tryParseActStatement`, manifest verb lexicon + structural scan of the file's own grammar lines; every-turn bodies handed as body kind `every-turn`), `analyzer.ts` split/match/gate (`resolveActStatement`, `matchActShape`, `expandPatternShapes`, `matchShapeWords`; errors `act-in-intercept`, `act-player-actor`, `act-actor`, `act-unknown-verb`, `act-slot-shape`). `act-statement.test.ts` 18; chord 1082/71 files; chord + story-loader `tsc` clean. EBNF row deferred to 9d with the bump (hash pin).

- **Phase 9b DONE** (01:55 CDT): `GameEngine.executeAsActor` public; loader wiring (`setExecutionEntry`, `chord.acted-events` plugin @150, `chord.act-drain` daemon); runtime `case 'act'` + `performAct` (story-first action id, slot roles, player-role gate, cap 8, events buffered — never spliced into an action's/handler's return, which would double-apply). Two platform gaps found and fixed with David's go-ahead: NPC `carries`/`wears` never placed (loader pass 2 now places every entity's); story-handler throws swallowed by `EventProcessor` (`console.error`) → now `ProcessedEvents.failed` → executor `command.failed`. Real path 9/9; rule-15 gaps closed with three tests (event-processor `handler-failure` 3 — which caught the re-entrant-drain defect, fixed by threading failures as return data; executor failed-reaction case; loader NPC carries/wears placement). Final: loader 981; engine 680; event-processor 27; chain 952/17; fernhill 36, ides 39; cloak 2 / zoo 1 / secret-letter 29 failing cards identical to baseline worktree `c31ab561` (pre-existing; `yourself` = #319, commented). Baseline worktree left at the scratchpad path.

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

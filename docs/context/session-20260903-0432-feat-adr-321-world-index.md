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

- **Phase 2 DONE (commit `0e5697f4` closed Phase 1)** — all six fixes landed with tests; package suites green (world-model 1504, stdlib 1666, lang-en-us 450, chord 1125 after the EBNF re-pin and the optional-`oneWay` AST, story-loader 1039 after the daemon-roster expectation gained `chord.act-drain`); `./repokit build dungeo` clean; Dungeo chain 952 passing (17 transcripts); Secret Letter 563 cards / 957 assertions with three new pins; Fernhill 36 cards; Ides of March 39 cards; #327, #326, #331, #329, #334, #325 closed; proposal P-1/P-2/P-3/P-9/P-10/P-12 DONE; mutation-verification found nothing notable (all GREEN).
  - P-10 (#334): `WorldModel.moveEntity` clears worn/wornBy when a worn item leaves its location (the ruling-6 invariant).
  - P-12 (#325): `examined_self` gains `{slot:detail}`.
  - P-2 (#326): going's arrival report applies the initial description on the first visit (replace semantics, as the site documents — the proposal's "the standard description follows it" is not the documented behaviour; flagged for David).
  - P-1 (#327): `, one-way` wired end to end (`ExitDecl.oneWay?` → `IRExit.oneWay?` → `connectRooms(..., { oneWay })`); EBNF production + re-pin under 3.5.0; grammar-changes row; sharpee.net exits page corrected (it claimed exits were one-way as written); Secret Letter's `northeast is blocked` workaround retired and the landing's exit written `, one-way`; the `ne` pin now expects "You can't go that way."
  - P-3 (#331): `describeArrival` runs looking as the player after an outermost authorial move; act flush/drain registered for any story with a `move`; ADR-326 D5 addendum.
  - P-9 (#329): does not reproduce at HEAD — fixed incidentally 2026-09-02 by commit 07e1949d's pre-move sourcing (`const at = this.placeOf(...)` captured before the arm runs); pinned by `offstage-phrase-renders.test.ts` (offstage and remove variants).
  - Harness: `tests/helpers/boot-turns.ts` (real engine, per-turn events + `text:output` text; extends parser and language before `setStory`, bootstrap's order).

- **Phase 3 DONE (commit `10eae625` closed Phase 2)** — six analyzer/parser/binding fixes: P-4 `resolvePossessiveAsName` (#336); P-5 `when` as a `with` value stop + trailing `with` after the statement `when` (#335); P-6 the `bare` binder hint (#337); P-13 `Span.file` in inline kill keys (#324); P-14 closed as built (`analysis.phrase-in-phrase`, #286; resolving is GH #303 item 2); P-15 `canonicalDirectionWord` maps the parser's Direction constant back to the declared canonical (#285). Pins: chord `publish-readiness-phase3.test.ts` (7), lang-en-us `bare-hint.test.ts` (2), story-loader `publish-readiness-phase3.test.ts` (2, real path). Suites: chord 1132, story-loader 1042, lang-en-us 452; `./repokit build dungeo` clean; Dungeo chain 952; Secret Letter 563 cards (peering.chord back on compass canonicals; #336/#335 notes refreshed); Fernhill 36; Ides 39. Grammar-changes row. No side-effect functions touched (rule 15 does not fire).

## Key Decisions
- Refusal fall-through rejected for P-21: every `refuse when` is an authored refusal, so fall-through needs a "does not apply" marker, and a marker evaluated before the parse chooses the action is a scoped grammar line.
- Entity topics are subjects, not objects: scope is irrelevant to whether a topic row serves.
- Worn is an invariant of location: an item is worn only while directly in its wearer; enforced at `WorldModel.moveEntity`.

## Open Items
- David: accept or amend the three DRAFT amendments (ADR-118 A1, ADR-267 A1, ADR-320 D2a); two carry one open question each — rule 11a asks whether to start the interview.
- Carried: the every-turn `while <npc> knows <topic>` tick-order audit (Phase 6).

## Files Modified
- Phase 2 platform: `packages/world-model/src/world/{WorldModel,AuthorModel}.ts`, `packages/world-model/src/world/index.ts`, `packages/stdlib/src/actions/standard/going/going.ts`, `packages/story-loader/src/{runtime,loader}.ts`, `packages/chord/src/{parser,ast,ir,analyzer}.ts`, `packages/chord/chord.ebnf`, `packages/lang-en-us/src/actions/examining.ts`
- Phase 2 tests: `packages/world-model/tests/unit/world/{move-entity-worn,connect-rooms-one-way}.test.ts`, `packages/stdlib/tests/unit/actions/going-first-visit-description.test.ts`, `packages/lang-en-us/tests/examined-self-detail.test.ts`, `packages/chord/tests/{doors,language-version}.test.ts`, `packages/story-loader/tests/{one-way-exit,authorial-move-describes,first-time-on-arrival,examine-self-detail,offstage-phrase-renders,scheduler}.test.ts`, `packages/story-loader/tests/helpers/boot-turns.ts`
- Phase 2 docs/content: `docs/architecture/chord-grammar-changes.md` (row), `docs/architecture/adrs/adr-326-adjacent-room-place-expression.md` (D5 addendum), `website/src/app/chord/guide/world/exits-and-blocked-exits/content.mdx`, `branch-stories/secret-letter/{aerial-runway,grubbers-market}.chord`, `branch-stories/secret-letter/secret-letter.tests.json`, `docs/proposals/publish-readiness-defects.md` (six items DONE)
- Phase 3 platform: `packages/chord/src/{analyzer,parser}.ts`, `packages/lang-en-us/src/parser/parse-phrase-template.ts`, `packages/story-loader/src/runtime.ts`
- Phase 3 tests: `packages/chord/tests/publish-readiness-phase3.test.ts`, `packages/lang-en-us/tests/bare-hint.test.ts`, `packages/story-loader/tests/publish-readiness-phase3.test.ts`
- Phase 3 docs/content: `docs/architecture/chord-grammar-changes.md` (row), `branch-stories/secret-letter/{peering,backdrops,wares,market-scenery}.chord`, `docs/proposals/publish-readiness-defects.md` (six items DONE)
- `docs/architecture/adrs/adr-118-stdlib-action-interceptors.md` — Amendment 1 (DRAFT)
- `docs/architecture/adrs/adr-267-chord-grammar-pattern-constructs.md` — Amendment 1 (DRAFT)
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` — Amendment D2a (DRAFT)
- `docs/architecture/adrs/adr-087-action-centric-grammar.md` — amendment note by reference
- `docs/architecture/adrs/adr-231-player-surface-contract-rulings.md` — Amendment 2 by reference
- `docs/work/publish-readiness/plan.md` — Phase 1 outcome + DONE; Phase 2 CURRENT; Phases 2/5/7 entry states carry the rulings
- `docs/context/session-20260903-0432-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-09-03 04:32 CDT (session effb6f)

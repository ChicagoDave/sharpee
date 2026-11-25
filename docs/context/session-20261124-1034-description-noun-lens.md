# Session Summary: 2026-11-24 - description-noun-lens (CST)

## Goals
- Plan GH #836 (a thing answers only to the grammatical number its name and aka words are written in) and run Phase 1 of plan `thing-answers-both-numbers`: baseline, census, ADR-409 decided and accepted, David's go for Phase 2.

## Phase Context
- **Plan**: A thing answers to both grammatical numbers (GH #836) — `docs/work/thing-answers-both-numbers/plan-20261124-thing-answers-both-numbers.md`.
- **Phase executed**: Phase 1 — "Measure the number gap and decide where the other number comes from (ADR-409)" (Medium); flipped DONE by `plan-phase.sh` in-session, and Phase 2 advanced to CURRENT (since 2026-11-24).
- **Tool calls used**: 309 (state file) / 250.
- **Phase outcome**: Ran over budget — the ADR-409 interview went through three designs plus Amendment 1.
- **Demonstrated line**: marked `[reported by session, unverified]` in the plan this write; the event log carries no row for the scullery probe, `adr-index.sh` or `git status` (classes the hooks do not log).

## Completed

### Session start and planning
- pre-session-audit, core concepts read, gate cleared (session 4a60b3).
- session-planner wrote the plan (originally 3 phases); `docs/context/.current-plan` points at it; David said PROCEED on Phase 1.

### Phase 1 — baseline and census (`docs/work/thing-answers-both-numbers/census-20261124.md`)
- Baseline at HEAD [reported by session, unverified, except testing-surface]:
  - Dungeo chain 949 passed; units at `--seed 42` 1715 passed, 10 pre-existing failures (adr-287-fenced-literals, dam-puzzle, flooding, troll-interactions) and 2 seed refusals (pinned to 4242).
  - Test stories at seed 42: ferry 10, lodge 10, orchard 21, quay 1, scullery 2 cards passing; bazaar has no tree.
  - Lens number-form findings: scullery 4, orchard 6.
  - 11 package suites green; 4 repokit `--check`s ok; Relighting `game.js` 1,971,327 bytes.
  - testing-surface 280 passed (evidence: event-log test row "28 passed 280 passed", 2026-11-24T16:38:31Z).
- Census over 195 stories / 5,297 entities: test stories 0 collisions; Dungeo 23 collisions in 5 clusters, 0 predicted moves; lens simulation 0 number-form findings left.
- Filed #842 (`pluralize` turns every final f into ves; `singularize` mirrors it).

### Phase 1 — ADR-409 and the plan rewrite
- ADR-409 drafted (8 open questions), interviewed, reviewed (`adr-review` 17/22 → 22/22) and ACCEPTED (David: "yes"); renamed from `adr-409-a-thing-answers-to-both-numbers.md` to `adr-409-singular-and-plural-forms.md`; `INDEX.md` rebuilt (row reads `OPEN | technical`).
- Amendment 1 (D7, AC-9 to AC-12): Chord Writer surfaces the forms.
- Plan restructured to 5 phases: 2 language + migration + IDE pin, 3 diagnostic fixes, 4 runtime + World Index, 5 lens + close-out. David's go for Phase 2: "proceed"; Phase 2 starts in a new session.

## Key Decisions

### 1. ADR-409 — declared number, compile-time forms (`docs/architecture/adrs/adr-409-singular-and-plural-forms.md`)
The interview went through three designs.
1. Derive both forms at match time — rejected after the census: 1,060 collisions, and English's rules are wrong (#842).
2. Derive nothing; the author writes every form — David: "it's too complicated to ensure success with derived meanings."
3. Final, from David's "some pluralizations are obvious and some are not — can't we differentiate?" and "I don't want to embed an entire dictionary":
   - every Chord thing, person and door is declared `singular` or `plural`;
   - a few suffix rules (plain `s`/`es`/`ies`, drop a final `s`) are lang-en-us locale data, applied by chord at compile time to the name's last word and to aka words;
   - unsafe endings, stopword names and proper names require `plural of <singular>` / `singular of <plural>`;
   - a written form outranks a worked-out one, and the runtime matcher works nothing out;
   - `lemmatize` is deleted (#839);
   - ships as Chord 4.2.0 in Sharpee 5.8.0, a one-time ADR-257 D2 override.

### 2. ADR-409 Amendment 1 (D7) — Chord Writer surfaces the forms
David: "this is an effort to make the IDE v1.0.0 worthy", "a". The IDE pin moves with the grammar; the analyzer's refusal carries a generic `Diagnostic.fix` that devkit fills from lang-en-us; both heads offer the fix and a fix-all; the World Index shows each thing's forms and origin; the lens card offers the edit.

## Next Phase
- **Phase 2**: "Chord 4.2.0 declares singular or plural, works out the plain forms, and the in-repo stories migrate" — `FormRules` in lang-en-us `data/words.ts` carried by `./repokit manifest`; chord's `singular`/`plural of`/`singular of`, AC-1 refusals and `IREntity.forms`; `CHORD_LANGUAGE_VERSION` 4.2.0; both IDE heads to 4.2.0 (AC-9); every in-repo story outside the tutorial editions migrated.
- **Tier**: Large (~400 tool-call budget in the plan).
- **Entry state**: Phase 1 DONE, ADR-409 ACCEPTED, David's go recorded ("proceed"), census baseline in hand; start in a new session. Phase 2 touches `packages/` under David's recorded go.

## Open Items

### Short Term
- 836: A thing answers only to the grammatical number its name and aka words are written in (candles but not candle)
- 839: lang-en-us: lemmatize is a stemmer with no caller (candles → candl, shed → sh)

### Long Term
- 842: lang-en-us: pluralize turns every final f into ves (staff → stafves, roof → rooves), and singularize mirrors it

## Files Modified

**Plan and records** (5 files):
- `docs/work/thing-answers-both-numbers/plan-20261124-thing-answers-both-numbers.md` - new; Phase 1 DONE, Phase 2 CURRENT, 5 phases
- `docs/work/thing-answers-both-numbers/census-20261124.md` - new; baseline and census
- `docs/architecture/adrs/adr-409-singular-and-plural-forms.md` - new; ACCEPTED, plus Amendment 1
- `docs/architecture/adrs/INDEX.md` - rebuilt by `adr-index.sh`
- `docs/context/.current-plan` - new; points at the plan

## Notes

**Session duration**: ~8.5 hours (09:53 to 18:23 CST).

**Approach**: Measure first (baseline, scratchpad census over built `numberForms`), then decide through the open-questions interview; no source edits, so rule 15 did not fire.

- Docs-only: `git status --short packages stories test-stories tools tutorials` printed nothing at 18:22 CST [reported by session, unverified]; the build's `BUILD_DATE` stamp in `stories/dungeo/src/version.ts` (in the state file's `files`) was restored.
- The previous session's file `docs/context/session-20261124-0040-description-noun-lens.md` is also modified in the working tree.
- Filename note: the state file's `summaryPrefix` is `20261124-0953`, but this session's summary was started as `session-20261124-1034-…` and is revised in place rather than duplicated.
- #836 and #839 got comments recording ADR-409's decision; #839 closes in Phase 4, #842 stays separate.

---

## Session Metadata

- **Session**: 4a60b3
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: none before this write — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261124-1034-description-noun-lens.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: branch at 4560c4811, #836 open, David's go for probes and builds.
- **Prerequisites discovered**: #842 (English number functions' f→ves defect), which the worked-out forms must not inherit.

## Architectural Decisions

- ADR-409: a thing declares its number; plain forms worked out at compile time from lang-en-us suffix rules, everything else written by the author; the runtime derives nothing.
- ADR-409 Amendment 1 (D7): Chord Writer surfaces, fixes and indexes the forms.
- ADR-385 D2 stands; the implementing plan adds a dated note there. Chord 4.2.0 is a one-time override of ADR-257 D2.

## Mutation Audit

- Files with state-changing logic modified: none
- Tests verify actual state mutations (not just events): N/A

## Test Coverage Delta

- No test changes this session (baseline runs only; see Completed).

---

**Progressive update**: checkpoint 2026-11-24 18:21 — main session's progressive edits: Goals, Completed, Key Decisions and Files Modified (no line was written then; reconstructed from the event log).
**Progressive update**: checkpoint 2026-11-24 18:23 — ADR-409 accepted with Amendment 1, plan restructured to 5 phases, Phase 1 DONE, Phase 2 CURRENT; full form written.

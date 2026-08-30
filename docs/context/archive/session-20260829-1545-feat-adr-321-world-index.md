# Session Summary: 2026-08-29 - feat/adr-321-world-index

## Goals
- Add the remaining ADR-310 character-block lines (mood/personality/knows/thinks/influence/resists/spreads) to `packages/chord/chord.ebnf` — the paper-trail gap the previous session flagged.
- (David, mid-session) A full keyword-level parity sweep bringing the whole ebnf up to date with the parser, not just the ADR-310 gap.
- (David, mid-session) Assess whether ADR-327/328/329 (the actor program) move the Secret Letter port, and repoint/re-probe/pin the port's tree.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — Phase 6, "Chapter 1 vertical slice in `branch-stories/secret-letter/`" (P-5).
- **Phase executed**: Phase 6 remains **CURRENT** (since 2026-08-22) — this session did not complete or advance it. It added a progress note recording the re-probe/re-pin fix and the corrected card counts; no status line changed.
- **Tool calls used**: 223 / no budget set (`tier`/`budget` fields empty in session state — untiered session).
- **Phase outcome**: Not a phase-budget session — Phase 6 continues; this session's Chord/ebnf work and the Secret Letter probe were both work outside the plan's own sequence, done at David's direction mid-session.

## Completed

### `chord.ebnf` — ADR-310 backfill (first pass)
- New "the character model (ADR-310)" section: `mood-line`, `feels-line` (+ `disposition`), `knows-line`, `thinks-line`, `spreads-line` (+ `topic-list`, `name-ref-list`), `resists-line`, `influence-block` (+ `influence-line`); all seven wired into `create-line`. Personality (D2) and `cognitive-profile` (D4) documented as composition-list riders, not lines.
- Every production checked against `src/parser.ts` and `src/analyzer.ts`; every closed word list cited from `src/character-manifest.ts`.
- `tests/language-version.test.ts`: hash re-pinned `f8d5cbaf…` → `48b44a74…` under 3.5.0 (no language change — grammar already shipped).

### `chord.ebnf` — full parity sweep (second pass, David: "I want the ebnf up to date")
- Keyword-level sweep of the parser's three dispatch tables (create-line, statement, define) against the ebnf's quoted words; productions added for every gap found:
  - ADR-310: `define fact|profile|mood|personality`, the D13 `feels`/`knows` predicates, `change mood to` / `change feeling toward`.
  - ADR-318: `temperament`/`never`/`protects`/`answers honestly`/`honor`/`burdened by`/`code` lines, `define temperament|code|honor|topic`, `force-pair`, `scope-ref`.
  - ADR-325: `define timer` (+ `timer-line`), `timer-clause` (create block and story header), `move-clause`, `landing-line`, the timer verbs, `move … here|offstage`, `place` (with `'s location` and ADR-326's random-adjacent-room folded in), `has [not] started|expired`.
  - ADR-227: `kill the player` with D3i's body. ADR-230: `carries`.
  - `set … when` corrected (file said "not on set" — the parser and analyzer both take it).
  - `rest-of-line`, `prose-paragraph`, `inline-prose` defined for the first time (referenced for months, never defined).
- Remaining parser-only words are the removed forms (`define verb|flag|score|behavior`, `if`) — left out of the productions, noted in the header as a deliberate exclusion.
- Header fixed (David: "fix the header"): three references to the quarantined `docs/reference/chord-grammar.md` replaced — the file now names itself as the surface of record (hash-pinned by `language-version.test.ts`, served by the website grammar reference at `/chord.ebnf`), points change approval at `chord-grammar-changes.md`.
- Hash re-pinned twice more: `48b44a74…` → `251bc2bc…` → `60f9abd7…`. Still Chord 3.5.0 throughout — no language change, only documentation of grammar the parser already accepted.
- GH #322 (the ebnf backfill issue) closed with a comment recording the full parity sweep.
- **Test evidence**: `pnpm --filter '@sharpee/chord' test` → **1100 passed (1100), 72 test files passed (72)**, re-run 2026-08-29 17:00 CDT (fresh — after the final chord.ebnf and language-version.test.ts edits at 21:05:28/21:05:38 UTC).

### Secret Letter port — actor-program assessment and re-probe/pin
- **Assessment** (David's question, 16:20 CDT): does ADR-327/328/329 move the port? Verdict: the actor program's authored Chord surface (acting statements, goals, character-model lines) is unused in `branch-stories/secret-letter` today — zero of each — but it is exactly what the next increments need (ADR-329's own Context names Teisha's dress/hat handover and the mercenaries acting), and it closed #311 along the way.
- Surfaced along the way: the port's tree had drifted from 157 cards passing (2026-08-24, session d2ebf7) to 131 passing / 29 failing, logged 2026-08-28 (session 2334) as "identical to baseline c31ab561 — pre-existing" and never diagnosed. `.current-plan` was also unset (an interrupting plan had archived without repointing).
- Live replay via `./sharpee play branch-stories/secret-letter` (unseeded, 16:15 CDT) showed the mercenary sweep mechanism intact — arrival, "uncomfortably close," "There he is!", "Gotcha!" all fired in sequence — just off the tree's pinned seed-1209 timeline.
- **Root cause** (code-verified, not bisected): ADR-328 Phase 2b (commit 0bb0dcce, 2026-08-28) retired the presence gate on entity `on every turn` clauses (`runtime.ts:3332-3335`, "RNG conditions consume off-stage"). `npc-teisha.chord:44`'s `on every turn while one chance in 5` began drawing every turn of the game instead of only while the player is with Teisha; every `chance` shares one seeded stream (`evaluator.ts:893`), the same stream the timer's `interrupted` roll uses (`runtime.ts:3655`). `grubbers-market.chord:178`'s monkey-commotion clause had the same off-stage-draw exposure, firing at the bite instead of on cue.
- **Repoint + re-probe** (David: "repoint re-probe/pin", 16:30 CDT): `.current-plan` → `docs/work/secret-letter-port/plan.md`. Probe via `./sharpee test branch-stories/secret-letter --json --capture-output` at seed 1209 confirmed the timeline shift plus a second D3 casualty (branch 7's monkey commotion missing, monkey already on the post).
- **Fix was story-side, not a re-pin**: `npc-teisha.chord:44` → `while Teisha is here and one chance in 5`; `grubbers-market.chord:178` → `… and the player is in the Exotic Gems Stall`; `monkey.chord` arming comment corrected. Tree left untouched.
- Plan Phase 6 progress note added recording the fix and the corrected counts.
- **Test evidence**: `./sharpee test branch-stories/secret-letter` → **160 cards passing, 209 assertions passing, 0 failing** (758 commands: 159 authored + 599 replayed), re-run 2026-08-29 17:00 CDT (fresh — after the `.chord` edits at 21:23:03-21:23:07 UTC).

## Key Decisions

### 1. No Chord version bump for the ebnf work
The productions document grammar the parser already accepts; ADR-257 D2 as amended last session moves the version number at publish, and the hash pin alone records the surface change. Chord stays 3.5.0.

### 2. Removed forms stay out of the productions
`define verb|flag|score|behavior` and bare `if` are parser-recognized-with-fix-it forms, not live grammar — excluded from the ebnf, with the exclusion recorded in the file's header rather than left silent.

### 3. Secret Letter fix is story-side, not a platform change or a re-pin
The guards (`while Teisha is here and …`, `and the player is in the Exotic Gems Stall`) restore the original intent — an off-stage NPC's every-turn clause shouldn't draw — without touching ADR-328 D3's presence-gate retirement or the tree's pinned assertions. The platform question this exposes (should off-stage `on every turn` RNG conditions draw from the same seeded stream as on-stage ones) was raised and left open, not filed as an issue.

## Next Phase
- Phase 6 remains CURRENT — not advanced by this session. Its own entry-state work (Chapter 1 vertical slice) continues from where the prior session (83c2f3) left it; this session's contribution was a drift fix, not phase progress.

## Open Items

### Short Term
- None outstanding from this session's own work — ebnf sweep and Secret Letter fix both closed clean (GH #322 closed; tree green).

### Long Term
- Platform question, left open and NOT filed: should off-stage `on every turn` RNG conditions draw from the same seeded stream as on-stage ones (ADR-328 D3)? Story-side guards make it moot for Secret Letter, but other Chord stories with bare `one chance in N` every-turn clauses carry the same exposure.

## Files Modified

**Chord language surface** (2 files):
- `packages/chord/chord.ebnf` - two-pass parity sweep against parser/analyzer; header rewritten
- `packages/chord/tests/language-version.test.ts` - hash re-pinned 4 times across the session (final: `60f9abd7…`, still 3.5.0)

**Secret Letter port** (4 files):
- `branch-stories/secret-letter/npc-teisha.chord` - every-turn RNG clause gated on Teisha's presence
- `branch-stories/secret-letter/grubbers-market.chord` - monkey-commotion clause gated on player location
- `branch-stories/secret-letter/monkey.chord` - arming comment corrected
- `docs/work/secret-letter-port/plan.md` - Phase 6 progress note added

**Session infrastructure** (1 file):
- `docs/context/.current-plan` - created, points to `docs/work/secret-letter-port/plan.md` (was unset)

## Notes

**Session duration**: ~1h15m (15:45-17:00 CDT).

**Approach**: Two independent, David-directed threads in one session on a branch (`feat/adr-321-world-index`) whose name doesn't match either — this was standalone/interrupt work, not ADR-321 progress. First thread: a mechanical grammar-parity audit (ebnf against parser/analyzer source, three passes, each closed with a green test run and a re-pin). Second thread: an assessment question that surfaced a live regression (Secret Letter tree drift) via code archaeology (bisecting to ADR-328 Phase 2b's presence-gate retirement) rather than trial-and-error, fixed at the story layer without touching the platform or the tree's pins.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — nothing committed yet; commit-remote runs after this summary.

## Dependency/Prerequisite Check

- **Prerequisites met**: `src/parser.ts`, `src/analyzer.ts`, `src/character-manifest.ts` available for the parity sweep; `docs/work/secret-letter-port/plan.md` and the story source available for the drift investigation; `./sharpee test`/`./sharpee play` bundle available for both threads.
- **Prerequisites discovered**: None — both threads worked with what was already in the repo.

## Architectural Decisions

- None this session. No ADR written or amended; ADR-257 D2, ADR-310, ADR-318, ADR-325, ADR-227, ADR-230, and ADR-328 D3 were all read and cited, not modified.
- Pattern applied: hash-pin-as-surface-record (ADR-257 D2 as amended) — grammar documentation changes re-pin the test hash without bumping the language version.

## Mutation Audit

- Files with state-changing logic modified: none. `chord.ebnf` is a grammar document, `language-version.test.ts` is a hash-pin test, and the three `.chord` files are story content (RNG-clause guard conditions), not platform side-effect functions. Rule 15's own filters (source files with `execute|handle|process|save|...` named functions) do not fire on any file this session touched.
- Tests verify actual state mutations (not just events): N/A — no side-effect function was written or changed.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — the ebnf drifting behind the parser is the same class of gap the previous session flagged (this session's own stated Goal 1 was closing that gap). NO other prior-session match for the Secret Letter timeline drift; this is the first session to diagnose it (prior session 2334, 2026-08-28, logged the failing count but explicitly did not investigate it).
- If YES: the ebnf-drift recurrence is now closed by this session's full parity sweep (not a partial fix) plus the header naming the file as the surface of record — a future audit of "is the ebnf still in sync" is the mitigation already in place, not a new ask.

## Test Coverage Delta

- Tests added: 0 (no new test cases; existing suites re-run and hash pins updated).
- Tests passing before: 1100/1100, 72 files (chord) and 131/160 with 29 failing (secret-letter tree, pre-session baseline per 2026-08-28 session 2334) → after: **1100 passed (1100), 72 test files passed (72)** (chord — re-run 2026-08-29 17:00 CDT, fresh) and **160 cards passing, 209 assertions passing, 0 failing** (secret-letter — re-run 2026-08-29 17:00 CDT, fresh, 758 commands: 159 authored + 599 replayed).
- Known untested areas: the platform-level question (off-stage every-turn RNG sharing the on-stage stream) has no regression test — the fix was scoped to Secret Letter's two affected clauses, not a platform guard.

---

**Progressive update**: Session completed 2026-08-29 17:00 CDT

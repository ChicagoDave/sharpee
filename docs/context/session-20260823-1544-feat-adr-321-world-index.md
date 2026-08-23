# Session Summary: 2026-08-23 - feat/adr-321-world-index (2026-08-23 15:44 CDT)

## Goals
- Redo issue triage and close verifiably-landed ADR-325 issues.
- Run the phrase-rendering-seam side-plan to fix #304 (refusal Choice rendering) and diagnose #286 (phrase-in-phrase interpolation).
- Return `.current-plan` to `secret-letter-port` and hand off Phase 6's next increments.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — "Port The Secret Letter (Textfyre, 2009) to Chord" (P-1..P-10).
- **Phase executed**: this session's substantive work was a *side-plan*, `docs/work/phrase-rendering-seam/plan.md` (now archived), run under rule 18b's "still live" supersession while `secret-letter-port` Phase 6 (P-5, "Chapter 1 vertical slice") stayed CURRENT and untouched.
- **Tool calls used**: 175 / 150 (Medium tier) — over budget; rule 17's 90%/100% banners fired at 20:35Z/21:28Z and the session continued past 100% to close out Phase 2 and re-stamp both plans.
- **Phase outcome**: Side-plan (Phases 1–2) completed on scope, Phase 3 explicitly deferred by David — plan marked DONE and archived same day.

## Completed

### Issue triage redo
- `docs/work/issue-triage/triage-20260823.md` — 79 open at pull (down from yesterday's 83; 12 closed, 8 filed since). Closed #305–#310 (ADR-325 implementation set, landed by this branch's own commits 74fa6192/ffe06101 that same morning but never closed) after re-verifying at HEAD: chord 986 passing (66 files), story-loader 604 passing (84 files), `./sharpee test branch-stories/secret-letter` 91 cards/103 assertions passing at 2026-08-23T20:51:05Z.
- Headline finding: the Secret Letter port is functioning as the QA instrument for ADR-325 — all 8 new issues trace to it — and the never-closed-fix pattern recurred within 24 hours of the last time it was flagged.

### Phrase-rendering-seam plan (Phase 1 — fixes #304)
- `packages/story-loader/src/runtime.ts`: `findRefusal` now returns a `RefusalVeto` `{error, params?}`; new `refusalOf` (replacing `resolvePhraseKey`) stages phrase-render params via `stagePhraseParams`, extracted verbatim from `phraseEvent`'s existing `Choice`-building logic. Four call sites (`on`-clause, trait-clause, capability-dispatch body, dialogue-row refusal) now spread the veto instead of discarding `params`; `buildCapabilityBehavior`'s validate path stays key-only by design since its `blocked()` already re-renders correctly.
- Root cause: the refusal path returned a bare message id while the loader registers the literal `'{variants}'` template for any strategy-bearing phrase, so a `refuse <key>` on a `randomly`/`cycling` phrase printed the word "variants" instead of selecting an arm.
- Two new tests in `packages/story-loader/tests/entity-scoped-refusal.test.ts` (on-clause + composed-trait paths), asserting Choice payload, blocked-event carriage, and world-state — graded GREEN.
- Story fix: `branch-stories/secret-letter/mercenaries.chord`'s `merc-held` restored to its three source arms (`story.ni:2168`, Gentry's text verbatim); the `## ... GH #304 ...` single-arm workaround comment removed.

### Phrase-rendering-seam plan (Phase 2 — #286 floor)
- `packages/chord/src/analyzer.ts`: new diagnostic `analysis.phrase-in-phrase` in `checkPhraseMarkers`, firing when a `{key}` marker names a declared phrase and is used inside another `define phrase` body (currently silently inert downstream — only `compileRoomSnippets`, room-scoped, resolves markers at all).
- Discovery mid-implementation: entity descriptions are registered in the phrase table as `<id>.description`/`<id>.initial-description`, so the first-cut diagnostic over-fired and broke 9 zoo tests (caught by the full-suite run); a `descriptionKeys` exemption keeps room descriptions (Z2 snippet-resolved) and non-room descriptions (pinned unrewritten by contract) out of the gate.
- New fixture `packages/chord/tests/fixtures/gates/phrase-in-phrase.story` plus a test pinning both fires/doesn't-fire cases in one assertion.
- #286 left open with a status comment; full resolution (Phase 3) explicitly deferred.

### Verification (2026-08-23T21:38Z, after all edits — from `docs/work/archive/phrase-rendering-seam/plan.md` Phase 1/2 Progress notes)
- chord: 987 passing / 66 files (986 baseline + 1 new).
- story-loader: 606 passing / 84 files (604 baseline + 2 new).
- Tree documents: secret-letter 91/103, fernhill 36/40, ides-of-march 39/48 — all at or above baseline.
- mutation-verification agent ran after the Phase 1 (`runtime.ts`) edits and before the Phase 2 (`analyzer.ts`) edits began: clean, no RED/YELLOW, `stagePhraseParams`'s extraction traced line-by-line against `phraseEvent` (order/precedence identical). It does not cover the later `analyzer.ts` diagnostic — a static-analysis check with no state mutation, so rule 15's side-effect-function trigger does not apply to it.

## Key Decisions

### 1. Phrase-rendering-seam ran as a rule-18b "still live" supersession, not a re-plan
`secret-letter-port` was stamped "Superseded by" the new plan rather than closed or abandoned — its Phase 6 stayed CURRENT, untouched, and the pointer returned to it the same day once the side-plan finished. Standard David-approved detour pattern for this branch (third time this shape has been used on this plan).

### 2. Phase 3 (full phrase-in-phrase interpolation) deferred, not built
At the Phase 2 checkpoint David chose **defer**, consistent with #303 item 2's held stance (wait for evidence the port's conversation corpus needs it). Marked ABANDONED within the phrase-rendering-seam plan only — #286 and #303 item 2 stay open. The port's `[rp]` repeat-prefix case (five prefixes inlined, randomness lost) is recorded as the first evidence toward a future "go" decision.

### 3. `analysis.phrase-in-phrase` severity chosen as error, not warning
No live story currently carries the phrase-in-phrase pattern outside the diagnosed case; Teisha's prefixes are already inlined rather than composed, so an error blocks the pattern from being introduced accidentally rather than merely flagging it.

## Next Phase
- **Phase 6 (unchanged, CURRENT)**: "Chapter 1 vertical slice in `branch-stories/secret-letter/`" (P-5) — resumed at exactly the state it was in before the detour. Named next increments (from the plan's Progress notes and `mercenaries.chord`'s own header): the conspicuous-shopper check, stallkeeper talk-refusals while mercenaries are present, and the noisy-theft rule. The `merc-held` fix (#304) removes the reason those were blocked from using the strategy-phrase refusal pattern cleanly.
- **Tier**: Large (400 budget) — this session did not consume any of Phase 6's budget; it ran entirely inside the phrase-rendering-seam side-plan's own budgets.
- **Entry state**: `mercenaries.chord`'s multi-arm `merc-held` restored and tested; #304 closable; the disguise-work items ("don't recognize you" arrival variant, warning/spotting suppression) and the `kick` verb remain the other open items named in the Phase 6 progress log, alongside the three items above.

## Open Items

### Short Term
- Close #304 on GitHub (fixed and verified this session, not yet flipped).
- File Phase 6's next increments: conspicuous shopper, stallkeeper refusals, noisy theft.

### Long Term
- #286 / #303 item 2 (phrase-in-phrase interpolation) — revisit once the port's quip corpus shows flat phrases + word-strategies running out.
- Disguise-work items and the `kick` verb, held back from the `hunted`-state sweep per Phase 6's prior progress note.

## Files Modified

**Platform** (3 files):
- `packages/story-loader/src/runtime.ts` - `RefusalVeto`/`refusalOf`/`stagePhraseParams`, four call sites spread the veto.
- `packages/story-loader/tests/entity-scoped-refusal.test.ts` - two new tests for strategy-phrase refusals.
- `packages/chord/src/analyzer.ts` - new `analysis.phrase-in-phrase` diagnostic with `descriptionKeys` exemption.

**Platform tests** (2 files):
- `packages/chord/tests/analyzer.test.ts` - fires/doesn't-fire assertion for the new diagnostic.
- `packages/chord/tests/fixtures/gates/phrase-in-phrase.story` - new fixture (created).

**Story** (1 file):
- `branch-stories/secret-letter/mercenaries.chord` - `merc-held` restored to three source arms, workaround comment removed.

**Planning/tracking** (3 files):
- `docs/work/issue-triage/triage-20260823.md` - new triage pass, closed #305–#310.
- `docs/work/phrase-rendering-seam/plan.md` - written, executed, archived to `docs/work/archive/phrase-rendering-seam/plan.md`.
- `docs/work/secret-letter-port/plan.md` - "Superseded by"/"Resumed" stamps for the detour.

## Notes

**Session duration**: ~1h15m (20:44Z start, last substantive edit 21:59Z).

**Approach**: Diagnosed a live workaround comment in the story (`merc-held`'s single-arm form, tagged with #304) back to its platform root cause before writing any fix, per the plan's own "References consulted" file:line citations; both platform fixes were CLAUDE.md platform-change items discussed via a written plan before implementation.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — platform changes are confined to `packages/chord` + `packages/story-loader`; if reverted, the `mercenaries.chord` story change must revert with them (its multi-arm `merc-held` form depends on #304's fix to render correctly).

## Dependency/Prerequisite Check

- **Prerequisites met**: `docs/work/issue-triage/triage-20260823.md`'s Tier 1 ordering pointed directly at #304/#286 as the next platform work; ADR-325 (ACCEPTED, 2026-08-23) confirmed the "loader-owned mechanics never need engine/stdlib/world-model changes" pattern this fix follows.
- **Prerequisites discovered**: none — root cause was fully traceable from existing code (`runtime.ts`'s working `phraseEvent` path vs. its four discarding refusal call sites) before any edit was made.

## Architectural Decisions

- ADR-325 (Chord presence and duration) — referenced, not amended; confirms loader-owned mechanics (refusals, timers) stay inside `packages/chord`/`packages/story-loader`.
- Pattern applied: platform-change discussion-first (CLAUDE.md) — both fixes were scoped and written as a plan (`phrase-rendering-seam/plan.md`) before any `packages/` edit, per the rule.
- None new this session — no ADR was written or amended.

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/runtime.ts` (refusal veto construction and threading).
- Tests verify actual state mutations (not just events): YES (evidence: mutation-verification agent run, 2026-08-23T21:32:57Z, clean — `stagePhraseParams` extraction traced line-by-line against `phraseEvent`; test run `pnpm --filter @sharpee/story-loader test entity-scoped-refusal` passed same window).
- `packages/chord/src/analyzer.ts`'s `checkPhraseMarkers` change is a static diagnostic (no runtime state mutation) — N/A for mutation assertions; covered instead by the fires/doesn't-fire test pin.

## Recurrence Check

- Similar to past issue? NO — this session's fixes (#304, #286) are new findings, not repeats of a prior blocker. (The triage's own headline — issues landed but never closed — is a process-hygiene pattern, not a code-mutation recurrence, and this session's Status is COMPLETE with no blocker, so rule 19's detector was not triggered.)

## Test Coverage Delta

- Tests added: 3 (2 in `packages/story-loader/tests/entity-scoped-refusal.test.ts`, 1 in `packages/chord/tests/analyzer.test.ts`) plus 1 new fixture (`phrase-in-phrase.story`).
- Tests passing before: chord 986/66 files, story-loader 604/84 files → after: chord 987/66 files, story-loader 606/84 files (evidence: `docs/work/archive/phrase-rendering-seam/plan.md` Phase 1/2 Progress notes, timestamped 2026-08-23T21:38Z, after the last edit to the covered files).
- Known untested areas: full phrase-in-phrase interpolation (Phase 3, deferred — no code exists to test).

---

**Progressive update**: Session completed 2026-08-23 17:00

---

## Progressive update — Phase 6 increment (17:40 CDT)

After the Tier 1 commit (`cd146cf0`), the session resumed the port plan's Phase 6 with the
stallkeeper talk-refusal increment:

- **Built**: the `wary` trait (`branch-stories/secret-letter/mercenaries.chord`,
  `story.ni:1875-1879` verbatim), composed on the ten keepers in `grubbers-market.chord`.
  One `on talking` clause — the analyzer's duplicate-clause gate rejects two on one trait —
  with the refusal partition splitting oblivious ("Better find somewhere else to chat…")
  from not-oblivious ("No time to chat now; you've got to run!"). Gated on
  `the wandering mercenaries is here`, so the calm ST tree is untouched.
- **Tested**: new tree branch 4 under the Alley bite, probe-derived at seed 1209
  (scratch-copy + `--capture-output`): arrival, warning, hush-refusal on the spotting turn,
  Gotcha, run-refusal on the capture turn. `./sharpee test branch-stories/secret-letter` —
  102 cards passing, 117 assertions passing (2026-08-23T22:33:51Z), up from 91/103.
- **Deferred with evidence**: conspicuous shopper (cross-product line → #303 item 2,
  second evidence recorded); noisy theft (needs a random-adjacent-room move — filed **#311**).
- **Known seam, carried as-is**: topic asks bypass the gate (the source gated only the
  conversation opening); David to rule on whether asks should share it.
- Session checkpoint (rule 16, ~17:40): on track, no drift, no orphans.

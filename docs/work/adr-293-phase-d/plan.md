# Session Plan: ADR-293 Phase D — retire the workarounds

**Created**: 2026-08-02
**Status**: APPROVED (2026-08-02, session 1d3b6f) — David ruled all three Open Decisions on the plan's recommendation (1=a delete now, 2=a rewrite in place, 3=b out of scope) and approved implementation starting at Phase 1.
**Scope boundary note** (per plan-review): the deferred coverage-manifest `verify` gate (Phase C plan's Phase 6, ADR-294 D16) is **not** part of this plan — it stays deferred to a separate follow-on session. Its earlier mention of "Phase D" as a candidate landing point is superseded by this explicit exclusion.
**Overall scope**: Implement ADR-293 Phase D only — retire the three workarounds named at ADR-293 line ~779: the Navigator retry loop, surplus attack commands in walkthroughs, and the run-flakey-walkthroughs-twice policy. Phases A (substrate), B (story cleanup), and C (coverage/forcing/search) are merged (PR #216, commit range through `0e94ac19`).
**Bounded contexts touched**: N/A — infrastructure/tooling and test-harness cleanup, not domain behavior. No `docs/ddd/notation.yaml` exists and this work introduces no domain concepts, so the plan is framed in plain technical terms per the "DDD does not apply" rule.
**Key domain language**: N/A (see above). Relevant technical vocabulary — choice point, pinned seed, golden recording, force, point-seed override — comes from ADR-293/294 and is used as-is below.

## References consulted
- `docs/architecture/adrs/adr-293-choice-points-per-point-streams.md` — ACCEPTED. Defines Phase D's scope (three named workarounds) and the Consequences lines this plan's acceptance criteria are tied to: "the walkthrough flake gets a named cause and a fix, and the run-twice policy retires"; "the navigator's 50-attempt retry loop becomes dead weight and surplus attack commands come out of walkthroughs." Also names the deferred `[OK: any]` default question (ADR-277 D5) as a Phase-D-adjacent Consequence, not a mandate.
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — ACCEPTED and IMPLEMENTED (commit `118cd95a`). This is the load-bearing reference for this plan: it already declares the navigator, `[WHILE:]`/`[RETRY:]`/`[ENSURES:]`/`[REQUIRES:]`/`[NAVIGATE TO:]` grammar, and "six attack commands is usually enough" dead — "its root cause... died in Phase A/5" and "'run it twice' is retired as a practice, not just as a root cause." This plan's job is largely to **verify that claim held** and close the gap where it didn't (documentation and habit lag behind the mechanism), not to re-implement removed machinery.
- `docs/architecture/adrs/adr-292-testability-contract-bounded-outcome-search.md` — historical context only: names the thief's unbounded draw tree as the reason "Dungeo's own `CLAUDE.md` already instructs authors to 'run the chain twice before blaming a code change.'" Read to confirm this was a Context-section description of past state, not a live instruction to re-issue; not edited by this plan.
- `docs/work/adr-293-phase-c/plan.md` — the immediately-prior phase plan this one follows in structure (References consulted, Open Decisions ruled up front, AC-to-phase mapping, per-phase tier/budget/verification). Confirms Phase C's `forces:`/`point-seed:`/`--search`/`--coverage` tooling is now available, which is what makes exact (non-padded) combat sequences derivable rather than aspirational.
- `docs/context/project-profile.md` — stack/convention constraints (fresh, generated today): pnpm workspace + tsf build, `./repokit`/`./sharpee` split (ADR-187). Every verification command below uses `./repokit build dungeo` / `dist/cli/sharpee.js`, never `./sharpee build`.
- `docs/context/session-20260802-1720-main.md` — this session's own in-progress file. Records the scoping discovery this plan formalizes: `packages/transcript-tester/src/navigator.ts` no longer exists (removed by the ADR-294 rebuild); only stale `dist/`/`dist-esm/` artifacts remain.
- `docs/proposals/tracker-low-hanging-fruit.md` — Status COMPLETE, all eight items DONE. No ACCEPTED-but-not-PLANNED items; nothing to plan from it here.
- `CLAUDE.md` (project root) — governs this plan two ways: (1) it contains the stale transcript-testing guidance this plan's Phase 2/3 correct (see Findings below); (2) its MAJOR DIRECTIONS require discussion before any `packages/` change and confirmation before any file deletion — both bind directly on this plan's Open Decisions.

## Findings that shape this plan (verified against the working tree, 2026-08-02)

1. **The navigator is already gone from source.** `packages/transcript-tester/src/navigator.ts` does not exist. `grep -rniE "retry|attempt|navigator" packages/transcript-tester/src/` matches only Phase C's new search-budget tool (`search.ts`'s `attempt` loop, an unrelated first-firing search counter) and `parser.ts`'s named rejection messages for the *removed* `[RETRY:]`/`[END RETRY]` directives. Stale build output remains at `packages/transcript-tester/dist/navigator.{js,d.ts}(.map)` and the `dist-esm` equivalents — orphaned, not regenerated by current source.
2. **The control-flow directive layer is already removed and enforced.** `packages/transcript-tester/src/parser.ts` rejects `[WHILE:]`, `[END WHILE]`, `[RETRY:]`, `[END RETRY]`, `[ENSURES:]`, `[REQUIRES:]`, and `[NAVIGATE TO:]` as named parse errors citing ADR-294 D4, each message pointing authors at the pinned-seed replacement. `types.ts:14-18` documents this as settled.
3. **The two combat walkthroughs are already migrated to exact pinned-seed sequences, not padding.** `wt-01-get-torch-early.transcript` (3 `attack troll with sword` lines) and `wt-13-thief-fight.transcript` (8 attack lines total) each carry the comment "(loop region resolved to its seed-42 sequence — ADR-294 migration)" and `wt-13` further states "Seven blows is the seed-42 kill sequence" — these are not defensive padding, they are the literal number of turns needed to kill at seed 42. **But both files also carry older, contradictory comments** ("Kill troll - melee combat with DO/UNTIL loop," "Loops attack until troll dies or player dies (retry handles player death)," "Fight thief with nasty knife. DO/UNTIL loops until thief dies or player dies") describing a mechanism (`DO/UNTIL`, retry-on-death) that no longer exists per Finding 2. These are stale, misleading comments, not surplus commands.
4. **No other story's walkthroughs use combat.** `stories/fernhill/walkthroughs`, `stories/channel-service-test/walkthroughs`, and `stories/friendly-zoo/walkthroughs` contain zero matches for `attack|retry|loop`. The surplus-attack-command workaround is fully scoped to `stories/dungeo`.
5. **The run-twice policy is not encoded in any CI workflow, script, or `repokit` command** — `.github/workflows/*.yml` and `tools/repokit/` have zero references to it. It exists only as a **copy-pasted verification-step habit** in plan files and session summaries. ADR-294 itself (accepted and implemented same day as several of these) declares the practice retired, yet it recurs *after* that commit in same-day session work: `docs/work/prose-order/plan-20260802-adr-296.md:130` still writes "run TWICE (project memory: thief combat is RNG-dependent...)" — a belief ADR-294 (D4, `wt-13` "stable 80/80/80") already falsifies. Historical plan files that already completed and recorded a real double-run (e.g. `docs/work/adr-293-phase-a/plan.md:83,111`) are left alone as accurate history, not live guidance.
6. **Root `CLAUDE.md`'s transcript-testing guidance is stale on all four of its bullets** ("IMPORTANT — Don't modify working transcripts," lines ~199-202): "don't add WHILE loops" (the grammar is gone, not merely discouraged), "6 is usually sufficient" attack-command guidance (contradicts pinned-seed exactness), and the `[ENSURES:]` bullet ("works correctly — don't remove it") is **actively false** — `[ENSURES:]` is removed grammar per Finding 2. This is a live, checked-in instructions file, not history — it is the concrete artifact behind the surplus-attack-command and run-twice items.
7. `stories/dungeo/CLAUDE.md` was **already corrected** in a prior session (`docs/context/session-20260801-2230-main.md`: "WHILE/NAVIGATE carousel section replaced... 'run chain twice' thief-RNG advice updated... stale wt-10 WHILE reference fixed"). It is accurate today and is the model this plan's Phase 2/3 CLAUDE.md edits should match in tone and specificity.

## Open decision points — for David, before implementation

### 1. Stale `dist`/`dist-esm` navigator artifacts — delete now, or leave for natural rebuild?
`packages/transcript-tester/dist/navigator.*` and `dist-esm/navigator.*` are orphaned build output with no corresponding source. CLAUDE.md's MAJOR DIRECTIONS forbid deleting files without confirmation, "not even 'to get a build working.'"
- **(a) Delete now**, verified regenerated-or-absent by a clean `./repokit build dungeo` afterward (confirms nothing still depends on the stale files).
- **(b) Leave them** — a subsequent `./repokit clean && ./repokit build dungeo` (or a transcript-tester-scoped rebuild) will naturally not regenerate them, and they age out on their own; no functional harm since nothing imports them.
- **Recommendation: (a)**, but only after Phase 1's build/test pass confirms no consumer references them — stale `.d.ts` files can otherwise cause confusing IDE navigation to dead code.
- **Ruled (2026-08-02, David): (a)** — delete after the build/test pass confirms nothing references them.

### 2. Root `CLAUDE.md` transcript-testing block — rewrite in place, or restructure?
Finding 6's four-bullet block is stale on every line.
- **(a) Rewrite the existing bullets in place**, replacing each stale claim with its accurate post-ADR-294 equivalent (no WHILE/ENSURES exist to avoid touching; attack counts are exact pinned-seed sequences derived via `--exec` probing, matching the method `stories/dungeo/CLAUDE.md` already documents for room-exit randomization; chain runs are deterministic and a single run suffices).
- **(b) Replace the whole block with a pointer** to `stories/dungeo/CLAUDE.md`'s already-correct guidance, keeping root `CLAUDE.md` shorter.
- **Recommendation: (a)** — root `CLAUDE.md` is read by every story, not just dungeo, and should stand alone; the per-story file can stay dungeo-specific detail.
- **Ruled (2026-08-02, David): (a)** — rewrite the bullets in place.

### 3. Should `[OK: any]` stop being the default now (ADR-277 D5), per ADR-293's Consequences note?
ADR-293's Consequences section observes that "with outcomes reproducible and selectable, verbatim assertion becomes the natural default" — but Phase D's own scope line names only the three workarounds, not this. This is a real behavior/default change to the assertion DSL, not a cleanup.
- **(a) In scope for this plan** — add a phase changing the `[OK:]` default and migrating existing transcripts.
- **(b) Out of scope** — record it here as a live open question for a future ADR-277 amendment or a separate plan, since it is a DSL-default change (potentially touching every transcript in every story), not "retiring a workaround."
- **Recommendation: (b)** — it is not named in Phase D's own scope line, and folding it in risks the same scope-cascade Phase A's history warns against (per the Phase C plan's own note). Flagged here so it isn't silently dropped.
- **Ruled (2026-08-02, David): (b)** — out of scope; stays recorded as a live question for a separate ADR-277 ruling.

---

## AC / Consequences Mapping

| ADR-293 Consequences line | Status entering this plan | Closes in |
|---|---|---|
| "Navigator's 50-attempt retry loop becomes dead weight" | Already true in source (Finding 1) — needs verification + stale-artifact disposition, not new code | Phase 1 |
| "...and surplus attack commands come out of walkthroughs" | Partially true — sequences are already exact, but stale comments and root `CLAUDE.md` guidance contradict that (Findings 3, 6) | Phase 2 |
| "The walkthrough flake gets a named cause and a fix, and the run-twice policy retires" | Root cause dead per ADR-294; practice persists in habit, unenforced anywhere (Finding 5) | Phase 3 |
| "`[OK: any]` can stop being the default" (ADR-277 D5) | Open Decision 3 — not committed to this plan | Out of scope unless David rules otherwise |

---

## Phases

### Phase 1: Verify navigator retirement and rule on stale artifacts
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A (infrastructure verification)
- **Entry state**: ADR-293 Phases A–C and ADR-294 merged. Finding 1 established informally this session; not yet formally verified with a build/test pass or presented for a ruling.
- **Deliverable**: Formal verification that `packages/transcript-tester/src/` contains zero retry/navigator/WHILE-loop machinery (grep evidence plus a green `pnpm --filter '@sharpee/transcript-tester' test`); Open Decision 1 ruled (a) — delete the named files and confirm `./repokit build dungeo` stays green and does not regenerate them. Also folds in the plan-review STALE-ADR fixup: amend `adr-294`'s Status line to record implementation completion (commit `118cd95a`) so the ADR no longer reads as unstarted.
- **Exit state**: The "navigator's 50-attempt retry loop becomes dead weight" Consequence is confirmed closed with evidence recorded, and the stale-artifact question is resolved one way or the other (not left ambiguous).
- **Verification**: `grep -rniE "retry|attempt|navigator" packages/transcript-tester/src/` reviewed line-by-line to confirm every hit is either Phase C's unrelated search tool or a named-rejection message for removed grammar; `pnpm --filter '@sharpee/transcript-tester' test`; `./repokit build dungeo`; if Decision 1 = (a), a post-deletion clean build confirming absence.
- **Status**: COMPLETE (2026-08-02, session 1d3b6f) — grep reviewed line-by-line: only `search.ts`'s attempt-budget counter and `parser.ts`/`types.ts` named rejections for removed grammar; repo-wide consumer grep found zero references to the navigator module; tester 207 green; 8 stale artifacts deleted (`dist{,-esm}/navigator.{js,js.map,d.ts,d.ts.map}`); `./repokit build dungeo` green post-deletion and does not regenerate them; walkthrough chain green; ADR-294 status line amended to record implementation (`118cd95a`).

### Phase 2: Retire surplus-attack-command guidance and stale transcript comments
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: N/A (story-level transcript + root documentation cleanup)
- **Entry state**: Phase 1 complete. Findings 3, 4, and 6 established but not yet acted on.
- **Deliverable**:
  - Story-level (autonomous per CLAUDE.md — walkthrough edits don't require discussion): rewrite the stale comments in `wt-01-get-torch-early.transcript` (lines ~60-61) and `wt-13-thief-fight.transcript` (lines ~129-130) to accurately describe the actual mechanism — exact pinned-seed attack counts derived from the seed-42 combat table, matching the phrasing already used one line below them ("(loop region resolved to its seed-42 sequence — ADR-294 migration)"). No command-list changes expected (Finding 3: counts are already exact) — if the re-derivation surfaces a transcript where the count *is* padded beyond the seed-42 requirement, trim it and re-bless, re-verifying against the full chain.
  - Confirm (per Finding 4) that no other story's walkthroughs need this treatment; record the confirmation rather than silently assuming it still holds at implementation time.
  - Platform-adjacent (requires discussion per CLAUDE.md, since it's the checked-in project-instructions file, not story content): rewrite root `CLAUDE.md`'s "IMPORTANT — Don't modify working transcripts" block per Open Decision 2's ruling — remove the stale WHILE/ENSURES claims, replace "6 is usually sufficient" with guidance to derive the exact pinned-seed count via `--exec` probing (the method `stories/dungeo/CLAUDE.md` already documents for room-exit randomization).
- **Exit state**: No transcript in the repo carries a comment describing removed control-flow grammar as if functional; root `CLAUDE.md`'s transcript-testing guidance is accurate against `parser.ts`'s actual removed-directive list and Phase C's exact-sequence capability.
- **Verification**: Full walkthrough chain green at the pinned seed with unchanged pass/fail counts and command sequences (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`); `git diff CLAUDE.md` reviewed against `packages/transcript-tester/src/parser.ts`'s directive table for accuracy; if any transcript's attack count was trimmed, a `--bless` + clean re-run confirming determinism.
- **Status**: COMPLETE (2026-08-02, session 1d3b6f) — three stale comment lines rewritten (`wt-01` ×2, `wt-13` ×1; a repo-wide grep found no others); no attack counts trimmed (already exact, per Finding 3); Finding 4 re-confirmed at implementation time — only 4 stories have walkthroughs and the non-dungeo ones carry zero combat/retry patterns; root `CLAUDE.md` block rewritten in place (removed-grammar list checked against `parser.ts`'s rejection table; "6 is usually sufficient" replaced with `--exec` probing / `forces:` pinning guidance); chain 952/952 green, counts unchanged.

### Phase 3: Retire the run-flakey-walkthroughs-twice policy
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A (documentation + verification evidence)
- **Entry state**: Phase 2 complete; walkthrough chain confirmed stable and accurately documented.
- **Deliverable**: Direct re-verification of ADR-294's stability claim ("`wt-13-thief-fight` is now a stable 80/80/80 across runs") by running the full `wt-*` chain three consecutive times at the same default/pinned seed and diffing output byte-for-byte — this is the closing evidence for ADR-293 Acceptance 2 and the Consequences line naming this policy directly. Add explicit anti-superstition guidance to root `CLAUDE.md`'s Testing Commands section stating that chain runs are byte-deterministic at a pinned seed and a single run is sufficient — this is the concrete artifact that stops the observed habit (Finding 5: nothing else encodes or enforces it, so nothing else needs to change).
- **Exit state**: Three consecutive chain runs at the same seed are byte-identical (recorded as evidence); root `CLAUDE.md` explicitly states single-run sufficiency; the policy is retired as a documented practice, not merely as a root cause (closing the gap Finding 5 identified between ADR-294's claim and observed same-day session behavior).
- **Verification**: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` ×3 at the same seed, diffed; `git diff CLAUDE.md`.
- **Status**: COMPLETE (2026-08-02, session 1d3b6f) — three consecutive chain runs identical (1084 output lines each, 952/952 passed, identical coverage report; the only variance is per-transcript wall-clock timing, normalized before diffing). Root `CLAUDE.md` now states single-run sufficiency explicitly, citing this verification. ADR-293 Acceptance 2 evidence closed.

---

## Overall acceptance (tied to ADR-293's Phase D Consequences)

1. "The navigator's 50-attempt retry loop becomes dead weight" — closed in Phase 1, evidence: zero retry/navigator machinery in `packages/transcript-tester/src/`, stale build artifacts resolved per David's ruling.
2. "...and surplus attack commands come out of walkthroughs" — closed in Phase 2, evidence: `wt-01`/`wt-13` comments accurately describe exact pinned-seed sequences; root `CLAUDE.md` no longer instructs padding; full chain green with unchanged counts.
3. "The walkthrough flake gets a named cause and a fix, and the run-twice policy retires" — closed in Phase 3, evidence: three consecutive byte-identical chain runs at a pinned seed; root `CLAUDE.md` explicitly states single-run sufficiency.
4. "`[OK: any]` can stop being the default" (ADR-277 D5) — explicitly **not** claimed by this plan (Open Decision 3); recorded as a live question for a separate ruling.

All three phases are independently landable and each re-verifies the full `wt-*` walkthrough chain via `--chain` before being considered done, per CLAUDE.md's standing constraint on transcript edits.

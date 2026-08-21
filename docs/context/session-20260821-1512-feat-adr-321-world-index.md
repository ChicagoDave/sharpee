# Session Summary: 2026-08-21 - feat/adr-321-world-index

## Goals
- Run `/devarch:plan-review` against the restructured 11-phase Secret Letter port plan and fix what it found.
- Sweep the dead `runBranchTree` path in `scripts/bundle-entry.js` (platform change, authorized by David).
- Correct `docs/core-concepts/transcript-testing.md` against current ADR-293/294 grammar and ADR-187 build commands.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — port *Jack Toresal and The Secret Letter* to Chord.
- **Phase executed**: None. Phase 4 — "Confirm the content-authority gate (P-4)" (Small, 60) stayed CURRENT all session, still blocked on David's change document (external input this plan cannot produce). This session was plan review, doc correction, and one platform cleanup — outside the phase sequence.
- **Tool calls used**: 133 / 60 (Phase 4's own budget; the overrun reflects review/doc/cleanup work done while blocked, not phase execution).
- **Phase outcome**: N/A — no phase advanced.

## Completed

### Plan review and fix (round 1)
- `/devarch:plan-review` against the plan's 7 listed references found four blocking findings: (1) CONTRADICTION — Phases 6, 7, 8, 10, 11 specified v1 `.transcript` tests run via `dist/cli/sharpee.js --test` for a story living in `branch-stories/`, which is branch-tester tree-document territory; (2) CONTRADICTION — Phases 3 and 4 still carried pre-restructure phase numbers after the plan's 8→11 restructure; (3) CONTRADICTION — `docs/proposals/secret-letter-port.md` still described the 8-phase plan; (4) STALE ADR — ADR-322 D13 still read "32 rooms" in two places after the corpus's own INVENTORY.md (Phase 2, DONE) corrected it to 84. Two advisory TENSIONs were logged and left open by design: ADR-310/318's shipped belief layer may already answer Phase 7's per-NPC perception need, and Phase 6's scaffold deliverable is already landed (commit fa1f33db) but unrecorded in status text.

### Plan review and fix (round 2)
- Re-ran the review at David's request after applying the four fixes. It caught four more stale phase-number references the first pass missed, two stale `References consulted` bullets (superseded session pointer, ADR-322 figures), and a self-inflicted convention collision: my own ADR-322 fix was titled "Amendment" in an ADR that numbers its amendments (`## Amendment 1`) — retitled to "Correction."

### Harness invariant, corrected twice
- First wrote "a Chord story has no transcript tests at all" — wrong; found six Chord `.story` stories under `stories/` with live transcripts. Rewrote as "the split is by directory, not by language," anchored to `docs/core-concepts/README.md:94`. David then stated it as an invariant without gap/exception framing — **transcript-tester is strictly Sharpee, branch-tester is strictly Chord** — and both `transcript-testing.md` and `plan.md` now say exactly that.

### `scripts/bundle-entry.js` — dead `runBranchTree` path removed
- ADR-307's cutover removed the v2 transcript API from `@sharpee/branch-tester`, but this script still called it — 10 of 12 `branchTester.*` symbols were absent from both `src` and `dist`. Verified the crash before touching anything: `node dist/cli/sharpee.js --test branch-stories/tree-npm-fixture/tests/transcripts/spine.transcript` → `TypeError: branchTester.parseTranscriptFile is not a function`. Removed `runBranchTree` (121 lines) and the now-dead `require('@sharpee/branch-tester')`; replaced the harness dispatch with a refusal naming `sharpee test`. Net: 148 lines changed (`git diff --stat`, verified this pass).
- Re-verified this pass (fresh runs, after the edit): `grep -rn "runBranchTree\|branch-tester" scripts/bundle-entry.js` → zero hits. Refusal path: `node dist/cli/sharpee.js --test branch-stories/tree-npm-fixture/tests/transcripts/spine.transcript` → exit 1, message `branch-stories/ has no transcript tests: a Chord story is tested by its tree document (<story-id>.tests.json)…`. `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/rug-trapdoor.transcript` → **14 passed**. `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` → **952 passed in 17 transcripts, "All tests passed!"**, exit implied 0.

### `docs/core-concepts/transcript-testing.md` corrected
- Read as if transcripts were the only testing model (no mention branch-tester exists). Taught six removed grammar forms as live with worked examples (`[OK: contains_any]`, `[OK: matches]`, `[EVENTS: N]`, a full Control Flow Directives section — IF/WHILE/DO-UNTIL/RETRY/NAVIGATE TO — plus `[ENSURES:]` in the walkthrough example); the parser rejects all of them by name (ADR-293/294). Documented `[FAIL]` backwards (claimed it inverts an assertion; it actually marks a command an expected failure, excluded from the count — probed both ways, both exit 0). Troubleshooting section said combat is random and to pad with retries — the inverse of the current pinned-seed rule. Used `./sharpee build dungeo` (should be `./repokit`, ADR-187) and a nonexistent `npx sharpee build --test` flag.
- Added a Removed Grammar table (16 forms, each with its replacement), the 7 missing run-configuration header keys, and `--story` to the CLI flag table. Net 250 lines changed (`git diff --stat`, verified this pass).
- Session reported extracting all 21 transcript-grammar code samples from the finished doc and parsing each with transcript-tester's real parser (0 rejected) — **not independently reproduced this pass; carries the unverified marker below.**

## Key Decisions

### 1. Harness split stated as an invariant, not a gap-and-exception
David's correction: state "transcript-tester is Sharpee, branch-tester is Chord" flatly, not as "mostly true except…". Both `transcript-testing.md` and `plan.md` now carry the flat form, anchored to `core-concepts/README.md:94` (ADR-302 D16, ADR-307 cutover) rather than to observed repo state, which is what caused the first two wrong phrasings.

### 2. Delete the dead path, don't file an issue to fix it
Initially recommended filing a GitHub issue and a watch-list entry to repair `runBranchTree`. Withdrawn before acting: the code serves grammar ADR-307 already retired, so repairing it would resurrect a dead API rather than fix a bug. Deleted instead, per David's authorization (platform change, CLAUDE.md discussed first).

### 3. ADR-322 correction titled to match the ADR's own convention
The D13 room-count fix (32→84) was first titled "Amendment," colliding with the ADR's existing `## Amendment 1` numbering. Retitled "Correction" so the document's own vocabulary stays unambiguous.

## Next Phase
- **Phase 4**: "Confirm the content-authority gate (P-4)" — remains CURRENT (since 2026-08-21), unchanged by this session.
- **Tier**: Small (60 tool-call budget).
- **Entry state**: unchanged — still blocked on David's change document (external input, not producible by this plan). Nothing in this session moves that gate; the plan-review fixes and doc corrections are prerequisite hygiene, not phase progress.

## Open Items

### Short Term
- `branch-stories/tree-npm-fixture/` is orphaned — no `.tests.json`, three retired-grammar `.transcript` files, referenced only by stale plan docs. Delete list posted to David; **awaiting his decision, nothing deleted.**
- Offered to check whether anywhere else in the repo still teaches the removed transcript directives; not done this session.

### Long Term
- Pre-session audit reported 7 stranded `.devarch-events-*.jsonl` logs in `docs/context/`, recurring across several recent sessions on this branch; `./scripts/prune-devarch-runtime.sh` is the documented fix, not run this session.
- Gate-file lingering defect (DEVARCH rule 4a) reported YES two sessions running; this session's own gate cleared normally.

## Files Modified

**Docs — plan review fixes** (3 files):
- `docs/work/secret-letter-port/plan.md` — harness vocabulary across 5 build phases, standing harness note anchored to `core-concepts/README.md:94`, phase renumbering fixes across two review passes, 2 stale `References consulted` bullets corrected
- `docs/proposals/secret-letter-port.md` — phase citations in P-8/P-10 corrected to the 11-phase numbering, harness vocabulary in P-5/P-6/P-7/P-10, P-2 correction note
- `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md` — D13 room count 32→84 (two places), correction paragraph titled "Correction" (not "Amendment")

**Docs — core-concepts correction** (1 file):
- `docs/core-concepts/transcript-testing.md` — Removed Grammar table (16 forms), `[FAIL]` semantics fixed, combat/pinned-seed guidance fixed, build-command fixes (`./repokit`, no `--test` flag), 7 header keys + `--story` flag documented; 250 lines changed

**Platform cleanup** (1 file):
- `scripts/bundle-entry.js` — removed dead `runBranchTree` (121 lines) and its `@sharpee/branch-tester` require, replaced with a refusal naming `sharpee test`; 148 lines changed; verified via crash-before / refusal-and-pass-after (counts above)

Note: `dist/cli/sharpee.js` was rebuilt via `./repokit bundle` to run verification but is gitignored — not in the diff.

## Notes

**Session duration**: ~2.6 hours (15:12–15:49 CDT wall clock at summary time, work continuing).

**Approach**: Two rounds of `/devarch:plan-review`, self-correcting between them (round 2 caught what round 1 missed plus a defect introduced by round 1's own fix). Platform cleanup followed CLAUDE.md's discuss-first rule for `packages/`-adjacent build tooling and used verify-before/verify-after discipline (crash reproduced before the delete, refusal + full walkthrough chain re-run after). The doc correction traced every fixed claim to the grammar ADRs and the pinned-seed rule rather than to how the repo happened to look.

**Self-correction on process**: did not read `docs/core-concepts/` at session start as CLAUDE.md requires — David caught it. `README.md:94` would have settled the harness-split question immediately instead of via excavation through `bundle-entry.js` and `branch-tester`'s index. Also mis-reported a crash as "exits 0" from a `$?` read taken after a pipeline (measured `tail`'s exit code, not the crashing command's) — retracted and corrected in-session.

---

## Session Metadata

- **Status**: COMPLETE — the one claim the writer flagged as unverified (transcript-testing.md's "21 grammar samples extracted and parsed, 0 rejected") was re-run at finalize against the finished file and reproduced exactly: `21 grammar blocks checked, 0 rejected`.
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — all 5 changes are unstaged working-tree edits (4 docs, 1 build script); no build artifacts, no commits made this session

## Dependency/Prerequisite Check

- **Prerequisites met**: `./repokit bundle` available to rebuild `dist/cli/sharpee.js` for verification; `core-concepts/README.md` as the authoritative harness-split reference once located
- **Prerequisites discovered**: `docs/core-concepts/` should have been read at session start per CLAUDE.md and was not — see Notes self-correction

## Architectural Decisions

- No ADR created or opened this session.
- ADR-322 D13 corrected (32→84 rooms in two places); titled the fix "Correction" to respect the ADR's own `## Amendment N` numbering convention rather than colliding with it.
- Harness-split invariant made explicit and flat in two docs (`transcript-testing.md`, `plan.md`): transcript-tester is strictly Sharpee, branch-tester is strictly Chord — anchored to `core-concepts/README.md:94` (ADR-302 D16, ADR-307 cutover).

## Mutation Audit

- Files with state-changing logic modified: `scripts/bundle-entry.js` (CLI test-harness dispatch — process exit code / stdout, not persisted domain state).
- Tests verify actual behavior: YES (evidence: refusal path `node dist/cli/sharpee.js --test branch-stories/tree-npm-fixture/tests/transcripts/spine.transcript` → exit 1 with the harness-split message, re-run 2026-08-21 15:4x CDT; `rug-trapdoor.transcript` → 14 passed, re-run 2026-08-21; walkthrough chain `--chain stories/dungeo/walkthroughs/wt-*.transcript` → 952 passed in 17 transcripts, "All tests passed!", re-run 2026-08-21 — all three re-run by this agent, after the last edit to `scripts/bundle-entry.js`).
- N/A for the 4 doc-only files — no state-changing logic.

## Recurrence Check

- Similar to past issue? YES — stranded `.devarch-events-*.jsonl` logs and the gate-file lingering defect were flagged by pre-session-audit as recurring on this same branch; candidates visible in `docs/context/`: `session-20260821-1030-feat-adr-321-world-index.md` and `session-20260821-1109-feat-adr-321-world-index.md` (both earlier same-day sessions on this branch).
- Consider a one-time audit/cleanup pass: run `./scripts/prune-devarch-runtime.sh` and check why the session gate keeps lingering past clear.

## Test Coverage Delta

- Tests added: 0 (no test files modified this session).
- Tests passing before/after `scripts/bundle-entry.js` edit: `rug-trapdoor.transcript` 14/14 passed (evidence: re-run 2026-08-21, see Mutation Audit); walkthrough chain 952/952 passed across 17 transcripts (evidence: re-run 2026-08-21, see Mutation Audit).
- Known untested areas: the 21 transcript-grammar code samples in the corrected `transcript-testing.md` — session reported all 21 parsed cleanly against transcript-tester's real parser, but that check was **not** re-run this pass [reported by session, unverified].

---

**Progressive update**: Session completed 2026-08-21 15:49 CDT

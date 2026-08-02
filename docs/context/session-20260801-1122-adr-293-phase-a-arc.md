# Session Summary: 2026-08-01 11:22 - adr-293-phase-a-arc (CDT)

## Goals
- **Phase 7** of `docs/work/adr-293-phase-a/plan.md` — Integration and full acceptance pass (Medium tier, 250 budget).
- David's ruling: run the acceptance pass **on the arc branch first**; merge to `main` afterward with evidence in hand.
- ACs verified end to end: 1, 2, 3, 4, 5, 6, 7, 12, 13 (seed/vary clause) + `tsf build --npm` regression check.

## Completed — every gated AC passes (evidence inline, all run 2026-08-01 ~11:30–15:20 CDT)

### AC-1 — cross-process determinism ✅
- `troll-combat.transcript` at `--seed 777`, two separate bundle processes: identical except the ms-timing line (20 passed each).
- `combat-disengagement.transcript` at `--seed 777`: identical except timing (20 passed, 2 skipped each).
- 16-command `--exec` sequence at `--seed 20260801`: **fully byte-identical**, seed echoed.

### AC-2 — repeated walkthrough chain at pinned seed ✅ (with known Phase-B caveat)
- Three sequential full `wt-*` chain runs at `--seed 42`: **0 failures every run** ("All tests passed!"), totals 880/876/884.
- Count variance is confined to `wt-07-exorcism` and `wt-10-tea-room` — round-room routing retries from the four Phase-B `Math.random()` handlers (round-room, trivia, bat, carousel), exactly as the plan pre-annotated. Every diff line between runs is a direction command.
- **`wt-13-thief-fight`: stable 80/80/80 — the thief-combat flake is dead.**

### AC-3 — full-system stream independence under new declaration ✅
- Recorded three surfaces (troll-combat@777, 18-command route+fight@555, 16-command exec@20260801); declared inert `dungeo.ac3.inert-probe` in `melee-points.ts`; rebuilt; all three **byte-unchanged**; probe reverted; baseline re-confirmed byte-identical.

### AC-4 — save → restore → continue ✅ (after the pass's one real fixup, below)
- Prefix (12 commands to Troll Room at `[SEED: 555]`) + `$save`; restore in a **separate process pinned to 555** + full combat suffix: **byte-identical to the unbroken run** — all melee draws, thief `npc.moved` events, daemon messages, and continued turn numbering (13–18).
- Clock-seeded restore (discriminator): turn counter continues (13→18), the thief's *drawn* stream carries forward (same next move `r4d→r4b DOWN`), undrawn combat points reseed by derivation from the new master seed — exactly D7's documented semantics.
- Save file verified on disk: version 3.0.0, `engineState.streamStates` (4 drawn points), turn counter 12.

### AC-5 — full-game restore via the version reader ✅
- Hand-downgraded 2.0.0-shaped save (streamStates→`actionRngSeed`): restores and plays on.
- Version 9.9.9: `Unsupported save version: 9.9.9` through the real `SaveRestoreService`, named FAIL.
- Legacy tester snapshot: named rejection with remedy ("delete it and re-run the chain").
- CLI `--restore` at `--seed 555`: restored Troll Room state, first attack draw matches the unbroken run; legacy snapshot rejected exit 1.

### AC-6 / AC-7 — verify regression ✅
- `./repokit verify` after all Phase 7 changes: grammar → control bytes → **ADR-293 D6 entropy gate** → `tsf build --npm` (**green**, all 32 publishables staged in `~/.tsf-publish/sharpee/` incl. world-model, media, character; transcript-tester rebuilt for the fixup) — publish dry-run fails only on the known pre-existing "cannot publish over 4.3.0" release-flow state (Phase 6 note).

### AC-12 — seed reporting and reproduction ✅
- All four sources report: `Seed: N (clock)`, `(--seed)`, `([SEED:])`, `(--vary)`.
- Clock run's reported seed (1785613329140) fed back via `--seed`: **byte-identical replay**.

### AC-13 — seed/vary rejections as named failures ✅
- `--seed 1 --vary` → `--seed and --vary are mutually exclusive (ADR-293 D1)`, exit 2.
- `--seed abc` / `--seed 1.5` → `Invalid --seed value … must be a non-negative integer`, exit 2.
- `--seed 99999999999999999999` → **[fixup]** `Invalid --seed value … out of range (max 9007199254740991)`, exit 2 (`bundle-entry.js`; `Number.isInteger(1e20)` is true, so beyond-MAX_SAFE_INTEGER seeds previously slipped through and echoed digits that weren't what the user typed). Boundary MAX_SAFE_INTEGER itself accepted.
- `[SEED:]` on a later chain member → `chain-b-pinned.transcript:7: [SEED:] on a chain member after the first — the chain is one session and its seed comes from the first transcript (ADR-293 D14)`, exit 1; clean chain honors the first member's pin (`Seed: 1 ([SEED:])`).

## The fixup the pass surfaced (David approved): save surfaces bypassed the engine's format

**Finding**: transcript-tester's `$save`/`$restore` (runner.ts) and the CLI's `--restore` (bundle-entry.js, both `--exec` and `--play`) never went through `SaveRestoreService` — they hand-rolled `{worldState, pluginStates}` snapshots with no version, no turn counter, no `streamStates`. Proven end to end: a restored fight replayed with different outcomes and a reset turn counter.

**Fix** (platform, David-approved): both surfaces now register `ISaveRestoreHooks` and call `engine.save()`/`engine.restore()` — the tester/CLI own only the file location; the engine owns the contents (real 3.0.0 `SaveData`). Legacy snapshots are loudly rejected (never silently restored with wrong randomness); `restoreNamedSave()` helper deduplicates the two CLI sites. Old saves in `stories/*/saves` are stale by design (untracked; chains regenerate; no-backcompat policy). Post-fix full chain at `--seed 42`: **866 passed, 0 failures**, all 17 saves regenerated as version 3.0.0.

**Tests** (closing mutation-verification's two YELLOW findings; no RED):
- `packages/transcript-tester/tests/save-restore-directives.test.ts` — 7 unit tests: $save persists exactly the engine's payload; legacy/version-less/missing/no-engine rejections (engine never sees a legacy snapshot). Suite 63/63 green.
- `scripts/__tests__/cli-restore.test.ts` — 3 real-path tests spawning the actual bundle: real `$save`-produced fixture restores and continues; legacy snapshot exit 1; missing save exit 1. 3/3 green.

## Builds & suites (final state)
- Full `./repokit build dungeo`: green end to end (bundle 3466729 bytes).
- transcript-tester 63 passing (56+7); CLI restore tests 3 passing; post-fix chain 866 passing, 0 failures.

## Key Decisions
1. **Phase 7 run on the arc branch** (David's explicit choice) — merge to `main` afterward with evidence in hand; merge remains David's call.
2. **`--seed` out-of-range bound = `Number.MAX_SAFE_INTEGER`** — above it the parsed value no longer equals the typed digits, so the echoed seed would not reproduce the run (AC-12 integrity).
3. **Legacy save snapshots are a hard error, not a fallback** — a silently restored legacy save replays with wrong randomness, which is worse than failing.
4. **Directive-error swallowing left unchanged** — the tester only fails directives under `--stop-on-failure` (pre-existing policy); changing it globally mid-acceptance-pass risked baseline regressions. Recorded as a rebuild item instead.

## Approved follow-on: transcript-tester ground-up rebuild
David approved (this session) designing a ground-up transcript-tester rebuild **after** Phase 7 lands, as its own ADR — golden-transcript (record/bless/diff) regression model unlocked by determinism, thin assertion layer for unit intent, seed-matrix runs; subsumes the deleted parse-baseline guard. Companion to Phase B (the four `Math.random` handlers). Rebuild items observed this pass: directive errors swallowed without `--stop-on-failure` (a failed `$restore` silently continues on a fresh world); `[OK: any]` masks failed commands (watched it pass 18 commands with the player stuck in the Kitchen); `[SEED:]` is only recognized after the `---` separator (header placement silently ignored).

## Completed (continued) — PR, merge, and ADR-294 (same session)

### Arc landed
- PR #205 (arc → main) created and merged at David's direction ("PR then merge"); merge commit `728d8cdd`; local `main` fast-forwarded. ADR-293 Phase A fully closed.

### ADR-294 — Golden transcripts (tester rebuild) — ACCEPTED same day
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md`: drafted from this session's Phase 7 evidence, then feature-swept with David ("all possible features"): D1–D20 covering goldens + `--bless`, two tiers, header seeds + versioned provenance, coping-machinery deletion, unconditional failure, normalization contract, `.golden` format, seed matrices, in-place rebuild, migration policy, parse-drift subsumption, the D12 sequencing arc, coverage/"what should I test?" + `[FORCE:]`, watch mode, channel-scoped recordings, verify coverage gate, seeded fuzzing, divergence debugging, localization coverage, and the bounded explorer.
- Interview resolved all six questions (Q1 `[NAVIGATE TO:]` deleted; Q2 text-only + `events:` opt-in; Q3 walkthroughs golden / unit assertion-tier; Q4 ADR-290 amended separately; Q5 one arc: handler access → Phase B → rebuild; Q6 forcing first, CLI first). `adr-review` 10/15 → 15/15 after three folds (Acceptance AC-1..AC-14, `.golden` format block, status wording). **ACCEPTED by David.**
- Memory saved: testing intelligence is a Sharpee/Chord product differentiator (David's framing), `project_testing_intelligence_differentiator.md`.

## Completed (continued) — ADR-290 A1 + ADR-293 Phase B (same session)

### ADR-290 Amendment A1 (commit `2eb640db`)
- Output artifact retargeted to ADR-294 goldens per 294 Q4; per-turn bless rescoped to optional assertion-tier annotation; overdue ADR-293 dependency recorded (seed pin = clean-world guarantee in the randomness dimension). Stays DRAFT.

### Handler-access discussion — dissolved (no platform gap)
Phase A's "event handlers with no route to RandomService" was a misclassification, verified in source: round-room, bat, and low-room/carousel are scheduler **daemons** (`SchedulerContext.random` exists — plugin-scheduler `types.ts:25`, threaded in Phase 4); trivia's draw is called from the **knock action** (`ActionContext.random`). No platform change needed; Phase B is pure story work.

### ADR-293 Phase B — the four draws converted (story-level, autonomous per project rules)
- `round-room-handler.ts` → `dungeo.round-room.exit` (plain, `pick` over live exits); `bat-handler.ts` → `dungeo.bat.drop-room` (plain, `pick` over valid rooms); `carousel-handler.ts` → `dungeo.low-room.exit` (plain, `pick` over the two room ids — MDL `<PROB 50>` preserved); `dungeon-master-trivia.ts` `startTrivia(state, random)` → `dungeo.trivia.first-question` (`int` 0–7) threaded from `knock-action.ts`. Distributions unchanged. Four entries removed from `tools/repokit/entropy-allowlist.txt` (44 lines remain).
- `stories/dungeo/CLAUDE.md` Low Room note updated (replay-deterministic; WHILE loops no longer load-bearing).
- **Phase B gate (evidence inline, 2026-08-01 ~16:20 CDT)**: three full wt-* chains at `--seed 42` — **944 passed, 0 failures each, byte-identical across all three runs** (diff excluding timing lines: 0 lines, both pairs). Full AC-2 byte-identity, unreachable all morning, now closes.
- **Regression (evidence inline, ~14:55 CDT)**: dungeo unit suite **31 passing** (`pnpm exec vitest run`; note: `pnpm --filter … test` alone starts vitest WATCH mode — it never exits); full `./repokit build dungeo` green (bundle 3466729 bytes); `./repokit verify` green through the entropy gate (trimmed allowlist accepted) and `tsf build --npm`; only the known pre-existing publish-over-4.3.0 dry-run state fails.
- **Status**: ADR-293 Phase B COMPLETE. The ADR-294 rebuild is now unblocked (D12 arc steps 1–2 done).

## Open Items
- Carried (unchanged): post-293 coverage walkthrough (partially answered by ADR-294 D11/D13); `IDebugEvent` dead tier; `ring-action.ts:141` bug unfiled; publish dry-run 4.3.0 state (version bump or accept).

## Files Modified
**Source (fixups)**:
- `packages/transcript-tester/src/runner.ts` — `$save`/`$restore` through the engine's real save format; legacy rejection; interface gains optional `engine` surface
- `scripts/bundle-entry.js` — `--seed` out-of-range rejection; `restoreNamedSave()` for `--exec`/`--play` `--restore`

**Tests (new)**:
- `packages/transcript-tester/tests/save-restore-directives.test.ts` (7)
- `scripts/__tests__/cli-restore.test.ts` (3, real-path)

**Docs**:
- `docs/work/adr-293-phase-a/plan.md` — Phase 7 status → COMPLETE with evidence pointer
- `docs/context/session-20260801-1122-adr-293-phase-a-arc.md` — this file

**Incidental (build artifacts)**: `stories/dungeo/src/version.ts` (auto-stamped BUILD_DATE), `packages/sharpee/docs/genai-api/{index,tooling}.md` (regenerated, line-count delta from runner.ts)

## Session Metadata
- **Status**: COMPLETE — ADR-293 Phase A closed (7/7 phases, PR #205 merged to main); ADR-294 drafted → feature-swept → interviewed → reviewed → **ACCEPTED**; ADR-290 amended (A1); **ADR-293 Phase B complete** (walkthrough chain byte-identical at pinned seed, commit `1bc77944`). Next arc: the ADR-294 rebuild, planned against its ACs 1–9 in a fresh session.
- **Blocker**: N/A
- **Rollback Safety**: Phase 7 fixups are additive-behavior (save surfaces gain state they silently dropped); Phase B conversions preserve distributions exactly; ADR changes are documentation.

## Mutation Audit
- `mutation-verification` ran on the fixup (rule 15): mutations confirmed real (hook-driven file write; engine-owned state replacement); **no RED**; two YELLOW coverage gaps (legacy rejection, CLI `--restore`) closed same-session with the 10 new tests above, all green.

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

## Open Items
- **Merge `adr-293-phase-a-arc` → `main`**: David's call; all Phase 7 evidence is in.
- **Transcript-tester rebuild ADR/brainstorm**: next up after the arc lands (David-approved).
- Carried (unchanged): post-293 coverage walkthrough; ADR-290's missing dependency note on ADR-293; `IDebugEvent` dead tier; `ring-action.ts:141` bug unfiled; publish dry-run 4.3.0 state (version bump or accept).

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
- **Status**: COMPLETE — all Phase-A-gated ACs pass with evidence; Phase A plan fully COMPLETE (7/7 phases).
- **Blocker**: N/A
- **Rollback Safety**: fixups are additive-behavior (save surfaces gain state they silently dropped); reverting restores the silent-drop behavior, nothing else depends on the new format yet.

## Mutation Audit
- `mutation-verification` ran on the fixup (rule 15): mutations confirmed real (hook-driven file write; engine-owned state replacement); **no RED**; two YELLOW coverage gaps (legacy rejection, CLI `--restore`) closed same-session with the 10 new tests above, all green.

# ADR-348: The world is authoritative on restore

**Status**: **ACCEPTED** (David, 2026-09-11, session 275fbe — "accept", on the post-review 11/11 document. Written the same session at his "write the ADR for the broader rule". Raised by GH #416, which reported a third world-replacing code path that reconciles nothing — and found there was no written rule to measure it against, only two instances of the right behavior and no statement of what made them right. **Acceptance authorizes no behavior change, because the decision obliges none** — D1 through D4 describe what 5.4.0 already does. What it does oblige is AC-2's two tests, the one real gap the criteria name.

**`adr-review` ran at 5/11 NEEDS WORK**, four findings, all folded: no Acceptance Criteria section at all; `packages/bootstrap` and `packages/world-model` missing from the Scope line while the rule plainly reaches both; D3 citing the branch-tester's unconditional `reviveEngine()` as evidence without stating *why* it is not the very shape D1 rejects — it performs no world replacement, which the review verified by measurement; and no stated consequence for a path that neither derives nor declares, which is the case the ADR exists to prevent. The review also found a second stale RETRY comment, in `bootstrap`, twin to the one already recorded. Folding left the decision unchanged and added two honestly-undischarged criteria; **AC-2 was written and discharged in the same session as acceptance**, leaving AC-4 as the one open gap.)

**Scope**: `packages/engine/src/game-engine.ts` and `src/session/save-restore-service.ts`, `packages/platform-browser/src/BrowserClient.ts`, `packages/extensions/testing/src/`, `packages/bootstrap/src/index.ts` (`reviveEngine`'s contract, which D3 classifies), and `packages/world-model/src/world/WorldModel.ts` (`loadJSON` is the surface D1 governs). As a rule rather than a file list, it governs any path that replaces the world wholesale, including ones not yet written.

## Date: 2026-09-11

## Parent

**Supersedes nothing. Generalizes** ADR-347 D3 and D5, which decided this for one fact (the Ending) at two seams. **Depends on** ADR-345 D7 (no consumer outside `GameEngine` reads the phase), D8a (`resume()` tolerates `playing`), and D10/D11 (the phase set is closed).

## Context

ADR-347 made the story's ending a first-class `WorldModel` member, settling *where the fact lives*. What it did not state is the general rule that follows once world state can be swapped out from under things that mirror it.

Two code paths already behave correctly, and they were written independently:

- **The engine's phase.** `GameEngine.derivePhaseFromEnding()` (`packages/engine/src/game-engine.ts:1550`) reads `world.getEnding()` and moves the phase to match: a restored world carrying an Ending stops a playing engine, a restored world without one resumes a stopped engine. It is called from exactly two places, `undo()` (`:1473`) and `loadSaveData()` (`:1587`).
- **The browser client's input box.** `BrowserClient.syncEndingFromWorld()` (`packages/platform-browser/src/BrowserClient.ts:1037`) reads the same world member and enables or disables the box to match. It is called at boot and reboot (`:200`) and immediately after a save is applied (`:1019`).

Neither is *told* what to be by the code performing the restore. Both *ask the world*. That is the property worth naming, because the alternative was tried and shipped a defect: GH #414's Phase 1 patch resumed from `stopped` unconditionally after a restore, which loaded an ended save into a playing engine. It reconciled two records of one fact instead of reading the one that owns it.

The gap this ADR closes is that a third path exists and does neither. `TestingExtension.restoreCheckpoint` (`packages/extensions/testing/src/extension.ts:442`) calls `world.loadJSON()` through `deserializeCheckpoint` (`checkpoints/serializer.ts:103`) and never touches the engine, because the extension is handed a `WorldModel` and holds no engine to ask. Reviewing it, there was no rule to cite — only two examples. A rule that exists only as precedent is one a future path can miss without contradicting anything written down.

## Decision

**D1 — On any path that replaces the world wholesale, the restored world is authoritative, and every view derived from it must be re-derived from the world before the next turn runs.** Not reconciled, not patched, not set alongside: read from the world, which is the only record that survived the replacement.

**D2 — "Derived view" means any state held outside the world that answers a question the world already answers.** The test is falsifiable and mechanical: *if the world and the view can disagree after a restore, the view is derived and D1 governs it.* Today that is the engine's lifecycle phase and the browser client's input enablement. It is deliberately not a closed list — the point of stating a rule rather than enumerating two call sites is that the third one is found by the test rather than by having been thought of.

**D3 — Derivation happens at the seam, not continuously** (ADR-347 D5, restated because D1 reads as a licence to derive everywhere). A live engine may legitimately be `playing` while the world carries an Ending, and `packages/branch-tester/src/tree-walker.ts:360` depends on it: the walker calls `game.reviveEngine?.()` on every test line, reaching `engine.resume()` through `packages/bootstrap/src/index.ts:379`, so a line whose prefix ended in death can still run its own cards. Deriving continuously would re-stop that engine the moment it resumed, breaking the walker on every line after a death.

**That revive is not a counterexample to D1, because it is not a restore.** The distinction is load-bearing and easy to miss: an unconditional `resume()` looks like precisely the "set it, don't derive it" shape D1 rejects. It is not, because **no world replacement happens there** — measured 2026-09-11, neither `packages/branch-tester` nor `packages/transcript-tester` calls `loadJSON` anywhere, so the walker resumes an engine over the world it already had. D1 governs paths that *replace* the world; `reviveEngine` changes only the phase, over an unchanged world, and is outside the rule rather than an exception to it.

`reviveEngine`'s own doc comment (`packages/bootstrap/src/index.ts:109-111`) says otherwise — "Called by the runner's RETRY restore path after `world.loadJSON()`" — and is wrong twice over; see the Consequences below.

**D4 — A path that replaces the world and cannot re-derive must say so where its signature is declared, and the obligation then belongs to its caller.** Silence is the failure mode: a world-only restore that reads as a full restore is how the two records drift. `TestingExtensionInterface.restoreCheckpoint` (`packages/extensions/testing/src/types.ts:488`) is the worked example — it states that it is world-only, that the caller owns the phase, and why it is deliberately not a seam. The precedent for putting the obligation on the caller rather than widening the callee is ADR-345 D7 and D8a: the branch-tester calls `reviveEngine()` unconditionally rather than reading a phase that D7 ruled no outside consumer needs.

**D5 — What this does not decide.** Whether a given world-only path *should* become a real restore seam is a question for the session that gives it a caller, not for this ADR. D4 makes the obligation explicit either way; it does not rank the two answers. Specifically: when ADR-110's `$save` and `$restore` debug commands are finally registered — its command table specifies them and only `$saves` was ever built — that session decides whether checkpoint restore takes an engine. D1 tells it what the answer has to achieve, not which shape achieves it.

## Consequences

- **Every new world-replacing path now has a checklist item**: name its derived views by D2's test, and either re-derive them or declare the gap per D4. This applies to save/restore, undo, checkpoints, and any future one — a Zifmia-style world reuse across restart is *not* one of these, because it repopulates a world rather than replacing it under a live mirror.
- **The "reconcile two records" shape is now named and rejected.** GH #414's Phase 1 patch is the reference instance; anything that sets a derived view from something other than the restored world is the same defect regardless of which fact it involves.
- **This is a rule with no code change of its own.** D1 through D4 describe what `derivePhaseFromEnding`, `syncEndingFromWorld` and `restoreCheckpoint`'s documented contract already do as of 5.4.0. Nothing in this ADR obliges an edit; it obliges the *next* path to be measurable.
- **A path that neither re-derives nor declares is a defect, and this is the sentence that says so.** Before this ADR there was nothing such a path contradicted — it was merely unlike two others. Now it fails D1 if it has derived views and fails D4 if it does not say so, and AC-3's inventory is where it gets caught. The remedy is never to reconcile at the call site: it is to re-derive from the restored world, or to declare the gap and hand the obligation to the caller.
- **Two stale comments are left standing, deliberately, and recorded here so the next reader is not misled by them.** Both describe a "RETRY restore path" that no longer exists — `[RETRY:]` is removed transcript grammar (ADR-294 D4):
  - `derivePhaseFromEnding` (`packages/engine/src/game-engine.ts:1540-1541`) attributes the revive to "the transcript-tester RETRY path". The caller is the branch-tester's tree walker, not transcript-tester.
  - `reviveEngine` (`packages/bootstrap/src/index.ts:109-111`) says it is "called by the runner's RETRY restore path after `world.loadJSON()`". No caller does that — the tree walker is its only caller and it performs no world replacement at all, which is the fact D3 now turns on.

  Both are platform files, and correcting a comment is a platform change; neither is folded in here unasked. D3 cites the verified callers instead.

## Acceptance Criteria

This ADR obliges no new behavior, so its criteria are mostly *already discharged* — they name the tests that make D1 through D4 true today, so a later change that breaks one is caught rather than merely disagreed with. All five are discharged as of 2026-09-11: two (AC-2, AC-4) were written as honest gaps at acceptance and closed since, each in the session that wrote its tests.

1. **AC-1 (D1, the engine's phase, both directions) — DISCHARGED.** `packages/engine/tests/unit/engine-lifecycle-phase.test.ts:283` pins the seam in four shapes: a save carrying an Ending leaves a stopped engine stopped (`:291`), a restore of an ended save into a playing engine stops it (`:310`), an UNDO back to a live turn returns a stopped engine to play (`:333`), and a restore into an engine that was never started leaves it `ready` (`:350`). **SELF-VERIFYING** — deleting the `derivePhaseFromEnding()` call from either seam fails these.

2. **AC-2 (D1, the client's view, at the restore seam) — DISCHARGED 2026-09-11, session 275fbe.** `packages/platform-browser/tests/story-ending-restore-seam.test.ts` pins both call sites in both directions: connecting a world that has already ended disables the box with no turn and no packet, a reboot into a fresh story re-enables the box the old ending had disabled, applying a save whose world ended disables it, and applying one that lands a live turn re-enables it. Written because the pre-existing `story-ending-input.test.ts` covers the *channel renderer* — the live in-play signal of ADR-347 D3a — which is a different path that only runs on a turn's packet; the restore seam runs *between* turns and had no coverage at all. **SELF-VERIFYING, and probed in both directions**: removing the `connectEngine` call (`BrowserClient.ts:200`) fails 3 of the 4, and removing the `engineApplySave` call (`:1019`) fails the other 2. Full suite 157 passing after, from 153.

3. **AC-3 (D2's test, as a standing inventory) — DISCHARGED as of 2026-09-11, and re-checkable mechanically.** The production paths that replace the world are enumerable by `grep -rn "\.loadJSON(" packages --include="*.ts"`, excluding `dist/` and tests. As measured, there are three, each accounted for: `save-restore-service.ts:217` (reached by `GameEngine.undo()`, derives), `:335` (by `loadSaveData()`, derives), and `checkpoints/serializer.ts:103` (the declared exemption of D4). No host — `platform-browser`, `runtime`, `bridge`, `story-loader` — replaces the world directly. **A fourth site that appears without being classified is the defect this ADR names**, and this grep is how a review finds it. **MECHANICAL.**

4. **AC-4 (D3's boundary: the seam, not the turn loop) — DISCHARGED 2026-09-11, session 450284.** `packages/engine/tests/unit/engine-lifecycle-phase.test.ts:384` pins the property locally, in the walker's own shape: an engine a victory stopped, revived over the world that ended it, with the Ending left standing. Two tests, because neither alone is enough. The first runs a full regular turn — `look`, not a meta command, since `stopped` accepts those anyway (ADR-345 D15) — and asserts the turn *began* rather than being refused; the second wraps `derivePhaseFromEnding` in a counting spy and asserts a whole turn passes without calling it, with `loadSaveData` afterwards as the positive control that the spy fires where it should. **SELF-VERIFYING, and probed in two directions**: a derivation added at the top of `executeTurn` fails both (the revived engine is re-stopped before its first card); one added *after* the phase guard fails only the second, because the turn still runs and still ends `stopped` — which is the case the behavioural test cannot see and the reason the spy exists. Full engine suite 809 passing after, from 807. What had been guarding this before was emergent: moving the call into the turn loop would have failed every branch-tester tree whose line follows a death card, which is a real signal and an integration-distance one.

5. **AC-5 (D4's declaration duty) — DISCHARGED by inspection.** `TestingExtensionInterface.restoreCheckpoint` (`packages/extensions/testing/src/types.ts:488`) states that it is world-only, that the caller owns the phase, and why it is deliberately not a seam, with shorter notes at the implementation (`extension.ts:442`) and the package's front-door example. **PREMISE-DEPENDENT** — nothing mechanical reads a doc comment, so this is verified by reading it, and it is the criterion most likely to rot silently.

**Not an acceptance criterion, deliberately**: "no path violates D1." That is AC-3's inventory restated as a claim about the whole repository, and verifying it as a single assertion is what would let a fourth path hide inside a green suite. The inventory is the check; the claim is its output.

## What would falsify this

A restore path where the world is *not* the authority — where some state outside the world legitimately survives a world replacement and should override what the restored world says. None exists today. If one appears, D1 is too strong and needs an exception clause naming that state, rather than being quietly ignored at one call site.

## Session

Session 275fbe, 2026-09-11, on `main`. Written after GH #416 was resolved as world-only-by-contract (David's ruling, same session) and closed; this ADR is the broader rule he asked for once that ruling exposed that the narrow one was the only thing written down.

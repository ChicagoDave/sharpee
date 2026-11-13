# Draft for David's review: the tree walker restores at forks

**Status**: ACCEPTED by David, 2026-11-12, session a64f6a ("A": the text as drafted, and
report-line option A). The text now lives in ADR-307 D5's amendment of that date, with a
pointing note under ADR-302 D17; this file is the record of what was put to him.
What follows is the draft as he read it, when nothing was yet in an ADR and no
walker code had changed. Phase 4's entry state needs David's go on two things: the
amendment text (Part 1) and the report line (Part 2). Part 3 lists what I read to write
this, so each claim about the code can be checked.

## Part 1: the amendment text

One text, placed twice: as a dated amendment under ADR-307 D5, and as a dated note under
ADR-302 D17 that points to it. D17 is not superseded outright, because its first half
still describes the hand-authored transcript world's history; the amendment replaces its
rule for the tree walker and the derived tier only.

> **Amendment 2026-11-12 (engine-test-performance plan, Phase 4): a branch line starts
> from a restore, not a replay.**
>
> **What changes.** `sharpee test` boots one game per run of a tree, not one per line.
> The main line runs from that boot. As a line runs, the walker captures the engine's
> save at each card a branch forks from, and a branch line begins by restoring its fork's
> save on the same engine. The derived tier starts each derived row the same way, from
> the save at the card it derives from. "Fresh boot + deterministic replay at the pinned
> seed" (D5) now describes the main line and the lines listed under "What still replays".
>
> **What does not change.** The document's seed is still the engine's seed. Saves are
> held in memory for the length of one run and dropped at its end; none is written to
> disk, read from disk, or carried to another run. So D4 stands: recorded state is never
> the truth, because every save a line starts from was produced earlier in the same run,
> by the current story, from the root. A fork at or after an END STATE card, or after an
> execution error, is blocked exactly as before. The Testing tab's own live engine is
> not touched by this amendment; it still replays.
>
> **ADR-302 D17's two reasons, answered.**
> D17 chose re-execution for two reasons. The first was the hook collision (GH #227):
> registering save hooks dropped the restart hook. That was closed the same day D17 was
> written, when `registerSaveRestoreHooks` became a merge. The second was the general
> one: "restoring made the save format a correctness dependency of the harness: anything
> a save fails to serialize diverges silently in every child." That reason is still
> true, and this amendment does not argue with it. It answers it with a guard that did
> not exist then: the per-fork equivalence mode
> (`node scripts/perf/survey-test-run.mjs --equivalence <story>`), which at every fork
> plays one game by replay and another by save, play-on and restore, and compares the
> world and the rendered blocks of every following turn. On 2026-11-12 it found one real
> gap of exactly the kind D17 feared (a save taken before a story's first random draw
> carried no cursor; fixed in `packages/story-loader/src/evaluator.ts`), and after the
> fix it reports Secret Letter 105 of 105 forks equivalent, orchard 3 of 3, ferry 1 of 1.
> D17 measured the cost of re-execution at 6.2% on Fernhill. On Secret Letter the survey
> measured prefix replay at 46% of the run, which is the shape D17 named as the one it
> would lose to.
>
> **What still replays.** A save does not carry the engine's undo history: undo
> snapshots are cleared by every restore. A branch line whose own cards type `undo` could
> reach back across its fork, so that line is not restored. It boots fresh and replays
> its prefix, as every line did before. The replay driver therefore stays in the walker,
> for the main line and for these lines.
>
> **ADR-307's Consequences line** ("what survives intact: the replay driver and its
> determinism contract"). The determinism contract is kept whole: one seed, one result,
> run to run. The replay driver is kept and now covers the main line and the lines that
> type `undo`.
>
> **AC-3 ("edits replay whole").** Still holds. After a tail-cut, a splice or a new
> branch, every line's path is executed from the root in the same run, once, by the
> line itself and its ancestors. What changed is that a shared prefix is executed once
> and not once per descendant.
>
> **The reproducibility error.** The walker's "replay of X failed where the owning line
> succeeded — the tree is not reproducible at this seed" can no longer occur on a
> restored line, because nothing is replayed there to disagree. It remains for the lines
> that still replay. What stands in its place for restored lines is the equivalence
> mode, run on demand. It gates nothing; a restore the engine refuses is reported on the
> line as an error naming the fork.
>
> **ADR-348's checklist.** A fork restore replaces the world under a live harness, so
> each view held outside the world is named here and either re-derived or declared:
>
> | View | Where | After a restore |
> |---|---|---|
> | The engine's phase | `GameEngine` | Re-derived by the engine itself in `loadSaveData` (`derivePhaseFromEnding`). The walker adds nothing. |
> | `lastOutput`, `lastEvents`, `lastTurnResult`, `lastChannels`, `lastChannelValues`, `lastError` | bootstrap's loaded game | Stale: they describe the last turn of the line that ran before. The walker clears them at the restore, so a line's first card cannot read another line's turn. |
> | `capturedChannels`, `bootChannelValues` | bootstrap's loaded game | Facts of the boot, not of the world. One boot serves the run, so they are right as they stand. |
> | `autoAssertionPolicy` | bootstrap's loaded game | Set once per game by the walker (cleared); unchanged by a restore. |
> | The plugin registry's states | bootstrap's loaded game | Carried by the engine's save and restored with it. |
> | The room note and the line label | the walker | Read from the world after the restore, as they are read after a replay today. |
> | The turn number passed to `onCard` | the walker | Counted from the document (`prefixTurns`), never from the game. Unchanged. |
>
> **The fork save's type.** `captureSave` returns `unknown` today. It returns the
> engine's save data type, and the walker holds fork saves as that type.
>
> **An author's own save and restore cards.** The walker's fork hooks are registered
> for the moment of a capture or a restore and removed after it, so a line that types
> `save` or `restore` later meets the story's own hooks. A test covers it.

## Part 2: the report line and the observer field

Today the run report ends with `N commands (A authored + R replayed)` whenever R is
above zero, and `onLineStart` hands the line observer `replayedCommands`. Read on
2026-11-12: nothing outside the walker reads `replayedCommands` (devkit's `onLineStart`
takes `line` and `label` only), and the wire carries neither value, so the testing
surface has no consumer to change.

- **A. Keep the line, add the restores (recommended).** The line becomes
  `N commands (A authored + R replayed), F restored at a fork`, shown when R or F is
  above zero. R is then the prefix commands of the lines that still replay, zero on
  most trees. `replayedCommands` stays on `onLineStart` and is 0 for a restored line;
  a `restored: boolean` joins it. The run result gains `forkRestores`. ADR-302 D17's
  "the number to watch is the ratio of replayed commands to authored ones, which the
  run reports" keeps a number to watch.
- **B. Drop both.** No replay line, no `replayedCommands`. Simplest, but a tree whose
  lines type `undo` pays for replay again with nothing in the report to show it.
- **C. Keep the line exactly as it is.** It then appears only on trees with lines that
  type `undo`, and says nothing about restores.

## Part 3: what this was written from

Read in source on 2026-11-12, not taken from an ADR:

- `packages/branch-tester/src/tree-walker.ts`: `runTreeDocument` boots one game per
  line (`loadGame` inside the line loop), replays `line.prefix`, raises the
  reproducibility error, reads the label and the room from the game, and takes the turn
  number from `line.prefixTurns`. `formatTreeDocumentRun` prints the replay line.
- `packages/engine/src/session/save-restore-service.ts`: the undo snapshots are an
  in-memory buffer, and its own comment states `clearUndoSnapshots()` runs after every
  restore.
- `packages/bootstrap/src/index.ts`: the `LoadedGame` fields named in the table.
- `packages/transcript-tester/src/search.ts`: `captureSave` and `restoreSave`, and
  that `captureSave` returns `unknown`.
- `packages/devkit/src/commands/test-tree-document.ts`: the one `onLineStart`
  consumer.
- ADR-307 D4, D5, AC-3 and Consequences; ADR-302 D17 and its 2026-08-05 note;
  ADR-348 D1 to D4 and its checklist consequence.

Not verified, and to be settled by the implementation's tests, not assumed here: that
clearing bootstrap's last-turn fields at a restore is enough for the opening row of a
restored line; and that Phase 5's derived rows have no card that types `undo`.

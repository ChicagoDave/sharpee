# ADR-353: The testing pane visits one line; the tree is the run column's job

**Status**: **DRAFT** — the decisions below are David's, taken in session 04d4dd on 2026-09-19, and the open questions they left were resolved in the same session's interview (Q-1 → D4a; Q-2 → a Consequence, being a defect awaiting debugging rather than a ruling awaiting a decision; Q-3 → measured, folded into D4b). No Open Questions section: nothing here is waiting on an answer. Acceptance authorizes no implementation by itself.

**Scope**: `tools/ide/web/testing-surface/src` (the testing surface's replay driver), and the branch-image cache this decision creates. **No `packages/` change**: the tree document, the CLI's `test --tree` semantics, the assertion core, the pinned seed and the save format are all consumed exactly as they are, and none of them moves.

## Date: 2026-09-19

## Parent

ADR-307 (the testing tree model v2 — the document is the model, and its replay driver and determinism contract "survive intact"; this decision changes *when* the driver runs, never what the document means). **Related**: ADR-293 D7 (per-point seed streams, and their persistence in the save — the invariant that makes a restored branch point possible at all), ADR-305/ADR-306 (the play feed's ordinals, lineages and restart fences — Q-1 below is theirs), ADR-347 (the Ending as queryable state — the seam a branch that dies mid-prefix runs into, tracked separately as the plan's Phase 16), ADR-348 (the world is authoritative on restore).

## Context — measured, not assumed

**The pane replays the whole tree on every load, and it is the most expensive way to get the answer.** `replayTree` (`src/main.ts`) walks in three phases: the main line's own commands; then *every other line*, each one a `localStorage.clear()`, a typed `restart`, a wait for the restart fence, and a replay of that line's **entire prefix from the root** before its own commands; then the active line's full path once more. Every command in all three phases goes through `typeCommand` — a synthetic keydown on the client's real `command-input` — and waits for its turn record to come back through the host.

The cost is the sum of every line's prefix, not the story's size. Measured against `secret-letter` (2026-09-19): **566 cards, 60 branches, depth 3, 61 lines**, whose **565 authored commands become 3,854 executed** ones. In the pane, records arrive at roughly 42/s, so a complete replay is about **90 seconds** — on every load. The same 3,854 commands take **6 seconds** through `sharpee test --tree --capture-output --capture-world --json`, because that path runs engine-direct with no DOM and no host round trip.

**The main line alone is 75 records and 1.8 seconds.** Everything beyond it is the pane pre-visiting branches nobody asked to see.

**In the Avalonia head it does not even finish.** Left running 240 seconds against `secret-letter`, the pane replays the main line, posts `forkBoot: true`, and stops: 75 records, then nothing. `driveFreshBoot` types `restart` and waits 15 s for a fence that never arrives, and the `break` ends the whole branch loop. Fernhill's 11-line tree replayed intact in an earlier session (270 records), so this is scale- or story-specific. **Measured, not diagnosed** — Q-2.

**The answer the eager replay produces already exists, faster and elsewhere.** The run column folds `test --tree --json` **per line** (`src/run.ts`), so a line's verdict does not require the pane to have visited it. The replay's unique contribution is the *live* material — a turn's captures, its bound cards, the ability to branch from it — which is only meaningful for a line someone is looking at.

**Branch testing has a user, and he is on the fast path.** John uses branch testing in his own works through devkit — the CLI. The document he authors, the assertions he writes, the seed that pins his runs and the per-line results he reads are therefore a contract this decision must not touch, and does not: everything below is a change to how one IDE pane chooses to visit a tree it does not own.

**Getting to a branch point without retyping its prefix is already possible.** `ISaveData` carries a gzipped, verbatim `WorldModel.toJSON()` (traits, containment, score ledger, capabilities, relationships, ID counters, scope rules), the event source, the turn history, and plugin states including the scheduler's daemons and fuses. Critically it carries `streamStates` (ADR-293 D7, save format 3.0.0): per-point LCG stream state keyed by point name, where the seed *is* the state, so on restore "named points continue exactly where they left off." Randomness is what would otherwise make a branch reached by restore diverge silently from the same branch reached by replay, and it is the part already solved.

**Versioned save state across a changed story is a problem no IF platform has solved, and this decision does not attempt it** (David, 2026-09-19). Changing a game changes its world model, and every save with it. That is a fact about player saves, and the reason save-format versioning in this repository is dormant by decision.

## Decision

**D1 — The pane replays the active line, and only the active line.** On load it replays one path: the line the session was left on. On a click into another line it replays that one. The three-phase eager walk in `replayTree`, and the `intact`/`break` bookkeeping that half-aborts it, are deleted rather than reorganized.

**D2 — An unvisited branch reads as unvisited. Taking its verdict from the run column is BLOCKED on a line identity that exists** (amended 2026-09-19, same session, before implementation).

As first written this decision said an unvisited line takes its pass/fail from the run column, since `run.ts` folds `test --tree --json` per line. Measurement says it cannot, and the reason is upstream of this ADR.

A line's identity on the wire is its **derived label** (ADR-307 D2/Q-8), and a derived label is not unique. Measured against `secret-letter`, 2026-09-19, from the CLI's own `transcript-start` events under the exact arguments the run column uses: **61 lines, 37 distinct labels, and 31 of the 61 sharing a label with another line** — `top-of-the-post · d` names ten different lines, `alley · se` nine. The column therefore folds **385 of 566** card results, later ones overwriting earlier under the same key, and shows "not run yet" against labels it derived that match nothing emitted.

The tree itself is healthy: the same run reports `totalPassed: 566, totalFailed: 0, totalUnreached: 0` across all 61 lines. **Nothing is failing to run; results are failing to land.** Nor is this the pane's defect — the CLI emits the colliding labels, so both consumers inherit it.

So what stands and what does not. **An unvisited line reads as unvisited — that part stands**, and it is what D1 requires. **Its verdict does not come from the run column until a line carries a stable identity distinct from its display label**, which is a change to what the run emits (`packages/branch-tester`) and therefore a platform change needing its own discussion under CLAUDE.md, not a decision this ADR may take. Until then an unvisited line is honestly unknown, and saying so is better than showing a verdict belonging to a different line that happens to share a name.

**This does not gate D1.** Visiting one line at a time is right whether or not the column can speak for the rest; it only means the pane says less about what it has not visited than this ADR first claimed.

**D3 — The whole-tree answer stays the CLI's job.** The pane does not own "is this tree green"; `test --tree --json` does, at roughly fifteen times the speed, and the Run button already carries it into the run column.

**D4 — A branch image is build-scoped derived state, with no version, no reader, and no shim.** Entering a branch may restore a saved image of its parent's state and run only that branch's own commands, instead of retyping the prefix. An image is keyed to the IR the build emitted and does not outlive it: a rebuild orphans every image, and the cache is reconstructed on demand. There is no migration path because there is nothing to migrate — a stale image cannot be read, so the failure mode where a test passes against a world that no longer matches its source is structurally absent rather than guarded against.

**D4a — A restore is a fork boot, and says so in the shape the wire already has** (David, 2026-09-19, session 04d4dd, Q-1: "a"). Entering a branch by restoring an image stamps a new lineage carrying `parentLineage` — the line the image was taken from — and `forkOrdinal`, the card it was taken at. That is the existing boot-lineage shape (ADR-306 Phase 2), the one the embedder injects through `__SHARPEE_PLAY_LINEAGE__` and whose own source calls it "the IDE's branch-replay boot." **Nothing is added to the wire and no reader learns a new field.**

What the mechanism does not cover today is timing, not shape: `ensureLineage()` reads that global once per page and caches it, because a fork has always begun with a navigation. A restore happens inside a live page, so the stamp must become something the client can apply mid-page rather than a global read at document-start. That is the whole of D4a's implementation.

**Rejected: treating a restore as a fence** (a restart — new lineage, no parent). It is the smaller change and the wire already does it, but a fence deliberately carries no ancestry, and ancestry is the one thing the tree is about; the surface folds by ordinal and would have nothing to bind a restored branch's records to. **Also rejected: a new `restoredFrom` field** — it states the fact most explicitly and costs every reader a field, both native heads' generated protocol types moving with it under rule 8b, to say what `parentLineage`/`forkOrdinal` already say.

**D4b — Images live in the head's own cache container, keyed by the IR, and never beside the story** (David, 2026-09-19, session 04d4dd):

```
~/Library/Caches/<bundle-id>/branch-images/<storyId>-<projectRootHash8>/<irHash8>/…
```

Caches rather than Application Support is the semantic, not the convenience: macOS may purge Caches at any time, and D4 already makes an image disposable, so an OS purge is indistinguishable from a rebuild. The existing split in the shipping app is the precedent and it cuts the other way for the other artifact — the testing *session* (active line, dialog outcomes, collapsed state) is in Application Support at `net.sharpee.chord-writer/testing-sessions/<storyId>-<hash8>.json`, because losing an author's place in the tree is not acceptable, while losing a reconstructible image is.

`<projectRootHash8>` is a SHA256 prefix of the project root path, the same keying `TestingSessionStore` already uses, so two checkouts of one story do not collide. `<irHash8>` is what makes D4's invalidation trivial: a rebuild writes a new hash and dropping the old directory is the whole implementation, because nothing has to reason about staleness when nothing can read a stale image.

Each head uses its own container; images are not shared between the Swift and Avalonia heads, since per-build scratch shared across two apps couples their lifecycles to buy nothing. And they are **never** written beside the story, where `<story-id>.tests.json` lives: that folder is authored content an author commits, and a cache landing in it would appear in their `git status`.

**Image size needs no eviction rule** (measured 2026-09-19). Two real `secret-letter` saves taken from the shipping IDE's Play window — at turn 2 and turn 6 — are **34,466 and 37,360 bytes** as stored (`lz-string` `compressToUTF16`, read out of the Play pane's WebKit localStorage). At roughly 35 KB each, sixty branch points is about 2 MB, so D4 caches every branch point it is asked for and evicts nothing. Should a story ever make that false, the `<irHash8>` directory is already the unit an eviction rule would operate on.

**D5 — A player save and a branch image share a serializer and nothing else.** A player save is a durable artifact that must survive the story changing under it — the unsolved problem, deliberately parked. A branch image is a cache with the lifetime of a build, like the world index. They are the same bytes with opposite obligations, and the distinction is load-bearing: it is what lets D4 consume an interim save format without making that format durable.

**D6 — Images and laziness compose; laziness lands first.** D1–D3 are subtraction and need no new concept. D4 is addition and needs Q-1 answered. Shipping D1 first means the pane is fast before anything is built, and means D4 is measured against a working baseline rather than against a stall.

**D7 — The tree document, the CLI, the assertion core and the pinned seed do not change.** This decision is confined to one pane's replay strategy. An author on devkit sees nothing.

**D8 — This supersedes the premise of the plan's Phase 17** (parallel branch replay, with dead-player and failed-card handling under concurrency). Phase 17 existed to make an eager whole-tree replay affordable by running branches concurrently; D1 removes the replay instead, and there is nothing left to parallelize, no per-branch seed isolation to preserve under concurrency, and no cross-branch failure coordination to design. Phase 17 is marked superseded rather than re-scoped. **Phase 16 is untouched**: a branch entered by click can still reach an ending mid-prefix, and the surface still does not consume `story-ending`.

## Consequences

- **`replayTree` gets smaller, not rearranged.** Its second and third phases go, and `driveFreshBoot` — which already replays one line from a fresh boot — becomes the only path, called on demand rather than in a loop. The simplification is the point as much as the speed is.
- **Load time stops scaling with the tree.** It becomes the cost of one path rather than the sum of every prefix, so a story growing from 11 branches to 60 no longer makes the pane 8× slower to open. Measured expectation for `secret-letter`: ~90 seconds (or, today, a stall) to under two.
- **The pane and the CLI take on distinct jobs, stated.** Live and interactive for one line; complete and fast for the tree. Neither is a degraded version of the other, and "the pane is slow on big trees" stops being a defect to fix and becomes a job it does not have.
- **The save format stays interim without that becoming a liability.** D4 consumes it within a single build and never across one, so the dormant versioning decision is unaffected. This is the consequence D5 exists to protect; if a later session finds itself wanting an image to survive a rebuild, that is this ADR being violated, not extended.
- **A restored branch is indistinguishable on the wire from a replayed one.** D4a makes an image's records carry the same ancestry a fork boot's do, so the surface's fold-by-ordinal binding, the run column and any future reader all treat "arrived by restore" and "arrived by retyping the prefix" identically. That is the property that lets D4 be a pure optimization rather than a second semantics.
- **`ensureLineage()`'s once-per-page caching becomes a constraint to change, not a bug.** It is correct for every case that exists today; D4a is what first needs a lineage stamped without a navigation.
- **This decision does not fix the defect that makes a big tree unusable, and that defect is the ending seam.** Observed by David 2026-09-19 in **both heads identically**, which is what rules out either host and places it in the shared surface: partway through the replay a branch's prefix reaches an ending, the engine enters the `stopped` phase, and every command after it is refused with *"the engine is in the 'stopped' phase … The game has ended; only meta commands (RESTART, RESTORE, QUIT, UNDO) are accepted."* Each refusal still returns a completed turn record, so `awaitNextTurn` resolves, the driver counts the step as landed, and it walks on — turn 1929, 1930, … 2470, every one the same error, every assertion failing, every one rendered as a card. The engine states the fact in prose on every turn and nothing consumes it, because the surface is not a `story-ending` consumer (ADR-347 D3a). **This is not a performance problem that D1 fixes; D1 reduces how many branches are visited, and one branch that ends is enough.** Its resolution is the plan's Phase 16, which this ADR deliberately leaves standing.
  - *Correction of record*: an earlier reading in this session held that the Avalonia head's replay stalled silently after the main line. That was an artifact of the host logging one record in twenty-five; unsampled, records continue. One environment difference remains unexplained — an unsampled run here stopped at 78 records where David's reaches turn 2470 — and is deliberately not folded into the explanation above.
- **A branch image is about the size of a player save, because it is one.** The measured 35 KB is the same `ISaveData` a player's save slot holds, which is what makes D5's "same bytes, opposite obligations" literal rather than figurative.
- **One fewer Large phase.** D8 removes Phase 17 (400 tool calls, provisional) from the plan, and the concurrency, seed-isolation and failure-coordination design it carried.

## Session

Session 04d4dd, 2026-09-19, on `main`. The decision follows David's own reading of the defect — *"I think we may need to have the testing stop at any branch and then let the user click each branch to continue"* — and his two sharpenings of it: that branch state could be saved rather than replayed, and that versioned save state across a changed story is a problem no IF platform has solved and this one should not attempt. The measurements in Context were taken this session against the packaged Avalonia build and the vendored toolchain. Plan: `docs/work/chord-writer-avalonia-production/plan.md`, where this supersedes Phase 17 and leaves Phase 16 standing.

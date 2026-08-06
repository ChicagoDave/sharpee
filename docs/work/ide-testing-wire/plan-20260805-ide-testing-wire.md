# Session Plan: The IDE Testing wire — tree records on the ADR-277 D1 stream

> **SUPERSEDED 2026-08-06** by `plan-20260806-run-event-spine.md`. This plan sequenced
> wire-first and optimized the record shapes for backwards compatibility with a decoder
> this repo owns — an argument the IDE-primacy directive retired. Its Phase 4 (a Swift
> decoder mirror) is dropped outright: the Testing tab is a web bundle that imports
> `@sharpee/ide-protocol` directly. Kept for the reasoning in "The contract this plan
> implements", most of which survives in re-cut form.

**Created**: 2026-08-05
**Overall scope**: Make `sharpee test --tree --json` emit a record stream that can describe a tree — parentage, unreached subtrees, and replayed ancestry — and render it in the IDE's existing Tests panel. Ends with the `--tree --json` exit-2 guard removed because something can finally read the stream. Does NOT include the ADR-301 Testing-tab redesign, which is `Status: TBD` and undecided.
**Bounded contexts touched**: `@sharpee/ide-protocol` (the wire contract), `@sharpee/branch-tester` (tree execution + emission), `@sharpee/devkit` (the CLI that writes the stream), `tools/ide` (the Swift decoder and panel). No `world-model`/`stdlib`/`engine` domain modeling.
**Key domain language**: Node / stem / parentage (`continues:`), authored vs replayed execution (ADR-302 D17), unreached vs failed (D13), structural defect (D11), record stream (ADR-277 D1).

## The contract this plan implements

No new record types, no `TEST_RESULTS_SCHEMA_VERSION` bump. Five additions to the
existing five records, all gated behind `--tree` so no decoder meets them unrequested —
the same reasoning that let `CoverageRecord` land at version 1 behind `--coverage`.

| Addition | Record | Meaning |
| --- | --- | --- |
| `mode: … \| 'tree'` | `run-start` | The run model, where the run model is already declared. |
| `parent?: string` | `transcript-start` | Absolute path of the node's `continues:` parent. Absent = root. Same identity domain as `file`, so the decoder joins on one key. |
| `replayed?: boolean` | `transcript-start` | This execution exists to build a descendant's state (D17), not because it is its own test. |
| `status: … \| 'unreached'` + `blockedBy?: string` | `transcript-end` | The node never ran; `blockedBy` names the originating failure. |
| defects → `status: 'error'` + `errorMessage` | `transcript-end` | A tree that will not assemble (D11) names the files that broke it instead of producing a blank panel. |

**Why `'unreached'` is the load-bearing one.** `test-results.ts`'s own header already
states the rule: *"A validation- or load-failed transcript is a `transcript-end` record
with `status: 'error'` — never a silent skip."* An unreached node is the last case still
exempt from that rule. This is the existing decision finishing its sentence, not a new
concept on the wire.

**Why the stream logs replayed executions in place.** The alternative is suppressing them
and putting a `replayedCommands` total on `run-end` — a derived number on a wire that
would otherwise carry what it is derived from. Logging each execution keeps the stream a
faithful, ordered log; `518 authored + 34 replayed` stays a sum over it. Start/end pairs
are matched positionally (last unclosed start), because a file legitimately appears more
than once in a tree run.

**Rejected**: a `tree` manifest record at `run-start` listing every node — it kills the
streaming property D1 exists for. A separate `tree-node` record for parentage — a second
record per node whose only payload is identity the decoder already has. Bumping to
version 2 — it makes the Swift side version-gate a stream that is byte-identical unless
you asked for a tree.

## References consulted

- `docs/architecture/adrs/adr-277-ide-integrated-testing.md` — D1 owns the record stream this plan extends; its "never a silent skip" rule is the argument for `'unreached'`. Phase 1 amends it.
- `docs/architecture/adrs/adr-302-transcript-branches.md` — D10 (`--chain` retired for trees), D11 (assemble-and-validate whole before executing), D13 (unreached is not failed; one failure + a blocked count), D17 (a child's state is re-executed, never restored; first child continues, siblings replay). These are the semantics the wire must carry; none are re-litigated here.
- `docs/architecture/adrs/adr-301-sharpee-transcript-editor.md` — `Status: TBD — not decided, not scheduled`, with an open question on what hosts the editor. Phase 5 therefore renders into the **existing** Tests panel and does not pre-empt the redesign.
- `docs/work/ide-transcript-editor/research-20260804-transcript-authoring.md` §7 — the supersession keeps branch-column navigation and replay-to-a-point; both need this wire regardless of which host wins.
- `docs/context/session-20260805-1707-…md` and `-1946-…md` — "The IDE Testing wire is unstarted… that was step one of the agreed plan and it remains step one", and the `--tree --json` guard's standing instruction: *"That guard should be removed the moment the IDE wire lands."*
- `tools/ide/README.md` §Conformance — the Swift decoder mirrors `@sharpee/ide-protocol` and rejects unknown `schemaVersion`s loudly; local `xcodebuild test` is the only gate (no CI).
- `packages/branch-tester/src/tree-runner.ts:226` — replayed executions are deliberately absent from `outcomes`, which is why Phase 2 exists at all.

## Phases

### Phase 1: The wire contract + the ADR-277 amendment
- **Tier**: Small
- **Budget**: 150
- **Domain focus**: The record shapes and their decode-boundary guards.
- **Entry state**: `packages/ide-protocol/src/test-results.ts` at `TEST_RESULTS_SCHEMA_VERSION = 1` with six record types. `isRunStartRecord` accepts only `'tests' | 'chain'`; `isTranscriptEndRecord` accepts only `'passed' | 'failed' | 'error'`. Both will reject a tree line today — loudly, which is correct but useless.
- **Deliverable**: The five additions above, each with its guard clause and doc comment carrying the reason (not just the shape). The `actualOutput` comment block is the precedent for how to write "additive, so the version stays 1". Plus a dated amendment to ADR-277 D1 recording the widened contract and the version-stays-1 reasoning, so the next session does not re-derive it.
- **Exit state**: `ide-protocol` suite green, including two regressions that pin the additive claim — a version-1 line *without* any tree field still validates, and a `mode: 'tree'` line is rejected by nothing. No emitter or decoder changed yet; this phase ships a contract, not behavior.

### Phase 2: A streaming seam in the tree runner
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Tree execution as an observable event sequence rather than a returned tally.
- **Entry state**: `runTree` returns `TreeRunResult { outcomes, defects, executedCommands, authoredCommands }`. Replayed executions increment `executedCommands` but are never pushed to `outcomes` (`tree-runner.ts:226`), so nothing downstream can see them. `summarizeTreeRun` is already a pure projection over `outcomes`.
- **Deliverable**: An optional observer on `runTree` — called at each node execution start and end, carrying the node, its parent, whether the execution is a replay, and the `TranscriptResult` when there is one; called for unreached nodes with the blocking origin. No change to the return value, so `summarizeTreeRun` and every existing caller are untouched. Behavior Statement (rule 12) before tests, since this changes when the runner calls out.
- **Exit state**: `branch-tester` suite green at ≥360 with new cases pinning: a linear chain observes zero replays; a fork observes exactly `(siblings − 1)` replayed executions; an interior failure observes its whole blocked subtree once each; observed authored-command totals equal `authoredCommands`. Fernhill through the runner still reports `22 passed`, `552 commands (518 authored + 34 replayed)` — the observer must not change what executes.

### Phase 3: Emission, and the guard comes out
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Projecting the Phase 2 event sequence onto the Phase 1 records.
- **Entry state**: `packages/devkit/src/commands/test.ts:161-168` refuses `--tree --json` with exit 2. `runTreeTestCommand` (`test-tree.ts`) has no `json` parameter. `packages/branch-tester/src/aggregate.ts` is the D15 full-copy of transcript-tester's and currently emits nothing — its CLI writes a results file, not NDJSON.
- **Deliverable**: Tree-aware record builders in **branch-tester's** aggregate (transcript-tester's copy stays flat — the divergence becomes deliberate rather than drift, and the flat path's stream is byte-unchanged); `--json` plumbed through `runTreeTestCommand`, writing records as the observer fires so a long tree run fills a panel live; D11 defects emitted as `transcript-end{status:'error'}` per offending file before `run-end`; the exit-2 guard deleted along with its comment.
- **Exit state**: `./repokit build` clean; `sharpee test --tree --json` against `branch-stories/fernhill` produces a stream that round-trips through `isTestResultRecord` line by line with zero rejections, whose authored/replayed sums equal the reporter's `518 + 34` and whose parentage reconstructs the five-root tree exactly. Same check against `branch-stories/tree-npm-fixture`. Fernhill's non-JSON output byte-identical to before. devkit + branch-tester + transcript-tester suites green.

### Phase 4: The Swift decoder mirror
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: The language-boundary half of the contract (rule 8b's codegen/mirror exception).
- **Entry state**: `tools/ide/SharpeeIDE/Test/TestResultRecord.swift` mirrors version 1's six shapes; `NDJSONLineBuffer.swift` splits the stream; `TestPanelModel.swift` accumulates records flat. README conformance requires the mirror reject unknown `schemaVersion`s loudly.
- **Deliverable**: The five additions mirrored as optionals with the same names, decoding a tree line without loss; a tree-shaped fixture pinned alongside the existing ones; a model-level reconstruction of parentage into a node tree with unreached subtrees attributed to their origin, still holding no view opinion.
- **Exit state**: `xcodebuild test` green (suite was 469, 0 failures at session a17580 — no regression). Decode tests: a real captured Fernhill tree stream reconstructs five roots and the right child counts; a version-1 flat stream still decodes unchanged; an unknown `schemaVersion` still rejects loudly. Note the standing `TestRunnerTests` cancel-timeout recurrence — a Tart-VM cold-run artifact, targeted rerun is the ruling, not a fix.

### Phase 5: The Tests panel renders the tree
- **Tier**: Large
- **Budget**: 350
- **Domain focus**: The smallest honest rendering of tree results in the panel that exists today.
- **Entry state**: `TestPanelView.swift` renders a flat list. ADR-301 is TBD, so the Testing-tab redesign cannot be built and must not be pre-empted.
- **Deliverable**: Nesting by parentage; a blocked subtree shown once under its originating failure rather than as a wall of red (D13's whole point, now visible); replayed executions collapsed or dimmed rather than read as duplicate turns; the run's replay share surfaced from the sums. Click-through to `file:line` preserved.
- **Exit state**: `xcodebuild test` green; a real `--tree --json` run of Fernhill renders five roots with correct nesting, and a deliberately broken interior node renders one failure with its blocked count instead of N failures. `--tree --json` is now a supported path end to end.

## Out of scope

- The ADR-301 Testing-tab redesign (transcript-editor cards, in-place assertion editing, record-from-play into a `.transcript`). Blocked on ADR-301's host decision, which is a design conversation, not a build phase.
- ADR-302 **D6** — coverage of untaken divergences. Still no implementing phase; the tree reports `0 of 12 points fired`. Unchanged by this plan.
- Deleting `Skein/` (12 Swift files). The research doc's supersession list is a real retirement, but it is a separate decision with its own blast radius and should not ride in on a wire change.

## Risks

- **Phase 2 is the only phase that changes execution.** Everything else is additive shape. If the observer perturbs what runs, Fernhill's `552 commands (518 + 34)` moves — that number is the canary, and it is checked in Phases 2 and 3 for exactly this reason.
- **Positional start/end pairing** is a real constraint the Swift side must honor; a decoder that keys on `file` will mis-pair a replayed execution against its authored one. Pinned by a Phase 4 decode test rather than left to a comment.
- **No CI** (`tools/ide/README.md`). Every gate here is a local run, so each phase's exit state names the command that proves it.

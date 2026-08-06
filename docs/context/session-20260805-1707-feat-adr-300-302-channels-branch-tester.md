# Session Summary: 2026-08-05 17:07 CDT - feat/adr-300-302-channels-branch-tester

## Goals
- Re-parent Fernhill's remaining root transcripts onto the spine (a prior-session open item).
- Whatever that surfaced. It surfaced a platform defect, and the fix became an ADR amendment.

## Phase Context
- **Plan**: `docs/work/branch-tester/plan-20260805-branch-tester.md` — 11 phases, all COMPLETE.
- **Phase executed**: none advanced. This session closed a residual item and then amended Phase 6's shipped mechanism (see below).
- **Tool calls used**: ~200.

## Completed

### 1. Re-parented Fernhill's roots (the stated task)
Nine roots became five. Each move was chosen against what the test needs (ADR-302 D7), not against command-list overlap:

- **`dawn-lose` → `continues: timeline`.** The two shared `north` + 13 `wait`s ending on the last-light beat. `timeline` keeps its identity as the D1 dusk test and becomes the parent; `dawn-lose` drops 14 replayed commands and runs 115. The turn arithmetic was measured, not assumed: a probe child of `timeline` ran out of game after exactly 115 waits, fixing the parent's end at turn 15 (`look` costs a turn) and confirming the counter survives the boundary. Small hours land on wait 55 (turn 70), dawn on wait 115 (turn 130), both asserted.
- **`e-group` and `containers` → `continues: arrival`.** Both had Iron Gates / Gravel Drive content *before* their overlap with the spine, so the naive move was impossible. Reversed the approach instead: the spine carries the player to Fountain Court and each test walks back down the drive. Same command count, one word changed each (`north` → `south`).
- **`restart` → `continues: arrival`** — but only after the work in §2. It was a root by necessity for most of the session.
- **`compass`, `phrasebooks`, `recorded` stay roots**, with the reason written into each file: A9 is the first look of a fresh game at Iron Gates; phrasebooks' own commands spend the turn budget to the turn-14 flip and a parent would pre-advance the per-book first-time counters; recorded's goldens are byte-exact from the opening banner.

**Determinism hole closed on the way.** `containers`, `e-group` and `restart` were roots with no `seed:`, so the run header read `Seed: 1785967859529 (clock)` — three nodes running non-deterministically. Under `arrival` they inherit seed 42 (ADR-302 D8). All five remaining roots now declare it.

### 2. Found, filed, and fixed a platform defect (issue #227)
A transcript containing `restart` passed as a root and failed as a child: the ADR-248 ack rendered, nothing reported a failure, and every subsequent command returned `Error: Engine is not running`.

Traced rather than worked around. `GameEngine.registerSaveRestoreHooks` assigns the whole hook object (`this.saveRestoreHooks = hooks`), and restart confirmation lives on that same object as `onRestartRequested`. Bootstrap's boot registers it to set `pendingReboot`; the tree runner's `captureSave` then registered `{ onSaveRequested, onRestoreRequested }` on the same engine and dropped it. The engine defaulted `shouldRestart` to true, acked, called `stop('restart')` — and nothing rebooted. Only nodes with a parent were affected, because `captureSave` runs at a fork.

Filed as [#227](https://github.com/ChicagoDave/sharpee/issues/227), then closed by the fix below.

### 3. ADR-302 D17 — a child's state is re-executed, never restored
David's question ("can we just ban save/restore from testing?") turned the workaround into a decision. Measured before deciding: Fernhill costs 519 commands under restore and 551 under re-execution, **+6.2%**, on a run of about half a second. It is that cheap because a shared prefix saves `(children − 1) × prefix_length` and Fernhill's prefixes are two commands (`arrival` with 11 children, `key` with 4).

Written as **D17** with every superseded claim marked in place: D3's save-cache clause, D10's parallelization mechanism, the worked scenario's "runs once", the Consequences' cache sentence, and **AC-5**, which went from "shared prefixes run once" to "a leaf costs exactly its ancestry, and the replay share is reported." Plan Phase 6 carries a matching SUPERSEDED note. No open questions.

Implementation in `tree-runner.ts`: `captureSave`/`applySave` deleted, the engine surface reduced to `executeCommand` + `getRandomService`, a `GameFactory` added. A node's **first child continues the live engine** — it is already at exactly that state — and only siblings after the first boot and replay. A chain therefore replays nothing and stays one continuous run, which is what D3 means by chains being the linear case.

### 4. Version bump to 4.4.0
`./repokit verify` had never been run on this branch and failed its publish dry-run: `@sharpee/chord` 4.3.0 is already on npm and the branch changed 13 packages without moving any version. Confirmed not branch-introduced — `git diff origin/main..HEAD -- packages/chord/package.json` shows no version line, and `npm view @sharpee/chord version` returns 4.3.0, so main fails identically.

Bumped 34 `package.json` files (33 published + `stories/dungeo`) to **4.4.0**; `engine-version.ts` restamped by the build; `packages/chord/src/version.ts` updated to record the bump. **The Chord language did not move** — it stays frozen at 3.0.0, which `version.ts` already documented as policy ("the next npm publish is 4.4.0").

## Key Decisions

### 1. Re-execution over merging the engine's hook objects
Two other fixes were available and rejected: merging hooks inside `registerSaveRestoreHooks`, or spreading `getSaveRestoreHooks()` in the tree runner. The first changes a public engine contract to preserve a mechanism D17 removes; the second leaves the trap armed for the next caller to buy 6% on the only story that uses it. Recorded in D17's rejected-alternatives paragraph.

### 2. First child continues, siblings replay
Uniform reboot-per-node was considered and rejected: it costs 572 commands instead of 551 and, more importantly, breaks D3's chain property — a 3-node chain would see `a, a, b, a, b, c` instead of one continuous run.

### 3. `reviveEngine` stays
Claimed in conversation that D17 would remove it; that was wrong and is corrected in the ADR. It was introduced for restore, but a first child continuing a parent whose transcript ended in death still needs it. A rebooted sibling never does.

## Corrections made mid-session
- **D5 was already fixed.** Argued initially that re-execution would repair ADR-302 D5's seed-variation branches. The D8 amendment (`reseedStreams`, session 86e85a) had already repaired them, and naive re-execution would have *regressed* the case by letting a child's own seed alter the replayed prefix. D17 preserves the mechanism instead: replay applies each ancestor's *declared* reseed at that ancestor's own boundary, so the prefix stays bit-identical across siblings.
- **The Chord `record` open item was stale.** Carried forward two sessions as "awaiting David's confirmation"; `packages/chord/src/version.ts` already recorded the 2026-08-05 ruling folding it into the frozen 3.0.0.

## Open Items

### Resolved after this list was first written
- The **latent hook collision** was filed as [#229](https://github.com/ChicagoDave/sharpee/issues/229), then fixed at the engine and **closed** — see §5. The survey that produced it found four callers, not the two first recorded here.

### Short Term
- **ADR-131's amendment is owed.** ADR-303 D6 names *whoever accepts ADR-303* as the flip owner, with acceptance as the trigger. ADR-303 did not flip, so ADR-131 correctly still carries its "SCOPE QUESTION OPENED" note rather than the widening. Unowned flips are how Status lines rot; this one has an owner and a trigger and is simply not yet due.
- **ADR-303 is DRAFT and should stay there.** `adr-review` scored it 7/17: no acceptance criteria, no test requirements, no implementation section, and three undefined interfaces — the semantic state signature, the multi-parent syntax, and the `converges-with` grammar. It records decisions, not a buildable spec.
- **The IDE Testing wire is unstarted.** The mocks and the code survey exist; the NDJSON stream still carries no parentage, no `unreached`, and no replay markers, so no view can render the tree. That was step one of the agreed plan and it remains step one.
- `key.transcript`'s description claims "Every test that needs to be inside starts here", which is false (`containers`, `npcs`, `tool-gates`, `fuse` all reach the interior from `arrival`). Predates this session; left alone rather than churn a description.

### Long Term
- ADR-302 **D6** (coverage of untaken divergences) still has no implementing phase; the tree reports `Coverage: 0 of 12 points fired, 12 never fired, 28 classes unobserved`. No AC covers it — but ADR-303 D5 now gives it two concrete motivating cases, which it did not have before.
- **AC-9**'s first clause stays blocked on pre-existing issue #224 (familyzoo tutorial type-check), outside this branch.
- The two published mocks are **artifacts, not repository files**, per the standing rule that IDE work belongs to a parallel session. If the IDE session wants them as source, they need re-creating there rather than copying from the artifact URLs.

## Files Modified

**Story test fixtures** (8): `arrival` (stale child count 11 → 12), `compass`, `containers`, `dawn-lose`, `e-group`, `phrasebooks`, `recorded`, `restart` — all under `branch-stories/fernhill/tests/transcripts/`.

**Platform** (4): `packages/branch-tester/src/{tree-runner,cli,tree-report}.ts`, `scripts/bundle-entry.js` (the bundle's own copy of the boot factory, which keyed roots by an incrementing index and broke under D17).

**Tests** (2): `packages/branch-tester/tests/{tree-runner,tree-report}.test.ts`.

**Docs** (2): `docs/architecture/adrs/adr-302-transcript-branches.md` (D17 + five in-place supersessions), `docs/work/branch-tester/plan-20260805-branch-tester.md` (Phase 6 note).

**Versions** (35): 34 `package.json` + `packages/chord/src/version.ts`; `packages/stdlib/src/actions/standard/version/engine-version.ts` regenerated by the build.

## Notes

**A second copy bit twice.** `freshGameForRoot` exists in both `packages/branch-tester/src/cli.ts` and `scripts/bundle-entry.js`. Updating only the first left the bundle throwing `Cannot read properties of undefined (reading 'transcript')` on the first fork. The bundle copy also revealed a real hazard the package copy shared: a re-boot must re-pin the seed the root *actually* booted with, or a root with no `seed:` would draw a fresh clock seed per boot and its replayed prefix would diverge. Both now remember it. This did not bite Fernhill only because every root had already been given an explicit seed in §1.

### 5. Closed the latent form at the engine (issue #229), after the merge
Filed #229 for the general form of #227 — `registerSaveRestoreHooks` assigning
wholesale, so any caller silently disables restart — then, on David's call, fixed it.

A survey found **four** remaining callers, not two: the ADR-300 D18 divergence save
and the `$save`/`$restore` directives in each harness's `runner.ts`, plus
`searchOutcome`'s per-candidate restore in each `search.ts`. v1 is closer to the
trigger than v2, because a chain shares one live engine across files — a blessed
golden on any member plus a `restart` in a later member arms it. Confirmed not live:
`grep -ln "^> restart" stories/dungeo/walkthroughs/*.transcript` is empty.

The engine now merges: named entries replace, unnamed survive, removal is spelled by
naming an entry `undefined`. `save()`/`restore()` guard on the specific hook they need
rather than on "some hooks exist", so a partial registration reports "no capability"
instead of calling `undefined` and reporting the TypeError as a failure. Bootstrap's
`as any` cast is gone — partial registration is now expressible.

**A second consequence, under-called before it showed as red tests:** merging
necessarily **snapshots**. The engine holds a copy, so mutating a registered hooks
object no longer reaches it. Eight `platform-operations.test.ts` cases relied on
exactly that aliasing, and two more used `registerSaveRestoreHooks({})` to mean
"clear", which merging makes a no-op. The source-caller survey that preceded the
change looked for reliance on replacement and correctly found none — it never looked
at tests, and that is where it lived. Recorded in the method's contract doc.

ADR-302 D17's rejected-alternatives paragraph is amended in place: it argued against
the engine merge while the tree walk was the collision's only victim, which the
four-caller survey disproved. D17 itself stands — re-execution was chosen on its own
terms, and the engine fix closes callers D17 never reached.

### 6. ADR-303 written and interviewed to resolution
Two gaps David raised while reviewing the IDE Testing mocks, neither considered by
ADR-302: open-world paths **reconverge** ("do one of three things, then go to a
room"), and an **unwinnable state is not a losing ending** — it has no ending, no
message and no test, which is why it ships.

Written as a **new** ADR rather than reopening ADR-302, which stays ACCEPTED: these
are questions raised *by* its usage, not left unresolved *within* it. All three open
questions were then resolved by interview the same session:

- **D4** — a converging variant declares `converges-with:` and the harness *verifies*
  it before a shared tail runs once; what must match is author-named. Re-running the
  tail under every route is a per-fork opt-in, expressed as several parents and
  **expanded to N single-ancestry runs** so every ADR-302 invariant holds per run.
  `converges-with` does **not** inherit — declared-only, the same keying `reseedFor`
  uses, because inheritance is right for a setting and wrong for an instruction.
- **D5** — three detection layers (declared invariants, irreversibility flags,
  probing). Probing replays the story's own answer key rather than searching: one
  walkthrough per probe, not an exponential search. Fernhill's 19 leaves ≈ 1000
  commands, under a second. Deep parallel mode on demand. Unwinnable is reported by
  the coverage surface and stays out of the point-and-class catalog.
- **D6** — ADR-131's explorer is widened rather than replaced (its "avoids
  puzzle-solving" exclusion survives, because replaying an answer key solves
  nothing), and the static dead-end/one-way analysis moves from the VS Code
  extension to the IDE.

**A shared primitive fell out of it**: D4's "does this variant arrive where its
sibling arrives" and D5's "have I seen this state before" are the same operation —
a semantic world-state signature that ignores turn counters and RNG streams. Built
once, it serves both.

`adr-review` then scored it **7/17, NEEDS WORK**, and caught two citation failures
worth recording: ADR-293 **D15 is the coverage report, not a registry** (the catalog
is D2/D4), which made D5's central sentence self-contradictory; and **Miller columns
were attributed to ADR-301**, which is TBD and specifies no surface — the design came
from this session's mocks. Both corrected in place with dated notes, along with a
D8 inheritance gap and a D1 heading that contradicted D5 once the citation was fixed.
The ADR stays **DRAFT**: no acceptance criteria, no test requirements, no
implementation section, and three interfaces still undefined.

### 7. IDE Testing mocks (artifacts, not committed)
Two published artifacts — a Testing-tab mock and a layout study — built on the
shell's own Catppuccin tokens from `Theme.swift`. The layout study measured the
real 22-node tree in three layouts and killed the horizontal canvas: vertical extent
tracks leaf count, not depth, so a depth-3 tree costs ~800px, and lineage colour
would need 12 hues for one fan-out. David's call was Miller columns (Finder), which
makes ancestry spatial and needs no palette. A run-folding idea for deep chains was
built at his request and then removed at his request — it was the one departure from
Finder and hid nodes behind a summary.

Surveyed rather than assumed: `TestPanelView` is **already** an `NSOutlineView`
whose data source is two levels deep (entries → their commands), so click-to-expand
turns exists today. What is missing is a level *above* it — entry-to-entry
parentage — plus `.unreached` on `Status`, and a wire that carries any of it.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: three independently revertible commits, all merged to `main` — `af78363c` (D17 + 4.4.0), `f878a80c` (engine hook merge), `4c767e69` (ADR-303, docs only). D17's deleted `captureSave`/`applySave` are recorded in a comment at their old site.
- **Landed**: PR [#228](https://github.com/ChicagoDave/sharpee/pull/228) → `8f2f241e`, PR [#230](https://github.com/ChicagoDave/sharpee/pull/230) → `ea996c7d`. Branch level with `main`; working tree clean apart from the untracked `scripts/clodpod.sh`.

## Dependency/Prerequisite Check

- **Prerequisites met**: the Phase 6 tree runner, the D8 `reseedStreams` amendment (which D17 depends on and preserves), and Fernhill's assembled tree.
- **Prerequisites discovered**: `./repokit verify` cannot pass from a feature branch without a version bump, since the dry-run refuses to republish a live version. Not previously recorded in the plan.

## Architectural Decisions

- **ADR-302 D17** written and applied this session (see §3). Five in-place supersessions marked, AC-5 rewritten, no open questions.
- Patterns applied: D7 (parents authored against what a test needs), D8 (header inheritance; declared-not-inherited reseed keying), D3 (chains as the linear case, preserved by first-child-continues).

## Mutation Audit

`runTree` is the session's one side-effect function. Behavior Statement produced before its tests (rule 12): DOES — executes each node's transcript, appends exactly one outcome per node, returns `executedCommands` and `authoredCommands`, and at a fork boots a fresh game and re-executes the ancestry with each ancestor's declared reseed at its own boundary. REJECTS WHEN — the tree has defects (returns them, executes nothing); a fork needs a boot and no factory was supplied (throws, naming the stem); a replayed ancestor disagrees with the run it already passed (throws as non-determinism). Each line has a test. The `mutation-verification` agent was not run — subagents are disabled in this session's configuration.

## Recurrence Check

- Similar to past issue? **YES, partially.** #226 ("restore leaves no residue between sibling branches", fixed last session) and #227 are both save/restore-between-siblings defects. D17 removes the mechanism both lived in, which is the systemic rather than individual fix. The two latent sites in Open Items are the same class and are *not* covered.

## Test Coverage Delta

- Tests added: **3 net** in `tree-runner.test.ts` (349 → 352), including the direct #227 regression — "the walk registers no save/restore hooks at all" — plus a no-factory-at-a-fork error case and a non-deterministic-replay case. The old AC-5 test was rewritten to the amended criterion rather than deleted.
- Evidence, all executed 2026-08-05 in-session: Fernhill tree `22 passed`, `552 commands (518 authored + 34 replayed)`; branch-tester `352 passed (27 files)`; transcript-tester `253 passed (21 files)`; stdlib `1604 passed, 27 skipped (112 files)`; Dungeo v1 chain `952 passed`; `./repokit verify` → `✓ Published 33 package(s) (dry run)` / `verify: npm build + publish dry-run OK`.
- Known untested areas: ADR-302 D6 (unimplemented); the two latent hook-collision sites in Open Items.

---

**Progressive update**: Session completed 2026-08-05, ~19:05 CDT — finalized after both PRs merged.

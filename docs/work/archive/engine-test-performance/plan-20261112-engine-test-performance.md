# Session Plan: Engine test performance — a measured survey, and branch testing in seconds

**Created**: 2026-11-12
**Plan Status**: DONE
**Overall scope**: Measure where a `sharpee test` run spends its time on the engine side (compile, boot, the turn, save and restore, the three tiers), fix what the measurements rank, and add caching and reuse that make test runs fast, branch testing (tree, derived and claims tiers) start to finish. The plan ends with a measured before and after of a whole `sharpee test` run so David can rule on whether the branch-testing paradigm stays. The browser client and the IDE are out of scope.
**Bounded contexts touched**: N/A — infrastructure/tooling (test-run performance across `packages/engine`, `packages/world-model`, `packages/bootstrap`, `packages/stdlib`, `packages/transcript-tester`, `packages/branch-tester`, `packages/devkit`)
**Key domain language**: line, fork card, prefix replay, derived row, walk state identity, necessary set

## References consulted
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md` — D5 ("fresh boot + deterministic replay at the pinned seed") is the decision restore-at-fork changes, so it takes a dated amendment or a superseding record before code (Phase 4). D4 ("recorded state is never the truth; it is re-derivable at any time") stays: a fork save may be captured and restored only within the run that replayed the current story, never persisted. The Consequences keep "the replay driver and its determinism contract".
- `docs/architecture/adrs/adr-302-transcript-branches.md` — D17 ("a child's starting state is RE-EXECUTED, never restored") is where D5's rule comes from, and it gives two reasons: the save/restore hook collision (#227, closed 2026-08-05; `registerSaveRestoreHooks` now merges, at `packages/engine/src/game-engine.ts:1370`), and "restoring made the save format a correctness dependency of the harness". The second reason still holds, and Phase 4's equivalence proof has to answer it. D16 plus its ADR-395 note: the tree harness reads `branch-stories/` and `test-stories/`; the transcript harness reads neither.
- `docs/architecture/adrs/adr-395-exploring-tests-run-on-test-stories.md` — D7: no gated test walks or derives over a real story other than Dungeo, and no Demonstration cites `./sharpee test` on one as a floor. D8: the scale check is gone, and no timing gate comes back. D5: a test story's regression is its test set's pass history, so a moved pin goes to David as a list. Consequence: "Nothing watches walk speed at scale". This plan's instrument stays on demand, outside every gate.
- `docs/architecture/adrs/adr-390-the-player-is-a-role-the-session-holds.md` — D1: the role flag on the actor is the one world fact; `playerCharacter` "scans the actors"; there is no stored holder. Consequence: "there is no second place to disagree with". A faster lookup may narrow the scan, but it may not cache the holder unless ADR-390 is amended (Phase 3).
- `docs/architecture/adrs/adr-348-the-world-is-authoritative-on-restore.md` — any path that replaces the world (restore, undo) must re-derive its derived views or declare the gap. A new world-model index (Phase 3) is a derived view that `loadJSON` must rebuild, and every in-run restore (Phases 4 and 5) goes through the engine's existing restore, which already re-derives the ending and phase.
- `docs/architecture/adrs/adr-365-claims-under-a-necessary-set.md` — the walk forks the real engine's save state (it preserves ADR-293 D12: search runs the real engine, never a model). A restore replaces entity instances, so anything held across a restore must be looked up again by id (the flag-predicate defect in its Context). D2: a proposal is "never a source the walk reads on its own". D9: claims never gate. The walk's state identity (#688) belongs to this record.
- `docs/architecture/adrs/adr-367-a-reached-state-can-be-locked-as-a-claim.md` — keeps ADR-365 D2 whole ("the walk reads only what is written") and records that the runner "has no memory of a previous run". Stored witnesses and cached walk verdicts each change that, so each needs a decision record before it is built (Phase 6). The floor and pin vocabulary (held by line / by walk) must come out the same.
- `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md` — read for the derived tier's boot rule. No decision requires a fresh boot per derived row (the boot-per-row is inherited mechanism, not a decision). The 2026-09-27 amendment: a line runs through its first END STATE card and stops, and a branch forking at or after that card is blocked.
- `docs/core-concepts/README.md` — branch-tester owns the tree runtime that `sharpee test` and the IDE's Testing tab both use, so the testing surface's suite is a consumer in this plan's floor. The platform is secondary to Chord and the IDE: a `packages/` change has to earn its place, and here the reason is that the author's test loop gets fast.
- `docs/context/project-profile.md` — Vitest per package through `test:ci`. For refactors the profile records two practices: byte-identical output before and after, and a `git stash` toggle that proves the new path is exercised. `packages/bootstrap` keeps its tests in `src/`. Secret Letter is ON HOLD as port work and is measured only as an instrument.
- `docs/context/session-20261111-0210-main.md` — open items #583 (lens pins, out of scope) and #587 (wall-clock seconds in claims-runner's byte-compared stderr, still open). Since the small-test-stories plan, the turbo gate's vitest time is 72 s and the four test stories carry 44 of the 45 obligations.
- ADR location: this repository keeps ADRs under `docs/architecture/adrs/`, not `docs/adrs/` (descriptor `adrLocationCheck: declined`). The records above are the ones the brief named, plus the three that a search of the directory for undo, restore and derived-tier subjects turned up (ADR-348, ADR-356; ADR-302 D17 was found inside ADR-302). The other ADRs were not read.
- Product ADRs not consulted (no Scope intersection): none

## Ground rules

- **Platform go, per phase.** Every phase except 2 and 7 changes `packages/`. Each of those phases opens by telling David what it changes (files, behavior, any report or observer field that moves) and stops for his go before the first edit (CLAUDE.md). Extensions count as platform changes.
- **Single runs, no retries.** Each measurement and each Demonstration is one run. A failed build or test is reported, and the session waits.
- **Real stories are on-demand instruments only.** Fernhill and Secret Letter (and Dungeo) are measured by the on-demand instrument under `scripts/perf/` (new). No gated test walks or derives over them, and nothing anywhere asserts a time (ADR-395 D7, D8; no CI gates).
- **Counts are committed; milliseconds are on demand.** A committed assertion pins a count (boots per run, commands replayed, serializations per turn or per walk state), never wall-clock time. Every committed count assertion and every instrument ships with a fixture it is known to fail on (DevArch rule 13, ADR-0054).
- **The equivalence standard.** Any change to how a state is reached must leave the verdict digest of every test story identical to the Phase 2 baseline (`diff` prints nothing). It is also checked on demand against Secret Letter's. Secret Letter is evidence, not a floor (ADR-395 D7): a difference found there is a finding. It becomes a new obligation in a test story's test set (ADR-395 Consequences), and the phase completes once that test story carries the case and passes. A moved pin is listed for David, never re-recorded silently (ADR-395 D5).
- **Order after the survey is provisional.** Phases 3 to 6 may be reordered, merged or dropped on Phase 2's ranked table, with David's go, and the change is written into this plan before the affected phase starts. Phase 1 stays first and Phase 7 stays last.
- **Out of scope**: the browser client, the IDE (#550, ADR-353 D4), and #583. The IDE testing surface consumes branch-tester, so its suite is in the floor, and a branch-tester report or observer change carries its consumer edits in the same commit.
- **New code**: no `unknown` or `any`, no abbreviations in identifiers, no backward-compatibility shims. Evidence goes inline: the command, its result, the date.
- **The floor** (each command run once):
  - `pnpm --filter ./packages/branch-tester test:ci`, `pnpm --filter ./packages/devkit test:ci`, and the suites of any other package the phase touches.
  - `pnpm test:scripts`, after `./repokit build dungeo`.
  - The testing-surface suite, run with vitest from `tools/ide/web/testing-surface/`.
  - Dungeo's walkthrough chain: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`.

## Starting measurements (2026-11-12, scratch scripts, read-only; Phase 2 confirms or replaces them)

- Whole run, `node packages/devkit/dist/cli.js test branch-stories/<story> --json`:
  - Fernhill (65 entities, 13 rooms): 2.3 s total. Tree tier 0.4 s (11 lines, 86 cards), derived tier 0.4 s (63 rows), claims tier 1.2 s.
  - Secret Letter (479 entities, 92 rooms): 271 s total. Tree tier 133 s (106 lines, 1,470 own cards, 19,562 replayed prefix commands, deepest prefix 795). Derived tier 138 s (1,737 rows, about 80 ms a row, against about 6 ms a row on Fernhill).
- Primitives on Secret Letter: compile 138 ms, boot about 40 ms, captureSave 11 to 16 ms (87 KB), restoreSave 3 to 4 ms, world serialization 2.2 ms (747 KB) plus 1.1 ms to parse it again.
- The turn: 5.28 ms on Secret Letter, 1.11 ms on Fernhill.
  - Secret Letter's shares: 28.5% the per-turn undo snapshot (`createUndoSnapshot` serializes the whole world every turn); 18.4% the entity trait check; 9.3% the player-role scan (`playerRoleHolders` walks every entity, and command-validator calls it once per candidate entity); 6.3% `deriveNameVocabulary`; parser 8.8%.
  - With `maxUndoSnapshots: 0` the turn is 3.87 ms on Secret Letter and 0.77 ms on Fernhill. Today only `seed` reaches the engine config from `assembleGame`, so no test runner can set this switch.
- Equivalence spike: on one fork (turn 50) and the 25 turns after it on Secret Letter, a restored run and a replayed run matched on every event type and message id. The only difference was an internal event id built from a timestamp and a random suffix.
- Estimates, not measurements: restore-at-fork puts Secret Letter's tree tier near 12 s; one booted snapshot restored per derived row puts that tier near 25 s; a narrowed player lookup puts a turn near 2.2 ms.
- The scratch profiler `profile-turn.js` was written this session in its scratchpad. Phase 2 commits its successor; nothing in the scratchpad survives the session.

## Phases

### Phase 1: Claims walk soundness — a walk outside its set, an identity by exclusion, no wall clock in byte-compared output
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The claims walk in `packages/branch-tester` (ADR-365). David ranks these correctness defects ahead of the performance work, and the claims tier's cost can only be baselined honestly once its state identity is right.
- **Entry state**: No plan phase is in flight. #687, #688 and #587 are open. David has given his go on three points, put to him before any edit:
  1. What a walk whose starting room is outside its set reports. The issue's direction is an explicit unproven verdict (start outside the set), never held.
  2. The identity rule. #688's direction is the full world snapshot minus a declared ignore list, in place of the eleven-trait include list.
  3. Whether that rule takes a dated note on ADR-365.
- **Deliverable**:
  - The verdict at the `never` line of `packages/branch-tester/src/claims/claims-walk.ts#walkClaims` no longer holds a claim for a walk that never left a start outside its set (#687).
  - `packages/branch-tester/src/claims/claims-walk.ts#necessaryIdentity` builds identity by David's rule (#688), and its ignore list is written down with a reason for each entry.
  - The wall-clock seconds leave the byte-compared report line in `packages/branch-tester/src/claims/claims-runner.ts#formatClaimsRun` (#587).
  - Two branch-tester fixtures, each one a case the current code is known to get wrong: a walk that starts outside its set, and two worlds that differ only in a Chord counter.
  - A census of every test-story pin the identity change moves, taken to David before anything is re-recorded. A finer identity means more states, so it covers state counts, witness paths, and any verdict that now stops on its budget (ADR-365's Consequence on padded sets).
- **Files**: `packages/branch-tester/src/claims/`, `packages/branch-tester/tests/`, `packages/devkit/src/commands/test-claims.ts`, `packages/devkit/tests/`, `test-stories/`, `tools/ide/web/testing-surface/tests/`, `docs/architecture/adrs/adr-365-claims-under-a-necessary-set.md`
- **Exit state**: A `never` claim on a walk that checked nothing is no longer reported held. Two worlds that differ only in a field off the old include list are distinct walk states. `sharpee test` output carries no wall-clock seconds in a byte-compared line. Every moved pin is re-recorded on David's ruling. #687, #688 and #587 are ready to close.
- **Demonstration**:
  - The two new fixtures, run under `git stash` with the fix stashed, fail. With the fix in place they pass.
  - `pnpm --filter ./packages/branch-tester test:ci` and `pnpm --filter ./packages/devkit test:ci` are green, and the testing-surface suite is green.
  - `node packages/devkit/dist/cli.js test test-stories/ferry` prints a claims report with no seconds figure in it.
  - The census is shown with David's ruling beside each line.
- **Demonstrated**: [reported: session e4b2c8, 2026-11-12, each command run once] David's go: "platform changes are approved - proceed"; on the identity, "B" (the ignore list also names the random cursor, the clause firing counters and `textState`, after the measurement recorded in ADR-365's 2026-11-12 note); then "you can push through phase 2 and 3", given while away. **Fixtures under the stash toggle**: with `packages/branch-tester/src` and `packages/devkit/src` stashed, `vitest run tests/claims-outside-set.test.ts` gave "4 failed | 2 passed (6)" (`expected 'held' to be 'unproven'`); with `claims-walk.ts` alone stashed, `tests/claim-identity.test.ts` gave "1 failed | 10 passed (11)" (`expected 'held' to be 'violated'` on the counter fixture); with the fix in place both pass. **Floor**: `pnpm --filter ./packages/branch-tester test:ci` "Test Files 31 passed (31)", "Tests 401 passed (401)"; `pnpm --filter ./packages/devkit test:ci` "31 passed | 1 skipped (32)", "208 passed | 1 skipped (209)"; the testing-surface suite "25 passed (25)", "255 passed (255)"; `pnpm test:scripts` "17 passed (17)", "103 passed (103)"; Dungeo's chain "949 passed". The testing-surface and scripts runs were made after the identity change and before the pins below were re-recorded; no file either suite reads changed after. **The report**: `node packages/devkit/dist/cli.js test test-stories/ferry` prints "3 walks" and no seconds figure (run before the identity change; the walks line is unchanged by it). **The census, re-recorded without David's line-by-line ruling, on his "push through" — for his review**: no verdict and no witness moved on any test story; six pins moved. (1) `claims-cone-acceptance.test.ts`, bazaar's trimmed set: 2 states to 4. (2) `claims-inert-line.test.ts`: 4 to 16. (3) `claims-real-path.test.ts`, lodge's "the Study is reached without the brandy": 9 to 19. (4) devkit `claim-broken.test.ts`, ferry's breaking edit: `max-depth-reached after 159 states` to 473. (5) `claims-walk.test.ts` AC-5: reading the note now leaves a trace, so the pin moved from a flag claim on reading (2 states against 4) to an event claim on examining (4 against 6); this one changes the test's vehicle, not only a number. (6) devkit `test-claims.test.ts` and `claim-command.test.ts`: the walks line lost its seconds. Each rise is the rooms' visited marks and trait fields the include list left out. **Left for David**: `packages/branch-tester/tests/fixtures/claims/no-claims.json` is read by nothing now and was not deleted; `tools/explorer-probe/explore.js` keeps its own include-list identity (#583's tool, out of scope); #689 filed. #687, #688 and #587 are ready to close and were not closed. [verified: event log 2026-11-12T11:41:44Z "Tests passed: 17 passed 103 passed" (`pnpm test:scripts`, after the identity change landed at 11:39:06Z); the testing-surface row at 11:33:42Z predates that change; every other figure on this line reported by session, unverified]
- **Status**: DONE

### Phase 2: The survey — a committed on-demand instrument, a baseline, and one ranked table
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Measurement only. No `packages/` edit; every count is taken by wrapping loaders, engines and worlds from outside. The instrument is on demand, outside every gate: it is not under `scripts/__tests__/` and not in any turbo task.
- **Entry state**: Phase 1 is DONE, so the claims tier is measured with its corrected identity. The bundle and the devkit CLI are built.
- **Deliverable**:
  - `scripts/perf/survey-test-run.mjs` (new), measuring on Fernhill, Secret Letter and Dungeo (Dungeo has no test tree, so its rows stop at the primitives and the walkthrough chain):
    - compile, and boot;
    - a turn, by kind of command: movement, look and examine, manipulation, refused or unparsed, meta;
    - the undo snapshot's share of a turn;
    - save, and restore;
    - a derived row, split into boot, arrange, command and claims. This explains, or bounds, the unexplained 80 ms row against a 40 ms boot;
    - a walk step;
    - a whole `sharpee test` run, by tier.
  - Counts, from the same instrument:
    - compiles per run, and boots per tier;
    - authored commands against replayed ones;
    - serializations per turn and per walk state;
    - derived rows that boot, that skip, and that only read;
    - callers of the trait check and the player-role scan;
    - whether any tree line, derived row or walk candidate can type `undo`. That answer decides Phase 3's switch rule.
  - A per-fork equivalence mode. At every fork of the trees of lodge, ferry and orchard, and on demand at Secret Letter's, it compares a restored world with a replayed one: the world serialization minus a declared list of volatile fields, then the event types and message ids of the next 25 turns.
  - A verdicts mode. It writes a normalized, timing-free digest (per card, per derived row, per claim) to `docs/work/engine-test-performance/baseline/` (new) for lodge, bazaar, ferry, orchard and Secret Letter. These digests are the equivalence baseline for later phases.
  - A self-check mode that runs the counters over `test-stories/ferry` with a deliberately doubled loader and exits non-zero unless it reports the doubled boot count. This is the instrument's fixture known to fail (ADR-0054).
  - `docs/work/engine-test-performance/survey.md` (new): one ranked table. Each row gives its share of a whole run on each story, whether it grows with story size (Fernhill against Secret Letter), a rough fix size, the platform files a fix would touch, and the phase it would land in. The equivalence results and the baseline whole-run times sit beside the table.
- **Files**: `scripts/perf/` (new), `docs/work/engine-test-performance/survey.md` (new), `docs/work/engine-test-performance/baseline/` (new)
- **Exit state**: The ranked table exists, every number in it carries its command and date, the baseline digests are committed, and every fork compared is either equivalent or named as a difference. David has approved the order of Phases 3 to 6, or a reorder, merge or drop recorded in this plan.
- **Demonstration**:
  - `node scripts/perf/survey-test-run.mjs --self-check` exits non-zero on the doubled loader and reports the doubled count.
  - The survey run on secret-letter and fernhill prints the table rows recorded in `docs/work/engine-test-performance/survey.md`, and the equivalence mode prints its per-fork result for each test story.
  - `git diff --stat` shows no path under `packages/`.
- **Demonstrated**: [reported: session e4b2c8, 2026-11-12, each command run once] `node scripts/perf/survey-test-run.mjs --self-check` printed `"honestBoots": 9, "doubledLoaderBoots": 18, "detected": true` and exited 1 (its pass: the doubled loader was seen; exit 2 would mean the counter is blind). The survey on secret-letter and fernhill printed the rows recorded in `docs/work/engine-test-performance/survey.md` (whole runs 257.3 s and 5.49 s; a turn 5.69 ms and 1.59 ms). The equivalence mode printed, per story: ferry 1 of 1 forks equivalent, orchard 3 of 3, fernhill 10 of 10, secret-letter 101 of 105, with the four differing forks named in `survey.md`; lodge and bazaar have no fork. Baseline digests are under `docs/work/engine-test-performance/baseline/`; lodge, ferry and orchard repeated byte-identical, and bazaar's is empty because it has no tree. Phase 2 changed no path under `packages/`: `git status --short` lists `scripts/perf/`, `survey.md` and `baseline/` as its additions, and every `packages/` path it shows is Phase 1's uncommitted work. **Not met as written**: "David has approved the order of Phases 3 to 6". He was away; his standing word was "you can push through phase 2 and 3", so Phase 3 runs as written and the order of 4 to 6 waits for him. Two things the survey puts to him: the story is compiled again on every boot (35% of Secret Letter's run, no phase names it), and four of Secret Letter's 105 forks are not equivalent after a restore, which is Phase 4's stop.
- **Status**: DONE

### Phase 3: The engine turn — the undo snapshot reachable from test runs, and the player lookup without the whole-world scan
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The turn cycle (`packages/engine`, `packages/world-model`, `packages/stdlib`), and the boot path (`packages/bootstrap`) that every runner goes through.
- **Entry state**: Phase 2 is DONE and its table ranks the turn items. David has given his go on:
  1. The undo rule. Either runners switch snapshots off for any engine that cannot be asked to `undo` (decided from the commands it will run), or the snapshot gets cheaper for everyone.
  2. The player lookup's shape. The preferred shape is an index of the entities that carry the actor trait, so the scan reads each actor's flag live and no holder is stored. That keeps ADR-390 D1 as written, where a cached holder would need an ADR-390 amendment.
  3. Whether the per-candidate call in command-validator and `deriveNameVocabulary` are worth touching, as ranked.
- **Deliverable**:
  - An `assembleGame` option in `packages/bootstrap/src/index.ts#assembleGame` that reaches the engine's undo depth. The tree walker, the derived runner and the claims walk use it by David's rule, and an engine that can still be asked to `undo` keeps its snapshots.
  - `packages/world-model/src/world/WorldModel.ts#playerRoleHolders` scans actors only, through an index that `loadJSON` rebuilds (ADR-348) and that never misses an entity carrying the actor trait. That includes a trait added by hand after the world is built, and a flag flipped by hand is read live. On the turn the role moves, the holder reads exactly as it does today. #618 (presence tagged for the old player on that turn) is neither fixed nor changed here.
  - The ranked smaller items, if David approved them: the lookup hoisted out of the per-candidate loop in `packages/stdlib/src/validation/command-validator.ts`, and a memoized `packages/world-model/src/traits/identity/name-vocabulary.ts#deriveNameVocabulary`.
  - Behavior statements, plus tests derived from them:
    - a world-model test that the lookup reads no entity without the actor trait;
    - a test that a hand-flipped flag and a hand-added actor are both found;
    - a test that a restore rebuilds the index;
    - a branch-tester count assertion that a test-story tree run makes zero undo serializations, alongside its fixture known to fail: a fixture line that types `undo`, which keeps its snapshot and whose undo succeeds.
- **Files**: `packages/bootstrap/src/`, `packages/engine/src/game-engine.ts`, `packages/engine/src/session/save-restore-service.ts`, `packages/engine/tests/`, `packages/world-model/src/world/WorldModel.ts`, `packages/world-model/src/entities/if-entity.ts`, `packages/world-model/src/traits/identity/name-vocabulary.ts`, `packages/world-model/tests/`, `packages/stdlib/src/validation/command-validator.ts`, `packages/stdlib/tests/`, `packages/branch-tester/src/`, `packages/branch-tester/tests/`, `packages/devkit/src/commands/`
- **Exit state**: A test run's engines make no undo serialization unless they can be asked to `undo`. The engine's default undo depth for play is unchanged. The player lookup no longer walks every entity. Every test story's verdict digest is identical to the baseline.
- **Demonstration**:
  - The package suites are green: `pnpm --filter ./packages/world-model test:ci`, `pnpm --filter ./packages/engine test:ci`, `pnpm --filter ./packages/stdlib test:ci`, `pnpm --filter ./packages/bootstrap test:ci`, `pnpm --filter ./packages/branch-tester test:ci` and `pnpm --filter ./packages/devkit test:ci`.
  - After `./repokit build dungeo`, Dungeo's chain is green, and so is `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/undo-basic.transcript`.
  - The verdict digests of lodge, bazaar, ferry and orchard diff empty against `docs/work/engine-test-performance/baseline/`.
  - On demand, the survey's turn rows for secret-letter and fernhill are recorded in milliseconds, beside the baseline's.
- **Demonstrated**: [reported: session e4b2c8, 2026-11-12, each command run once after the last `./repokit build dungeo`] David's go for the phase was given ahead, while away ("you can push through phase 2 and 3"); the three Entry points were therefore taken as the plan words them, not ruled on: (1) runners switch snapshots off for an engine none of whose commands can ask for undo; (2) the index of actors, flag read live, no holder stored; (3) the smaller items were NOT done, because the survey ranks them last and unmeasured (`survey.md`, row 7). **Suites**: world-model "108 passed (108)", "1702 passed (1702)"; engine "99 passed (99)", "884 passed | 7 skipped (891)"; stdlib "151 passed (151)", "1955 passed (1955)"; bootstrap "6 passed (6)", "57 passed (57)"; branch-tester "32 passed (32)", "405 passed (405)"; devkit "32 passed | 1 skipped (33)", "210 passed | 1 skipped (211)"; queries "102 passed (102)"; `pnpm test:scripts` "103 passed (103)"; the testing surface "255 passed (255)". **Dungeo**: the chain "949 passed"; `undo-basic.transcript` "5 passed". **Digests**: lodge, ferry and orchard each `diff` empty against `baseline/` (bazaar has no tree and an empty digest); on demand, Secret Letter's digest also diffs empty. **On demand, in milliseconds** (`survey.md`, "After Phase 3"): Secret Letter's whole run 257.3 s to 183.7 s, its tree tier 127.0 s to 58.0 s, a turn 5.69 ms to 4.28 ms with the player-role scan's share 28.8% to 3.8%; Fernhill's whole run 5.49 s to 4.81 s. **One build failure on the way, fixed and rebuilt once without David**: the first build stopped at `@sharpee/queries` (TS2430) because the new private method was named `actors`, the name of a public entry point that package adds to `WorldModel`; it is `actorEntities` now. **Found by mutation-verification and fixed**: an undo chained onto another command on one card (`take crate. undo`) was not seen by the check, so the word now counts anywhere in a line; `IFEntity.traits` is `readonly`; tests added for devkit's loader, for what the claims runner asks of its loader, and for the entity map's `set` and `clear`. **Left open**: a story's own word for undo is seen by neither the engine's snapshot stage nor the runners (#690). The count assertion and its fixture known to fail are `packages/branch-tester/tests/tree-undo-snapshots.test.ts` (zero serializations without `undo`; with `undo` typed, snapshots kept and the crate back in the Shed). [verified: event log 2026-11-12T12:23:25Z "Tests passed: 17 passed 103 passed 2 passed 102 passed 25 passed 255 passed" (`pnpm test:scripts`, queries, the testing surface), after the last source edit at 12:20:51Z and the 12:22:29Z bundle; `undo-basic.transcript` re-run on that bundle by the summary writer at 2026-11-12 18:07 CST, "5 passed (38ms)"; every other figure on this line reported by session, unverified]
- **Status**: DONE

### Phase 4: The tree walker restores at forks — ADR-307 D5 and ADR-302 D17 amended first
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The tree tier (`packages/branch-tester/src/tree-walker.ts`), and the decision record it changes.
- **Entry state**: Phase 2's equivalence mode found every fork of every test story, and of Secret Letter, equivalent apart from the declared volatile fields. If any fork differs, that save gap is the finding: the phase stops and David rules (fix the save, or drop restore). David has given his go on two things:
  1. The amendment text. It is a dated amendment to ADR-307 D5 and to ADR-302 D17, or one superseding record, and it answers D17's second reason by naming this plan's equivalence proof as the guard.
  2. What the run report's "N commands (A authored + R replayed)" line and the observer's `replayedCommands` field become.
- **Ruling on the save gap (David, 2026-11-12, session a64f6a): fix the save.** The four differing forks were two things. Two (`oq73o01x`, `ozqxlw3l`) were a real gap: a save taken before the story's first random draw carries no `chord.rng`, and the evaluator then carried on from its in-memory stream. Fixed in `packages/story-loader/src/evaluator.ts` (`cursorOf`: no stored cursor means the story seed), with a test in `packages/story-loader/tests/scheduler.test.ts` that fails without it. The other two (`cqigz7ic`, `irrp8zkt`) were the survey's own artifact: it stepped two live games side by side, and the description-marker gates are one process-wide registry (GH #691), so the replayed game read the restored game's world. The equivalence mode now plays the two games one after the other and compares rendered blocks as well as the world. After the fix, `node scripts/perf/survey-test-run.mjs --equivalence branch-stories/secret-letter` (2026-11-12): 105 forks, 105 equivalent. The same mode on orchard: 3 of 3; on ferry: 1 of 1.
- **The two go-aheads (David, 2026-11-12, session a64f6a: "A").** The amendment text is accepted as drafted (`amendment-draft-20261112.md`) and is written into ADR-307 D5 with a note under ADR-302 D17. The report line is option A: `N commands (A authored + R replayed), F restored at a fork`; `onLineStart` keeps `replayedCommands` and gains `restored`; the run result gains `forkRestores`. One rule the draft added that this phase's Deliverable did not name: a line whose own cards type `undo` still boots fresh and replays, because a save carries no undo history.
- **Deliverable**:
  - The amendment (or superseding record), written and accepted before code. It must cover five things:
    - in-run restore for the derived tier as well, so Phase 5 needs no second record;
    - ADR-307's Consequences line that "the replay driver and its determinism contract" survive intact: the determinism contract is kept, and the replay driver now covers the main line;
    - AC-3's "whole-path replay", which still holds because every branch's path is executed from the root once in the same run, by its ancestors;
    - the walker's reproducibility error, a replay failing where the owning line succeeded ("the tree is not reproducible at this seed"). Restore removes it from every run, and the record names what replaces it: the on-demand equivalence mode, or another guard David rules;
    - ADR-348's checklist. It names each harness-level view a restore leaves stale (bootstrap's loaded-game fields, the captured channels, the walker's room note) and re-derives it or declares the gap.
  - `packages/branch-tester/src/tree-walker.ts#runTreeDocument` changes. As each line runs depth-first it captures the engine's save at each fork card, and it restores that save for the branch line instead of replaying the prefix. Saves are held in memory and dropped at run end, never persisted, so ADR-307 D4 holds. A fork at or after an END STATE card, or after an execution error, stays blocked exactly as today.
  - The fork save is typed as the engine's save data. `captureSave` returns `unknown` today, and `packages/transcript-tester/src/search.ts#captureSave` narrows that.
  - The harness's save hooks do not intercept an author's own save or restore card later in the line. A test covers this.
  - The report line and the observer field change by David's ruling, and the testing surface's consumers change in the same commit.
  - The per-fork equivalence mode stays in `scripts/perf/` as the on-demand guard. Its fixture known to fail is a save payload with one field removed, which it must report as a difference.
- **Files**: `docs/architecture/adrs/`, `packages/branch-tester/src/tree-walker.ts`, `packages/branch-tester/tests/`, `packages/transcript-tester/src/search.ts`, `packages/transcript-tester/tests/`, `packages/devkit/src/commands/test-tree-document.ts`, `packages/devkit/tests/`, `tools/ide/web/testing-surface/src/`, `tools/ide/web/testing-surface/tests/`, `scripts/perf/`
- **Exit state**: A branch line costs one restore, not its whole prefix. Card verdicts, rooms entered and line outcomes are identical to the replayed baseline on every test story and, on demand, on Secret Letter. The decision record says why restore is now sound.
- **Demonstration**:
  - The verdict digests of lodge, ferry and orchard diff empty against `docs/work/engine-test-performance/baseline/`.
  - On demand, Secret Letter's tree digest diffs empty too, and the survey records its tree-tier time and its counts of boots and executed commands against the baseline.
  - The equivalence mode reports the stripped-field fixture as a difference.
  - The floor is green (branch-tester, devkit, test:scripts, the testing-surface suite, Dungeo's chain).
- **Demonstrated**: 2026-11-12, session a64f6a, on the bundle built by `./repokit build dungeo` after the last source edit that changes behavior; each command run once. [verified: event log 2026-11-13T00:52:39Z "Tests passed: 25 passed 255 passed" (the testing-surface suite), after the last behavior-changing source edit at 00:48:32Z; branch-tester re-run by the summary writer at 2026-11-12 18:59 CST, "Test Files 33 passed (33)", "Tests 413 passed (413)", after the last test edit, which closes the "not re-run" gap named below; story-loader `scheduler` re-run by the summary writer at 18:59 CST, "9 passed (9)"; every other figure on this line reported by session, unverified]
  - Digests: `node scripts/perf/survey-test-run.mjs --run test-stories/<story> --digest <file>` then `diff -q` against `docs/work/engine-test-performance/baseline/`: lodge, ferry and orchard identical. The same for `branch-stories/secret-letter`: 3,315 lines, `diff` printed nothing.
  - Secret Letter's tree tier: 58.0 s after Phase 3, 5.5 s now (127.0 s at the baseline). `--counts`: boots 106 to 1, turns 21,136 to 1,469, 54 saves captured, 105 restores. Recorded in `survey.md`, "After Phase 4".
  - The equivalence mode's fixture known to fail: `node scripts/perf/survey-test-run.mjs --self-check` reports the honest save equivalent on ferry and the save with one world state value removed different (`equivalenceDetected: true`).
  - The floor: branch-tester 33 files, 411 tests passing before the mutation check's additions, then `tree-fork-restore` 8 of 8; devkit 210 passing, 1 skipped; `pnpm test:scripts` 103 passing; the testing-surface suite 255 passing; story-loader `scheduler` 9 of 9; Dungeo's chain 949 passed.
  - The run report on orchard: `21 commands (21 authored + 0 replayed), 3 restored at a fork`.
  - Decision record: ADR-307 D5's amendment of 2026-11-12, with a note under ADR-302 D17.
  - Not done as the Deliverable words it, and why: no consumer in `tools/ide/web/testing-surface/src/` changed, because nothing there reads `replayedCommands` and the wire carries neither count. Two rules were added that the Deliverable did not name, both in the amendment or the walker's header: a line whose own cards type `undo` still replays, and so does a fork before any command.
  - Not verified: a tree with a `restart` card on a line that has branches (a restart reboots the game and replaces its engine; no test story has that shape). The whole branch-tester suite was not re-run after the three test cases the mutation check asked for were added; only that file was.
- **Status**: DONE

### Phase 5: The derived and claims tiers stop paying for boots and serializations they do not need
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The derived tier (`packages/branch-tester/src/derived-runner.ts`) and the claims walk's per-state read (`packages/branch-tester/src/claims/claims-game.ts`).
- **Entry state**: Phase 4 is DONE, and its record covers in-run restore for derived rows. Phase 2 has explained the 80 ms row. David has given his go on the derived change, and on whether read-only rows share one boot with a state comparison after each.
- **The go (David, 2026-11-12, session a8ee8f: "a").** Go on the derived change and the claims change as put to him. Every derived row restores, read-only or not: a restore is 3.6 ms on Secret Letter against a 2.1 ms serialization plus a comparison, so sharing would save about 0.2 s over some 146 rows and add a second path whose "read-only" is judged from the verb. A row whose command types `undo` still boots fresh, as Phase 4's walker does. For the claims walk, "one serialization per state" is pinned as one world read per command walked plus the engine's own serialization inside each save of a new state; building the identity from the save payload would be an engine change this plan does not name.
- **Deliverable**:
  - The derived tier boots once per suite. `packages/branch-tester/src/derived-runner.ts#runDerivedSuite` reads the vocabulary from that boot and captures its save, and `packages/branch-tester/src/derived-runner.ts#runDerivedBranch` restores the save before each row instead of booting. Row code looks every entity up again through the world after each restore (ADR-365's stale-entity lesson).
  - Whatever Phase 2 found in the 80 ms row is fixed, or ruled out with its measurement.
  - The claims walk makes one serialization per state. After Phase 3 its engines take no undo snapshot, and `packages/branch-tester/src/claims/claims-game.ts#readWorldSnapshot` serves Phase 1's identity without a second round trip where the survey shows one is still made.
  - Count assertions on test stories, each with its fixture known to fail: one boot per derived run on orchard (the fixture is a loader that counts and fails above one), and one serialization per walk state on lodge.
- **Files**: `packages/branch-tester/src/derived-runner.ts`, `packages/branch-tester/src/claims/claims-game.ts`, `packages/branch-tester/src/claims/claims-walk.ts`, `packages/branch-tester/tests/`, `packages/devkit/src/commands/test-derived.ts`, `packages/devkit/tests/`, `tools/ide/web/testing-surface/tests/`
- **Exit state**: A derived run boots once. A walk state is serialized once. Derived and claims verdicts are identical to the baseline on every test story and, on demand, on Secret Letter.
- **Demonstration**:
  - The verdict digests of lodge, bazaar, ferry and orchard diff empty against `docs/work/engine-test-performance/baseline/`.
  - On demand, Secret Letter's derived digest (1,737 rows) diffs empty, and the survey records its derived-tier time against the baseline.
  - The floor is green.
- **Demonstrated**: 2026-11-12, session a8ee8f, on the bundle built by `./repokit build dungeo` after the last source edit; each command run once. [reported: session a8ee8f] [verified: branch-tester re-run by the summary writer at 2026-11-12 20:08 CST, "Test Files 35 passed (35)", "Tests 424 passed (424)", after the last test edit at 19:56 CST; event log 2026-11-13T01:55:38Z "Tests passed: 25 passed 255 passed" (the testing-surface suite), after the last source edit at 01:51:55Z and the build at 01:54:02Z; every other figure on this line reported by session, unverified]
  - Digests: `node scripts/perf/survey-test-run.mjs --run test-stories/<story> --digest <file>` then `diff -q` against `docs/work/engine-test-performance/baseline/`: lodge, bazaar, ferry and orchard printed nothing. The same for `branch-stories/secret-letter`: 3,315 lines, `diff` printed nothing.
  - Secret Letter's derived tier: 133.2 s after Phase 4, 8.9 s now (130.1 s at the baseline), 5.1 ms a row against 74.9; the whole run 138.9 s to 14.4 s. `--counts`, derived tier: boots 1,267 to 1, compiles 1,267 to 1, 1 save, 1,267 restores, 958 turns. Recorded in `survey.md`, "After Phase 5".
  - The count assertions and their fixtures known to fail: `packages/branch-tester/tests/derived-one-boot.test.ts` (9 cases on orchard through the real engine: one boot for the suite; an engine that refuses to save boots once per row and the count shows it; every restore leaves the world byte-equal to the boot, with a restore that does nothing as its fixture; outcomes equal a boot per row) and `packages/branch-tester/tests/claims-walk-serializations.test.ts` (2 cases on lodge: one read at each start, one per command walked, one inside each save; a loader that keeps undo snapshots as its fixture). With `claims-walk.ts` stashed the count fails, `expected 751 to be 463`.
  - The floor: branch-tester "Test Files 35 passed (35)", "Tests 424 passed (424)", re-run whole after the last test edit; devkit "32 passed | 1 skipped (33)", "210 passed | 1 skipped (211)"; `pnpm test:scripts` "17 passed (17)", "103 passed (103)"; the testing-surface suite "25 passed (25)", "255 passed (255)"; Dungeo's chain "949 passed".
  - Not done as the Deliverable words it, and why: `runDerivedBranch` keeps its signature (it takes whatever hands it a game in boot state, and the suite passes a start that restores), so `packages/devkit/src/commands/test-derived.ts` and the testing surface did not change. "One serialization per walk state" is pinned as David ruled it: one world read per command walked, plus the engine's own inside each save of a new state. The fork-save helpers moved out of `tree-walker.ts` into `packages/branch-tester/src/fork-save.ts` (new) so both runners share one copy.
  - Not verified: a derived row that types `undo` is tested for its own boot and its `undo: true` request, not for a working undo on that game; a derived row that types `save` or `restore` on the shared game (the hook put-back is asserted after the suite, not during such a row); Fernhill's claims tier was not re-measured.
- **Status**: DONE

### Phase 6: Caching across runs — the candidates the survey ranks worth building
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The `sharpee test` run as a whole (`packages/devkit`, `packages/branch-tester`): what can be reused within one run and across runs.
- **Entry state**: Phases 3 to 5 are DONE or dropped by ruling. David has ruled on each candidate the table ranks:
  - compile once per run (in-process reuse; the three tiers each compile today);
  - compile results cached against the source hash;
  - stored witnesses, so a claim's normal run replays its witness and searches only when the replay fails;
  - walk results cached per claim cone against a hash of the cone's source;
  - derived rows that read only definitions needing no boot.

  Each cross-run candidate changes something already decided: ADR-307 D4 (recorded state is never the truth), ADR-365 D2 and ADR-367 ("the walk reads only what is written", "no memory of a previous run"). So each gets a dated amendment or record, accepted before it is built. Where the cache lives in an author's project is part of the same ruling.
- **Deliverable**:
  - The approved candidates. Each cache key covers every input that can change a verdict: story source with its imports, claims fragment, tree segments, seed, and platform version.
  - The decision record or amendment for each cross-run cache.
  - For each cache, a fixture known to fail: an input the key must cover changes, and the cache must miss. The test fails if the key omits that input.
- **Files**: `packages/devkit/src/commands/`, `packages/devkit/tests/`, `packages/branch-tester/src/`, `packages/branch-tester/tests/`, `docs/architecture/adrs/`
- **Exit state**: Each built cache gives identical verdicts cold and warm and misses on every key input. Every candidate not built has its reason recorded in this plan.
- **Demonstration**:
  - For each built cache, the verdict digests of every test story match `docs/work/engine-test-performance/baseline/` on a cold run and on a warm run.
  - Each key-input fixture misses as required.
  - On demand, the survey records Secret Letter's warm-run time.
  - The floor is green.
- **Demonstrated**: 
- **Dropped by ruling (David, 2026-11-12, session a8ee8f: "proceed", on the recommendation to drop Phase 6 and go to Phase 7).** No cache was built. The reason for each candidate:
  - *Compile once per run*: after Phases 4 and 5 a run compiles a handful of times, not once per boot (Secret Letter: 1,373 compiles at the baseline; the tree and derived tiers now make one each). At 95 ms a compile on Secret Letter the saving is well under a second.
  - *Compile results cached against the source hash*: the same handful of compiles, and a cross-run cache needs a decision record and a place in the author's project for it.
  - *Stored witnesses*, and *walk results cached per claim cone*: each changes ADR-365 D2 and ADR-367 ("the walk reads only what is written", "no memory of a previous run"), and the only figure for the cost they would remove, Fernhill's claims tier at 4.5 s of 5.5 s, was taken before Phase 5 cut the walk's world reads. Phase 7 re-measures that tier; David rules on these two from that number.
  - *Derived rows that read only definitions needing no boot*: moot. A derived run boots once (Phase 5).
- **Status**: ABANDONED (2026-11-12, dropped by ruling; nothing built)

### Phase 7: Re-measure the whole `sharpee test` run — before and after, for David's ruling on the paradigm
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: Measurement and the ruling. No code.
- **Entry state**: Phases 1 to 6 are DONE or dropped by ruling.
- **Deliverable**:
  - The survey instrument re-run on Fernhill, Secret Letter and Dungeo, on the machine Phase 2 used.
  - `docs/work/engine-test-performance/before-after.md` (new):
    - whole-run and per-tier times, before and after, for each story;
    - the count changes (boots, replayed commands, serializations);
    - what each phase bought;
    - what remains on the ranked table.
  - David's ruling on the branch-testing paradigm, recorded in that file and in this plan. No timing gate is added, whatever the ruling (ADR-395 D8).
  - His ruling on whether `scripts/perf/` stays. It carries no bound, so it is a measurement and not a scale check. If it stays, ADR-395's Consequence "Nothing watches walk speed at scale" takes a dated note saying an on-demand instrument exists and gates nothing.
- **Files**: `docs/work/engine-test-performance/before-after.md` (new), `docs/work/engine-test-performance/plan-20261112-engine-test-performance.md`, `docs/architecture/adrs/adr-395-exploring-tests-run-on-test-stories.md`
- **Exit state**: David has ruled on whether branch testing stays, on the measured before and after.
- **Demonstration**: The survey's whole-run lines for secret-letter and fernhill print the after figures recorded in `docs/work/engine-test-performance/before-after.md`, beside the Phase 2 baseline in `docs/work/engine-test-performance/survey.md`. David's ruling is quoted with its date.
- **Demonstrated**: 2026-11-12, session a8ee8f, on the build made at the end of Phase 5; each command run once. [reported: session a8ee8f] [reported by session, unverified]
  - `node scripts/perf/survey-test-run.mjs --run branch-stories/fernhill`: whole run 3.41 s (5.49 s at the baseline), tree 0.19 s, derived 0.08 s, claims 2.91 s (4.49 s). `--run branch-stories/secret-letter`: whole run 14.4 s (257.3 s), tree 5.3 s, derived 8.9 s; this is the run made for Phase 5's Demonstration on the same build, not a second one. Dungeo's chain: 8.7 s, 949 passed. All recorded in `before-after.md` beside the Phase 2 baseline in `survey.md`.
  - **David's rulings, 2026-11-12 ("A")**: the branch-testing paradigm stays; `scripts/perf/` stays, and ADR-395's Consequence "Nothing watches walk speed at scale" carries a note of that date saying an on-demand instrument exists and gates nothing; the claims-walk caches wait, filed as GH #695. No timing gate was added.
- **Status**: DONE

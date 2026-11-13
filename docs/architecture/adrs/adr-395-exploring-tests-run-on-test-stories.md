# ADR-395: Exploring tests run on test stories; real stories other than Dungeo do not gate

**Status**: **ACCEPTED** (David, 2026-11-11, session ece425: "yes", to the division and this record together. Written the same day at Phase 2 of `docs/work/small-test-stories/plan-20261111-small-test-stories.md`, on his ruling that the decision is worth a record. The decisions below are his rulings of 2026-11-11, given in conversation and on the plan's seven questions. Not yet built: Phases 3 to 7 of that plan.)

## Date: 2026-11-11

**Kind**: process

**Scope**: `test-stories/`, the test suites under `packages/branch-tester/tests`, `packages/devkit/tests`, `scripts/__tests__`, `tools/ide/web/testing-surface/tests` and `tools/explorer-probe/tests`, and the Demonstration lines of later plans

## Context

Some tests replay a story: they play a fixed list of commands and check the output. Their cost grows with the list. Others explore a story: a claims walk or an explorer walk searches the story's state space, and the derived tier runs one arranged command for every clause branch. Their cost grows with the story.

The exploring tests were written against real stories, mostly Fernhill, with UPPS and Secret Letter beside it. Measured on 2026-11-11, two cases took 233 of the 306 seconds of test time in the gate: nine claim walks over Fernhill (111.6 s, against that test's own 120-second cap) and a breaking edit on UPPS whose walk runs to its 120-second budget (121.8 s). The same day's inventory found a second cost. The narrative suites pin Fernhill's numbers, and Fernhill is a story people edit, so the pins drift: `pnpm test:scripts` had nine failing tests, seven of them because the story or its seeded rooms had moved under the tests.

Earlier plans also used `./sharpee test` on Fernhill, Ides of March and Secret Letter as floors a change had to leave byte-identical. That made real stories, each with its own content and quirks, part of what the platform guarantees. Secret Letter was ruled out as a floor on 2026-11-11 for that reason.

Dungeo is different in kind. Its walkthrough chain is a replay, 949 steps in about nine seconds, and it stays.

## Decision

**D1: Exploring tests run on test stories.** A test whose assertion depends on a search of a story's state space, or on the derived tier's run over a story's clause branches, reads a test story, not a real one. The inventory's 45 obligations are divided into four test sets, each carried by one story (`docs/work/small-test-stories/test-sets.md`).

**D2: A test story exists only to be tested.** It has five rooms at most. It is never published, never a sample, and never a design input for Chord or the IDE. Its content carries no decision-record references.

**D3: Claude writes the test stories, content included.** This is David's grant of 2026-11-11 and it covers these stories only. Everywhere else, story content is David's to provide.

**D4: The test set is the durable thing; the story is one realisation of it.** Each story has a `<story-id>.test-set.md` listing the obligations it carries in story-independent words. A story is rewritten only when its test set changes, or on a deliberate fresh-stories pass that rewrites the story and re-records the tests' pins. A normal test run uses the committed story. Rewriting stories on every run was considered and rejected for the gate: a failure must replay exactly, a rewritten story would need checking before its tests meant anything, and the writing would cost more than the time saved.

**D5: Regression for a test story is its test set's pass history.** A set that passed before and fails now is a regression. A re-recorded pin after a fresh-stories pass is not.

**D6: The test stories live in `test-stories/<story-id>/`.** This is a second top-level directory that branch-tester reads, beside `branch-stories/`. ADR-302 D16's reason for separating directories, that the transcript harness must never read a tree story, holds unchanged: the transcript harness reads `stories/` and never this directory.

**D7: Real stories other than Dungeo do not gate.** No test in a gate walks or derives over Fernhill, UPPS, Ides of March, Secret Letter or any other real story, and a plan's Demonstration does not cite `./sharpee test` on one as a floor. Dungeo's walkthrough chain remains the regression floor, up to its own requirements. Tests that only compile or read a real story's files (corpus compiles, static world-index checks, a browser build) are not exploring tests and stay where they are.

**D8: The scale check is let go.** ADR-365 AC-2 bounds a claims run on a real-sized story, and a five-room story cannot carry that. David first ruled the Fernhill walk kept on demand, as a measurement outside the gate. Run once that way on 2026-11-11 it failed its own bound, 121.4 seconds against 120, and he ruled the same day that Fernhill is removed from testing: the on-demand test is deleted and nothing replaces it.

## Consequences

- The exploring tests' cost is set by stories written to be small, so it stays at seconds as the real stories grow.
- A real story can be edited without moving a platform test's pins, and a test story is never edited for any reason but its test set.
- The acceptance criteria of ADR-365 (AC-1, AC-2, AC-3, AC-4, AC-6, AC-9) and ADR-367 (AC-1, AC-3, AC-4) keep their records of what was measured on Fernhill, UPPS and Secret Letter. Their regression pins move to the test stories, and each record takes a dated note when its phase lands.
- ADR-302 D16 takes a dated note for the second directory.
- Nothing watches walk speed at scale, in the gate or out of it. A slowdown like #628's would be noticed by an author running `sharpee test` on a large story, not by a test here.
  - **Note, 2026-11-12** (David's ruling, engine-test-performance plan, Phase 7): an on-demand instrument now exists, `scripts/perf/survey-test-run.mjs`. It measures a whole `sharpee test` run by tier on any story, real ones included, and counts boots, compiles, turns and serializations. It carries no bound, sits outside `scripts/__tests__/` and every turbo task, and gates nothing, so D7 and D8 stand as written: it is a measurement someone chooses to run, not a watch.
- Interactions nobody wrote an obligation for are no longer exercised by accident. When a real story turns one up, it becomes a new obligation with a home in a test set.
- A plan that adds a Chord error compiles `test-stories/` in its census, as it does `stories/` and `branch-stories/`.
- The author-narrative objective's own target (the UNDERGROUND port) is a separate matter and is not changed by this record.

## Session

Session ece425 (2026-11-11, main): the turbo test-caching work that measured where test time goes, issue #684, the plan `docs/work/small-test-stories/plan-20261111-small-test-stories.md`, its Phase 1 inventory, and its Phase 2 division.

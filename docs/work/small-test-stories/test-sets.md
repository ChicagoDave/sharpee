# Test sets: the obligations divided into stories (GH #684, Phase 2)

**Written**: 2026-11-11, session ece425.
**Plan**: `docs/work/small-test-stories/plan-20261111-small-test-stories.md`
**Inventory**: `docs/work/small-test-stories/inventory.md` (the `OB-n` ids are its rows)

This is step two of David's process: divide the list into small sets, each one a story's worth. Step three follows from it: **N is 4 stories carrying T of 66 test cases.**

All seven questions are ruled (the plan's "Rulings on the questions"). The stories live in `test-stories/<story-id>/`.

## The four test sets

Every in-scope obligation is carried by exactly one set. OB-D1 (the scale check) is carried by none: by ruling 5 it stays on Fernhill as an on-demand measurement.

| Set | Story | Rooms | Carries | Read by |
|---|---|---|---|---|
| A | `lodge` | 5 | OB-1 to OB-19 | branch-tester (the claims runner, the fragment companion) |
| B | `bazaar` | 3 | OB-20, OB-21 | branch-tester (the cone's finding) |
| C | `ferry` | 4 | OB-22 to OB-32 | devkit (`sharpee test`'s claims tier, the breaking edits), the IDE web surface's claims suite |
| D | `orchard` | 5 | OB-33 to OB-45 | the narrative suites, the IDE web surface's derived and line-verdict suites, the explorer's examinable lens |

Why four and not fewer. Sets A and C both hold claims, but they are pinned by different packages for different facts: A pins the walk itself (depths, witness paths, state counts), C pins what `sharpee test` prints around a tree. One story for both would make an edit for either package move the other's pins. B is separate because its point is a set padded with things that cannot matter, which would add an inert finding to every claim in A. D needs rules, endings and a forked tree and no claims at all.

## T: the cases that move

| Where | Cases | Set |
|---|---|---|
| `packages/branch-tester/tests/claims-fernhill.test.ts` | 5 | A |
| `packages/branch-tester/tests/claims-fragment.test.ts` | 3 | A |
| `packages/branch-tester/tests/claims-cone-acceptance.test.ts` | 2 | B |
| `packages/devkit/tests/test-claims.test.ts` (the real-story cases) | 2 | C |
| `packages/devkit/tests/claim-broken.test.ts` (the real-story cases) | 2 | C |
| **The turbo gate** | **14** | |
| `tools/ide/web/testing-surface/tests/claims-real-path.test.ts` | 1 | C |
| `tools/ide/web/testing-surface/tests/derived-real-path.test.ts` | 1 | D |
| `tools/ide/web/testing-surface/tests/line-verdict.test.ts` (the real-run cases) | 2 | D |
| `tools/explorer-probe/tests/lens-examinable.test.js` (the corpus pin) | 4 | D |
| `scripts/__tests__/narrative-*` (ten files) | 44 | D |
| **All gates** | **66** | |

The narrative count by file: coverage-numbers 4, endings 5, holds 14, names-the-cause 4, pinned-prose 3, playing-through 4, rule-tests-itself 6, unexpected-failure 2, what-runs-when 1 (its other eight use scratch projects and stay), support 1.

## Set A: `lodge`

**Purpose.** The claims runner's real path: every predicate kind and every verdict, walked through the real engine.

**Rooms (5).** The Porch (start), the Hall, the Pantry, the Study, the Vault. The Hall joins the other four.

**Things and people.** A notice on the porch (readable). A warden in the Hall, with the topic "the vault". A valve in the Pantry whose turning fires a clause. A bottle of brandy and a hand bell in the Pantry. A ledger in the Study with a declared state that reading changes. A strongbox in the Vault (openable, takeable) with the deed inside. The Study is entered only after the brandy is given to the warden.

**Ending.** Victory on returning to the Porch with the deed.

**Claims, and how each settles.**

| Claim | Predicate | Expected | Obligation |
|---|---|---|---|
| the story can be won | ending | held by witness | OB-1 |
| the deed is in hand | placement in the player | held by witness | OB-2 |
| the warden has been asked about the vault | event | held by witness | OB-3 |
| the ledger has been studied | declared state | held by witness | OB-4 |
| `never` the strongbox leaves the Vault | placement not in a room | **violated**, with its witness | OB-5 |
| the Study is reached | room | held by witness | OB-6 |
| `never` the Study is reached without the brandy | room, under a set that leaves the brandy out | **held by exhaustion**, a pinned state count | OB-7 |
| the notice has been read | readable flag | held by witness | OB-8 |
| the valve has been turned | fired clause | held by witness | OB-9 |
| the strongbox is open | openable flag, locked from a line | held by witness | OB-10 |

Ten claims in nine walks: the first two share the declared set (OB-12). The tally is 10 / 9 / 1 / 0 (OB-11). No set can reach a budget (OB-13). The run is bounded from its measured time with stated headroom (OB-14). The winning line and the strongbox's way out are pinned command for command (OB-15). The hand bell sits in the declared set and bears on nothing, and the brandy sits in a set where it cannot matter, so some claims report inert things and others none (OB-16).

The fragment is `lodge.claims.chord`, named by a tree manifest (OB-17); its JSON twin is the fixture the walked test reads (OB-18); the IR is compared with and without it (OB-19).

**Seed and budget.** Seed 1209; 500,000 states, 120 s, depth 80, as today.
**Timing target.** The whole file under 10 s.

## Set B: `bazaar`

**Purpose.** The cone's finding on a set padded with things that cannot matter.

**Rooms (3).** The Arcade (start), the Lamp Stall, the Back Lane. The way north from the Arcade to the Back Lane is blocked.

**Things.** Six independent takeable wares across two rooms: a fig, a plum, a ribbon, a thimble, a wick, a flint. Six is enough to pin "every one, in set order"; Secret Letter's twenty-six was the size of its market, not a requirement.

**Claim.** `never` the shopper reaches the Back Lane, under the three rooms, all six wares, take and drop.

- OB-20: the compile finding names all six inert, in set order, on the `needs things` line, and proposes dropping the line. The skeleton's probe already prints it.
- OB-21: with the rooms alone the claim holds by exhaustion on the real engine.

**Timing target.** Under 2 s. The padded set is never walked: six takeable things in two rooms is about 3 to the 6th placements, which is the cost the finding exists to name.

## Set C: `ferry`

**Purpose.** What `sharpee test` prints around a tree: the claims tier, locks, and the two edits.

**Rooms (4).** The Landing (start), the Ticket Hut, the Deck, the Far Bank. The Deck is reached only while the ferry is docked. Nothing leads to the Far Bank.

**Things.** A timetable (readable) and a lever on the Landing; pulling the lever docks the ferry. A ticket and a winch in the Ticket Hut; each turn of the winch raises a counter, without limit. A storm lantern on the Deck (openable).

**Tree.** Seed 42. A main line: read the timetable, take the ticket, pull the lever, board, open the lantern. A second line that forks after the lever and also opens the lantern. One lock, written by the real `sharpee claim`, on the main line's last card: "the lantern is open".

**Claims.**

| Claim | Expected under `sharpee test` | Obligation |
|---|---|---|
| the passenger is aboard | held, by line | OB-23 |
| the ticket is in hand | held, by line | OB-23 |
| the lantern is open (locked) | held by a line; its lock reads "held there" at its own card | OB-25 |
| the timetable has been read | held, by line | OB-23 |
| `never` the ticket leaves the Ticket Hut | **violated**, `(never) — at depth N:` with its witness | OB-22, OB-24 |
| `never` the Far Bank is reached | held by exhaustion, walked | OB-23 |
| the winch has been turned a hundred times | not reached by any line; walked | OB-23 |

The ratio line carries seed 42 and the exit is 0 with a violated claim (OB-22). The walk count and the held-by-line count are exact (OB-23). With and without the manifest's `claims` key the exit is the same and the tally differs by the lock's one assertion (OB-26). The web surface's claims suite folds the same run (OB-32).

**The two edits** (each on a scratch copy, one line changed):

1. **The breaking edit.** Remove the line that docks the ferry from the lever's clause. The boarding card fails first, with the story's output under its cite; the lock's card fails on its own row, "not held here"; the run exits 1 (OB-27, OB-28, OB-30). The locked claim is then walked. Its set holds the winch, whose counter makes every turn a new state, so the walk cannot exhaust and stops at the depth limit: "the walk stopped at max-depth-reached after N states" (OB-29). That is the budget stop UPPS reaches by spending 120 seconds; here it costs about eighty states.
2. **The quiet edit.** Move the timetable from the Landing to the Far Bank. Every card stays green except that no line reads it; the claim is UNPROVEN by exhaustion, naming its set; the lantern's lock still reads "held there"; the exit is 0 (OB-31). The tree's main line must not read the timetable for this edit to leave every card green, so the reading moves to a claim only a walk proves.

**Open point for Phase 4.** The skeleton's probe reports that "the passenger is aboard" depends on none of the things in its set, though the way to the Deck is open only while the ferry is docked. Either the cone does not follow an exit's `while` condition or the skeleton's exit line does not mean what it was written to mean. Phase 4 finds out which when it walks the story. If it is the cone, that is a platform matter to report, not to fix here.

**Timing target.** Each of the two test files under 10 s.

## Set D: `orchard`

**Purpose.** The author narrative's beats, the derived tier's rows, and the examinable lens.

**Rooms (5).** The Gate (start), the Rows, the Press House, the Hive Yard, the Cellar.

**Things and people.** A sign at the Gate (readable). A basket with a declared state. An apple tree in the Rows with a reversible state and a rule with a `when` precondition and a negation branch (the branch the arrange step SKIPs). The keeper in the Press House, with topic rows about two things, a ladder and a smoker. The smoker is wearable.

**Endings (3).** Victory at the Gate with the full basket. Defeat among the hives. A third ending in the Cellar that no tree line reaches.

**Tree.** Seed 42. A main line to victory. A three-way fork on one turn in the Rows (OB-41), one branch of which reaches the defeat (OB-37).

**What it carries.**

| Obligation | How |
|---|---|
| OB-33, OB-36 | the derived rows, the SKIPPED negation branch with its shape and span, the unreached ending at its source line, every room entered |
| OB-34 | a planted failing line under the fork |
| OB-35 | described and undescribed things, a phrase nothing answers to, and the carried sign's text, walked to a stated state budget |
| OB-37 | END STATE cards on the two reached endings; scratch edits that stop a line short and that remove a card |
| OB-38, OB-40, OB-44, OB-45 | any story with a tree: the story-agnostic beats, the boot card and first move, the clean exit, the shared run |
| OB-39 | `test-stories/orchard/seeded/`: the smoker never placed, the smoker not wearable, and the correct story |
| OB-41 | the tree's lines, its three-way fork, and the two-process replay (with the timing fields stripped, ruling 6) |
| OB-42 | the tree's rule: its derived rows, a planted rule that fights it on a scratch copy, the card that notices the same break |
| OB-43 | the keeper's two topic rows, each with its thing brought to the keeper |

**Timing target.** One `sharpee test --json` run under 5 s, so the suites' spawn budget is never near.

## Compile probes

Each skeleton (rooms, exits, the claim-bearing things, and its claims fragment) was compiled once against the current `packages/chord` source, bundled with esbuild. The skeletons are in the session scratchpad, not in the tree.

| Story | Rooms | Errors | Warnings | Claims compiled |
|---|---|---|---|---|
| `lodge` | 5 | 0 | 1 (`analysis.claim-inert-needs`: the brandy, as designed for OB-16) | 9 of the 10 (the `never … without the brandy` claim is added in Phase 3) |
| `bazaar` | 3 | 0 | 1 (`analysis.claim-inert-needs`: all six wares, which is OB-20's finding) | 1 |
| `ferry` | 4 | 0 | 4 (`analysis.claim-inert-needs`; see the open point above) | 6 of the 7 |
| `orchard` | 5 | 0 | 0 | none (it has no fragment) |

Getting there took four corrections to the skeletons' own Chord (the topic row form, the ending's `while` head, a missing phrase, the phrases block). None was a compiler defect.

A probe proves a skeleton compiles. It does not prove a claim settles as the tables above expect: no walk was run in this phase. Depths, state counts and witness paths are measured and pinned in Phases 3 to 6.

## The test-set file

Beside each story, `<story-id>.test-set.md`:

```
# Test set: <story-id>

**Carries**: OB-1, OB-2, …
**Read by**: <the test files that pin it>
**Seed**: <n>

## Obligations

- OB-1: <the obligation in story-independent words>; in this story: <the claim, card or rule that carries it>
- …
```

The obligations are the durable part. The story and the pins in the test files are one realisation of them: a fresh-stories pass rewrites the story, re-records the pins, and leaves this list as it was.

## The directory's README (`test-stories/README.md`, written in Phase 3)

> These stories exist only as test targets.
>
> - Five rooms at most. A story that needs more is two stories.
> - Never published, never a sample, never a design input for the language.
> - Written by Claude under David's grant of 2026-11-11, which covers these stories only.
> - No decision-record references in a story's content, comments included.
> - Each story has a `<story-id>.test-set.md` listing what it must let the tests prove.
> - A story is regenerated only when its test set changes or on a deliberate fresh-stories pass. A normal test run uses the committed story.
> - Regression here is a test set's pass history: a set that passed and now fails.
> - A plan that adds a Chord error compiles this directory in its census, beside `stories/` and `branch-stories/`.
> - The transcript harness never reads this directory; these are tree stories.

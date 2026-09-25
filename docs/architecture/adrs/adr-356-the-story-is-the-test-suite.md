# ADR-356: The story is the test suite — rule tests derived from the IR, endings proved by the lines the author played

**Status**: **ACCEPTED** (David, 2026-09-25, session 082049 — "yes, mark it accepted") — all five open questions resolved by interview the same day; `adr-review` clean at 21/21 after four folds (the card count, the arrange grammar pinned to the assertion core's forms, two claim kinds stated as additions, and D9's supersession owners), and the acceptance taken on that review. There is no Open Questions section, which is the condition ADR-0009 Decision 2 requires of an ACCEPTED record. Written at David's instruction ("go ahead and draft the ADR") after a week of explorer work ended with his question: *"Is there a deterministic path to a reasonably complete testing suite?"* **No implementation is authorized by this ADR in any state.** Every decision below reaches `packages/`, and CLAUDE.md gates each of those on its own discussion; this document is the input to that discussion, not its output.

**Scope**: `packages/branch-tester` — the runtime that executes what this ADR derives. The derivation itself belongs in `packages/world-index` (ADR-321's static pass), and the arrange step reaches `packages/story-loader` (settled by Q-1). The Affected section names every module.

## Date: 2026-09-25

## Parent

- **ADR-294 D23** (the explorer is a family of scoped lenses) — this ADR does not retire it. It draws the line D23 left implicit: a lens is a diagnostic with a budget, and a diagnostic is not a test. D7 states that line.
- **ADR-307** (the testing tree model) and **ADR-355** (the tree is segmented) — the tree stays, and stays hand-authored. What changes is what an author is expected to put in it. D4 makes its ending-reaching lines the reachability tier, and D6 narrows the rest of its job; neither changes its format.
- **ADR-321** (`@sharpee/world-index`, the static derivation package) and **ADR-322 D8** (consume derivations, do not rebuild them) — the clause enumerator is a derivation over the compiled IR and lives where the other derivations live.
- **ADR-293 D12** (search executes the real engine rather than modelling it) — preserved, and it is the reason D2 and D3 are shaped the way they are: nothing in this ADR executes a model. State is arranged, one command runs through the real parser and engine, and the assertion reads the real world.
- **ADR-340** (the unified assertion core) — D3's effect assertions are claims in that core's vocabulary; nothing is written twice.
- `docs/proposals/state-space-analysis.md` — stays the live *analysis* design. Its checks find what the author did not write; this ADR tests what the author did write. Its open question 6 (regenerate or commit the regression transcripts) is answered here by D6.

## Context — measured, not assumed

**The hand-authored tree does not scale, and transcripts are the same artifact.** `branch-stories/secret-letter/secret-letter.tests.json` holds 565 authored commands that expand to 3,854 executed ones across 639 cards and 61 lines, and one testing session rewrote 93% of the file (ADR-355 Context). A walkthrough transcript of the same story would be the same 565 lines with the same churn, because both are recordings of paths through the story, blessed by hand and re-blessed whenever prose moves. Dungeo's `wt-*` chain works because the walkthrough pre-existed the port and the game is frozen; neither holds for a story being written. "Go back to transcripts" therefore changes the file format and not the cost.

**A week of explorer work produced diagnostics, not a suite.** The spike (`docs/work/testing-explorer/spike-20260922-explorer-measurement.md`) established that exhaustive play cannot answer reachability — 715,903 commands in fifteen minutes on fernhill never found a 29-command winning path written down in the repository (Finding 8) — and that a planner over the IR models the story's causality completely but does not yet emit a plan for want of a landmark heuristic (Finding 9, GH #507). Two scoped lenses shipped under ADR-294 D23 and found nine real defects (GH #509–#514, #517, #518). Every one of those instruments carries a budget, a stop reason, and the soundness contract *"absence is not proof."* That is the correct contract for a diagnostic and the wrong one for a test: a test suite has to terminate, has to be the same on every run, and has to be able to say "complete" against a denominator.

**The IR already contains the test cases.** Every rule in a Chord story is a precondition, an action, and a set of effects, written once by the author in the language. Counted from the compiled IR on 2026-09-25 (`node` over `dist/<story>.ir.json`):

| | fernhill | secret-letter |
| --- | ---: | ---: |
| entity `on` clauses | 31 | 197 |
| trait `on` clauses | 3 | 41 |
| `select on` arms | 3 | 0 |
| `refuse-when` | 2 | 75 |
| `when` | 0 | 4 |
| topics answered | 6 | 41 |
| timers | 0 | 13 |
| sequences / steps | 2 / 5 | 0 |
| machines | 1 | 0 |
| endings (`win` / `lose`) | 1 / 1 | 0 / 0 |
| entities | 65 | 158 |

Roughly forty clause branches in fernhill and three hundred and twenty in secret-letter, each already stating what it needs and what it does. Nobody should transcribe them a second time into a tree, and nobody has to: they are enumerable, and the count is the denominator a "complete" suite has been missing.

**The state a rule needs can be set, not played to.** The loader materializes every Chord state as ordinary world state under keys it owns (`packages/story-loader/src/state-keys.ts`): an entity's declared state at `chord.state.<ir-id>`, the story's phase at `chord.story.state`, occurrence ordinals at `chord.occurrence.<key>`, removal at `chord.gone.<ir-id>`. Placement is `WorldModel.moveEntity`. The tree already reads these in the assertion direction — `"Smoke.location = Pantry"`, `"story.state = hunted"` are `states:` pins the assertion core evaluates today (`packages/transcript-tester/src/assertion-core.ts:300`). Writing the same expressions in the other direction is a small, deterministic step, and it removes the search from the loop entirely.

**The worked example, verbatim from `branch-stories/fernhill/fernhill.story:554`:**

```
define trait prunable
  on the player pruning
    the player must hold the garden shears: need-shears
    select on its state
      when seedling
        phrase vine-too-young
      when flowering
        change it to fruiting
        move the silver locket to the Greenhouse
        phrase vine-fruits
      when fruiting
        phrase vine-done
    end select
```

Four tests fall out of that clause, one per branch, with no judgment involved:

| Branch | Arrange | Execute | Assert |
| --- | --- | --- | --- |
| `must hold` refused | player in the vine's room; shears not held | `prune vine` | message `need-shears` emitted; vine state unchanged; locket unmoved |
| `when seedling` | player in room, holds shears, vine `seedling` | `prune vine` | message `vine-too-young`; vine still `seedling` |
| `when flowering` | player in room, holds shears, vine `flowering` | `prune vine` | vine is `fruiting`; locket's location is Greenhouse; message `vine-fruits` |
| `when fruiting` | player in room, holds shears, vine `fruiting` | `prune vine` | message `vine-done`; vine still `fruiting` |

The `flowering` row is the one a story edit is most likely to break — delete the `move` line and exactly that test fails, naming the locket and the room it did not reach.

## Decision

**D1 — The story's rules are the test cases. The suite is derived from the compiled IR, one test per clause branch, and the author does not transcribe rules into a tree.** A clause branch is: each `on` clause on an entity or a trait (applied per entity carrying the trait), each arm of a `select on`, each `refuse-when` and `must`, each `when`, each topic answer, each machine transition, each sequence step, each timer phase. The enumerator reads the IR the loader actually runs — never Chord source text — and it is a static derivation in `@sharpee/world-index`, beside `collectStateWriters` and `collectStateReaders`, walking the same statement roots (`forEachStatementRoot`). Its output is a list of `{ precondition, command, effects, span }` records, deterministic and total over the IR.

**Rejected: hand-authoring the rule tier in the tree.** It is what exists today, it is what produced a 93% rewrite on one session, and it tests the author's memory of the story rather than the story.

**Rejected: generating the rule tier by planning a path to each precondition.** Sound, and the spike's planner reaches every causal link in fernhill within budget, but it puts a search with a budget and a heuristic (GH #507) in front of every test. That is the experimental dependency David asked to be rid of, and D2 removes it.

**D2 — A rule test arranges its precondition directly; it never plays to it.** The precondition names concrete values — the vine is `flowering`, the player holds the shears, the player is in the Greenhouse — and the test sets them on a freshly booted world, then runs. The arrange grammar is the `states:` pin grammar the assertion core already evaluates (`packages/transcript-tester/src/assertion-core.ts:296`), used as a command rather than a claim, and it is defined for exactly the forms whose read is defined there — no more: `story.state = <phase>`; `<entity>.location = <place>`; `<entity>.inventory contains <item>` (so `player.inventory contains garden shears` is how holding is arranged); `[the] <name> is <state>` for a Chord entity's declared state; and `<entity>.<property> = <value>` for the openable, lockable and switchable trait flags the standard actions read. Under the hood these are `setStateValue` on the loader's keys, `moveEntity`, and a trait-property write, and nothing else.

**`arrange` never throws and never guesses.** Its result is `{ arranged: true }` or `{ arranged: false, shape: <the unsupported form, named> }`; the runner maps the second to a SKIPPED result carrying that shape. An expression that names an entity the story does not declare is a failure of the derived test, not a SKIP, because the enumerator produced it from the IR and the IR is wrong about itself.

**The arrange primitive is a public function of `@sharpee/story-loader`** (David, 2026-09-25, Q-1: "a"): `arrange(world, expression)` takes an expression in the pin grammar and performs the key writes and moves itself. The runner never touches a `chord.*` key; the loader's header promise that its keys are internal stays true, and AC-5 is the test of it.

**Rejected: `branch-tester` writing the loader's keys directly.** Smaller today, and it is the leak rule 8 forbids — a second writer of keys one module documents as private. **Rejected: an arrange module in `world-index` or a sibling.** `world-index` is static by design and holds no engine; the primitive needs a live world, which is what the loader already has.

**A precondition the arrange step cannot express is a SKIPPED test with a named reason, never a silently absent one, and it counts against D5's coverage.**

**The first cut arranges the floor and nothing more** (David, 2026-09-25, Q-2: "a"): entity state, placement, holdings, player location, story phase, and the openable, lockable and switchable trait flags. Occurrence ordinals (`once`, `first-time`), topic history (`asked`), timer phases (`timer-has`) and NPC positions driven by timers are SKIPPED with the shape named in the reason. The floor is measured green on fernhill first; secret-letter's SKIPPED list, grouped by shape and counted, then decides which shape the arrange step learns next — by number, not by guess.

**Rejected: floor plus occurrence ordinals.** One key each and the commonest extra shape, but it puts secret-letter's shapes into the first cut before fernhill is green. **Rejected: everything the loader stores.** Complete on day one, the largest first phase, and timer phases are the least understood of the four.

**What D2 does not claim.** Arranging a state proves the rule works *in* that state. It does not prove the state is reachable in play. Reachability is D4's job, and the two are deliberately separate questions — the spike spent a week learning that conflating them makes both intractable.

**D3 — Each rule test executes exactly one command through the real parser and the real engine, and asserts the effects the clause declares, on the real world.** No model runs. The command is the clause's own action phrased against its own subject; the parser resolves it, the engine's four phases run, and the assertion reads what happened. The effect catalog is the IR's statement kinds, each mapped to one claim in ADR-340's assertion core:

| IR statement | Claim |
| --- | --- |
| `change <entity> to <state>` | `<entity> is <state>` |
| `move <entity> to <place>` | `<entity>.location = <place>` |
| `remove <entity>` | `<entity> is gone` — a claim the core does not have today and gains |
| `change-player` | `player.location = <place>` |
| `win <id>` / `lose <id>` / `kill` | the story ending fired with that id |
| `phrase <id>` / `refuse <id>` / `emit` | `emitted <message-id>` — a claim the core does not have today and gains, read from the turn's events |
| `award <n>` | the score is its arranged value plus `n` — the runner reads the score before and after through the world and asserts the pair |
| `raise <counter>` | the counter is its arranged value plus one — read through the loader's counter key the same way |
| `refuse-when` / `must … : <id>` | `<id>` emitted **and** no effect statement in the guarded body took place |

Two claim kinds are new to the assertion core — `is gone` and `emitted` — and they land there and are imported (ADR-340 D3), not written beside the runner. Whether the score and counter deltas become claim kinds of their own or stay runner-side reads is left to the plan; it commits an API and decides nothing here.

A refusal branch asserts the negative space as well as the message: the state the body would have changed is still what it was arranged to be. That is the assertion that catches a guard that fires its message and then runs the body anyway.

**Real path only** (ADR-293 D12, ADR-294 D23's "real path" bullet). A derived test whose command the parser cannot resolve fails at parse, and that failure is reported as the test's result — it is a real finding about vocabulary (the class GH #513 belongs to), and a model that papered over it would be exactly what D12 forbids.

**D4 — Endings are proved by the test tree's own lines: a line that reaches an ending is that ending's walkthrough, and the author provides it** (David, 2026-09-25, Q-4). Deterministic proof that an ending is reachable needs a recorded command path from boot to the ending, and a path is a walkthrough whatever file holds it. For a Chord story that file is the tree (ADR-307, ADR-355), which already records real play at the pinned seed. D4 replays each line that ends in an ending and asserts the ending it reached; a line that stops short fails, naming the ending. **The author has to provide the shape of the winning states** — the tree holds nothing that was not played, so an ending no author has played through is unreached, and D5 reports it as such. That report is the finding, not a gap in the tool.

**What D4 does not read.** `branch-stories/fernhill/WALKTHROUGH.txt` and its like are documents, not test inputs: David's ruling, *"walkthrough.txt is just an artifact and has no bearing on testing for a chord story."* The 237-line file stays as prose for a reader.

**An ending is a declarative state, and the card that reaches it is an END STATE card** (David, 2026-09-25, Q-5: *"an ending is a declarative state. A card would block additional commands in that card and show a message for 'END STATE'"*). The tree marks the card on which the story ended with the ending's id; the Testing tab shows END STATE there and accepts no further command on that card; and D4's assertion is exactly that the replay's ending record matches the id the card declares. Prose along the line is not re-checked by D4 — the cards already carry what the engine said (ADR-307 D3), and one place pins prose. **This changes today's walker**, which revives the engine after a card that ended the game and runs the line's remaining cards (`packages/branch-tester/src/tree-walker.ts:368`, "fork-on-the-death-card is a legitimate shape"). Under D4 a line ends where the story ends; a fork *from* an earlier card stays legitimate, a card *after* the END STATE card does not.

**Rejected: D4 also diffing each card's recorded output during the ending replay.** It catches prose drift on the winning path in the same run, and it duplicates what a tree replay already does, with a second bless step.

**What D2 and D3 give an ending without D4.** A `win` or `lose` clause is a rule like any other: its precondition is arranged, its final command runs, and the ending record is asserted. That proves the clause fires. Only a tree line proves a player can get there, and the two proofs are reported separately.

**Rejected: a new per-ending artifact naming its ending.** It never shares the tree's churn, and it is a second recording format for what a tree line already is. **Rejected: no authored reachability tier.** Drops D4 entirely and leaves D5 counting branches and rooms only, which reports nothing about the one thing a story exists to reach.

**The planner is not a dependency.** GH #507 (landmark heuristic) and GH #506 (the factored explorer) stay where they are. If the planner ever emits witness paths, it may *propose* a tree line for the author to keep; it never replaces one, and D4 holds without it.

**D5 — Completeness is measured against the IR, and the report names what is untested.** Three ratios, each with a denominator the enumerator supplies:

- **branches exercised / branches declared** — a SKIPPED test (D2) is declared and not exercised;
- **endings reached / endings declared** — from D4;
- **rooms entered / rooms declared** — from the union of D3's arranged rooms and D4's replayed lines.

The report lists every unexercised branch by its source span, so an author reads "the `when fruiting` arm at `fernhill.story:564` was never run" and not a percentage. This is the answer to "reasonably complete": complete relative to what the author wrote, stated in the author's own terms, with the gaps named.

**D5a — The derived suite runs by default under `sharpee test`; a derived failure fails the build; a SKIPPED branch never does** (David, 2026-09-25, Q-3: "a"). A rule test that fails means the story does not do what its own source says, which is the strongest failure a story test can produce, and it exits non-zero. A SKIPPED branch is a limit of the arrange step, not of the story; it appears in D5's ratio and in the gap list, and it leaves the exit code alone.

**Rejected: run by default, report only.** Safe for adoption, and it makes the tier something an author can ignore, which is how the tree reached 93% churn. **Rejected: opt-in flag.** The smallest change to `sharpee test`, and the tier gets no traffic until someone remembers it exists.

**D6 — The derived suite is generated at test time and never stored; the hand-authored tree keeps only what the IR cannot say.** Committing a derived artifact reinstates the 93%-rewrite problem in another hat. The tree remains the home for assertions about prose — how a passage should read, what a channel should carry — and for authored scenarios that cross many rules. Its format (ADR-307, ADR-355) does not change; its expected size does. No new golden tier is added by this ADR, and D4 adds no prose check of its own (settled by Q-5): the tree's cards are the one place prose is pinned.

**D7 — Lenses and the walk stay diagnostics. They never gate, and they never count toward D5.** ADR-294 D23's instruments answer "what did the author forget" under a budget, with the contract that absence is not proof. That contract is right for them and disqualifying for a test. They run on demand, they report findings, and a build does not wait on them.

**D8 — Dungeo and the `.transcript` world are untouched.** Dungeo is an outlier and never a Chord design input; its `wt-*` chain and unit transcripts stay exactly as ADR-302 and ADR-306 D3 left them. This ADR is for Chord stories only.

**D9 — Each decision this ADR overrides elsewhere gains a note, written by the plan phase that lands the change.** Three rulings in other records are touched, and an unowned flip is how a corpus acquires unreliable Status lines (ADR-355 D6 set the pattern). The owner is in every case **the plan phase that lands D4**, and the trigger is that phase's completion — not this ADR's acceptance, which authorizes nothing:

| Touched | What this ADR does to it | What the owner writes |
| --- | --- | --- |
| **ADR-353 D7** — "the tree document … do not change" | D4 adds an optional ending id to a card | A note beside D7 recording the one field ADR-356 D4 adds; D7's other subjects — the CLI's role, the assertion core, the pinned seed — are untouched |
| **ADR-353 D8 / Phase 16** — "whether a card reached after an ending reads as *ended* or as *failed* … a ruling only David gives … no session may close it by inferring the ruling" | David gave the ruling on 2026-09-25 (Q-5): *ended* — the card is an END STATE card, blocks further commands, and shows END STATE | A note beside D8 recording that the ruling was given here, quoting it, so Phase 16 can close on a ruling David made rather than one inferred from what was built |
| **ADR-340 D5** — `<story>.tests.json` "keeps its name and shape" | the card shape gains one optional field | A note recording the one addition; every other item on D5's facade list stands |

No ADR's **Status** line flips on account of this — a touched decision inside a document is not a superseded document. The walker's revive-after-ending (`tree-walker.ts:368`) is code, not a recorded decision, and needs no note beyond the commit that changes it.

## Affected

Named because rule 8b and CLAUDE.md's platform gate make this list the definition of what must be discussed, and what must move together.

**`packages/world-index` — the enumerator (D1, D5's denominators).** A new derivation beside `src/statements.ts`, consuming `forEachStatementRoot`, emitting the clause-branch records with spans. Exported from `src/index.ts` like `collectStateReaders` is. The five causal surfaces the spike found the planner had to read (`entity.onClauses`, `traits[].onClauses`, `entity.topics`, `machines`, `actions`) plus `timers` and `sequences` are the walk; the predicate-span gap found in the #518 session (`packages/chord/src/analyzer.ts:7235`, `predicate` conditions carry no `span`) will show up here as branches whose *condition* has no line, which is a compiler fix rather than a test-tier workaround.

**`packages/branch-tester` — the runner (D2, D3, D4, D5).** `src/tree-walker.ts` already boots a story, runs commands, and evaluates `states:` pins through the assertion core; the derived runner is a second entry beside it that arranges, runs one command, and asserts. `src/runner.ts` gains the coverage report. For D4, the walker's revive-after-ending at `:368` gives way to the END STATE card: a line stops on the card that ended the story, and the card carries the ending id the replay is asserted against. That is one new optional field on a card in `src/tree-document.ts` — the ending id on the card that reached it — and no other change to the format (D6). It moves `TREE_DOCUMENT_VERSION` (today `1`, `src/tree-document.ts:39`), or rides ADR-355's move if that lands first; either way a reader meeting the older shape refuses it by the invariant that already exists, and there is no shim. ADR-355's segmentation is otherwise indifferent to it.

**`tools/ide/web/testing-surface` — the END STATE affordance (D4).** The tab shows END STATE on the ending card and accepts no further command on it. Rule 8b moves it with `tree-document.ts` in the same commit.

**`packages/story-loader` — the arrange step's home (D2, settled by Q-1).** `src/state-keys.ts` documents its keys as *"loader-internal and invisible to authors … off-limits to TS hatches."* The arrange primitive is a new public function beside the loader's existing exports, taking an expression in the pin grammar and doing the `setStateValue`/`moveEntity` calls itself. The header's promise is kept, and AC-5 enforces it.

**`packages/transcript-tester` — the assertion core (D3).** `src/assertion-core.ts` evaluates the claims D3 maps to. Any claim the effect catalog needs that the core lacks (`gone`, "message id emitted this turn", score delta, counter delta) is added there and imported, per ADR-340 D3.

**`packages/devkit` — the command surface (D5a).** `sharpee test` runs the derived suite and the tree's ending lines by default, prints D5's report, and exits non-zero on any derived or ending-line failure. SKIPPED never changes the exit code.

**Both native heads — consumers, later.** D5's report is the obvious thing for the Testing tab to show, and ADR-353's single-line visit is unaffected. Nothing beyond the END STATE card is required for the ADR's acceptance criteria.

**Not affected.** `packages/chord` (the compiler; the span gap above is pre-existing), `packages/engine`, `packages/stdlib`. Nothing about how a story runs changes.

## End-to-End Scenario

`fernhill`, whose clause at line 554 is the example throughout.

**Given** `branch-stories/fernhill/fernhill.story` compiled to IR, and `sharpee test` invoked on the project.

**When** the enumerator runs, **then** it emits one record per clause branch — 34 `on` clauses, 3 `select on` arms and 2 `refuse-when` among them — each carrying a precondition, a command, an effect list and a source span; the count is the same on every run.

**When** the runner takes the `when flowering` record, **then** it boots a fresh world at the pinned seed, arranges `player.location = Greenhouse`, `player holds garden shears`, `vine is flowering`, runs `prune vine` through the real parser and engine, and asserts `vine is fruiting`, `silver locket.location = Greenhouse`, and that `vine-fruits` was emitted. The test passes.

**When** an author deletes the `move the silver locket to the Greenhouse` line and runs again, **then** exactly that one test fails, reporting the locket's actual location against the expected Greenhouse, and the branch's span.

**When** the runner takes the `must hold the garden shears` record, **then** it arranges the same room with the shears *not* held, runs `prune vine`, asserts `need-shears` was emitted and that the vine's state and the locket's location are unchanged from what was arranged.

**When** the runner replays the tree line whose last card is the END STATE card for `fernhill-saved`, **then** the world's ending is `fernhill-saved` at that card; remove the card and the run fails, naming `fernhill-saved` as the ending not reached. If no card in the tree declares `fernhill-lost`, the report lists it as unreached.

**When** the report prints, **then** it shows three ratios with denominators 39, 2 and the story's declared room count, and lists any unexercised branch by span. On fernhill as written the branch ratio should read 39/39, or the report names the branch that is not.

## Acceptance Criteria

Each names what decides it. All are **not met today**, which is expected — this ADR authorizes no implementation. Fixture stories are dedicated test stories, never real ones.

1. **AC-1 — The enumerator is total and deterministic.** Over a fixture story with a known clause structure, the enumerator emits exactly the expected branch records, in a stable order, with a span on each; two runs are byte-identical. **SELF-VERIFYING** — the count is asserted against the fixture's authored structure, not against a previous run.
2. **AC-2 — A derived test detects a deleted effect.** The fernhill `when flowering` branch passes on the story as written; with the `move` line deleted in a fixture copy, exactly that test fails and its failure names the locket and the Greenhouse. **SELF-VERIFYING** — the assertion reads `world.getLocation()`, so an effect that did not happen cannot pass it.
3. **AC-3 — A refusal test asserts the negative space.** A fixture clause whose guard emits its refusal *and then runs its body* (a planted defect) fails the derived refusal test on the state assertion, not merely on the message. **SELF-VERIFYING** — a test that checked only the message id would pass the planted defect.
4. **AC-4 — An unarrangeable precondition is SKIPPED with a reason, never absent.** A fixture clause guarded by a shape outside the arrange set produces a result whose status is SKIPPED and whose reason names the shape; the branch still appears in D5's denominator. **SELF-VERIFYING** — the total count must equal AC-1's count, so a dropped test changes the sum.
5. **AC-5 — The arrange step never writes loader keys from outside the loader.** A grep-shaped test asserts that no file outside `packages/story-loader/src` writes to `chord.state.`, `chord.story.state`, `chord.occurrence.` or `chord.gone.`. **SELF-VERIFYING** — it is the promise `state-keys.ts`'s header makes, turned into an assertion.
6. **AC-6 — An END STATE card proves its ending and a truncated line fails by name.** Replaying a fixture tree line whose last card declares an ending yields `storyEnding.messageId` equal to that id; the same line with that card removed fails with a message naming the ending. A declared ending no card carries appears in the report as unreached. A card placed after an END STATE card is MALFORMED, reported and not run. **SELF-VERIFYING** — the assertion reads the world's ending record after a real replay; a replay that did not end cannot satisfy it.
7. **AC-7 — Real path: a command the parser cannot resolve is a reported failure.** A fixture clause whose subject has no vocabulary produces a derived test that fails at parse and reports the parse result as its outcome. **SELF-VERIFYING** — any implementation that bypassed the parser would pass this test's command and fail this criterion.
8. **AC-8 — The report names unexercised branches by span.** With one fixture branch deliberately unarrangeable (AC-4's), the report's branch line reads *n−1 / n* and the listed gap carries that branch's span. **SELF-VERIFYING** — the span is compared to the fixture's authored line.
9. **AC-9 — Nothing derived is written to disk.** After a full run, `git status` in the fixture project shows no new or modified file under the story directory. **SELF-VERIFYING** — it is D6 as an assertion.

## Consequences

- **The tree's job narrows.** ADR-307's tree stays the recording surface for prose and for authored cross-rule scenarios, and it stops being where rule behavior is transcribed. Its expected size for a story like secret-letter drops from hundreds of cards to whatever the author wants to say about prose. ADR-355's segmentation is unaffected and still worth doing for what remains.
- **Completeness acquires a denominator.** "Reasonably complete" stops being a feeling and becomes three ratios with named gaps. Testing intelligence as a product surface (ADR-294 D13–D16) gets its first number that an author can act on line by line.
- **Reachability and correctness are separate tiers, deliberately.** D2 proves a rule in a state; D4 proves a state is reachable along a line the author played. The author owns the shape of the winning states; the tool owns everything below them. A rule that passes D2 and lives behind a state no line reaches is exactly what the lenses (D7) and the analysis proposal exist to find. No tier pretends to be the other.
- **ADR-353's Phase 16 has its ruling.** Its D8 held Phase 16 open for exactly one call — *ended* or *failed* for a card after an ending — and forbade any session from inferring it. David made it here (Q-5): ended, as an END STATE card. D9 names who writes that down; the plan phase that lands D4 may then close Phase 16 on a ruling given rather than inferred.
- **A line ends where the story ends.** The walker's revive-and-continue after a game-ending card (ADR-307-era behaviour) gives way to the END STATE card. Any existing tree with cards after an ending will report them MALFORMED at conversion; under this project's no-backwards-compatibility rule that is a one-shot repair, not a shim.
- **The planner and the explorer lose their place on the critical path.** GH #506 and #507 remain valid research and stop blocking anything. ADR-294 D23 stands unchanged; this ADR is the test tier beside its diagnostic tier.
- **Two loader promises become enforced.** `state-keys.ts` says its keys are internal; AC-5 makes that a test. The `chord.gone` flag's "conditions still evaluate" semantics (ADR-325 Z6 as amended) get exercised by every derived test on a `remove` statement.
- **The predicate-span gap becomes visible to authors.** Branches whose condition carries no span will report their span from the clause rather than the condition, and the report will say so. That is a `packages/chord` fix to schedule, not a test-tier workaround.
- **Secret Letter is the stress case, not the pilot.** It has 13 timers, `once` clauses, `asked` history and NPC positions driven by time — every shape Q-2 is about. Fernhill, with none of them, is where the first cut lands and is measured; secret-letter is where the arrange set's limits are found. The port itself stays on hold; the story is fixture data here exactly as it was for ADR-353 and ADR-355.
- **Every decision here is a `packages/` change.** Acceptance of this ADR authorizes nothing; each Affected module gets its own discussion under CLAUDE.md's platform rule before a plan phase touches it.

## Session

Session **082049**, 2026-09-25, on `explorer-prototype`. Written after David closed the explorer week with two statements the ADR answers directly: *"We need to figure out how to effectively test a large story. If that means going back to transcript and walkthrough tests, then we need discuss that. I still believe Chord's IR might provide a better path,"* and, on the first proposal's planner dependency, *"this also sounds somewhat 'experimental'. Is there a deterministic path to a reasonably complete testing suite?"* The answer — arrange rather than plan, the author's played lines rather than a planner, a denominator from the IR — was given in conversation and he asked for the ADR. Q-4 corrected the draft's premise that a `WALKTHROUGH.txt` file could serve as the ending tier: it is a document, and the tree's own lines are the walkthroughs. The clause counts in Context were taken in this session from the committed `dist/*.ir.json` of both stories; the tree and rewrite figures are ADR-355's, not re-measured. GH #515, #517 and #518 were closed in the same session as shipped.

**Interviewed the same session.** Q-1 through Q-5 were resolved one at a time under rule 11a, each folded before the next was posed. Q-1 ("a") put the arrange primitive in the loader; Q-2 ("a") fixed the first cut at the arrange floor, measured on fernhill; Q-3 ("a") made the derived suite a default, build-failing tier with SKIPPED never red. Q-4 overturned the draft: David ruled `WALKTHROUGH.txt` *"just an artifact"* with no bearing on testing, and on the question of what then proves an ending deterministically — nothing does without a recorded path — chose the tree's own lines, with the author providing the shape of the winning states. Q-5 gave that its mechanism: an ending is a declarative state, the card that reaches it is an END STATE card that blocks further commands, and D4 asserts on it rather than re-checking prose. The Open Questions section was removed on Q-5's fold.

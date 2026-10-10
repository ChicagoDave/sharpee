# ADR-365: Claims under a necessary set — the author states what is reachable, and what it takes

**Status**: **ACCEPTED** (David, 2026-10-10, session 1fdd53 — "yes, mark it accepted") after the open questions interview resolved all five questions the same session and `adr-review` returned 22/22 with three small folds applied (the Kind header, the manifest field's shape in D7, load-time rejection in D1 and AC-4a). Drafted the same day at David's instruction ("yes, draft the ADR") after a day's conversation that began with the blog draft `docs/work/blog/2026-10-10-testing.md` and ended with a measurement: five authored claims about Fernhill settled by brute-force play in 66 seconds, where the September spike had run 900 seconds and never found the winning path. The decisions are David's, stated in conversation and recorded here; the measurements were taken the same day and are reproduced in Context. All five open questions were resolved by interview the same session (Q-1 → D9, Q-2 → D2, Q-3 → D7, Q-4 → D10, Q-5 → D11), so there is no Open Questions section, which is the condition ADR-0009 Decision 2 requires of an ACCEPTED record. **No implementation is authorized by this ADR in any state.** Everything that reaches `packages/` is gated on its own discussion per `CLAUDE.md`; what exists today lives in `tools/explorer-probe/` and is a measurement, not a product.

**Scope**: `tools/explorer-probe/` (the measured shape: `explore.js --necessary <file>`, the claim predicates, the per-set walks, and `necessary/fernhill.json`). The eventual homes, each gated: `packages/branch-tester` (the claims runner and the walk, D10, and the manifest's `claims` field, D7), `packages/chord` (the `claims` block, D7), `packages/world-index` (set proposals as a later convenience, D2), and `docs/proposals/state-space-analysis.md` (whose `claims` block this supersedes in place).

## Date: 2026-10-10

**Kind**: technical

## Parent

- **ADR-322** (state-space analysis, the umbrella). **D11** defined a claim's three outcomes, held / violated / unproven, and the authored disposition; this ADR keeps all three and adds the thing D11 did not have, the set a claim is proved under. **D10** said the umbrella decides no checks; this is the first. **D5** (syntax is decided last) is why D7 below ships a sidecar and shows the Chord block as a candidate. **D7** (the soundness contract holds at any speed) is preserved and sharpened by D3: absence is not proof of the whole story, but exhaustion under a finite declared set is proof relative to that set.
- **ADR-294 D23** (the explorer is a family of scoped lenses). Not retired. A lens answers "what did the author forget" under a budget. A claim answers "is what the author said true", stops when it is settled, and carries a set instead of a budget as its primary bound. The walker is the shared substrate for both, as D23 already says.
- **ADR-356** (the story is the test suite). **D4** (endings are proved by the lines the author played) stands: a claim's witness is a path the tool *proposes* for the tree, exactly as D4 already allows a planner's witness to be, and a played line stays the authored proof. **D7** (lenses never gate) stands for lenses; whether a violated claim gates is Q-1. **D5**'s denominator (clause branches) gains a sibling in D6: claims declared versus claims held.
- **ADR-293 D12** (search executes the real engine, never a model). Preserved: every witness below was produced by the real parser and engine at the pinned seed, by forking the engine's own save state.
- **GH #507** (the planner degenerates to blind search without a landmark heuristic). Bypassed, not solved: the author's set is the heuristic, supplied rather than derived. **GH #506** (the factored explorer) is unchanged.
- `docs/proposals/state-space-analysis.md` §(the `claims` block). Superseded in place by D1 and D7: the block's statements survive as claims, and each now carries a set.

## Context — measured, not assumed

**Brute force without a set cannot answer reachability.** The spike of 2026-09-22 (`docs/work/archive/testing-explorer/spike-20260922-explorer-measurement.md`, Finding 8) walked Fernhill breadth-first through the real engine under the IR-derived candidate set: 900 seconds, 715,903 commands, 23,163 states, defeat only. The 29-command winning line written down in `branch-stories/fernhill/WALKTHROUGH.txt` sits at depth 29 behind a branching factor of 5 to 10, and breadth-first search does not reach depth 29 that way. The planner built in the same spike (#507) modelled the story's causality completely and stalled because every state lacking the deed scored the same: it had no sense of what mattered.

**What mattered is what the author already knows.** A walkthrough is a necessary set: these verbs on these things in these rooms. On 2026-10-10 the set was read off Fernhill's walkthrough by hand (9 rooms, 13 things, 10 verbs) and the walker was taught to prune to it on both sides: candidate commands are cut to necessary verbs on necessary things and exits into necessary rooms, and the state identity hashes only necessary things' placement and state. Same walker, same engine, same seed 1209:

| Run (2026-10-10, seed 1209) | Budget | States | Commands | Endings found |
|---|---:|---:|---:|---|
| Spike, IR-derived set (2026-09-22) | 900 s | 23,163 | 715,903 | defeat only |
| Necessary set, one shared walk | 90 s | 14,359 | 67,103 | defeat and **victory at depth 24** |

The 24-command victory is shorter than the written 29 because the walk never touched the vine or the locket: it opened the folly door, took the deed box whole, and walked out. That is a story finding (the diary page says "only the little silver thing will open it", and the box being portable bypasses the clue), and it is the first real defect brute force has found on a Chord story by reaching an ending.

**Claims, and why each needs its own set.** Five claims were written for Fernhill, each over something the engine already records (an ending, a placement, a Chord state, a turn's events, and a negative placement). Run under one shared set with a 240-second budget, four settled and the diary claim came back unproven; the diary page is inside the travelling trunk, and the trunk was not in the set. Adding the trunk settled the diary in ten commands and *lost the victory*: the larger shared set no longer reached depth 24 inside 240 seconds. Every claim was paying for the largest one.

With each claim carrying its own set, one walk per distinct set, 120-second budget per walk (`node tools/explorer-probe/explore.js branch-stories/fernhill/fernhill.story --necessary tools/explorer-probe/necessary/fernhill.json --max-states 500000 --max-seconds 120 --max-depth 80`, 2026-10-10):

| Walk | Set | Stopped because | States | Commands | Time |
|---|---|---|---:|---:|---:|
| the file's set (victory, deed in hand) | 9 rooms, 13 things, 10 verbs | all claims settled | 7,790 | 42,224 | 65.9 s |
| Tobias asked about the folly | 2 rooms, 1 thing, 1 verb | all claims settled | 3 | 5 | 0.0 s |
| diary page read | 6 rooms, 4 things, 4 verbs | all claims settled | 21 | 38 | 0.1 s |
| deed box never leaves the Folly | 7 rooms, 6 things, 6 verbs | all claims settled | 85 | 248 | 0.4 s |

| Claim | Verdict | Witness |
|---|---|---|
| the story can be won | held | 24 commands |
| the deed is in hand | held | 21 commands, through the vine and the locket |
| Tobias has been asked about the folly | held | `north / ask Tobias about the folly` |
| the diary page has been read | held | 10 commands |
| the deed box never leaves the Folly | **violated** | 14 commands: `… open folly door / north / take deed box / south` |

Total 66.4 seconds, every walk stopped by its claims rather than by its budget. The three small walks took under a second between them.

**Everything a claim can be about is already recorded.** The readable trait keeps `hasBeenRead` (`packages/world-model/src/traits/readable/readableTrait.ts:38`), rooms keep `visited`, the character model keeps the told-record, Chord keeps an occurrence counter per rule and `on` clause (`chord.occurrence.*`, `packages/story-loader/src/state-keys.ts:24`), and every turn returns its events (`TurnResult.events`, `packages/engine/src/types.ts:89`). A claim about a joke that leaves no state behind is a claim about an event on the path. No new instrumentation is needed for D1's seven predicates.

**The one mechanical trap is dedup.** The identity hashes state, not history. Two paths that differ only in whether the diary was read on the way would merge, and the first path to a claim would be lost. The spike therefore folds which claims a path has satisfied into the state's identity (D5), which is the standard landmark trick and costs one bit per positive claim.

## Decision

**D1 — A claim is an authored, checkable statement that the story can reach a state (or can never reach one), over something the engine already records.** Seven predicates, each read off the running world or the turn that produced it: an **ending** (kind, message, cause); the player's **room**; a thing's **placement** (in the player's hands, in an entity, or outside a room); a Chord **state** value; a trait **flag** such as `hasBeenRead`; a clause having **fired** (its occurrence counter above zero); and an **event** emitted by the reaching turn (type, target, topic). A claim marked `never` is negative. No predicate requires new instrumentation; a story that keeps a fact as state, a counter, or an event can claim it. A malformed claim is refused at load, before any walk runs: one with no name, with zero or more than one predicate, or with a `needs` whose rooms, things, or verbs is not a list, is rejected with a message naming the claim, and the spike does this today (`loadNecessarySet`, `tools/explorer-probe/explore.js`).

**D2 — A claim owns its necessary set: the rooms, things, and verbs it takes to reach it, and the author writes it** (David, 2026-10-10, Q-2: "a, with b and c as conveniences later"). The set is the author's statement that nothing else is on the way, written with the claim and before the story, the same way the claim is; the walker prunes to it on both sides, candidates and identity. Proposing a set from a played tree line (every verb, noun, and room on the line) or from ADR-321 D14's progression chain are conveniences to add later, offered as a candidate the author edits, never a source the walk reads on its own; either reopens #507 only as a convenience (D8). Claims that declare the same set share one walk; a claim that declares none inherits the file's. The set is itself a claim: a positive claim that comes back unproven under its set is reported as *the set may be incomplete*, and that is a finding about the declaration, never a silent "unreachable". The measured reason sets belong to claims and not to the story is in Context: one shared set made every claim pay for the largest, and lost the victory.

**D3 — A walk under a declared set proves relative to that set, and exhaustion settles negative claims.** A positive claim is settled by the first state that satisfies it, and breadth-first order makes that witness the shortest path under the set, so "the shortest win is at most N" comes with the witness. A negative claim is violated by its first witness and held only when the walk exhausts the set's frontier. The verdicts are ADR-322 D11's three: **held**, **violated**, **unproven**, where unproven means the budget stopped the walk first. ADR-322 D7's contract is sharpened, not replaced: absence is still not proof of the whole story; exhaustion under a finite declared set is proof relative to that set.

**D4 — The walk stops when its claims are settled.** Every positive claim witnessed and no negative claim pending ends the walk with stop reason `all-claims-settled`; the budgets (states, seconds, depth) remain as the backstop and are named in the report when they fire. A block of claims therefore costs what its claims cost, not what the story costs.

**D5 — Which positive claims a path has satisfied is part of the state's identity.** The walker keeps the first path to each claim and merges everything after it. Negative claims add no bits; their violation is reported at the state that caused it.

**D6 — A claim's witness is a proposal, and claims are a second denominator.** The witness path for an ending claim is a tree line the tool proposes and the author may keep; ADR-356 D4's played line stays the authored proof of an ending, as D4 already provides for a planner's witness. Beside ADR-356 D5's "branches exercised over branches declared", the report carries "claims held over claims declared", with each unproven claim naming what its walk ran out of.

**D7 — Claims are Chord, in a `.chord` fragment the test manifest selects; the story never imports it** (David, 2026-10-10, Q-3: "go with the manifest", after thinking through `.story`, an imported `.chord`, and a new `.claims` type). The syntax is a `claims` block in Chord, so the compiler sees it, Problems carry its lines, and the Index tab can list it. The file is an ordinary `.chord` fragment: `import` is already extension-free and assumes `.chord` (`packages/chord/src/parser.ts:4165`), so a new extension would buy nothing. What is new is who selects it. The `.story` does not import the fragment. The test tree's manifest (`<story-id>.tests/manifest.json`, ADR-355 D4, which already holds version, story and seed) names the active claims fragment, and the runner compiles the story plus that fragment. The field is `"claims": "<path>"`: one `.chord` fragment, as a path relative to the story file, optional; absent means no claims run, and a path that does not resolve is a load-time error naming the manifest. Two consequences are the point: claims never ride the published IR, by construction rather than by stripping; and swapping claims for a different run is a different file name in the manifest, with the story untouched. The IDE reads the manifest's choice to show claims, not the story's imports. Today's measured shape is the JSON sidecar in `tools/explorer-probe/necessary/fernhill.json`, which stays the spike's input until the runner leaves the spike (Q-4). The Chord form, **not yet shipped**, reads in Fernhill's terms:

```
claim the story can be won
  ending: victory
  needs the Iron Gates, the Gravel Drive, the Fountain Court, the Boiler Shed,
        the Entrance Hall, the Kitchen, the Greenhouse, the Folly Hill, the Folly
  needs Tobias, the stopcock, the primer plunger, the boiler, the garden shears,
        the sherry bottle, Mrs Kettle, the vine, the silver locket, the folly door,
        the fuse, the deed box, the deed
  needs ask, turn, push, turn on, take, give, prune, open, cut

claim the diary page has been read
  needs the Iron Gates, the Gravel Drive, the Fountain Court, the Entrance Hall, the Kitchen, the Study
  needs the sherry bottle, Mrs Kettle, the travelling trunk, the diary page
  needs take, give, open, read

claim the deed box never leaves the Folly
  needs the Folly, the Folly Hill, the Greenhouse, the Fountain Court, the Boiler Shed, the Gravel Drive, the Iron Gates
  needs Tobias, the stopcock, the primer plunger, the boiler, the folly door, the deed box
  needs ask, turn, push, turn on, open, take
```

**D8 — The planner is bypassed, not solved.** GH #507 asked for a landmark heuristic so a search could find the winning path on its own. The author's set is that heuristic, supplied rather than derived, and D2 is what makes supplying it cheap. #507 stays open with a note to this ADR; a proposed set (D2's later conveniences) would reopen it as a convenience, never as a dependency.

**D9 — Claims never gate the build; a failing claim is the point** (David, 2026-10-10, Q-1: *"we want the author to think about tests before writing their story (TDD) so failed claims are a good thing"*). Claims are written before the story, as the author's statement of what the finished story will do, so the expected first run is every claim unproven or violated, and the author writes toward green. A violated or unproven claim is reported with its verdict and witness and changes nothing about the build's exit; the number that matters is D6's "claims held over claims declared", read as progress. This is not ADR-356 D7's reason (a lens is a diagnostic with a budget); it is the opposite one: a claim is a test the author wrote first, and a red test before the code exists is working as intended. A per-claim binding disposition (ADR-322 D11's authored disposition) is not adopted; nothing here is reopened unless an author asks for a claim that must hold at publish.

**D10 — The runner lives in `packages/branch-tester`, beside the derived runner** (David, 2026-10-10, Q-4: "a"). Branch-tester already owns the test manifest D7's `claims` field goes in, the engine fork pattern the walk is built on, and the run-event wire the Testing tab reads (ADR-357 D9); a claims runner there is one more consumer of each, and the `sharpee test` run and the Run button carry its verdicts the way they carry the derived tier's. The walker's room-reachability substrate moves with it, and the explorer lenses (ADR-294 D23) then borrow the walk from branch-tester rather than from the spike, which is the package the spike was always meant to earn ("built one at a time under `tools/` until one earns a package", D23). Nothing static is split out to `world-index` beyond what D2's later set proposals may need. This is a `packages/` change and is discussed before it is built, per `CLAUDE.md`; the spike remains the implementation until that discussion lands it.

**D11 — Exhaustion cost on a larger story is measured by the landing phase, not before acceptance** (David, 2026-10-10, Q-5: "b — we're going to implement this one way or another; I have confidence that we'll figure out how to manage larger stories through experimentation"). A negative claim is held only by exhausting its set, and Fernhill's exhausted 85 states in under half a second; what a market-sized set costs on Secret Letter (about twenty independently takeable wares, spike Finding 6) is not known. The number is owed by the phase that moves the runner into `packages/branch-tester` (D10), recorded as AC-8, and whatever mitigation it shows is needed (a tighter default set, a per-walk budget that reports unproven, a factored identity over the set) is decided then, from the measurement. The ADR does not wait on it.

## Affected

- `tools/explorer-probe/explore.js` — the measured implementation: `--necessary <file>`, the seven predicates (`claimHolds`), per-set walks (`exploreClaims`, `groupClaimsBySet`), claim bits in the identity, and the `all-claims-settled` stop. A spike, outside the published packages, touching no `packages/` code.
- `tools/explorer-probe/necessary/fernhill.json` — Fernhill's five claims and their sets, the corpus for every number in Context.
- `branch-stories/fernhill/dist/fernhill.ir.json` — regenerated 2026-10-10 (`./sharpee compose`), since the one on disk predated the syntax round.
- `branch-stories/fernhill` — owes a GitHub issue for the deed box finding, with the 14-command path as the reproduction.
- `docs/proposals/state-space-analysis.md` — its `claims` block is superseded in place by D1 and D7; the note is written by whichever plan phase lands the change (ADR-356 D9's rule).
- ADR-322 D10/D11, ADR-294 D23, ADR-356 D4/D7, GH #507 — each gains a note pointing here, written by the plan phase that lands the change; none is edited by this ADR.

## End-to-End Scenario

An author finishes a draft of Fernhill and writes five claims: the story can be won, the deed ends up in hand, Tobias can be asked about the folly, the diary page can be read, and the deed box never leaves the Folly. Each claim names what it takes. On the next build the walker runs four walks, one per distinct set, and stops each the moment its claims settle. The author reads four held verdicts with their shortest paths and one violation with a 14-command reproduction: the deed box can be carried out without the locket. The diary page, the author remembers, says only the little silver thing will open it. The author makes the box fixed in place, rebuilds, and the negative claim is held by exhaustion in under a second.

Later the author adds a trunk to the Study and the diary claim comes back unproven. The report says the walk exhausted its set without a witness and names the set. The author adds the trunk to the claim's `needs` and the claim is held in ten commands. Nothing was played by hand.

## Acceptance Criteria

1. **AC-1 (D1).** Each of the seven predicates has a claim in the corpus file that settles under its own set, with the witness recorded. Today five of seven are exercised on Fernhill (ending, placement, state, event, negative placement); room, flag, and fired are implemented and unmeasured. **MEASURED for five; OPEN for three.**
2. **AC-2 (D2, D4).** Fernhill's five claims settle in one invocation with every walk stopped by `all-claims-settled` and total time under 90 seconds at the pinned seed. **MET 2026-10-10: 66.4 s, four walks, all claims settled.**
3. **AC-3 (D2).** A positive claim whose set omits a required thing reports unproven and names the set; adding the thing settles it. **MET 2026-10-10: the diary claim, unproven without the travelling trunk, held in 10 commands with it.**
4. **AC-4 (D3).** A negative claim is reported violated with the first path that breaks it, and held only on frontier exhaustion; a budget stop leaves it unproven. **MET for violated (the deed box, depth 14); OPEN for held-by-exhaustion, which needs a true negative claim on the corpus.**
4a. **AC-4a (D1, rejection).** A claims file with a nameless claim, a claim carrying zero or two predicates, or a `needs` key that is not a list is refused at load with a message naming the claim, and no walk runs. **MET by the spike's loader today; the branch-tester runner re-pins it when it lands (D10).**
5. **AC-5 (D5).** Two paths that differ only in a satisfied claim do not merge: the first path to each positive claim is retained. **STRUCTURAL**, by the identity carrying the claim bits; a unit test on the spike pins it when the spike earns tests.
6. **AC-6 (D7).** No Chord syntax ships under this ADR; the sidecar is the spike's only input shape until the runner leaves the spike (Q-4). When the `claims` block lands: the `.story` compiles identically with and without the fragment, the published IR carries no claim, and the manifest's `claims` field selects the fragment the runner compiles. **MET by construction today; the three landing checks are OPEN.**
7. **AC-7 (D8).** GH #507 carries a note that the author's set bypasses the heuristic, and stays open. **OPEN** until the landing phase writes it.
8. **AC-8 (D11).** Before the runner ships in `packages/branch-tester`, one negative claim with a market-sized set is run on Secret Letter under a stated budget, and the walk's states, commands, time, and stop reason are recorded in this ADR's Context with the mitigation chosen, if any. **OPEN**, owed by the D10 landing phase.

## Consequences

- **Reachability stops being the explorer's unanswerable question.** Under a declared set it is answered on every build, in seconds for most claims and about a minute for an ending, with a witness.
- **The author writes sets, which is a cost accepted on purpose (D2).** A set is a walkthrough's vocabulary, which authors already produce, and under D9 it is written before the story as part of saying what the story will contain. Proposals from a played line or the progression chain come later as conveniences.
- **A wrong set is visible, never silent.** Too small, and the claim comes back unproven naming the set; too large, and the walk is slower but no less sound.
- **Negative claims are the expensive ones.** They must exhaust. Tight sets keep them cheap (0.4 s on Fernhill); a loose set on a large story may not finish, and the report says so. What that costs on Secret Letter is measured when the runner lands (D11, AC-8), and managing larger stories is expected to come from experiment rather than from a rule set here.
- **Claims are the author's test-first list.** A new story starts all red and the claims report is the burndown; no build is ever failed by a claim (D9). The consequence for the IDE is that a claims row reads as progress, not as a problem.
- **The runner's home is decided (D10) but not built.** Moving the walk into `packages/branch-tester` is a platform change with its own discussion; until it lands, the spike is the implementation and the Testing tab cannot show a claims row. Until then the spike is the implementation and the lens tests' stale pins (8 of 43 failing before and after this work, from story drift since the syntax round) remain a separate repair.

## Session

Drafted in session 1fdd53 (2026-10-10, main). The measurements are from the same session: the necessary-set runs at 90 and 240 seconds, the shared-set claims runs at 240 seconds, and the per-set claims run at 120 seconds per walk, all at seed 1209 against `branch-stories/fernhill/fernhill.story` with its IR regenerated the same day.

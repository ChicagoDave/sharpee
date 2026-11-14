# ADR-396: A `never` claim is watched and searched, and is never called held

**Status**: **ACCEPTED** (David, 2026-11-14, session 9c75a4: "yes", after the interview and a clean review. Written the same session at his direction, "C then B": measure first, then one record for the redesign. Nothing here is built. Its first eight open questions were answered by David in the same session's interview, and each answer is recorded in the decision it settled. A review the same session found three more, which he answered the same way. No question is open.)

## Date: 2026-11-14

**Kind**: technical

**Scope**: `packages/branch-tester/src/claims/`, `packages/branch-tester/src/tree-walker.ts`, `packages/chord/src/claims.ts`, `packages/ide-protocol/src/run-events.ts`, `packages/devkit/src/commands/test-claims.ts`, `tools/ide/web/testing-surface/src/claims.ts`, `test-stories/`, `branch-stories/fernhill/fernhill.claims.chord`, `website/src/app/chord/guide/tooling/claims/`, `docs/architecture/chord-grammar-changes.md`

## Supersedes

ADR-365 D3 as it applies to `never` claims, and ADR-365 AC-4's "held only on frontier exhaustion". ADR-365 D1's "exactly one predicate" is amended by D3b, and ADR-365 D2's inheritance of the block's needs is withdrawn for `never` claims by D2a. ADR-365 D2 and D3 otherwise stand unchanged for positive claims. ADR-365 D12's cone and ADR-367's locks are built on, not replaced.

ADR-365's Status does not change: the supersession is partial. The session that records this ADR's acceptance adds a dated amendment note to ADR-365 at D1, D2, D3, D6, D9 and AC-4, each pointing here, in the same commit as the Status flip on this file, the way ADR-367's acceptance annotated ADR-365 D2. Until that commit ADR-365 reads as it does today.

## Context

A claim is an author's statement about what a story can reach. ADR-365 gives each claim a necessary set, the rooms, things and verbs the author says are on the way, and the walk types only commands inside that set.

For a positive claim that is sound. The walk does not remove anything from the world; it only limits what it types. A path it finds is a real path in the whole story.

For a `never` claim it is not. ADR-365 D3 reports a `never` as held when the walk runs out of new states under the set. That shows no counterexample exists among the commands the set allows. The counterexample an author cares about usually needs the thing or the verb they did not think to list.

### Measured, 2026-11-14, on the built tree at `372d48ead`

**One missing verb turns a violation into HELD.** `test-stories/lodge` has `never the strongbox leaves the Vault` with `needs verbs: turn, take`.

- `node packages/devkit/dist/cli.js test test-stories/lodge` printed `claims: 9 of 10 held, 1 violated (seed 42)` and `VIOLATED  the strongbox leaves the Vault (never) — at depth 7: north / east / turn valve / west / north / take strongbox / south`.
- The same command on a scratch copy whose only change is `needs verbs: take` printed `claims: 10 of 10 held (seed 42)` and `HELD  the strongbox leaves the Vault (never) — every reachable state under its set was tried`.

**Four restrictions sit under every HELD, and the author sees one.**

1. The author's set.
2. The walker's own vocabulary. `claim-candidates.ts` types a standard verb on a thing only where one of the thing's traits offers it (a fixed list: examine, read, push, pull, climb, eat, open and close, turn on and off, wear and take off, search, take, drop, and a few with an instrument) or where the thing has its own `on` clause for the action (`claim-candidates.ts:202`). So `throw the strongbox` is typed only if the strongbox answers throwing, and a thing with no such clause is never thrown, inserted, shown or locked. It never types `say` or `wait`, a conversation's subject, an exchange's answer, or a story action with two slots, and it types `put` only at `full` breadth.
3. State the identity leaves out so a walk can close: the random cursor, the firing counters and the varying-text state (ADR-365, note of 2026-11-12).
4. The depth limit: 40 turns by default (`claims-walk.ts:58`), and 80 turns, 500,000 states and 120 seconds through `sharpee test` (`packages/devkit/src/commands/test-claims.ts:51`).

**ADR-365 says both things.** D3: "exhaustion under a finite declared set is proof relative to that set". D13: "a hand-written slice can make a `held` verdict unsound, which is the one outcome D3 forbids". Under D2 every set is hand-written.

**The whole story cannot simply be walked.** The lodge has five rooms and eight things. Its "Study without the brandy" claim under every room, every thing but the brandy and eleven verbs exhausted in 5,380 states and 37,164 commands, 27.9 s (`sharpee test --verbose` on a scratch copy). Under its written set it takes 19 states. ADR-365 AC-8 measured the reason: each independent takeable thing doubles the states.

**The compiler cannot yet compute the set.** ADR-365 D12's cone works out which things a claim can depend on. `node docs/work/adr-396-never-claims/probes/cone-probe.cjs test-stories/lodge/lodge.story test-stories/lodge/lodge.claims.chord --why` runs it over the whole lodge with every verb of the standard grammar (77 actions, 447 leading verbs): it finished in 0.13 s and kept all nine things, because it applies every standard action to every thing; its reason for keeping the notice was "the walk's `climbing` on notice". The same probe on the Relighting (13 rooms, 36 things), with a scratch fragment holding the kettle claim, had not finished after 20 minutes with every verb, nor after 17 minutes with `--common`'s 17 verbs, and was stopped both times.

**The rules alone cannot yet prove a `never`.** The Relighting's kettle refuses taking unconditionally (`on the player taking / refuse kettle-is-hobbs`). Asked whether the kettle can be anywhere but the Lodge, the cone's firing pass answered "maybe" under the claim's own set (the same probe with `--own-only`). The cone does see that refusal: its rule for the walk's `taking` on the kettle is marked refused. The "maybe" comes from the set's verb `take` also reaching the standard action `removing` ("take X from Y"), whose rule moves the kettle into the player's hands and which the kettle's clause does not refuse.

**A story whose character tick runs never closes a walk at all.** GH #717. The character-model tick writes the turn number into world state every turn (`character.turn`, `packages/character/src/tick-phases.ts:292`), the identity hashes it, and so every turn is a new state. `node docs/work/adr-396-never-claims/probes/snapshot-diff.cjs docs/work/chord-manual/snapshots/part-8/relighting.story "take kettle" "take kettle"` printed `.state.character.turn: 1 -> 2` and `2 -> 3` and, outside the parts the identity already ignores, nothing else. The lodge's walks do close (19 states, `frontier-exhausted`), so the key is not moving there; what makes the tick run in one story and not the other was not established.

**A watcher has somewhere to live.** The test-tree walker calls a line observer after every card and lets it fail the card (`tree-walker.ts:265`, built for ADR-367's locks). `claimHolds` already evaluates any claim's predicate against a world and a turn's events.

### What authors mean by "never"

All seven `never` claims in the repository are one of the first two (`grep -n "^\s*never " test-stories/*/*.claims.chord branch-stories/*/*.claims.chord`, 2026-11-14: one in the bazaar's fragment, two each in the ferry's, the lodge's and Fernhill's).

- **An invariant.** "The strongbox never leaves the Vault." The author means the whole story.
- **A necessity.** "The Study is never reached without the brandy." Today "without" exists only as an omission from the needs list, which a reader cannot tell from an oversight, and it shows only that the two listed things do not open the Study.
- **An ordering.** "Never in the Study before the warden has the brandy", as one state predicate. Nothing is removed, so it can be checked on any state anywhere.

## Decision

**D1. A violation is the only verdict a search can give a `never`.** A path that makes the predicate true is a real path, whatever set found it. The absence of one is reported as what was searched, and is never called held.

**D2. Every `never` is watched.** Its predicate is evaluated after every turn of every run that plays states a player can reach: each line of the test tree, and every claims walk, whichever claim the walk belongs to. A watched violation names the run and the turn. Derived tests are not watched: they arrange worlds, and an arranged world is not evidence that play can reach it.

A violation on a played line fails that card, and a violation a walk finds only reports (David, 2026-11-14, session 9c75a4, Q-5: "c"). A line of the test tree is play the author recorded as correct, so a `never` broken on it fails the card at the turn it broke, and `sharpee test` exits 1, the way a broken lock does (ADR-367 D6). A counterexample a claims walk finds is the tool's own discovery: it is reported as VIOLATED with its path and changes no exit code, as ADR-365 D9 has it.

A claim with an exclusion (D3) is watched on a run only until a command of that run resolves to an excluded thing. After that turn the run is no longer a run without the thing, and the watch on that claim stops for the rest of it. Without this rule every played line that reaches the Study by giving the brandy would report "the Study is reached without the brandy" as violated. The rule reads the entities each validated command resolved to, which the lock replay already records turn by turn (ADR-367). It does not see an excluded thing that only a rule or another character moved; that limit is accepted and stated in the report's wording for such a claim.

That cut-off is for played lines. Inside a claims walk a claim with an exclusion is watched only when the walk's own set does not contain the excluded thing (David, 2026-11-14, session 9c75a4, review Q-1: "a"). On such a walk no command can name the thing, so every state it reaches was reached without it. A walk whose set does contain the thing is not evidence for that claim and does not check it. The reason is that a walk merges two paths that reach the same world and keeps the first; whether a path had named the thing is not part of what it compares, so a per-path cut-off would give an answer that depends on the order the walk tried its commands.

**D2a. A needs list on a `never` is optional, and it is only the bound of a search** (David, 2026-11-14, session 9c75a4, Q-2: "C"). A `never` with no needs is watch-only: D2 checks it and no walk is run for it. A `never` with needs is watched and also searched under that list, as a walk runs today. The list never earns a verdict beyond D1's; it decides where the tool looks for a counterexample. The report line says which mode a claim ran in and how much was searched. A `never` does not inherit the block's needs (David, same session, Q-2 as re-posed: "A"): it is searched only when needs are written on that claim, so a claim's mode can be read from the claim alone. This is an exception to ADR-365 D2's inheritance, which stands for positive claims. A `never` that names only some of rooms, things and verbs still takes the rest from the block, as any claim does; writing any needs line on it is what asks for the search.

**D3. An exclusion is written, never implied.** A necessity claim names what it does without:

```
claims
  needs rooms: the Porch, the Hall, the Pantry, the Vault
  needs things: the valve, the hand bell, the strongbox, the deed
  needs verbs: turn, open, take

  ## An invariant with no needs of its own: watched on every run, not searched.
  never the strongbox leaves the Vault
    the strongbox is not in the Vault

  ## A necessity. The brandy is named as the thing done without.
  never the Study is reached without the brandy
    the player is in the Study
    excluding things: the brandy
    needs rooms: the Porch, the Hall, the Pantry, the Study
    needs things: the hand bell, the warden
    needs verbs: take, give

  ## Its positive twin: with the brandy, the Study is reachable.
  claim the Study is reached
    the player is in the Study
    needs rooms: the Porch, the Hall, the Pantry, the Study
    needs things: the brandy, the warden
    needs verbs: take, give
end claims
```

An excluded thing may not also appear in the claim's needs; that is a compile error naming the claim. The search types no command that names an excluded thing.

`excluding things:` is written on a `never` only (David, 2026-11-14, session 9c75a4, review Q-2: "c"). On a positive `claim` it is a compile error naming the claim. A positive claim already says "reachable without this" soundly by leaving the thing out of its needs, since a witness is a real path whatever the set. Allowing the line on a positive claim, to make that intent explicit, is a coherent later extension and is not built.

Only things may be excluded (David, 2026-11-14, session 9c75a4, Q-3: "C"). `excluding rooms:` and `excluding verbs:` are the intended extension and are not built: the line is spelled `excluding things:`, never a bare `excluding:`, so the other two can be added beside it without changing what exists.

**D3a. A necessity claim is checked against its positive twin, which the author writes** (David, 2026-11-14, session 9c75a4, Q-4: "c"). A `never` with an exclusion says nothing if its goal cannot be reached at all. The tool looks in the same block for a positive claim with the same predicate whose needs name every thing the `never` excludes (David, same session, review Q-3: "a"). A positive claim with the same predicate that leaves an excluded thing out of its needs is not a twin: it would show the goal reachable without the thing, which is the opposite of what the necessity says. When there is no twin, or the twin is not held, the `never` line says so: no claim shows the goal is reachable with the excluded thing. The pairing adds no syntax. It checks what the twin's set contains, not that the twin's witness used the thing; a stricter check on the witness path is left until this one is shown to miss real errors. A gate form that writes both halves from one line ("the brandy gates the Study") is the intended sugar and is not built; it is designed after `excluding things:` has been written on real stories.

**D3b. A claim's predicate may join facts with `and`, and may negate possession** (David, 2026-11-14, session 9c75a4, Q-6: "a"). Today a claim states exactly one sentence from ten forms (`packages/chord/src/claims.ts:108`); a condition joined with `and` is refused as `claims.predicate-unsupported`, and the only negation accepted is `<thing> is not in <room>`. Both restrictions go, for `claim` and `never` alike. This is what lets an ordering be written as a state:

```
never the Study is reached before the warden has the brandy
  the player is in the Study and the warden does not have the brandy
```

An ordering needs no exclusion, so the watch checks it on every turn of every run with no cut-off, and it has no blind spot for a thing a rule moved. A claim's stored shape becomes a list of predicates that must all hold; the evaluator, the cone's reads, the lock tool and each fragment's JSON twin carry the list. This amends ADR-365 D1's "exactly one predicate".

**D4. The clock is left out of the walk's identity.** `character.turn` joins `IDENTITY_IGNORES` with its reason, as the random cursor did. The walk therefore merges worlds that differ only in time and does not reach what a clock rule does late. Under D1 the walk claims no proof, so this costs coverage and not soundness, and D2's watch on full-length tree lines covers the late turns that were played.

**D5. The walker can hold a conversation and wait.** A conversation's `about` subjects add `ask <owner> about <subject>`; an exchange's `answer` rows add `say <answer>`; `wait` is a candidate when it is a needed verb. This is GH #717's second half.

**D6. Proof is parked, and no "proven" verdict exists** (David, 2026-11-14, session 9c75a4, Q-7: "a"). A `never` could be proven in two ways: the rules show the predicate can never become true, or a walk exhausts a set the compiler computed and not one an author wrote. Both need the cone to know which things each action can apply to, to tell which of the actions a verb reaches a refusal covers, and to finish on a real story; Context has the three measurements. None of that is scheduled. No PROVEN value is added to the wire or the report, and the manual does not mention one. A `never` therefore has two outcomes, VIOLATED and NOT VIOLATED, and this record is what a later ADR starts from if the work is taken up.

**D7. The report says what was done.** A `never` line reads as one of two: VIOLATED with its path and where it was found, or **NOT VIOLATED** (David, 2026-11-14, session 9c75a4, Q-1: "a"), followed by how many runs watched it, how many states were searched under which set, and why the search stopped. NOT VIOLATED is the word whether the search exhausted its set or stopped on a budget; the line says which. It is a fourth value on the wire, `'not-violated'`, beside `'held' | 'violated' | 'unproven'` (`packages/ide-protocol/src/run-events.ts:504`). UNPROVEN keeps its meaning and is given to positive claims only.

The summary counts the two kinds separately (David, same session, Q-8: "b"). Positive claims are counted as held over declared, as ADR-365 D6 has it. `never` claims are counted as not violated over declared, with the violated count beside it. On the lodge, with eight positive claims and two `never` claims, one of them violated, the line reads:

```
claims: 8 of 8 held; never: 1 of 2 not violated, 1 violated (seed 42)
```

A story with no `never` prints the first half alone, and its line is unchanged from today. No `never` is ever counted as held.

**D7a. On the wire, a `never` that no walk ran for is settled by the watch.** `ClaimSettledBy` (`packages/ide-protocol/src/run-events.ts:511`) gains `'watch'` beside `'line' | 'witness' | 'exhaustion' | 'budget'`. A watch-only `never` that is not violated carries `verdict: 'not-violated'`, `settledBy: 'watch'`. A searched one carries `'exhaustion'` or `'budget'` as the walk ended. A `never` broken on a played line fails its card through the walker's existing lock verdict (`CardLockVerdict`: the claim's name, `held: false`, and what is so instead), so the card's failure reaches the wire the way a broken lock's does, and the claim's row carries `verdict: 'violated'`, `settledBy: 'line'` with the line and turn.

**D8. The existing `never` claims are rewritten in the same change that turns the watch on.** This is a required step, not tidying. A necessity still written the old way has the bare predicate "the player is in the Study", and under D2 every played line that reaches the Study would fail its card. So the three fragments under `test-stories/` that hold a `never` (bazaar, ferry, lodge) and Fernhill's are rewritten under D2a and D3 before the watch runs on them, and the pinned verdict and summary lines move with D7. The same holds for any author's fragment: an old-style necessity must gain `excluding things:` when the author takes this version. Two meanings change without a compile error and the release note names both: a `never` with no needs of its own is no longer searched (the bazaar's), and a `never` is now checked on played lines.

## Affected

- `packages/chord/src/claims.ts`: the `excluding things:` line and its compile errors (D3); a predicate as a list joined by `and`, and negated possession (D3b); `IRClaim` carries `excluding` and a predicate list; `renderClaimBlock` writes both.
- `packages/chord/src/claims-cone.ts`: `predicateReads` reads every predicate of the list (D3b). No other change; D6 parks the rest.
- `packages/branch-tester/src/claims/claim-set.ts`: the normalized claim carries the exclusion and the predicate list; a `never` takes no needs from the block unless it writes a needs line (D2a); `groupClaimsBySet` forms no walk for a watch-only `never`.
- `packages/branch-tester/src/claims/claim-predicates.ts`: `claimHolds` holds when every predicate of the list does (D3b).
- `packages/branch-tester/src/claims/claims-walk.ts`: every `never` of the fragment is evaluated at each state reached, whichever group the walk belongs to (D2); the verdict for a `never` without a witness is `not-violated` (D1, D7).
- `packages/branch-tester/src/claims/claim-candidates.ts`: no command naming an excluded thing (D3); conversation subjects, exchange answers and `wait` (D5).
- `packages/branch-tester/src/claims/claim-identity.ts`: `character.turn` in `IDENTITY_IGNORES` (D4). The key's name is imported from `@sharpee/character` (`CHARACTER_TURN_KEY`), which becomes a new dependency of `@sharpee/branch-tester` (its `package.json` does not list it today); the alternative of spelling the string here is refused, since a renamed key would silently bring the defect back.
- `packages/branch-tester/src/claims/claim-report.ts`, `claim-results.ts`: the NOT VIOLATED line, the watch count, and the two-ratio summary (D7).
- `packages/branch-tester/src/tree-walker.ts`: the line observer evaluates every `never` after each card and fails the card on a violation (D2). `TreeWalkerGame` declares the last turn's validated command, as `LockGame` already does (`claim-lock.ts:36`), for D2's cut-off.
- `packages/ide-protocol/src/run-events.ts`: `'not-violated'` in `ClaimVerdictStatus`, `'watch'` in `ClaimSettledBy` (D7, D7a). The IDE's generated protocol types follow from `./repokit protocol`.
- `packages/devkit/src/commands/test-claims.ts`: hands the tree run the fragment's `never` claims to watch, and prints the report.
- `tools/ide/web/testing-surface/src/claims.ts`: the claims row reads the new verdict and the two-ratio line.
- `test-stories/bazaar`, `test-stories/ferry`, `test-stories/lodge`, `branch-stories/fernhill/fernhill.claims.chord`: rewritten under D8, with each fragment's JSON twin where it has one.
- `website/src/app/chord/guide/tooling/claims/`, `docs/architecture/chord-grammar-changes.md`: the guide page and the grammar log.

## End-to-End Scenario

An author has the lodge and writes three `never` claims: the strongbox never leaves the Vault, with no needs; the Study is never reached without the brandy, excluding the brandy, with the rooms, things and verbs of the way there; and its twin, the Study is reached, with the brandy.

`sharpee test` plays the tree's winning line. After each card it checks the two `never` predicates. The strongbox stays in the Vault on that line and the line never enters the Study, so no card fails. The claims tier then runs two walks, one for the necessity and one for its twin. The twin's walk reaches the Study by giving the brandy; on the way it also checks the strongbox predicate at every state. The report reads `NOT VIOLATED  the strongbox leaves the Vault (never)` with "watched on 1 line and 2 walks; not searched", `NOT VIOLATED  the Study is reached without the brandy (never)` with the states searched under its set, and `HELD  the Study is reached`. The summary is `claims: 1 of 1 held; never: 2 of 2 not violated (seed 42)` and the exit code is 0.

The author then records a second line that drains the vault and carries the strongbox to the Hall. On the card where the strongbox leaves the Vault, that card fails, naming the claim and what is so instead, and `sharpee test` exits 1. The author makes the strongbox fixed in place and the line's later cards are re-recorded.

Later the author removes the brandy's `give` rule. The twin comes back UNPROVEN, and the necessity's line now adds that no claim shows the Study is reachable with the brandy.

## Acceptance Criteria

Each is a test on a test story or a fixture, named for the decision it checks.

1. **AC-1 (D1, D7).** On the lodge, `never the strongbox leaves the Vault` with `needs verbs: take` and no `turn` reports NOT VIOLATED with the states searched and its set named, and never the word HELD. With `turn` restored it reports VIOLATED at depth 7 with the path recorded in Context.
2. **AC-2 (D2).** A fixture line that carries a watched thing out of its room fails the card at that turn with the claim named and what is so instead, and the run's exit code is 1. The same violation found only by a walk leaves the exit code at 0.
3. **AC-3 (D2).** A derived test whose arranged world makes a `never` predicate true does not report a violation.
4. **AC-4 (D2, D3).** A played line that reaches the Study by giving the brandy does not violate `never the Study is reached without the brandy`; a line that reaches the Study with no command naming the brandy does, at the card that enters the Study. A walk whose set contains the brandy does not check that claim; a walk whose set does not, does.
5. **AC-5 (D2a).** A `never` with no needs line runs no walk, in a block that declares a shared set, and its row carries `settledBy: 'watch'`. Adding one needs line to it runs a walk under that line and the block's other two.
6. **AC-6 (D3, rejection).** Each of these is refused at compile, naming the claim, and no walk runs: an excluded thing that also appears in the claim's needs; an excluded name that is not a thing of the story; a bare `excluding:` line; `excluding things:` on a positive `claim`.
7. **AC-7 (D3).** Under a necessity's set, the walk's command list at every state holds no command that names the excluded thing.
8. **AC-8 (D3a).** Each of these carries the "no claim shows the goal is reachable" wording: a necessity with no positive claim of the same predicate; one whose only same-predicate claim leaves the excluded thing out of its needs; and one whose twin is not held. A necessity with a held twin that names the excluded thing does not.
9. **AC-9 (D3b).** `the player is in the Study and the warden does not have the brandy` compiles, holds exactly when both facts do, and is refused with the existing `claims.predicate-unsupported` message when a part is not one of the ten forms.
10. **AC-10 (D4).** On a story whose character tick runs, a `never` under a two-room, one-verb set stops as `frontier-exhausted`; before the change it stops at its depth limit (GH #717's kettle claim).
11. **AC-11 (D5).** A positive claim behind a conversation that ends in an exchange is witnessed by a path containing `ask` and `say`, and a claim that needs a turn to pass is witnessed by a path containing `wait`.
12. **AC-12 (D7).** The lodge's summary reads `claims: 8 of 8 held; never: 1 of 2 not violated, 1 violated (seed 42)`; a story with no `never` prints the line it prints today, byte for byte.
13. **AC-13 (D7a).** The run-event wire carries `'not-violated'` and `'watch'`, and the IDE's claims row renders both (`tools/ide/web/testing-surface/tests/claims.test.ts`).
14. **AC-14 (D8).** After the rewrite, `sharpee test` on the bazaar, the ferry and the lodge fails no card that passes today.

AC-10 depends on a premise the others do not: that `character.turn` is the only key moving. Context's snapshot probe is the check that established it for the Relighting; the test for AC-10 runs that story's shape as a fixture and would fail if a second key moved.

## Consequences

- **A green tick on a `never` stops meaning something it cannot support.** An author who forgets a verb gets a line that says what was searched, not HELD.
- **`never` gets stronger where it was weakest.** The watch runs on full-vocabulary, full-length play; today a `never` is checked only by a walk that cannot throw, wait or talk.
- **The summary line changes shape on any story with a `never`.** ADR-365 D6's one ratio becomes two (D7), so a finished story can read complete on both without a `never` being called held. Every test that pins the line for such a story is re-recorded. Those are on the test stories (the lodge, the ferry, the bazaar) and in the IDE's claims pane (`tools/ide/web/testing-surface/tests/claims.test.ts`); no test pins Fernhill's line.
- **ADR-365 D9 is narrowed, not withdrawn.** Claims still never gate on what a walk finds. A `never` broken on a played line fails that card (D2), so an author who writes a `never` before the story enforces it will see lines that passed start to fail; that is the intended signal, and the fix is in the story or in the line.
- **Claims gain syntax.** `excluding things:` is new Chord, in the claims fragment only; the published IR is unaffected (ADR-365 D7).
- **The manual's claims chapter waits on this record.** It would otherwise teach bounded search as proof.
- **A `never` never goes green.** With proof parked (D6), NOT VIOLATED is the best a `never` can read, on every story, until a later record takes the proof work up. D6 keeps what that work would need so it is not rediscovered.

## Session

Drafted in session 9c75a4 (2026-11-14, main), after a critique of `never` supplied by David from a Claude Desktop conversation, and the measurements above taken the same session. The probes were run from the session's scratch directory against the built packages; nothing under `packages/` was changed for them.

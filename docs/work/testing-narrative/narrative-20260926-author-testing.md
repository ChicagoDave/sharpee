# Writing and testing a Chord story: the author's view

**Written**: 2026-09-26, session e9f1df, at David's request ("write a narrative from an author's perspective on writing the game and testing aspects of it").
**Purpose**: alignment. This is the experience the testing rebuild is building toward, told as one author's afternoon with one story. The final section says which beats ship today and which are planned, with the issue or ADR that carries each.
**Story used**: `branch-stories/fernhill` throughout. Every phrase, room, rule, ending and test result below is fernhill's own, taken from the story source and from the real `sharpee test branch-stories/fernhill` report of 2026-09-26. Nothing is invented.
**Walked by a suite**: every beat the CLI can observe is asserted by `scripts/__tests__/narrative-*.test.ts` (run with `pnpm test:scripts`), which spawns `./sharpee` against fernhill and reads what it produces. When the story or the tools change, that suite says which beat moved. Three beats are IDE surfaces with no CLI face and are marked so in the closing table. Two beats were corrected by the suite on 2026-09-26: the "delete the move line" demonstration (the tier cannot see a deleted effect, GH #532) and "remove the last card and the line fails" (a removed END STATE card is a gap, not a failure). A third was corrected on 2026-09-27: the Tobias failures were the tester's, not the story's (GH #530), and fernhill now exits 0. Refreshed 2026-09-27 (session 24d359) against that day's real `sharpee test branch-stories/fernhill` report: the branch count moved to 34 of 63 and the negation skips to two, and the closing table records what shipped since it was written — the derived tier in the Testing tab, span links into the editor, and the arrange step's second round of shapes.

---

## The first rooms

You open Chord Writer and start at the gates.

```
create the Iron Gates
  a room
  aka gates, gate
  north to the Gravel Drive
  south is blocked: long-road

  Wrought-iron gates stand open on one hinge apiece, rust freckling
  the scrollwork. The gravel drive runs north toward the dark shape of
  the house.
```

You add the Gravel Drive, the Fountain Court, the Entrance Hall. You save, the story builds, and you switch to the Play tab and walk north three times to see the prose land the way you heard it in your head.

Then you open the World tab. The Map view has drawn the four rooms on a compass grid, one band per level, and the connections between them. Nothing is displaced, nothing is unplaced, so the solver has no notes for you. The Reach view has a headline and a short list: rooms play never arrives at, exits that never open, things the player can never hold. Right now it is empty, because you have written four rooms in a line.

The Incomplete view is not empty. It has read your prose and handed each noun phrase to the same parser a player's command goes through, and it lists the phrases nothing answers to. From the gates alone that is `scrollwork`; later, when you write the weathervane, its `gatepost` joins the list. They sit under a heading that says what the mention is worth. These are Atmosphere. The view is careful to call itself a candidate list and never an error list, because it read the phrases out of prose by heuristic and some of them are scenery you meant to skip. You decide `scrollwork` deserves an answer, because a player who has just been told about rust freckling the scrollwork will type `examine scrollwork`. You add a scenery thing with an `aka`. You leave `gatepost` alone. The row does not go away, but it does not nag either, and if you want it gone for good you dismiss the phrase once and the dismissal is written beside the story file, diffable and committed, so it holds on the next machine.

Later, when the deed box and the winding key exist, Reach will start earning its place: a room the player can reach but nothing is written on, a thing the mechanics require that no prose ever names. But that is later.

## Pinning the prose

You open the Testing tab. It is a play surface with memory. You type `north` and the turn becomes a card: the command, the prose the engine produced, and under a rule line, the claims the card makes. You did not write those claims. The default policy pins the room's name, and its description where the turn carries one, so the boot card already asserts `Iron Gates` and its opening paragraph, and the card for the Gravel Drive asserts `contains "Gravel Drive"`.

You keep playing. Each turn is a card. Cards group themselves under region headers, so the Grounds cards sit together and the House cards sit together, and each group collapses when you are not looking at it.

You want one more claim on the Iron Gates card. You select the words `rust freckling the scrollwork` in the card's prose and a small button appears: Add contains. Now the card asserts that phrase. You also want to assert a fact about the world rather than the prose, so you open the state picker, which shows you a list of what the world actually holds right now, and you pick `player.location = Iron Gates`. You never type a claim into a blank field.

A week from now you will rewrite that gate description. When you press Run, the Iron Gates card will fail, and the run column will show you the claim that failed and the prose it got instead. You will read the new prose, agree with yourself, and re-bless the card. That is the whole loop for prose: play once, pin what matters, re-bless when you change your mind.

## Writing a rule, and watching it test itself

You get to the Greenhouse and the vine. The vine has three states and a rule for pruning:

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

You save. The story builds. You press Run in the Testing tab.

Below the tree's own results a section appears that you did not author: Derived rules. Under the subject `vine` there are five rows. One is the `after pruning, once` clause you wrote earlier. The other four are this clause's four branches: refused `need-shears`, `when seedling`, `when flowering`, `when fruiting`. Each one is green.

You did not write those tests, and you never will. The compiled story already says, for each branch, what state it needs, what command fires it, and what must be true afterwards. The tester read that, arranged a fresh world into each precondition directly, ran the one command through the real parser and the real engine, and asserted the effects the clause declares. For the `when flowering` branch it arranged you into the Greenhouse holding the shears with the vine flowering, typed `prune vine`, and then checked that the vine is fruiting, that the silver locket is now in the Greenhouse, and that `vine-fruits` was emitted. For the refused branch it checked the message and also that nothing in the guarded body happened, because a guard that fires its message and then runs the body anyway is a real bug and a test that only reads the message would miss it.

To see what this buys you, you break the story on purpose. Not by deleting the `move the silver locket` line: the tester reads each rule out of the story's own text, so deleting an effect deletes its claim and nothing fails. The tester catches the engine contradicting what the story says, so you write a contradiction. On the silver locket you add a rule that fights the vine's:

```
  on every turn while the vine is fruiting
    move the silver locket to the Cellar
  end on
```

You press Run. Exactly one derived row goes red: `vine · on pruning · when flowering`, with the locket's actual location against the Greenhouse the clause put it in, and the source line. The tree notices the same break one card later, where the main line takes the locket and finds it gone. Two rules you wrote cannot both hold, and the story told you which one lost. You delete the rule you planted.

Some rows are not green or red but hollow. `case clock · on winding · refused clock-already-going` is SKIPPED, and the reason is spelled out: `negation: case-clock is stopped already holds in the arranged world`. The tool cannot yet arrange a world in which that guard is false, so it did not pretend to test the branch. A skipped row is a limit of the tool, never a fault in your story. It counts against your coverage, it never fails the build, and it is grouped with the other skips by shape, so you can see at a glance that six branches are skipped because their bodies have no effect the tester knows how to assert, five because they fire on entering a room rather than on a typed verb, and two because of that negation gap.

## Playing through, and branching

By now you have played the main line from the gates to the Folly. The Folly is where the story forks: with the locket in hand you can `open deed box with locket`, or `take the deed`, or `wait` and see what the fuse does.

You fork from that card. Each fork is a new line in the tree, and the outline column on the left shows the tree's shape as fork points: `north → Gravel Drive` with two branches, `east → Boiler Shed` with one, `north → Folly` with three. Selecting a fork's chip switches the cards column to that line and replays it. The engine reboots at the pinned seed and replays the prefix, so the line you are looking at is always the line that would run, not a stale recording.

You never write a walkthrough file for the tool. The tree is the walkthrough, because it is made of play.

## Endings

On the main line you carry the deed south down the drive. At the Iron Gates the story ends: `win fernhill-saved`. The card's header reads `END STATE · fernhill-saved` in the warning colour, and the input row refuses another command. You cannot play past an ending. If you want to keep going you fork from an earlier card.

On the `wait` branch at the Folly, the fuse burns down and the story ends with `fuse-blast`. That card is an END STATE card too.

The tree now proves two things it did not prove before. Replaying the main line asserts that the ending reached is `fernhill-saved`, by reading the engine's ending record, not the prose. If the story changes under the line so that it stops one move short, the END STATE card fails, naming the ending that was not reached. If you delete the END STATE card itself, the line passes and `fernhill-saved` drops out of the endings ratio as a named gap: nothing you played reaches it any more. A rule test can prove that the `win` clause fires when its precondition is arranged, but only a line you played proves a player can get there.

## Reading the numbers

At the top of the run column there is a Coverage strip with three ratios, each measured against what the story itself declares.

```
Branches   34 / 63
Endings     2 / 3
Rooms      13 / 13
```

You open Endings. `fernhill-saved` and `fuse-blast` are reached. `dawn-comes`, the `lose` at line 636, is not, and the note says why: no line reaches it. You know what that means. You have never once played the long night through to dawn without finding the deed. You can go play that line now, and its last card will become the third END STATE card, or you can leave the gap and know that it is a gap.

You open Branches. Thirty-four of sixty-three exercised. The twenty-nine that were not are listed by shape, each with the source line, and every line is a link that opens the editor there. None of them is a failure.

## The conversation you never played

`Tobias · topic boiler` and `Tobias · topic silver-locket` are green. You never asked Tobias about either in the tree, so no card covers those conversations. The derived tier read the two topic rows out of the story, stood you beside Tobias with the boiler in the room, typed `ask Tobias about boiler`, and read `tobias-boiler-reply` off the turn. Then the same with the locket. The story says he answers; the engine agrees.

That setup matters. The parser resolves "the boiler" against what you can see, so a test that stood you beside Tobias and left the boiler in its shed would hear him shrug and call the story broken. The first cut of this tier did exactly that, and reported both rows red for a day. The tester's job is to arrange everything the rule needs, the boiler included, and now it does.

When a derived row does go red, it looks like the flowering row did when you planted the fighting rule: the claim, what the engine actually produced, and the source line. You did not have to play the conversation to be told about it. That is the strongest kind of failure a story test can produce, and it fails the build, because a story that does not do what its own text says is broken whatever the prose looks like.

## What runs when

Everything above runs from one gesture. Run in the Testing tab and `sharpee test` at the command line do the same work: the tree's lines replay, the derived suite runs, the three ratios are measured. A failed card or a failed rule exits non-zero. A skipped branch and an unreached ending never do. They are reported, listed by span, and left for you.

The World tab's views run on the compiled story and cost nothing. The deeper diagnostics, the ones that walk the story looking for phrases a player will reach for that nothing answers, or for declared states no rule ever assigns, run on demand with a budget and a stop reason. They find real things. They never claim that not finding something proves anything, and they never gate a build.

## What you never do

You never transcribe a rule into a test. You never commit a generated test file. You never maintain a walkthrough for the tool's benefit. You never write a claim into a blank field. And you never wonder whether a test is silently missing, because the denominator is the story, and the report names every branch, ending and room it did not reach.

---

## Where each beat stands today

| Beat | Status on 2026-09-27 | Carried by |
| --- | --- | --- |
| Map, Reach and Incomplete views in the World tab | Shipped in the macOS IDE; the analysis behind them walked by `narrative-world-tab.test.ts` through `sharpee world-index`; the views themselves are IDE only, not CLI-observable | ADR-321 D4 to D7, D11 to D13 |
| Testing tab as a play surface with cards, default room-name-and-description claims, Add contains, state picker, region groups | Shipped; the cards' claims and verdicts walked by `narrative-pinned-prose.test.ts`; the gestures (Add contains, the picker) are IDE only, not CLI-observable | ADR-306, ADR-307 |
| Forking, outline of fork points, replay at the pinned seed, one active line | Shipped; lines, the fork and determinism walked by `narrative-playing-through.test.ts` from `transcript-start` parentage; the outline column is IDE only, not CLI-observable | ADR-307, ADR-353 D1 to D3 |
| END STATE cards, no command past an ending, ending asserted from the engine's record | Shipped; the assertion and both "no longer reaches it" shapes walked by `narrative-endings.test.ts`; the input block on the card is IDE only, not CLI-observable | ADR-356 D4 |
| Derived rule tests from the compiled story, arrange for the floor shapes, one real command, effects asserted, refusals assert the negative space | Shipped, CLI and `sharpee test`; walked by `narrative-rule-tests-itself.test.ts` with a planted fighting rule (a deleted effect is not detectable, GH #532; failure messages name the Cellar and the Greenhouse, not engine ids, since GH #533 on 2026-09-29) | ADR-356 D1 to D3, GH #520 |
| SKIPPED with a named shape, never failing the build | Shipped; walked by `narrative-rule-tests-itself.test.ts` and `narrative-what-runs-when.test.ts` (exit 0 with a skip, 1 with a failure, 2 with an unreadable document) | ADR-356 D2, D5a |
| Three coverage ratios with gaps listed by span | Shipped in the CLI report and on the `derived-summary` run event; walked by `narrative-coverage-numbers.test.ts`, and the Tobias failures by `narrative-unexpected-failure.test.ts` | ADR-356 D5, GH #524 Phase 1 |
| Derived rows, skip groups and the coverage strip in the Testing tab | Shipped 2026-09-27 in the macOS IDE, on both heads; the derived tier rides the run-event wire the CLI already emits, walked by `narrative-coverage-numbers.test.ts` (`derived-summary`); the rendering is IDE only, not CLI-observable | GH #524 Phases 2–3 (closed #528), `docs/work/archive/testing-explorer/plan-20260926-524-derived-wire.md`, mock at https://claude.ai/artifact/FgCKuk41qBkFzUBkpiKiCQ |
| Span links from the run column into the editor | Shipped 2026-09-27 with the above; IDE only | GH #524 Phase 3 |
| Arranging beyond the floor: negations, timer phases, or-conditions, occurrence ordinals | Two of four shipped 2026-09-27: `or` guards (by their leftmost arrangeable operand), failed `and` guards and named conditions (Phase 1), and timer phases — `has started`, `has expired` — (Phase 2, an amendment to ADR-356 D2). Negations stay a read, never a write, by policy: the tester proves a guard already fails rather than arranging a failure. Occurrence ordinals are unplanned. Secret-letter, the stress case, moved from 358 to 392 of 721 branches exercised across the two phases; fernhill has none of these shapes and did not move | GH #525, `docs/work/testing-explorer-525/plan-20260927-525-arrange-shapes.md`, ADR-356 D2 amendment 2026-09-27 |
| Effect-less bodies and conversation rows with no player command | Unplanned, needs a different tier or mapping | GH #525 notes |
| The Tobias topics | Green since 2026-09-27; the runner brings an entity-keyed topic's entity into the speaker's room before asking. Whether the story-facing syntax should make that scope requirement visible stays open | GH #530 (closed), GH #242 |
| Segmented test tree on disk | Accepted, no code | ADR-355 |
| Mentioned-but-not-examinable and declared-states lenses | Shipped as developer CLIs under `tools/explorer-probe/`, not yet an author surface | ADR-294 D23, GH #508, #515 |
| Testing navigation for large trees | Cursory draft | ADR-308 |

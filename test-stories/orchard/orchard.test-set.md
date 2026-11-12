# Test set: orchard

**Carries**: OB-33 to OB-45
**Read by**: `scripts/__tests__/narrative-*.test.ts` through `scripts/__tests__/support/story-run.ts`; from Phase 6, the IDE web surface's derived and line-verdict suites and the explorer's examinable lens
**Seed**: 42

## Obligations

- OB-33: the IDE web surface folds every derived row and the summary of a real run, and its report lines are the command's own.
- OB-34: with one planted failing line, that line and its fork heading read as failed and every other line as passed.
- OB-35: a bounded walk's findings about what can be examined are pinned: described and undescribed things, a phrase nothing answers to, and a carried thing's text.
- OB-36: the three coverage ratios with their gaps; in this story: 16 of 20 branches with four skipped, 2 of 3 endings with `bellyache` unreached at its source line, 5 of 5 rooms.
- OB-37: END STATE cards are asserted from the engine's ending record; the main line reaches `harvest-home` and the wait branch `stung`; a line that stops short fails at its END STATE card; a removed END STATE card leaves a named gap.
- OB-38: the story-agnostic beats hold on this story.
- OB-39: seeded authoring mistakes each fail one named card with its cause and fix; `seeded/orchard-T.story` (the bee smoker never placed), `orchard-U.story` (not wearable), `orchard-Z.story` (correct).
- OB-40: the boot card pins the room name and opening paragraph, the first move becomes a card with its room name, and the whole main line passes.
- OB-41: the tree is four lines, each opened and closed once; a three-way fork at the Hive Yard starts three branches on one turn; every card has a verdict; two processes replay to the same events.
- OB-42: a rule yields derived rows nobody authored (the apple tree's five); a row arranges its precondition and types one command; a planted rule that moves the windfall fails exactly the `when laden` row; the tree notices at the card that takes the windfall; the cider press's refusal branch is skipped as a negation.
- OB-43: the keeper's two topic rows pass, each with the thing asked about brought to the keeper.
- OB-44: one run does everything and the clean story exits 0.
- OB-45: the shared run is spawned once and reused.

## What the story's parts are for

- The apple tree, the long pole, the water valve and the windfall: a rule with a tool requirement and three state branches, one of which moves a thing into play.
- The cider press and the crank handle: a second rule whose refusal the derived tier cannot arrange. The press has three states for that reason: with two, the tier writes the one other state and the branch runs.
- The old hive: three every-turn clauses that rouse it over two turns, so one command in the Hive Yard is safe and two waits end the story.
- The green apple: an ending no tree line reaches.
- The bee smoker: the thing the seeded copies break.
- `seeded/`: whole copies of the story, each differing by one line. Regenerate them from `orchard.story` whenever it changes.

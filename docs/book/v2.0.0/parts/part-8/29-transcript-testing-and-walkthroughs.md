# Transcript Testing & Walkthroughs: Proving the Game Still Works

The zoo is a real game now (seven files and two acts in Chapter 28's snapshot,
one well-grown file if you stayed with yours), and you've
been protecting it since Chapter 2. Every **Test it** block along the way added a
transcript to `tests/transcripts/`, so by now `npx sharpee build --test` replays
fourteen recorded sessions against every build: the map, the gate, the dark, the
goats, the scheduler, the win. That suite is why you could keep adding features
without fear of breaking chapter three. This chapter turns the habit into the
full discipline: the assertion layers you haven't used yet (events and world
state), control flow for runs that vary, and **walkthroughs**, chained
transcripts that prove a player can finish the whole game.

## A test that reads like play

You know the shape by heart now: a YAML header, a `---`, then `>` commands each
followed by `[…]` assertions:

```text
title: Feed the goats
story: familyzoo
description: Feeding the pygmy goats awards points and marks them fed

---

> south
[OK: contains "Main Path"]

> east
[OK: contains "Petting Zoo"]

> take feed
[OK: contains "Taken"]

> feed goats
[OK: contains "devour"]
[OK: not contains "don't have"]
```

Save it as `tests/transcripts/feed-the-goats.transcript` and run the suite. The
tester drives those commands through the real engine, checking each
assertion against the actual output. A passing run is silent; a failing one tells you
exactly which command produced the wrong result. Any line starting with `#` is a
comment; by convention `##` lines are used as section headers to organize the
output, but the tester treats them like any other comment. The header can also
carry an `entry:` line naming which compiled story the transcript runs against;
the tutorial's own transcripts pin their chapter snapshot this way
(`entry: ch23-scoring`).

## Two kinds of test

Sharpee distinguishes two transcript styles, and the distinction matters:

- **Unit transcripts** (`tests/transcripts/*.transcript`) are short and isolated.
  Each gets a *fresh* game. This is what you've been writing all along: every
  Test it file pins down one feature or puzzle: "the gate needs the keycard,"
  "the camera is required to photograph."
- **Walkthroughs** (`walkthroughs/wt-*.transcript`) are long and *chained*: game
  state persists from one file to the next, so `wt-02` begins where `wt-01` left off.
  Together they verify the whole game progresses end to end. Walkthroughs checkpoint
  with `$save <name>` at the end and `$restore <name>` at the start, so each segment
  resumes the prior one's state.

A unit test answers "does this feature work in isolation?" A walkthrough answers
"can a player actually finish the game?" You want both.

## Asserting more than text

`[OK: contains "…"]` covers most cases, but the tester checks three layers:

- **Text**: `contains`, `not contains`, `contains_any "a" "b"`, `matches /regex/i`.
  Invert with `[FAIL: …]` to assert a check should *not* pass; defer with `[SKIP]` or
  `[TODO: …]`.
- **Events**: `[EVENT: true, type="if.event.taken"]` asserts the engine emitted a
  given semantic event this turn, independent of the prose. Useful when an action's
  text varies but its event shouldn't, e.g. confirming `feed goats` emits your
  `zoo.event.fed` event.
- **State**: `[STATE: true, yourself.inventory contains bag of animal feed]`
  checks the world model directly. This is the strongest assertion: it verifies
  the *mutation*, not just the words. In a state expression, refer to entities
  by the exact name they were created with (or by id): the zoo's player entity
  has been named `yourself` since Chapter 2, and the bag was created as `bag of
  animal feed`. The `feed` you type in play is an alias, and here you want the
  created name.

A message can read correctly while the world behind it is wrong (a score that never
incremented, an item that was never consumed), and only a state assertion catches that.

## Handling variable outcomes

Real playthroughs aren't perfectly deterministic; an NPC might wander, a daemon might
fire on a different turn. Transcripts have control-flow directives for that:

- **`[GOAL: …]` / `[END GOAL]`** group commands into a named objective, with optional
  `[REQUIRES: …]` preconditions and `[ENSURES: …]` postconditions, so the goal fails if
  the world isn't in the expected state before or after. Declare both on the
  lines directly under the `[GOAL: …]` line, and run with `--stop-on-failure`
  when you want a failed condition to fail the run.
- **`[IF: …]` / `[END IF]`** runs commands only when a condition holds (the parrot is
  here, the trunk wasn't stolen).
- **`[WHILE: …]` / `[END WHILE]`** loops (capped at 100 iterations), and
  `[NAVIGATE TO: "Room"]` walks the player somewhere by name; together they cope with
  a randomized exit or a roaming NPC without hard-coding one exact path.

Varied *text* needs none of these directives. A room-description snippet
(chapter 5), even one using the `random` selector, is seeded and counter-driven,
so it prints the same sequence in every run and a plain `[OK: contains …]`
assertion holds.

For a zoo that has adopted Chapter 28's multi-file project, the after-hours act
is the natural thing to bracket in a `[GOAL]`: `[ENSURES: …]` the after-hours
bonus was scored once the closing sequence has run. (The single-file zoo has no
second act yet, so skip this bracket if you stayed single-file.)

## Your first walkthrough

Unit transcripts prove features in isolation; only a walkthrough proves the
game hangs together. Two short files are enough to see the mechanic work,
because the point of a walkthrough is the state that crosses the file
boundary. Create a `walkthroughs/` folder in the project root (a sibling of
`tests/`) and save this as `walkthroughs/wt-01-into-the-zoo.transcript`:

```text
title: Into the zoo
story: familyzoo
description: From the gate to the petting zoo, map and feed in hand

---

> take map
[OK: contains "Taken"]
[EVENT: true, type="if.event.taken"]

> south
[OK: contains "Main Path"]

> east
[OK: contains "Petting Zoo"]

> take feed
[OK: contains "Taken"]
[STATE: true, yourself.inventory contains bag of animal feed]

$save at-the-pens
```

This is the assertion ladder from earlier in the chapter put to work: a text
check on every turn, an `[EVENT:]` proving the take emitted its semantic
event, and a `[STATE:]` reaching past the prose to confirm the bag really
sits in the player's inventory. The closing `$save` writes a named
checkpoint.

The second file resumes from that checkpoint. Save it as
`walkthroughs/wt-02-feeding-time.transcript`:

```text
title: Feeding time
story: familyzoo
description: Resume at the pens and feed the goats

---

$restore at-the-pens

> feed goats
[OK: contains "devour"]
[EVENT: true, type="zoo.event.fed"]

> score
[OK: contains "20 out of 75"]
```

There is no walking back to the petting zoo and no second `take feed`;
`$restore` picks up exactly where the first file saved, which is the entire
point of a chain. The `feed goats` turn can only succeed because the bag
crossed the file boundary, and the final assertion pins the running total at
exactly twenty points (five for visiting the petting zoo, five for the map,
ten for the goats), so any future change that disturbs early scoring fails
here loudly.

Run `npx sharpee build --test` again and the tester reports the chain ahead
of the unit files (output trimmed as usual; the real run prints full paths
and the unit-test block after it):

```text
Walkthroughs: 2 files (chained)

Running: walkthroughs/wt-01-into-the-zoo.transcript
  "Into the zoo"

  > take map                                         PASS
  > south                                            PASS
  > east                                             PASS
  > take feed                                        PASS

  4 passed

Running: walkthroughs/wt-02-feeding-time.transcript
  "Feeding time"

  > feed goats                                       PASS
  > score                                            PASS

  2 passed
```

A real game's walkthrough chain keeps going: wt-03 through the locked gate,
wt-04 into the dark, one segment per stretch of play, each segment ending in
a `$save` that the next file restores. The two-file chain you just ran is
that discipline in miniature.

## Running them

Authors run tests through the build CLI, which compiles, bundles, and tests in one
step:

```bash
# run every transcript it finds
npx sharpee build --test
npx sharpee build --test --stop-on-failure
```

It runs `walkthroughs/wt-*.transcript` as a chain and `tests/transcripts/*.transcript`
individually, exactly matching the two-kinds split.

## Key takeaway

A transcript test replays a recorded sequence of commands through the real engine
and checks each turn against assertions you write. **Unit transcripts** run in
isolation on a fresh game; **walkthroughs** (`wt-*`, chained automatically by
`sharpee build --test`) keep state
across files to verify the whole game finishes. Assert on text, **events**, or
**state**. State is the strongest, because it checks the mutation, not the message.
Control-flow directives (`[GOAL]`, `[IF]`, `[WHILE]`, `[NAVIGATE TO]`) absorb the
variation real play introduces. A green suite is your license to keep adding
features without fear; next we make sure a player's *own* progress survives: saving
and restoring.

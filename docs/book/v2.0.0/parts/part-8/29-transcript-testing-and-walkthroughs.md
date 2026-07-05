# Transcript Testing & Walkthroughs: Proving the Game Still Works

The zoo is a real game now, spread across seven files and two acts, and you've
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
- **State**: `[STATE: true, player.inventory contains feed]` checks the world model
  directly. This is the strongest assertion: it verifies the *mutation*, not just the
  words. After `feed goats`, assert the `fed-…` state flag is set and the score went
  up: the actual effects, not the message describing them. `player` is a reserved
  word for the player entity, whatever your story named it; every other entity
  reference resolves by name, id, or any of its `IdentityTrait` aliases (so `feed`
  finds the bag of animal feed).

A message can read correctly while the world behind it is wrong (a score that never
incremented, an item that was never consumed), and only a state assertion catches that.

## Handling variable outcomes

Real playthroughs aren't perfectly deterministic; an NPC might wander, a daemon might
fire on a different turn. Transcripts have control-flow directives for that:

- **`[GOAL: …]` / `[END GOAL]`** group commands into a named objective, with optional
  `[REQUIRES: …]` preconditions and `[ENSURES: …]` postconditions, so the goal fails if
  the world isn't in the expected state before or after.
- **`[IF: …]` / `[END IF]`** runs commands only when a condition holds (the parrot is
  here, the trunk wasn't stolen).
- **`[WHILE: …]` / `[END WHILE]`** loops (capped at 100 iterations), and
  `[NAVIGATE TO: "Room"]` walks the player somewhere by name; together they cope with
  a randomized exit or a roaming NPC without hard-coding one exact path.

For a zoo that has adopted Chapter 28's multi-file project, the after-hours act
is the natural thing to bracket in a `[GOAL]`: `[ENSURES: …]` the after-hours
bonus was scored once the closing sequence has run. (The single-file zoo has no
second act yet, so skip this bracket if you stayed single-file.)

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

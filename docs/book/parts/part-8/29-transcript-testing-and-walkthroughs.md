# Transcript Testing & Walkthroughs: Proving the Game Still Works

The zoo is a real game now, spread across seven files and two acts. The moment you
add an eighth feature, you risk breaking one of the first seven. You need a way to
*play the whole game automatically* and be told the instant something stops working.
That's what transcript testing is: a recorded playthrough the engine replays and
checks for you.

## A test that reads like play

A transcript is a plain-text file of commands and expectations that looks like a
session at the keyboard. A YAML header names it; a `---` ends the header; then each
`>` line is a command and each `[…]` line is an assertion:

```text
title: Feed the goats
story: familyzoo
description: Feeding the pygmy goats awards points and consumes the feed

---

> take feed
[OK: contains "Taken"]

> south
[OK: contains "Petting Zoo"]

> feed goats
[OK: contains "devour"]
[OK: not contains "don't have"]
```

Run it and the tester drives those commands through the real engine, checking each
assertion against the actual output. A passing run is silent; a failing one tells you
exactly which command produced the wrong result. Comments start with `#`; section
headers start with `##` and just organize the output.

## Two kinds of test

Sharpee distinguishes two transcript styles, and the distinction matters:

- **Unit transcripts** (`tests/transcripts/*.transcript`) are short and isolated.
  Each gets a *fresh* game. Use them to pin down one feature or puzzle — "feeding the
  goats consumes the feed," "the camera is required to photograph."
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
  up: the actual effects, not the message describing them.

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
  `[NAVIGATE TO: "Room"]` walks the player somewhere by name — together they cope with
  a randomized exit or a roaming NPC without hard-coding one exact path.

For the zoo, the after-hours act is the natural thing to bracket in a `[GOAL]`:
`[ENSURES: …]` the after-hours bonus was scored once the closing sequence has run.

## Running them

Authors run tests through the build CLI, which compiles, bundles, and tests in one
step:

```bash
npx sharpee build --test                 # run every transcript it finds
npx sharpee build --test --stop-on-failure
```

It runs `walkthroughs/wt-*.transcript` as a chain and `tests/transcripts/*.transcript`
individually, exactly matching the two-kinds split.

## Key takeaway

A transcript test replays a recorded sequence of commands through the real engine
and checks each turn against assertions you write. **Unit transcripts** run in
isolation on a fresh game; **walkthroughs** (`wt-*`, run with `--chain`) keep state
across files to verify the whole game finishes. Assert on text, **events**, or
**state**. State is the strongest, because it checks the mutation, not the message.
Control-flow directives (`[GOAL]`, `[IF]`, `[WHILE]`, `[NAVIGATE TO]`) absorb the
variation real play introduces. A green suite is your license to keep adding
features without fear; next we make sure a player's *own* progress survives: saving
and restoring.

# Claims

<!-- PENDING (Phase 5, 2026-11-17): the Chord Writer steps (locking a claim
     from the Testing tab) are pending under D-3. `sharpee claim` does not
     return when asked to lock a fact at or after a line's first `put`, and a
     `needs verbs` line that names `put` hangs `sharpee test`; both are filed
     (782), and the chapter writes its second claim by hand for that reason.
     The proposed set is taught as a draft to edit (716). -->

A test tree checks a great many small things. Card by card it says that
this sentence was printed and that door was open. Nowhere does it say, in
one place and in plain words, what the story is for: that the stair can
be opened, and that the game can be won.

A **claim** is one sentence of that kind, with a name. The claims of a
story live together in a small file of their own, and `sharpee test`
reports on every one of them each time it runs. This chapter writes three
claims for The Relighting, and looks at what the report says when a claim
holds, when it stops holding, and when nobody can tell.

## A fact worth keeping

The quickest way to a claim is to take one from a line of the tree that
already reaches it. The `sharpee claim` command does that. Give it a line
and it lists what is true at the end of that line that was not true when
the story began.

A line is named by the identifier of the segment it starts in. If you
name one that does not exist, the command lists the ones that do.

```text
claim: no line "winning1" — the tree's lines, by segment id and first command:
  thelodge  talk to hobb
  refusal1  no
  grille01  east
  fromafar  wait
  cracked1  put lens in hoist
  parapet1  drop lens
  trusted1  up
```

The main line is `thelodge`. The option `--at` chooses a turn on it, and
without the option the command reads the line's last card. The turn of a
card is the `turn` field of its record in the output of chapter 38's
`sharpee test . --json --capture-output`. The card that types `unbind
grille` is turn 82.

```shell
sharpee claim thelodge --at 82
```

```text
At turn 82 of line thelodge "opening-lodge", true now and not at boot:
  the player is in the Bell Stair
  the player has the spectacles
  the player has the hand lamp
  the player has the library key
  the player has the unbind page
  the player has the kindle page
  the player has the hush page
  the story is waking
  the iron grille is lifted
  the kindle page is learned
```

The list goes on for another twenty-three lines, and it closes by saying
how to keep one.

```text
Lock one with: sharpee claim thelodge "<fact>" --at 82
```

Every line of the list is a sentence a claim can state. Most of them are
not worth stating. That the player has the spectacles at turn 82 is true,
and nobody would mind if it stopped being true. The line that matters is
`the iron grille is lifted`, because the whole middle of the story exists
to make it so.

## Locking it

Give the command the fact, in quotation marks, and a name for the claim.

```shell
sharpee claim thelodge "the iron grille is lifted" --at 82 --name "the ward on the stair can be lifted"
```

```text
Locking at turn 82 of line thelodge "opening-lodge": the iron grille is lifted

  needs rooms: the Lodge, the Gate Court, the Cloister, the Refectory, the Library, the Bell Stair
  needs things: Hobb, the kettle, the chair, the spectacles, the hand lamp, the oak press, the library key, Tamsin Vey, the unbind page, the library door, the grimoire, the kindle page, the hush page, the mend page, the wisp, the wax taper, the tower bell, the newspapers, the candles, the iron grille
  needs verbs: talk to, ask, tell, goodbye, sit on, exit, search, take, examine, open, wait, say, answer, unlock, consult, look up, read, light, kindle, look, inventory, unbind, quiet, hush

Written: created relighting.claims.chord
Written: relighting.tests/manifest.json
Written: relighting.tests/thebell1.json
Pinned "the ward on the stair can be lifted" on card b7wicd1b.
```

Three files changed. The command wrote a new file beside the story,
`relighting.claims.chord`, which holds the claim. It added one key to the
tree's manifest, so that the tree knows the file is there.

```json
{
  "claims": "relighting.claims.chord",
  "seed": 42,
  "story": "relighting",
  "version": 3
}
```

And it added one key, `locks`, to the card where the fact was read.

```json
    {
      "assertions": {
        "contains": [
          "The grille is not there, in the manner of a thing that was never there"
        ],
        "states": [
          "the iron grille is lifted"
        ]
      },
      "command": "unbind grille",
      "id": "b7wicd1b",
      "locks": [
        "the ward on the stair can be lifted"
      ],
      "type": "turn"
    },
```

A **lock** ties a claim to a card. It says that the claim is true on that
card, on that turn of that line, and that you want to be told if it ever
is not.

Add `--propose` to the command and it prints the same report and writes
nothing, which is the way to look before you lock.

## The claims file

Here is the file the command wrote.

```chord
## The Relighting's claims: what the finished story can reach, each under the
## rooms, things and verbs that are load-bearing on the way. The test tree's
## manifest names this file; the story never imports it.

claims
  claim the ward on the stair can be lifted
    the iron grille is lifted
    needs rooms: the Lodge, the Gate Court, the Cloister, the Refectory, the Library, the Bell Stair
    needs things: Hobb, the kettle, the chair, the spectacles, the hand lamp, the oak press, the library key, Tamsin Vey, the unbind page, the library door, the grimoire, the kindle page, the hush page, the mend page, the wisp, the wax taper, the tower bell, the newspapers, the candles, the iron grille
    needs verbs: talk to, ask, tell, goodbye, sit on, exit, search, take, examine, open, wait, say, answer, unlock, consult, look up, read, light, kindle, look, inventory, unbind, quiet, hush
end claims
```

The file is Chord, and it holds one block, which opens with `claims` and
closes with `end claims`. It has no story header, and the story does not
import it. The manifest's `claims` key is the only thing that points to
it, so a story is never changed by the claims made about it.

Inside the block, each claim begins with the word `claim` and its name.
The name is yours, and it is what the report will call the claim. Write
it as you would say it to someone: the ward on the stair can be lifted.

The next line is the fact, and a claim has exactly one. Under it come up
to three `needs` lines, which this chapter returns to when it reaches the
walk. For a claim that a line of the tree reaches, they are a note of
what the line used on the way.

## What a claim may state

A claim states one thing that holds. The forms are few, and most of them
are conditions you already write after `while` and `when`.

- `the iron grille is lifted` names a thing and one of its states. The
  same form takes the platform's own state words: `open` and `closed`,
  `locked` and `unlocked`, `on` and `off`, `lit` and `unlit`, `worn` and
  `unworn`, `read` and `unread`.
- `the story is awake` names a state of the story itself.
- `the player is in the Library` names the room the player has reached.
- `the player has the library key` says who holds a thing. Any person
  may stand where `the player` does.
- `the lens is in the Great Lantern` says where a thing is, and `the
  kettle is not in the Lodge` names a room that a thing has left.

Three more forms belong to claims alone.

- `the story ends in victory` and `the story ends in defeat` say how the
  story ended, and `the story has ended` says only that it did.
- `Hobb was asked about "the kettle"` says that a person was asked about
  a topic.
- `the seed cake has been eaten` says that a thing has answered an
  action. The thing must have an `on` clause for that action, and the
  word after `has been` is the action's past participle.

A claim cannot be turned round. There is no `is not lifted` and no
`never`, because a claim says what the story can reach, and "can never
reach" is a different and much harder thing to show.

When a fact does not fit the story, `sharpee test` refuses the file
before it runs anything, and says what the thing's states are.

```text
test: claims file 'relighting.claims.chord' does not compile (1 error(s)):
  relighting.claims.chord:7:24 [claims.state-unknown] [relighting.claims.chord] `the ward on the stair can be lifted`: `iron grille` is never `raised`. Its states are `standing`, `lifted`. The platform's words are `open`, `closed`, `locked`, `unlocked`, `on`, `off`, `lit`, `unlit`, `worn`, `unworn`, `read`, `unread`.
```

## The report

Run the tree as before.

```shell
sharpee test .
```

After the cards, the derived tests and the three counts of chapter 38,
the report has a new last section.

```text
Claims: relighting.claims.chord
claims: 1 of 1 held (seed 42)
0 walks
HELD  the ward on the stair can be lifted — by line thelodge "opening-lodge" at turn 82
  lock "the ward on the stair can be lifted" at line thelodge "opening-lodge" at turn 82 — held there
```

The first line under the file's name is the score: how many of the claims
you have declared are held. A claim is **held** when the runner has seen
the story reach it. Here a line of the tree reached it, at turn 82, and
the report says which.

The last line is the lock. The claim is held and its lock is held, and
those are two different statements. The first says that some line,
somewhere, reaches the fact. The second says that the fact is true on
the very card you pinned it to.

## When a lock breaks

Suppose that some weeks from now you are tidying the `ward` trait, and
the line `change it to lifted` goes out with something else. The grille
still vanishes when it is unbound, because `move it offstage` is still
there, and the prose still prints. Run the tree.

```text
✗ opening-lodge — unbind grille: State assertion failed: the iron grille is lifted. the iron grille is "standing", expected "lifted"
    You say the word. The grille is not there, in the manner of a thing that was never there, and the stair goes up.
```

The card fails, as chapter 38 promised. Thirty-four more cards fail
after it, on the main line and on the two branches that climb the stair,
because the stair is still shut and everything beyond it goes wrong.
Thirty-five failures do not tell you much about what you broke. The
claims section does.

```text
Claims: relighting.claims.chord
claims: 0 of 1 held, 1 unproven (seed 42)
1 walk
  under the set of "the ward on the stair can be lifted": 6 rooms, 20 things, 24 verbs — 11612 states, 63603 commands, stopped: max-seconds
UNPROVEN  the ward on the stair can be lifted — not reached by any line; the walk stopped at max-seconds after 11612 states; its set carries 20 things, and each independent thing doubles the states to exhaust
  lock "the ward on the stair can be lifted" at line thelodge "opening-lodge" at turn 82 — NOT held there: the iron grille is standing
```

Read it from the bottom. The lock is not held, and the report says what
is so in its place: the iron grille is standing. One line names the
promise you broke, in the words you gave it.

The line above it says that the claim is **unproven**. No line of the
tree reaches the fact any longer, so the runner went looking for a way
to reach it by itself, and gave up after two minutes. The next section
is about that search.

The two are treated differently. A lock that is not held fails its
card, as a failed assertion does, and the run exits with 1. Had this
card carried no `states` assertion, it would have failed all the same,
with a line of its own.

```text
✗ opening-lodge — hush bell: lock "the ward on the stair can be lifted" not held here: the iron grille is standing
```

(That line comes from a lock pinned, on purpose, one card too early.)

An unproven claim fails nothing. Claims are a list of what you mean the
story to do, and the report on them is a reading of how much of the
list is true today. That makes it safe to write a claim before the
story can meet it.

Put the line back, and the report returns to 1 of 1.

## A claim written by hand

The second claim is the one any story should make.

`sharpee claim` proposes a set of needs from what the line did, and the
proposal is a draft. It lists everything the line touched, the kettle
and the chair among them. It is also not yet sound for every line. At
this edition the command does not return when it is asked to lock a fact
at a turn that comes after the line's first `put`, and on the winning
line that is every turn from 105 on. The winning turn is 138.

So this claim is written by hand, which is always allowed. A claims
file is yours to edit. Add the block before `end claims`, with one blank
line above it.

```chord
  claim the story can be won
    the story ends in victory
    needs rooms: the Lodge, the Gate Court, the Cloister, the Refectory, the Library, the Bell Stair, the Undercroft, the Lantern Gallery, the Water Stair, the Beacon Isle
    needs things: Hobb, the spectacles, the hand lamp, the oak press, the library key, Tamsin Vey, the unbind page, the library door, the kindle page, the hush page, the mend page, the tower bell, the newspapers, the candles, the iron grille, the cistern, the crate, the lens, the book hoist, the shutter crank, the shutter, the Great Lantern, the Mere, the skiff, the beacon
    needs verbs: talk to, ask, say, take, open, unlock, read, light, kindle, examine, wait, unbind, quiet, fix, repair, turn, push, enter, steer, make sail, exit
```

The verbs leave out `put`, although the winning line types it twice.
At this edition a `needs verbs` line that names `put` stops `sharpee
test` from finishing.

The lock is one key on the winning card, written between `id` and
`type` because a tree file keeps its keys in alphabetical order.

```json
      "command": "kindle beacon",
      "ending": "beacon-lit",
      "id": "bjhmo3xt",
      "locks": [
        "the story can be won"
      ],
      "type": "turn"
```

The layout of the claims file matters as the layout of a tree file
does. A claim's name is indented by two spaces and its lines by four.
The fact comes first, then `needs rooms`, `needs things` and `needs
verbs` in that order, and exactly one blank line separates two claims.
A file laid out another way is refused, and the refusal names the line.

```text
test: claims file 'relighting.claims.chord' is not in the lock's canonical form (fix the lines named, or re-lock):
  relighting.claims.chord:17 · claim the story can be won — the next block follows without a blank line
```

```text
claims: 2 of 2 held (seed 42)
0 walks
HELD  the ward on the stair can be lifted — by line thelodge "opening-lodge" at turn 82
HELD  the story can be won — by line thelodge "opening-lodge" at turn 138
  lock "the ward on the stair can be lifted" at line thelodge "opening-lodge" at turn 82 — held there
  lock "the story can be won" at line thelodge "opening-lodge" at turn 138 — held there
```

## A claim no line reaches

Both claims so far were read from the tree. A claim may also say
something that no line of the tree does, and then the runner has to
find out for itself whether it is true.

Hobb's seed cake has sat on his chair since Part II, and since Part III
the player has been refused it: "Hobb cut that cake into two pieces
with some care, and he is sitting four feet away. You find you cannot."
The refusal has a condition, `when Hobb is here`. So the cake can be
eaten, somewhere Hobb is not. Nothing in the tree tries it.

```chord
  claim the cake can be eaten in the Lodge
    the seed cake has been eaten
    needs rooms: the Lodge
    needs things: Hobb, the chair, the seed cake
    needs verbs: take, eat

  claim the cake can be eaten
    the seed cake has been eaten
    needs rooms: the Lodge, the Gate Court
    needs things: Hobb, the chair, the seed cake
    needs verbs: take, eat
```

The two claims state the same fact and differ in one word of one line.
The first allows the Lodge and nothing else. The second allows the Gate
Court as well.

```text
claims: 3 of 4 held, 1 unproven (seed 42)
2 walks
  under the set of "the cake can be eaten in the Lodge": 1 rooms, 3 things, 2 verbs — 161 states, 239 commands, stopped: max-depth-reached
  under the set of "the cake can be eaten": 2 rooms, 3 things, 2 verbs — 17 states, 20 commands, stopped: all-claims-settled
HELD  the ward on the stair can be lifted — by line thelodge "opening-lodge" at turn 82
HELD  the story can be won — by line thelodge "opening-lodge" at turn 138
UNPROVEN  the cake can be eaten in the Lodge — not reached by any line; the walk stopped at max-depth-reached after 161 states; its set carries 3 things, and each independent thing doubles the states to exhaust
HELD  the cake can be eaten — not reached by any line; by walk at depth 3: take seed cake / north / eat seed cake
```

For each claim that no line reaches, the runner takes a **walk**. It
starts the story fresh and tries commands, and from every position those
lead to it tries commands again, keeping count of the positions it has
seen. It stops when it finds one where the claim is true.

For the second claim it found one in twenty commands, and the report
prints the way there: take the cake, go north, eat it. Those three
commands are a **witness**. The claim is held, and it is held more
firmly than by a line of the tree, because nobody wrote the answer down.

## The needs lines

A walk that tried every command in every room would never finish. The
`needs` lines are what make it small. They say which rooms, things and
verbs are on the way to the fact, and the walk stays inside them.

- `needs rooms` lists the rooms the walk may enter. It goes through an
  exit only when the room beyond is on the list.
- `needs things` lists the things and people a command may name. The
  player is always there and is never listed.
- `needs verbs` lists the verbs the walk may type, as a player types
  them: `take`, `eat`, `talk to`.

The walk does not invent sentences. From each position it tries the
exits, and for each thing it can see it tries what that thing's kind
allows: `open` for something openable, `take` for something that can be
carried, `ask` for a person with topics, a story's own verb for a thing
that answers it. Then the three lists cut that down.

The lists are part of the claim. The first cake claim does not say that
the cake can be eaten. It says that the cake can be eaten using only the
Lodge, Hobb, the chair, the cake, and the verbs `take` and `eat`. That
is a smaller statement, and in this story it is false, because Hobb
never leaves the Lodge. The walk tried 161 positions, reached the
deepest path it allows itself, and stopped.

It did not report the claim as false. **Unproven** means that the walk
ran out of room before it found a witness. Sometimes that is because
there is none, as here. Sometimes the set is too loose, and the walk
drowned in kettles and chairs. The report cannot tell the two apart, and
it says which limit stopped it so that you can judge: `max-depth-reached`
is a path of eighty commands, `max-states` is half a million positions,
and `max-seconds` is two minutes. Run the tree with `--verbose` and the
limits are printed.

```text
Claims budget per walk: 120s, 500000 states, depth 80
```

The last clause of an unproven line is advice. Every thing in the set
that can change by itself doubles the number of positions there are to
visit. A walk under three things is over in a moment. The walk under
the first claim's twenty things, in the section on the broken lock, ran
for its whole two minutes. So when a claim comes back unproven, make
its set smaller before you make it larger, and list only what the fact
cannot be reached without.

When several claims need the same set, the lists can be written once, at
the top of the block, before the first claim. A claim with no `needs`
lines of its own takes those, and a claim that writes one of the three
replaces that one and keeps the other two.

```chord
claims
  needs rooms: the Lodge, the Gate Court
  needs things: Hobb, the chair, the seed cake
  needs verbs: take, eat

  claim the cake can be had
    the player has the seed cake

  claim the cake can be eaten
    the seed cake has been eaten

  claim the cake can be eaten in the Lodge
    the seed cake has been eaten
    needs rooms: the Lodge
end claims
```

Claims that share a set share a walk, so the first two here cost one
walk between them.

## Which claims to keep

The first cake claim has done its work in this chapter, and it comes
out of the file. An unproven claim that you know to be false is only
noise in the report. An unproven claim that you believe is a different
matter. It is the most useful line in the file, because it is a thing
the story does not yet do.

That is the other way to use claims. Before a puzzle exists, write down
that it can be solved: name the fact, and list the rooms and things you
intend to build it from. The claim is unproven on the first day. On the
day the puzzle works, the walk finds its witness, and you have not had
to play it through to know.

Keep the claims few. The Relighting has three: the stair opens, the
story can be won, and a small one about a cake that shows the walk at
work. A story of this size might fairly have a dozen. They should be
the sentences you would use to tell someone what the game is.

## Build and try it

Work in your own project, which now holds what the companion folder
`chapter-38` holds: the story of chapter 37 and the full tree. List the
facts at turn 82 of the main line, and lock `the iron grille is lifted`
under a name of your own. Run the tree and find the claim and its lock
in the report.

Then add the second cake claim by hand, and run the tree again to see
the witness. Change its `needs rooms` line to the Lodge alone, and see
it come back unproven.

Last, break the story as this chapter did, by taking `change it to
lifted` out of the `ward` trait, and read the lock's line. Put it back.

The companion folder `chapter-39` holds the story with its three claims.

```shell
sharpee test .
```

```text
Claims: relighting.claims.chord
claims: 3 of 3 held (seed 42)
1 walk
  under the set of "the cake can be eaten": 2 rooms, 3 things, 2 verbs — 17 states, 20 commands, stopped: all-claims-settled
HELD  the ward on the stair can be lifted — by line thelodge "opening-lodge" at turn 82
HELD  the story can be won — by line thelodge "opening-lodge" at turn 138
HELD  the cake can be eaten — not reached by any line; by walk at depth 3: take seed cake / north / eat seed cake
  lock "the ward on the stair can be lifted" at line thelodge "opening-lodge" at turn 82 — held there
  lock "the story can be won" at line thelodge "opening-lodge" at turn 138 — held there
```

::: under-the-hood
**Under the Hood: the claims tier** · manifest `claims`, card `locks`, verdicts `HELD` and `UNPROVEN`

`sharpee test` runs in three tiers: the tree's cards, the derived tests,
and the claims. The claims file is compiled against the story before any
card is played, which is why a misspelled state stops the run at once.
While the cards replay, every claim is checked after every card. A claim
that some card satisfies is held by that line and is never walked, and a
card's `locks` are checked on that card alone. Only the claims left over
are walked, one walk for each distinct set of needs, each from a fresh
start at the tree's seed. Every line of the claims report is the same on
every run at the same seed, except where a walk was stopped by the
clock.
:::

::: from-another-system
**From another system: proving a story can be finished**

Inform 10 and TADS 3 both replay commands, as the last chapter's aside
describes, and a replayed solution is how an author in either system
shows that a story can still be won. A lock is the same idea with a
name on it. The walk has no counterpart in the pages of *Writing with
Inform* and the TADS 3 System Manual read for this book: neither
describes a tool that searches a story for a way to reach a state. The
nearest thing is in *Writing with Inform*'s section on testing for
thoroughness, which names an extension that "allows us to try out a
long list of commands against any object in the story". That tries
every command on one thing. It does not look for a path.
:::

## What you have so far

You can write down, in a file beside the story, the few sentences the
story exists to make true. You can lock one to the card where a line of
the tree reaches it, and let the runner go looking for the ones no line
reaches. The report tells you after every change how many are held.

The Relighting is written, tested, and holds its claims. The last
chapter gives it a version and an address, and sends it out.

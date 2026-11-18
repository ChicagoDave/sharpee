::: {.part-page}

# Part VIII. Proving and shipping {.part .unnumbered}

:::

# Test trees

<!-- PENDING (Phase 5, 2026-11-16): the Chord Writer steps (recording a tree in
     the Testing tab) are pending under D-3; this chapter teaches the tree's
     files, which are the same whichever tool wrote them. The command line has
     no recorder and no way to put a hand-written file into canonical form;
     both are filed. -->

The Relighting is finished, and it has been played to its end many times
in the writing of this book. Each of those plays proved something on the
day. None of them proves anything about tomorrow, when you move a key or
reword a phrase and something four rooms away stops working.

A **test tree** is a play-through that has been written down, with a note
on each turn of what the story must say. The `sharpee test` command plays
it again, turn by turn, and tells you which notes no longer hold. It is
called a tree because a play-through can fork: from one position in the
story you may record several different continuations, and they share
everything before the fork.

This chapter builds a small tree by hand and then reads the full one that
comes with the story.

## Two ways to make one

Chord Writer has a Testing tab that records. You play the story there,
and each turn becomes a card that you can pin an expectation to.

The `sharpee` command has no recorder. From the command line a tree is
written as files, by hand, and the story's own output is read back from a
test run. That sounds laborious and is less so than it sounds, because a
tree is very regular. It is also worth learning whichever tool you use,
because the files are the same, they live beside your story, and they are
what you will read when a test fails.

## The folder

A story's tree is a folder beside the story file, named for the story's
`id` with `.tests` on the end. For The Relighting it is
`relighting.tests`. It holds one file called `manifest.json` and one file
for each stretch of the play-through.

```json
{
  "seed": 42,
  "story": "relighting",
  "version": 3
}
```

That is the whole manifest. `story` is the story's `id`. `version` is the
version of the tree format, which is 3. `seed` fixes the story's luck:
every `one chance in` condition and every `select random` of chapter 17
falls the same way on every run at the same seed, so a tree that passes
once passes always, until the story changes.

## A segment and its cards

The play-through itself is in **segment** files. A segment is a run of
turns with no fork in it. Its file is named for its identifier, and the
identifier is exactly eight lowercase letters or digits.

Here is `mainline.json`, a first segment of four cards.

```json
{
  "cards": [
    {
      "id": "card0001",
      "skip": true,
      "type": "opening"
    },
    {
      "id": "card0002",
      "skip": true,
      "type": "boot"
    },
    {
      "command": "take lamp",
      "id": "card0003",
      "skip": true,
      "type": "turn"
    },
    {
      "command": "open press",
      "id": "card0004",
      "skip": true,
      "type": "turn"
    }
  ],
  "id": "mainline"
}
```

A **card** is one step. There are three types. The `opening` card is the
story's title, credits and prologue, before anything is typed. The `boot`
card is the first look at the first room, which the story takes by itself.
A `turn` card is a command the player types, given in `command`.

Every card has an `id` of its own, again eight lowercase letters or
digits. The identifiers mean nothing. They only have to be different from
one another, and they must never change once written, because other
things will come to refer to a card by its identifier.

`"skip": true` says that the card is played and nothing is checked. A card
must either check something or say `skip`, and a card that does neither
fails.

The layout of the file matters. The keys of every object are in
alphabetical order, which is why `cards` comes before `id` and `command`
before `type`. The indentation is two spaces, and each element of a list
is on a line of its own. A tree file laid out any other way is refused.

```text
test: relighting.tests/ has files not in canonical form (re-save them from the Testing tab):
  mainline.json
```

## Reading what the story says

To write an expectation you need the story's exact words. Run the tree
with two options and it will give them to you.

```shell
sharpee test . --json --capture-output
```

The output is one JSON record to a line. The records of type
`command-result` are the cards, and each carries the card's output in
`actualOutput`.

```text
{"schemaVersion":2,"seq":4,"elapsedMs":80,"type":"command-result","file":"mainline","line":0,"input":"take lamp","passed":true,"expectedFailure":false,"skipped":true,"cardId":"card0003","actualOutput":"You take it.","turn":2,"assertionResults":[{"description":"[SKIP]","passed":true,"message":"Skipped"}]}
```

So the working method is this. Add the next few commands as skip cards.
Run the tree, and read what each one printed. Then replace each `skip`
with the part of that output you care about.

## What a card can assert

A card's expectations go in `assertions`. Here are the last two cards
again, with their `skip` lines replaced.

```json
    {
      "assertions": {
        "exact": [
          "You take it."
        ]
      },
      "command": "take lamp",
      "id": "card0003",
      "type": "turn"
    },
    {
      "assertions": {
        "contains": [
          "In the oak press you see a library key."
        ],
        "states": [
          "the oak press is open"
        ]
      },
      "command": "open press",
      "id": "card0004",
      "type": "turn"
    }
```

There are six kinds of assertion, and a card may carry several.

- `contains` is a list of pieces of text, each of which must appear in the
  turn's output. This is the one you will use most.
- `notContains` is a list of pieces of text, none of which may appear.
- `exact` is the turn's whole output, line by line. Use it sparingly. It
  breaks when any sentence of the turn is reworded, including sentences
  the card was not about.
- `states` is a list of conditions, in the same words a `while` or a
  `when` uses, each of which must hold after the turn: `the oak press is
  open`, `Tamsin Vey is bound`, `the story is awake`.
- `events` is a list of event names, each of which the turn must have
  raised: `media.sound.play`, or the story's own
  `relighting-working-learned`.
- `channels` is a list of channel claims. Each names a channel by `id`
  and gives either `is`, the channel's exact value, or `contains`, a
  list of pieces its value must include.

The opening card conventionally checks the story's title, which travels
on a platform channel called `info.title`.

```json
    {
      "assertions": {
        "channels": [
          {
            "id": "info.title",
            "is": "The Relighting"
          }
        ]
      },
      "id": "card0001",
      "type": "opening"
    },
```

Prefer `contains` and `states` together. The text says what the player
was told, and the state says what became true. A turn that prints the
right sentence and changes nothing is one of the commonest defects in
interactive fiction, and only a state assertion catches it.

The last two kinds are how chapters 36 and 37 are proved without a
browser. The card that sparks the lamp asserts the event
`media.sound.play`, and the card that reads the spark page asserts that
the channel `workings` contains `spark: wakes a flame`.

## Running the tree

```shell
sharpee test .
```

```text
Loading story from: /home/ansel/relighting
Test tree: relighting.tests/ (seed 42, 1 line(s))

✓ opening-lodge
3 cards passing, 4 assertions passing
```

The first line names the folder the story was loaded from, as `play` does,
and yours will name your own. Every report begins with it, and the reports
quoted from here on start at the line after it. The boot card is still a
skip card, and a skipped card is not counted.

The command exits with 0 when everything passes and 1 when anything
fails. Here is the same tree after the `take lamp` card was made to
expect `Taken.`, which the story does not say.

```text
Test tree: relighting.tests/ (seed 42, 1 line(s))

✗ opening-lodge — take lamp: Output does not contain "Taken."
    You take it.
2 cards passing, 3 assertions passing, 1 card failing, 1 assertion failing
```

A failure names the line, the command, and the assertion that failed, and
prints what the story said in its place. Then you decide which of the two
is wrong. If the story is, mend the story. If the story's new words are
what you now want, mend the card.

## A fork

So far the tree is one line. A **fork** is a card with more than one
continuation, and it is where a tree earns its name.

A fork is always the last card of its segment. Each way on from it is a
segment of its own, which names the segment it grows from in `parent`
and takes a number in `ordinal`. The continuation of the same line is
ordinal 0. The alternatives are 1, 2, 3 and so on.

After `open press`, the main line goes on to take the key.

```json
{
  "cards": [
    {
      "assertions": {
        "contains": [
          "You take the library key from the oak press.",
          "Hobb closes the oak press."
        ],
        "states": [
          "the oak press is closed"
        ]
      },
      "command": "take key",
      "id": "card0005",
      "type": "turn"
    }
  ],
  "id": "onward01",
  "ordinal": 0,
  "parent": "mainline"
}
```

A second segment tries something else from the same position.

```json
{
  "cards": [
    {
      "assertions": {
        "contains": [
          "You find you cannot."
        ]
      },
      "command": "eat cake",
      "id": "card0007",
      "type": "turn"
    },
    {
      "assertions": {
        "notContains": [
          "library key"
        ]
      },
      "command": "inventory",
      "id": "card0008",
      "type": "turn"
    }
  ],
  "id": "thecake1",
  "ordinal": 1,
  "parent": "mainline"
}
```

```text
Test tree: relighting.tests/ (seed 42, 2 line(s))

✓ opening-lodge
✓ lodge · eat cake
```

The tree now has two **lines**. A line is one path from the opening to an
end, and the report names each by the room it starts in and its first
command. The main line is named for the opening.

The second line did not replay the first four cards. The runner saved the
story at the fork and restored it, so a deep tree with many branches
costs little more to run than its cards.

The second card of the branch is worth a look. `inventory`, asserting
that the key is not there, proves that this line really did start from
before the key was taken. A branch is a different world from its
siblings, and nothing done in one is seen in another.

## An ending

A turn that ends the story says so on its card, with the ending's key
from chapter 18.

```json
    {
      "assertions": {
        "contains": [
          "The two lights hold one another.",
          "You have risen to the rank of a Lamplighter."
        ],
        "events": [
          "media.image.hide"
        ]
      },
      "command": "spark beacon",
      "ending": "beacon-lit",
      "id": "bjhmo3xt",
      "type": "turn"
    }
```

A card with `ending` asserts that the story ended on that turn, and in
that ending. It is the last card of its line.

## The whole tree, and what it covers

The companion folder `chapter-38` holds the story as chapter 37 left it
and the tree this book has been running since chapter 5, grown to its
full size: 183 cards on seven lines. The main line is the winning walk.
The six branches are the bargain refused and reopened, Tamsin Vey at the
grille, the pry bar heard from the Library, the cracked lens and its
ending, the parapet and its ending, and Hobb's trust.

```text
Test tree: relighting.tests/ (seed 42, 7 line(s))

✓ opening-lodge
✓ refectory · no
✓ library · east
✓ library · wait
✓ undercroft · put lens in hoist
✓ undercroft · drop lens
✓ undercroft · up
183 cards passing, 275 assertions passing
182 commands (182 authored + 0 replayed), 6 restored at a fork
```

After the cards, the report goes on at length, and the rest of it is not
about your tree. `sharpee test` also reads the story itself, finds every
clause and every branch inside a clause, and tries to write a small test
for each one unaided: arrange the world so that the clause applies, type
the command, and see that the clause's effects happened. These are the
**derived tests**. A `✓` is a clause that was exercised that way. A `◌`
is one the runner could not arrange, with its reason. A `✗` is a clause
whose effects did not happen, and it fails the run as a card does.

The report closes with three counts.

```text
Branches exercised: 53 / 134
```

```text
Endings reached: 2 / 3
Not reached (1):
  relighting.story:314 · night-falls (lose)
Rooms entered: 13 / 13
```

Read the counts as a list of what nobody has checked. The Relighting has
three endings and the tree reaches two. The third, `night-falls`, needs a
hundred and sixty turns of doing nothing, and it has been left out on
purpose so that this report has something to show you. In your own story,
an ending in that list is an ending no test has ever seen.

## Build and try it

Make the folder `relighting.tests` beside your story, and write the
manifest and the three segments of this chapter into it, with their keys
in alphabetical order and two spaces of indentation for each level. Run
`sharpee test .` when the manifest and the first segment are written, and
again when the other two are. The second and third segments go in
together, because a segment that continues a line is refused until a
branch leaves the card it continues from. Then break something on
purpose. In the story, find the phrase `cake-watched`, which the seed
cake's refusal prints, and change its last sentence from "You find you
cannot." to "You decide against it." Run the tree and read the failure.
Then put the sentence back and run the tree again.

When you have seen a failure and mended it, replace your folder with the
one from `chapter-38` and run the full tree.

```shell
sharpee test .
```

::: under-the-hood
**Under the Hood: the tree runner** · manifest `seed`, card `states`, platform channel `info.title`

The runner loads the compiled story exactly as `sharpee play` does, sets
the story's random seed from the manifest, and feeds each card's command
to the real parser and the real turn loop. A `contains` assertion reads
the turn's prose. A `states` assertion is compiled as a Chord condition
and evaluated against the world after the turn. An `events` assertion
reads the turn's event list, and a `channels` assertion reads the values
the turn would have sent to a page. Nothing is simulated, which is why a
tree that passes is evidence about the story a player will get.
:::

::: from-another-system
**From another system: test commands and scripts**

Inform 10 lets a story name a list of commands in its source, as in `Test
balloon with "get balloon / blow balloon / drop balloon".`, and typing
TEST BALLOON in the running story plays them. *Writing with Inform* adds
that "The Skein and Transcript tools of the Inform application are
provided for exactly this purpose". TADS 3 has input scripts: its System
Manual says "The Interpreter provides "script" files for this purpose",
read at start with the interpreter's `-i` option, and a game built on the
standard library offers RECORD and REPLAY commands. Each of these replays
commands. What a Chord card adds is the expectation stored beside the
command, and the fork.
:::

## What you have so far

You can write a play-through down as cards, say on each card what the
story must print and what must have become true, fork it wherever the
player has a choice worth checking, and run the whole thing in a few
seconds after every change.

A tree proves what happens along the paths you recorded. It does not, by
itself, say which of those results you are promising to keep. The next
chapter is about writing the promises down.

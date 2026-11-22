::: {.part-page}

# Part III. Making things happen {.part .unnumbered}

:::

# States

Part II built a world that a player can walk through and pick up. Nothing in
it remembers anything. The grille is across the stair because a line says so,
and the lens is cracked because its description says so, and neither of those
is a fact the story could act on.

A **state** is such a fact. It is a word that says what condition a thing is
in, chosen from a short list that you write. This chapter gives states to the
story and to five of its things. The next chapter makes them change.

## Declaring states

The iron grille across the Bell Stair is either standing or it has been
lifted. That is one line in its block.

```chord
create the iron grille
  aka grille
  a thing, scenery
  in the Bell Stair
  states: standing, lifted

  Wrought iron, floor to vault, with no lock, no latch and no hinges.
  It was not built. It was put there.
```

The line is the word `states`, a colon, and the names separated by commas. A
state name is one word, or several joined by hyphens. Three rules come with
the line.

- A thing is always in exactly one of its states.
- The first state listed is the one it starts in. The grille starts
  `standing`.
- The list has a direction. A thing may move to a later state and may not
  come back to an earlier one, unless you say otherwise.

The last rule is the one that surprises people, and it is deliberate. Most
things in a story happen once. A seal is broken, a page is read, a bridge
falls. Writing the states in order tells the compiler which way the story
runs, and it will stop you if a later line tries to run it backwards.

Here are the other things in The Relighting that get states in this chapter.

```chord
create the lens
  a thing
  in the crate
  states: cracked, sound
```

```chord
create the cistern
  aka ice
  a thing, scenery
  in the Undercroft
  states: frozen, thawing, running

  A stone cistern sunk in the floor, fed by a lead pipe from somewhere
  above. It is a block of grey ice to its brim, and something flat and
  pale is held in the ice a hand's depth down.
```

```chord
create the tower bell
  aka bell
  a thing, scenery
  in the Bell Stair
  states: unrung, tolling, silent

  You cannot see the bell from here, only the dark it hangs in.
```

```chord
create the spark page
  aka first page, leaf
  a thing, readable with text "One line, in ink that is still wet. It is a single word, and it will not stay in your head."
  on the reading desk
  states: legible, learned

  A leaf that has worked loose from the grimoire. The ink on it is
  complete.
```

The cistern, the bell and the page are new. Each list tells a small story in
order: the ice thaws and then runs, the bell has never rung, then tolls, then
falls silent, and the page can be read before it has been learned.

## Naming a state

A state names what the thing is. It does not name what the thing has stopped
being. If you give a wax seal the states `sealed, unsealed`, the compiler
refuses the second word with `analysis.negated-state`, because `unsealed`
describes the absence of the first state and nothing else. Ask what the seal
is once it is no longer sealed. It is `broken`, or `melted`, or `lifted`, and
any of those tells the player and the next author more than the negative
does.

## Reading a state

A state is read with the word `is`. The phrase `the iron grille is standing`
is a **condition**, which is to say something the story can test and find
true or false. Conditions have a chapter of their own, which is chapter 16,
but you met one place that takes a condition in chapter 12. A blocked way may
be blocked only `while` something holds.

```chord
create the Bell Stair, a room
  in the Hall
  up to the Lantern Gallery
  up is blocked while the iron grille is standing: stair-sealed
```

In Part II the stair was sealed for good. Now it is sealed for as long as the
grille is in its first state, and the line and the thing are tied together.
To say that a thing is not in a state, write `is not`: `the iron grille is
not standing`.

## Changing a state

A state is changed with a **statement**, which is one line of instruction to
the story.

```chord
change the iron grille to lifted
```

Statements cannot stand loose in a file. They live inside blocks that say
when they run, and the block you will use most is the clause of chapter 14.
There is one such block in the story already, the start block, and it will
do for an experiment. The line needs the grille's `states` line, so try it
once you have copied this chapter's story into your folder, in "Build and
try it" below. Add the line to the start block for a moment.

```chord
before the game starts
  change the player to Ansel
  change the iron grille to lifted
end before
```

Build the story and walk to the Bell Stair.

```text
> up
Lantern Gallery
The roof of the tower, open on every side. The Great Lantern stands in the middle of it on a stone drum, taller than you are, its glass thirty years dirty. To the east a low parapet is all there is between you and the court. The stair goes back down.
```

The stair is open, because the condition on the blocked line is no longer
true. Take the extra line out again before you go on. Keep the trick in mind,
though. The start block is a good place to put the world into the state you
want to test, without playing your way there each time.

If you ask for a state the thing does not have, the compiler tells you.

```text
probe.story:27:3 error [analysis.undeclared-state] `melted` is not a declared state of seal.
```

## States that go both ways

Nothing in Lanternhall goes back to what it was, which is rather the point of
the story. For a thing that does, here is a sluice from another story.

```chord
create the sluice
  a thing, scenery
  in the Yard
  states, reversible: raised, lowered

  A sluice.
```

The word `reversible` goes after `states` and before the colon. With it, the
sluice may be changed from `raised` to `lowered` and back as often as the
story likes. Without it, the second change is an error, and the message
shows you the line to write:

```text
probe.story:37:3 error [analysis.irreversible-state] `whole-shell` is the initial state of a forward-only set — `change` cannot go back. Declare the set as `states, reversible: whole-shell, cracked-shell` to permit back-transitions.
```

Leave `reversible` off unless the thing really does go both ways. The
forward-only rule will then catch the day you write a change in the wrong
direction.

## The story's own states

Some facts belong to no one thing. Lanternhall as a whole is asleep, and then
it is waking, and at the end it is awake. The story header takes a `states`
line of the same shape.

```chord
story
  title: The Relighting
  id: relighting
  story-version: 0.3.0
  states: asleep, waking, awake
```

The story's state is changed with `change the story to waking`, and it is
read with `the story is asleep` or `the story is not asleep`. Everything said
above about order and direction holds for the story as well.

Use the story's states for the few large facts that many things will ask
about. A fact about one thing belongs on that thing. Chord has no loose
variables and no flags, and that is by design. Every fact has an owner, and
you find the fact by looking at its owner's block.

## The states you do not declare

Some things already had states before this chapter. The library door is
locked, the oak press is closed, and the hand lamp is unlit. Those come with
the trait words of Part II, and they are read in the same way.

| Trait word | What you can read |
| --- | --- |
| `openable` | `is open`, `is closed` |
| `lockable` | `is locked`, `is unlocked` |
| `switchable` | `is on`, `is off` |
| `light-source` | `is lit` |
| `wearable` | `is worn` |
| `breakable` | `is broken` |

So `the library door is locked` is a condition you may already write, and
`change the library door to unlocked` is a statement you may already write.
For light, say `is lit` and `is not lit`. The word `unlit` belongs to the
`starts unlit` line and is not something a condition reads:

```text
probe.story:26:42 error [analysis.unknown-value] `unlit` is not a state of lamp or a known trait — did you mean `lit`?.
```

Because the trait owns those words, you may not declare a state of the same
name on a thing that has the trait.

```text
probe.story:14:11 error [analysis.shadow-state] `open` is a word of `openable`, which box carries — a state of that name would answer `is open` in place of the trait. Rename the state, or read and change the trait's own (`is open`, `change … to open`).
```

One trait word from chapter 9 makes its positions out of your states. A
thing that is `settable` is a dial, and the states you declare are the marks
on it.

```chord
create the dial
  a thing, scenery, settable
  in the Yard
  states, reversible: low, high

  A dial with two marks, low and high.
```

```text
> set dial to low
You set the dial to low.

> set dial to middling
The dial goes to low or high.
```

## Build and try it

Copy `relighting.story` from the companion folder `chapter-13` over your own
file. It is the story with this chapter's changes made. To make the changes
by hand instead, work from this list and take the rest from that file: add
the `states` line to the header and to the grille and the lens, add the
cistern, the tower bell and the spark page, put the `while` condition on the
Bell Stair's blocked line, and raise `story-version` to `0.3.0`, because this
is the first chapter of Part III.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Play it, and you will find that nothing has changed. That is correct. Every
thing is in its first state and no line yet moves one. The page can be read,
and reading it teaches nothing.

```text
> read page
(first taking the spark page)

You take the spark page from the reading desk.

The spark page reads:
One line, in ink that is still wet. It is a single word, and it will not stay in your head.
```

::: under-the-hood
**Under the Hood: where a state lives** · Story IR `states`

Compile the story with `sharpee compose relighting.story -o relighting.ir.json`
and look at the entry for the grille. Its `states` field holds the list in
the order you wrote it, and a field beside it records whether the set is
reversible. The trait states are not there. `is locked` and `is lit` are read
from the platform's own lockable and light-source traits each time they are
asked for, which is why they can never disagree with what the standard
actions have done.
:::

::: from-another-system
**From another system: properties and flags**

In Inform 10 you would write "The cistern can be frozen, thawing or running"
and then test and set that property anywhere in the source. In TADS 3 you
would add a property to the object and assign to it from any method. Chord's
`states` line does the same job with two differences. The states are ordered,
and the order is enforced unless you say `reversible`. And there is no global
variable to fall back on: a fact belongs to a thing or to the story, and it
is declared in that owner's block.
:::

## What you have so far

The story and five of its things can now be in one condition or another, and
one exit already depends on which. What is missing is anything that changes
a state during play. For that a thing has to notice what the player does to
it, and that is the next chapter.

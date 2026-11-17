# Counting, scoring and ending

A state says which of a few named conditions a thing is in. Some facts are
not like that. How many times the rope has been pulled, how many workings
Ansel has back, how well the player is doing: these are numbers. This
chapter covers the numbers a story keeps, the score built on them, and the
statements that bring a story to its end.

## A counter on a thing

A **counter** is a whole number with a name. A thing gets one with a line in
its block.

```chord
create the bell rope
  aka rope
  a thing, scenery, pullable
  in the Bell Stair
  counter pulls

  A rope as thick as your wrist, coming down out of the dark.

  after the player pulling
    raise the bell rope's pulls by 1
    phrase rope-sore when the bell rope's pulls is more than 3
    select cycling
      phrase rope-nothing
    or
      phrase rope-dust
    or
      phrase rope-patience
    end select
  end after
```

The line `counter pulls` gives the rope a counter that starts at nought.
From inside a clause it is called `the bell rope's pulls`, the owner and
then the name. `raise` adds to it and `lower` takes away.

A counter is compared with a number in words or in symbols. Both lines
below mean the same.

```chord
    phrase rope-sore when the bell rope's pulls is more than 3
    phrase rope-sore when the bell rope's pulls > 3
```

The word forms are `is at least`, `is more than`, `is at most` and `is less
than`. The symbols are `>=`, `>`, `<=` and `<`.

```text
> pull rope
You pull the bell rope.

Your palms have begun to object.

Nothing answers. The bell has not been rung in thirty years and sees no reason to start for you.
```

That is the fourth pull. The counted blocks of the last chapter could have
done this much. A counter earns its place when the number is read somewhere
else, or goes down as well as up, or has limits.

The line may give a starting value and limits.

```chord
  counter sips starts 3 between 0 and 3
```

A counter with limits stops at them. Lowering `sips` when it is already at
nought leaves it at nought. And `set` puts a counter at a value outright:
`set the vial's sips to 3`.

## A counter for the story

A number that belongs to no one thing is declared at the top level.

```chord
define counter workings
```

This one counts the workings Ansel has learned. It has no owner, so it is
called by its bare name, and each page raises it in the arm where the page
is first read.

```chord
      when legible
        change the hush page to learned
        raise workings by 1
        phrase hush-learned
```

The grimoire reads it.

```chord
  after the player examining
    phrase grimoire-waiting when any faded-page
    phrase grimoire-filling when no faded-page
    phrase grimoire-half when workings is at least 2
  end after
```

Chapter 16 said a condition cannot count. This is the way round it. The
story counts as it goes, and the condition reads the count.

## Scoring

A score is a number the player is shown. Chord builds it from **scores**,
which are named awards with a value, each declared on the thing that earns
it. The story header first says that the story keeps score at all.

```chord
story
  title: The Relighting
  id: relighting
  story-version: 0.3.0
  states: asleep, waking, awake
  use scoring
    rank "Latecomer" at 0
    rank "Second-Year" at 10
    rank "Lamplighter" at 25
```

`use scoring` turns the score on. It is the first `use` line in this book. A
`use` line switches on a part of the language that not every story wants,
and chapter 35 goes through the others.

An award is declared with a `score` line and paid with `award`.

```chord
create the kindle page
  aka first page, leaf
  a thing, readable
  on the reading desk
  states: legible, learned
  score first-working worth 5
```

```chord
      when legible
        change the kindle page to learned
        change the story to waking
        raise workings by 1
        award first-working
        phrase kindle-learned
```

An award is paid once. If the `award` line runs again, nothing is added. The
candles get `score supper-lit worth 5` and the Great Lantern gets `score
relit worth 15`, each with an `award` line in the clause that earns it.

The player asks with `score`.

```text
> score
You have scored 5 out of 25, earning you the rank of a Latecomer.
```

You did not write the 25. The maximum is the sum of every `score` line in
the story, and it changes when you add one.

## Ranks

The lines under `use scoring` are the **ranks**: a name in quotes, and the
number of points at which the player reaches it. The rank is printed after
the word "a", so choose names that read well there.

When the player crosses into a new rank, the story says so.

```text
> light candles
You light the candles.

The flame runs down the length of the table, and every cold wick takes it. In the candlelight there is a leaf of paper under the middle pricket that the daylight did not show.

You have risen to the rank of a Second-Year.
```

A rank's number is a count of points and not a share of the maximum, which
has a consequence. The compiler will not accept a rank that no player could
reach.

```text
relighting.story:19:5 error [analysis.rank-above-max] Rank "Journeyman" sits at 30, above the 25 points this story declares — no player could reach it.
```

The Relighting will end with four ranks and fifty points. For now it has
twenty-five points, so it has three ranks, and the ladder will be lengthened
as later chapters add awards.

## Winning and losing

Two statements end the story.

```chord
win lantern-lit
lose lens-shatters
```

Each prints the phrase it names and then stops the game. `win` ends it in
victory and `lose` in defeat.

Both endings of The Relighting belong to the Great Lantern. Lighting it over
a sound lens is the victory. Lighting it over the cracked lens is the loud
defeat. The named condition from chapter 16 keeps the clause readable.

```chord
create the Great Lantern
  aka lantern
  a container, scenery, light-source, starts unlit
  in the Lantern Gallery
  holds 1
  score relit worth 15

  A drum of brass and glass the height of a door, with a seat inside it
  for a lens and a wick as thick as your arm. Nothing has burned in it
  for thirty years.

  on the player lighting
    the kindle page must be learned: no-such-word
    the lens must be in the Great Lantern: lantern-empty
  end on

  after the player lighting
    lose lens-shatters when not lantern-ready
    change the story to awake when lantern-ready
    award relit when lantern-ready
    win lantern-lit when lantern-ready
  end after
```

Every line of the `after` clause carries a `when`, and that is not untidy
writing. A `win` or a `lose` does not stop the clause it is in. The lines
after it still run. If the `award` line had no condition, a player who had
just shattered the lens would be paid fifteen points for it. So in a clause
that can end the story two ways, each line says which ending it belongs to.

## Trying the endings

There is a difficulty. The Lantern is on the roof, the grille is across the
stair, and nothing in the story can lift the grille until chapter 24. No
player can reach either ending yet.

The start block trick from chapter 13 is made for this. In a copy of the
file, set the world up as it will be late in the game. Keep the copy in a
folder of its own, since a project holds one story, and check and play it
there.

```chord
before the game starts
  change the player to Ansel
  change the iron grille to lifted
  change the kindle page to learned
  move the lens to the Lantern Gallery
end before
```

Then walk up and light the Lantern.

```text
> put lens in lantern
(first taking the lens)

Taken.

You put the lens in the Great Lantern.

The lens drops into its seat with a sound like a coin on a counter.

> light lantern
You light the Great Lantern.

For one breath the cracked lens throws two beams, crossed, over the whole valley. Then it lets go along the crack, and the Lantern goes dark for the last time.

[The story has ended. RESTART, RESTORE or UNDO]
```

Add `change the lens to sound` to the start block and the same commands end
the other way.

```text
> light lantern
You light the Great Lantern.

The lens gathers the flame and sends it out over the valley in one white bar. Down in the Hall, every blank page begins to fill.

You have risen to the rank of a Second-Year.

[The story has ended. RESTART, RESTORE or UNDO]
```

The companion file does not contain these start-block lines. They are a way
of testing, and they come out again.

## Killing the player

The third ending statement is for a death that is not a judgement on the
whole game.

```chord
create the vial
  a thing, drinkable
  in the Yard

  A vial.

  after the player drinking
    kill the player
      It was not water. You have just long enough to be annoyed.
  end after
```

```text
> drink vial
You drink the vial.

It was not water. You have just long enough to be annoyed.

[The story has ended. RESTART, RESTORE or UNDO]
```

`kill the player` takes a phrase key, or the text itself indented beneath
it, and never both. It is what a `deadly` way from chapter 12 does for you.
Use `lose` when the story has reached one of its endings and the player
should know it. Use `kill the player` when they have simply walked into
something, and everything chapter 12 said about fairness applies.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-18` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print. To make the changes by hand
instead, work from this list and take the rest from that file: add `use
scoring` and its ranks to the header, `define counter workings` near the
top, the three `score` lines and their `award` lines, the `raise workings`
line in each page's first arm, the counter on the bell rope, and the `after`
clause on the Great Lantern. There are four new phrases.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Ten of the twenty-five points can be earned in the story as it stands, five
for the page and five for the candles.

```text
> score
You have scored 10 out of 25, earning you the rank of a Second-Year.
```

::: under-the-hood
**Under the Hood: the score is a ledger** · Story IR `scores`, `ranks`

In the compiled IR every award is one entry under `scores`, with its name
and its worth, and the ranks are a list sorted by threshold. The platform
keeps a ledger of which awards have been paid, and the number the player
sees is the sum of that ledger. That is why an award cannot be paid twice,
and why the maximum needs no line of yours: it is the sum of the list.
:::

::: from-another-system
**From another system: scoring and endings**

Inform 10 keeps a `score` variable that you add to, a `maximum score` that
you set by hand, and a table of rankings, and it ends the game with "end the
story" or "end the story finally". TADS 3 awards points through `Achievement`
objects and ends with `finishGameMsg`. Chord's `score` lines are nearest to
the TADS approach, in that each award is a named thing, and TADS can be told
to give it only once (`awardPointsOnce`). The maximum is computed for you, and an ending is one of three plain
statements.
:::

## What you have so far

The story counts, keeps score and can be won or lost. What it cannot do is
change by itself. Every line you have written so far runs because the player
typed something. The last chapter of Part III is about things that happen
whether the player acts or not.

# Choosing between outcomes

The reading clauses of the last two chapters work, and they are hard to
read. Four lines each end in `when`, the order of the lines matters, and
the reader has to hold a state in their head to see which lines will run.
The clause is really saying something simple: if the page is legible, do
this, and if it is learned, do that.

Chord has three blocks for choosing. One chooses by a state. One chooses by
turn, or by chance. One chooses by how many times the clause has run.

## Choosing by state: select on

A `select on` block names a thing's state and gives one **arm** for each
value you care about. Here is the spark page's clause again.

```chord
  on the player reading
    select on the spark page's state
      when legible
        change the spark page to learned
        change the story to waking
        phrase spark-learned
        each faded-page
          change the match to legible
        end each
      when learned
        phrase spark-known
    end select
  end on
```

The first line is `select on`, then the thing, then `'s state`. Each arm
opens with `when` and a state name, and its statements are indented beneath
it. The block closes with `end select`.

Exactly one arm runs: the one for the state the page is in when the block
is reached. That removes both of the costs chapter 15 warned about. No
condition is repeated, and the order of the statements inside an arm no
longer matters to the choice, because the choice has been made before any of
them runs. The `change the spark page to learned` line can now stand first,
where a reader expects it.

You do not have to give an arm for every state. A state with no arm does
nothing.

## Refusals stay outside

The hush page has three states, and its `faded` state is a refusal. It is
tempting to give it an arm.

```chord
    select on the hush page's state
      when faded
        refuse page-blank
```

The compiler will not have it.

```text
relighting.story:390:9 error [analysis.refusal-misplaced] Refusal inside a `select` arm — it never fires, because refusals are decided before any branch runs. Move `refuse page-blank` to the top of the clause, above the block.
```

Whether an action goes ahead is settled first, from the `must`, `refuse
when` and `refuse` lines at the top of the clause. Only then do the
statements run. So the refusal keeps its place at the top, and the block
handles the two states that remain.

```chord
  on the player reading
    refuse when the hush page is faded: page-blank
    select on the hush page's state
      when legible
        change the hush page to learned
        phrase hush-learned
      when learned
        phrase hush-known
    end select
  end on
```

This is the shape of most clauses that do real work: what stops the action,
then what the action does, by case.

## One clause, several answers

Chapter 14 said that a thing has one clause for each gerund, and promised a
way to answer one action differently at different times. This is it. The
cistern in the Undercroft looks different in each of its three states, and
it has one `after` clause for being examined.

```chord
create the cistern
  aka ice
  a thing, scenery
  in the Undercroft
  states: frozen, thawing, running

  A stone cistern sunk in the floor, fed by a lead pipe from somewhere
  above.

  after the player examining
    select on the cistern's state
      when frozen
        phrase cistern-frozen
      when thawing
        phrase cistern-thawing
      when running
        phrase cistern-running
    end select
  end after
```

The description now holds only what is always true of the cistern, and the
clause adds the sentence that depends on its state.

```text
> examine cistern
A stone cistern sunk in the floor, fed by a lead pipe from somewhere above.

It is a block of grey ice to its brim. Something flat and pale is held in the ice, a hand's depth down.
```

Nothing thaws the cistern yet, so the other two arms wait for chapter 19.

## Choosing by turn: select with a strategy

A response that never varies wears thin. The bell rope says the same
sentence every time it is pulled, and a player will pull it more than once.
A `select` block may be given a **strategy** in place of `on`, and then its
arms are alternatives, separated by lines that say `or`.

```chord
  after the player pulling
    select cycling
      phrase rope-nothing
    or
      phrase rope-dust
    or
      phrase rope-patience
    end select
  end after
```

`cycling` takes the arms in order and starts again after the last.

```text
> pull rope
You pull the bell rope.

Nothing answers. The bell has not been rung in thirty years and sees no reason to start for you.

> pull rope
You pull the bell rope.

A little dust comes down the well, and that is all.

> pull rope
You pull the bell rope.

The rope takes your weight and gives nothing back. Somewhere above, the bell goes on not ringing.

> pull rope
You pull the bell rope.

Nothing answers. The bell has not been rung in thirty years and sees no reason to start for you.
```

There are five strategies.

| Strategy | Which arm runs |
| --- | --- |
| `cycling` | each in order, then round again |
| `stopping` | each in order, then the last one from then on |
| `randomly` | any one, chosen afresh each time |
| `sticky` | one chosen at random the first time, and that one ever after |
| `first-time` | the first arm once, and the second arm from then on |

`stopping` suits a thing that runs out of things to say. `sticky` suits a
detail that should differ from one playing to the next and stay fixed within
one. `first-time` takes two arms and is the plainest way to say a thing once
and something shorter afterwards.

An arm may hold any statements, not only a `phrase`. One arm could move a
thing and another could change a state. Most of the time, though, a strategy
is being used to vary text, and chapter 20 has a shorter way to write that,
with the variants inside the phrase.

## Choosing by count: first time, second time

The third block counts. Inside a clause, `first time` opens a block that
runs the first time the clause runs, `second time` the second, and so on up
to `tenth time`.

```chord
create the iron grille
  aka grille
  a thing, scenery
  in the Bell Stair
  states: standing, lifted

  Wrought iron, floor to vault, with no lock, no latch and no hinges.
  It was not built. It was put there.

  on the player taking, pushing, pulling
    refuse grille-fixed
  end on

  after the player examining
    first time
      phrase grille-memory
    second time
      phrase grille-cold
    third time
      phrase grille-enough
  end after
```

```text
> examine grille
Wrought iron, floor to vault, with no lock, no latch and no hinges. It was not built. It was put there.

There was no grille here in your day. You came down this stair at a run, most mornings.

> examine grille
Wrought iron, floor to vault, with no lock, no latch and no hinges. It was not built. It was put there.

The iron is colder than the morning accounts for.

> examine grille
Wrought iron, floor to vault, with no lock, no latch and no hinges. It was not built. It was put there.

It has not changed its mind.

> examine grille
Wrought iron, floor to vault, with no lock, no latch and no hinges. It was not built. It was put there.
```

After the third time the blocks are used up, and the grille has only its
description. These blocks need no `end` line. Each one closes where the next
begins, or where the clause does.

You met `first time` in chapter 5, as the text a room shows on the first
visit. It is the same idea. On a room it stands in the block by itself. In a
clause it counts that clause.

## Which one to use

The three blocks answer three different questions, and it is worth asking
which question you have before you write one.

If the answer depends on what is true of the world, use `select on`. The
cistern does not thaw because it has been looked at three times.

If the answer should simply vary, use a strategy. Nothing about the bell
rope has changed between one pull and the next.

If the answer depends on the player having done this before, use the count.
The grille's third response is a small joke about persistence, and it is
funny only as the third.

When the count starts to matter to the story, as when the fifth pull of a
rope should bring the bell down, you have gone past what these blocks are
for. That is a number the story should keep, and it is the next chapter.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-17` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases and the unbind page's clause, which the chapter did not print. To
make the changes by hand instead, work from this list and take the rest from
that file: rewrite the reading clauses of the spark, hush and unbind pages
with `select on`, move the frozen sentence out of the cistern's description
and give the cistern its clause, and put the `select cycling` block in the
bell rope's clause and the three counted blocks on the grille. There are
eight new phrases.

```shell
sharpee compose relighting.story --check
sharpee play .
```

::: under-the-hood
**Under the Hood: a branch is a test** · `sharpee test`

The derived tests of chapter 15 follow the branches. Run `sharpee test .`
inside the companion folder `chapter-17` and you will see one line for each arm: "spark page · on reading · when
legible", "spark page · on reading · when learned", "iron grille · after
examining · the third time". For a `select on` the runner puts the thing in
the arm's state before it types the command, which is something it can do
only because the states are declared. An arm you never reach in play can
still be exercised here. Not every arm is. A line that begins with `◌` is
an arm the runner could not arrange, with its reason, and the cistern's
three arms are listed that way in this chapter's story, because the runner
could not bring the cistern into the player's sight.
:::

::: from-another-system
**From another system: varying text**

Inform 10 writes variation inside the text, with substitutions such as "[one
of]...[or]...[cycling]" and "[first time]...[only]". TADS 3 has event lists,
among them `ShuffledEventList` and `StopEventList`, attached to an object.
Chord's strategies are the same family, and its names will be familiar from
both. The difference is that a Chord `select` chooses between runs of
statements, so the alternatives can do things as well as say them.
:::

## What you have so far

A clause can now branch on a state, rotate through alternatives and count
its own visits. The reading clauses say what they mean. Part III has two
chapters left, and they add the two things a puzzle game is usually built
on: numbers and time.

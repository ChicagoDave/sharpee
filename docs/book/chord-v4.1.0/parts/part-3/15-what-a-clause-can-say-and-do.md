# What a clause can say and do

A clause is a list of statements, run from the top. The last chapter used
three of them. This chapter goes through the rest of the everyday ones:
the two ways to refuse, the statements that print, change and move, and the
suffix that makes any of them conditional.

Chord has no `if`. There is no line that says "if this, do these three
things, otherwise do those". It is the first thing an author from another
language looks for, and the reason for its absence is the subject of half
this chapter. What Chord has in its place is a set of smaller forms, each of
which says one thing plainly.

## Requirements: must

Ansel remembers the shape of the old workings and none of their words. The
hand lamp should not light until the first word has been read. That is a
**requirement**, a thing that has to be true before the action may go on,
and it is written with `must`.

```chord
create the hand lamp
  a thing, light-source, starts unlit
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.

  on the player lighting
    the kindle page must be learned: no-such-word
  end on
```

The line states what must hold, then a colon, then the phrase to print when
it does not. If the kindle page is `learned`, the line does nothing and the
clause goes on. Here there is nothing more in the clause, so the standard
lighting action runs as usual. If the page is not learned, the action is
refused with the phrase.

```text
> light lamp
You reach for the word and find only the place where it was.
```

A `must` line can ask the same things a condition can, in the form that
follows `must`:

| Form | Example |
| --- | --- |
| `must be` a state | `the kindle page must be learned` |
| `must be in` a place | `the lens must be in the Great Lantern` |
| `must be a` kind | `the crate must be a container` |
| `must have`, `must hold`, `must wear` | `the player must hold the hand lamp` |
| `must see`, `must reach` | `the player must reach the lens` |

The Great Lantern has two requirements, and they are checked in order.

```chord
  on the player lighting
    the kindle page must be learned: no-such-word
    the lens must be in the Great Lantern: lantern-empty
  end on
```

A player who has not read the page is told about the word. A player who has
read it and brought no lens is told about the lens. The first requirement
that fails is the one that speaks.

## Prohibitions: refuse when

A requirement says what must be so. Its opposite is a **prohibition**, which
names something that stops the action when it is present. Hobb's cake may be
eaten, but not while Hobb is watching.

```chord
create the seed cake
  aka cake
  a thing, edible
  on the chair
  servings 2

  Half a seed cake on a plate, cut with some care into two pieces.

  on the player eating
    refuse when Hobb is here: cake-watched
  end on
```

```text
> eat cake
Hobb cut that cake into two pieces with some care, and he is sitting four feet away. You find you cannot.
```

Carry the cake out to the Gate Court and it can be eaten, because Hobb is
not there.

Chord keeps these two forms apart, and it will not let you turn one into
the other by adding `not`. Both of the following are errors.

```text
probe.story:23:19 error [parse.must-negative] State requirements positively — `must not …` is not a form. Use `refuse when <condition>: <key>` for prohibitions.
```

```text
probe.story:23:5 error [analysis.negated-requirement] State requirements positively — `refuse when not …` is not a form. Write `<subject> must <predicate>: <phrase-key>` for the requirement; `refuse when` is for hazards that are present.
```

The rule sounds fussy and reads well. A `must` line always tells you what
the player needs. A `refuse when` line always tells you what is in the way.
You never have to untangle a negative to find out which.

The third form is the plain `refuse` of the last chapter, which stops the
action without asking anything. All three belong at the top of an `on`
clause, above the statements that do things, and none of them may appear in
an `after` clause.

## Printing: phrase

`phrase` prints the text that a key stands for. The key is declared in the
`define phrases` block, or it may be declared on the spot, by writing the
text beneath the statement and indenting it one level further.

```chord
  after the player touching
    phrase cat-goes
      The cat is elsewhere, at once.
  end after
```

A phrase written in place belongs to that clause and cannot be used from
another one. It suits a line that is said once. Text that several clauses
share, such as `no-such-word`, belongs in `define phrases`, and so does
anything you will want to find again when you revise the prose.

## Changing and moving

`change` sets a state, and you have used it. The statements that move
things are these.

| Statement | What it does |
| --- | --- |
| `move the page to the Refectory` | puts a thing in a room, in a container, on a supporter or in a person's hands |
| `move the page here` | puts it where the player is |
| `move the cat offstage` | takes it out of the world, to be brought back by a later `move` |
| `remove the bun` | takes it out of the story for good |
| `make Hobb wear the spectacles` | puts a wearable thing on a person |
| `make the player take off the robe` | takes it off, and leaves it in their hands |

A thing may also begin offstage. If a `create` block has no placement line,
the thing exists and is nowhere, and waits for a `move`. The refectory
candles use this. Somewhere under the middle pricket there is a page that
daylight does not show.

```chord
create the unbind page
  aka fourth page
  a thing, readable with text "It reads like a knot seen from the wrong end."

  A leaf of the grimoire with a ring of old wax on it, where a pricket
  stood for thirty years.
```

```chord
create the candles
  aka prickets
  a thing, scenery, plural, light-source, starts unlit
  in the Refectory

  Stubs of tallow in iron prickets down the middle of each table. Nobody
  has put a flame to them since the last supper of the last term.

  on the player lighting
    the kindle page must be learned: no-such-word
  end on

  after the player lighting
    move the unbind page here
    phrase candles-catch
  end after
```

The candles have an `on` clause and an `after` clause for the same action,
which is allowed and often wanted. The first decides whether lighting may
happen. The second says what follows when it has.

```text
> light candles
You light the candles.

The flame runs down the length of the table, and every cold wick takes it. In the candlelight there is a leaf of paper under the middle pricket that the daylight did not show.

> look
Refectory
Three long tables, each with its row of candles, and a hearth you could stable a horse in. The benches are stacked against the wall, where someone left them for the holidays. The cloister is back to the west.

You can see an unbind page here.
```

Hobb's spectacles get one more line. Giving them to him already printed a
phrase, and now he puts them on.

```chord
  after the player giving to Hobb
    make Hobb wear the spectacles
    phrase spectacles-given
  end after
```

For this the spectacles need the trait word `wearable` on their kind line.
The statement prints nothing by itself. The phrase does the telling.

## The when suffix

Any statement that does something may end with `when` and a condition. The
statement then runs only if the condition is true.

The kindle page should behave differently the second time it is read. The
first reading teaches the word and wakes the Hall. Later readings should
only say that Ansel knows it.

```chord
  on the player reading
    phrase kindle-known when the kindle page is learned
    phrase kindle-learned when the kindle page is legible
    change the story to waking when the kindle page is legible
    change the kindle page to learned
  end on
```

```text
> read page
(first taking the kindle page)

You take the kindle page from the reading desk.

You read the line once, and it reads you back. The word for waking a flame settles into the place it left thirty years ago, as if it had only stepped out.

> read page
You know it. You are not likely to lose it twice.
```

This is what Chord offers where another language would offer `if`, and you
should see its two costs.

Each line carries its own condition, so a clause with two outcomes repeats
the condition on every line.

The lines also run in order, and an earlier one can change what a later one
tests. The `change the kindle page to learned` line is last for that reason.
Move it to the top and both phrases would find the page `learned`, and the
first reading would print the wrong one.

For a clause with one or two conditional lines, the suffix is the right
tool. For a clause that really has branches, chapter 17 has a better one,
and it will rewrite this clause.

`refuse` takes no `when` suffix. Its conditional form is `refuse when`,
which you have already.

## It, and its absence

In every clause above, the thing is named in full: `the kindle page`, `the
hand lamp`. You might expect to write `it`. In a `create` block you may not.

```text
probe.story:23:17 error [analysis.it-removed] `it` is no longer a form outside `define trait` — name the owner: `the lamp`.
```

A clause in a thing's block often mentions two or three things, and `it`
would leave the reader to work out which one is meant. The word comes back
in chapter 24, in the one place where the thing has no name to use.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-15` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print. To make the changes by hand
instead, work from this list and take the rest from that file: add the
clauses to the hand lamp, the seed cake, the Great Lantern and the candles,
give the Lantern and the candles `light-source, starts unlit` and the
spectacles `wearable`, rewrite the kindle page's clause, add the unbind page,
and add the five new phrases.

```shell
sharpee compose relighting.story --check
sharpee play .
```

The first steps of the game now have to be done in order. The lamp will not
light until the page is read, the page is behind a locked door, and the key
is in the oak press.

```text
> light lamp
You light the hand lamp.

> down
Undercroft
Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

You can see a crate here.
```

::: under-the-hood
**Under the Hood: what the test runner derives** · `sharpee test`

Run `sharpee test .` inside the companion folder `chapter-15`, which has a
test tree where your own folder has none, and read the list under the
heading that begins "Derived rule tests". The report has other parts above
and below that list, and chapter 38 explains them. The runner has turned each refusal into a test of its
own: "hand lamp · on lighting · refused no-such-word", "seed cake · on
eating · refused cake-watched". It arranges the world so that the refusal
should fire, types the command, and checks that the phrase came out. A
`must` line and a `refuse when` line are both stored as a condition and a
phrase key, which is all the runner needs to do that.
:::

::: from-another-system
**From another system: no if**

Both Inform 10 and TADS 3 let you put a conditional block wherever
statements go. Chord does not. A refusal is a `must` or a `refuse when` at
the top of the clause, a single conditional effect takes a `when` suffix, and
a real branch is a `select` block from chapter 17. If you find yourself
wanting three or four `when` suffixes with the same condition, that is the
language telling you the thing has a state you have not named yet.
:::

## What you have so far

A clause can now require, forbid, print, change and move. The lamp wants a
word, the candles hide a page, and the story itself has moved from `asleep`
to `waking`. Every one of those lines leans on a condition, and so far the
conditions have been as simple as they come. They are the next chapter.

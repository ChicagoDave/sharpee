# Conditions

A condition is anything the story can test and find true or false. You have
been writing them since chapter 12: after `while` on a blocked way, after
`while` on a clause head, after `when` on a statement, and inside `must` and
`refuse when`. All of those places take the same thing. This chapter is the
whole of what that thing can be.

## What a condition can ask

The simplest condition has a subject and one test.

| Test | Example | True when |
| --- | --- | --- |
| `is` a state | `the lens is sound` | the thing is in that state |
| `is a` kind | `the crate is a container` | the thing is of that kind |
| `is in` | `the lens is in the Great Lantern` | the thing is directly in or on the other |
| `is here` | `Hobb is here` | the thing is in the room where the player is |
| `has` | `the player has the lamp` | the person is carrying or wearing it |
| `holds` | `the player holds the lamp` | the same as `has` |
| `wears` | `the player wears the coat` | the person has it on |
| `can see` | `the player can see the lens` | the thing is in view |
| `can reach` | `the player can reach the lens` | the thing can be touched |

Three of these need a note.

`is in` is used for supporters too. A cup on the chair is `in the chair` as
far as a condition is concerned, and there is no `is on`.

`is here` is generous. A thing the player is carrying is here, and so is a
thing shut inside a container in the room.

`can see` and `can reach` differ in the way you would hope. A coin in a
closed glass jar can be seen and cannot be reached. Open the jar, and it can
be both.

Any `is` test is made negative with `not` after the `is`: `the lens is not
sound`, `Hobb is not here`.

There is one test of a different kind.

```chord
  phrase rooks-go-up when one chance in 3
```

`one chance in 3` is true about a third of the times it is asked. Use it for
colour and never for anything the player needs, because a player cannot be
expected to repeat a command until the dice agree.

## Joining conditions

Conditions are joined with `and` and `or`, and turned round with `not`.

```chord
the lens is in the Great Lantern and the lens is sound
```

`not` is applied first, then `and`, then `or`. When that is not the grouping
you mean, use parentheses.

```chord
(the jar is open or the player wears the hat) and not the player has the coin
```

A whole condition goes on one line. If a line is getting long, that is a
sign the condition wants a name.

## Naming a condition

The Great Lantern is ready to be lit when the lens is seated in it and the
lens is whole. Several lines of the story will want to ask that, so it is
given a name once, at the top level of the file.

```chord
define condition lantern-ready: the lens is in the Great Lantern and the lens is sound
```

From then on the bare word `lantern-ready` is a condition, and may be used
anywhere a condition goes: `when lantern-ready`, `when not lantern-ready`,
`while lantern-ready and the story is waking`.

A named condition is worth having for three reasons. It is shorter. It says
what the test means, where the long form says only how it is made. And when
the rule changes, because the Lantern turns out to need a shutter as well,
you change it in one place.

A named condition is worked out afresh each time it is asked. It stores
nothing. It is a name for a question, and the answer is always current.

## Conditions with a gap: it

The pages of the grimoire did not all come back at once. The spark page is
legible this morning. The other pages are still faded, and the ink returns
to them when the first working is read. So two more pages get a new first
state.

```chord
create the hush page
  aka third page
  a thing, readable
  in the Stack 3
  states: faded, legible, learned

  A leaf of the grimoire, shelved by somebody between two blank spines
  as though it were a book.
```

The unbind page under the candles gets the same `states` line. Now the
story needs to talk about every faded page, whichever pages those are and
wherever they have got to. A condition can leave its subject open, with the
word `it`.

```chord
define condition faded-page: it is faded
```

This is a condition with a gap in it. By itself it cannot be true or false,
because it does not say what `it` is. It is a description, and things either
fit it or do not. The hush page fits it. The kettle does not.

An open condition is used in three ways.

## Any and no

`any` followed by the name is true when at least one thing fits. `no`
followed by the name is true when nothing does.

```chord
create the grimoire
  aka book, margin, note
  a thing, readable with text "In the margin, in a small brown hand: gnusto. Came over the water as a working, they say. Meaning lost."
  on the reading desk

  A book as long as your forearm, chained to nothing any more. Its pages
  are blank, or were. Here and there a line of ink has come back, as
  frost comes onto a window. Someone has written in one margin.

  after the player examining
    phrase grimoire-waiting when any faded-page
    phrase grimoire-filling when no faded-page
  end after
```

```text
> examine grimoire
A book as long as your forearm, chained to nothing any more. Its pages are blank, or were. Here and there a line of ink has come back, as frost comes onto a window. Someone has written in one margin.

The loose leaves that belong in it are somewhere about the Hall, and you have the feeling they are still as blank as these.
```

The grimoire does not know how many pages there are or what they are
called. It asks whether anything in the story is faded.

## Each

The third use does something to every thing that fits. An `each` block is
written inside a clause. It names an open condition, and its lines run once
for each thing the condition holds for. Inside the block, the words `the
match` stand for that thing.

Reading the spark page is what brings the ink back.

```chord
  on the player reading
    phrase spark-known when the spark page is learned
    phrase spark-learned when the spark page is legible
    change the story to waking when the spark page is legible
    change the spark page to learned
    each faded-page
      change the match to legible
    end each
  end on
```

The block closes with `end each`. When the player reads the spark page, the
hush page and the unbind page both become `legible`, in the same turn,
wherever they are. If a later chapter adds a fifth page with a `faded`
state, this clause will wake it too, and nobody will have to remember to
come back and edit it.

That is the difference between `each` and writing two `change` lines. The
two lines name what is in the story today. The block says what you mean.

A faded page should not be readable, and that is a prohibition on the page.

```chord
  on the player reading
    refuse when the hush page is faded: page-blank
    phrase hush-known when the hush page is learned
    phrase hush-learned when the hush page is legible
    change the hush page to learned
  end on
```

A player who goes straight to the stacks finds the page and cannot read it.

```text
> read hush page
The leaf is blank on both sides. You hold it up to the light, and it is still blank, but the paper has the look of a held breath.
```

After the spark page has been read, the same command works.

```text
> read hush page
(first taking the hush page)

Taken.

The third working is hardly a word at all. It is the breath you take before one.
```

The grimoire has noticed as well.

```text
> examine grimoire
A book as long as your forearm, chained to nothing any more. Its pages are blank, or were. Here and there a line of ink has come back, as frost comes onto a window. Someone has written in one margin.

Something has changed in the last hour. Wherever its loose leaves have got to, the ink is on them now.
```

`the match` may be used in the block wherever a thing's name could go, and
only there. An `each` block may sit inside another, and `the match` then
means the thing of the inner one.

## What a condition cannot ask

A condition cannot ask who the player is. When a story has more than one
person the player may be, as chapter 31 describes, the test is made on a
state of the person concerned.

A condition cannot count. There is no "at least two faded pages". Counting
is done with a counter, which chapter 18 introduces, and a counter can be
compared with a number.

And a condition does not remember. `the lens is sound` asks about now. If
the story needs to know that something was once true, that is a state, and
some clause has to set it.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-16` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases and the unbind page's clause, which the chapter did not print. To
make the changes by hand instead, work from this list and take the rest from
that file: add the two `define condition` lines near the top of the file,
after the header, add the hush page, give the unbind page its states and its
clause in place of `with text`, and add the `each` block to the spark page
and the `after` clause to the grimoire. There are seven new phrases.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Walk to the third stack before you read anything, try the hush page, and
then come back for the spark page. The order matters now, and the story
knows it.

::: under-the-hood
**Under the Hood: a condition is a tree** · Story IR `conditions`

Compile to IR with chapter 4's command,
`sharpee compose relighting.story -o relighting.ir.json`, and find
`lantern-ready` under `conditions`. It is stored as
an `and` with two branches, each a test with a subject and an object. Every
`while`, `when` and `must` in the file holds a tree of the same shape, or
the name of one. `faded-page` is marked `open`, which is the compiler's word
for a condition with `it` in it, and the entries for `any`, `no` and `each`
refer to it by name.
:::

::: from-another-system
**From another system: descriptions of objects**

Inform 10 has a close relative of the open condition. You write "Definition:
a page is faded if ..." and then say "if any page is faded" or "repeat with
P running through faded pages". TADS 3 gives you loops over objects and
leaves the filtering to ordinary code. Chord's `define condition`, `any`,
`no` and `each` cover the same ground in four small forms. The limit is that
an `each` block names a condition you have defined. You cannot write the
test inline.
:::

## What you have so far

Conditions can be joined, named and left open, and one clause can now reach
every thing of a sort. The reading clauses are getting crowded, though. Each
has three or four lines ending in `when`, all about the same state. The next
chapter gives them a proper shape.

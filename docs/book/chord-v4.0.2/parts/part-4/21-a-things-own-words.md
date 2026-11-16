# A thing's own words

The phrases of the last chapter belong to the story. Any clause may print
any of them. Some words belong to one thing: the sentence that says the lamp
is burning, the line that tells the player Hobb is in the room. Those are
written in the thing's own block, with a `phrase` line that is not a
statement and does not sit inside a clause.

There are a handful of these, each with a reserved key. This chapter covers
the three you will use most, `detail`, `present` and `disappeared`, and then
the general rule they are examples of.

## Detail: a sentence that depends

A description is fixed. The hand lamp's description says that its wick is
dry, and it says so whether the lamp is burning or not. Chapter 17 handled
the cistern with an `after` clause and a `select` block, which is the right
tool when a thing has several states and something to say in each. For one
added sentence there is a lighter form.

```chord
create the hand lamp
  a thing, light-source, starts unlit
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.

  on the player lighting
    the kindle page must be learned: no-such-word
  end on

  phrase detail while the hand lamp is lit:
    It is burning with a small flame, and the flame is blue.
```

The line is `phrase detail`, the word `while`, a condition and a colon, with
the text indented beneath. While the condition holds, the text is added to
the end of the description.

```text
> examine lamp
A tin hand lamp with a wire handle. Its wick is dry and its glass is clean, which is Hobb all over.
```

Read the kindle page, light the lamp and look again. The Hall's waking timer
is running by then, and it has its say at the end of each turn.

```text
> light lamp
You light the hand lamp.

Somewhere above you, old timber takes a weight it had forgotten.

> examine lamp
A tin hand lamp with a wire handle. Its wick is dry and its glass is clean, which is Hobb all over. It is burning with a small flame, and the flame is blue.

A slow draught moves through the Hall, one way and then the other.
```

The sentence joins the paragraph. It is not printed as a line of its own, as
a clause's phrase would be, and that is the difference between the two.
Detail is part of what the thing looks like.

Three rules go with it. A `detail` phrase must have a `while`, because a
sentence that is always true belongs in the description. It has one text and
no variants. And a thing may have as many `detail` phrases as it needs.

The candles show why you would want two. The old description said that
nobody had put a flame to them since the last supper of the last term, and
that stops being true the moment they are lit. So the description is cut
back to what is always so, and each condition gets its sentence.

```chord
create the candles
  aka prickets
  a thing, scenery, plural, light-source, starts unlit
  in the Refectory

  Stubs of tallow in iron prickets down the middle of each table.

  phrase detail while the candles is not lit:
    Nobody has put a flame to them since the last supper of the last
    term.

  phrase detail while the candles is lit:
    They are all alight, every one, and the flames stand very straight.
```

```text
> examine candles
Stubs of tallow in iron prickets down the middle of each table. Nobody has put a flame to them since the last supper of the last term.

The bell tolls again, and the rooks go up off the roof.

> light candles
You light the candles.

The flame runs down the length of the table, and every cold wick takes it. In the candlelight there is a leaf of paper under the middle pricket that the daylight did not show.

The bell tolls. You have stopped counting.

You have risen to the rank of a Second-Year.

> examine candles
Stubs of tallow in iron prickets down the middle of each table. They are all alight, every one, and the flames stand very straight.

The tower bell tolls.
```

Look at the condition: `the candles is lit`. The candles are plural, and
English wants "are". Chord does not. A condition's verb is always `is`,
whatever the thing.

```text
relighting.story:402:35 error [parse.predicate] Unknown predicate `are` — expected is, is a, is in, has, holds, wears, feels, knows, or can see/reach.
```

The lens takes the same treatment. Its crack moves out of the description
and into a detail phrase, and a second phrase stands ready for the day it is
mended.

```chord
create the lens
  a thing
  in the crate
  states: cracked, sound

  A disc of glass as wide as a cartwheel, ground in rings.

  phrase detail while the lens is cracked:
    A crack runs across it from edge to edge.

  phrase detail while the lens is sound:
    There is no flaw in it anywhere, and you looked.
```

## Detail or a clause?

You now have two ways to make an examination depend on state, and they are
not rivals.

Use `detail` when the thing has a description and the state adds a sentence
to it. The result reads as one paragraph, and the condition can be anything,
including a platform state such as `lit`.

Use an `after the player examining` clause with `select on` when the thing
moves through several declared states and each has its own text, as the
cistern does, or when examining should do something as well as say
something. The grille's three memories are a clause, because they count.

When you find yourself writing three or four `detail` phrases whose
conditions are the states of one list, that is a `select on`.

## Present: how a thing is announced

When the player enters a room or looks around, the story lists what is
there: "You can see a kettle, a hand lamp, and Hobb here." For most things
that is enough. For a person, or for anything the eye would go to first, it
is flat.

A `phrase present` line gives a thing its own sentence in the room.

```chord
create Hobb
  a person, proper
  in the Lodge

  The porter of Lanternhall, who was old when you were a student and has
  not troubled to change since.

  phrase present:
    Hobb is in the doorway with his back to you, watching the court as
    if it might be up to something.
```

```text
The Porter's Lodge
The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame, and an oak press hangs on the wall beside it. The door to the court is north. Hobb is in the doorway with his back to you, watching the court as if it might be up to something.

You can see a kettle, a hand lamp, and Hobb here.

On the chair you see a seed cake and a cup.
```

The sentence follows the room's description wherever Hobb is. If a later
chapter walks him to the Cloister, the sentence goes with him, and the
Lodge's description has nothing to take back. That is why the Lodge was
never written to mention him.

A `present` phrase may carry a `while`, and then the thing announces itself
only while the condition holds. A thing has one `present` phrase. Where
`detail` may be repeated, a second `present` is refused as a duplicate.

The thing is still named in the list beneath. The sentence is an addition to
the room and does not take the thing out of the list.

## Disappeared: a parting line

The third reserved key speaks when a thing is taken out of the story with
`remove` in front of the player.

```chord
create the cat
  a thing
  in the Yard

  A cat.

  phrase disappeared:
    The cat is gone, and has left a look behind it.
```

The line is printed on the turn the `remove` runs. It saves you from
writing a `phrase` statement beside every `remove`, and it keeps the cat's
exit with the cat.

Two more keys, `entered` and `exited`, are reserved for a thing that comes
into the player's room or leaves it. They are for things and people that
move about, and this book takes them up in chapter 26 with the people who
do the moving.

## The general rule: a thing may answer for itself

The reserved keys are particular cases of something broader. A `phrase` line
in a thing's block is that thing's own version of a piece of text.

You will see the broader use in chapter 24. A trait there declares a phrase
that every thing with the trait prints when it is mended. One thing with the
trait wants a sentence of its own, and it gets one by writing a `phrase`
line with the same key in its block. The trait says what happens. The thing
says how it reads.

That division is the one this book keeps returning to. What happens is a
clause, and it lives with whatever causes it. How it reads is a phrase, and
it lives with whatever it describes.

## Build and try it

Add the `detail` phrases to the hand lamp, the candles and the lens, and cut
the candles' and the lens's descriptions back to what is always true. Add
the `present` phrase to Hobb. No new entries go in the `define phrases`
block. The complete file is in the companion folder `chapter-21`.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Take the lit lamp down to the Undercroft and open the crate.

```text
> examine lens
A disc of glass as wide as a cartwheel, ground in rings. A crack runs across it from edge to edge.
```

::: under-the-hood
**Under the Hood: owner and key** · Story IR `phrases`

In the phrase table of the compiled IR, a thing's own phrases are stored
under the thing's id, a dot and the key: `hobb.present`, `hand-lamp.detail`,
and `candles.detail` with `candles.detail.2` for the second. The dot is why
a key of your own may never contain one. The conditions are kept beside
them, and the platform asks each one when it builds a description or lists a
room.
:::

::: from-another-system
**From another system: listing and describing**

Inform 10 handles the same needs with an "initial appearance" for a thing
not yet handled, and with "writing a paragraph about" rules. TADS 3 gives
objects `specialDesc` for a sentence in the room description and
`initSpecialDesc` for the first sighting. Chord's `present` is close to
`specialDesc`, with the difference that it is a phrase with an optional
condition and no code, and `detail` has no direct equal in either system:
both would do it with a conditional inside the description text.
:::

## What you have so far

Things in Lanternhall now describe the condition they are in, and the porter
is a presence in his lodge and not an item in a list. Everything the story
itself says is in your words. What remains is everything the platform says:
"Taken", "Time passes", and a line about a grue that has no business in this
country.

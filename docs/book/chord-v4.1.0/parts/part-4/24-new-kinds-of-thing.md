# New kinds of thing

The last chapter ended with four verbs and nothing to use them on. The
kindling action knows who may kindle. It does not know what a flame does to
a lamp, and it has been forbidden to find out.

That knowledge goes in a **trait**. You have used traits since chapter 6
without defining one: `openable`, `wearable` and `light-source` are trait
words, and each makes a thing answer some standard action. A trait of your
own makes a thing answer an action of your own. This chapter defines five of
them, and at the end of it The Relighting can be won.

## A trait that answers a verb

Three things in Lanternhall take a flame: the hand lamp, the refectory
candles and the Great Lantern. What happens when one of them is kindled is
the same in each case, so it is written once.

```chord
define trait wick
  on the player kindling
    refuse when it is lit: already-burning
    change it to lit
    phrase kindled
  end on
end trait
```

A trait is a block that opens with `define trait` and a name and closes with
`end trait`. Inside it is a clause, of exactly the kind you have been
writing in `create` blocks since chapter 14. The difference is the word
`it`.

A clause in a thing's block names the thing, because the block has one
owner. A trait has many, or will have. So inside a trait, `it` means
whichever thing has the trait and is being acted on. This is the one place
in Chord where `it` is allowed, as chapter 15 promised.

A thing takes the trait by adding its name to the kind line.

```chord
create the hand lamp
  a thing, light-source, starts unlit, wick
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.

  phrase detail while the hand lamp is lit:
    It is burning with a small flame, and the flame is blue.
```

Your trait word sits beside the platform's, and reads the same way. The
lamp's own `on the player lighting` clause, with its requirement about the
page, is gone. The kindling action carries that requirement now.

```text
> kindle lamp
You say the word. A flame stands up on the wick, blue at first, as if it had been waiting there with its coat on.

Somewhere above you, old timber takes a weight it had forgotten.

> kindle lamp
It is burning already, and the word slides off it.

A slow draught moves through the Hall, one way and then the other.
```

Follow the command through, because this is the centre of the language. The
player types `kindle lamp`. The kindling action checks its own lines: the
lamp is reachable and the page has been learned. It then asks the lamp for
an answer. The lamp has the `wick` trait, and the trait has a clause for
kindling, so that clause runs with `it` meaning the lamp. Had the player
named the grimoire, there would be no such clause, and the action's
`otherwise refuse` line would speak.

The action never learned what a lamp is. The lamp never learned what the
player must know. Each holds its own half.

The line `change it to lit` deserves a second look. `lit` is not a state you
declared. It belongs to `light-source`, and chapter 13 said that such states
are read and changed like your own. Here is where that matters. A working
that could only set states of your own invention could never light a real
lamp, and the Undercroft would stay dark.

## One trait, several things

The candles and the Great Lantern take the same word.

```chord
create the candles
  aka prickets
  a thing, scenery, plural, light-source, starts unlit, wick
  in the Refectory
  score supper-lit worth 5

  Stubs of tallow in iron prickets down the middle of each table.

  after the player kindling
    move the unbind page here
    award supper-lit
    phrase candles-catch
  end after
```

The candles' `after` clause used to say `lighting`. It now says `kindling`,
and it is still in the candles' own block. This is the half of the rule that
the last chapter's error message spelled out. A thing may not answer one of
your actions with an `on` clause of its own, and it may react to one with an
`after` clause. The trait says what kindling does to any wick. The candles
say what follows when these particular wicks catch.

```text
> kindle candles
You say the word. A flame stands up on the wick, blue at first, as if it had been waiting there with its coat on.

The flame runs down the length of the table, and every cold wick takes it. In the candlelight there is a leaf of paper under the middle pricket that the daylight did not show.

The tower bell tolls.

You have risen to the rank of a Second-Year.
```

## A trait may answer standard actions too

There is a hole in this. `light lamp` is a standard command, the lamp is a
`light-source`, and the standard lighting action would light it without any
word at all. Until now the lamp's own clause stood in the way. The trait can
do the same for every wick at once.

```chord
define trait wick
  on the player kindling
    refuse when it is lit: already-burning
    change it to lit
    phrase kindled
  end on

  on the player lighting
    refuse light-needs-the-word
  end on
end trait
```

```text
> light lamp
You have no match, and you did not walk here for three days to use one. There is a word for this.

The tower bell strikes once, and the sound goes through the stones under your feet.
```

A trait may hold clauses for any actions, standard or your own, and several
of each kind. The next chapter closes this hole in a better way, by teaching
the story that `light` means kindle.

## A trait with one thing

The Great Lantern needs one thing more than the lamp does. It must not be
kindled without its lens. That used to be a `must` line in the Lantern's own
`on the player lighting` clause, and a thing's own `on` clause cannot answer
kindling.

So the requirement becomes a trait, even though only the Lantern will ever
have it.

```chord
define trait lens-seat
  on the player kindling
    the lens must be in the Great Lantern: lantern-empty
  end on
end trait
```

```chord
create the Great Lantern
  aka lantern
  a container, scenery, light-source, starts unlit, lens-seat, wick
  in the Lantern Gallery
  holds 1
  score relit worth 15

  A drum of brass and glass the height of a door, with a seat inside it
  for a lens and a wick as thick as your arm. Nothing has burned in it
  for thirty years.

  after the player kindling
    lose lens-shatters when not lantern-ready
    change the story to awake when lantern-ready
    award relit when lantern-ready
    win lantern-lit when lantern-ready
  end after
```

A trait with a single carrier is ordinary in Chord and nothing to be tidied
away. It is how a thing answers one of your verbs in a way no other thing
does.

The Lantern has two traits that answer kindling, and both of them answer.
Their clauses are taken in the order the trait words stand on the kind line,
in two passes. First every clause's refusals and requirements are settled.
Only when none of them refuses does any clause's body run. So an empty
Lantern is refused before any flame is lit, and that is true whichever trait
is written first.

What the order decides is what the player reads. If two traits would both
refuse, the refusal of the one written first is the one that is spoken. When
the command goes through, the bodies run in the same order, and so do their
phrases.

```text
> kindle lantern
There is a wick, and there is a seat for a lens with no lens in it. A flame here would light the roof and nothing else.
```

## A trait with states and a score

A trait can own states. The lens has been `cracked` or `sound` since chapter
13. That pair is really a fact about anything that can be mended, so it
moves into the trait.

```chord
define trait mendable
  states: cracked, sound
  score made-whole worth 5
  phrases en-US
    mended:
      You say the word and mean it. What was broken is whole, and has
      no memory of having been otherwise.

  on the player mending
    refuse when it is sound: already-whole
    change it to sound
    award made-whole
    phrase mended
  end on
end trait
```

Each thing with the trait gets its own copy of the states. Inside the trait
they are read as `it is sound`. Outside, they are read by the thing's name,
as before: `the lens is sound`. The `lantern-ready` condition and the lens's
`detail` phrases did not have to change.

The lens loses its own `states` line and gains a word.

```chord
create the lens
  a thing, mendable
  in the crate
```

The trait also holds a `score` line, and a `phrases` block. The block
declares a phrase that belongs to the trait, in the list form of `define
phrases`, indented inside the trait. It keeps the trait's words beside the
trait's clause.

## A thing's own words, again

A second thing in Lanternhall has been broken since chapter 6. Hobb's
spectacles have one arm held on with thread.

```chord
create the spectacles
  aka glasses
  a thing, plural, concealed, wearable, mendable
  in the Lodge

  Wire spectacles. Hobb has been looking for them since the spring.

  phrase detail while the spectacles is cracked:
    One arm has come away, and is held on with a turn of thread.

  phrase detail while the spectacles is sound:
    Both arms are sound.
```

One word on the kind line, and the mend working mends them.

The replies in this section were recorded with the bell already hushed,
which the next section does. Mend anything while it is still tolling and
the reply ends with the bell.

```text
> mend spectacles
You say the word and mean it. What was broken is whole, and has no memory of having been otherwise.
```

That is the trait's own phrase. It serves for spectacles, and it is too
plain for the lens, which is the mend the whole game has been leading up to.
Chapter 21 said that a `phrase` line in a thing's block is that thing's own
version of a piece of text. Here is the general use it promised.

```chord
create the lens
  a thing, mendable
  in the crate

  A disc of glass as wide as a cartwheel, ground in rings.

  phrase mended:
    You say the word and mean it. The crack closes from both edges at
    once, like a mouth deciding not to speak.
```

The trait's clause says `phrase mended`. For the spectacles that is the
trait's text. For the lens it is the lens's.

```text
> mend lens
You say the word and mean it. The crack closes from both edges at once, like a mouth deciding not to speak.

> examine lens
A disc of glass as wide as a cartwheel, ground in rings. There is no flaw in it anywhere, and you looked.
```

The score was declared once, in the trait, and it is paid once. Mending the
spectacles earns the five points, and mending the lens afterwards earns
nothing more. If each mend should score, give each thing a `score` line of
its own and award it in an `after the player mending` clause.

## The bell and the grille

Two traits remain, each with one carrier.

```chord
define trait hushable
  score quieted worth 5

  on the player hushing
    it must be tolling: already-quiet
    change it to silent
    award quieted
    phrase bell-hushed
  end on
end trait

define trait ward
  score unsealed worth 5

  on the player unbinding
    refuse when the tower bell is unrung: ward-asleep
    refuse when the tower bell is tolling: ward-in-the-bell
    change it to lifted
    move it offstage
    award unsealed
    phrase ward-lifts
  end on
end trait
```

The tower bell becomes `a thing, scenery, hushable` and the iron grille `a
thing, scenery, ward`. Neither trait declares states. They use `tolling`,
`silent` and `lifted`, which the bell and the grille declare themselves, and
the compiler checks that every thing with the trait has the states the trait
changes.

The `ward` trait is where the puzzle is. The grille cannot be unbound before
the bell has rung, because the ward is asleep, and it cannot be unbound
while the bell is tolling, because the ward is in the bell. So the bell must
be hushed first, and hushing needs the third page.

```text
> unbind grille
The word goes into the iron and comes back out on the next stroke of the bell. Whatever holds the grille is being rung into it.

The bell tolls. You have stopped counting.

> hush bell
You say the word up into the dark of the tower. The bell swings twice more without a sound, and hangs still.

> unbind grille
You say the word. The grille is not there, in the manner of a thing that was never there, and the stair goes up.

You have risen to the rank of a Journeyman.
```

The bell has stopped at last. Every turn since chapter 19 has ended with it.
The line about rank comes on whichever of these awards takes the score to
thirty. Here that was the grille, because the lamp, the candles and the
other pages had been seen to first and nothing had been mended yet. In
another order it follows the bell, or a mend.

The grille is moved offstage, the Bell Stair's `{grille-across}` marker
falls silent because its condition is no longer true, and the way up is no
longer blocked. Three lines written in three different chapters agree,
because all three read one state.

## Data on a trait

A trait may give each of its things a value of its own, called a **field**.
The Relighting has no need of one, so here is a brazier from another story.

```chord
define trait burner
  data
    fuel: one of tallow, oil
    keeper: optional entity

  on the player stoking
    phrase fuel-tallow when its fuel is tallow
    phrase fuel-oil when its fuel is oil
  end on
end trait
```

The `data` block lists the fields. Each is a name, a colon and a type.

| Type | Holds |
| --- | --- |
| `one of` and a list | one word from the list |
| `number` | a whole number |
| `entity` | a thing, a person or a room |
| `name` | a word of your choosing |

A thing sets its fields on the kind line, after the trait word, with `with`
and then `and` between one field and the next.

```chord
create the cresset
  a thing, burner with fuel oil
  in the Yard

create the brazier
  a thing, burner with fuel oil and keeper the stub
  in the Yard
```

Inside the trait a field is read as `its fuel`, and from outside as `the
brazier's keeper`. A field is changed with `set`, as in `set its brightness
to 3`.

Set every field on every thing that has the trait, unless the field is
marked `optional` and the trait never reads it without checking. A field
that was never set has no value to read.

Reach for a field when things with the trait differ by a value. Reach for a
state when they differ by a condition that changes during play.

## Is it a wick?

A trait name can be used in a condition, after `is a`.

```chord
define condition cold-wick: it is a wick and it is not lit
```

`the hand lamp is a wick` is true, and `the kettle is a wick` is false. With
an open condition such as `cold-wick`, the `any`, `no` and `each` of chapter
16 can now talk about every thing of a sort you defined.

Because a trait name is used this way, it cannot be a word the language
already has. You may not call a trait `container` or `openable`.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-24` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print in full. To make the changes by hand
instead, work from this list and take the rest from that file.

Add the five traits above the actions. Give `wick` to the lamp, the candles
and the Lantern, with `lens-seat` before it on the Lantern. Give `mendable`
to the lens and the spectacles, `hushable` to the bell and `ward` to the
grille. Remove the three `on the player lighting` clauses from the lamp, the
candles and the Lantern, and change the candles' and the Lantern's `after`
clauses to `kindling`. Remove the lens's `states` line. Lengthen the rank
ladder to its final form: Journeyman at 30, Lamplighter at 50. There are
nine new phrases.

```shell
sharpee compose relighting.story --check
sharpee play .
```

The game can be played to its end for the first time. Read the first page.
Kindle the lamp and the candles. Find the three other pages and read them.
Hush the bell, unbind the grille, mend the lens, carry it to the roof and
seat it.

```text
> kindle lantern
You say the word. A flame stands up on the wick, blue at first, as if it had been waiting there with its coat on.

The lens gathers the flame and sends it out over the valley in one white bar. Down in the Hall, every blank page begins to fill.

You have risen to the rank of a Lamplighter.

[The story has ended. RESTART, RESTORE or UNDO]
```

Then play it again and leave the lens cracked.

::: under-the-hood
**Under the Hood: capability** · Story IR `traits`

Find `wick` under `traits` in the compiled IR and look at its kindling
clause. One of its fields reads `"routing": "capability"`. That is the
platform's name for what this chapter has been doing. A trait declares that
it is capable of answering an action, and the action asks every trait of the
thing that answers it, in the order they are written. The standard traits answer the standard
actions through the same door. Your
`wick` and the platform's `openable` are the same kind of object, which is
why they sit side by side on a kind line.
:::

::: from-another-system
**From another system: kinds and classes**

In Inform 10 you would say "A wick is a kind of thing" and write rules for
kindling a wick. In TADS 3 you would define a `Wick` class and give it a
`dobjFor(Kindle)` block, and an object could list several classes. Chord's
trait is nearer to the TADS class used as a mix-in. A thing has exactly one
kind, such as `a thing` or `a container`, and any number of traits. Traits
do not inherit from one another. What several traits share, they share by
being composed on the same thing.
:::

## What you have so far

The four workings work. A thing answers a working by having a trait, and
each trait says in one place what the working does. The story can be won and
lost, and the bell can be stopped.

A player who types `light lamp` is still told off for it, though, and one
who types `fix lens` or `sit on chair` is not understood at all. The last
chapter of Part IV makes the story's grammar as forgiving as its prose.

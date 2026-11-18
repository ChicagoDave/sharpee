::: {.part-page}

# Part IV. Words {.part .unnumbered}

:::

# Phrases

Every sentence a player reads in a Chord story is a **phrase**: a piece of
text with a key. You have been writing them since chapter 12, in the one
form that chapter needed, a key and its text in the `define phrases` block.

A phrase can be more than that. It can have several versions and a rule for
choosing between them. It can keep its line breaks. It can leave a gap to be
filled when it is printed, and it can be dropped into a room's description
and appear there only when it is true. This chapter covers all four.

## Two ways to declare a phrase

The block you know is a list.

```chord
define phrases en-US
  stair-sealed:
    The grille stands across the stair, and there is no way round it.
  over-the-parapet:
    You step up onto the parapet to see the court. The court comes up to
    meet you.
```

Each entry is one key and one paragraph. A story has one such block for each
language it is written in, and `en-US` names the language. Most of your
phrases will live here for the whole life of the story.

The second way declares one phrase in a block of its own.

```chord
define phrase gate-motto
  The craft needs a light to come home to.
end phrase
```

It opens with `define phrase` and the key, and closes with `end phrase`. For
a plain phrase the two ways are equal. The block form exists because its
head line has room for more.

A key belongs to one phrase. Declaring the same key twice, in either form
or one of each, is an error.

## Variants and strategies

Three things in The Relighting refuse with the same key, `no-such-word`: the
lamp, the candles and the Lantern. A player without the first working will
read that sentence several times. Give it three versions.

```chord
define phrase no-such-word, cycling
  You reach for the word and find only the place where it was.
or
  The shape of it is there, as a name is on the tip of the tongue. The
  word is not.
or
  Nothing comes. You would need to read it first.
end phrase
```

The versions are **variants**, separated by a line that says `or`. The word
after the comma on the head line is the strategy, and the five strategies
are the ones chapter 17 listed for `select`: `cycling`, `stopping`,
`randomly`, `sticky` and `first-time`.

```text
> light lamp
You reach for the word and find only the place where it was.

> light lamp
The shape of it is there, as a name is on the tip of the tongue. The word is not.

> light lamp
Nothing comes. You would need to read it first.
```

No clause had to change. The three things still say `no-such-word`, and the
phrase has become richer underneath them. Notice also that the cycle is
shared. If the player tries the lamp, then the candles, then the lamp again,
they get the first, second and third variants, because it is one phrase
keeping one place.

This is the short way promised in chapter 17. When all you want is to vary
some text, put the variants in the phrase. Keep `select` with a strategy for
alternatives that do different things.

Remove the entry for `no-such-word` from the `define phrases` block when you
add this one, or the key is declared twice.

## The sayings of Hobb

The people of this country have a word they say about sunlight. They say it
on opening the shutters and on parting, and they say it of anyone who is all
cleverness and no warmth. The word is *gnusto*. Hobb says it the way other
people clear their throats.

```chord
define phrase hobb-saying, cycling
  "Gnusto on the sill," says Hobb, without turning round. It is what
  people here say for good morning.
or
  "Gnusto keeps what the dark forgets," Hobb remarks, to the kettle.
or
  "All lamp and no gnusto, some people," says Hobb. He does not say
  which people.
end phrase
```

He says one each time Ansel comes into the Lodge, unless the bell is
tolling, in which case nobody can hear him.

```chord
create the Lodge, a room
  in the Grounds
  north to the Gate Court

  room name:
    The Porter's Lodge

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame, and
  an oak press hangs on the wall beside it. The door to the court is
  north.

  after the player entering
    phrase hobb-saying when the tower bell is not tolling
    phrase hobb-deafened when the tower bell is tolling
  end after
```

```text
> south
The Porter's Lodge
The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame, and an oak press hangs on the wall beside it. The door to the court is north.

You can see a kettle and Hobb here.

On the chair you see a seed cake and a cup.

"Gnusto keeps what the dark forgets," Hobb remarks, to the kettle.
```

## Text that keeps its shape

Chord treats the text of a phrase as a paragraph. It joins your lines into
one and lets the player's screen wrap them. That is right for prose and
wrong for anything whose line breaks matter, such as an inscription.

The letters cut over the gate of Lanternhall are in three lines, centred.

```chord
define phrase gate-motto, verbatim
        THE CRAFT
     NEEDS A LIGHT
    TO COME HOME TO
end phrase
```

`verbatim` takes the place of a strategy. A verbatim phrase is printed line
for line, and the indentation of each line relative to the others is kept.
It has one variant and takes no `or`.

```chord
create the gate
  aka gates, arch, letters, motto
  a thing, scenery
  in the Lodge and the Gate Court

  The great gate of Lanternhall, shut for thirty years and opened this
  morning by one leaf. There is a line of cut letters over the arch.

  after the player examining
    phrase gate-motto
  end after
```

```text
> examine gate
The great gate of Lanternhall, shut for thirty years and opened this morning by one leaf. There is a line of cut letters over the arch.

    THE CRAFT
 NEEDS A LIGHT
TO COME HOME TO
```

The line that sits furthest left in the file sits at the margin on the
screen, and the others keep their distance from it.

## Markers

A **marker** is a pair of braces in the text of a phrase, with something
inside that is filled in when the phrase is printed.

The simplest marker is `{br}`, which is a line break inside an ordinary
paragraph.

The most useful markers take a value handed over by the clause. The `phrase`
statement can pass one, with the word `with`, a name for it, an equals sign
and the value.

```chord
create the tower bell
  aka bell
  a thing, scenery
  in the Bell Stair
  states: unrung, tolling, silent

  You cannot see the bell from here, only the dark it hangs in.

  after the player examining
    phrase bell-count with count = tolls when the tower bell is tolling
  end after
```

```chord
define phrases en-US
  bell-count:
    By your count that makes {verbatim:count}, and it is not tired.
```

The statement passes the counter `tolls` under the name `count`, and the
marker `{verbatim:count}` prints it as it stands.

```text
> examine bell
You cannot see the bell from here, only the dark it hangs in.

By your count that makes 3, and it is not tired.

The tower bell tolls.
```

When the value is a thing, the marker can ask for its name in the form the
sentence needs.

| Marker | Prints |
| --- | --- |
| `{the thing}` | the lamp |
| `{a thing}` | a lamp |
| `{capitalize the thing}` | The lamp |
| `{verbatim:count}` | a number or a piece of text, unchanged |

Here `thing` and `count` are the names given after `with`. The statement
that goes with the first three would be `phrase named with thing = the hand
lamp`.

Markers of this kind matter most in a phrase that several things share, and
you will use them in earnest in chapter 23, where one refusal has to name
whichever thing the player typed.

One caution. A marker with a plain lower-case word and nothing else, such as
`{count}`, is not read as a value. It is read as the key of another phrase,
which is the subject of the next section, and the compiler will tell you
that no such phrase exists.

## A phrase inside a description

A room's description is fixed text, and by chapter 19 that had become a
problem. The Bell Stair's description says that an iron grille stands across
the third step. One day the grille will be gone, and the description will go
on saying so.

A marker in a room's description may name a phrase. The phrase's text is set
into the description at that point.

```chord
create the Bell Stair, a room
  in the Hall
  up to the Lantern Gallery
  up is blocked while the iron grille is standing: stair-sealed

  The foot of the tower. A stair winds up around the well where the bell
  rope hangs. The cloister is south. {grille-across}
```

And the phrase can carry a condition on its head line.

```chord
define phrase grille-across while the iron grille is standing
  An iron grille stands across its third step.
end phrase
```

While the grille is standing, the room reads as it always did.

```text
> north
Bell Stair
The foot of the tower. A stair winds up around the well where the bell rope hangs. The cloister is south. An iron grille stands across its third step.
```

When the grille is lifted, the sentence is simply absent, and nothing in the
room's block had to know.

A phrase set into a description may have variants and a strategy as well,
and then the description changes a little each time the player looks.

Three things to know about this form.

It works in the description of a room. A marker in the description of a
thing is not filled in. For a thing, the tool is the `detail` phrase of the
next chapter.

The `while` on a phrase's head governs its appearance in a description. It
does not stop a clause from printing the phrase with a `phrase` statement.
To make a statement conditional, use the `when` suffix, as the Lodge's
clause does.

Put the marker at the end of a paragraph when you can. A marker in the
middle leaves its two spaces behind when the phrase is absent.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-20` over your own
file. It is the story with this chapter's changes made. To make the changes
by hand instead, work from this list and take the rest from that file. This
is the first chapter of Part IV, so raise `story-version` to `0.4.0`. Add
the four `define phrase` blocks near the top of the file and remove
`no-such-word` from the `define phrases` block. Add the clauses to the
Lodge, the gate and the tower bell, change the gate's description, put the
marker in the Bell Stair's description, and add the two new entries
`bell-count` and `hobb-deafened`.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Walk in and out of the Lodge three times to hear all of Hobb's sayings. Then
read the page, wait for the bell, and go back.

```text
> south
The Porter's Lodge
The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame, and an oak press hangs on the wall beside it. The door to the court is north.

You can see a kettle and Hobb here.

On the chair you see a seed cake and a cup.

Hobb has his hands over his ears. He says something, and the bell says something louder.

The tower bell tolls.
```

::: under-the-hood
**Under the Hood: one table of phrases** · Story IR `phrases`

Both ways of declaring a phrase end up in one table in the compiled IR,
keyed by language and then by phrase key. Each entry has a `strategy`, which
is empty for a plain phrase, and a list of `variants`, each with its text
and the markers found in it. Descriptions are in the same table under keys
the compiler makes up, such as `spark-page.description`, which is why a
description and a phrase can be treated so alike.
:::

::: from-another-system
**From another system: text substitutions**

Inform 10 puts substitutions in square brackets inside the text, and "[the
noun]" and "[The noun]" do what `{the thing}` and `{capitalize the thing}`
do here. TADS 3 uses "{the dobj/him}" style parameters in message strings,
and `<<expression>>` to embed a value. The idea is common to all three.
Chord differs in keeping its text out of the code entirely: a clause names a
key, and the words are somewhere else, where a writer or a translator can
work on them without reading a single clause.
:::

## What you have so far

Phrases can vary, keep their shape, take values and appear in a room's
description only while they are true. All of that is about text the story
prints when something happens. The next chapter is about the words a thing
carries around with it.

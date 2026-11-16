# Ways that are closed, hidden or strange

An exit, so far, is either there or not there, and the only thing that has
ever stood in one is a door. This chapter adds four more possibilities. A way
can refuse the player with words of your choosing. It can kill them. It can
exist only some of the time. And it can be a way that no compass direction
describes, taken by typing a command of its own.

## A way that refuses

The stair to the roof of Lanternhall has been sealed for thirty years by an
iron grille that nobody built. The exit is there, and the player may not use
it.

```chord
create the Bell Stair, a room
  in the Hall
  up to the Lantern Gallery
  up is blocked: stair-sealed

  The foot of the tower. A stair winds up around the well where the bell
  rope hangs, and an iron grille stands across its third step. The
  cloister is south.
```

The new line reads as English does: `up is blocked`, a colon, and a name. The
name, `stair-sealed`, is a **phrase key**. It stands for a piece of text that
is written elsewhere in the file, in a block near the end.

```chord
define phrases en-US
  stair-sealed:
    The grille stands across the stair, and there is no way round it.
```

This is the first phrase in The Relighting, and phrases have a whole chapter
to themselves, which is chapter 20. What you need now is small. A
`define phrases` block is a list of keys, each followed by a colon and then
its text on the lines beneath, indented one level further. The words `en-US`
say which language the text is in. A key is lower-case words joined by
hyphens, and you make it up.

When the player tries the stair, the phrase is what they read.

```text
> up
The grille stands across the stair, and there is no way round it.
```

You cannot write the text on the `blocked` line itself. What follows the colon
is always a key. If the key has no phrase, the compiler says which one is
missing:

```text
relighting.story:102:3 error [analysis.missing-phrase] Phrase `stair-sealed` is not declared in en-US.
```

A blocked way wants something in the room to account for it, so the grille is
a thing as well.

```chord
create the iron grille
  aka grille
  a thing, scenery
  in the Bell Stair

  Wrought iron, floor to vault, with no lock, no latch and no hinges.
  It was not built. It was put there.
```

The grille and the blocked line have nothing to do with each other as far as
the story is concerned. The line stops the player, and the thing gives them
something to look at. Keeping them in step is your job.

As it stands the stair is blocked for good, which makes the Lantern Gallery
unreachable. A blocked line may carry a condition, written `up is blocked
while` and then the condition before the colon, and then the way is blocked
only while the condition holds. Lifting the grille is the business of chapter
24. Conditions are chapter 16.

## A way that kills

On the roof, a low parapet runs along the east side of the Gallery. There is
no room to the east. There is a drop.

```chord
create the Lantern Gallery, a room
  in the Hall
  east is deadly: over-the-parapet
```

```chord
define phrases en-US
  over-the-parapet:
    You step up onto the parapet to see the court. The court comes up to
    meet you.
```

A deadly way needs no exit line, because it leads nowhere. When the player
takes it, the phrase is printed and the story ends.

```text
> east
You step up onto the parapet to see the court. The court comes up to meet you.

[The story has ended. RESTART, RESTORE or UNDO]
```

Be sparing with this, and be fair. The Gallery's description now says, "To
the east a low parapet is all there is between you and the court." A player
who has read that and walks east has been warned. A deadly way that the prose
did not signal is a trap, and players forgive very little less.

Because the stair is sealed, you cannot reach the parapet in the story as it
stands. To see it work, take out the `up is blocked` line for a moment, walk
up and step off, and then put the line back.

## A way that is sometimes there

A blocked way is one the player can see and cannot take. A hidden way is not
there at all until something makes it so. An exit line may end with `while`
and a condition, and the exit then exists only while the condition is true.

```chord
create the Study, a room
  north to the Vault while the bookcase is open
```

Until the bookcase is open, going north from the Study gets the same answer as
any direction with no exit. Nothing tells the player that a way exists. When
the bookcase opens, the exit is simply there.

The difference between the two is what the player knows. Use `blocked` when
they should see the obstacle and wonder how to get past it. Use a `while` exit
when discovering that the way exists is itself the puzzle.

The Relighting has no hidden exit of this kind. It has something stranger.

## A way with its own command

Behind the Refectory's hearth, the iron plate does not sit square, and there
is a gap a thin person could get through. It leads down into the Undercroft.
It is not north or east or down. It is behind the hearth, and the player gets
through it by saying so.

```chord
create the Refectory, a room
  in the Hall

  Three long tables, each with its row of candles, and a hearth you
  could stable a horse in. The benches are stacked against the wall,
  where someone left them for the holidays. The cloister is back to the
  west.

  passage to the Undercroft
    grammar
      squeeze or crawl behind [the] hearth
  end passage
```

A **passage** is an exit that is taken with a command instead of a direction.
The block opens with `passage to` and the room it leads to, and it closes with
`end passage`. Inside it, the word `grammar` stands on a line by itself, and
the lines beneath that are the commands, indented one level further.

The command line is a pattern, and it has two small devices in it.

- `squeeze or crawl` means that either word will do.
- `[the]` means that the word in brackets may be typed or left out.

So this one line accepts `squeeze behind hearth`, `crawl behind hearth`,
`squeeze behind the hearth` and `crawl behind the hearth`. Chapter 23 uses the
same notation at length, for verbs of your own.

```text
> examine hearth
The back of the hearth is a single iron plate, and it does not sit quite square. There is a hand's breadth of darkness down one side.

> squeeze behind hearth
It is pitch dark. You are likely to be eaten by a grue.
```

The Undercroft is dark, and Ansel has arrived in it without the lamp. That is
the passage working as intended, and with a lit lamp in hand the same command
shows the room.

Three properties of a passage are worth knowing.

A passage is one-way. The gap behind the hearth goes from the Refectory to the
Undercroft, and there is no climbing back through it. If you want a way back,
write a second passage in the other room.

Its commands are understood only in its own room. Type `squeeze behind
hearth` in the Undercroft, where there is no such passage, and the story does
not know the words:

```text
> squeeze behind hearth
I don't understand that.
```

And nothing announces it. The player has to find the passage by reading.
Here the hearth's description does the work: "a hand's breadth of darkness
down one side" is an invitation, and `squeeze` is the verb it invites.

A passage may also be blocked or deadly, with a line inside the block:
`blocked: stair-sealed`, or `deadly: over-the-parapet`, each naming a phrase
key as before.

## Build and try it

Add the two lines to the Bell Stair and the Lantern Gallery, the passage to
the Refectory, the grille, and the `define phrases` block. Put the phrases
after the last `create` block and before the start block. Raise nothing in the
header: this is still version `0.2.0`, and it is the end of Part II. The
complete file is in the companion folder `chapter-12`.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Fetch the lamp and light it, then go through the hearth.

```text
> squeeze behind hearth
Undercroft
Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

You can see a crate here.
```

::: under-the-hood
**Under the Hood: reasons to refuse** · `if.action.going`

All four of these are the same standard action, `going`, being given
something to consult. A `blocked` line is a refusal with a message attached. A
`deadly` line is a refusal that also ends the story. An exit with a `while`
condition is an exit the action cannot find until the condition holds. A
passage adds a command to the story's grammar that leads to `going`, but only
in the room that has the passage. In every case you have described the way,
and the one action that moves the player has decided what to do about it.
:::

::: from-another-system
**From another system: unusual exits**

In Inform 10 you would write a rule that stops the going action and prints a
reason, and you would write a new action, with its own grammar line, for
squeezing behind the hearth. In TADS 3 the direction property of a room can
hold a message or a special connector object in place of a destination. Chord
treats each of these as a fact about the way and gives each its own line. The
gain is that the map remains readable as a map: every way out of a room, open
or closed or strange, is in that room's block. The cost is that you have these
forms and no others, until Part III gives you clauses that can refuse anything
at all.
:::

## What you have so far

That is the world. Lanternhall has eleven rooms in two regions, a locked
door, a dark cellar, a sealed stair, a hidden way and a deadly one. It has a
porter, a coat, a cake, a cup, a lamp, a lens in a crate and a book with one
word in its margin. A player can walk it, pick it up, open it, wear it and
unlock it.

What a player cannot do is change it. Nothing in Lanternhall yet reacts to
anything. The rope rings no bell, the lens seats in the Lantern to no effect,
and the lamp lights for anyone who asks. Part III is about making things
happen.

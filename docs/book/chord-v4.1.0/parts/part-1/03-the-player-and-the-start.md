# The player and the start

A story needs someone to be. In Chord the player is not a special object that
exists before you write anything. The player is a role, and at the start of
the story you hand that role to a person you have made. This chapter makes the
person and hands over the role.

## Making Ansel

The Relighting is played as Ansel, who was a student at Lanternhall for one
term thirty years ago and has walked back this morning. Here is Ansel in full.

```chord
create Ansel
  a person
  playable
  starts in the Lodge

  You were a student here once, for a term. You have the same hands and
  not much else.
```

The header line, `create Ansel`, makes something and names it. Chapter 5 has
much more to say about `create`, since everything in a story's world is made
with it. For now it is enough to read the three short lines beneath the
header, each of which states one fact.

**`a person`** says what kind of thing Ansel is. A person can carry things and
wear things, and is someone in the story rather than something.

**`playable`** says that Ansel may hold the player role. Only a person can be
playable. This line does not make Ansel the player. It makes Ansel a person
who is allowed to be.

**`starts in the Lodge`** says where Ansel is when the story begins. The Lodge
is the one room the story has so far.

After the blank line comes Ansel's description. The player reads it by typing
`examine me`:

```text
> examine me
You were a student here once, for a term. You have the same hands and not much else.
```

Notice that the description is written to the player, as "you". Everything the
player reads in The Relighting is in the second person and the present tense,
which is the custom in interactive fiction, and you will be writing in that
voice from here on. A description is optional. If you leave Ansel's out, the
platform supplies its stock answer, which is "As good-looking as ever."

## Handing over the role

Making a playable person is half of the job. The other half is the last block
in the file.

```chord
before the game starts
  change the player to Ansel
end before
```

This is the **start block**. It runs once, before the first turn, and its job
is to say who the player is. The line inside it, `change the player to Ansel`,
gives the role to Ansel. When the story opens, the player is standing where
Ansel starts, which is the Lodge.

The phrase `the player` deserves a moment. It does not name a person. It means
whoever holds the role at the time. Later in this book you will write lines
such as "when the player takes the lamp", and those lines will go on working
if the role moves to someone else in the middle of the story. Chapter 31 does
exactly that.

A story has exactly one start block, and the block must hand the role to
someone. It may go anywhere in the file after the header. This book puts it
last.

## What the start block is not for

The start block is not the place to greet the player. It runs before there is
a turn to carry any text, so it cannot print anything. The words the player
reads first belong in the header's `prologue:` field, which chapter 2
described. Keep the two apart in your mind: the prologue is what the player
reads at the start, and the start block is what the story arranges at the
start.

## When it goes wrong

There are four mistakes to make here, and the compiler catches three of them.

If you leave the start block out, the story has no player:

```text
relighting.story:4:1 error [analysis.start-block-missing] This story never says who the player is. Add a `before the game starts` block assigning the role: `change the player to <character>`.
```

If you hand the role to a person who is not `playable`, the compiler tells you
which line to add:

```text
relighting.story:30:3 error [analysis.player-target-not-playable] `ansel` is not `playable` — add `playable` to its create block to let the player role move to it.
```

If you write two start blocks, the compiler asks you to merge them.

The fourth mistake is leaving out `starts in the Lodge`. The compiler accepts
that story, and the mistake shows itself only when you try to play:

```text
Error loading story: Story player "Ansel" (ansel) is not placed in the world — an unplaced player character is nowhere to play.
```

So give every playable person a place to start, whatever the compiler says.

::: under-the-hood
**Under the Hood: the player role** · `sharpee compose`

In the Story IR, each thing you create is an entry in `entities`, and
`playable` is a flag on that entry:

```json
"name": "Ansel",
"article": null,
"aka": [],
"isPlayable": true,
```

The platform never begins with a player of its own. When it loads a story it
runs the start block, finds the person who now holds the role, and refuses to
start if that person has no place in the world. That refusal is the error you
have just read.
:::

::: from-another-system
**From another system: the player character**

In Inform 10 a story has a player without your asking for one, and the first
thing an author says about the player is where they are. TADS 3 has you define
the player character as an object and name it in the game's main object. Chord has no default player at all. A story with no
start block does not compile, which means the question of who the player is
always has an answer you wrote.
:::

## What you have so far

The whole of `relighting.story` is now explained except for the room in the
middle, and you have typed all of it. The next chapter builds it, plays it,
and breaks it on purpose.

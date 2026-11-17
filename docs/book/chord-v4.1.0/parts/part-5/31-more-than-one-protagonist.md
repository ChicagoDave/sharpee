# More than one protagonist

Every chapter so far has had one player character. Ansel is `playable`,
the start block says `change the player to Ansel`, and the word `player`
in a thousand lines of clauses has meant Ansel.

It did not have to. In Chord the player is a role, and a role can be handed
from one person to another while the story runs. This chapter gives The
Relighting a second protagonist for one scene. When the bell begins to
toll, the story leaves Ansel in the Library and goes to the Lodge, where an
old man has just opened his eyes.

## Two people who can be played

```chord
create Hobb
  a person, proper
  playable
  pronouns he
  in the Lodge
  states: dozing, roused, settled
  mood calm
```

`playable` is the line Ansel has had since chapter 3. Any number of people
may have it. It says that the role may be given to this person, and it says
nothing about when.

The start block still chooses who begins.

```chord
before the game starts
  change the player to Ansel
end before
```

A playable person who is not the player is an ordinary person. Hobb stands
in his doorway, answers questions, and shuts his press, exactly as before.

Handing the role to someone who is not `playable` is an error when you
build.

```text
probe.story:23:5 error [analysis.player-target-not-playable] `nell` is not `playable` — add `playable` to its create block to let the player role move to it.
```

## Handing the role over

The statement is the one from the start block. Written anywhere else, it
moves the role during play.

```chord
when waking expires
  change the tower bell to tolling
  change Hobb to roused
  phrase hobb-wakes
  change the player to Hobb
end when
```

The waking timer from chapter 19 expires on the turn the bell begins to
toll. That clause, in the story header, now does three more things. It
puts Hobb in a state of his own, prints a passage, and hands him the role.

```text
> light lamp with taper
You have no match, and you did not walk here for three days to use one. There is a word for this.

In the lodge, an old man who was not asleep opens his eyes.

You are Hobb, and that is the bell. It has not rung since the night you stopped it. There was a word for stopping it, and you wrote the word down, because you knew you would not keep it in your head, and you put the paper somewhere safe.

The tower bell tolls.
```

The platform does not announce the change, and it does not describe the
new room. The player's next prompt simply belongs to someone else. So the
prose at the moment of the change has work to do: it must say who the
player now is and where, and it should give them a reason to do something.
That is what `hobb-wakes` is for.

From the next command on, everything the player types is Hobb's.

```text
> look
The Porter's Lodge
The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame, and an oak press hangs on the wall beside it. The door to the court is north.

You can see a kettle here.

On the chair you see a seed cake and a cup.

The bell tolls again, and the rooks go up off the roof.

> inventory
Your hands are empty.

The bell tolls. You have stopped counting.
```

The platform has three ways of saying that an inventory is empty and picks
one each time, so yours may speak of pockets, or of carrying nothing at
all.

Each person keeps what is theirs. Hobb is in the Lodge because that is
where Hobb was. His hands are empty because Ansel has the lamp, the key
and the pages, and Ansel is in the Library with them. The score and the
story's states belong to the story, and they carry across.

## The player is whoever has the role

Open the story and search for `the player`. Every clause that says it was
written with Ansel in mind, and every one of them now applies to Hobb as
well, for as long as he has the role. The word is resolved when a clause
fires, and it means whoever the player is at that moment.

Most of the time that is exactly right. The grimoire's clauses, the
workings and the blocked stair treat any player alike. Now and then it is
wrong, and the kettle is the first case.

```chord
on the player taking while Hobb is here
  refuse kettle-is-hobbs
end on
```

Chapter 14 wrote this so that Ansel could not walk off with Hobb's kettle.
Played as Hobb, it would have Hobb refuse himself, in the third person. The
condition needs a second half.

```chord
on the player taking while Hobb is here and Hobb is not roused
  refuse kettle-is-hobbs
end on
```

```text
> take kettle
You take it.

The bell tolls again, and the rooks go up off the roof.
```

There is no condition that asks who the player is. The working form is the
one used here: give the second protagonist a state that is true while they
are being played, and test the state. Hobb is `roused` for exactly the
length of his scene, and three things in the story lean on it.

### What a room says about someone

The second case is the room. Since chapter 21 the Lodge has carried a
sentence about Hobb standing in the doorway, written as his own `phrase
present`. A player who is Hobb should not read it.

A sentence that belongs in a description only while something is true is
a gated phrase, from chapter 20.

```chord
define phrase hobb-in-doorway while Hobb is not roused
  Hobb is in the doorway with his back to you, watching the court as if
  it might be up to something.
end phrase
```

The Lodge's description ends with the marker `{hobb-in-doorway}`, and
Hobb's own block no longer has a `phrase present`. The transcript above
shows the result: the room without its porter, as its porter sees it.

The same care is owed to a playable person's description. Hobb's says he
"was old when you were a student", which is Ansel's view of him. If the
player may examine themselves as Hobb, write the description so that it
reads from either side, or write a clause for the other case.

### Keeping a scene where it belongs

A second protagonist is free to walk out of the scene you wrote for them.
Sometimes that is the point. Here it is not, and one line holds him.

```chord
create the Lodge, a room
  in the Grounds
  north to the Gate Court
  north is blocked while Hobb is roused: hobb-stays-put
```

```text
> north
Not with that going on. And not until you have found the thing.

The tower bell tolls.
```

This is the blocked exit of chapter 12, gated on the same state. Ansel
passes through that door all day.

## Handing it back

The scene ends when Hobb finds what he hid.

```chord
create the newspapers
  aka papers
  a thing, scenery, plural
  in the Lodge

  The top one is from last week. The bottom one reports the Dimming, in
  the small type newspapers use for things they do not yet believe.

  after the player examining
    move the hush page to Hobb when Hobb is roused
    phrase hobb-finds-page when Hobb is roused
    change the player to Ansel when Hobb is roused
    phrase ansel-again when Hobb is roused
    change Hobb to settled when Hobb is roused
  end after
```

Each statement has the same `when`. For Ansel, who may examine the
newspapers at any time, the clause does nothing. For Hobb in his scene it
does five things in order.

```text
> examine newspapers
The top one is from last week. The bottom one reports the Dimming, in the small type newspapers use for things they do not yet believe.

You lift the pile, which your back will mention later, and take out the bottom paper. The leaf is still folded inside it where you put it the morning after. You keep it in your hand for whoever comes asking. They will come asking. They always wanted telling twice.

You are Ansel, and wherever you are standing, the bell is louder there.

The tower bell tolls.

> look
Library
The reading room of Lanternhall, with its desks in rows and its galleries of shelves. The stacks run back to the north, out of the light. The cloister is east.

You can see a wisp here.

On the reading desk you see a grimoire.

The tower bell tolls.
```

The hush page is no longer something Hobb carries from the start. It was
in the newspapers, and the player put it in his hand. The topic row from
chapter 27 does the rest when Ansel comes asking: `Hobb gives the hush page
to Ansel when Hobb has the hush page`.

Notice the order of the last three statements. The state changes last,
because every `when` above it reads the state. Had `change Hobb to settled`
come first, nothing after it would have run.

Ansel is where the player left them, and the wisp has waited. A follower
follows the player, but it follows a person: the wisp was brought on beside
Ansel's lamp, and it stays with Ansel.

## When to do this

A second protagonist is a large effect, and it should buy something. Here
it buys three things. The player learns where the third working is without
being told. Hobb, who has been a voice in a doorway since chapter 6,
gets a minute of an inner life that no topic table could have given
him. And the bell, which until now was a nuisance on every turn, becomes
something that happened to somebody.

It costs a review of every `the player` in the story. Make that review a
habit the moment a second person is `playable`.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-31` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print in full. To make the changes by hand
instead, work from this list and take the rest from that file. Give Hobb
`playable` and his three states, and take away his `carries` line and his
`phrase present`. Add the three statements to the header's `when waking
expires`, the blocked line and the marker to the Lodge, the gated phrase, the
clause on the newspapers, and the second half of the kettle's condition.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Read the kindle page and play four more turns. The timer speaks on the
first three, and it expires on the fourth, when the bell begins to toll.
When you are Hobb, try the
door, take the kettle because you can, and then look through the
newspapers.

::: under-the-hood
**Under the Hood: a role, not a person** · Story IR `isPlayable`, `startBlock`

In the compiled IR each person has an `isPlayable` flag, and the start
block is recorded under `startBlock`. `change the player to` is one
statement kind wherever it appears. The platform reads it one way inside
the start block, as the first assignment of the role, and another way on
any later turn, as a request to move the role when the turn ends. That is
why the rest of the clause still runs for the outgoing player: the role
moves after the statements, not between them. The world keeps one flag
saying which actor holds the role, and every "you" in a standard message is
worked out from it.
:::

::: from-another-system
**From another system: changing the player**

Inform 10 has the same idea in one phrase: "now the player is Hobb"
switches the perspective, so that Hobb is the one the human player
controls. TADS 3 names the starting player character in the game's
definition, as `initialPlayerChar`.
:::

## What you have so far

That is Part V. Lanternhall has four people in it. One follows a lamp, one
walks her rounds and drives a bargain, and one keeps a door, tells what he
knows to people he trusts, and for one scene is the player. Ansel can ask,
tell, answer and consult.

The Hall itself is still a simple machine. Its Lantern lights when a lens
is in it and a word is said. Part VI is about larger mechanisms: things
with several states that drive one another, things that carry people from
place to place, and places that are not rooms at all.

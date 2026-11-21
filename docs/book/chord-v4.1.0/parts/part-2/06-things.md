# Things

The rooms of Lanternhall describe a lamp, a kettle, a chair, a gate and a
hearth, and the player can touch none of them. This chapter makes them. It
also gives Ansel something to carry and puts the first other person in the
story.

## A thing and where it is

Anything in the world that is not a room, a door, a person, a container, a
supporter or a region is `a thing`. A thing needs two facts: its kind, and its
place.

```chord
create the kettle
  a thing
  in the Lodge

  A black iron kettle, still warm.
```

The line `in the Lodge` is the thing's **placement**. It is the word `in`, an
article, and the name of a room. The paragraph after the blank line is the
thing's description, which the player reads by examining it.

That is all a thing needs in order to be seen, examined, picked up, carried
about and put down. You wrote none of those abilities. They come with being a
thing.

```text
You can see a kettle, a hand lamp, and Hobb here.

> examine lamp
A tin hand lamp with a wire handle. Its wick is dry and its glass is clean, which is Hobb all over.

> take lamp
Taken.
```

The line beginning "You can see" is the story's own. After a room's
description it lists the things in the room that the description has not
accounted for, and it chooses "a" or "an" for each one. The kettle and the hand
lamp are listed because they are loose things a player might pick up.

A description is optional here too. A thing without one answers an examination
with a stock line, which for the kettle would be "The kettle is just a
kettle."

## Things that stay put

The Lodge's description has already told the player about the chair and the
newspapers. They should not be listed a second time, and nobody should walk
off with the porter's chair. Both problems have one answer, which is the word
`scenery`.

```chord
create the chair
  a thing, scenery
  in the Lodge

  A wing chair that has taken the shape of one man.
```

`scenery` is the first of the **trait words**. A trait word is an adjective
that follows the kind, after a comma, and changes what the thing is like. This
one says two things about the chair: it is part of the room's description, so
the room does not list it, and it cannot be taken.

```text
> take chair
The chair is fixed in place.
```

Scenery is how you keep the promises a room description makes. Read each of
your descriptions as a player would, note every noun in it, and make a scenery
thing for each one that a player might reasonably examine. The Relighting now
does this for the blue flame on the sill, the chair, the newspapers, the gate,
the hearth in the Refectory and the Great Lantern on the roof.

## More than one, and things with names

Two more trait words are about grammar, the player's and the story's.

**`plural`** says that the thing's name is a plural noun. The story then
leaves out the "a" it would otherwise put in front of the name, so that a
room lists "newspapers" and not "a newspapers".

```chord
create the newspapers
  aka papers
  a thing, scenery, plural
  in the Lodge

  The top one is from last week. The bottom one reports the Dimming, in
  the small type newspapers use for things they do not yet believe.
```

**`proper`** says that the name is a proper name, one that takes no article.
It is most often needed for people.

```chord
create Hobb
  a person, proper
  in the Lodge

  The porter of Lanternhall, who was old when you were a student and has
  not troubled to change since.
```

Without `proper` the Lodge would report that you can see "a Hobb" here. With
it, he is listed as Hobb, and the story's own messages use his name
correctly:

```text
> take hobb
You can't take Hobb.
```

Hobb is a person, not a thing, and people are placed the same way things are.
He does nothing yet except stand in the Lodge and be examined. Part V is his.

## Other words for a thing

The player will not always use your name for a thing. An `aka` line lists the
other words they might use, separated by commas. It goes directly under the
header, above the kind.

```chord
create the gate
  aka gates, arch, letters, motto
  a thing, scenery
  in the Lodge and the Gate Court
```

Now `examine arch` and `examine motto` both find the gate. Give a thing an
`aka` for every noun your own prose uses about it. The Gate Court's
description speaks of "a line of cut letters", so `letters` is on the list.

Be careful with the opposite problem. When two things in the same place can
be meant by the same word, the story has to ask which one the player means,
and it does so every time. If the Lodge held both a brass key and an iron key,
then `take key` would be answered with a question. The cure is to choose names
that do not share their last word, or to make sure the two things are never in
the same place. This book called the lamp on the sill `the blue flame` for
exactly that reason: there is a hand lamp in the same room, and the word
`lamp` should mean only one of them.

## A thing in several rooms

Look again at the gate's placement.

```chord
  in the Lodge and the Gate Court
```

The gate can be seen from both rooms, so it is placed in both. A thing placed
in more than one room is called a **backdrop**. With three or more rooms the
list is written as English writes it, `in the A, the B and the C`.

A backdrop must be `scenery`. A thing the player could pick up cannot be in
two places, and the compiler explains as much if you forget:

```text
relighting.story:134:3 error [analysis.backdrop-not-scenery] `gate` is placed in several rooms — only scenery can be in more than one place (a thing the player could take cannot). Add `scenery`, or name one room.
```

Backdrops are for the sky, the river, the distant tower, and anything else
that a player in several rooms would expect to be able to look at.

## What Ansel carries

A person can begin the story holding things. A `carries` line, in the
person's own block, names one.

```chord
create the wax taper
  aka taper
  a thing

  Half a wax taper. Last week you lit it to read by, and its flame
  leaned toward your hand like a cat. You have carried it since.

create Ansel
  a person
  playable
  starts in the Lodge
  carries the wax taper
```

The taper has no placement line of its own. Ansel's `carries` line places it.
Write one `carries` line for each thing.

```text
> inventory
You are carrying:

a wax taper
```

A thing that has no placement at all, and that nobody carries, is not an
error.
It exists and is nowhere. That is useful later, for things that enter the
story part of the way through, and chapter 15 shows how to bring one on.

## Hidden things

One more trait word belongs here. A thing that is **`concealed`** is in its
room but cannot be seen, examined or taken until the player finds it by
searching.

```chord
create the spectacles
  aka glasses
  a thing, plural, concealed
  in the Lodge

  Wire spectacles with one arm mended in thread. Hobb has been looking
  for them since the spring.
```

```text
> examine spectacles
You can't see any such thing.

> search
Hidden here, you discover: spectacles.

> take glasses
Taken.
```

Once found, a concealed thing is an ordinary thing. Use this sparingly as
well. A player has no reason to type `search` unless your prose gives them
one, and thirty years of newspapers is the Lodge's hint.

The companion word is **`hiding-spot`**, which marks a thing the player can
hide behind. The Relighting has no use for one, so here is a curtain from
another story:

```chord
create the curtain
  a thing, scenery, hiding-spot
  in the Den

  A heavy curtain.
```

```text
> hide behind curtain
You slip behind the curtain.
```

## Build and try it

Copy `relighting.story` from the companion folder `chapter-06` over your own
file. It is the story with this chapter's changes made, and it holds the
things and descriptions the chapter did not print in full, the hand lamp, the
blue flame, the hearth and the Great Lantern among them. Check it and play it.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Take the hand lamp, carry it north, and put it down in the Gate Court.

```text
> drop lamp
Dropped.

> look
Gate Court
A square of worn flagstones between the gate and the cloister arch. Grass has come up through the joints and been left to get on with it. Over the gate, a line of cut letters says that the craft needs a light to come home to.

You can see a hand lamp here.
```

Then examine everything a description mentions, in every room. Where the
answer is "You can't see any such thing", you have found a promise the story
is not yet keeping. Some of those are deliberate, because the Library's desks
and the bell rope have chapters of their own coming. Others stay unkept in
The Relighting, which makes scenery only of what the game uses. Nothing in
this step needs fixing. In a story of your own, each of them is a line to
write.

::: under-the-hood
**Under the Hood: traits** · `sharpee compose`

A kind and its trait words become **traits** on the platform, which are the
units of ability it builds everything from. `scenery` is the scenery trait,
and the standard `taking` action refuses anything that has it, which is where
"fixed in place" comes from. `a person` brings the actor trait, and `taking`
refuses that as well, with a different sentence. The words you write are a
closed list. You cannot invent a trait word by typing one, and a word the
compiler does not know is reported as `analysis.trait-not-declared`. Chapter
24 shows how to declare traits of your own.
:::

::: from-another-system
**From another system: scenery and backdrops**

Both ideas will be familiar. Inform 10 has scenery as a property of a thing
and a backdrop as a kind of its own, placed in several rooms or in a region.
TADS 3 has a class for a thing that must exist in more than one place at a
time. In Chord, scenery is a trait word, and a backdrop is not a kind at
all. It is simply scenery whose placement names more than one room. The other
difference is that Chord does not let a thing be portable by declaration and
immovable by rule: `scenery` is the one switch, and it covers both the listing
and the taking.
:::

## What you have so far

The Lodge has a porter, his chair, his papers, his kettle and two lamps. Ansel
is carrying a taper. The gate can be seen from both sides, and the hearth and
the Great Lantern can be examined. Nothing yet can be opened, and nothing can
be put on or in anything else. That is the next chapter.

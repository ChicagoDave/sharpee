# Sharpee 5.3, Chord 3.6, Chord Writer 1.4

*Draft, 2026-09-04. A release rundown for the IF community.*

Three things shipped together this week: Sharpee 5.3.0 on npm, Chord 3.6.0 (the story language), and Chord Writer 1.4.0 (the Mac app you write in). The last public release was 5.1.1 and Chord 3.3.0 in mid-August. Everything below happened in the two and a half weeks between.

Most of it came from one place. I have been porting my 2009 game, The Secret Letter, to Chord, and about every third scene ran into something the language could not say. So the language grew. Here is what it can say now.

## Chord

Timers came first. A timer belongs to a character or to the player, runs through named turns, and can carry prose and chance rolls on the way.

```chord
define timer search for the wandering mercenaries
  arriving
  lingering
    Those mercenaries are getting uncomfortably close.
  meanwhile, one chance in 5
    phrase merc-idle
end timer
```

You control it, read it, and react to it in plain words.

```chord
start search
stop search
restart search
reset search
interrupt search

while search is lingering
while search has expired

when search expires
  phrase merc-spotted
end when
```

There are more places to move things to. Here means where the player is standing. Offstage means nowhere, and the thing keeps its state and can come back later. A random adjacent room is picked one open exit away at the moment the line runs. A region can declare a landing, so you can move someone to the Grounds and the story knows which room that means.

```chord
move the guards here
move the monkey offstage
move the player to a random adjacent room

create the Grounds
  a region
  containing the Market Square, Commerce Street
  landing the Market Square
```

The player is a role now, not a block. You no longer create the player. A character is marked playable, and the story says who holds the role. The same line swaps the player mid-game.

```chord
create Alex
  a person
  playable
  starts in the Market Square

before the game starts
  change the player to Alex
end before
```

Every clause names its actor, and the word it is gone from clause heads. A line reads on its own now, without holding the whole block in your head.

```chord
on the player taking
after the guard entering
```

Characters can act in a single sentence. That character performs the real action through the same path the player's commands take, and a goal plan can use the same sentences as its steps.

```chord
the guard opens the door
Teisha talks to the player

goal secure-the-key, high
  seek the player
  take the brass key
  go east
end goal
```

Chapters are an extension that declares chapters as events, and once declared they can be used anywhere a condition goes.

```chord
story
  title: The Secret Letter
  use chapters

define chapters
  market - Chapter I: Grubber's Market
    begins when the game starts
  commerce - Chapter II: Commerce Street
    begins when the player visits Commerce Street for the first time
end chapters

on the player talking during commerce
  refuse no-time-to-chat
end on
```

A pile of smaller things landed too. Imports can import. Proper names work on any create block, not only people. An exit can be one-way. A marker can ask for a noun with no article. Possessive names resolve everywhere.

```chord
import "regions/market"

create Grubber's Market
  scenery, proper

create the Market Square
  a room
  north to the Alley, one-way

define phrase another-one
  No one notices you picking up another {bare item}.
end phrase

while the Weaponsmith's Stall is blocked
```

And a couple dozen loader and parser defects found by playing the port, all fixed.

## Sharpee

Under the language, NPCs now act through the platform's own action pipeline. When a character does something, it is the real action, validated and interruptible, and the narration knows who was present to see it. The story's own reactions run before the platform moves the characters. There is a new static analysis, the World Index, that reads a compiled story and reports its map, what can be reached, and what looks unfinished. And a long list of text fixes: articles on plurals, third-person names, room descriptions on arrival, answering and saying goodbye in conversations.

## Chord Writer

The app speaks Chord 3.6 and bundles the 5.3 toolchain, so there is nothing to install. New since 1.3: imported fragment files are first-class source in the sidebar and editor, with New Import and Extract Selection to Import in the File menu; a World tab showing the World Index; a menu-less Play pane with a Publish option; and the usual editor fixes. This is the first version that arrives as an auto-update to existing installs.

## Documentation

sharpee.net has new guide pages for timers, chapters, the player role, sound and images, and testing with the tree document. Every guide was swept against the current syntax.

## Where to get it

Chord Writer is at sharpee.net/chord-writer/download, one build for Apple silicon and one for Intel. The platform is on npm as the sharpee packages at 5.3.0, with the devkit package as the command line. The Secret Letter port is not done, so do not expect a game yet. Expect the language to keep moving as it gets there.

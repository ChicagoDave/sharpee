## A complete small story. Every construct here is checked on the
## published CLI.

story
  title: The Cellar Bell
  id: cellar-bell
  story-version: 0.1.0
  ifid: 5B0C1F6E-2A4D-4E7B-9C31-7D2A8E4F6B10
  states: quiet, rung
  use scoring
    rank "Visitor" at 0
    rank "Ringer" at 10
  authors:
    Example Author
  description: A locked cellar and a bell that wants polishing.
  prologue:
    The house is yours for the afternoon, and so is whatever is under it.

define condition bell-ready: the brass bell is polished and the brass bell is in the hook

## A trait answers a story action. `it` is the thing that composes it.

define trait tarnished
  states: dull, polished
  score shined worth 5

  on the player polishing
    refuse when it is polished: already-bright
    change it to polished
    award shined
    phrase now-bright
  end on
end trait

## An action carries grammar and what must be true of the player.
## It never asks which thing was named.

define action polishing
  grammar
    polish or shine the target
  the target must be reachable
  the player must have the rag: need-a-rag
  otherwise refuse nothing-to-polish

define action ringing
  grammar
    ring the target
  the target must be reachable
  otherwise refuse cannot-ring

define trait ringable
  score rang-it worth 5

  on the player ringing
    it must be polished: too-dull-to-ring
    it must be in the hook: bell-not-hung
    change the story to rung
    award rang-it
    win bell-rung
  end on
end trait

create the Kitchen, a room
  down to the Cellar through the cellar door

  A stone-flagged kitchen with a cold range. A door in the corner leads
  down.

  first time
    Nobody has cooked here in a long while.

create the Cellar, a room, dark

  Whitewashed brick, a rack of empty bottles, and an iron hook in the
  ceiling beam.

create the cellar door
  a door, openable, lockable with the iron key, starts locked

  Planks and a black iron lock.

create the dresser
  a container, scenery, openable, starts closed
  in the Kitchen
  holds 4

  A tall dresser with one deep drawer.

create the iron key
  a thing
  in the dresser

  A heavy key, cold to hold.

create the rag
  aka cloth
  a thing
  in the dresser

  A soft grey rag.

create the candle
  a thing, light-source, starts unlit
  in the Kitchen

  A stub of candle in a tin holder.

create the hook
  aka iron hook
  a supporter, scenery
  in the Cellar
  holds 1

  A hook the size of your hand.

create the brass bell
  aka bell
  a thing, tarnished, ringable
  in the Cellar
  counter knocks

  A hand bell, green with neglect.

  on the player examining
    select on the brass bell's state
      when dull
        phrase bell-dull
      when polished
        phrase bell-bright
    end select
  end on

  after the player taking
    first time
      phrase bell-heavy
    second time
      phrase bell-again
  end after

  after the player putting the hook
    phrase bell-hangs
  end after

create Morgan
  a person, proper
  playable
  starts in the Kitchen

  You, in your second-best coat.

define phrases en-US
  already-bright:
    It is as bright as it will get.
  now-bright:
    The green comes off on the rag, and the brass comes up underneath.
  need-a-rag:
    You have nothing to polish with.
  nothing-to-polish:
    Polishing that would change nothing.
  cannot-ring:
    That does not ring.
  too-dull-to-ring:
    It gives a flat clank, all tarnish.
  bell-not-hung:
    A bell wants hanging before it will ring true.
  bell-rung:
    The bell rings, clear as a struck glass, and the whole house hears it.
  bell-dull:
    Under the green there may be brass.
  bell-bright:
    It shines.
  bell-heavy:
    It is heavier than it looks.
  bell-again:
    You know its weight by now.
  bell-hangs:
    The bell settles on the hook and swings once.

before the game starts
  change the player to Morgan
end before

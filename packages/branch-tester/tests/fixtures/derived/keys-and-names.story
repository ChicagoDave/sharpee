## A dedicated fixture for GH #549 Phase 3: a cellar door whose lockable
## names a key (the runner holds the key and types `unlock cellar door with
## iron key`), a padlock whose lockable names none (the `with` slot is
## dropped), a pear whose name is also the pear display's alias (the runner
## types the alias nothing else answers to), a shadow and a figure that
## answer to each other's names (SKIPPED name-ambiguous), and a stove whose
## `closed` is the openable flag beside its declared `cold`/`hot` state (the
## flag is written, the state kept; `not closed` is written as `open`). Not
## story content.

story
  title: Derived Keys And Names
  authors:
    Sharpee
  id: derived-keys-and-names
  story-version: 0.0.1

create the Hall
  a room
  north to the Pantry through the cellar door

  A hall.

create the Pantry
  a room

  A pantry.

create the cellar door
  a door, lockable with the iron key, starts locked
  states: shut, swung

  A cellar door.

  after the player unlocking
    change the cellar door to swung
  end after

create the iron key
  a thing
  in the Hall

  An iron key.

create the strongbox
  a container, openable, lockable with the iron key, starts locked
  in the Hall

  A strongbox.

  on the player opening
    refuse when the strongbox is locked: box-locked
  end on

create the padlock
  a thing, lockable, starts locked
  in the Hall

  A padlock.

  on the player unlocking
    refuse padlock-rusted
  end on

create the display of pears
  a thing, scenery
  aka pears, pear
  in the Hall

  A display of pears.

create the pear
  a thing
  aka green pear
  in the Hall

  A pear.

  on the player taking
    refuse pear-bruised
  end on

create the shadow
  a thing, scenery
  aka figure
  in the Hall

  A shadow.

  on the player examining
    refuse shadow-shifts
  end on

create the figure
  a thing, scenery
  aka shadow
  in the Hall

  A figure.

create the stove
  a container, openable
  in the Hall
  states, reversible: cold, hot

  A stove.

  on the player examining
    refuse when the stove is hot and the stove is closed: stove-hot-closed
    refuse when the stove is hot: stove-hot-open
  end on

define phrase box-locked
  The strongbox is locked.
end phrase
define phrase padlock-rusted
  The padlock is rusted shut.
end phrase
define phrase pear-bruised
  The pear is bruised.
end phrase
define phrase shadow-shifts
  The shadow shifts.
end phrase
define phrase stove-hot-closed
  Hot, and closed.
end phrase
define phrase stove-hot-open
  Hot, and open.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before

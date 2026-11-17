story
  title: Lamp Words
  authors:
    T
  id: lamp-words
  story-version: 0.0.1

## A derived-runner fixture for three constructs that play correctly and
## must also test correctly: a trait clause that writes a platform state
## word (`lit`, `whole`), a story action gated by `while`, and a standard
## action whose bare pattern the story moved to an action of its own. A
## fourth: a thing composing two traits that both answer one action, where
## one trait's requirement stands in front of the other's body.

before the game starts
  change the player to Keeper
end before

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

define trait lens-seat
  on the player kindling
    the glass lens must be in it: lantern-empty
  end on
end trait

define action kindling
  grammar
    kindle the target
  the target must be reachable
  otherwise refuse nothing-to-kindle

  phrases en-US
    nothing-to-kindle:
      Nothing here takes a flame.

define action shouting while the tower bell is tolling
  grammar
    shout
  phrase shouted

define action humming while one chance in 2
  grammar
    hum
  phrase hummed

remove from action lighting
  light the target

extend action kindling
  grammar
    light the target

define phrase already-burning
  It is burning already.
end phrase

define phrase kindled
  It catches.
end phrase

define phrase light-needs-the-word
  A flame here wants the word, not a match.
end phrase

define phrase lantern-empty
  There is no lens in it to throw the light.
end phrase

define phrase shouted
  You shout. The bell tolls through the middle of it.
end phrase

define phrase hummed
  You hum.
end phrase

define phrase lens-mends
  The crack closes.
end phrase

create the Lamp Room
  a room

  A room of lamps.

create Keeper
  a person
  playable
  starts in the Lamp Room
  carries the wax taper

  You.

create the wax taper
  a thing
  aka taper

  A taper.

create the hand lamp
  a thing, light-source, wick, starts unlit
  in the Lamp Room
  aka lamp

  A lamp.

create the great lantern
  a container, scenery, light-source, starts unlit, lens-seat, wick
  in the Lamp Room
  aka lantern

  A lantern.

create the glass lens
  a thing
  in the Lamp Room

  A lens for the lantern.

create the cracked lens
  a thing, breakable, starts broken
  in the Lamp Room
  aka lens

  A lens.

  on the player pulling
    change the cracked lens to whole
    phrase lens-mends
  end on

create the tower bell
  a thing, scenery
  in the Lamp Room
  aka bell
  states, reversible: unrung, tolling

  A bell.

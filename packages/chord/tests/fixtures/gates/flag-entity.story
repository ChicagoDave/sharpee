story
  title: Gate Flag Entity
  authors:
    Nobody
  id: gate-flag-entity
  story-version: 0.0.1

create the alarm flag
  a thing
  states: armed, tripped

create the brass bell
  a thing
  in the Foyer
  states: silent, rung

create the rumour
  a thing
  states: quiet, spread

  Talk of a ghost in the cellar.

create the ward
  a thing
  states: lowered, raised

  after the player examining
    change the ward to raised
  end after

create the token
  a thing
  states: whole, spent

create the pocket watch
  a thing
  states: running, stopped

create the Foyer
  a room

  A bare foyer.

  after the player entering
    change the alarm flag to tripped
    change the brass bell to rung
    change the rumour to spread
    change the ward to raised
    change the token to spent
    change the pocket watch to stopped
    move the token to the Foyer
    phrase heard when the alarm flag is tripped
    phrase heard when the brass bell is rung
    phrase heard when the rumour is spread
    phrase heard when the ward is raised
    phrase heard when the token is spent
    phrase heard when the pocket watch is stopped
  end after

create Alex
  a person
  playable
  starts in the Foyer
  carries the pocket watch

  You.

define phrases en-US
  heard:
    Somewhere, something stirs.

before the game starts
  change the player to Alex
end before

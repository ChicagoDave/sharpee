story
  title: Gate 7
  authors:
    Nobody
  id: gate-7
  story-version: 0.0.1

define phrase again
  Like I said.
end phrase

define phrase tent-reply, first-time
  Quite the tent.
or
  {again} Quite the tent.
end phrase

create the Field
  a room

  A field. {again}

create Alex
  a person
  playable
  starts in the Field

  You.

before the game starts
  change the player to Alex
end before

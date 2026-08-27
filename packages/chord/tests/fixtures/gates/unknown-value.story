story
  title: Gate 2
  authors:
    Nobody
  id: gate-2
  story-version: 0.0.1

create the message
  scenery
  states: intact, trampled

  on the player reading
    phrase message-intact when the message is intactt
  end on

define phrases en-US
  message-intact:
    Fine.

create Alex
  a person
  playable

before the game starts
  change the player to Alex
end before
